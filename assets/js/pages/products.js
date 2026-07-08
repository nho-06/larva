import {
    createProduct,
    deleteProduct,
    listenProducts,
    updateProduct
} from "../services/product-service.js";

import {
    createLocalImagePreview,
    releaseLocalImagePreview,
    uploadProductImage
} from "../services/image-service.js";

import {
    escapeHtml,
    formatMoney,
    normalizeText,
    placeholderImage
} from "../utils.js";

const state = {
    products: [],

    scanner: null,
    scannerRunning: false,
    scanLocked: false,

    imageMode: "url",
    selectedImageFile: null,
    localPreviewUrl: "",
    uploadedImageUrl: "",
    uploadedImagePath: "",
    isUploadingImage: false
};

const elements = {
    productModal:
        document.querySelector("#productModal"),

    scannerModal:
        document.querySelector("#scannerModal"),

    form:
        document.querySelector("#productForm"),

    formTitle:
        document.querySelector("#formTitle"),

    productId:
        document.querySelector("#productId"),

    barcode:
        document.querySelector("#barcode"),

    name:
        document.querySelector("#name"),

    sku:
        document.querySelector("#sku"),

    category:
        document.querySelector("#category"),

    quantity:
        document.querySelector("#quantity"),

    costPrice:
        document.querySelector("#costPrice"),

    salePrice:
        document.querySelector("#salePrice"),

    image:
        document.querySelector("#image"),

    description:
        document.querySelector("#description"),

    searchInput:
        document.querySelector("#searchInput"),

    categoryFilter:
        document.querySelector("#categoryFilter"),

    productTable:
        document.querySelector("#productTable"),

    emptyState:
        document.querySelector("#emptyState"),

    openProductForm:
        document.querySelector("#openProductForm"),

    openScannerButton:
        document.querySelector("#openScannerButton"),

    barcodePreviewBox:
        document.querySelector("#barcodePreviewBox"),

    barcodePreview:
        document.querySelector("#barcodePreview"),

    barcodeReader:
        document.querySelector("#barcodeReader"),

    scannerMessage:
        document.querySelector("#scannerMessage"),

    scannedProductBox:
        document.querySelector("#scannedProductBox"),

    imageUrlBox:
        document.querySelector("#imageUrlBox"),

    imageFileBox:
        document.querySelector("#imageFileBox"),

    imageCameraBox:
        document.querySelector("#imageCameraBox"),

    imageFileInput:
        document.querySelector("#imageFileInput"),

    imageCameraInput:
        document.querySelector("#imageCameraInput"),

    imageUploadStatus:
        document.querySelector("#imageUploadStatus"),

    imagePreviewBox:
        document.querySelector("#imagePreviewBox"),

    imagePreview:
        document.querySelector("#imagePreview"),

    imagePreviewName:
        document.querySelector("#imagePreviewName"),

    imagePreviewType:
        document.querySelector("#imagePreviewType"),

    removeSelectedImageButton:
        document.querySelector("#removeSelectedImageButton"),

    saveProductButton:
        document.querySelector("#saveProductButton"),

    productFormError:
        document.querySelector("#productFormError")
};

function generateBarcodeValue() {
    const timePart =
        Date.now().toString();

    const randomPart =
        Math.floor(
            100 + Math.random() * 900
        ).toString();

    return `LRV-${timePart}-${randomPart}`;
}

function generateSku() {
    const categoryText =
        normalizeText(
            elements.category.value
            || elements.name.value
            || "SP"
        );

    const prefix =
        categoryText
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 4)
            .toUpperCase()
        || "SP";

    const timePart =
        Date.now()
            .toString()
            .slice(-6);

    const randomPart =
        Math.floor(
            10 + Math.random() * 90
        );

    return `${prefix}-${timePart}-${randomPart}`;
}

function renderBarcode(
    target,
    barcodeValue,
    compact = false
) {
    if (
        !barcodeValue
        || typeof JsBarcode === "undefined"
    ) {
        return;
    }

    try {
        JsBarcode(
            target,
            barcodeValue,
            {
                format: "CODE128",

                width:
                    compact
                        ? 1.2
                        : 1.8,

                height:
                    compact
                        ? 36
                        : 70,

                displayValue: true,

                fontSize:
                    compact
                        ? 10
                        : 14,

                margin:
                    compact
                        ? 2
                        : 8,

                background:
                    "#ffffff",

                lineColor:
                    "#111111"
            }
        );
    } catch (error) {
        console.error(
            "Không thể tạo mã vạch:",
            error
        );
    }
}

function showFormError(message) {
    elements.productFormError.textContent =
        message;

    elements.productFormError
        .classList.remove("hidden");
}

function hideFormError() {
    elements.productFormError.textContent =
        "";

    elements.productFormError
        .classList.add("hidden");
}

function showImageStatus(
    message,
    type = "loading"
) {
    elements.imageUploadStatus.textContent =
        message;

    elements.imageUploadStatus.className =
        `image-upload-status ${type}`;
}

function hideImageStatus() {
    elements.imageUploadStatus.textContent =
        "";

    elements.imageUploadStatus.className =
        "image-upload-status hidden";
}

function clearLocalPreview() {
    if (state.localPreviewUrl) {
        releaseLocalImagePreview(
            state.localPreviewUrl
        );
    }

    state.localPreviewUrl = "";
}

function showImagePreview({
    url,
    name = "Ảnh sản phẩm",
    type = ""
}) {
    if (!url) {
        elements.imagePreviewBox
            .classList.add("hidden");

        elements.removeSelectedImageButton
            .classList.add("hidden");

        elements.imagePreview.removeAttribute(
            "src"
        );

        return;
    }

    elements.imagePreview.src =
        url;

    elements.imagePreviewName.textContent =
        name;

    elements.imagePreviewType.textContent =
        type;

    elements.imagePreviewBox
        .classList.remove("hidden");

    elements.removeSelectedImageButton
        .classList.remove("hidden");
}

function resetImageState() {
    clearLocalPreview();

    state.imageMode =
        "url";

    state.selectedImageFile =
        null;

    state.uploadedImageUrl =
        "";

    state.uploadedImagePath =
        "";

    state.isUploadingImage =
        false;

    if (elements.imageFileInput) {
        elements.imageFileInput.value =
            "";
    }

    if (elements.imageCameraInput) {
        elements.imageCameraInput.value =
            "";
    }

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}

function setImageMode(mode) {
    state.imageMode =
        mode;

    document
        .querySelectorAll(
            "[data-image-mode]"
        )
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.imageMode
                    === mode
            );
        });

    elements.imageUrlBox
        .classList.toggle(
            "hidden",
            mode !== "url"
        );

    elements.imageFileBox
        .classList.toggle(
            "hidden",
            mode !== "file"
        );

    elements.imageCameraBox
        .classList.toggle(
            "hidden",
            mode !== "camera"
        );

    hideImageStatus();
}

function handleImageUrlInput() {
    if (state.imageMode !== "url") {
        return;
    }

    const imageUrl =
        elements.image.value.trim();

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

function handleSelectedImageFile(file) {
    hideFormError();
    hideImageStatus();

    if (!file) {
        return;
    }

    try {
        clearLocalPreview();

        state.selectedImageFile =
            file;

        state.uploadedImageUrl =
            "";

        state.uploadedImagePath =
            "";

        state.localPreviewUrl =
            createLocalImagePreview(file);

        showImagePreview({
            url:
                state.localPreviewUrl,

            name:
                file.name
                || "Ảnh vừa chụp",

            type:
                `${file.type || "Ảnh"} · ${
                    Math.round(
                        file.size / 1024
                    )
                } KB`
        });
    } catch (error) {
        console.error(error);

        state.selectedImageFile =
            null;

        showFormError(
            error.message
            || "Không thể chọn ảnh."
        );
    }
}

function removeSelectedImage() {
    clearLocalPreview();

    state.selectedImageFile =
        null;

    state.uploadedImageUrl =
        "";

    state.uploadedImagePath =
        "";

    elements.image.value =
        "";

    if (elements.imageFileInput) {
        elements.imageFileInput.value =
            "";
    }

    if (elements.imageCameraInput) {
        elements.imageCameraInput.value =
            "";
    }

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}

async function uploadSelectedImageIfNeeded() {
    if (!state.selectedImageFile) {
        return (
            state.uploadedImageUrl
            || elements.image.value.trim()
        );
    }

    state.isUploadingImage =
        true;

    elements.saveProductButton.disabled =
        true;

    elements.saveProductButton.textContent =
        "Đang tải ảnh...";

    try {
        const result =
            await uploadProductImage(
                state.selectedImageFile,

                (progress) => {
                    showImageStatus(
                        `Đang tải ảnh: ${progress}%`,
                        "loading"
                    );
                }
            );

        state.uploadedImageUrl =
            result.url;

        state.uploadedImagePath =
            result.path;

        elements.image.value =
            result.url;

        showImageStatus(
            "Tải ảnh thành công.",
            "success"
        );

        showImagePreview({
            url:
                result.url,

            name:
                result.name
                || "Ảnh sản phẩm",

            type:
                "Đã tải lên Firebase Storage"
        });

        return result.url;

    } finally {
        state.isUploadingImage =
            false;

        elements.saveProductButton.disabled =
            false;

        elements.saveProductButton.textContent =
            "Lưu sản phẩm";
    }
}

function openProductModal(product = null) {
    elements.form.reset();

    hideFormError();

    resetImageState();

    setImageMode("url");

    elements.productId.value =
        "";

    elements.barcode.value =
        "";

    elements.quantity.value =
        0;

    elements.costPrice.value =
        0;

    elements.salePrice.value =
        0;

    elements.barcodePreviewBox
        .classList.add("hidden");

    elements.formTitle.textContent =
        product
            ? "Sửa sản phẩm"
            : "Thêm sản phẩm";

    if (product) {
        elements.productId.value =
            product.id;

        elements.barcode.value =
            product.barcode || "";

        elements.name.value =
            product.name || "";

        elements.sku.value =
            product.sku || "";

        elements.category.value =
            product.category || "";

        elements.quantity.value =
            Number(
                product.quantity || 0
            );

        elements.costPrice.value =
            Number(
                product.costPrice || 0
            );

        elements.salePrice.value =
            Number(
                product.salePrice || 0
            );

        elements.image.value =
            product.image || "";

        elements.description.value =
            product.description || "";

        state.uploadedImageUrl =
            product.image || "";

        state.uploadedImagePath =
            product.imageStoragePath || "";

        if (product.image) {
            showImagePreview({
                url:
                    product.image,

                name:
                    "Ảnh hiện tại",

                type:
                    product.imageStoragePath
                        ? "Firebase Storage"
                        : "Link ảnh"
            });
        }

        if (product.barcode) {
            elements.barcodePreviewBox
                .classList.remove("hidden");

            setTimeout(() => {
                renderBarcode(
                    "#barcodePreview",
                    product.barcode
                );
            }, 0);
        }
    } else {
        elements.barcode.value =
            generateBarcodeValue();
    }

    elements.productModal
        .classList.remove("hidden");
}

function closeProductModal() {
    if (state.isUploadingImage) {
        return;
    }

    resetImageState();

    elements.productModal
        .classList.add("hidden");
}

function getFormData(imageUrl) {
    let sku =
        elements.sku.value.trim();

    if (!sku) {
        sku =
            generateSku();
    }

    let barcode =
        elements.barcode.value.trim();

    if (!barcode) {
        barcode =
            generateBarcodeValue();
    }

    return {
        name:
            elements.name.value.trim(),

        sku,

        barcode,

        category:
            elements.category.value.trim(),

        quantity:
            Number(
                elements.quantity.value || 0
            ),

        costPrice:
            Number(
                elements.costPrice.value || 0
            ),

        salePrice:
            Number(
                elements.salePrice.value || 0
            ),

        image:
            imageUrl || "",

        imageStoragePath:
            state.uploadedImagePath || "",

        description:
            elements.description.value.trim()
    };
}

function renderCategoryFilter() {
    const currentCategory =
        elements.categoryFilter.value;

    const categories = [
        ...new Set(
            state.products
                .map((product) => {
                    return product.category?.trim();
                })
                .filter(Boolean)
        )
    ].sort((a, b) => {
        return a.localeCompare(
            b,
            "vi"
        );
    });

    elements.categoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${categories
            .map((category) => {
                return `
                    <option
                        value="${escapeHtml(category)}"
                    >
                        ${escapeHtml(category)}
                    </option>
                `;
            })
            .join("")}
    `;

    elements.categoryFilter.value =
        categories.includes(
            currentCategory
        )
            ? currentCategory
            : "";
}

function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.searchInput.value
        );

    const selectedCategory =
        elements.categoryFilter.value;

    return state.products.filter(
        (product) => {
            const matchesKeyword =
                normalizeText(
                    product.name
                ).includes(keyword)

                || normalizeText(
                    product.sku
                ).includes(keyword)

                || normalizeText(
                    product.barcode
                ).includes(keyword);

            const matchesCategory =
                !selectedCategory
                || product.category
                    === selectedCategory;

            return (
                matchesKeyword
                && matchesCategory
            );
        }
    );
}
function renderProducts() {
    const products =
        getFilteredProducts();

    elements.productTable.innerHTML =
        products
            .map((product) => {
                const productImage =
                    product.image
                    || placeholderImage();

                return `
                    <tr>
                        <td>
                            <div class="product-cell">
                                <img
                                    class="product-image"
                                    src="${escapeHtml(productImage)}"
                                    alt="${escapeHtml(product.name)}"
                                    onerror="this.src='${placeholderImage()}'"
                                >

                                <div>
                                    <span class="product-name">
                                        ${escapeHtml(product.name)}
                                    </span>

                                    <div class="product-description">
                                        ${escapeHtml(
                                            product.description
                                            || "Chưa có mô tả"
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>

                        <td>
                            ${escapeHtml(
                                product.sku || ""
                            )}
                        </td>

                        <td>
                            ${
                                product.barcode
                                    ? `
                                        <div class="table-barcode">
                                            <svg
                                                class="product-barcode"
                                                data-barcode="${escapeHtml(
                                                    product.barcode
                                                )}"
                                            ></svg>

                                            <small>
                                                ${escapeHtml(
                                                    product.barcode
                                                )}
                                            </small>
                                        </div>
                                    `
                                    : `
                                        <span class="missing-barcode">
                                            Chưa có mã
                                        </span>
                                    `
                            }
                        </td>

                        <td>
                            ${escapeHtml(
                                product.category
                                || "Chưa phân loại"
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                product.costPrice
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                product.salePrice
                            )}
                        </td>

                        <td>
                            ${Number(
                                product.quantity || 0
                            )}
                        </td>

                        <td>
                            <div class="actions">
                                <button
                                    class="button button-light"
                                    type="button"
                                    data-edit="${product.id}"
                                >
                                    Sửa
                                </button>

                                <button
                                    class="button button-danger"
                                    type="button"
                                    data-delete="${product.id}"
                                >
                                    Xóa
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");

    elements.emptyState
        .classList.toggle(
            "hidden",
            products.length > 0
        );

    renderTableBarcodes();
}

function renderTableBarcodes() {
    const barcodeElements =
        document.querySelectorAll(
            ".product-barcode"
        );

    barcodeElements.forEach(
        (barcodeElement) => {
            const barcodeValue =
                barcodeElement.dataset.barcode;

            renderBarcode(
                barcodeElement,
                barcodeValue,
                true
            );
        }
    );
}

function showScannedProduct(product) {
    const productImage =
        product.image
        || placeholderImage();

    elements.scannedProductBox.innerHTML = `
        <div class="scanned-product-content">
            <img
                class="scanned-product-image"
                src="${escapeHtml(productImage)}"
                alt="${escapeHtml(product.name)}"
                onerror="this.src='${placeholderImage()}'"
            >

            <div class="scanned-product-info">
                <span class="scan-success">
                    Đã tìm thấy sản phẩm
                </span>

                <h2>
                    ${escapeHtml(product.name)}
                </h2>

                <p>
                    Mã sản phẩm:

                    <strong>
                        ${escapeHtml(
                            product.sku || ""
                        )}
                    </strong>
                </p>

                <p>
                    Mã vạch:

                    <strong>
                        ${escapeHtml(
                            product.barcode || ""
                        )}
                    </strong>
                </p>

                <p>
                    Danh mục:

                    <strong>
                        ${escapeHtml(
                            product.category
                            || "Chưa phân loại"
                        )}
                    </strong>
                </p>

                <p>
                    Giá bán:

                    <strong>
                        ${formatMoney(
                            product.salePrice
                        )}
                    </strong>
                </p>

                <p>
                    Tồn kho:

                    <strong>
                        ${Number(
                            product.quantity || 0
                        )}
                    </strong>
                </p>
            </div>

            <button
                class="button button-light"
                type="button"
                id="closeScannedProduct"
            >
                Đóng
            </button>
        </div>
    `;

    elements.scannedProductBox
        .classList.remove("hidden");

    document
        .querySelector(
            "#closeScannedProduct"
        )
        ?.addEventListener(
            "click",
            () => {
                elements.scannedProductBox
                    .classList.add("hidden");

                elements.searchInput.value =
                    "";

                renderProducts();
            }
        );

    elements.scannedProductBox
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}

function createScanner() {
    return new Html5Qrcode(
        "barcodeReader",
        false
    );
}

function getScannerConfig() {
    const screenWidth =
        Math.max(
            window.innerWidth || 320,
            320
        );

    const scanWidth =
        Math.min(
            380,
            Math.max(
                280,
                screenWidth - 24
            )
        );

    return {
        fps: 30,

        qrbox: {
            width: scanWidth,
            height: 190
        },

        aspectRatio: 16 / 9,

        disableFlip: true,

        experimentalFeatures: {
            useBarCodeDetectorIfSupported:
                true
        }
    };
}

async function applyCameraSettings() {
    if (
        !state.scanner
        || !state.scannerRunning
    ) {
        return;
    }

    try {
        const capabilities =
            state.scanner
                .getRunningTrackCameraCapabilities();

        const advancedSettings = {};

        if (
            Array.isArray(
                capabilities.focusMode
            )
            && capabilities.focusMode.includes(
                "continuous"
            )
        ) {
            advancedSettings.focusMode =
                "continuous";
        }

        if (capabilities.zoom) {
            const minZoom =
                Number(
                    capabilities.zoom.min ?? 1
                );

            const maxZoom =
                Number(
                    capabilities.zoom.max ?? 1
                );

            advancedSettings.zoom =
                Math.min(
                    maxZoom,
                    Math.max(
                        minZoom,
                        1.2
                    )
                );
        }

        if (
            Object.keys(
                advancedSettings
            ).length > 0
        ) {
            await state.scanner
                .applyVideoConstraints({
                    advanced: [
                        advancedSettings
                    ]
                });
        }
    } catch (error) {
        console.warn(
            "Không thể chỉnh focus hoặc zoom:",
            error
        );
    }
}

async function clearScannerInstance() {
    if (!state.scanner) {
        return;
    }

    try {
        if (state.scannerRunning) {
            await state.scanner.stop();
        }
    } catch (error) {
        console.warn(
            "Không thể dừng camera:",
            error
        );
    }

    try {
        await state.scanner.clear();
    } catch (error) {
        console.warn(
            "Không thể xóa trình quét:",
            error
        );
    }

    state.scannerRunning =
        false;

    state.scanner =
        null;

    if (elements.barcodeReader) {
        elements.barcodeReader.innerHTML =
            "";
    }
}

async function getBackCameraDeviceId() {
    const stream =
        await navigator.mediaDevices
            .getUserMedia({
                audio: false,

                video: {
                    facingMode: {
                        ideal: "environment"
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }
                }
            });

    try {
        const track =
            stream.getVideoTracks()[0];

        const settings =
            track?.getSettings?.() || {};

        return settings.deviceId || "";
    } finally {
        stream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });
    }
}

async function startCameraByDeviceId(
    deviceId
) {
    state.scanner =
        createScanner();

    await state.scanner.start(
        deviceId,
        getScannerConfig(),
        handleScanSuccess,
        () => {}
    );

    state.scannerRunning =
        true;
}

async function startBackCameraFacingMode() {
    state.scanner =
        createScanner();

    await state.scanner.start(
        {
            facingMode: "environment"
        },
        getScannerConfig(),
        handleScanSuccess,
        () => {}
    );

    state.scannerRunning =
        true;
}

async function startCameraByDeviceList() {
    const cameras =
        await Html5Qrcode.getCameras();

    if (
        !Array.isArray(cameras)
        || !cameras.length
    ) {
        throw new Error(
            "Không tìm thấy camera."
        );
    }

    const normalizedCameras =
        cameras.map((camera) => {
            return {
                ...camera,

                normalizedLabel:
                    String(
                        camera.label || ""
                    ).toLowerCase()
            };
        });

    const rearCamera =
        normalizedCameras.find(
            (camera) => {
                const label =
                    camera.normalizedLabel;

                return (
                    label.includes("back")
                    || label.includes("rear")
                    || label.includes(
                        "environment"
                    )
                    || label.includes(
                        "camera sau"
                    )
                );
            }
        );

    const selectedCamera =
        rearCamera
        || normalizedCameras[
            normalizedCameras.length - 1
        ];

    await startCameraByDeviceId(
        selectedCamera.id
    );
}

function getCameraErrorMessage(error) {
    const errorName =
        error?.name || "";

    const errorMessage =
        error?.message
        || String(error || "");

    const lowerMessage =
        errorMessage.toLowerCase();

    if (
        errorName === "NotAllowedError"
        || errorName === "PermissionDeniedError"
        || lowerMessage.includes("permission")
        || lowerMessage.includes("denied")
    ) {
        return (
            "Camera đang bị chặn. "
            + "Hãy cấp quyền camera rồi tải lại trang."
        );
    }

    if (
        errorName === "NotFoundError"
        || lowerMessage.includes("not found")
    ) {
        return "Không tìm thấy camera.";
    }

    if (
        errorName === "NotReadableError"
        || errorName === "TrackStartError"
    ) {
        return (
            "Camera đang được ứng dụng khác sử dụng."
        );
    }

    return (
        "Không mở được camera: "
        + errorMessage
    );
}

async function openScanner() {
    if (state.scannerRunning) {
        return;
    }

    state.scanLocked =
        false;

    elements.scannerModal
        .classList.remove("hidden");

    elements.scannerMessage.textContent =
        "Đang mở camera sau...";

    try {
        if (
            typeof Html5Qrcode
                === "undefined"
            || typeof Html5QrcodeSupportedFormats
                === "undefined"
        ) {
            throw new Error(
                "Thư viện quét mã chưa tải được."
            );
        }

        if (
            !navigator.mediaDevices
            || !navigator.mediaDevices
                .getUserMedia
        ) {
            throw new Error(
                "Trình duyệt không hỗ trợ camera."
            );
        }

        let started =
            false;

        try {
            const backCameraId =
                await getBackCameraDeviceId();

            if (backCameraId) {
                await startCameraByDeviceId(
                    backCameraId
                );

                started =
                    true;
            }
        } catch (error) {
            console.warn(
                "Không lấy được camera sau:",
                error
            );

            await clearScannerInstance();
        }

        if (!started) {
            try {
                await startBackCameraFacingMode();

                started =
                    true;
            } catch (error) {
                console.warn(
                    "Không mở được camera sau:",
                    error
                );

                await clearScannerInstance();
            }
        }

        if (!started) {
            await startCameraByDeviceList();
        }

        elements.scannerMessage.textContent =
            "Đưa toàn bộ mã vạch vào giữa khung.";

        setTimeout(() => {
            applyCameraSettings();
        }, 700);

    } catch (error) {
        console.error(error);

        await clearScannerInstance();

        elements.scannerMessage.textContent =
            getCameraErrorMessage(error);
    }
}

async function closeScanner() {
    await clearScannerInstance();

    elements.scannerModal
        .classList.add("hidden");

    elements.scannerMessage.textContent =
        "";

    state.scanLocked =
        false;
}

async function handleScanSuccess(
    decodedText
) {
    if (state.scanLocked) {
        return;
    }

    const scannedCode =
        String(decodedText || "")
            .trim();

    if (!scannedCode) {
        return;
    }

    state.scanLocked =
        true;

    const product =
        state.products.find((item) => {
            const barcode =
                String(
                    item.barcode || ""
                ).trim();

            const sku =
                String(
                    item.sku || ""
                ).trim();

            return (
                barcode === scannedCode
                || sku === scannedCode
            );
        });

    await closeScanner();

    if (!product) {
        alert(
            `Không tìm thấy sản phẩm có mã: ${scannedCode}`
        );

        return;
    }

    elements.searchInput.value =
        product.barcode
        || product.sku;

    renderProducts();

    showScannedProduct(product);
}
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

elements.image
    .addEventListener(
        "input",
        handleImageUrlInput
    );

elements.imageFileInput
    .addEventListener(
        "change",
        (event) => {
            const file =
                event.target.files?.[0];

            handleSelectedImageFile(file);
        }
    );

elements.imageCameraInput
    .addEventListener(
        "change",
        (event) => {
            const file =
                event.target.files?.[0];

            handleSelectedImageFile(file);
        }
    );

elements.removeSelectedImageButton
    .addEventListener(
        "click",
        removeSelectedImage
    );

elements.openProductForm
    .addEventListener(
        "click",
        () => {
            openProductModal();
        }
    );

elements.openScannerButton
    .addEventListener(
        "click",
        openScanner
    );

document
    .querySelectorAll(
        "[data-close-product-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closeProductModal
        );
    });

document
    .querySelectorAll(
        "[data-close-scanner-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closeScanner
        );
    });

elements.form
    .addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            if (state.isUploadingImage) {
                return;
            }

            hideFormError();

            const productId =
                elements.productId.value;

            const productName =
                elements.name.value.trim();

            if (!productName) {
                showFormError(
                    "Hãy nhập tên sản phẩm."
                );

                return;
            }

            try {
                const imageUrl =
                    await uploadSelectedImageIfNeeded();

                const product =
                    getFormData(imageUrl);

                if (!product.sku) {
                    showFormError(
                        "Không thể tạo mã sản phẩm."
                    );

                    return;
                }

                const duplicatedSku =
                    state.products.some(
                        (item) => {
                            return (
                                normalizeText(
                                    item.sku
                                )
                                === normalizeText(
                                    product.sku
                                )
                                && item.id
                                !== productId
                            );
                        }
                    );

                if (duplicatedSku) {
                    showFormError(
                        "Mã sản phẩm đã tồn tại."
                    );

                    return;
                }

                const duplicatedBarcode =
                    state.products.some(
                        (item) => {
                            return (
                                String(
                                    item.barcode || ""
                                ).trim()
                                === String(
                                    product.barcode || ""
                                ).trim()
                                && item.id
                                !== productId
                            );
                        }
                    );

                if (duplicatedBarcode) {
                    showFormError(
                        "Mã vạch đã tồn tại."
                    );

                    return;
                }

                elements.saveProductButton.disabled =
                    true;

                elements.saveProductButton.textContent =
                    productId
                        ? "Đang cập nhật..."
                        : "Đang lưu...";

                if (productId) {
                    await updateProduct(
                        productId,
                        product
                    );
                } else {
                    await createProduct(
                        product
                    );
                }

                closeProductModal();

            } catch (error) {
                console.error(error);

                showFormError(
                    error.message
                    || "Không thể lưu sản phẩm."
                );

            } finally {
                elements.saveProductButton.disabled =
                    false;

                elements.saveProductButton.textContent =
                    "Lưu sản phẩm";
            }
        }
    );

elements.productTable
    .addEventListener(
        "click",
        async (event) => {
            const editButton =
                event.target.closest(
                    "[data-edit]"
                );

            const deleteButton =
                event.target.closest(
                    "[data-delete]"
                );

            const editId =
                editButton?.dataset.edit;

            const deleteId =
                deleteButton?.dataset.delete;

            if (editId) {
                const product =
                    state.products.find(
                        (item) => {
                            return item.id
                                === editId;
                        }
                    );

                if (product) {
                    openProductModal(product);
                }
            }

            if (deleteId) {
                const product =
                    state.products.find(
                        (item) => {
                            return item.id
                                === deleteId;
                        }
                    );

                const accepted =
                    confirm(
                        `Xóa sản phẩm "${product?.name || ""}"?`
                    );

                if (!accepted) {
                    return;
                }

                try {
                    await deleteProduct(
                        deleteId
                    );
                } catch (error) {
                    console.error(error);

                    alert(
                        "Không thể xóa sản phẩm."
                    );
                }
            }
        }
    );

elements.searchInput
    .addEventListener(
        "input",
        renderProducts
    );

elements.categoryFilter
    .addEventListener(
        "change",
        renderProducts
    );

window
    .addEventListener(
        "pagehide",
        () => {
            clearScannerInstance();
            clearLocalPreview();
        }
    );

listenProducts((products) => {
    state.products =
        products;

    renderCategoryFilter();
    renderProducts();
});