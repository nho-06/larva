
import {
    createProduct,
    updateProduct
} from "../../services/product-service.js";

import {
    generateNextSku
} from "../../services/category-service.js";

import {
    productState
} from "./products-state.js";

import {
    productElements
} from "./products-elements.js";

import {
    generateBarcodeValue,
    renderBarcode
} from "./product-barcode.js";

import {
    findCategoryById,
    renderCategoryOptions
} from "./product-category.js";

import {
    resetImageState,
    setImageMode,
    showImagePreview,
    uploadSelectedImageIfNeeded
} from "./product-image.js";

/*
    Hiển thị lỗi trong form sản phẩm.
*/
export function showProductError(
    message
) {
    if (
        !productElements.productFormError
    ) {
        return;
    }

    productElements.productFormError.textContent =
        message;

    productElements.productFormError.classList.remove(
        "hidden"
    );
}

/*
    Ẩn lỗi trong form sản phẩm.
*/
export function hideProductError() {
    if (
        !productElements.productFormError
    ) {
        return;
    }

    productElements.productFormError.textContent =
        "";

    productElements.productFormError.classList.add(
        "hidden"
    );
}

/*
    Mở form thêm hoặc sửa sản phẩm.

    product = null:
    Thêm sản phẩm mới.

    product có dữ liệu:
    Sửa sản phẩm hiện tại.
*/
export function openProductModal(
    product = null
) {
    productElements.productForm
        ?.reset();

    hideProductError();

    resetImageState();

    setImageMode(
        "url"
    );

    if (
        productElements.productId
    ) {
        productElements.productId.value =
            "";
    }

    if (
        productElements.barcode
    ) {
        productElements.barcode.value =
            "";
    }

    if (
        productElements.sku
    ) {
        productElements.sku.value =
            "";
    }

    if (
        productElements.quantity
    ) {
        productElements.quantity.value =
            0;
    }

    if (
        productElements.costPrice
    ) {
        productElements.costPrice.value =
            0;
    }

    if (
        productElements.salePrice
    ) {
        productElements.salePrice.value =
            0;
    }

    productElements.barcodePreviewBox
        ?.classList.add(
            "hidden"
        );

    if (
        productElements.formTitle
    ) {
        productElements.formTitle.textContent =
            product
                ? "Sửa sản phẩm"
                : "Thêm sản phẩm";
    }

    /*
        Nạp lại danh sách danh mục
        trước khi gán danh mục cho sản phẩm.
    */
    renderCategoryOptions();

    if (product) {
        fillProductForm(
            product
        );
    } else {
        if (
            productElements.barcode
        ) {
            productElements.barcode.value =
                generateBarcodeValue();
        }
    }

    productElements.productModal
        ?.classList.remove(
            "hidden"
        );

    window.setTimeout(
        () => {
            productElements.name
                ?.focus();
        },
        0
    );
}

/*
    Điền dữ liệu sản phẩm vào form sửa.
*/
function fillProductForm(
    product
) {
    productElements.productId.value =
        product.id || "";

    productElements.barcode.value =
        product.barcode || "";

    productElements.name.value =
        product.name || "";

    productElements.sku.value =
        product.sku || "";

    productElements.category.value =
        product.categoryId || "";

    productElements.quantity.value =
        Number(
            product.quantity || 0
        );

    productElements.costPrice.value =
        Number(
            product.costPrice
            ?? product.purchasePrice
            ?? product.importPrice
            ?? product.buyPrice
            ?? product.entryPrice
            ?? 0
        );

    productElements.salePrice.value =
        Number(
            product.salePrice || 0
        );

    productElements.image.value =
        product.image || "";

    productElements.description.value =
        product.description || "";

    productState.uploadedImageUrl =
        product.image || "";

    productState.uploadedImagePath =
        product.imageStoragePath || "";

    /*
        Hiển thị ảnh hiện tại.
    */
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

    /*
        Mã được in trên tem ưu tiên SKU.

        Nếu sản phẩm cũ chưa có SKU
        thì sử dụng barcode.
    */
    const previewCode =
        product.sku ||
        product.barcode ||
        "";

    if (!previewCode) {
        return;
    }

    productElements.barcodePreviewBox
        ?.classList.remove(
            "hidden"
        );

    window.setTimeout(
        () => {
            renderBarcode(
                productElements.barcodePreview,
                previewCode
            );
        },
        0
    );
}

/*
    Đóng form sản phẩm.

    Không cho đóng trong lúc ảnh
    đang được tải lên.
*/
export function closeProductModal() {
    if (
        productState.isUploadingImage
    ) {
        return;
    }

    resetImageState();

    productElements.productModal
        ?.classList.add(
            "hidden"
        );

    hideProductError();
}

/*
    Tạo dữ liệu sản phẩm từ form.
*/
export async function getProductFormData(
    imageUrl
) {
    const productId =
        productElements.productId
            ?.value || "";

    const selectedCategory =
        findCategoryById(
            productElements.category
                ?.value || ""
        );

    if (!selectedCategory) {
        throw new Error(
            "Hãy chọn danh mục."
        );
    }

    let sku =
        productElements.sku
            ?.value
            .trim() || "";

    /*
        Khi thêm sản phẩm mới và chưa có SKU,
        tự tạo mã theo ký hiệu danh mục.

        Ví dụ:
        Danh mục Gấu bông có prefix GB
        sẽ tạo GB001, GB002...
    */
    if (
        !productId &&
        !sku
    ) {
        sku =
            await generateNextSku(
                selectedCategory.prefix
            );

        if (
            productElements.sku
        ) {
            productElements.sku.value =
                sku;
        }
    }

    if (!sku) {
        throw new Error(
            "Không thể tạo mã sản phẩm."
        );
    }

    let barcode =
        productElements.barcode
            ?.value
            .trim() || "";

    if (!barcode) {
        barcode =
            generateBarcodeValue();

        if (
            productElements.barcode
        ) {
            productElements.barcode.value =
                barcode;
        }
    }

    return {
        name:
            productElements.name
                ?.value
                .trim() || "",

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
                productElements.quantity
                    ?.value || 0
            ),

        costPrice:
            Number(
                productElements.costPrice
                    ?.value || 0
            ),

        salePrice:
            Number(
                productElements.salePrice
                    ?.value || 0
            ),

        image:
            imageUrl || "",

        imageStoragePath:
            productState.uploadedImagePath ||
            "",

        description:
            productElements.description
                ?.value
                .trim() || ""
    };
}

/*
    Kiểm tra dữ liệu sản phẩm trước khi lưu.
*/
function validateProductData(
    productData
) {
    if (!productData.name) {
        throw new Error(
            "Hãy nhập tên sản phẩm."
        );
    }

    if (!productData.sku) {
        throw new Error(
            "Sản phẩm chưa có mã sản phẩm."
        );
    }

    if (!productData.barcode) {
        throw new Error(
            "Sản phẩm chưa có mã vạch."
        );
    }

    if (
        !Number.isFinite(
            productData.quantity
        ) ||
        productData.quantity < 0
    ) {
        throw new Error(
            "Số lượng không được nhỏ hơn 0."
        );
    }

    if (
        !Number.isFinite(
            productData.costPrice
        ) ||
        productData.costPrice < 0
    ) {
        throw new Error(
            "Giá nhập không được nhỏ hơn 0."
        );
    }

    if (
        !Number.isFinite(
            productData.salePrice
        ) ||
        productData.salePrice < 0
    ) {
        throw new Error(
            "Giá bán không được nhỏ hơn 0."
        );
    }
}

/*
    Lưu sản phẩm mới hoặc cập nhật sản phẩm.
*/
export async function handleProductSubmit(
    event
) {
    event.preventDefault();

    if (
        productState.isUploadingImage
    ) {
        return;
    }

    hideProductError();

    if (
        productElements.saveProductButton
    ) {
        productElements.saveProductButton.disabled =
            true;

        productElements.saveProductButton.textContent =
            "Đang lưu...";
    }

    try {
        /*
            Nếu có file ảnh mới,
            tải ảnh lên trước khi lưu sản phẩm.
        */
        const imageUrl =
            await uploadSelectedImageIfNeeded();

        const productData =
            await getProductFormData(
                imageUrl
            );

        validateProductData(
            productData
        );

        const productId =
            productElements.productId
                ?.value || "";

        if (productId) {
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
            error.message ||
            "Không thể lưu sản phẩm."
        );
    } finally {
        /*
            uploadSelectedImageIfNeeded cũng có thể
            thay đổi trạng thái nút lưu.

            Đặt lại lần cuối để bảo đảm nút
            luôn trở về trạng thái bình thường.
        */
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

/*
    Cập nhật phần xem trước mã vạch
    khi người dùng sửa SKU.
*/
export function updateBarcodePreview() {
    const previewCode =
        productElements.sku
            ?.value
            .trim() ||
        productElements.barcode
            ?.value
            .trim() ||
        "";

    if (!previewCode) {
        productElements.barcodePreviewBox
            ?.classList.add(
                "hidden"
            );

        return;
    }

    productElements.barcodePreviewBox
        ?.classList.remove(
            "hidden"
        );

    window.setTimeout(
        () => {
            renderBarcode(
                productElements.barcodePreview,
                previewCode
            );
        },
        0
    );
}

/*
    Gắn sự kiện riêng cho form sản phẩm.
*/
export function bindProductFormEvents() {
    productElements.openProductForm
        ?.addEventListener(
            "click",
            () => {
                openProductModal();
            }
        );

    productElements.productForm
        ?.addEventListener(
            "submit",
            handleProductSubmit
        );

    productElements.sku
        ?.addEventListener(
            "input",
            updateBarcodePreview
        );

    productElements.barcode
        ?.addEventListener(
            "input",
            updateBarcodePreview
        );

    /*
        Đóng modal bằng các nút
        có thuộc tính data-close-product-modal.
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
}

