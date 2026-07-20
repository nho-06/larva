import {
    ref,
    push,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

/*
    Lấy giá nhập của sản phẩm.

    Hỗ trợ nhiều tên trường để tránh lỗi
    nếu sản phẩm cũ đang lưu giá vốn
    bằng tên khác nhau.
*/
function getProductCostPrice(product) {
    return Number(
        product.purchasePrice
        ?? product.costPrice
        ?? product.importPrice
        ?? product.buyPrice
        ?? product.entryPrice
        ?? 0
    );
}

/*
    Thanh toán hóa đơn:

    - Lấy dữ liệu sản phẩm mới nhất.
    - Kiểm tra tồn kho.
    - Lấy giá nhập.
    - Tính giá vốn.
    - Trừ mã giảm giá.
    - Tính lợi nhuận sau giảm giá.
    - Trừ tồn kho.
    - Lưu hóa đơn vào Firebase.
*/
export async function checkoutSale({
    items,
    paymentMethod,
    paidAmount,
    totalAmount,
    subtotalAmount = 0,
    discountAmount = 0,
    discountCode = "",
    discountType = "",
    discountValue = 0,
    transferCode = ""
}) {
    if (
        !Array.isArray(items)
        || items.length === 0
    ) {
        throw new Error(
            "Giỏ hàng đang trống."
        );
    }

    /*
        Chuẩn hóa dữ liệu sản phẩm
        nhận từ giỏ hàng.
    */
    const normalizedItems =
        items.map((item) => {
            return {
                productId:
                    String(
                        item.productId
                        || item.id
                        || ""
                    ).trim(),

                name:
                    item.name
                    || "Sản phẩm",

                sku:
                    item.sku
                    || "",

                barcode:
                    item.barcode
                    || "",

                image:
                    item.image
                    || "",

                price:
                    Number(
                        item.price
                        ?? item.salePrice
                        ?? 0
                    ),

                quantity:
                    Number(
                        item.quantity
                        || 0
                    )
            };
        });

    /*
        Kiểm tra dữ liệu giỏ hàng.
    */
    for (
        const item
        of normalizedItems
    ) {
        if (!item.productId) {
            throw new Error(
                `Sản phẩm "${item.name}" không có ID Firebase.`
            );
        }

        if (item.quantity <= 0) {
            throw new Error(
                `Số lượng của "${item.name}" không hợp lệ.`
            );
        }

        if (item.price < 0) {
            throw new Error(
                `Giá bán của "${item.name}" không hợp lệ.`
            );
        }
    }

    /*
        Lấy toàn bộ sản phẩm mới nhất
        từ Firebase trước khi thanh toán.
    */
    const productsSnapshot =
        await get(
            ref(
                db,
                "products"
            )
        );

    const products =
        productsSnapshot.val()
        || {};

    const updates =
        {};

    const now =
        Date.now();

    const saleItems =
        [];

    /*
        Kiểm tra từng sản phẩm,
        lấy giá vốn và chuẩn bị trừ tồn kho.
    */
    for (
        const item
        of normalizedItems
    ) {
        const product =
            products[
                item.productId
            ];

        if (!product) {
            throw new Error(
                `Không tìm thấy sản phẩm "${item.name}" trên Firebase.`
            );
        }

        const currentStock =
            Number(
                product.quantity
                || 0
            );

        if (
            currentStock
            < item.quantity
        ) {
            throw new Error(
                `"${item.name}" chỉ còn ${currentStock} sản phẩm.`
            );
        }

        const costPrice =
            getProductCostPrice(
                product
            );

        const lineTotal =
            item.price
            * item.quantity;

        const lineCost =
            costPrice
            * item.quantity;

        /*
            lineProfit ở đây là tiền lời
            trước khi phân bổ giảm giá.
        */
        const lineProfit =
            lineTotal
            - lineCost;

        saleItems.push({
            productId:
                item.productId,

            name:
                item.name,

            sku:
                item.sku,

            barcode:
                item.barcode,

            image:
                item.image,

            price:
                item.price,

            salePrice:
                item.price,

            costPrice,

            purchasePrice:
                costPrice,

            quantity:
                item.quantity,

            lineTotal,

            lineCost,

            lineProfit
        });

        const newStock =
            currentStock
            - item.quantity;

        updates[
            `products/${item.productId}/quantity`
        ] = newStock;

        updates[
            `products/${item.productId}/updatedAt`
        ] = now;
    }

    /*
        Tạo mã hóa đơn Firebase mới.
    */
    const saleId =
        push(
            ref(
                db,
                "sales"
            )
        ).key;

    if (!saleId) {
        throw new Error(
            "Không thể tạo mã hóa đơn."
        );
    }

    /*
        Tổng tiền sản phẩm trước giảm giá.
    */
    const calculatedSubtotal =
        saleItems.reduce(
            (total, item) => {
                return (
                    total
                    + Number(
                        item.lineTotal
                        || 0
                    )
                );
            },
            0
        );

    /*
        Tổng giá vốn của hóa đơn.
    */
    const totalCost =
        saleItems.reduce(
            (total, item) => {
                return (
                    total
                    + Number(
                        item.lineCost
                        || 0
                    )
                );
            },
            0
        );

    /*
        Ưu tiên tổng tiền do hệ thống
        tự tính từ sản phẩm.

        Không tin hoàn toàn dữ liệu gửi
        từ giao diện để tránh sai tổng tiền.
    */
    const normalizedSubtotal =
        Math.max(
            0,
            calculatedSubtotal
        );

    /*
        Số tiền giảm không được âm
        và không được lớn hơn tạm tính.
    */
    const normalizedDiscount =
        Math.min(
            normalizedSubtotal,
            Math.max(
                0,
                Number(
                    discountAmount
                    || 0
                )
            )
        );

    /*
        Tổng khách cần thanh toán
        sau khi trừ mã giảm giá.
    */
    const finalTotal =
        Math.max(
            0,
            normalizedSubtotal
            - normalizedDiscount
        );

    /*
        Lợi nhuận phải tính theo doanh thu
        sau khi trừ mã giảm giá.
    */
    const grossProfit =
        finalTotal
        - totalCost;

    /*
        Hiện tại chưa tính thuế
        và chi phí khác.
    */
    const taxAmount =
        0;

    const otherCost =
        0;

    const netProfit =
        grossProfit
        - taxAmount
        - otherCost;

    const finalPaidAmount =
        Number(
            paidAmount
            || 0
        );

    const finalPaymentMethod =
        paymentMethod
        || "cash";

    /*
        Dữ liệu hóa đơn lưu trên Firebase.
    */
    const saleData = {
        id:
            saleId,

        saleId,

        items:
            saleItems,

        /*
            Tổng tiền trước giảm giá.
        */
        subtotalAmount:
            normalizedSubtotal,

        /*
            Thông tin mã giảm giá.
        */
        discountAmount:
            normalizedDiscount,

        discountCode:
            String(
                discountCode
                || ""
            ),

        discountType:
            String(
                discountType
                || ""
            ),

        discountValue:
            Number(
                discountValue
                || 0
            ),

        /*
            Tổng tiền sau giảm giá.
        */
        totalAmount:
            finalTotal,

        totalRevenue:
            finalTotal,

        /*
            Giá vốn và lợi nhuận.
        */
        totalCost,

        grossProfit,

        taxAmount,

        otherCost,

        totalProfit:
            netProfit,

        netProfit,

        /*
            Thông tin thanh toán.
        */
        paymentMethod:
            finalPaymentMethod,

        paidAmount:
            finalPaidAmount,

        changeAmount:
            finalPaymentMethod
            === "cash"
                ? Math.max(
                    0,
                    finalPaidAmount
                    - finalTotal
                )
                : 0,

        transferCode:
            transferCode
            || "",

        status:
            "paid",

        createdAt:
            now,

        updatedAt:
            now
    };

    /*
        Lưu hóa đơn và cập nhật tồn kho
        trong cùng một lần update Firebase.
    */
    updates[
        `sales/${saleId}`
    ] = saleData;

    await update(
        ref(db),
        updates
    );

    return saleData;
}