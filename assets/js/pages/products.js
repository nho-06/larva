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

/*
    Tạo mã vạch tự động.

    Ví dụ:
    LRV-1783423123456-456
*/
function generateBarcodeValue() {
    const timePart =
        Date.now().toString();

    const randomPart =
        Math.floor(
            100 + Math.random() * 900
        ).toString();

    return `LRV-${timePart}-${randomPart}`;
}

/*
    Vẽ mã vạch Code 128.
*/
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

/*
    Mở form thêm hoặc sửa sản phẩm.
*/
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

/*
    Đóng form sản phẩm.
*/
function closeProductModal() {
    elements.productModal.classList.add(
        "hidden"
    );
}

/*
    Lấy dữ liệu sản phẩm trong form.
*/
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

/*
    Hiển thị danh mục trong ô lọc.
*/
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

/*
    Lọc sản phẩm theo từ khóa và danh mục.
*/
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

/*
    Hiển thị bảng sản phẩm.
*/
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

/*
    Vẽ toàn bộ mã vạch trong bảng.
*/
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

/*
    Hiển thị sản phẩm sau khi quét mã.
*/
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
            }
        );

    elements.scannedProductBox.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/*
    Hiển thị lỗi camera dễ hiểu.
*/
function getCameraErrorMessage(error) {
    const errorName =
        error?.name || "";

    const errorMessage =
        error?.message
        || String(error || "");

    if (
        errorName === "NotAllowedError"
        || errorName === "PermissionDeniedError"
        || errorMessage
            .toLowerCase()
            .includes("permission")
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
        || errorMessage
            .toLowerCase()
            .includes("not found")
    ) {
        return (
            "Không tìm thấy camera trên thiết bị."
        );
    }

    if (
        errorName === "NotReadableError"
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
            "Camera không hỗ trợ thiết lập đang yêu cầu."
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

/*
    Xin quyền camera trước.

    Safari và Chrome sẽ hiện hộp thoại
    yêu cầu người dùng cho phép camera.
*/
async function requestCameraPermission() {
    if (
        !navigator.mediaDevices
        || !navigator.mediaDevices.getUserMedia
    ) {
        throw new Error(
            "Trình duyệt này không hỗ trợ camera."
        );
    }

    const stream =
        await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

    stream
        .getTracks()
        .forEach((track) => {
            track.stop();
        });
}

/*
    Chọn camera sau chính.

    Không chọn camera cuối danh sách,
    vì có thể là camera tele.
*/
function chooseCamera(cameras) {
    if (
        !Array.isArray(cameras)
        || !cameras.length
    ) {
        return null;
    }

    const backCamera =
        cameras.find((camera) => {
            const label =
                String(camera.label || "")
                    .toLowerCase();

            return (
                label.includes("back")
                || label.includes("rear")
                || label.includes("environment")
                || label.includes("camera sau")
            );
        });

    return backCamera || cameras[0];
}

/*
    Đưa zoom về nhỏ nhất và bật lấy nét liên tục
    nếu thiết bị hỗ trợ.
*/
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
            advancedSettings.zoom =
                Number(
                    capabilities.zoom.min || 1
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

/*
    Mở camera quét mã.
*/
async function openScanner() {
    if (state.scannerRunning) {
        return;
    }

    state.scanLocked = false;

    elements.scannerModal.classList.remove(
        "hidden"
    );

    elements.scannerMessage.textContent =
        "Đang yêu cầu quyền sử dụng camera...";

    try {
        if (
            typeof Html5Qrcode === "undefined"
            || typeof Html5QrcodeSupportedFormats
                === "undefined"
        ) {
            throw new Error(
                "Thư viện quét mã chưa tải được."
            );
        }

        /*
            Xin quyền trước để trình duyệt
            hiện thông báo cho phép camera.
        */
        await requestCameraPermission();

        elements.scannerMessage.textContent =
            "Đang tìm camera...";

        const cameras =
            await Html5Qrcode.getCameras();

        const selectedCamera =
            chooseCamera(cameras);

        if (!selectedCamera) {
            throw new Error(
                "Không tìm thấy camera."
            );
        }

        /*
            Khởi tạo đúng thư viện.

            Tham số thứ hai là mảng
            các định dạng cần quét.
        */
        state.scanner =
            new Html5Qrcode(
                "barcodeReader",
                [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E
                ],
                false
            );

        await state.scanner.start(
            selectedCamera.id,
            {
                fps: 10,

                qrbox: {
                    width: 280,
                    height: 120
                },

                aspectRatio:
                    16 / 9,

                disableFlip:
                    true
            },
            handleScanSuccess,
            () => {
                /*
                    Không hiện lỗi mỗi khung hình
                    khi chưa đọc được mã.
                */
            }
        );

        state.scannerRunning = true;

        elements.scannerMessage.textContent =
            "Camera đã mở. "
            + "Giữ mã vạch cách camera khoảng 15–25 cm.";

        setTimeout(() => {
            applyCameraSettings();
        }, 700);

    } catch (error) {
        console.error(
            "Lỗi camera đầy đủ:",
            error
        );

        state.scannerRunning = false;

        elements.scannerMessage.textContent =
            getCameraErrorMessage(error);

        if (state.scanner) {
            try {
                await state.scanner.clear();
            } catch (clearError) {
                console.warn(clearError);
            }
        }

        state.scanner = null;
    }
}

/*
    Đóng camera.
*/
async function closeScanner() {
    state.scanLocked = false;

    if (state.scanner) {
        try {
            if (state.scannerRunning) {
                await state.scanner.stop();
            }

            await state.scanner.clear();

        } catch (error) {
            console.warn(
                "Lỗi khi đóng camera:",
                error
            );
        }
    }

    state.scannerRunning = false;
    state.scanner = null;

    elements.scannerModal.classList.add(
        "hidden"
    );

    elements.scannerMessage.textContent = "";

    if (elements.barcodeReader) {
        elements.barcodeReader.innerHTML = "";
    }
}

/*
    Xử lý sau khi quét được mã.
*/
async function handleScanSuccess(decodedText) {
    if (state.scanLocked) {
        return;
    }

    state.scanLocked = true;

    const scannedCode =
        String(decodedText || "")
            .trim();

    const product =
        state.products.find((item) => {
            return (
                item.barcode === scannedCode
                || item.sku === scannedCode
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

/*
    Mở form thêm sản phẩm.
*/
elements.openProductForm.addEventListener(
    "click",
    () => {
        openProductModal();
    }
);

/*
    Mở camera quét mã.
*/
elements.openScannerButton.addEventListener(
    "click",
    openScanner
);

/*
    Đóng form sản phẩm.
*/
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

/*
    Đóng camera.
*/
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

/*
    Lưu sản phẩm.
*/
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
                    === normalizeText(product.sku)

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

/*
    Xử lý nút sửa và xóa sản phẩm.
*/
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
                state.products.find((item) => {
                    return item.id === editId;
                });

            if (product) {
                openProductModal(product);
            }
        }

        if (deleteId) {
            const product =
                state.products.find((item) => {
                    return item.id === deleteId;
                });

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

/*
    Tìm kiếm sản phẩm.
*/
elements.searchInput.addEventListener(
    "input",
    renderProducts
);

/*
    Lọc theo danh mục.
*/
elements.categoryFilter.addEventListener(
    "change",
    renderProducts
);

/*
    Khi rời trang thì dừng camera.
*/
window.addEventListener(
    "pagehide",
    () => {
        closeScanner();
    }
);

/*
    Nhận dữ liệu sản phẩm từ Firebase.
*/
listenProducts((products) => {
    state.products = products;

    renderCategoryFilter();
    renderProducts();
});