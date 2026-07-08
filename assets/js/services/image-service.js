import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import {
    storage
} from "../firebase-config.js";

const MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

function createSafeFileName(fileName) {
    const extension =
        String(fileName || "")
            .split(".")
            .pop()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        || "jpg";

    const randomPart =
        Math.random()
            .toString(36)
            .slice(2, 10);

    return (
        `product-${Date.now()}-`
        + `${randomPart}.${extension}`
    );
}

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

    if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(
            "Ảnh không được lớn hơn 10 MB."
        );
    }

    return true;
}

export function createLocalImagePreview(file) {
    validateProductImage(file);

    return URL.createObjectURL(file);
}

export function releaseLocalImagePreview(url) {
    if (
        typeof url === "string"
        && url.startsWith("blob:")
    ) {
        URL.revokeObjectURL(url);
    }
}

export async function uploadProductImage(
    file,
    onProgress = null
) {
    validateProductImage(file);

    const safeFileName =
        createSafeFileName(file.name);

    const storagePath =
        `products/${safeFileName}`;

    const imageRef =
        ref(
            storage,
            storagePath
        );

    const uploadTask =
        uploadBytesResumable(
            imageRef,
            file,
            {
                contentType:
                    file.type,

                customMetadata: {
                    originalName:
                        file.name || "",

                    uploadedAt:
                        new Date()
                            .toISOString()
                }
            }
        );

    return new Promise(
        (resolve, reject) => {
            uploadTask.on(
                "state_changed",

                (snapshot) => {
                    const progress =
                        snapshot.totalBytes > 0
                            ? Math.round(
                                (
                                    snapshot.bytesTransferred
                                    / snapshot.totalBytes
                                )
                                * 100
                            )
                            : 0;

                    if (
                        typeof onProgress
                        === "function"
                    ) {
                        onProgress(progress);
                    }
                },

                (error) => {
                    console.error(
                        "Lỗi tải ảnh lên Firebase Storage:",
                        error
                    );

                    if (
                        error?.code
                        === "storage/unauthorized"
                    ) {
                        reject(
                            new Error(
                                "Firebase Storage đang chặn tải ảnh. "
                                + "Hãy kiểm tra Storage Rules."
                            )
                        );

                        return;
                    }

                    if (
                        error?.code
                        === "storage/canceled"
                    ) {
                        reject(
                            new Error(
                                "Quá trình tải ảnh đã bị hủy."
                            )
                        );

                        return;
                    }

                    reject(
                        new Error(
                            "Không thể tải ảnh lên Firebase Storage."
                        )
                    );
                },

                async () => {
                    try {
                        const downloadUrl =
                            await getDownloadURL(
                                uploadTask.snapshot.ref
                            );

                        resolve({
                            url:
                                downloadUrl,

                            path:
                                storagePath,

                            name:
                                file.name || safeFileName,

                            type:
                                file.type,

                            size:
                                file.size
                        });
                    } catch (error) {
                        console.error(
                            "Không thể lấy đường dẫn ảnh:",
                            error
                        );

                        reject(
                            new Error(
                                "Ảnh đã tải lên nhưng không lấy được đường dẫn."
                            )
                        );
                    }
                }
            );
        }
    );
}

export async function deleteProductImage(
    storagePath
) {
    if (!storagePath) {
        return;
    }

    try {
        const imageRef =
            ref(
                storage,
                storagePath
            );

        await deleteObject(imageRef);
    } catch (error) {
        /*
            Nếu ảnh không tồn tại thì bỏ qua.
        */
        if (
            error?.code
            === "storage/object-not-found"
        ) {
            return;
        }

        console.warn(
            "Không thể xóa ảnh trên Firebase Storage:",
            error
        );
    }
}