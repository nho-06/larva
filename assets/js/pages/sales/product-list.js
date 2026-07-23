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


/* =========================================================
   HIỂN THỊ DANH MỤC TRONG BỘ LỌC
========================================================= */

export function renderCategoryFilter() {
    if (
        !elements.saleCategoryFilter
    ) {
        return;
    }

    const currentValue =
        String(
            state.selectedCategoryId || ""
        );

    elements.saleCategoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${state.categories
            .map((category) => {
                return `
                    <option
                        value="${escapeHtml(
                            category.id || ""
                        )}"
                    >
                        ${escapeHtml(
                            category.name ||
                            "Chưa đặt tên"
                        )}
                    </option>
                `;
            })
            .join("")}
    `;

    const categoryStillExists =
        state.categories.some(
            (category) => {
                return (
                    String(
                        category.id || ""
                    ) ===
                    currentValue
                );
            }
        );

    state.selectedCategoryId =
        categoryStillExists
            ? currentValue
            : "";

    elements.saleCategoryFilter.value =
        state.selectedCategoryId;
}


/* =========================================================
   LỌC SẢN PHẨM
========================================================= */

export function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.productSearchInput
                ?.value || ""
        );

    const selectedCategoryId =
        String(
            state.selectedCategoryId || ""
        );

    return state.products.filter(
        (product) => {
            const matchesKeyword =
                !keyword ||
                normalizeText(
                    product.name || ""
                ).includes(
                    keyword
                ) ||
                normalizeText(
                    product.sku || ""
                ).includes(
                    keyword
                ) ||
                normalizeText(
                    product.barcode || ""
                ).includes(
                    keyword
                );

            const matchesCategory =
                !selectedCategoryId ||
                String(
                    product.categoryId || ""
                ) === selectedCategoryId;

            return (
                matchesKeyword &&
                matchesCategory
            );
        }
    );
}


/* =========================================================
   HIỂN THỊ SẢN PHẨM Ở TRANG BÁN HÀNG
========================================================= */

export function renderProducts() {
    if (
        !elements.saleProductGrid
    ) {
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
                    product.image ||
                    placeholderImage();

                const productId =
                    String(
                        product.id || ""
                    );

                const productName =
                    product.name ||
                    "Sản phẩm";

                const productCode =
                    product.sku ||
                    product.barcode ||
                    "Chưa có mã";

                const salePrice =
                    Number(
                        product.salePrice || 0
                    );

                return `
                    <article
                        class="
                            sale-product-card
                            ${
                                isOutOfStock
                                    ? "out-of-stock"
                                    : ""
                            }
                        "
                    >

                        <img
                            class="sale-product-image"
                            src="${escapeHtml(
                                image
                            )}"
                            alt="${escapeHtml(
                                productName
                            )}"
                            loading="lazy"
                            onerror="this.src='${placeholderImage()}'"
                        >

                        <div class="sale-product-body">

                            <h3>
                                ${escapeHtml(
                                    productName
                                )}
                            </h3>

                            <p class="sale-product-code">
                                ${escapeHtml(
                                    productCode
                                )}
                            </p>

                            <div class="sale-product-meta">

                                <strong>
                                    ${formatMoney(
                                        salePrice
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
                                    productId
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

    elements.emptyProductState
        ?.classList.toggle(
            "hidden",
            products.length > 0
        );
}