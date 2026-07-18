import {
    createProduct,
    deleteProduct,
    listenProducts,
    updateProduct
} from "../services/product-service.js";

import {
    createCategory,
    generateNextSku,
    listenCategories
} from "../services/category-service.js";

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

import {
    createProductLabelController
} from "./products/product-label.js";

import {
    createProductScannerController
} from "./products/product-scanner.js";


/* =========================================================
   STATE
========================================================= */

const state = {
    products: [],
    categories: [],

    imageMode: "url",

    selectedImageFile: null,
    localPreviewUrl: "",

    uploadedImageUrl: "",
    uploadedImagePath: "",

    isUploadingImage: false
};


/* =========================================================
   ELEMENTS
========================================================= */

const elements = {
    productModal:
        document.querySelector(
            "#productModal"
        ),

    categoryModal:
        document.querySelector(
            "#categoryModal"
        ),

    scannerModal:
        document.querySelector(
            "#scannerModal"
        ),

    labelPrintModal:
        document.querySelector(
            "#labelPrintModal"
        ),

    productForm:
        document.querySelector(
            "#productForm"
        ),

    categoryForm:
        document.querySelector(
            "#categoryForm"
        ),

    formTitle:
        document.querySelector(
            "#formTitle"
        ),

    productId:
        document.querySelector(
            "#productId"
        ),

    barcode:
        document.querySelector(
            "#barcode"
        ),

    name:
        document.querySelector(
            "#name"
        ),

    sku:
        document.querySelector(
            "#sku"
        ),

    category:
        document.querySelector(
            "#category"
        ),

    quantity:
        document.querySelector(
            "#quantity"
        ),

    costPrice:
        document.querySelector(
            "#costPrice"
        ),

    salePrice:
        document.querySelector(
            "#salePrice"
        ),

    image:
        document.querySelector(
            "#image"
        ),

    description:
        document.querySelector(
            "#description"
        ),

    categoryName:
        document.querySelector(
            "#categoryName"
        ),

    categoryPrefix:
        document.querySelector(
            "#categoryPrefix"
        ),

    categoryFormError:
        document.querySelector(
            "#categoryFormError"
        ),

    saveCategoryButton:
        document.querySelector(
            "#saveCategoryButton"
        ),

    openCategoryModalButton:
        document.querySelector(
            "#openCategoryModalButton"
        ),

    searchInput:
        document.querySelector(
            "#searchInput"
        ),

    categoryFilter:
        document.querySelector(
            "#categoryFilter"
        ),

    productTable:
        document.querySelector(
            "#productTable"
        ),

    emptyState:
        document.querySelector(
            "#emptyState"
        ),

    openProductForm:
        document.querySelector(
            "#openProductForm"
        ),

    openScannerButton:
        document.querySelector(
            "#openScannerButton"
        ),

    barcodePreviewBox:
        document.querySelector(
            "#barcodePreviewBox"
        ),

    barcodePreview:
        document.querySelector(
            "#barcodePreview"
        ),

    barcodeReader:
        document.querySelector(
            "#barcodeReader"
        ),

    scannerMessage:
        document.querySelector(
            "#scannerMessage"
        ),

    scannedProductBox:
        document.querySelector(
            "#scannedProductBox"
        ),

    /*
        Các phần điều khiển camera:
        - Thanh zoom
        - Hiển thị mức zoom
        - Nút quay về 1x
    */
    cameraControls:
        document.querySelector(
            "#cameraControls"
        ),

    cameraZoomInput:
        document.querySelector(
            "#cameraZoomInput"
        ),

    cameraZoomValue:
        document.querySelector(
            "#cameraZoomValue"
        ),

    resetCameraZoomButton:
        document.querySelector(
            "#resetCameraZoomButton"
        ),

    imageUrlBox:
        document.querySelector(
            "#imageUrlBox"
        ),

    imageFileBox:
        document.querySelector(
            "#imageFileBox"
        ),

    imageCameraBox:
        document.querySelector(
            "#imageCameraBox"
        ),

    imageFileInput:
        document.querySelector(
            "#imageFileInput"
        ),

    imageCameraInput:
        document.querySelector(
            "#imageCameraInput"
        ),

    imageUploadStatus:
        document.querySelector(
            "#imageUploadStatus"
        ),

    imagePreviewBox:
        document.querySelector(
            "#imagePreviewBox"
        ),

    imagePreview:
        document.querySelector(
            "#imagePreview"
        ),

    imagePreviewName:
        document.querySelector(
            "#imagePreviewName"
        ),

    imagePreviewType:
        document.querySelector(
            "#imagePreviewType"
        ),

    removeSelectedImageButton:
        document.querySelector(
            "#removeSelectedImageButton"
        ),

    saveProductButton:
        document.querySelector(
            "#saveProductButton"
        ),

    productFormError:
        document.querySelector(
            "#productFormError"
        ),

    labelCanvas:
        document.querySelector(
            "#labelCanvas"
        ),

    labelProductName:
        document.querySelector(
            "#labelProductName"
        ),

    labelProductMeta:
        document.querySelector(
            "#labelProductMeta"
        ),

    labelPrintMessage:
        document.querySelector(
            "#labelPrintMessage"
        ),

    downloadLabelButton:
        document.querySelector(
            "#downloadLabelButton"
        ),

    shareLabelButton:
        document.querySelector(
            "#shareLabelButton"
        )
};


/* =========================================================
   MÃ VẠCH XEM TRƯỚC
========================================================= */

function generateBarcodeValue() {
    const timePart =
        Date.now();

    const randomPart =
        Math.floor(
            100
            + Math.random() * 900
        );

    return (
        `LRV-${timePart}-${randomPart}`
    );
}


function renderBarcode(
    target,
    barcodeValue,
    compact = false
) {
    if (
        !barcodeValue
        || typeof window.JsBarcode
            !== "function"
    ) {
        return;
    }

    try {
        window.JsBarcode(
            target,
            barcodeValue,
            {
                format: "CODE128",

                width:
                    compact
                        ? 2
                        : 2.4,

                height:
                    compact
                        ? 42
                        : 80,

                displayValue: true,

                fontSize:
                    compact
                        ? 11
                        : 14,

                margin:
                    compact
                        ? 6
                        : 10,

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


/* =========================================================
   THÔNG BÁO LỖI
========================================================= */

function showProductError(
    message
) {
    elements.productFormError.textContent =
        message;

    elements.productFormError
        .classList.remove(
            "hidden"
        );
}


function hideProductError() {
    elements.productFormError.textContent =
        "";

    elements.productFormError
        .classList.add(
            "hidden"
        );
}


function showCategoryError(
    message
) {
    elements.categoryFormError.textContent =
        message;

    elements.categoryFormError
        .classList.remove(
            "hidden"
        );
}


function hideCategoryError() {
    elements.categoryFormError.textContent =
        "";

    elements.categoryFormError
        .classList.add(
            "hidden"
        );
}


/* =========================================================
   TRẠNG THÁI ẢNH
========================================================= */

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
    if (
        state.localPreviewUrl
    ) {
        releaseLocalImagePreview(
            state.localPreviewUrl
        );
    }

    state.localPreviewUrl =
        "";
}


function showImagePreview({
    url,
    name = "Ảnh sản phẩm",
    type = ""
}) {
    if (!url) {
        elements.imagePreviewBox
            .classList.add(
                "hidden"
            );

        elements
            .removeSelectedImageButton
            .classList.add(
                "hidden"
            );

        elements.imagePreview
            .removeAttribute(
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
        .classList.remove(
            "hidden"
        );

    elements
        .removeSelectedImageButton
        .classList.remove(
            "hidden"
        );
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

    if (
        elements.imageFileInput
    ) {
        elements.imageFileInput.value =
            "";
    }

    if (
        elements.imageCameraInput
    ) {
        elements.imageCameraInput.value =
            "";
    }

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}


function setImageMode(
    mode
) {
    state.imageMode =
        mode;

    document
        .querySelectorAll(
            "[data-image-mode]"
        )
        .forEach(
            (button) => {
                button.classList.toggle(
                    "active",

                    button.dataset.imageMode
                        === mode
                );
            }
        );

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
    if (
        state.imageMode
        !== "url"
    ) {
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
        url: imageUrl,
        name: "Ảnh từ đường dẫn",
        type: "Link ảnh"
    });
}


function handleSelectedImageFile(
    file
) {
    hideProductError();
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
            createLocalImagePreview(
                file
            );

        showImagePreview({
            url:
                state.localPreviewUrl,

            name:
                file.name
                || "Ảnh vừa chụp",

            type:
                `${
                    file.type
                    || "Ảnh"
                } · ${
                    Math.round(
                        file.size
                        / 1024
                    )
                } KB`
        });
    } catch (error) {
        console.error(
            "Không thể chọn ảnh:",
            error
        );

        state.selectedImageFile =
            null;

        showProductError(
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

    elements.imageFileInput.value =
        "";

    elements.imageCameraInput.value =
        "";

    hideImageStatus();

    showImagePreview({
        url: ""
    });
}


async function uploadSelectedImageIfNeeded() {
    if (
        !state.selectedImageFile
    ) {
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

        state.selectedImageFile =
            null;

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


/* =========================================================
   DANH MỤC
========================================================= */

function findCategoryById(
    categoryId
) {
    return (
        state.categories.find(
            (category) => {
                return (
                    category.id
                    === categoryId
                );
            }
        )
        || null
    );
}


function renderCategoryOptions() {
    const currentFormValue =
        elements.category.value;

    const currentFilterValue =
        elements.categoryFilter.value;

    elements.category.innerHTML = `
        <option value="">
            Chọn danh mục
        </option>

        ${state.categories
            .map(
                (category) => {
                    return `
                        <option
                            value="${escapeHtml(
                                category.id
                            )}"
                        >
                            ${escapeHtml(
                                category.name
                            )}
                        </option>
                    `;
                }
            )
            .join("")}
    `;

    elements.categoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${state.categories
            .map(
                (category) => {
                    return `
                        <option
                            value="${escapeHtml(
                                category.id
                            )}"
                        >
                            ${escapeHtml(
                                category.name
                            )}
                        </option>
                    `;
                }
            )
            .join("")}
    `;

    const formCategoryExists =
        state.categories.some(
            (category) => {
                return (
                    category.id
                    === currentFormValue
                );
            }
        );

    if (
        formCategoryExists
    ) {
        elements.category.value =
            currentFormValue;
    }

    const filterCategoryExists =
        state.categories.some(
            (category) => {
                return (
                    category.id
                    === currentFilterValue
                );
            }
        );

    if (
        filterCategoryExists
    ) {
        elements.categoryFilter.value =
            currentFilterValue;
    }
}


function openCategoryModal() {
    elements.categoryForm.reset();

    hideCategoryError();

    elements.categoryModal
        .classList.remove(
            "hidden"
        );

    window.setTimeout(
        () => {
            elements.categoryName.focus();
        },
        0
    );
}


function closeCategoryModal() {
    elements.categoryModal
        .classList.add(
            "hidden"
        );

    hideCategoryError();
}


/* =========================================================
   MODAL SẢN PHẨM
========================================================= */

function openProductModal(
    product = null
) {
    elements.productForm.reset();

    hideProductError();

    resetImageState();

    setImageMode(
        "url"
    );

    elements.productId.value =
        "";

    elements.barcode.value =
        "";

    elements.sku.value =
        "";

    elements.quantity.value =
        0;

    elements.costPrice.value =
        0;

    elements.salePrice.value =
        0;

    elements.barcodePreviewBox
        .classList.add(
            "hidden"
        );

    elements.formTitle.textContent =
        product
            ? "Sửa sản phẩm"
            : "Thêm sản phẩm";

    renderCategoryOptions();

    if (product) {
        elements.productId.value =
            product.id;

        elements.barcode.value =
            product.barcode
            || "";

        elements.name.value =
            product.name
            || "";

        elements.sku.value =
            product.sku
            || "";

        elements.category.value =
            product.categoryId
            || "";

        elements.quantity.value =
            Number(
                product.quantity
                || 0
            );

        elements.costPrice.value =
            Number(
                product.costPrice
                || 0
            );

        elements.salePrice.value =
            Number(
                product.salePrice
                || 0
            );

        elements.image.value =
            product.image
            || "";

        elements.description.value =
            product.description
            || "";

        state.uploadedImageUrl =
            product.image
            || "";

        state.uploadedImagePath =
            product.imageStoragePath
            || "";

        if (
            product.image
        ) {
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

        const previewCode =
            product.sku
            || product.barcode
            || "";

        if (
            previewCode
        ) {
            elements.barcodePreviewBox
                .classList.remove(
                    "hidden"
                );

            window.setTimeout(
                () => {
                    renderBarcode(
                        "#barcodePreview",
                        previewCode
                    );
                },
                0
            );
        }
    } else {
        elements.barcode.value =
            generateBarcodeValue();
    }

    elements.productModal
        .classList.remove(
            "hidden"
        );
}


function closeProductModal() {
    if (
        state.isUploadingImage
    ) {
        return;
    }

    resetImageState();

    elements.productModal
        .classList.add(
            "hidden"
        );
}


/* =========================================================
   LẤY DỮ LIỆU FORM
========================================================= */

async function getProductFormData(
    imageUrl
) {
    const productId =
        elements.productId.value;

    const selectedCategory =
        findCategoryById(
            elements.category.value
        );

    if (
        !selectedCategory
    ) {
        throw new Error(
            "Hãy chọn danh mục."
        );
    }

    let sku =
        elements.sku.value.trim();

    if (
        !productId
        && !sku
    ) {
        sku =
            await generateNextSku(
                selectedCategory.prefix
            );

        elements.sku.value =
            sku;
    }

    if (
        !sku
    ) {
        throw new Error(
            "Không thể tạo mã sản phẩm."
        );
    }

    let barcode =
        elements.barcode.value.trim();

    if (
        !barcode
    ) {
        barcode =
            generateBarcodeValue();

        elements.barcode.value =
            barcode;
    }

    return {
        name:
            elements.name.value.trim(),

        sku,

        barcode,

        categoryId:
            selectedCategory.id,

        category:
            selectedCategory.name,

        categoryPrefix:
            selectedCategory.prefix,

        quantity:
            Number(
                elements.quantity.value
                || 0
            ),

        costPrice:
            Number(
                elements.costPrice.value
                || 0
            ),

        salePrice:
            Number(
                elements.salePrice.value
                || 0
            ),

        image:
            imageUrl
            || "",

        imageStoragePath:
            state.uploadedImagePath
            || "",

        description:
            elements.description.value.trim()
    };
}
/* =========================================================
   LỌC SẢN PHẨM
========================================================= */

function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.searchInput.value
        );

    const selectedCategoryId =
        elements.categoryFilter.value;

    return state.products.filter(
        (product) => {
            const matchesKeyword =
                normalizeText(
                    product.name
                ).includes(
                    keyword
                )

                || normalizeText(
                    product.sku
                ).includes(
                    keyword
                )

                || normalizeText(
                    product.barcode
                ).includes(
                    keyword
                );

            const matchesCategory =
                !selectedCategoryId

                || product.categoryId
                    === selectedCategoryId;

            return (
                matchesKeyword
                && matchesCategory
            );
        }
    );
}


/* =========================================================
   HIỂN THỊ SẢN PHẨM
========================================================= */

function renderProducts() {
    const products =
        getFilteredProducts();

    elements.productTable.innerHTML =
        products
            .map(
                (product) => {
                    const productImage =
                        product.image
                        || placeholderImage();

                    const previewCode =
                        product.sku
                        || product.barcode
                        || "";

                    return `
                        <tr>

                            <td>

                                <div class="product-cell">

                                    <img
                                        class="product-image"
                                        src="${escapeHtml(
                                            productImage
                                        )}"
                                        alt="${escapeHtml(
                                            product.name
                                        )}"
                                        onerror="this.src='${placeholderImage()}'"
                                    >

                                    <div>

                                        <span class="product-name">

                                            ${escapeHtml(
                                                product.name
                                            )}

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
                                    product.sku
                                    || ""
                                )}

                            </td>

                            <td>

                                ${
                                    previewCode
                                        ? `
                                            <div class="table-barcode">

                                                <svg
                                                    class="product-barcode"
                                                    data-barcode="${escapeHtml(
                                                        previewCode
                                                    )}"
                                                ></svg>

                                                <small>

                                                    ${escapeHtml(
                                                        previewCode
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
                                    product.quantity
                                    || 0
                                )}

                            </td>

                            <td>

                                <div class="actions">

                                    <button
                                        class="button button-light"
                                        type="button"
                                        data-print-label="${product.id}"
                                    >
                                        In tem
                                    </button>

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
                }
            )
            .join("");

    elements.emptyState
        .classList.toggle(
            "hidden",
            products.length > 0
        );

    renderTableBarcodes();
}


function renderTableBarcodes() {
    document
        .querySelectorAll(
            ".product-barcode"
        )
        .forEach(
            (barcodeElement) => {
                const barcodeValue =
                    barcodeElement
                        .dataset
                        .barcode;

                renderBarcode(
                    barcodeElement,
                    barcodeValue,
                    true
                );
            }
        );
}


/* =========================================================
   HIỂN THỊ SẢN PHẨM SAU KHI QUÉT
========================================================= */

function showScannedProduct(
    product
) {
    const productImage =
        product.image
        || placeholderImage();

    elements.scannedProductBox.innerHTML = `
        <div class="scanned-product-content">

            <img
                class="scanned-product-image"
                src="${escapeHtml(
                    productImage
                )}"
                alt="${escapeHtml(
                    product.name
                )}"
                onerror="this.src='${placeholderImage()}'"
            >

            <div class="scanned-product-info">

                <span class="scan-success">
                    Đã tìm thấy sản phẩm
                </span>

                <h2>
                    ${escapeHtml(
                        product.name
                    )}
                </h2>

                <p>
                    Mã sản phẩm:

                    <strong>
                        ${escapeHtml(
                            product.sku
                            || ""
                        )}
                    </strong>
                </p>

                <p>
                    Mã vạch:

                    <strong>
                        ${escapeHtml(
                            product.barcode
                            || ""
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
                            product.quantity
                            || 0
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
        .classList.remove(
            "hidden"
        );

    document
        .querySelector(
            "#closeScannedProduct"
        )
        ?.addEventListener(
            "click",
            () => {
                elements.scannedProductBox
                    .classList.add(
                        "hidden"
                    );

                elements.searchInput.value =
                    "";

                renderProducts();
            }
        );

    elements.scannedProductBox
        .scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });
}


/* =========================================================
   CONTROLLER IN TEM
========================================================= */

const labelController =
    createProductLabelController({
        elements,
        formatMoney
    });


/* =========================================================
   CONTROLLER QUÉT MÃ
========================================================= */

const scannerController =
    createProductScannerController({
        elements,

        getProducts() {
            return state.products;
        },

        normalizeText,

        async onProductFound(
            product
        ) {
            elements.searchInput.value =
                product.sku
                || product.barcode
                || "";

            renderProducts();

            showScannedProduct(
                product
            );
        }
    });


/* =========================================================
   LƯU SẢN PHẨM
========================================================= */

async function handleProductSubmit(
    event
) {
    event.preventDefault();

    if (
        state.isUploadingImage
    ) {
        return;
    }

    hideProductError();

    elements.saveProductButton.disabled =
        true;

    elements.saveProductButton.textContent =
        "Đang lưu...";

    try {
        const imageUrl =
            await uploadSelectedImageIfNeeded();

        const productData =
            await getProductFormData(
                imageUrl
            );

        if (
            !productData.name
        ) {
            throw new Error(
                "Hãy nhập tên sản phẩm."
            );
        }

        if (
            productData.quantity < 0
        ) {
            throw new Error(
                "Số lượng không được nhỏ hơn 0."
            );
        }

        if (
            productData.costPrice < 0
            || productData.salePrice < 0
        ) {
            throw new Error(
                "Giá sản phẩm không được nhỏ hơn 0."
            );
        }

        const productId =
            elements.productId.value;

        if (
            productId
        ) {
            await updateProduct(
                productId,
                productData
            );
        } else {
            await createProduct(
                productData
            );
        }

        closeProductModal();
    } catch (error) {
        console.error(
            "Không thể lưu sản phẩm:",
            error
        );

        showProductError(
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


/* =========================================================
   THÊM DANH MỤC
========================================================= */

async function handleCategorySubmit(
    event
) {
    event.preventDefault();

    hideCategoryError();

    const categoryName =
        elements.categoryName.value.trim();

    const categoryPrefix =
        elements.categoryPrefix.value
            .trim()
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            );

    if (
        !categoryName
    ) {
        showCategoryError(
            "Hãy nhập tên danh mục."
        );

        return;
    }

    if (
        !categoryPrefix
    ) {
        showCategoryError(
            "Hãy nhập ký hiệu mã sản phẩm."
        );

        return;
    }

    const duplicatedName =
        state.categories.some(
            (category) => {
                return (
                    normalizeText(
                        category.name
                    )
                    === normalizeText(
                        categoryName
                    )
                );
            }
        );

    if (
        duplicatedName
    ) {
        showCategoryError(
            "Danh mục này đã tồn tại."
        );

        return;
    }

    const duplicatedPrefix =
        state.categories.some(
            (category) => {
                return (
                    String(
                        category.prefix
                        || ""
                    ).toUpperCase()
                    === categoryPrefix
                );
            }
        );

    if (
        duplicatedPrefix
    ) {
        showCategoryError(
            "Ký hiệu này đã được sử dụng."
        );

        return;
    }

    elements.saveCategoryButton.disabled =
        true;

    elements.saveCategoryButton.textContent =
        "Đang lưu...";

    try {
        const categoryId =
            await createCategory({
                name:
                    categoryName,

                prefix:
                    categoryPrefix
            });

        closeCategoryModal();

        window.setTimeout(
            () => {
                elements.category.value =
                    categoryId;
            },
            100
        );
    } catch (error) {
        console.error(
            "Không thể thêm danh mục:",
            error
        );

        showCategoryError(
            error.message
            || "Không thể thêm danh mục."
        );
    } finally {
        elements.saveCategoryButton.disabled =
            false;

        elements.saveCategoryButton.textContent =
            "Lưu danh mục";
    }
}


/* =========================================================
   TÌM SẢN PHẨM
========================================================= */

function findProductById(
    productId
) {
    return (
        state.products.find(
            (product) => {
                return (
                    product.id
                    === productId
                );
            }
        )
        || null
    );
}


/* =========================================================
   SỬA, XÓA VÀ IN TEM
========================================================= */

async function handleProductTableClick(
    event
) {
    const printButton =
        event.target.closest(
            "[data-print-label]"
        );

    if (
        printButton
    ) {
        const product =
            findProductById(
                printButton
                    .dataset
                    .printLabel
            );

        if (
            !product
        ) {
            window.alert(
                "Không tìm thấy sản phẩm."
            );

            return;
        }

        await labelController.open(
            product
        );

        return;
    }

    const editButton =
        event.target.closest(
            "[data-edit]"
        );

    if (
        editButton
    ) {
        const product =
            findProductById(
                editButton
                    .dataset
                    .edit
            );

        if (
            !product
        ) {
            window.alert(
                "Không tìm thấy sản phẩm."
            );

            return;
        }

        openProductModal(
            product
        );

        return;
    }

    const deleteButton =
        event.target.closest(
            "[data-delete]"
        );

    if (
        !deleteButton
    ) {
        return;
    }

    const product =
        findProductById(
            deleteButton
                .dataset
                .delete
        );

    if (
        !product
    ) {
        window.alert(
            "Không tìm thấy sản phẩm."
        );

        return;
    }

    const confirmed =
        window.confirm(
            `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
        );

    if (
        !confirmed
    ) {
        return;
    }

    deleteButton.disabled =
        true;

    deleteButton.textContent =
        "Đang xóa...";

    try {
        await deleteProduct(
            product.id
        );
    } catch (error) {
        console.error(
            "Không thể xóa sản phẩm:",
            error
        );

        window.alert(
            error.message
            || "Không thể xóa sản phẩm."
        );

        deleteButton.disabled =
            false;

        deleteButton.textContent =
            "Xóa";
    }
}


/* =========================================================
   LINK ẢNH
========================================================= */

function handleImageUrlChange() {
    state.uploadedImageUrl =
        elements.image.value.trim();

    state.uploadedImagePath =
        "";

    handleImageUrlInput();
}


/* =========================================================
   SỰ KIỆN MODAL
========================================================= */

function bindBaseModalEvents() {
    document
        .querySelectorAll(
            "[data-close-product-modal]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeProductModal
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-category-modal]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeCategoryModal
                );
            }
        );
}


/* =========================================================
   SỰ KIỆN ẢNH
========================================================= */

function bindImageEvents() {
    document
        .querySelectorAll(
            "[data-image-mode]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        setImageMode(
                            button
                                .dataset
                                .imageMode
                        );
                    }
                );
            }
        );

    elements.image.addEventListener(
        "input",
        handleImageUrlChange
    );

    elements.imageFileInput.addEventListener(
        "change",
        (event) => {
            handleSelectedImageFile(
                event.target.files?.[0]
            );
        }
    );

    elements.imageCameraInput.addEventListener(
        "change",
        (event) => {
            handleSelectedImageFile(
                event.target.files?.[0]
            );
        }
    );

    elements.removeSelectedImageButton
        .addEventListener(
            "click",
            removeSelectedImage
        );

    elements.imagePreview.addEventListener(
        "error",
        () => {
            elements.imagePreview.src =
                placeholderImage();
        }
    );
}


/* =========================================================
   SỰ KIỆN CHÍNH
========================================================= */

function bindEvents() {
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
            () => {
                scannerController.open();
            }
        );

    elements.openCategoryModalButton
        .addEventListener(
            "click",
            openCategoryModal
        );

    elements.productForm
        .addEventListener(
            "submit",
            handleProductSubmit
        );

    elements.categoryForm
        .addEventListener(
            "submit",
            handleCategorySubmit
        );

    elements.productTable
        .addEventListener(
            "click",
            handleProductTableClick
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

    elements.categoryPrefix
        .addEventListener(
            "input",
            () => {
                elements.categoryPrefix.value =
                    elements.categoryPrefix.value
                        .toUpperCase()
                        .replace(
                            /[^A-Z0-9]/g,
                            ""
                        );
            }
        );

    bindBaseModalEvents();
    bindImageEvents();

    labelController.bindEvents();
    scannerController.bindEvents();

    document.addEventListener(
        "keydown",
        async (event) => {
            if (
                event.key
                !== "Escape"
            ) {
                return;
            }

            if (
                labelController.isOpen()
            ) {
                labelController.close();
                return;
            }

            if (
                scannerController.isOpen()
            ) {
                await scannerController.close();
                return;
            }

            if (
                !elements.categoryModal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {
                closeCategoryModal();
                return;
            }

            if (
                !elements.productModal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {
                closeProductModal();
            }
        }
    );

    window.addEventListener(
        "beforeunload",
        () => {
            if (
                scannerController
                    .isRunning()
            ) {
                scannerController.stop();
            }

            clearLocalPreview();
        }
    );
}


/* =========================================================
   FIREBASE
========================================================= */

function subscribeData() {
    listenCategories(
        (categories) => {
            state.categories =
                Array.isArray(
                    categories
                )
                    ? categories
                    : [];

            state.categories.sort(
                (
                    firstCategory,
                    secondCategory
                ) => {
                    return String(
                        firstCategory.name
                        || ""
                    ).localeCompare(
                        String(
                            secondCategory.name
                            || ""
                        ),
                        "vi"
                    );
                }
            );

            renderCategoryOptions();
        }
    );

    listenProducts(
        (products) => {
            state.products =
                Array.isArray(
                    products
                )
                    ? products
                    : [];

            state.products.sort(
                (
                    firstProduct,
                    secondProduct
                ) => {
                    const firstTime =
                        Number(
                            firstProduct.createdAt
                            || 0
                        );

                    const secondTime =
                        Number(
                            secondProduct.createdAt
                            || 0
                        );

                    return (
                        secondTime
                        - firstTime
                    );
                }
            );

            renderProducts();
        }
    );
}


/* =========================================================
   KHỞI TẠO
========================================================= */

function initializeProductsPage() {
    bindEvents();
    subscribeData();

    setImageMode(
        "url"
    );

    renderCategoryOptions();
    renderProducts();
}

initializeProductsPage();