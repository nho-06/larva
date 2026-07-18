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


/* =========================================================
   STATE
========================================================= */

const state = {
    products: [],
    categories: [],

    scanner: null,
    scannerRunning: false,
    scanLocked: false,

    imageMode: "url",
    selectedImageFile: null,
    localPreviewUrl: "",
    uploadedImageUrl: "",
    uploadedImagePath: "",
    isUploadingImage: false,

    labelProduct: null,
    labelBlob: null
};


/* =========================================================
   ELEMENTS
========================================================= */

const elements = {
    productModal:
        document.querySelector("#productModal"),

    categoryModal:
        document.querySelector("#categoryModal"),

    scannerModal:
        document.querySelector("#scannerModal"),

    productForm:
        document.querySelector("#productForm"),

    categoryForm:
        document.querySelector("#categoryForm"),

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

    categoryName:
        document.querySelector("#categoryName"),

    categoryPrefix:
        document.querySelector("#categoryPrefix"),

    categoryFormError:
        document.querySelector("#categoryFormError"),

    saveCategoryButton:
        document.querySelector("#saveCategoryButton"),

    openCategoryModalButton:
        document.querySelector("#openCategoryModalButton"),

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
        document.querySelector("#productFormError"),

    labelPrintModal:
        document.querySelector("#labelPrintModal"),

    labelCanvas:
        document.querySelector("#labelCanvas"),

    labelProductName:
        document.querySelector("#labelProductName"),

    labelProductMeta:
        document.querySelector("#labelProductMeta"),

    labelPrintMessage:
        document.querySelector("#labelPrintMessage"),

    downloadLabelButton:
        document.querySelector("#downloadLabelButton"),

    shareLabelButton:
        document.querySelector("#shareLabelButton")
};


/* =========================================================
   MÃ VẠCH
========================================================= */

function generateBarcodeValue() {
    const timePart =
        Date.now();

    const randomPart =
        Math.floor(
            100 + Math.random() * 900
        );

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
   TEM MÃ VẠCH 50 × 30 MM
========================================================= */

function fitCanvasText(
    context,
    text,
    maxWidth,
    startSize,
    minSize,
    weight = "700"
) {
    let fontSize =
        startSize;

    while (
        fontSize > minSize
    ) {
        context.font =
            `${weight} ${fontSize}px Arial, sans-serif`;

        if (
            context.measureText(
                text
            ).width <= maxWidth
        ) {
            break;
        }

        fontSize -= 2;
    }

    return fontSize;
}

function canvasToBlob(canvas) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                        return;
                    }

                    reject(
                        new Error(
                            "Không thể tạo ảnh tem."
                        )
                    );
                },
                "image/png",
                1
            );
        }
    );
}

async function drawProductLabel(
    product
) {
    const canvas =
        elements.labelCanvas;

    const context =
        canvas.getContext(
            "2d"
        );

    if (!context) {
        throw new Error(
            "Trình duyệt không hỗ trợ tạo ảnh tem."
        );
    }

    const width =
        canvas.width;

    const height =
        canvas.height;

    context.clearRect(
        0,
        0,
        width,
        height
    );

    context.fillStyle =
        "#ffffff";

    context.fillRect(
        0,
        0,
        width,
        height
    );

    const productName =
        String(
            product.name
            || "Sản phẩm"
        ).trim();

    /*
        In mã vạch bằng SKU ngắn để dễ quét.

        Ví dụ:
        MK007
        H001
        BN015

        Nếu sản phẩm chưa có SKU thì mới dùng
        barcode cũ làm phương án dự phòng.
    */
    const barcodeText =
        String(
            product.sku
            || product.barcode
            || ""
        ).trim();

    if (!barcodeText) {
        throw new Error(
            "Sản phẩm chưa có mã để in."
        );
    }

    const codeText =
        barcodeText;

    const priceText =
        formatMoney(
            product.salePrice
        ).replace(
            /\s+/g,
            ""
        );

    /*
        Tên sản phẩm
    */
    context.fillStyle =
        "#000000";

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    const titleSize =
        fitCanvasText(
            context,
            productName,
            width - 90,
            56,
            30
        );

    context.font =
        `700 ${titleSize}px Arial, sans-serif`;

    context.fillText(
        productName,
        width / 2,
        70
    );

    /*
        Tạo mã vạch Code 128.

        margin tạo vùng trắng hai bên mã,
        giúp camera nhận đầu và cuối mã tốt hơn.
    */
    const barcodeCanvas =
        document.createElement(
            "canvas"
        );

    JsBarcode(
        barcodeCanvas,
        barcodeText,
        {
            format:
                "CODE128",

            width:
                4,

            height:
                170,

            displayValue:
                false,

            margin:
                24,

            background:
                "#ffffff",

            lineColor:
                "#000000"
        }
    );

    const barcodeWidth =
        700;

    const barcodeHeight =
        180;

    const barcodeX =
        Math.round(
            (
                width
                - barcodeWidth
            ) / 2
        );

    const barcodeY =
        135;

    context.drawImage(
        barcodeCanvas,
        barcodeX,
        barcodeY,
        barcodeWidth,
        barcodeHeight
    );

    /*
        Mã sản phẩm và giá bán
    */
    context.textBaseline =
        "alphabetic";

    context.font =
        "700 40px Arial, sans-serif";

    context.textAlign =
        "left";

    context.fillText(
        codeText,
        85,
        515
    );

    context.textAlign =
        "right";

    context.fillText(
        priceText,
        width - 85,
        515
    );

    state.labelBlob =
        await canvasToBlob(
            canvas
        );
}

async function openLabelPrintModal(
    product
) {
    if (
        !product?.barcode
        && !product?.sku
    ) {
        alert(
            "Sản phẩm này chưa có mã vạch."
        );

        return;
    }

    state.labelProduct =
        product;

    state.labelBlob =
        null;

    elements.labelProductName.textContent =
        product.name
        || "Sản phẩm";

    elements.labelProductMeta.textContent =
        `${
            product.sku
            || product.barcode
        } • ${
            formatMoney(
                product.salePrice
            )
        }`;

    elements.labelPrintMessage.textContent =
        "Đang tạo ảnh tem...";

    elements.labelPrintModal
        .classList.remove(
            "hidden"
        );

    try {
        await drawProductLabel(
            product
        );

        elements.labelPrintMessage.textContent =
            "Tem đã sẵn sàng. Nên in bằng chế độ Văn bản và nồng độ Giữa.";
    } catch (error) {
        console.error(
            error
        );

        elements.labelPrintMessage.textContent =
            error.message
            || "Không thể tạo ảnh tem.";
    }
}

function closeLabelPrintModal() {
    state.labelProduct =
        null;

    state.labelBlob =
        null;

    elements.labelPrintModal
        .classList.add(
            "hidden"
        );
}

function getLabelFileName() {
    const product =
        state.labelProduct
        || {};

    const safeCode =
        String(
            product.sku
            || product.barcode
            || "san-pham"
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            );

    return `tem-${safeCode}-50x30.png`;
}

async function downloadLabelImage() {
    if (!state.labelBlob) {
        return;
    }

    const url =
        URL.createObjectURL(
            state.labelBlob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        getLabelFileName();

    document.body.appendChild(
        link
    );

    link.click();
    link.remove();

    setTimeout(
        () => {
            URL.revokeObjectURL(
                url
            );
        },
        1000
    );
}

async function shareLabelImage() {
    if (!state.labelBlob) {
        return;
    }

    const file =
        new File(
            [
                state.labelBlob
            ],
            getLabelFileName(),
            {
                type:
                    "image/png"
            }
        );

    try {
        if (
            navigator.share
            && navigator.canShare?.({
                files: [
                    file
                ]
            })
        ) {
            await navigator.share({
                title:
                    "Tem mã vạch Larva",

                text:
                    "Tem 50 × 30 mm",

                files: [
                    file
                ]
            });

            return;
        }

        await downloadLabelImage();

        elements.labelPrintMessage.textContent =
            "Thiết bị chưa hỗ trợ chia sẻ file. Ảnh tem đã được lưu để mở bằng Fun Print.";
    } catch (error) {
        if (
            error?.name
            === "AbortError"
        ) {
            return;
        }

        console.error(
            error
        );

        elements.labelPrintMessage.textContent =
            "Không thể chia sẻ ảnh. Hãy dùng nút Lưu ảnh tem.";
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

        elements.removeSelectedImageButton
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

    elements.removeSelectedImageButton
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
        url:
            ""
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
            url:
                ""
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
        url:
            ""
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

    if (formCategoryExists) {
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

    if (filterCategoryExists) {
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

    setTimeout(
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

        if (
            product.sku
            || product.barcode
        ) {
            elements.barcodePreviewBox
                .classList.remove(
                    "hidden"
                );

            setTimeout(
                () => {
                    renderBarcode(
                        "#barcodePreview",

                        product.sku
                        || product.barcode
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
   LẤY DỮ LIỆU FORM SẢN PHẨM
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

    if (!selectedCategory) {
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

    if (!sku) {
        throw new Error(
            "Không thể tạo mã sản phẩm."
        );
    }

    let barcode =
        elements.barcode.value.trim();

    if (!barcode) {
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
   LỌC VÀ HIỂN THỊ SẢN PHẨM
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
            (
                barcodeElement
            ) => {
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
   CAMERA QUÉT MÃ
========================================================= */

function createScanner() {
    return new Html5Qrcode(
        "barcodeReader",
        false
    );
}

function getScannerConfig() {
    const screenWidth =
        Math.max(
            window.innerWidth
            || 320,
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
        fps:
            20,

        qrbox: {
            width:
                scanWidth,

            height:
                190
        },

        aspectRatio:
            16 / 9,

        disableFlip:
            true,

        experimentalFeatures: {
            useBarCodeDetectorIfSupported:
                true
        },

        formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF
        ]
    };
}

/*
    Chỉ bật lấy nét liên tục nếu điện thoại hỗ trợ.

    Không còn ép zoom về capabilities.zoom.min,
    vì iPhone có thể hiểu mức nhỏ nhất là camera 0.5x.
*/
async function applyScannerCameraSettings() {
    const video =
        elements.barcodeReader
            ?.querySelector(
                "video"
            );

    const stream =
        video?.srcObject;

    const track =
        stream
            ?.getVideoTracks?.()[0];

    if (!track) {
        return;
    }

    try {
        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};

        const advanced =
            [];

        if (
            Array.isArray(
                capabilities.focusMode
            )
            && capabilities.focusMode.includes(
                "continuous"
            )
        ) {
            advanced.push({
                focusMode:
                    "continuous"
            });
        }

        /*
            Không đặt zoom tại đây.

            Trình duyệt sẽ giữ mức camera mặc định.
            Không ép về 0.5x và cũng không ép về 1x.
        */

        if (
            advanced.length > 0
        ) {
            await track.applyConstraints({
                advanced
            });
        }
    } catch (error) {
        console.warn(
            "Không thể áp dụng lấy nét camera:",
            error
        );
    }
}

function findProductByScannedCode(
    decodedText
) {
    const scannedCode =
        normalizeText(
            decodedText
        );

    return (
        state.products.find(
            (product) => {
                return (
                    normalizeText(
                        product.sku
                    ) === scannedCode
                );
            }
        )

        || state.products.find(
            (product) => {
                return (
                    normalizeText(
                        product.barcode
                    ) === scannedCode
                );
            }
        )

        || null
    );
}

async function handleScanSuccess(
    decodedText
) {
    if (
        state.scanLocked
    ) {
        return;
    }

    state.scanLocked =
        true;

    const product =
        findProductByScannedCode(
            decodedText
        );

    if (product) {
        elements.scannerMessage.textContent =
            `Đã tìm thấy: ${product.name}`;

        /*
            Tem đang mã hóa SKU ngắn,
            nên ưu tiên tìm kiếm bằng SKU.
        */
        elements.searchInput.value =
            product.sku
            || product.barcode
            || "";

        renderProducts();

        showScannedProduct(
            product
        );

        if (
            navigator.vibrate
        ) {
            navigator.vibrate(
                120
            );
        }

        setTimeout(
            async () => {
                await closeScannerModal();
            },
            350
        );

        return;
    }

    elements.scannerMessage.textContent =
        `Không tìm thấy sản phẩm với mã: ${decodedText}`;

    setTimeout(
        () => {
            state.scanLocked =
                false;

            elements.scannerMessage.textContent =
                "Tiếp tục đưa mã vạch vào giữa khung.";
        },
        1400
    );
}

function handleScanFailure() {
    /*
        Hàm này chạy liên tục khi camera
        chưa nhận ra mã.

        Không hiển thị lỗi theo từng khung hình.
    */
}

async function startScanner() {
    elements.scannerMessage.textContent =
        "Đang mở camera sau...";

    state.scanLocked =
        false;

    if (!state.scanner) {
        state.scanner =
            createScanner();
    }

    const scannerConfig =
        getScannerConfig();

    try {
        /*
            Thử yêu cầu camera sau trước.

            Không truyền zoom nên trình duyệt
            không bị ép sang mức 0.5x.
        */
        await state.scanner.start(
            {
                facingMode: {
                    exact:
                        "environment"
                }
            },

            scannerConfig,

            handleScanSuccess,

            handleScanFailure
        );

        state.scannerRunning =
            true;

        elements.scannerMessage.textContent =
            "Đưa toàn bộ mã vạch vào giữa khung.";

        await applyScannerCameraSettings();

        return;
    } catch (
        exactCameraError
    ) {
        console.warn(
            "Không mở được camera sau bằng exact:",
            exactCameraError
        );
    }

    try {
        await state.scanner.start(
            {
                facingMode:
                    "environment"
            },

            scannerConfig,

            handleScanSuccess,

            handleScanFailure
        );

        state.scannerRunning =
            true;

        elements.scannerMessage.textContent =
            "Đưa toàn bộ mã vạch vào giữa khung.";

        await applyScannerCameraSettings();

        return;
    } catch (
        environmentCameraError
    ) {
        console.warn(
            "Không mở được camera environment:",
            environmentCameraError
        );
    }

    try {
        const cameras =
            await Html5Qrcode.getCameras();

        if (
            !cameras.length
        ) {
            throw new Error(
                "Không tìm thấy camera."
            );
        }

        const rearCamera =
            cameras.find(
                (camera) => {
                    const label =
                        normalizeText(
                            camera.label
                        );

                    return (
                        label.includes(
                            "back"
                        )

                        || label.includes(
                            "rear"
                        )

                        || label.includes(
                            "environment"
                        )

                        || label.includes(
                            "sau"
                        )
                    );
                }
            );

        /*
            Không tự lấy camera cuối danh sách nữa,
            vì camera cuối có thể là ống kính 0.5x.

            Nếu nhận diện được camera sau thì dùng camera đó.
            Nếu không nhận diện được thì dùng camera đầu tiên.
        */
        const selectedCamera =
            rearCamera
            || cameras[0];

        await state.scanner.start(
            selectedCamera.id,

            scannerConfig,

            handleScanSuccess,

            handleScanFailure
        );

        state.scannerRunning =
            true;

        elements.scannerMessage.textContent =
            "Đưa toàn bộ mã vạch vào giữa khung.";

        await applyScannerCameraSettings();
    } catch (error) {
        console.error(
            "Không thể mở camera:",
            error
        );

        state.scannerRunning =
            false;

        elements.scannerMessage.textContent =
            "Không mở được camera. Hãy cấp quyền camera và mở web bằng HTTPS.";
    }
}

async function stopScanner() {
    if (
        !state.scanner
        || !state.scannerRunning
    ) {
        return;
    }

    try {
        await state.scanner.stop();
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
            "Không thể xóa vùng camera:",
            error
        );
    }

    state.scannerRunning =
        false;
}

async function openScannerModal() {
    elements.scannerModal
        .classList.remove(
            "hidden"
        );

    await startScanner();
}

async function closeScannerModal() {
    await stopScanner();

    state.scanLocked =
        false;

    elements.scannerMessage.textContent =
        "";

    elements.scannerModal
        .classList.add(
            "hidden"
        );
}
/* =========================================================
   LƯU SẢN PHẨM
========================================================= */

async function handleProductSubmit(event) {
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

        setTimeout(
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
   SỬA, XÓA VÀ IN TEM
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
                printButton.dataset.printLabel
            );

        if (
            !product
        ) {
            alert(
                "Không tìm thấy sản phẩm."
            );

            return;
        }

        await openLabelPrintModal(
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
                editButton.dataset.edit
            );

        if (
            !product
        ) {
            alert(
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
            deleteButton.dataset.delete
        );

    if (
        !product
    ) {
        alert(
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

        alert(
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

function bindModalEvents() {
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

    document
        .querySelectorAll(
            "[data-close-scanner-modal]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeScannerModal
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-label-modal]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeLabelPrintModal
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
                            button.dataset.imageMode
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

    elements.removeSelectedImageButton.addEventListener(
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
    elements.openProductForm.addEventListener(
        "click",
        () => {
            openProductModal();
        }
    );

    elements.openScannerButton.addEventListener(
        "click",
        openScannerModal
    );

    elements.openCategoryModalButton.addEventListener(
        "click",
        openCategoryModal
    );

    elements.productForm.addEventListener(
        "submit",
        handleProductSubmit
    );

    elements.categoryForm.addEventListener(
        "submit",
        handleCategorySubmit
    );

    elements.productTable.addEventListener(
        "click",
        handleProductTableClick
    );

    elements.searchInput.addEventListener(
        "input",
        renderProducts
    );

    elements.categoryFilter.addEventListener(
        "change",
        renderProducts
    );

    elements.downloadLabelButton.addEventListener(
        "click",
        downloadLabelImage
    );

    elements.shareLabelButton.addEventListener(
        "click",
        shareLabelImage
    );

    elements.categoryPrefix.addEventListener(
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

    bindModalEvents();
    bindImageEvents();

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
                !elements.labelPrintModal
                    .classList.contains(
                        "hidden"
                    )
            ) {
                closeLabelPrintModal();
                return;
            }

            if (
                !elements.scannerModal
                    .classList.contains(
                        "hidden"
                    )
            ) {
                await closeScannerModal();
                return;
            }

            if (
                !elements.categoryModal
                    .classList.contains(
                        "hidden"
                    )
            ) {
                closeCategoryModal();
                return;
            }

            if (
                !elements.productModal
                    .classList.contains(
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
                state.scannerRunning
            ) {
                stopScanner();
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