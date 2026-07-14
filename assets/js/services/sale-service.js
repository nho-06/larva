import {
    ref,
    push,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

/**
 * Lấy giá nhập của sản phẩm.
 *
 * Hỗ trợ nhiều tên trường để tránh sai nếu project
 * đang lưu giá nhập bằng tên khác nhau.
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

/**
 * Thanh toán hóa đơn:
 * - Lấy sản phẩm mới nhất từ Firebase.
 * - Kiểm tra tồn kho.
 * - Lấy giá nhập của sản phẩm.
 * - Tính giá vốn và tiền lời.
 * - Trừ tồn kho.
 * - Lưu hóa đơn vào sales.
 */
export async function checkoutSale({
    items,
    paymentMethod,
    paidAmount,
    totalAmount,
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

    for (const item of normalizedItems) {
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
        Lấy toàn bộ sản phẩm mới nhất từ Firebase.
    */
    const productsSnapshot =
        await get(
            ref(db, "products")
        );

    const products =
        productsSnapshot.val()
        || {};

    const updates = {};

    const now =
        Date.now();

    /*
        Tạo danh sách sản phẩm bán ra,
        đồng thời lấy giá nhập từ Firebase.
    */
    const saleItems = [];

    for (const item of normalizedItems) {
        const product =
            products[item.productId];

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
        Tạo ID hóa đơn mới.
    */
    const saleId =
        push(
            ref(db, "sales")
        ).key;

    if (!saleId) {
        throw new Error(
            "Không thể tạo mã hóa đơn."
        );
    }

    /*
        Tính tổng doanh thu theo dữ liệu thực tế
        của các sản phẩm trong hóa đơn.
    */
    const calculatedTotal =
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
        Tổng giá vốn.
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
        Lợi nhuận gộp trước thuế và chi phí khác.
    */
    const grossProfit =
        calculatedTotal
        - totalCost;

    /*
        Hiện tại chưa nhập thuế khi thanh toán,
        nên mặc định bằng 0.
    */
    const taxAmount =
        0;

    const otherCost =
        0;

    /*
        Lợi nhuận thực.
    */
    const netProfit =
        grossProfit
        - taxAmount
        - otherCost;

    const finalTotal =
        calculatedTotal
        || Number(
            totalAmount
            || 0
        );

    const finalPaidAmount =
        Number(
            paidAmount
            || 0
        );

    const finalPaymentMethod =
        paymentMethod
        || "cash";

    const saleData = {
        id:
            saleId,

        saleId,

        items:
            saleItems,

        totalAmount:
            finalTotal,

        totalRevenue:
            finalTotal,

        totalCost,

        grossProfit,

        taxAmount,

        otherCost,

        totalProfit:
            netProfit,

        netProfit,

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
        trong cùng một lần update.
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