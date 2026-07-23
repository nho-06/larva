import {
    onValue,
    push,
    ref,
    remove,
    set,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";


/* =========================================================
   THAM CHIẾU FIREBASE
========================================================= */

const productRef =
    ref(
        db,
        "products"
    );


/* =========================================================
   CACHE
========================================================= */

/*
    Dùng cache v3 để trình duyệt không đọc lại
    cache cũ từng thiếu đường dẫn ảnh.
*/
const PRODUCT_CACHE_KEY =
    "larva_products_cache_v3";

const OLD_PRODUCT_CACHE_KEYS = [
    "larva_products_cache_v1",
    "larva_products_cache_v2"
];

const MAX_CACHE_PRODUCTS =
    500;

/*
    Giới hạn độ dài ảnh Base64 được lưu vào localStorage.

    Ảnh Base64 quá lớn không nên lưu vì có thể làm đầy
    bộ nhớ trình duyệt và khiến web chậm hơn.
*/
const MAX_CACHE_BASE64_LENGTH =
    120000;


/* =========================================================
   CHUẨN HÓA DANH SÁCH SẢN PHẨM
========================================================= */

function normalizeProducts(
    data
) {
    return Object.entries(
        data || {}
    )
        .map(
            (
                [
                    id,
                    product
                ]
            ) => {
                return normalizeProductForDisplay(
                    {
                        id,
                        ...product
                    }
                );
            }
        )
        .sort(
            (
                firstProduct,
                secondProduct
            ) => {
                const firstUpdatedAt =
                    Number(
                        firstProduct.updatedAt
                        ||
                        firstProduct.createdAt
                        ||
                        0
                    );

                const secondUpdatedAt =
                    Number(
                        secondProduct.updatedAt
                        ||
                        secondProduct.createdAt
                        ||
                        0
                    );

                return (
                    secondUpdatedAt
                    -
                    firstUpdatedAt
                );
            }
        );
}


/* =========================================================
   CHUẨN HÓA SẢN PHẨM ĐỂ HIỂN THỊ
========================================================= */

function normalizeProductForDisplay(
    product
) {
    const image =
        getProductImageValue(
            product
        );

    return {
        id:
            String(
                product?.id
                ||
                ""
            ),

        name:
            String(
                product?.name
                ||
                ""
            ),

        sku:
            String(
                product?.sku
                ||
                ""
            ),

        barcode:
            String(
                product?.barcode
                ||
                ""
            ),

        categoryId:
            String(
                product?.categoryId
                ||
                ""
            ),

        category:
            String(
                product?.category
                ||
                ""
            ),

        categoryPrefix:
            String(
                product?.categoryPrefix
                ||
                ""
            ),

        quantity:
            normalizeQuantity(
                product?.quantity
                ??
                product?.stock
                ??
                0
            ),

        costPrice:
            normalizeMoney(
                product?.costPrice
                ??
                product?.purchasePrice
                ??
                product?.importPrice
                ??
                product?.buyPrice
                ??
                product?.entryPrice
                ??
                0
            ),

        salePrice:
            normalizeMoney(
                product?.salePrice
                ??
                product?.price
                ??
                0
            ),

        /*
            Giữ cả image và imageUrl để tương thích
            với các file cũ trong dự án.
        */
        image,

        imageUrl:
            image,

        imageStoragePath:
            String(
                product?.imageStoragePath
                ||
                ""
            ),

        description:
            String(
                product?.description
                ||
                ""
            ),

        createdAt:
            Number(
                product?.createdAt
                ||
                0
            ),

        updatedAt:
            Number(
                product?.updatedAt
                ||
                0
            )
    };
}


/* =========================================================
   CHUẨN HÓA SẢN PHẨM NHẸ ĐỂ CACHE
========================================================= */

function createCachedProduct(
    product
) {
    const normalizedProduct =
        normalizeProductForDisplay(
            product
        );

    const cachedImage =
        getCacheableImage(
            normalizedProduct.image
        );

    return {
        ...normalizedProduct,

        image:
            cachedImage,

        imageUrl:
            cachedImage
    };
}


/* =========================================================
   LẤY ẢNH CÓ THỂ LƯU CACHE
========================================================= */

function getCacheableImage(
    image
) {
    const normalizedImage =
        String(
            image
            ||
            ""
        ).trim();

    if (!normalizedImage) {
        return "";
    }

    /*
        Link Firebase Storage, HTTPS, blob hoặc đường dẫn
        tương đối đều được giữ nguyên trong cache.
    */
    if (
        !isBase64Image(
            normalizedImage
        )
    ) {
        return normalizedImage;
    }

    /*
        Chỉ giữ ảnh Base64 nhỏ.

        Ảnh Base64 quá lớn bị bỏ khỏi localStorage để tránh
        trình duyệt chậm hoặc lỗi vượt dung lượng.
    */
    if (
        normalizedImage.length
        <=
        MAX_CACHE_BASE64_LENGTH
    ) {
        return normalizedImage;
    }

    return "";
}


/* =========================================================
   ĐỌC CACHE
========================================================= */

function readProductCache() {
    try {
        const rawCache =
            localStorage.getItem(
                PRODUCT_CACHE_KEY
            );

        if (!rawCache) {
            return [];
        }

        const parsedCache =
            JSON.parse(
                rawCache
            );

        if (
            !Array.isArray(
                parsedCache
            )
        ) {
            clearProductCache();

            return [];
        }

        return parsedCache
            .map(
                normalizeProductForDisplay
            )
            .filter(
                (
                    product
                ) => {
                    return Boolean(
                        product.id
                    );
                }
            );
    } catch (error) {
        console.warn(
            "Không thể đọc cache sản phẩm:",
            error
        );

        clearProductCache();

        return [];
    }
}


/* =========================================================
   LƯU CACHE
========================================================= */

function saveProductCache(
    products
) {
    try {
        const cachedProducts =
            products
                .slice(
                    0,
                    MAX_CACHE_PRODUCTS
                )
                .map(
                    createCachedProduct
                );

        localStorage.setItem(
            PRODUCT_CACHE_KEY,
            JSON.stringify(
                cachedProducts
            )
        );
    } catch (error) {
        console.warn(
            "Không thể lưu cache sản phẩm:",
            error
        );

        /*
            Nếu cache quá lớn, thử lưu lại phiên bản
            không chứa bất kỳ ảnh Base64 nào.
        */
        try {
            const lightweightProducts =
                products
                    .slice(
                        0,
                        MAX_CACHE_PRODUCTS
                    )
                    .map(
                        (
                            product
                        ) => {
                            const cachedProduct =
                                createCachedProduct(
                                    product
                                );

                            if (
                                isBase64Image(
                                    cachedProduct.image
                                )
                            ) {
                                cachedProduct.image =
                                    "";

                                cachedProduct.imageUrl =
                                    "";
                            }

                            return cachedProduct;
                        }
                    );

            localStorage.setItem(
                PRODUCT_CACHE_KEY,
                JSON.stringify(
                    lightweightProducts
                )
            );
        } catch (
            secondError
        ) {
            console.warn(
                "Không thể lưu cache sản phẩm rút gọn:",
                secondError
            );

            clearProductCache();
        }
    }
}


/* =========================================================
   XÓA CACHE
========================================================= */

function clearProductCache() {
    try {
        localStorage.removeItem(
            PRODUCT_CACHE_KEY
        );

        OLD_PRODUCT_CACHE_KEYS
            .forEach(
                (
                    cacheKey
                ) => {
                    localStorage.removeItem(
                        cacheKey
                    );
                }
            );
    } catch (error) {
        console.warn(
            "Không thể xóa cache sản phẩm:",
            error
        );
    }
}


/*
    Xóa riêng cache phiên bản cũ.
*/
function clearOldProductCache() {
    try {
        OLD_PRODUCT_CACHE_KEYS
            .forEach(
                (
                    cacheKey
                ) => {
                    localStorage.removeItem(
                        cacheKey
                    );
                }
            );
    } catch (error) {
        console.warn(
            "Không thể xóa cache sản phẩm cũ:",
            error
        );
    }
}


/* =========================================================
   SO SÁNH DỮ LIỆU CACHE VÀ FIREBASE
========================================================= */

/*
    Tạo chữ ký nhỏ để kiểm tra dữ liệu Firebase
    có thực sự khác cache hay không.

    Nhờ đó giao diện không bị render lại vô ích.
*/
function createProductsSignature(
    products
) {
    return products
        .map(
            (
                product
            ) => {
                return [
                    product.id,
                    product.updatedAt,
                    product.quantity,
                    product.costPrice,
                    product.salePrice,
                    product.image
                ].join(
                    "|"
                );
            }
        )
        .join(
            "||"
        );
}


/* =========================================================
   TẢI TRƯỚC MỘT SỐ ẢNH
========================================================= */

function preloadProductImages(
    products,
    limit = 5
) {
    products
        .slice(
            0,
            limit
        )
        .forEach(
            (
                product
            ) => {
                const imageUrl =
                    getProductImageValue(
                        product
                    );

                if (
                    !imageUrl
                    ||
                    isBase64Image(
                        imageUrl
                    )
                ) {
                    return;
                }

                const image =
                    new Image();

                image.decoding =
                    "async";

                image.src =
                    imageUrl;
            }
        );
}


/* =========================================================
   LẮNG NGHE DANH SÁCH SẢN PHẨM
========================================================= */

export function listenProducts(
    callback
) {
    clearOldProductCache();

    const cachedProducts =
        readProductCache();

    let lastSignature =
        "";

    /*
        Hiển thị cache ngay để tên, giá, tồn kho
        và đường dẫn ảnh xuất hiện sớm.
    */
    if (
        cachedProducts.length
    ) {
        lastSignature =
            createProductsSignature(
                cachedProducts
            );

        preloadProductImages(
            cachedProducts
        );

        callback(
            cachedProducts,
            {
                fromCache:
                    true
            }
        );
    }

    /*
        Firebase tiếp tục đồng bộ dữ liệu thật ở nền.
    */
    return onValue(
        productRef,

        (
            snapshot
        ) => {
            const products =
                normalizeProducts(
                    snapshot.val()
                );

            const currentSignature =
                createProductsSignature(
                    products
                );

            saveProductCache(
                products
            );

            preloadProductImages(
                products
            );

            /*
                Chỉ render lại nếu Firebase có dữ liệu khác cache.
            */
            if (
                currentSignature
                ===
                lastSignature
            ) {
                return;
            }

            lastSignature =
                currentSignature;

            callback(
                products,
                {
                    fromCache:
                        false
                }
            );
        },

        (
            error
        ) => {
            console.error(
                "Không thể đọc danh sách sản phẩm:",
                error
            );

            /*
                Nếu đã có cache thì giữ giao diện hiện tại.

                Nếu chưa có cache mới trả mảng rỗng.
            */
            if (
                !cachedProducts.length
            ) {
                callback(
                    [],
                    {
                        fromCache:
                            false,

                        error
                    }
                );
            }
        }
    );
}
/* =========================================================
   THÊM SẢN PHẨM
========================================================= */

export async function createProduct(
    product
) {
    const normalizedProduct =
        normalizeProductBeforeSave(
            product
        );

    const newProductRef =
        push(
            productRef
        );

    const now =
        Date.now();

    await set(
        newProductRef,
        {
            ...normalizedProduct,

            createdAt:
                now,

            updatedAt:
                now
        }
    );

    return newProductRef.key;
}


/* =========================================================
   CẬP NHẬT SẢN PHẨM
========================================================= */

export async function updateProduct(
    productId,
    product
) {
    const normalizedProductId =
        String(
            productId
            ||
            ""
        ).trim();

    if (!normalizedProductId) {
        throw new Error(
            "Thiếu ID sản phẩm."
        );
    }

    const normalizedProduct =
        normalizeProductBeforeSave(
            product
        );

    const currentProductRef =
        ref(
            db,
            `products/${normalizedProductId}`
        );

    await update(
        currentProductRef,
        {
            ...normalizedProduct,

            updatedAt:
                Date.now()
        }
    );
}


/* =========================================================
   ĐÁNH DẤU SẢN PHẨM HẾT HÀNG
========================================================= */

export async function markProductOutOfStock(
    productId
) {
    const normalizedProductId =
        String(
            productId
            || ""
        ).trim();

    if (!normalizedProductId) {
        throw new Error(
            "Thiếu ID sản phẩm."
        );
    }

    const currentProductRef =
        ref(
            db,
            `products/${normalizedProductId}`
        );

    await update(
        currentProductRef,
        {
            quantity:
                0,

            updatedAt:
                Date.now()
        }
    );
}


/* =========================================================
   XÓA SẢN PHẨM
========================================================= */

export async function deleteProduct(
    productId
) {
    const normalizedProductId =
        String(
            productId
            ||
            ""
        ).trim();

    if (!normalizedProductId) {
        throw new Error(
            "Thiếu ID sản phẩm."
        );
    }

    const currentProductRef =
        ref(
            db,
            `products/${normalizedProductId}`
        );

    await remove(
        currentProductRef
    );
}


/* =========================================================
   CHUẨN HÓA TRƯỚC KHI LƯU FIREBASE
========================================================= */

function normalizeProductBeforeSave(
    product
) {
    const image =
        getProductImageValue(
            product
        );

    return {
        name:
            String(
                product?.name
                ||
                ""
            ).trim(),

        sku:
            String(
                product?.sku
                ||
                ""
            ).trim(),

        barcode:
            String(
                product?.barcode
                ||
                ""
            ).trim(),

        categoryId:
            String(
                product?.categoryId
                ||
                ""
            ).trim(),

        category:
            String(
                product?.category
                ||
                ""
            ).trim(),

        categoryPrefix:
            String(
                product?.categoryPrefix
                ||
                ""
            ).trim(),

        quantity:
            normalizeQuantity(
                product?.quantity
                ??
                product?.stock
                ??
                0
            ),

        costPrice:
            normalizeMoney(
                product?.costPrice
                ??
                product?.purchasePrice
                ??
                product?.importPrice
                ??
                product?.buyPrice
                ??
                product?.entryPrice
                ??
                0
            ),

        salePrice:
            normalizeMoney(
                product?.salePrice
                ??
                product?.price
                ??
                0
            ),

        /*
            Chỉ lưu một trường image trong Realtime Database.
            Hàm đọc vẫn hỗ trợ imageUrl để tương thích dữ liệu cũ.
        */
        image,

        imageStoragePath:
            String(
                product?.imageStoragePath
                ||
                ""
            ).trim(),

        description:
            String(
                product?.description
                ||
                ""
            ).trim()
    };
}


/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

function getProductImageValue(
    product
) {
    return String(
        product?.image
        ||
        product?.imageUrl
        ||
        ""
    ).trim();
}


function isBase64Image(
    value
) {
    return String(
        value
        ||
        ""
    )
        .trim()
        .toLowerCase()
        .startsWith(
            "data:image/"
        );
}


function normalizeQuantity(
    value
) {
    const quantity =
        Number(
            value
        );

    if (
        !Number.isFinite(
            quantity
        )
        ||
        quantity < 0
    ) {
        return 0;
    }

    return Math.floor(
        quantity
    );
}


function normalizeMoney(
    value
) {
    const money =
        Number(
            value
        );

    if (
        !Number.isFinite(
            money
        )
        ||
        money < 0
    ) {
        return 0;
    }

    return Math.round(
        money
    );
}


/* =========================================================
   CHO PHÉP FILE KHÁC CHỦ ĐỘNG XÓA CACHE
========================================================= */

export function clearProductsCache() {
    clearProductCache();
}