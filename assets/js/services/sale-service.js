import {
    ref,
    push,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

export async function checkoutSale({
    items,
    paymentMethod,
    paidAmount,
    totalAmount
}) {
    if (
        !Array.isArray(items)
        || items.length === 0
    ) {
        throw new Error(
            "Giỏ hàng đang trống."
        );
    }

    const saleId =
        push(
            ref(db, "sales")
        ).key;

    const now =
        Date.now();

    const result =
        await runTransaction(
            ref(db),
            (data) => {
                if (!data) {
                    return;
                }

                const products =
                    data.products || {};

                for (const item of items) {
                    const product =
                        products[item.productId];

                    if (!product) {
                        return;
                    }

                    const currentStock =
                        Number(
                            product.quantity || 0
                        );

                    const requestedQuantity =
                        Number(
                            item.quantity || 0
                        );

                    if (
                        requestedQuantity <= 0
                        || currentStock < requestedQuantity
                    ) {
                        return;
                    }
                }

                for (const item of items) {
                    const product =
                        products[item.productId];

                    product.quantity =
                        Number(product.quantity || 0)
                        - Number(item.quantity || 0);

                    product.updatedAt =
                        now;
                }

                data.sales =
                    data.sales || {};

                data.sales[saleId] = {
                    id:
                        saleId,

                    items:
                        items.map((item) => {
                            return {
                                productId:
                                    item.productId,

                                name:
                                    item.name,

                                sku:
                                    item.sku || "",

                                barcode:
                                    item.barcode || "",

                                image:
                                    item.image || "",

                                price:
                                    Number(
                                        item.price || 0
                                    ),

                                quantity:
                                    Number(
                                        item.quantity || 0
                                    ),

                                lineTotal:
                                    Number(
                                        item.price || 0
                                    )
                                    * Number(
                                        item.quantity || 0
                                    )
                            };
                        }),

                    totalAmount:
                        Number(
                            totalAmount || 0
                        ),

                    paymentMethod,

                    paidAmount:
                        Number(
                            paidAmount || 0
                        ),

                    changeAmount:
                        Math.max(
                            0,
                            Number(paidAmount || 0)
                            - Number(totalAmount || 0)
                        ),

                    status:
                        "paid",

                    createdAt:
                        now
                };

                return data;
            },
            {
                applyLocally: false
            }
        );

    if (!result.committed) {
        throw new Error(
            "Không thể thanh toán. "
            + "Có sản phẩm đã hết hàng "
            + "hoặc tồn kho vừa thay đổi."
        );
    }

    return {
        saleId,

        ...result.snapshot
            .child(
                `sales/${saleId}`
            )
            .val()
    };
}