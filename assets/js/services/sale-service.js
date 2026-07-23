import {
    ref,
    push,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";


/* =========================================================
   CHUYỂN GIÁ TRỊ THÀNH SỐ HỢP LỆ
========================================================= */

function toNumber(
    value
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* =========================================================
   LẤY GIÁ NHẬP CỦA SẢN PHẨM
========================================================= */

function getProductCostPrice(
    product
) {
    return toNumber(
        product.purchasePrice
        ??
        product.costPrice
        ??
        product.importPrice
        ??
        product.buyPrice
        ??
        product.entryPrice
        ??
        0
    );
}


/* =========================================================
   PHÂN BỔ TIỀN GIẢM GIÁ CHO TỪNG SẢN PHẨM
========================================================= */

function allocateDiscountToItems(
    items,
    subtotalAmount,
    discountAmount
) {
    let allocatedDiscount =
        0;

    return items.map(
        (
            item,
            index
        ) => {
            const isLastItem =
                index ===
                items.length - 1;

            let lineDiscount =
                0;

            if (
                subtotalAmount > 0
                &&
                discountAmount > 0
            ) {
                if (
                    isLastItem
                ) {
                    lineDiscount =
                        discountAmount -
                        allocatedDiscount;
                } else {
                    lineDiscount =
                        Math.round(
                            discountAmount *
                            (
                                toNumber(
                                    item.lineTotal
                                )
                                /
                                subtotalAmount
                            )
                        );

                    allocatedDiscount +=
                        lineDiscount;
                }
            }

            lineDiscount =
                Math.max(
                    0,
                    Math.min(
                        toNumber(
                            item.lineTotal
                        ),
                        lineDiscount
                    )
                );

            const lineRevenue =
                Math.max(
                    0,
                    toNumber(
                        item.lineTotal
                    ) -
                    lineDiscount
                );

            const lineProfit =
                lineRevenue -
                toNumber(
                    item.lineCost
                );

            return {
                ...item,

                lineDiscount,

                lineRevenue,

                lineProfit
            };
        }
    );
}


/* =========================================================
   THANH TOÁN HÓA ĐƠN
========================================================= */

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
    transferCode = "",
    billName = "Bill"
}) {
    if (
        !Array.isArray(
            items
        )
        ||
        items.length === 0
    ) {
        throw new Error(
            "Giỏ hàng đang trống."
        );
    }

    /*
        Chuẩn hóa dữ liệu giỏ hàng.
    */
    const normalizedItems =
        items.map(
            (
                item
            ) => {
                return {
                    productId:
                        String(
                            item.productId
                            ||
                            item.id
                            ||
                            ""
                        ).trim(),

                    name:
                        item.name
                        ||
                        "Sản phẩm",

                    sku:
                        item.sku
                        ||
                        "",

                    barcode:
                        item.barcode
                        ||
                        "",

                    image:
                        item.image
                        ||
                        "",

                    price:
                        toNumber(
                            item.price
                            ??
                            item.salePrice
                            ??
                            0
                        ),

                    quantity:
                        toNumber(
                            item.quantity
                            ||
                            0
                        )
                };
            }
        );

    /*
        Kiểm tra dữ liệu giỏ hàng.
    */
    for (
        const item
        of normalizedItems
    ) {
        if (
            !item.productId
        ) {
            throw new Error(
                `Sản phẩm "${item.name}" không có ID Firebase.`
            );
        }

        if (
            !Number.isInteger(
                item.quantity
            )
            ||
            item.quantity <= 0
        ) {
            throw new Error(
                `Số lượng của "${item.name}" không hợp lệ.`
            );
        }

        if (
            item.price < 0
        ) {
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
            ref(
                db,
                "products"
            )
        );

    const products =
        productsSnapshot.val()
        ||
        {};

    const updates =
        {};

    const now =
        Date.now();

    const preparedItems =
        [];

    /*
        Kiểm tra tồn kho và tính giá vốn.
    */
    for (
        const item
        of normalizedItems
    ) {
        const product =
            products[
                item.productId
            ];

        if (
            !product
        ) {
            throw new Error(
                `Không tìm thấy sản phẩm "${item.name}" trên Firebase.`
            );
        }

        const currentStock =
            toNumber(
                product.quantity
                ||
                0
            );

        if (
            currentStock <
            item.quantity
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
            item.price *
            item.quantity;

        const lineCost =
            costPrice *
            item.quantity;

        preparedItems.push({
            productId:
                item.productId,

            name:
                item.name,

            sku:
                item.sku,

            barcode:
                item.barcode,

            /*
                Không lưu URL hoặc Base64 ảnh vào từng hóa đơn.
                Lịch sử đơn hàng chỉ cần productId, tên, mã, giá
                và số lượng. Việc này tránh lặp dữ liệu ảnh.
            */
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

            lineCost
        });

        const newStock =
            currentStock -
            item.quantity;

        updates[
            `products/${item.productId}/quantity`
        ] =
            newStock;

        updates[
            `products/${item.productId}/updatedAt`
        ] =
            now;
    }

    /*
        Tổng tiền trước giảm giá.

        Tính trực tiếp từ sản phẩm để tránh
        dữ liệu tổng tiền truyền vào bị sai.
    */
    const calculatedSubtotal =
        preparedItems.reduce(
            (
                total,
                item
            ) => {
                return (
                    total +
                    toNumber(
                        item.lineTotal
                    )
                );
            },
            0
        );

    const normalizedSubtotal =
        Math.max(
            0,
            calculatedSubtotal
        );

    /*
        Tiền giảm giá không được âm
        và không được lớn hơn tạm tính.
    */
    const normalizedDiscount =
        Math.min(
            normalizedSubtotal,
            Math.max(
                0,
                toNumber(
                    discountAmount
                )
            )
        );

    /*
        Tổng tiền cuối cùng.
    */
    const finalTotal =
        Math.max(
            0,
            normalizedSubtotal -
            normalizedDiscount
        );

    /*
        Phân bổ giảm giá cho từng sản phẩm.
    */
    const saleItems =
        allocateDiscountToItems(
            preparedItems,
            normalizedSubtotal,
            normalizedDiscount
        );
            /*
        Tổng doanh thu sau giảm giá.
    */
    const totalRevenue =
        saleItems.reduce(
            (
                total,
                item
            ) => {
                return (
                    total +
                    toNumber(
                        item.lineRevenue
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
            (
                total,
                item
            ) => {
                return (
                    total +
                    toNumber(
                        item.lineCost
                    )
                );
            },
            0
        );

    /*
        Tổng lợi nhuận.
    */
    const grossProfit =
        totalRevenue -
        totalCost;

    const normalizedPaidAmount =
        paymentMethod ===
            "cash"
            ? Math.max(
                0,
                toNumber(
                    paidAmount
                )
            )
            : finalTotal;

    if (
        paymentMethod ===
            "cash"
        &&
        normalizedPaidAmount <
            finalTotal
    ) {
        throw new Error(
            "Số tiền khách đưa chưa đủ."
        );
    }

    const changeAmount =
        paymentMethod ===
            "cash"
            ? Math.max(
                0,
                normalizedPaidAmount -
                finalTotal
            )
            : 0;

    /*
        Tạo ID hóa đơn mới.
    */
    const saleRef =
        push(
            ref(
                db,
                "sales"
            )
        );

    const saleId =
        saleRef.key;

    if (
        !saleId
    ) {
        throw new Error(
            "Không tạo được mã hóa đơn."
        );
    }

    const sale = {
        id:
            saleId,

        saleId,

        billName:
            String(
                billName ||
                "Bill"
            ).trim() ||
            "Bill",

        items:
            saleItems,

        subtotalAmount:
            normalizedSubtotal,

        discountAmount:
            normalizedDiscount,

        discountCode:
            String(
                discountCode ||
                ""
            ).trim(),

        discountType:
            String(
                discountType ||
                ""
            ).trim(),

        discountValue:
            Math.max(
                0,
                toNumber(
                    discountValue
                )
            ),

        totalAmount:
            finalTotal,

        totalRevenue,

        totalCost,

        grossProfit,

        totalProfit:
            grossProfit,

        netProfit:
            grossProfit,

        paymentMethod:
            paymentMethod ===
                "transfer"
                ? "transfer"
                : "cash",

        paidAmount:
            normalizedPaidAmount,

        changeAmount,

        transferCode:
            paymentMethod ===
                "transfer"
                ? String(
                    transferCode ||
                    ""
                ).trim()
                : "",

        status:
            "paid",

        createdAt:
            now,

        updatedAt:
            now
    };

    /*
        Lưu hóa đơn cùng lúc với cập nhật tồn kho.
    */
    updates[
        `sales/${saleId}`
    ] =
        sale;

    await update(
        ref(
            db
        ),
        updates
    );

    return sale;
}