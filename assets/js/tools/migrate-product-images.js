import {
    get,
    ref as databaseRef,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    getDownloadURL,
    ref as storageRef,
    uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import {
    db,
    storage
} from "../firebase-config.js";


/* =========================================================
   CẤU HÌNH
========================================================= */

const PRODUCTS_PATH =
    "products";

const MAX_IMAGE_WIDTH =
    700;

const MAX_IMAGE_HEIGHT =
    700;

const JPEG_QUALITY =
    0.62;


/* =========================================================
   CHUYỂN TOÀN BỘ ẢNH BASE64 CŨ
========================================================= */

export async function migrateLegacyProductImages(
    onProgress = null
) {
    const productsSnapshot =
        await get(
            databaseRef(
                db,
                PRODUCTS_PATH
            )
        );

    const products =
        productsSnapshot.val()
        || {};

    /*
        Chỉ lấy những sản phẩm có ảnh Base64 cũ.
    */
    const legacyProducts =
        Object.entries(
            products
        ).filter(
            ([, product]) => {
                return isBase64Image(
                    product?.image
                    ||
                    product?.imageUrl
                );
            }
        );

    const total =
        legacyProducts.length;

    /*
        Không còn ảnh Base64 cần chuyển.
    */
    if (!total) {
        notifyProgress(
            onProgress,
            {
                current:
                    0,

                total:
                    0,

                success:
                    0,

                failed:
                    0,

                message:
                    "Không có ảnh Base64 cũ cần chuyển."
            }
        );

        return {
            total:
                0,

            success:
                0,

            failed:
                0,

            errors:
                []
        };
    }

    let success =
        0;

    let failed =
        0;

    const errors =
        [];

    /*
        Chuyển lần lượt từng ảnh.

        Không upload đồng thời quá nhiều ảnh để:
        - tránh treo trình duyệt;
        - tránh quá tải mạng;
        - dễ theo dõi sản phẩm bị lỗi.
    */
    for (
        let index = 0;
        index < legacyProducts.length;
        index += 1
    ) {
        const [
            productId,
            product
        ] =
            legacyProducts[index];

        const productName =
            String(
                product?.name
                || productId
            );

        notifyProgress(
            onProgress,
            {
                current:
                    index,

                total,

                productId,

                productName,

                success,

                failed,

                message:
                    `Đang chuyển ảnh ${index + 1}/${total}: ${productName}`
            }
        );

        try {
            /*
                Đọc ảnh Base64, thu nhỏ và chuyển thành JPEG Blob.
            */
            const legacyImage =
                product?.image
                ||
                product?.imageUrl
                ||
                "";

            const compressedBlob =
                await convertBase64ToCompressedBlob(
                    legacyImage
                );

            const safeName =
                createSafeName(
                    productName
                );

            const fileName =
                `${Date.now()}-${productId}-${safeName}.jpg`;

            const imageStoragePath =
                `product-images/${fileName}`;

            const imageReference =
                storageRef(
                    storage,
                    imageStoragePath
                );

            /*
                Upload ảnh mới lên Firebase Storage.
            */
            await uploadBytes(
                imageReference,
                compressedBlob,
                {
                    contentType:
                        "image/jpeg",

                    customMetadata: {
                        migratedFrom:
                            "realtime-database-base64",

                        productId:
                            String(
                                productId
                            ),

                        migratedAt:
                            String(
                                Date.now()
                            )
                    }
                }
            );

            /*
                Lấy URL dùng để hiển thị ảnh.
            */
            const imageUrl =
                await getDownloadURL(
                    imageReference
                );

            /*
                Cập nhật sản phẩm trong Realtime Database.

                Sau bước này trường image không còn chứa Base64.
            */
            await update(
                databaseRef(
                    db,
                    `${PRODUCTS_PATH}/${productId}`
                ),
                {
                    image:
                        imageUrl,

                    /*
                        Gán null để Firebase xóa trường imageUrl cũ,
                        tránh lưu cùng một URL hai lần.
                    */
                    imageUrl:
                        null,

                    imageStoragePath,

                    updatedAt:
                        Date.now()
                }
            );

            success +=
                1;
        } catch (error) {
            failed +=
                1;

            errors.push({
                productId,

                productName,

                message:
                    error?.message
                    || "Không rõ lỗi."
            });

            console.error(
                `Không chuyển được ảnh sản phẩm ${productName}:`,
                error
            );
        }

        notifyProgress(
            onProgress,
            {
                current:
                    index + 1,

                total,

                productId,

                productName,

                success,

                failed,

                message:
                    `Đã xử lý ${index + 1}/${total} ảnh.`
            }
        );
    }

    return {
        total,

        success,

        failed,

        errors
    };
}


/* =========================================================
   KIỂM TRA ẢNH BASE64
========================================================= */

function isBase64Image(
    value
) {
    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .startsWith(
            "data:image/"
        );
}


/* =========================================================
   CHUYỂN BASE64 THÀNH ẢNH JPEG ĐÃ NÉN
========================================================= */

async function convertBase64ToCompressedBlob(
    dataUrl
) {
    const image =
        await loadImage(
            dataUrl
        );

    const {
        width,
        height
    } =
        calculateImageSize(
            image.naturalWidth
            || image.width,

            image.naturalHeight
            || image.height
        );

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        width;

    canvas.height =
        height;

    const context =
        canvas.getContext(
            "2d",
            {
                alpha:
                    false
            }
        );

    if (!context) {
        throw new Error(
            "Trình duyệt không hỗ trợ xử lý ảnh."
        );
    }

    /*
        Đặt nền trắng để ảnh PNG trong suốt
        không bị chuyển thành nền đen.
    */
    context.fillStyle =
        "#ffffff";

    context.fillRect(
        0,
        0,
        width,
        height
    );

    context.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    return canvasToBlob(
        canvas
    );
}


/* =========================================================
   TẢI BASE64 VÀO IMAGE
========================================================= */

function loadImage(
    dataUrl
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const image =
                new Image();

            image.onload =
                () => {
                    resolve(
                        image
                    );
                };

            image.onerror =
                () => {
                    reject(
                        new Error(
                            "Không đọc được ảnh Base64."
                        )
                    );
                };

            image.src =
                dataUrl;
        }
    );
}


/* =========================================================
   TÍNH KÍCH THƯỚC ẢNH
========================================================= */

function calculateImageSize(
    originalWidth,
    originalHeight
) {
    const width =
        Math.max(
            Number(
                originalWidth || 1
            ),
            1
        );

    const height =
        Math.max(
            Number(
                originalHeight || 1
            ),
            1
        );

    /*
        Không phóng to ảnh nhỏ.

        Chỉ thu nhỏ ảnh nếu vượt quá 900 × 900.
    */
    const ratio =
        Math.min(
            MAX_IMAGE_WIDTH
            / width,

            MAX_IMAGE_HEIGHT
            / height,

            1
        );

    return {
        width:
            Math.max(
                1,
                Math.round(
                    width * ratio
                )
            ),

        height:
            Math.max(
                1,
                Math.round(
                    height * ratio
                )
            )
    };
}


/* =========================================================
   CHUYỂN CANVAS THÀNH BLOB
========================================================= */

function canvasToBlob(
    canvas
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "Không thể nén ảnh."
                            )
                        );

                        return;
                    }

                    resolve(
                        blob
                    );
                },

                "image/jpeg",

                JPEG_QUALITY
            );
        }
    );
}


/* =========================================================
   TẠO TÊN FILE AN TOÀN
========================================================= */

function createSafeName(
    value
) {
    return String(
        value || "product"
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /đ/gi,
            "d"
        )
        .replace(
            /[^a-zA-Z0-9_-]/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        )
        .slice(
            0,
            50
        )
        || "product";
}


/* =========================================================
   CẬP NHẬT TIẾN TRÌNH
========================================================= */

function notifyProgress(
    callback,
    data
) {
    if (
        typeof callback ===
        "function"
    ) {
        callback(
            data
        );
    }
}