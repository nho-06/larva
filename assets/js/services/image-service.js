import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import {
    storage
} from "../firebase-config.js";


/* =========================================================
   CẤU HÌNH ẢNH
========================================================= */

const MAX_ORIGINAL_IMAGE_SIZE =
    10 * 1024 * 1024;

const MAX_COMPRESSED_IMAGE_SIZE =
    100 * 1024;

const MAX_IMAGE_WIDTH =
    700;

const MAX_IMAGE_HEIGHT =
    700;

const DEFAULT_JPEG_QUALITY =
    0.68;

const MIN_JPEG_QUALITY =
    0.32;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


/* =========================================================
   KIỂM TRA FILE
========================================================= */

export function validateProductImage(
    file
) {
    if (
        !(file instanceof File)
    ) {
        throw new Error(
            "Bạn chưa chọn ảnh."
        );
    }

    if (
        !ALLOWED_IMAGE_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP."
        );
    }

    if (
        file.size >
        MAX_ORIGINAL_IMAGE_SIZE
    ) {
        throw new Error(
            "Ảnh ban đầu không được lớn hơn 10 MB."
        );
    }

    return true;
}


/* =========================================================
   ẢNH XEM TRƯỚC
========================================================= */

export function createLocalImagePreview(
    file
) {
    validateProductImage(
        file
    );

    return URL.createObjectURL(
        file
    );
}


export function releaseLocalImagePreview(
    url
) {
    if (
        typeof url === "string"
        &&
        url.startsWith(
            "blob:"
        )
    ) {
        URL.revokeObjectURL(
            url
        );
    }
}


/* =========================================================
   ĐỌC FILE ẢNH
========================================================= */

function readFileAsDataUrl(
    file
) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload =
                () => {
                    resolve(
                        String(
                            reader.result || ""
                        )
                    );
                };

            reader.onerror =
                () => {
                    reject(
                        new Error(
                            "Không thể đọc file ảnh."
                        )
                    );
                };

            reader.readAsDataURL(
                file
            );
        }
    );
}


function loadImage(
    dataUrl
) {
    return new Promise(
        (resolve, reject) => {
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
                            "Không thể xử lý ảnh đã chọn."
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
    let width =
        Math.max(
            Number(
                originalWidth || 1
            ),
            1
        );

    let height =
        Math.max(
            Number(
                originalHeight || 1
            ),
            1
        );

    const widthRatio =
        MAX_IMAGE_WIDTH /
        width;

    const heightRatio =
        MAX_IMAGE_HEIGHT /
        height;

    const resizeRatio =
        Math.min(
            widthRatio,
            heightRatio,
            1
        );

    width =
        Math.max(
            Math.round(
                width *
                resizeRatio
            ),
            1
        );

    height =
        Math.max(
            Math.round(
                height *
                resizeRatio
            ),
            1
        );

    return {
        width,
        height
    };
}


/* =========================================================
   CANVAS THÀNH BLOB
========================================================= */

function canvasToBlob(
    canvas,
    quality
) {
    return new Promise(
        (resolve, reject) => {
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
                quality
            );
        }
    );
}


/* =========================================================
   NÉN ẢNH
========================================================= */

async function compressProductImage(
    file,
    onProgress
) {
    updateProgress(
        onProgress,
        5
    );

    const originalDataUrl =
        await readFileAsDataUrl(
            file
        );

    updateProgress(
        onProgress,
        15
    );

    const image =
        await loadImage(
            originalDataUrl
        );

    updateProgress(
        onProgress,
        25
    );

    const {
        width,
        height
    } = calculateImageSize(
        image.naturalWidth
        ||
        image.width,

        image.naturalHeight
        ||
        image.height
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

    updateProgress(
        onProgress,
        35
    );

    const qualityLevels = [
        DEFAULT_JPEG_QUALITY,
        0.60,
        0.52,
        0.44,
        0.36,
        MIN_JPEG_QUALITY
    ];

    let compressedBlob =
        null;

    for (
        const quality
        of qualityLevels
    ) {
        compressedBlob =
            await canvasToBlob(
                canvas,
                quality
            );

        if (
            compressedBlob.size <=
            MAX_COMPRESSED_IMAGE_SIZE
        ) {
            break;
        }
    }

    if (!compressedBlob) {
        throw new Error(
            "Không thể tạo ảnh đã nén."
        );
    }

    if (
        compressedBlob.size >
        MAX_COMPRESSED_IMAGE_SIZE
    ) {
        throw new Error(
            "Ảnh sau khi nén vẫn còn quá lớn. "
            +
            "Hãy chọn ảnh đơn giản hoặc nhỏ hơn."
        );
    }

    updateProgress(
        onProgress,
        45
    );

    return {
        blob:
            compressedBlob,

        width,

        height,

        size:
            compressedBlob.size
    };
}


/* =========================================================
   TẠO TÊN FILE AN TOÀN
========================================================= */

function createSafeFileName(
    originalName
) {
    const baseName =
        String(
            originalName || "product"
        )
            .replace(
                /\.[^/.]+$/,
                ""
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
                /^-|-$|_/g,
                ""
            )
            .slice(
                0,
                60
            )
        ||
        "product";

    const randomPart =
        Math.random()
            .toString(36)
            .slice(2, 10);

    return (
        `${Date.now()}-${randomPart}-${baseName}.jpg`
    );
}


/* =========================================================
   UPLOAD FIREBASE STORAGE
========================================================= */

export async function uploadProductImage(
    file,
    onProgress = null
) {
    validateProductImage(
        file
    );

    updateProgress(
        onProgress,
        0
    );

    try {
        const compressed =
            await compressProductImage(
                file,
                onProgress
            );

        const fileName =
            createSafeFileName(
                file.name
            );

        const storagePath =
            `product-images/${fileName}`;

        const imageRef =
            ref(
                storage,
                storagePath
            );

        const metadata = {
            contentType:
                "image/jpeg",

            customMetadata: {
                originalName:
                    String(
                        file.name || ""
                    ),

                uploadedAt:
                    String(
                        Date.now()
                    )
            }
        };

        const uploadTask =
            uploadBytesResumable(
                imageRef,
                compressed.blob,
                metadata
            );

        const snapshot =
            await waitForUpload(
                uploadTask,
                onProgress
            );

        const downloadUrl =
            await getDownloadURL(
                snapshot.ref
            );

        updateProgress(
            onProgress,
            100
        );

        return {
            url:
                downloadUrl,

            path:
                storagePath,

            name:
                fileName,

            originalName:
                file.name
                ||
                "product-image.jpg",

            type:
                "image/jpeg",

            size:
                compressed.size,

            width:
                compressed.width,

            height:
                compressed.height
        };
    } catch (error) {
        console.error(
            "Không thể tải ảnh sản phẩm:",
            error
        );

        throw new Error(
            getImageErrorMessage(
                error
            )
        );
    }
}


/* =========================================================
   CHỜ UPLOAD
========================================================= */

function waitForUpload(
    uploadTask,
    onProgress
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            uploadTask.on(
                "state_changed",

                (snapshot) => {
                    const totalBytes =
                        Number(
                            snapshot.totalBytes
                            ||
                            0
                        );

                    const bytesTransferred =
                        Number(
                            snapshot.bytesTransferred
                            ||
                            0
                        );

                    if (
                        totalBytes <= 0
                    ) {
                        return;
                    }

                    const uploadPercent =
                        (
                            bytesTransferred /
                            totalBytes
                        ) *
                        50;

                    const progress =
                        45 +
                        uploadPercent;

                    updateProgress(
                        onProgress,
                        Math.min(
                            progress,
                            95
                        )
                    );
                },

                (error) => {
                    reject(
                        error
                    );
                },

                () => {
                    resolve(
                        uploadTask.snapshot
                    );
                }
            );
        }
    );
}


/* =========================================================
   XÓA ẢNH STORAGE
========================================================= */

export async function deleteProductImage(
    storagePath
) {
    const normalizedPath =
        String(
            storagePath
            ||
            ""
        ).trim();

    if (!normalizedPath) {
        return;
    }

    try {
        const imageRef =
            ref(
                storage,
                normalizedPath
            );

        await deleteObject(
            imageRef
        );
    } catch (error) {
        const errorCode =
            String(
                error?.code
                ||
                ""
            );

        if (
            errorCode ===
            "storage/object-not-found"
        ) {
            return;
        }

        console.warn(
            "Không thể xóa ảnh cũ:",
            error
        );
    }
}


/* =========================================================
   TIẾN TRÌNH
========================================================= */

function updateProgress(
    callback,
    value
) {
    if (
        typeof callback !==
        "function"
    ) {
        return;
    }

    callback(
        Math.max(
            0,
            Math.min(
                Math.round(
                    Number(
                        value || 0
                    )
                ),
                100
            )
        )
    );
}


/* =========================================================
   THÔNG BÁO LỖI
========================================================= */

function getImageErrorMessage(
    error
) {
    const errorCode =
        String(
            error?.code
            ||
            ""
        );

    if (
        errorCode ===
        "storage/unauthorized"
    ) {
        return (
            "Không có quyền tải ảnh lên Firebase Storage. "
            +
            "Hãy kiểm tra Storage Rules."
        );
    }

    if (
        errorCode ===
        "storage/canceled"
    ) {
        return "Đã hủy tải ảnh.";
    }

    if (
        errorCode ===
        "storage/retry-limit-exceeded"
    ) {
        return (
            "Tải ảnh quá lâu hoặc mạng không ổn định. "
            +
            "Vui lòng thử lại."
        );
    }

    if (
        errorCode ===
        "storage/quota-exceeded"
    ) {
        return (
            "Firebase Storage đã vượt giới hạn sử dụng."
        );
    }

    return (
        error?.message
        ||
        "Không thể tải ảnh sản phẩm."
    );
}