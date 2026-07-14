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

export function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.productSearchInput.value
        );

    return state.products.filter(
        (product) => {
            if (!keyword) {
                return true;
            }

            return (
                normalizeText(
                    product.name
                ).includes(keyword)

                || normalizeText(
                    product.sku
                ).includes(keyword)

                || normalizeText(
                    product.barcode
                ).includes(keyword)
            );
        }
    );
}

export function renderProducts() {
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
                            alt="${escapeHtml(
                                product.name || "Sản phẩm"
                            )}"
                            onerror="this.src='${placeholderImage()}'"
                        >

                        <div class="sale-product-body">

                            <h3>
                                ${escapeHtml(
                                    product.name
                                    || "Sản phẩm"
                                )}
                            </h3>

                            <p class="sale-product-code">
                                ${escapeHtml(
                                    product.sku
                                    || product.barcode
                                    || "Chưa có mã"
                                )}
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
                                data-add-product="${product.id}"
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
        .classList.toggle(
            "hidden",
            products.length > 0
        );
}