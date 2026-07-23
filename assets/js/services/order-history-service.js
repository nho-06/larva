import {
    ref,
    get,
    onValue,
    update,
    query,
    orderByChild,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";


/* =========================================================
   CHUYỂN GIÁ TRỊ THÀNH SỐ
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
   CHUẨN HÓA DANH SÁCH SẢN PHẨM
========================================================= */

function normalizeItems(
    items
) {
    if (
        Array.isArray(
            items
        )
    ) {
        return items;
    }

    if (
        items
        &&
        typeof items ===
            "object"
    ) {
        return Object.values(
            items
        );
    }

    return [];
}


/* =========================================================
   TÍNH LẠI SỐ TIỀN GIẢM GIÁ
========================================================= */

function calculateDiscount(
    subtotal,
    sale
) {
    const discountType =
        String(
            sale.discountType ||
            ""
        ).toLowerCase();

    const discountValue =
        Math.max(
            0,
            toNumber(
                sale.discountValue
            )
        );

    if (
        !sale.discountCode
        ||
        discountValue <= 0
    ) {
        return 0;
    }

    if (
        discountType ===
        "percent"
    ) {
        return Math.min(
            subtotal,
            Math.round(
                subtotal *
                discountValue /
                100
            )
        );
    }

    if (
        discountType ===
        "fixed"
    ) {
        return Math.min(
            subtotal,
            discountValue
        );
    }

    /*
        Hóa đơn cũ chưa lưu loại giảm giá.
        Tính lại theo tỷ lệ giảm trước đó.
    */
    const oldSubtotal =
        Math.max(
            0,
            toNumber(
                sale.subtotalAmount
            )
        );

    const oldDiscount =
        Math.max(
            0,
            toNumber(
                sale.discountAmount
            )
        );

    if (
        oldSubtotal > 0
        &&
        oldDiscount > 0
    ) {
        return Math.min(
            subtotal,
            Math.round(
                subtotal *
                oldDiscount /
                oldSubtotal
            )
        );
    }

    return 0;
}


/* =========================================================
   PHÂN BỔ GIẢM GIÁ CHO TỪNG SẢN PHẨM
========================================================= */

function allocateDiscount(
    items,
    subtotal,
    discountAmount
) {
    let allocated =
        0;

    return items.map(
        (
            item,
            index
        ) => {
            const quantity =
                Math.max(
                    0,
                    Math.trunc(
                        toNumber(
                            item.quantity
                        )
                    )
                );

            const price =
                Math.max(
                    0,
                    toNumber(
                        item.price ??
                        item.salePrice
                    )
                );

            const costPrice =
                Math.max(
                    0,
                    toNumber(
                        item.costPrice ??
                        item.purchasePrice
                    )
                );

            const lineTotal =
                price *
                quantity;

            const lineCost =
                costPrice *
                quantity;

            const isLast =
                index ===
                items.length - 1;

            let lineDiscount =
                0;

            if (
                subtotal > 0
                &&
                discountAmount > 0
            ) {
                if (
                    isLast
                ) {
                    lineDiscount =
                        discountAmount -
                        allocated;
                } else {
                    lineDiscount =
                        Math.round(
                            discountAmount *
                            lineTotal /
                            subtotal
                        );

                    allocated +=
                        lineDiscount;
                }
            }

            lineDiscount =
                Math.max(
                    0,
                    Math.min(
                        lineTotal,
                        lineDiscount
                    )
                );

            const lineRevenue =
                Math.max(
                    0,
                    lineTotal -
                    lineDiscount
                );

            return {
                ...item,

                quantity,

                price,

                salePrice:
                    price,

                costPrice,

                purchasePrice:
                    costPrice,

                lineTotal,

                lineCost,

                lineDiscount,

                lineRevenue,

                lineProfit:
                    lineRevenue -
                    lineCost
            };
        }
    );
}


/* =========================================================
   TÍNH LẠI TOÀN BỘ HÓA ĐƠN
========================================================= */

function buildRecalculatedSale(
    sale,
    items,
    now
) {
    const subtotalAmount =
        items.reduce(
            (
                total,
                item
            ) => {
                const price =
                    Math.max(
                        0,
                        toNumber(
                            item.price ??
                            item.salePrice
                        )
                    );

                const quantity =
                    Math.max(
                        0,
                        Math.trunc(
                            toNumber(
                                item.quantity
                            )
                        )
                    );

                return (
                    total +
                    price *
                    quantity
                );
            },
            0
        );

    const discountAmount =
        calculateDiscount(
            subtotalAmount,
            sale
        );

    const preparedItems =
        allocateDiscount(
            items,
            subtotalAmount,
            discountAmount
        );

    const totalAmount =
        Math.max(
            0,
            subtotalAmount -
            discountAmount
        );

    const totalCost =
        preparedItems.reduce(
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

    const totalRevenue =
        preparedItems.reduce(
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

    const grossProfit =
        totalRevenue -
        totalCost;

    const paidAmount =
        Math.max(
            0,
            toNumber(
                sale.paidAmount
            )
        );

    return {
        ...sale,

        items:
            preparedItems,

        subtotalAmount,

        discountAmount,

        totalAmount,

        totalRevenue,

        totalCost,

        grossProfit,

        totalProfit:
            grossProfit,

        netProfit:
            grossProfit,

        changeAmount:
            sale.paymentMethod ===
                "cash"
                ? Math.max(
                    0,
                    paidAmount -
                    totalAmount
                )
                : 0,

        updatedAt:
            now
    };
}


/* =========================================================
   LẮNG NGHE 50 HÓA ĐƠN MỚI NHẤT
========================================================= */

export function listenOrderHistory(
    callback
) {
    const recentSalesQuery =
        query(
            ref(
                db,
                "sales"
            ),

            orderByChild(
                "createdAt"
            ),

            limitToLast(
                50
            )
        );

    return onValue(
        recentSalesQuery,

        (
            snapshot
        ) => {
            const value =
                snapshot.val()
                ||
                {};

            const sales =
                Object.entries(
                    value
                )
                    .map(
                        (
                            [
                                id,
                                sale
                            ]
                        ) => {
                            return {
                                ...sale,

                                id:
                                    sale?.id
                                    ||
                                    id,

                                saleId:
                                    sale?.saleId
                                    ||
                                    id,

                                items:
                                    normalizeItems(
                                        sale?.items
                                    )
                            };
                        }
                    )

                    /*
                        Firebase trả dữ liệu từ cũ đến mới.
                        Sắp xếp lại để hóa đơn mới nhất nằm trên.
                    */
                    .sort(
                        (
                            firstSale,
                            secondSale
                        ) => {
                            return (
                                toNumber(
                                    secondSale.createdAt
                                )
                                -
                                toNumber(
                                    firstSale.createdAt
                                )
                            );
                        }
                    );

            callback(
                sales
            );
        },

        (
            error
        ) => {
            console.error(
                "Không tải được lịch sử đơn hàng:",
                error
            );

            callback(
                [],
                error
            );
        }
    );
}


/* =========================================================
   GIẢM 1 SẢN PHẨM TRONG HÓA ĐƠN
========================================================= */

export async function decreaseSaleItem(
    saleId,
    itemIndex
) {
    return changeSaleItemQuantity(
        saleId,
        itemIndex,
        -1
    );
}


/* =========================================================
   XÓA TOÀN BỘ MỘT MÓN KHỎI HÓA ĐƠN
========================================================= */

export async function removeSaleItem(
    saleId,
    itemIndex
) {
    const saleSnapshot =
        await get(
            ref(
                db,
                `sales/${saleId}`
            )
        );

    const sale =
        saleSnapshot.val();

    if (
        !sale
    ) {
        throw new Error(
            "Không tìm thấy hóa đơn."
        );
    }

    if (
        sale.status ===
        "cancelled"
    ) {
        throw new Error(
            "Hóa đơn đã hủy nên không thể chỉnh sửa."
        );
    }

    const items =
        normalizeItems(
            sale.items
        );

    const index =
        Number(
            itemIndex
        );

    const removedItem =
        items[
            index
        ];

    if (
        !removedItem
    ) {
        throw new Error(
            "Không tìm thấy sản phẩm trong hóa đơn."
        );
    }

    /*
        Nếu bill chỉ còn một món thì hủy toàn bộ hóa đơn.
    */
    if (
        items.length ===
        1
    ) {
        return cancelSale(
            saleId
        );
    }

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

    const productId =
        String(
            removedItem.productId
            ||
            ""
        );

    const currentStock =
        toNumber(
            products[
                productId
            ]?.quantity
        );

    const returnedQuantity =
        Math.max(
            0,
            Math.trunc(
                toNumber(
                    removedItem.quantity
                )
            )
        );

    const newItems =
        items.filter(
            (
                _,
                currentIndex
            ) => {
                return (
                    currentIndex !==
                    index
                );
            }
        );

    const now =
        Date.now();

    const updatedSale =
        buildRecalculatedSale(
            sale,
            newItems,
            now
        );

    const updates = {
        [`sales/${saleId}`]:
            updatedSale
    };

    if (
        productId
    ) {
        updates[
            `products/${productId}/quantity`
        ] =
            currentStock +
            returnedQuantity;

        updates[
            `products/${productId}/updatedAt`
        ] =
            now;
    }

    await update(
        ref(
            db
        ),
        updates
    );

    return updatedSale;
}


/* =========================================================
   THAY ĐỔI SỐ LƯỢNG MỘT MÓN TRONG HÓA ĐƠN
========================================================= */

export async function changeSaleItemQuantity(
    saleId,
    itemIndex,
    quantityChange
) {
    const saleSnapshot =
        await get(
            ref(
                db,
                `sales/${saleId}`
            )
        );

    const sale =
        saleSnapshot.val();

    if (
        !sale
    ) {
        throw new Error(
            "Không tìm thấy hóa đơn."
        );
    }

    if (
        sale.status ===
        "cancelled"
    ) {
        throw new Error(
            "Hóa đơn đã hủy nên không thể chỉnh sửa."
        );
    }

    const items =
        normalizeItems(
            sale.items
        );

    const index =
        Number(
            itemIndex
        );

    const item =
        items[
            index
        ];

    if (
        !item
    ) {
        throw new Error(
            "Không tìm thấy sản phẩm trong hóa đơn."
        );
    }

    const oldQuantity =
        Math.max(
            0,
            Math.trunc(
                toNumber(
                    item.quantity
                )
            )
        );

    const newQuantity =
        oldQuantity +
        Math.trunc(
            toNumber(
                quantityChange
            )
        );

    if (
        newQuantity <= 0
    ) {
        return removeSaleItem(
            saleId,
            index
        );
    }

    const productId =
        String(
            item.productId
            ||
            ""
        );

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

    const currentStock =
        toNumber(
            products[
                productId
            ]?.quantity
        );

    const stockDifference =
        oldQuantity -
        newQuantity;

    if (
        stockDifference < 0
        &&
        currentStock <
            Math.abs(
                stockDifference
            )
    ) {
        throw new Error(
            `Tồn kho không đủ để tăng số lượng "${
                item.name ||
                "sản phẩm"
            }".`
        );
    }

    const now =
        Date.now();

    const newItems =
        items.map(
            (
                currentItem,
                currentIndex
            ) => {
                return (
                    currentIndex ===
                    index
                        ? {
                            ...currentItem,

                            quantity:
                                newQuantity
                        }
                        : currentItem
                );
            }
        );

    const updatedSale =
        buildRecalculatedSale(
            sale,
            newItems,
            now
        );

    const updates = {
        [`sales/${saleId}`]:
            updatedSale
    };

    if (
        productId
    ) {
        updates[
            `products/${productId}/quantity`
        ] =
            currentStock +
            stockDifference;

        updates[
            `products/${productId}/updatedAt`
        ] =
            now;
    }

    await update(
        ref(
            db
        ),
        updates
    );

    return updatedSale;
}


/* =========================================================
   HỦY TOÀN BỘ HÓA ĐƠN
========================================================= */

export async function cancelSale(
    saleId
) {
    const saleSnapshot =
        await get(
            ref(
                db,
                `sales/${saleId}`
            )
        );

    const sale =
        saleSnapshot.val();

    if (
        !sale
    ) {
        throw new Error(
            "Không tìm thấy hóa đơn."
        );
    }

    if (
        sale.status ===
        "cancelled"
    ) {
        return sale;
    }

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

    const items =
        normalizeItems(
            sale.items
        );

    const now =
        Date.now();

    const updates =
        {};

    items.forEach(
        (
            item
        ) => {
            const productId =
                String(
                    item.productId
                    ||
                    ""
                );

            if (
                !productId
            ) {
                return;
            }

            const currentStock =
                toNumber(
                    products[
                        productId
                    ]?.quantity
                );

            const returnedQuantity =
                Math.max(
                    0,
                    Math.trunc(
                        toNumber(
                            item.quantity
                        )
                    )
                );

            updates[
                `products/${productId}/quantity`
            ] =
                currentStock +
                returnedQuantity;

            updates[
                `products/${productId}/updatedAt`
            ] =
                now;
        }
    );

    updates[
        `sales/${saleId}/status`
    ] =
        "cancelled";

    updates[
        `sales/${saleId}/cancelledAt`
    ] =
        now;

    updates[
        `sales/${saleId}/updatedAt`
    ] =
        now;

    updates[
        `sales/${saleId}/subtotalAmount`
    ] =
        0;

    updates[
        `sales/${saleId}/discountAmount`
    ] =
        0;

    updates[
        `sales/${saleId}/totalAmount`
    ] =
        0;

    updates[
        `sales/${saleId}/totalRevenue`
    ] =
        0;

    updates[
        `sales/${saleId}/totalCost`
    ] =
        0;

    updates[
        `sales/${saleId}/grossProfit`
    ] =
        0;

    updates[
        `sales/${saleId}/totalProfit`
    ] =
        0;

    updates[
        `sales/${saleId}/netProfit`
    ] =
        0;

    updates[
        `sales/${saleId}/changeAmount`
    ] =
        0;

    await update(
        ref(
            db
        ),
        updates
    );

    return {
        ...sale,

        status:
            "cancelled"
    };
}