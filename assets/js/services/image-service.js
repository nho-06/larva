const MAX_ORIGINAL_IMAGE_SIZE =
    10 * 1024 * 1024;

/*
    Ảnh sau khi nén nên nhỏ hơn khoảng 700 KB
    để không làm Firebase Database quá nặng.
*/
const MAX_COMPRESSED_IMAGE_SIZE =
    700 * 1024;

const MAX_IMAGE_WIDTH =
    1200;

const MAX_IMAGE_HEIGHT =
    1200;

const JPEG_QUALITY =
    0.78;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


/* =========================================================
   KIỂM TRA FILE ẢNH
========================================================= */

export function validateProductImage(file) {
    if (!(file instanceof File)) {
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
        file.size > MAX_ORIGINAL_IMAGE_SIZE
    ) {
        throw new Error(
            "Ảnh ban đầu không được lớn hơn 10 MB."
        );
    }

    return true;
}


/* =========================================================
   TẠO ẢNH XEM TRƯỚC
========================================================= */

export function createLocalImagePreview(file) {
    validateProductImage(file);

    return URL.createObjectURL(file);
}


/* =========================================================
   XÓA LINK ẢNH TẠM
========================================================= */

export function releaseLocalImagePreview(url) {
    if (
        typeof url === "string"
        && url.startsWith("blob:")
    ) {
        URL.revokeObjectURL(url);
    }
}


/* =========================================================
   ĐỌC FILE THÀNH DATA URL
========================================================= */

function readFileAsDataUrl(file) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload = () => {
                resolve(
                    String(
                        reader.result || ""
                    )
                );
            };

            reader.onerror = () => {
                reject(
                    new Error(
                        "Không thể đọc file ảnh."
                    )
                );
            };

            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   TẢI DATA URL THÀNH IMAGE
========================================================= */

function loadImage(dataUrl) {
    return new Promise(
        (resolve, reject) => {
            const image =
                new Image();

            image.onload = () => {
                resolve(image);
            };

            image.onerror = () => {
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
   TÍNH KÍCH THƯỚC ẢNH SAU KHI THU NHỎ
========================================================= */

function calculateImageSize(
    originalWidth,
    originalHeight
) {
    let width =
        Number(originalWidth || 1);

    let height =
        Number(originalHeight || 1);

    const widthRatio =
        MAX_IMAGE_WIDTH / width;

    const heightRatio =
        MAX_IMAGE_HEIGHT / height;

    const ratio =
        Math.min(
            widthRatio,
            heightRatio,
            1
        );

    width =
        Math.round(
            width * ratio
        );

    height =
        Math.round(
            height * ratio
        );

    return {
        width:
            Math.max(width, 1),

        height:
            Math.max(height, 1)
    };
}


/* =========================================================
   TÍNH DUNG LƯỢNG DATA URL
========================================================= */

function getDataUrlSize(dataUrl) {
    const base64 =
        String(dataUrl || "")
            .split(",")[1]
        || "";

    return Math.round(
        base64.length * 0.75
    );
}


/* =========================================================
   NÉN ẢNH
========================================================= */

async function compressProductImage(
    file,
    onProgress
) {
    if (
        typeof onProgress
        === "function"
    ) {
        onProgress(10);
    }

    const originalDataUrl =
        await readFileAsDataUrl(file);

    if (
        typeof onProgress
        === "function"
    ) {
        onProgress(30);
    }

    const image =
        await loadImage(
            originalDataUrl
        );

    if (
        typeof onProgress
        === "function"
    ) {
        onProgress(50);
    }

    const {
        width,
        height
    } = calculateImageSize(
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
                alpha: false
            }
        );

    if (!context) {
        throw new Error(
            "Trình duyệt không hỗ trợ xử lý ảnh."
        );
    }

    /*
        Nền trắng để ảnh PNG trong suốt
        không bị thành nền đen khi đổi sang JPG.
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

    if (
        typeof onProgress
        === "function"
    ) {
        onProgress(70);
    }

    /*
        Thử nén nhiều mức để giảm dung lượng.
    */
    const qualityLevels = [
        JPEG_QUALITY,
        0.68,
        0.58,
        0.48
    ];

    let compressedDataUrl =
        "";

    for (
        const quality
        of qualityLevels
    ) {
        compressedDataUrl =
            canvas.toDataURL(
                "image/jpeg",
                quality
            );

        const compressedSize =
            getDataUrlSize(
                compressedDataUrl
            );

        if (
            compressedSize
            <= MAX_COMPRESSED_IMAGE_SIZE
        ) {
            break;
        }
    }

    const finalSize =
        getDataUrlSize(
            compressedDataUrl
        );

    if (
        finalSize
        > MAX_COMPRESSED_IMAGE_SIZE
    ) {
        throw new Error(
            "Ảnh sau khi nén vẫn còn quá lớn. "
            + "Hãy chọn ảnh có kích thước nhỏ hơn."
        );
    }

    if (
        typeof onProgress
        === "function"
    ) {
        onProgress(90);
    }

    return {
        dataUrl:
            compressedDataUrl,

        size:
            finalSize,

        width,

        height
    };
}


/* =========================================================
   XỬ LÝ ẢNH SẢN PHẨM

   Không còn upload Firebase Storage.
   Ảnh được nén thành Base64 rồi lưu chung với sản phẩm
   trong Firebase Realtime Database.
========================================================= */

export async function uploadProductImage(
    file,
    onProgress = null
) {
    validateProductImage(file);

    try {
        if (
            typeof onProgress
            === "function"
        ) {
            onProgress(0);
        }

        const compressed =
            await compressProductImage(
                file,
                onProgress
            );

        if (
            typeof onProgress
            === "function"
        ) {
            onProgress(100);
        }

        return {
            /*
                products.js đang lấy result.url,
                nên trả ảnh Base64 ở đây.
            */
            url:
                compressed.dataUrl,

            /*
                Không dùng Firebase Storage nữa,
                vì vậy path để trống.
            */
            path:
                "",

            name:
                file.name
                || "product-image.jpg",

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
            "Không thể xử lý ảnh:",
            error
        );

        throw new Error(
            error.message
            || "Không thể xử lý ảnh sản phẩm."
        );
    }
}


/* =========================================================
   KHÔNG CẦN XÓA FIREBASE STORAGE

   Hàm vẫn giữ lại để những file khác gọi không bị lỗi.
========================================================= */

export async function deleteProductImage(
    storagePath
) {
    /*
        Ảnh hiện nằm trực tiếp trong dữ liệu sản phẩm.
        Khi xóa sản phẩm, ảnh cũng tự mất theo sản phẩm.
    */

    return;
}