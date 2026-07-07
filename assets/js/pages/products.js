import {
    createProduct,
    deleteProduct,
    listenProducts,
    updateProduct
} from "../services/product-service.js";

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
    scanLocked: false
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
        document.querySelector("#scannedProductBox")
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

function openProductModal(product = null) {
    elements.form.reset();

    elements.productId.value = "";
    elements.barcode.value = "";

    elements.quantity.value = 0;
    elements.costPrice.value = 0;
    elements.salePrice.value = 0;

    elements.barcodePreviewBox.classList.add(
        "hidden"
    );

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
            Number(product.quantity || 0);

        elements.costPrice.value =
            Number(product.costPrice || 0);

        elements.salePrice.value =
            Number(product.salePrice || 0);

        elements.image.value =
            product.image || "";

        elements.description.value =
            product.description || "";

        if (product.barcode) {
            elements.barcodePreviewBox.classList.remove(
                "hidden"
            );

            setTimeout(() => {
                renderBarcode(
                    "#barcodePreview",
                    product.barcode
                );
            }, 0);
        }
    }

    elements.productModal.classList.remove(
        "hidden"
    );
}

function closeProductModal() {
    elements.productModal.classList.add(
        "hidden"
    );
}

function getFormData() {
    const currentBarcode =
        elements.barcode.value.trim();

    return {
        name:
            elements.name.value.trim(),

        sku:
            elements.sku.value.trim(),

        barcode:
            currentBarcode
            || generateBarcodeValue(),

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
            elements.image.value.trim(),

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
        categories.includes(currentCategory)
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
                            ${escapeHtml(product.sku)}
                        </td>

                        <td>
                            ${
                                product.barcode
                                    ? `
                                        <div class="table-barcode">

                                            <svg
                                                class="product-barcode"
                                                data-barcode="${escapeHtml(product.barcode)}"
                                            ></svg>

                                            <small>
                                                ${escapeHtml(product.barcode)}
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

    elements.emptyState.classList.toggle(
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
                        ${escapeHtml(product.sku)}
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

    elements.scannedProductBox.classList.remove(
        "hidden"
    );

    document
        .querySelector(
            "#closeScannedProduct"
        )
        ?.addEventListener(
            "click",
            () => {
                elements.scannedProductBox.classList.add(
                    "hidden"
                );

                elements.searchInput.value = "";

                renderProducts();
            }
        );

    elements.scannedProductBox.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
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
            + "Hãy cho phép trang web sử dụng camera "
            + "rồi tải lại trang."
        );
    }

    if (
        errorName === "NotFoundError"
        || errorName === "DevicesNotFoundError"
        || lowerMessage.includes("not found")
    ) {
        return (
            "Không tìm thấy camera trên thiết bị."
        );
    }

    if (
        errorName === "NotReadableError"
        || errorName === "TrackStartError"
                || errorName === "TrackStartError"
    ) {
        return (
            "Camera đang được ứng dụng khác sử dụng. "
            + "Hãy tắt Camera, Zalo, Meet "
            + "hoặc ứng dụng gọi video."
        );
    }

    if (
        errorName === "OverconstrainedError"
        || errorName
            === "ConstraintNotSatisfiedError"
    ) {
        return (
            "Không thể chọn camera sau trên thiết bị này."
        );
    }

    if (errorName === "SecurityError") {
        return (
            "Trình duyệt không cho phép "
            + "mở camera trên trang này."
        );
    }

    return (
        "Không mở được camera: "
        + errorMessage
    );
}

function getSupportedBarcodeFormats() {
    return [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E
    ];
}

function createScanner() {
    return new Html5Qrcode(
        "barcodeReader",
        getSupportedBarcodeFormats(),
        false
    );
}

function getScannerConfig() {
    const screenWidth =
        Math.max(
            window.innerWidth || 320,
            320
        );

    const qrWidth =
        Math.min(
            300,
            Math.max(
                220,
                screenWidth - 90
            )
        );

    return {
        fps: 12,

        qrbox: {
            width: qrWidth,
            height: 110
        },

        aspectRatio:
            16 / 9,

        disableFlip:
            true
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
            Array.isArray(capabilities.focusMode)
            && capabilities.focusMode.includes("continuous")
        ) {
            advancedSettings.focusMode = "continuous";
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

            /*
                Đưa camera về gần mức 1x.

                Việc này giúp hạn chế một số điện thoại
                tự chuyển sang camera góc siêu rộng 0.5x,
                khiến mã vạch nhỏ và khó lấy nét.
            */
            advancedSettings.zoom =
                Math.min(
                    maxZoom,
                    Math.max(minZoom, 1)
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

    state.scannerRunning = false;
    state.scanner = null;

    if (elements.barcodeReader) {
        elements.barcodeReader.innerHTML = "";
    }
}

async function getBackCameraDeviceId() {
    /*
        Xin quyền camera trước bằng getUserMedia.

        facingMode environment yêu cầu trình duyệt
        ưu tiên camera sau.

        Sau đó lấy deviceId thật từ video track.
        Cách này ổn định hơn việc đoán camera qua tên.
    */
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

        if (settings.deviceId) {
            return settings.deviceId;
        }
    } finally {
        stream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });
    }

    return "";
}

async function startCameraByDeviceId(
    deviceId
) {
    state.scanner = createScanner();

    await state.scanner.start(
        deviceId,
        getScannerConfig(),
        handleScanSuccess,
        () => {
            /*
                Không cần báo lỗi cho từng khung hình
                chưa đọc được mã.
            */
        }
    );

    state.scannerRunning = true;
}

async function startBackCameraFacingMode() {
    state.scanner = createScanner();

    await state.scanner.start(
        {
            facingMode: "environment"
        },
        getScannerConfig(),
        handleScanSuccess,
        () => {
            /*
                Tiếp tục chờ đến khi đọc được mã.
            */
        }
    );

    state.scannerRunning = true;
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

    /*
        Chỉ ưu tiên những tên thể hiện rõ
        đây là camera sau.

        Không chủ động chọn từ khóa "wide",
        "ultra wide" hoặc "0.5x" vì đó thường
        là camera góc rộng khó lấy nét mã gần.
    */
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

    /*
        Một số điện thoại giấu tên camera.
        Sau khi đã cấp quyền, camera sau thường
        nằm gần cuối danh sách.
    */
    const selectedCamera =
        rearCamera
        || normalizedCameras[
            normalizedCameras.length - 1
        ];

    await startCameraByDeviceId(
        selectedCamera.id
    );
}

async function openScanner() {
    if (state.scannerRunning) {
        return;
    }

    state.scanLocked = false;

    elements.scannerModal.classList.remove(
        "hidden"
    );

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

        let started = false;

        /*
            Cách 1:
            Mở tạm camera sau bằng getUserMedia,
            lấy deviceId thật rồi truyền deviceId
            đó cho thư viện quét.
        */
        try {
            const backCameraId =
                await getBackCameraDeviceId();

            if (backCameraId) {
                await startCameraByDeviceId(
                    backCameraId
                );

                started = true;
            }
        } catch (deviceIdError) {
            console.warn(
                "Không lấy được deviceId camera sau:",
                deviceIdError
            );

            await clearScannerInstance();
        }

        /*
            Cách 2:
            Yêu cầu trực tiếp camera environment.
        */
        if (!started) {
            try {
                await startBackCameraFacingMode();

                started = true;
            } catch (facingModeError) {
                console.warn(
                    "Không mở được camera sau bằng facingMode:",
                    facingModeError
                );

                await clearScannerInstance();
            }
        }

        /*
            Cách 3:
            Lấy toàn bộ danh sách camera
            rồi tìm camera có nhãn back/rear.
        */
        if (!started) {
            await startCameraByDeviceList();
        }

        elements.scannerMessage.textContent =
            "Camera sau đã mở. "
            + "Đưa mã vạch vào giữa khung.";

        /*
            Đợi video chạy ổn định rồi mới đặt
            focus liên tục và zoom 1x.
        */
        setTimeout(() => {
            applyCameraSettings();
        }, 700);

    } catch (error) {
        console.error(
            "Lỗi mở camera:",
            error
        );

        await clearScannerInstance();

        elements.scannerMessage.textContent =
            getCameraErrorMessage(error);
    }
}

async function closeScanner() {
    state.scanLocked = false;

    await clearScannerInstance();

    elements.scannerModal.classList.add(
        "hidden"
    );

    elements.scannerMessage.textContent = "";
}

async function handleScanSuccess(
    decodedText
) {
    if (state.scanLocked) {
        return;
    }

    state.scanLocked = true;

    const scannedCode =
        String(decodedText || "")
            .trim();

    const product =
        state.products.find((item) => {
            const productBarcode =
                String(item.barcode || "")
                    .trim();

            const productSku =
                String(item.sku || "")
                    .trim();

            return (
                productBarcode
                    === scannedCode

                || productSku
                    === scannedCode
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

elements.openProductForm.addEventListener(
    "click",
    () => {
        openProductModal();
    }
);

elements.openScannerButton.addEventListener(
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

elements.form.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const product =
            getFormData();

        const productId =
            elements.productId.value;

        const duplicatedSku =
            state.products.some((item) => {
                return (
                    normalizeText(item.sku)
                        === normalizeText(
                            product.sku
                        )

                    && item.id
                        !== productId
                );
            });

        if (duplicatedSku) {
            alert(
                "Mã sản phẩm đã tồn tại."
            );

            return;
        }

        const duplicatedBarcode =
            state.products.some((item) => {
                return (
                    item.barcode
                        === product.barcode

                    && item.id
                        !== productId
                );
            });

        if (duplicatedBarcode) {
            alert(
                "Mã vạch đã tồn tại."
            );

            return;
        }

        try {
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

            alert(
                "Không thể lưu sản phẩm. "
                + "Hãy kiểm tra kết nối Firebase."
            );
        }
    }
);

elements.productTable.addEventListener(
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

elements.searchInput.addEventListener(
    "input",
    renderProducts
);

elements.categoryFilter.addEventListener(
    "change",
    renderProducts
);

window.addEventListener(
    "pagehide",
    () => {
        clearScannerInstance();
    }
);

listenProducts((products) => {
    state.products = products;

    renderCategoryFilter();
    renderProducts();
});