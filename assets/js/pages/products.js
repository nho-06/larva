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
    scannerRunning: false
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
    const timePart = Date.now().toString();

    const randomPart = Math.floor(
        100 + Math.random() * 900
    ).toString();

    return `LRV-${timePart}-${randomPart}`;
}

function renderBarcode(
    selector,
    barcodeValue,
    compact = false
) {
    if (!barcodeValue || typeof JsBarcode === "undefined") {
        return;
    }

    try {
        JsBarcode(selector, barcodeValue, {
            format: "CODE128",
            width: compact ? 1.2 : 1.8,
            height: compact ? 36 : 70,
            displayValue: true,
            fontSize: compact ? 10 : 14,
            margin: compact ? 2 : 8
        });
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
    const existingBarcode =
        elements.barcode.value.trim();

    return {
        name:
            elements.name.value.trim(),

        sku:
            elements.sku.value.trim(),

        barcode:
            existingBarcode || generateBarcodeValue(),

        category:
            elements.category.value.trim(),

        quantity:
            Number(elements.quantity.value || 0),

        costPrice:
            Number(elements.costPrice.value || 0),

        salePrice:
            Number(elements.salePrice.value || 0),

        image:
            elements.image.value.trim(),

        description:
            elements.description.value.trim()
    };
}

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
        return a.localeCompare(b, "vi");
    });

    elements.categoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${categories
            .map((category) => {
                return `
                    <option value="${escapeHtml(category)}">
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

function getFilteredProducts() {
    const keyword = normalizeText(
        elements.searchInput.value
    );

    const selectedCategory =
        elements.categoryFilter.value;

    return state.products.filter((product) => {
        const matchesKeyword =
            normalizeText(product.name).includes(keyword)
            || normalizeText(product.sku).includes(keyword)
            || normalizeText(product.barcode).includes(keyword);

        const matchesCategory =
            !selectedCategory
            || product.category === selectedCategory;

        return matchesKeyword && matchesCategory;
    });
}

function renderProducts() {
    const products = getFilteredProducts();

    elements.productTable.innerHTML =
        products
            .map((product) => {
                const image =
                    product.image
                    || placeholderImage();

                return `
                    <tr>

                        <td>
                            <div class="product-cell">

                                <img
                                    class="product-image"
                                    src="${escapeHtml(image)}"
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
                            ${formatMoney(product.costPrice)}
                        </td>

                        <td>
                            ${formatMoney(product.salePrice)}
                        </td>

                        <td>
                            ${Number(product.quantity || 0)}
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

    barcodeElements.forEach((barcodeElement) => {
        const barcodeValue =
            barcodeElement.dataset.barcode;

        renderBarcode(
            barcodeElement,
            barcodeValue,
            true
        );
    });
}

function showScannedProduct(product) {
    const image =
        product.image
        || placeholderImage();

    elements.scannedProductBox.innerHTML = `
        <div class="scanned-product-content">

            <img
                class="scanned-product-image"
                src="${escapeHtml(image)}"
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
                    Giá bán:
                    <strong>
                        ${formatMoney(product.salePrice)}
                    </strong>
                </p>

                <p>
                    Tồn kho:
                    <strong>
                        ${Number(product.quantity || 0)}
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
        .querySelector("#closeScannedProduct")
        ?.addEventListener("click", () => {
            elements.scannedProductBox.classList.add(
                "hidden"
            );
        });
}

async function openScanner() {
    elements.scannerModal.classList.remove(
        "hidden"
    );

    elements.scannerMessage.textContent =
        "Đang mở camera...";

    if (typeof Html5Qrcode === "undefined") {
        elements.scannerMessage.textContent =
            "Không tải được thư viện quét mã.";

        return;
    }

    try {
        state.scanner =
            state.scanner
            || new Html5Qrcode("barcodeReader");

        const cameras =
            await Html5Qrcode.getCameras();

        if (!cameras.length) {
            throw new Error(
                "Không tìm thấy camera."
            );
        }

        const backCamera =
            cameras.find((camera) => {
                return /back|rear|environment/i.test(
                    camera.label
                );
            })
            || cameras[cameras.length - 1];

        await state.scanner.start(
            backCamera.id,
            {
                fps: 10,
                qrbox: {
                    width: 280,
                    height: 140
                },
                aspectRatio: 1.5,
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
                // Không cần hiện lỗi liên tục khi chưa quét trúng.
            }
        );

        state.scannerRunning = true;

        elements.scannerMessage.textContent =
            "Đưa mã vạch vào giữa khung.";
    } catch (error) {
        console.error(error);

        elements.scannerMessage.textContent =
            "Không mở được camera. Hãy cho phép trình duyệt sử dụng camera.";
    }
}

async function closeScanner() {
    if (
        state.scanner
        && state.scannerRunning
    ) {
        try {
            await state.scanner.stop();
        } catch (error) {
            console.warn(error);
        }
    }

    state.scannerRunning = false;

    elements.scannerModal.classList.add(
        "hidden"
    );

    elements.scannerMessage.textContent = "";
}

async function handleScanSuccess(decodedText) {
    const scannedCode =
        String(decodedText || "").trim();

    const product =
        state.products.find((item) => {
            return item.barcode === scannedCode
                || item.sku === scannedCode;
        });

    await closeScanner();

    if (!product) {
        alert(
            `Không tìm thấy sản phẩm có mã: ${scannedCode}`
        );

        return;
    }

    elements.searchInput.value =
        product.barcode || product.sku;

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
                return normalizeText(item.sku)
                    === normalizeText(product.sku)
                    && item.id !== productId;
            });

        if (duplicatedSku) {
            alert(
                "Mã sản phẩm đã tồn tại."
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
                await createProduct(product);
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
            event.target.closest("[data-edit]");

        const deleteButton =
            event.target.closest("[data-delete]");

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

            const accepted = confirm(
                `Xóa sản phẩm "${product?.name || ""}"?`
            );

            if (!accepted) {
                return;
            }

            try {
                await deleteProduct(deleteId);
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

listenProducts((products) => {
    state.products = products;

    renderCategoryFilter();
    renderProducts();
});