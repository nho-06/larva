import {
    deleteProduct,
    markProductOutOfStock
} from "../../services/product-service.js";

import {
    escapeHtml,
    formatMoney,
    normalizeText
} from "../../utils.js";

import {
    productState
} from "./products-state.js";

import {
    productElements
} from "./products-elements.js";

import {
    findProductById,
    renderProducts,
    resetProductPage
} from "./product-list.js";

import {
    openProductModal,
    closeProductModal,
    bindProductFormEvents
} from "./product-form.js";

import {
    closeCategoryModal,
    bindProductCategoryEvents
} from "./product-category.js";

import {
    bindProductImageEvents,
    clearLocalPreview
} from "./product-image.js";

import {
    createProductLabelController
} from "./product-label.js";

import {
    createProductScannerController
} from "./product-scanner.js";


/* =========================================================
   HIỂN THỊ SẢN PHẨM VỪA QUÉT
========================================================= */

function showScannedProduct(
    product
) {
    if (
        !productElements.scannedProductBox
    ) {
        return;
    }

    const productCode =
        product.sku
        ||
        product.barcode
        ||
        "";

    const productCategory =
        product.category
        ||
        "Chưa phân loại";

    const quantity =
        normalizeQuantity(
            product.quantity
        );

    const salePrice =
        normalizeMoney(
            product.salePrice
            ??
            product.price
            ??
            0
        );

    productElements.scannedProductBox.innerHTML = `
        <div class="scanned-product-card">

            <div class="scanned-product-info">

                <p>
                    Sản phẩm:

                    <strong>
                        ${escapeHtml(
                            product.name
                            || "Chưa có tên"
                        )}
                    </strong>
                </p>

                <p>
                    Mã sản phẩm:

                    <strong>
                        ${escapeHtml(
                            productCode
                        )}
                    </strong>
                </p>

                <p>
                    Danh mục:

                    <strong>
                        ${escapeHtml(
                            productCategory
                        )}
                    </strong>
                </p>

                <p>
                    Giá bán:

                    <strong>
                        ${formatMoney(
                            salePrice
                        )}
                    </strong>
                </p>

                <p>
                    Tồn kho:

                    <strong>
                        ${quantity}
                    </strong>
                </p>

            </div>

            <div class="scanned-product-actions">

                <button
                    class="button"
                    type="button"
                    id="editScannedProductButton"
                >
                    Sửa sản phẩm
                </button>

                <button
                    class="button button-light"
                    type="button"
                    id="closeScannedProductButton"
                >
                    Đóng
                </button>

            </div>

        </div>
    `;

    productElements.scannedProductBox
        .classList.remove(
            "hidden"
        );

    document
        .querySelector(
            "#editScannedProductButton"
        )
        ?.addEventListener(
            "click",
            () => {
                hideScannedProduct();

                openProductModal(
                    product
                );
            }
        );

    document
        .querySelector(
            "#closeScannedProductButton"
        )
        ?.addEventListener(
            "click",
            hideScannedProduct
        );

    productElements.scannedProductBox
        .scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });
}


/*
    Ẩn sản phẩm vừa quét.

    Đồng thời xóa từ khóa tìm kiếm và
    đưa phân trang trở về trang đầu.
*/
function hideScannedProduct() {
    if (
        !productElements.scannedProductBox
    ) {
        return;
    }

    productElements.scannedProductBox
        .classList.add(
            "hidden"
        );

    productElements.scannedProductBox.innerHTML =
        "";

    if (
        productElements.searchInput
    ) {
        productElements.searchInput.value =
            "";
    }

    resetProductPage();

    renderProducts();
}


/* =========================================================
   CONTROLLER IN TEM
========================================================= */

const labelController =
    createProductLabelController({
        elements:
            productElements,

        formatMoney
    });


/* =========================================================
   CONTROLLER QUÉT MÃ
========================================================= */

const scannerController =
    createProductScannerController({
        elements:
            productElements,

        getProducts() {
            return productState.products;
        },

        normalizeText,

        async onProductFound(
            product
        ) {
            if (
                productElements.searchInput
            ) {
                productElements.searchInput.value =
                    product.sku
                    ||
                    product.barcode
                    ||
                    "";
            }

            /*
                Sản phẩm vừa quét phải xuất hiện
                ngay trên trang đầu của kết quả.
            */
            resetProductPage();

            renderProducts();

            showScannedProduct(
                product
            );
        }
    });


/* =========================================================
   TÌM KIẾM VÀ LỌC
========================================================= */

function handleSearchInput() {
    /*
        Sau khi thay đổi từ khóa, tổng số trang
        có thể thay đổi nên luôn quay về trang 1.
    */
    resetProductPage();

    renderProducts();
}


function handleCategoryFilterChange() {
    /*
        Sau khi đổi danh mục, danh sách kết quả
        có thể ít hơn trang hiện tại.
    */
    resetProductPage();

    renderProducts();
}


/* =========================================================
   XỬ LÝ NÚT TRONG BẢNG
========================================================= */

async function handleProductTableClick(
    event
) {
    const eventTarget =
        event.target;

    if (
        !(
            eventTarget
            instanceof
            Element
        )
    ) {
        return;
    }

    const printButton =
        eventTarget.closest(
            "[data-print-label]"
        );

    if (printButton) {
        const product =
            findProductById(
                printButton.dataset
                    .printLabel
            );

        if (!product) {
            window.alert(
                "Không tìm thấy sản phẩm."
            );

            return;
        }

        try {
            await labelController.open(
                product
            );
        } catch (error) {
            console.error(
                "Không thể mở tem:",
                error
            );

            window.alert(
                error.message
                ||
                "Không thể tạo tem sản phẩm."
            );
        }

        return;
    }

    const editButton =
        eventTarget.closest(
            "[data-edit]"
        );

    if (editButton) {
        const product =
            findProductById(
                editButton.dataset.edit
            );

        if (!product) {
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

    const outOfStockButton =
        eventTarget.closest(
            "[data-out-of-stock]"
        );

    if (outOfStockButton) {
        const product =
            findProductById(
                outOfStockButton.dataset
                    .outOfStock
            );

        if (!product) {
            window.alert(
                "Không tìm thấy sản phẩm."
            );

            return;
        }

        const confirmed =
            window.confirm(
                `Đánh dấu sản phẩm "${product.name}" là hết hàng? Tồn kho sẽ được đặt về 0.`
            );

        if (!confirmed) {
            return;
        }

        outOfStockButton.disabled =
            true;

        outOfStockButton.textContent =
            "Đang cập nhật...";

        try {
            await markProductOutOfStock(
                product.id
            );
        } catch (error) {
            console.error(
                "Không thể cập nhật hết hàng:",
                error
            );

            window.alert(
                error.message
                || "Không thể đánh dấu sản phẩm hết hàng."
            );

            outOfStockButton.disabled =
                false;

            outOfStockButton.textContent =
                "Hết hàng";
        }

        return;
    }

    const deleteButton =
        eventTarget.closest(
            "[data-delete]"
        );

    if (!deleteButton) {
        return;
    }

    const product =
        findProductById(
            deleteButton.dataset.delete
        );

    if (!product) {
        window.alert(
            "Không tìm thấy sản phẩm."
        );

        return;
    }

    const confirmed =
        window.confirm(
            `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
        );

    if (!confirmed) {
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

        /*
            Nếu xóa sản phẩm cuối cùng của trang,
            renderProducts sẽ tự điều chỉnh số trang.
        */
        renderProducts();
    } catch (error) {
        console.error(
            "Không thể xóa sản phẩm:",
            error
        );

        window.alert(
            error.message
            ||
            "Không thể xóa sản phẩm."
        );

        deleteButton.disabled =
            false;

        deleteButton.textContent =
            "Xóa";
    }
}


/* =========================================================
   PHÍM ESCAPE
========================================================= */

async function handleEscapeKey(
    event
) {
    if (
        event.key !== "Escape"
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
        productElements.categoryModal
        &&
        !productElements.categoryModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeCategoryModal();

        return;
    }

    if (
        productElements.productModal
        &&
        !productElements.productModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeProductModal();
    }
}


/* =========================================================
   RỜI TRANG
========================================================= */

function handlePageExit() {
    clearLocalPreview();

    if (
        scannerController.isRunning()
    ) {
        scannerController
            .stop()
            .catch(
                (error) => {
                    console.warn(
                        "Không thể dừng camera:",
                        error
                    );
                }
            );
    }
}


/* =========================================================
   CHUẨN HÓA DỮ LIỆU
========================================================= */

function normalizeQuantity(
    value
) {
    const quantity =
        Number(
            value
            ??
            0
        );

    if (
        !Number.isFinite(
            quantity
        )
        ||
        quantity < 0
    ) {
        return 0;
    }

    return Math.floor(
        quantity
    );
}


function normalizeMoney(
    value
) {
    const money =
        Number(
            value
            ??
            0
        );

    if (
        !Number.isFinite(
            money
        )
        ||
        money < 0
    ) {
        return 0;
    }

    return Math.round(
        money
    );
}


/* =========================================================
   KHỞI TẠO SỰ KIỆN
========================================================= */

export function initializeProductEvents() {
    bindProductFormEvents();

    bindProductCategoryEvents();

    bindProductImageEvents();

    labelController.bindEvents();

    scannerController.bindEvents();

    productElements.openScannerButton
        ?.addEventListener(
            "click",
            async () => {
                try {
                    await scannerController.open();
                } catch (error) {
                    console.error(
                        "Không thể mở camera:",
                        error
                    );
                }
            }
        );

    /*
        Dùng event delegation để các nút vẫn hoạt động
        sau mỗi lần chuyển trang hoặc render lại bảng.
    */
    productElements.productTable
        ?.addEventListener(
            "click",
            handleProductTableClick
        );

    productElements.searchInput
        ?.addEventListener(
            "input",
            handleSearchInput
        );

    productElements.categoryFilter
        ?.addEventListener(
            "change",
            handleCategoryFilterChange
        );

    document.addEventListener(
        "keydown",
        handleEscapeKey
    );

    window.addEventListener(
        "pagehide",
        handlePageExit
    );
}