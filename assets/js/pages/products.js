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
    Tạo giá trị mã vạch duy nhất.

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

    selector có thể là:
    - chuỗi CSS
    - phần tử SVG
*/
function renderBarcode(
    selector,
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
            selector,
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

                background: "#ffffff",

                lineColor: "#111111"
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
    Lấy dữ liệu trong form.

    Nếu sản phẩm chưa có mã vạch,
    hệ thống sẽ tự tạo mã mới.
*/
function getFormData() {
    const existingBarcode =
        elements.barcode.value.trim();

    return {
        name:
            elements.name.value.trim(),

        sku:
            elements.sku.value.trim(),

        barcode:
            existingBarcode
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
    const selectedCategory =
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
        categories.includes(selectedCategory)
            ? selectedCategory
            : "";
}

/*
    Lọc danh sách sản phẩm.
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
    Vẽ các mã vạch trong bảng.
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
    Hiển thị thông tin sản phẩm
    sau khi quét mã thành công.
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
    Đưa camera về mức zoom thấp nhất
    và bật lấy nét liên tục nếu điện thoại hỗ trợ.
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

        const settings = {};

        /*
            Một số trình duyệt trả về focusMode
            dưới dạng mảng.
        */
        if (
            Array.isArray(
                capabilities.focusMode
            )
            && capabilities.focusMode.includes(
                "continuous"
            )
        ) {
            settings.focusMode =
                "continuous";
        }

        /*
            Đưa zoom về giá trị nhỏ nhất.

            Thường là 1.
        */
        if (capabilities.zoom) {
            const minimumZoom =
                Number(
                    capabilities.zoom.min || 1
                );

            settings.zoom =
                minimumZoom;
        }

        if (
            Object.keys(settings).length > 0
        ) {
            await state.scanner
                .applyVideoConstraints({
                    advanced: [
                        settings
                    ]
                });
        }
    } catch (error) {
        /*
            Không phải điện thoại nào cũng hỗ trợ
            chỉnh zoom hoặc focus bằng trình duyệt.
        */
        console.warn(
            "Thiết bị không hỗ trợ chỉnh zoom hoặc lấy nét:",
            error
        );
    }
}

/*
    Mở camera quét mã.

    Không lấy camera cuối danh sách nữa,
    vì camera cuối có thể là camera tele.
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
        "Đang mở camera...";

    if (
        typeof Html5Qrcode
        === "undefined"
    ) {
        elements.scannerMessage.textContent =
            "Không tải được thư viện quét mã.";

        return;
    }

    try {
        /*
            Tạo trình quét một lần.
        */
        if (!state.scanner) {
            state.scanner =
                new Html5Qrcode(
                    "barcodeReader",
                    {
                        verbose: false
                    }
                );
        }

        /*
            facingMode environment giúp trình duyệt
            tự chọn camera sau chính.

            Không dùng cameras[cameras.length - 1]
            vì có thể chọn nhầm camera tele.
        */
        await state.scanner.start(
            {
                facingMode: {
                    ideal: "environment"
                }
            },
            {
                fps: 12,

                qrbox: {
                    width: 300,
                    height: 120
                },

                aspectRatio:
                    16 / 9,

                disableFlip:
                    true,

                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E
                ]
            },
            handleScanSuccess,
            () => {
                /*
                    Không hiện lỗi liên tục
                    khi camera chưa bắt được mã.
                */
            }
        );

        state.scannerRunning = true;

        elements.scannerMessage.textContent =
            "Giữ điện thoại cách mã khoảng 15–25 cm và giữ yên.";

        /*
            Chờ camera ổn định rồi mới áp dụng zoom/focus.
        */
        setTimeout(() => {
            applyCameraSettings();
        }, 500);

    } catch (error) {
        console.error(
            "Lỗi mở camera:",
            error
        );

        state.scannerRunning = false;

        elements.scannerMessage.textContent =
            "Không mở được camera. Hãy cho phép trình duyệt sử dụng camera.";
    }
}

/*
    Đóng camera.
*/
async function closeScanner() {
    if (
        state.scanner
        && state.scannerRunning
    ) {
        try {
            await state.scanner.stop();

            await state.scanner.clear();
        } catch (error) {
            console.warn(
                "Không thể dừng camera:",
                error
            );
        }
    }

    state.scannerRunning = false;
    state.scanLocked = false;

    elements.scannerModal.classList.add(
        "hidden"
    );

    elements.scannerMessage.textContent = "";

    elements.barcodeReader.innerHTML = "";

    /*
        Sau clear, tạo lại đối tượng khi quét lần sau.
    */
    state.scanner = null;
}

/*
    Xử lý khi quét được mã.
*/
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
        state.products.find(
            (item) => {
                return (
                    item.barcode === scannedCode
                    || item.sku === scannedCode
                );
            }
        );

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
    Mở camera.
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
            state.products.some(
                (item) => {
                    return (
                        normalizeText(item.sku)
                        === normalizeText(product.sku)

                        && item.id
                        !== productId
                    );
                }
            );

        if (duplicatedSku) {
            alert(
                "Mã sản phẩm đã tồn tại."
            );

            return;
        }

        const duplicatedBarcode =
            state.products.some(
                (item) => {
                    return (
                        item.barcode
                        === product.barcode

                        && item.id
                        !== productId
                    );
                }
            );

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
    Xử lý nút sửa và xóa.
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
                state.products.find(
                    (item) => {
                        return item.id === editId;
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
                        return item.id === deleteId;
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

/*
    Tìm kiếm sản phẩm.
*/
elements.searchInput.addEventListener(
    "input",
    renderProducts
);

/*
    Lọc danh mục.
*/
elements.categoryFilter.addEventListener(
    "change",
    renderProducts
);

/*
    Khi rời khỏi trang hoặc chuyển tab,
    dừng camera để tránh camera tiếp tục chạy.
*/
window.addEventListener(
    "pagehide",
    () => {
        closeScanner();
    }
);

/*
    Nhận danh sách sản phẩm từ Firebase.
*/
listenProducts((products) => {
    state.products = products;

    renderCategoryFilter();
    renderProducts();
});