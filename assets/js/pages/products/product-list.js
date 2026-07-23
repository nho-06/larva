import {
    escapeHtml,
    formatMoney,
    normalizeText,
    placeholderImage
} from "../../utils.js";

import {
    productState
} from "./products-state.js";

import {
    productElements
} from "./products-elements.js";


/* =========================================================
   CẤU HÌNH PHÂN TRANG
========================================================= */

const PRODUCTS_PER_PAGE =
    20;

let currentPage =
    1;

let paginationEventsBound =
    false;


/* =========================================================
   TRẠNG THÁI LỌC HẾT HÀNG
========================================================= */

/*
    false:
    Hiển thị toàn bộ sản phẩm.

    true:
    Chỉ hiển thị sản phẩm có tồn kho bằng 0.
*/
let showOutOfStockOnly =
    false;


/* =========================================================
   BẬT / TẮT LỌC HẾT HÀNG
========================================================= */

export function toggleOutOfStockFilter() {
    showOutOfStockOnly =
        !showOutOfStockOnly;

    return showOutOfStockOnly;
}


/*
    Kiểm tra hiện tại có đang
    chỉ xem hàng hết hay không.
*/
export function isShowingOutOfStockOnly() {
    return showOutOfStockOnly;
}


/* =========================================================
   TÌM SẢN PHẨM THEO ID
========================================================= */

export function findProductById(
    productId
) {
    return (
        productState.products.find(
            (
                product
            ) => {
                return (
                    String(
                        product.id
                        ||
                        ""
                    )
                    ===
                    String(
                        productId
                        ||
                        ""
                    )
                );
            }
        )
        ||
        null
    );
}


/* =========================================================
   TÌM SẢN PHẨM THEO MÃ
========================================================= */

export function findProductByCode(
    code
) {
    const normalizedCode =
        String(
            code
            ||
            ""
        )
            .trim()
            .toLowerCase();

    if (!normalizedCode) {
        return null;
    }

    return (
        productState.products.find(
            (
                product
            ) => {
                const sku =
                    String(
                        product.sku
                        ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                const barcode =
                    String(
                        product.barcode
                        ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                return (
                    sku
                    ===
                    normalizedCode
                    ||
                    barcode
                    ===
                    normalizedCode
                );
            }
        )
        ||
        null
    );
}


/* =========================================================
   LỌC SẢN PHẨM
========================================================= */

export function getFilteredProducts() {
    const keyword =
        normalizeText(
            productElements.searchInput
                ?.value
            ||
            ""
        );

    const selectedCategoryId =
        String(
            productElements.categoryFilter
                ?.value
            ||
            ""
        );

    return productState.products.filter(
        (
            product
        ) => {
            const matchesKeyword =
                !keyword
                ||
                normalizeText(
                    product.name
                    ||
                    ""
                ).includes(
                    keyword
                )
                ||
                normalizeText(
                    product.sku
                    ||
                    ""
                ).includes(
                    keyword
                )
                ||
                normalizeText(
                    product.barcode
                    ||
                    ""
                ).includes(
                    keyword
                );

            const matchesCategory =
                !selectedCategoryId
                ||
                String(
                    product.categoryId
                    ||
                    ""
                )
                ===
                selectedCategoryId;

            const quantity =
                getProductQuantity(
                    product
                );

            /*
                Khi nút Hết hàng đang bật,
                chỉ lấy sản phẩm tồn kho bằng 0.
            */
            const matchesStockFilter =
                !showOutOfStockOnly
                ||
                quantity <= 0;

            return (
                matchesKeyword
                &&
                matchesCategory
                &&
                matchesStockFilter
            );
        }
    );
}


/* =========================================================
   ĐẶT LẠI TRANG
========================================================= */

export function resetProductPage() {
    currentPage =
        1;
}


/* =========================================================
   CHUẨN HÓA TRANG HIỆN TẠI
========================================================= */

function normalizeCurrentPage(
    totalPages
) {
    if (
        currentPage < 1
    ) {
        currentPage =
            1;
    }

    if (
        currentPage
        >
        totalPages
    ) {
        currentPage =
            totalPages;
    }
}


/* =========================================================
   TẠO KHU VỰC PHÂN TRANG
========================================================= */

function ensurePaginationContainer() {
    let paginationContainer =
        document.querySelector(
            "#productPagination"
        );

    if (paginationContainer) {
        return paginationContainer;
    }

    const panel =
        productElements.productTable
            ?.closest(
                ".panel"
            );

    if (!panel) {
        return null;
    }

    paginationContainer =
        document.createElement(
            "div"
        );

    paginationContainer.id =
        "productPagination";

    paginationContainer.className =
        "product-pagination";

    paginationContainer.innerHTML = `
        <div class="product-pagination-info">
            <span id="productPaginationInfo"></span>
        </div>

        <div class="product-pagination-actions">

            <button
                id="previousProductPageButton"
                class="button button-light"
                type="button"
            >
                ← Trước
            </button>

            <span
                id="productPageIndicator"
                class="product-page-indicator"
            ></span>

            <button
                id="nextProductPageButton"
                class="button button-light"
                type="button"
            >
                Sau →
            </button>

        </div>
    `;

    panel.appendChild(
        paginationContainer
    );

    bindPaginationEvents();

    return paginationContainer;
}


/* =========================================================
   GẮN SỰ KIỆN PHÂN TRANG
========================================================= */

function bindPaginationEvents() {
    if (
        paginationEventsBound
    ) {
        return;
    }

    const previousButton =
        document.querySelector(
            "#previousProductPageButton"
        );

    const nextButton =
        document.querySelector(
            "#nextProductPageButton"
        );

    previousButton
        ?.addEventListener(
            "click",
            () => {
                if (
                    currentPage <= 1
                ) {
                    return;
                }

                currentPage -=
                    1;

                renderProducts();

                scrollProductTableToTop();
            }
        );

    nextButton
        ?.addEventListener(
            "click",
            () => {
                const filteredProducts =
                    getFilteredProducts();

                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filteredProducts.length
                            /
                            PRODUCTS_PER_PAGE
                        )
                    );

                if (
                    currentPage
                    >=
                    totalPages
                ) {
                    return;
                }

                currentPage +=
                    1;

                renderProducts();

                scrollProductTableToTop();
            }
        );

    paginationEventsBound =
        true;
}


/* =========================================================
   CUỘN VỀ ĐẦU BẢNG
========================================================= */

function scrollProductTableToTop() {
    const tableWrap =
        productElements.productTable
            ?.closest(
                ".table-wrap"
            );

    tableWrap
        ?.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });
}


/* =========================================================
   HIỂN THỊ PHÂN TRANG
========================================================= */

function renderPagination(
    totalProducts,
    totalPages,
    startIndex,
    visibleCount
) {
    const paginationContainer =
        ensurePaginationContainer();

    if (!paginationContainer) {
        return;
    }

    const paginationInfo =
        document.querySelector(
            "#productPaginationInfo"
        );

    const pageIndicator =
        document.querySelector(
            "#productPageIndicator"
        );

    const previousButton =
        document.querySelector(
            "#previousProductPageButton"
        );

    const nextButton =
        document.querySelector(
            "#nextProductPageButton"
        );

    if (
        totalProducts <= 0
    ) {
        paginationContainer
            .classList.add(
                "hidden"
            );

        return;
    }

    paginationContainer
        .classList.remove(
            "hidden"
        );

    const firstItem =
        startIndex + 1;

    const lastItem =
        startIndex
        +
        visibleCount;

    if (paginationInfo) {
        paginationInfo.textContent =
            `Hiển thị ${firstItem}–${lastItem} trong ${totalProducts} sản phẩm`;
    }

    if (pageIndicator) {
        pageIndicator.textContent =
            `Trang ${currentPage}/${totalPages}`;
    }

    if (previousButton) {
        previousButton.disabled =
            currentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled =
            currentPage >= totalPages;
    }
}


/* =========================================================
   HIỂN THỊ DANH SÁCH SẢN PHẨM
========================================================= */

export function renderProducts() {
    if (
        !productElements.productTable
    ) {
        return;
    }

    const filteredProducts =
        getFilteredProducts();

    const totalProducts =
        filteredProducts.length;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalProducts
                /
                PRODUCTS_PER_PAGE
            )
        );

    normalizeCurrentPage(
        totalPages
    );

    const startIndex =
        (
            currentPage - 1
        )
        *
        PRODUCTS_PER_PAGE;

    const products =
        filteredProducts.slice(
            startIndex,
            startIndex
            +
            PRODUCTS_PER_PAGE
        );

    if (
        !products.length
    ) {
        productElements.productTable.innerHTML =
            "";

        productElements.emptyState
            ?.classList.remove(
                "hidden"
            );

        if (
            productElements.emptyState
        ) {
            productElements.emptyState.textContent =
                showOutOfStockOnly
                    ? "Không có sản phẩm nào hết hàng."
                    : "Chưa có sản phẩm phù hợp.";
        }

        renderPagination(
            0,
            1,
            0,
            0
        );

        return;
    }

    productElements.emptyState
        ?.classList.add(
            "hidden"
        );

    productElements.productTable.innerHTML =
        products
            .map(
                createProductRow
            )
            .join("");

    renderPagination(
        totalProducts,
        totalPages,
        startIndex,
        products.length
    );
}


/* =========================================================
   TẠO DÒNG SẢN PHẨM
========================================================= */

function createProductRow(
    product
) {
    const image =
        getProductImage(
            product
        );

    const productCode =
        String(
            product.sku
            ||
            product.barcode
            ||
            ""
        );

    const costPrice =
        getProductCostPrice(
            product
        );

    const salePrice =
        getProductSalePrice(
            product
        );

    const quantity =
        getProductQuantity(
            product
        );

    return `
        <tr class="${
            quantity <= 0
                ? "product-row-out-of-stock"
                : ""
        }">

            <td>

                <div class="product-cell">

                    <img
                        class="product-image"
                        src="${escapeHtml(
                            image
                        )}"
                        alt="${escapeHtml(
                            product.name
                            ||
                            "Sản phẩm"
                        )}"
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                        onerror="
                            this.onerror = null;
                            this.src = '${placeholderImage()}';
                        "
                    >

                    <div>

                        <span class="product-name">
                            ${escapeHtml(
                                product.name
                                ||
                                "Chưa có tên"
                            )}
                        </span>

                        <div class="product-description">
                            ${escapeHtml(
                                product.description
                                ||
                                "Chưa có mô tả"
                            )}
                        </div>

                    </div>

                </div>

            </td>

            <td>
                ${escapeHtml(
                    product.sku
                    ||
                    ""
                )}
            </td>

            <td>

                ${
                    productCode
                        ? `
                            <span
                                class="product-code-text"
                                title="Mã dùng để quét và in tem"
                            >
                                ${escapeHtml(
                                    productCode
                                )}
                            </span>
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
                    ||
                    "Chưa phân loại"
                )}
            </td>

            <td>
                ${formatMoney(
                    costPrice
                )}
            </td>

            <td>
                ${formatMoney(
                    salePrice
                )}
            </td>

            <td>
                ${quantity}
            </td>

            <td>

                <div class="actions">

                    <button
                        class="button button-light"
                        type="button"
                        data-print-label="${escapeHtml(
                            product.id
                            ||
                            ""
                        )}"
                    >
                        In tem
                    </button>

                    <button
                        class="button button-light"
                        type="button"
                        data-edit="${escapeHtml(
                            product.id
                            ||
                            ""
                        )}"
                    >
                        Sửa
                    </button>

                    <button
                        class="button button-danger"
                        type="button"
                        data-delete="${escapeHtml(
                            product.id
                            ||
                            ""
                        )}"
                    >
                        Xóa
                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   LẤY ẢNH SẢN PHẨM
========================================================= */

function getProductImage(
    product
) {
    const image =
        String(
            product?.image
            ||
            product?.imageUrl
            ||
            ""
        ).trim();

    return (
        image
        ||
        placeholderImage()
    );
}


/* =========================================================
   LẤY SỐ LƯỢNG TỒN KHO
========================================================= */

function getProductQuantity(
    product
) {
    const quantity =
        Number(
            product?.quantity
            ??
            product?.stock
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


/* =========================================================
   LẤY GIÁ NHẬP
========================================================= */

function getProductCostPrice(
    product
) {
    const costPrice =
        Number(
            product?.costPrice
            ??
            product?.purchasePrice
            ??
            product?.importPrice
            ??
            product?.buyPrice
            ??
            product?.entryPrice
            ??
            0
        );

    if (
        !Number.isFinite(
            costPrice
        )
        ||
        costPrice < 0
    ) {
        return 0;
    }

    return Math.round(
        costPrice
    );
}


/* =========================================================
   LẤY GIÁ BÁN
========================================================= */

function getProductSalePrice(
    product
) {
    const salePrice =
        Number(
            product?.salePrice
            ??
            product?.price
            ??
            0
        );

    if (
        !Number.isFinite(
            salePrice
        )
        ||
        salePrice < 0
    ) {
        return 0;
    }

    return Math.round(
        salePrice
    );
}