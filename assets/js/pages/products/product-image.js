import {
    createLocalImagePreview,
    releaseLocalImagePreview,
    uploadProductImage
} from "../../services/image-service.js";

import {
    productState
} from "./products-state.js";

import {
    productElements
} from "./products-elements.js";

function showProductError(
    message
) {
    if (
        !productElements.productFormError
    ) {
        return;
    }

    productElements.productFormError.textContent =
        message;

    productElements.productFormError
        .classList.remove(
            "hidden"
        );
}

function hideProductError() {
    if (
        !productElements.productFormError
    ) {
        return;
    }

    productElements.productFormError.textContent =
        "";

    productElements.productFormError
        .classList.add(
            "hidden"
        );
}

export function showImageStatus(
    message,
    type = "loading"
) {
    if (
        !productElements.imageUploadStatus
    ) {
        return;
    }

    productElements.imageUploadStatus.textContent =
        message;

    productElements.imageUploadStatus.className =
        `image-upload-status ${type}`;
}

export function hideImageStatus() {
    if (
        !productElements.imageUploadStatus
    ) {
        return;
    }

    productElements.imageUploadStatus.textContent =
        "";

    productElements.imageUploadStatus.className =
        "image-upload-status hidden";
}

export function clearLocalPreview() {
    if (
        productState.localPreviewUrl
    ) {
        releaseLocalImagePreview(
            productState.localPreviewUrl
        );
    }

    productState.localPreviewUrl =
        "";
}

export function showImagePreview({
    url,
    name = "Ảnh sản phẩm",
    type = ""
}) {
    const {
        imagePreviewBox,
        imagePreview,
        imagePreviewName,
        imagePreviewType,
        removeSelectedImageButton
    } = productElements;

    if (
        !imagePreviewBox ||
        !imagePreview
    ) {
        return;
    }

    if (!url) {
        imagePreviewBox.classList.add(
            "hidden"
        );

        removeSelectedImageButton
            ?.classList.add(
                "hidden"
            );

        imagePreview.removeAttribute(
            "src"
        );

        if (imagePreviewName) {
            imagePreviewName.textContent =
                "";
        }

        if (imagePreviewType) {
            imagePreviewType.textContent =
                "";
        }

        return;
    }

    imagePreview.src =
        url;

    if (imagePreviewName) {
        imagePreviewName.textContent =
            name;
    }

    if (imagePreviewType) {
        imagePreviewType.textContent =
            type;
    }

    imagePreviewBox.classList.remove(
        "hidden"
    );

    removeSelectedImageButton
        ?.classList.remove(
            "hidden"
        );
}

export function resetImageState() {
    clearLocalPreview();

    productState.imageMode =
        "url";

    productState.selectedImageFile =
        null;

    productState.uploadedImageUrl =
        "";

    productState.uploadedImagePath =
        "";

    productState.isUploadingImage =
        false;

    if (
        productElements.imageFileInput
    ) {
        productElements.imageFileInput.value =
            "";
    }

    if (
        productElements.imageCameraInput
    ) {
        productElements.imageCameraInput.value =
            "";
    }

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}

export function setImageMode(
    mode
) {
    const allowedModes = [
        "url",
        "file",
        "camera"
    ];

    const safeMode =
        allowedModes.includes(
            mode
        )
            ? mode
            : "url";

    productState.imageMode =
        safeMode;

    document
        .querySelectorAll(
            "[data-image-mode]"
        )
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.imageMode ===
                    safeMode
            );
        });

    productElements.imageUrlBox
        ?.classList.toggle(
            "hidden",
            safeMode !== "url"
        );

    productElements.imageFileBox
        ?.classList.toggle(
            "hidden",
            safeMode !== "file"
        );

    productElements.imageCameraBox
        ?.classList.toggle(
            "hidden",
            safeMode !== "camera"
        );

    hideImageStatus();
}

export function handleImageUrlInput() {
    if (
        productState.imageMode !==
        "url"
    ) {
        return;
    }

    const imageUrl =
        productElements.image
            ?.value
            .trim() || "";

    productState.uploadedImageUrl =
        imageUrl;

    productState.uploadedImagePath =
        "";

    if (!imageUrl) {
        showImagePreview({
            url: ""
        });

        return;
    }

    showImagePreview({
        url:
            imageUrl,

        name:
            "Ảnh từ đường dẫn",

        type:
            "Link ảnh"
    });
}

export function handleSelectedImageFile(
    file
) {
    hideProductError();
    hideImageStatus();

    if (!file) {
        return;
    }

    try {
        clearLocalPreview();

        productState.selectedImageFile =
            file;

        productState.uploadedImageUrl =
            "";

        productState.uploadedImagePath =
            "";

        productState.localPreviewUrl =
            createLocalImagePreview(
                file
            );

        const fileSizeKb =
            Math.round(
                Number(
                    file.size || 0
                ) / 1024
            );

        showImagePreview({
            url:
                productState.localPreviewUrl,

            name:
                file.name ||
                "Ảnh vừa chụp",

            type:
                `${
                    file.type ||
                    "Ảnh"
                } · ${fileSizeKb} KB`
        });
    } catch (error) {
        console.error(
            "Không thể chọn ảnh:",
            error
        );

        productState.selectedImageFile =
            null;

        showProductError(
            error.message ||
            "Không thể chọn ảnh."
        );
    }
}

export function removeSelectedImage() {
    clearLocalPreview();

    productState.selectedImageFile =
        null;

    productState.uploadedImageUrl =
        "";

    productState.uploadedImagePath =
        "";

    if (
        productElements.image
    ) {
        productElements.image.value =
            "";
    }

    if (
        productElements.imageFileInput
    ) {
        productElements.imageFileInput.value =
            "";
    }

    if (
        productElements.imageCameraInput
    ) {
        productElements.imageCameraInput.value =
            "";
    }

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}

export async function uploadSelectedImageIfNeeded() {
    /*
        Không có file mới:

        - Giữ ảnh cũ khi sửa sản phẩm.
        - Hoặc sử dụng link ảnh trong ô image.
    */
    if (
        !productState.selectedImageFile
    ) {
        return (
            productElements.image
                ?.value
                .trim()
            ||
            productState.uploadedImageUrl
            ||
            ""
        );
    }

    if (
        productState.isUploadingImage
    ) {
        throw new Error(
            "Ảnh đang được xử lý."
        );
    }

    productState.isUploadingImage =
        true;

    if (
        productElements.saveProductButton
    ) {
        productElements.saveProductButton.disabled =
            true;

        productElements.saveProductButton.textContent =
            "Đang xử lý ảnh...";
    }

    try {
        /*
            image-service.js sẽ:

            - Kiểm tra ảnh.
            - Nén ảnh.
            - Chuyển thành Base64.
            - Trả Base64 trong result.url.
        */
        const result =
            await uploadProductImage(
                productState.selectedImageFile,

                (progress) => {
                    showImageStatus(
                        `Đang xử lý ảnh: ${progress}%`,
                        "loading"
                    );
                }
            );

        if (
            !result?.url
        ) {
            throw new Error(
                "Không nhận được dữ liệu ảnh sau khi xử lý."
            );
        }

        productState.uploadedImageUrl =
            result.url;

        productState.uploadedImagePath =
            result.path || "";

        if (
            productElements.image
        ) {
            productElements.image.value =
                result.url;
        }

        productState.selectedImageFile =
            null;

        clearLocalPreview();

        showImageStatus(
            "Đã xử lý và nén ảnh thành công.",
            "success"
        );

        const sizeKb =
            Math.round(
                Number(
                    result.size || 0
                ) / 1024
            );

        showImagePreview({
            url:
                result.url,

            name:
                result.name ||
                "Ảnh sản phẩm",

            type:
                sizeKb > 0
                    ? `Ảnh đã nén · ${sizeKb} KB`
                    : "Ảnh đã nén và lưu vào hệ thống"
        });

        return result.url;
    } catch (error) {
        console.error(
            "Không thể xử lý ảnh:",
            error
        );

        showImageStatus(
            "Xử lý ảnh thất bại.",
            "error"
        );

        throw error;
    } finally {
        productState.isUploadingImage =
            false;

        if (
            productElements.saveProductButton
        ) {
            productElements.saveProductButton.disabled =
                false;

            productElements.saveProductButton.textContent =
                "Lưu sản phẩm";
        }
    }
}

export function bindProductImageEvents() {
    document
        .querySelectorAll(
            "[data-image-mode]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    setImageMode(
                        button.dataset.imageMode
                    );
                }
            );
        });

    productElements.image
        ?.addEventListener(
            "input",
            handleImageUrlInput
        );

    productElements.image
        ?.addEventListener(
            "change",
            handleImageUrlInput
        );

    productElements.imageFileInput
        ?.addEventListener(
            "change",
            (event) => {
                handleSelectedImageFile(
                    event.target.files?.[0]
                );
            }
        );

    productElements.imageCameraInput
        ?.addEventListener(
            "change",
            (event) => {
                handleSelectedImageFile(
                    event.target.files?.[0]
                );
            }
        );

    productElements.removeSelectedImageButton
        ?.addEventListener(
            "click",
            removeSelectedImage
        );

    productElements.imagePreview
        ?.addEventListener(
            "error",
            () => {
                showImageStatus(
                    "Không thể hiển thị ảnh này.",
                    "error"
                );
            }
        );

    productElements.imagePreview
        ?.addEventListener(
            "load",
            () => {
                if (
                    productState.imageMode ===
                    "url"
                ) {
                    hideImageStatus();
                }
            }
        );
}