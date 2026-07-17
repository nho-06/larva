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

const PRODUCT_CACHE_KEY =
    "larva_products_cache_v1";

function normalizeProducts(data) {
    return Object.entries(data || {})
        .map(([id, product]) => {
            return {
                id,
                ...product
            };
        })
        .sort((a, b) => {
            return (
                Number(b.updatedAt || 0)
                -
                Number(a.updatedAt || 0)
            );
        });
}

function readProductCache() {
    try {
        const raw =
            localStorage.getItem(
                PRODUCT_CACHE_KEY
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch (error) {
        console.warn(
            "Không thể đọc cache sản phẩm:",
            error
        );

        return [];
    }
}

function saveProductCache(products) {
    try {
        localStorage.setItem(
            PRODUCT_CACHE_KEY,
            JSON.stringify(products)
        );
    } catch (error) {
        console.warn(
            "Không thể lưu cache sản phẩm:",
            error
        );
    }
}

export function listenProducts(callback) {
    const cachedProducts =
        readProductCache();

    /*
        Hiển thị dữ liệu đã lưu ngay lập tức.

        Người dùng không cần chờ Firebase tải xong
        mới nhìn thấy danh sách sản phẩm.
    */
    if (cachedProducts.length) {
        callback(
            cachedProducts,
            {
                fromCache: true
            }
        );
    }

    /*
        Sau đó Firebase vẫn tiếp tục tải dữ liệu mới.

        Khi có dữ liệu mới:
        - cập nhật giao diện
        - cập nhật lại localStorage
    */
    return onValue(
        productRef,

        (snapshot) => {
            const products =
                normalizeProducts(
                    snapshot.val()
                );

            saveProductCache(
                products
            );

            callback(
                products,
                {
                    fromCache: false
                }
            );
        },

        (error) => {
            console.error(
                "Không thể đọc danh sách sản phẩm:",
                error
            );

            /*
                Nếu đã có cache thì giữ nguyên dữ liệu
                đang hiển thị.

                Chỉ trả về mảng rỗng khi hoàn toàn
                không có dữ liệu cache.
            */
            if (!cachedProducts.length) {
                callback(
                    [],
                    {
                        fromCache: false,
                        error
                    }
                );
            }
        }
    );
}

export async function createProduct(product) {
    const newProductRef =
        push(
            productRef
        );

    const now =
        Date.now();

    await set(
        newProductRef,
        {
            ...product,

            createdAt:
                now,

            updatedAt:
                now
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

export async function deleteProduct(
    productId
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

    await remove(
        currentProductRef
    );
}