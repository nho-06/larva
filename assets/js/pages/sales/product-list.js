import {
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    escapeHtml,
    formatMoney,
    normalizeText,
    placeholderImage
} from "../../utils.js";

/*
    Hiển thị danh sách danh mục vào ô select.
*/
export function renderCategoryFilter() {
    if (!elements.saleCategoryFilter) {
        return;
    }

    const currentCategoryId =
        state.selectedCategoryId || "";

    elements.saleCategoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${state.categories
            .map((category) => {
                const categoryId =
                    String(
                        category.id || ""
                    );

                const categoryName =
                    category.name
                    || "Danh mục";

                return `
                    <option
                        value="${escapeHtml(categoryId)}"
                    >
                        ${escapeHtml(categoryName)}
                    </option>
                `;
            })
            .join("")}
    `;

    const selectedCategoryExists =
        state.categories.some(
            (category) => {
                return (
                    String(category.id || "")
                    === currentCategoryId
                );
            }
        );

    if (selectedCategoryExists) {
        elements.saleCategoryFilter.value =
            currentCategoryId;
    } else {
        elements.saleCategoryFilter.value =
            "";

        state.selectedCategoryId =
            "";
    }
}

/*
    Trả về danh sách sản phẩm sau khi:

    - Lọc theo từ khóa tìm kiếm
    - Lọc theo danh mục đang chọn
*/
export function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.productSearchInput?.value
            || ""
        );

    const selectedCategoryId =
        String(
            state.selectedCategoryId || ""
        );

    const selectedCategory =
        state.categories.find(
            (category) => {
                return (
                    String(category.id || "")
                    === selectedCategoryId
                );
            }
        );

    return state.products.filter(
        (product) => {
            const matchesKeyword =
                !keyword

                || normalizeText(
                    product.name || ""
                ).includes(keyword)

                || normalizeText(
                    product.sku || ""
                ).includes(keyword)

                || normalizeText(
                    product.barcode || ""
                ).includes(keyword);

            /*
                Sản phẩm mới thường lưu categoryId.

                Một số sản phẩm cũ có thể chỉ lưu:
                - category
                - categoryName

                Nên hỗ trợ cả ba trường.
            */
            const productCategoryId =
                String(
                    product.categoryId || ""
                );

            const productCategoryName =
                product.categoryName
                || product.category
                || "";

            const matchesCategory =
                !selectedCategoryId

                || productCategoryId
                    === selectedCategoryId

                || (
                    !productCategoryId
                    && selectedCategory
                    && normalizeText(
                        productCategoryName
                    ) === normalizeText(
                        selectedCategory.name || ""
                    )
                );

            return (
                matchesKeyword
                &&
                matchesCategory
            );
        }
    );
}

/*
    Hiển thị sản phẩm ra trang bán hàng.
*/
export function renderProducts() {
    if (!elements.saleProductGrid) {
        return;
    }

    const products =
        getFilteredProducts();

    elements.saleProductGrid.innerHTML =
        products
            .map((product) => {
                const stock =
                    Number(
                        product.quantity || 0
                    );

                const isOutOfStock =
                    stock <= 0;

                const image =
                    product.image
                    || placeholderImage();

                const productName =
                    product.name
                    || "Sản phẩm";

                const productCode =
                    product.sku
                    || product.barcode
                    || "Chưa có mã";

                const categoryName =
                    getProductCategoryName(
                        product
                    );

                return `
                    <article
                        class="sale-product-card ${
                            isOutOfStock
                                ? "out-of-stock"
                                : ""
                        }"
                    >

                        <img
                            class="sale-product-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(productName)}"
                            onerror="
                                this.onerror = null;
                                this.src = '${placeholderImage()}';
                            "
                        >

                        <div class="sale-product-body">

                            <h3>
                                ${escapeHtml(productName)}
                            </h3>

                            <p class="sale-product-code">
                                ${escapeHtml(productCode)}
                            </p>

                            <p class="sale-product-category">
                                ${escapeHtml(categoryName)}
                            </p>

                            <div class="sale-product-meta">

                                <strong>
                                    ${formatMoney(
                                        product.salePrice
                                    )}
                                </strong>

                                <span>
                                    Còn ${stock}
                                </span>

                            </div>

                            <button
                                class="button sale-add-button"
                                type="button"
                                data-add-product="${escapeHtml(
                                    product.id || ""
                                )}"
                                ${
                                    isOutOfStock
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    isOutOfStock
                                        ? "Hết hàng"
                                        : "Thêm vào giỏ"
                                }
                            </button>

                        </div>

                    </article>
                `;
            })
            .join("");

    if (elements.emptyProductState) {
        elements.emptyProductState
            .classList.toggle(
                "hidden",
                products.length > 0
            );

        if (products.length === 0) {
            const hasKeyword =
                Boolean(
                    normalizeText(
                        elements.productSearchInput?.value
                        || ""
                    )
                );

            if (
                state.selectedCategoryId
                &&
                hasKeyword
            ) {
                elements.emptyProductState.textContent =
                    "Không tìm thấy sản phẩm phù hợp trong danh mục này.";
            } else if (
                state.selectedCategoryId
            ) {
                elements.emptyProductState.textContent =
                    "Danh mục này chưa có sản phẩm.";
            } else if (hasKeyword) {
                elements.emptyProductState.textContent =
                    "Không tìm thấy sản phẩm.";
            } else {
                elements.emptyProductState.textContent =
                    "Chưa có sản phẩm.";
            }
        }
    }
}

function getProductCategoryName(product) {
    const savedCategoryName =
        product.categoryName
        || product.category
        || "";

    if (savedCategoryName) {
        return savedCategoryName;
    }

    const categoryId =
        String(
            product.categoryId || ""
        );

    if (!categoryId) {
        return "Chưa có danh mục";
    }

    const category =
        state.categories.find(
            (item) => {
                return (
                    String(item.id || "")
                    === categoryId
                );
            }
        );

    return (
        category?.name
        || "Chưa có danh mục"
    );
}