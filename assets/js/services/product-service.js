import {
    ref,
    push,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

const productRef =
    ref(
        db,
        "products"
    );

export function listenProducts(callback) {
    return onValue(
        productRef,

        (snapshot) => {
            const data =
                snapshot.val()
                || {};

            const products =
                Object.entries(data)
                    .map(
                        ([id, product]) => {
                            return {
                                id,
                                ...product
                            };
                        }
                    )
                    .sort(
                        (a, b) => {
                            return (
                                Number(
                                    b.updatedAt || 0
                                )
                                -
                                Number(
                                    a.updatedAt || 0
                                )
                            );
                        }
                    );

            callback(products);
        },

        (error) => {
            console.error(
                "Không thể đọc danh sách sản phẩm:",
                error
            );

            callback([]);
        }
    );
}

export async function createProduct(product) {
    const newProductRef =
        push(productRef);

    await set(
        newProductRef,
        {
            ...product,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()
        }
    );

    return newProductRef.key;
}

export async function updateProduct(
    productId,
    product
) {
    if (!productId) {
        throw new Error(
            "Thiếu ID sản phẩm."
        );
    }

    const currentProductRef =
        ref(
            db,
            `products/${productId}`
        );

    await update(
        currentProductRef,
        {
            ...product,

            updatedAt:
                Date.now()
        }
    );
}

export async function deleteProduct(productId) {
    if (!productId) {
        throw new Error(
            "Thiếu ID sản phẩm."
        );
    }

    const currentProductRef =
        ref(
            db,
            `products/${productId}`
        );

    await remove(
        currentProductRef
    );
}