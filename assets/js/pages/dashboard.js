import {
    listenProducts
} from "../services/product-service.js";

import {
    escapeHtml,
    formatMoney,
    placeholderImage
} from "../utils.js";

const LOW_STOCK_LIMIT =
    5;

const UNUSUAL_STOCK_LIMIT =
    500;

let allProducts =
    [];

const elements = {
    productCount:
        document.querySelector(
            "#productCount"
        ),

    stockCount:
        document.querySelector(
            "#stockCount"
        ),

    lowStockCount:
        document.querySelector(
            "#lowStockCount"
        ),

    totalCapital:
        document.querySelector(
            "#totalCapital"
        ),

    inventoryValue:
        document.querySelector(
            "#inventoryValue"
        ),

    expectedProfit:
        document.querySelector(
            "#expectedProfit"
        ),

    recentProducts:
        document.querySelector(
            "#recentProducts"
        ),

    lowStockCard:
        document.querySelector(
            "#lowStockCard"
        ),

    lowStockModal:
        document.querySelector(
            "#lowStockModal"
        ),

    lowStockProductList:
        document.querySelector(
            "#lowStockProductList"
        )
};

/**
 * Lắng nghe danh sách sản phẩm.
 *
 * product-service sẽ:
 * - trả cache trước;
 * - đồng bộ Firebase ở nền;
 * - chỉ gọi lại khi dữ liệu thay đổi.
 */
listenProducts((products) => {
    allProducts =
        Array.isArray(products)
            ? products
            : [];

    logUnusualStockProducts(
        allProducts
    );

    const totalStock =
        calculateTotalStock(
            allProducts
        );

    const totalCapital =
        calculateTotalCapital(
            allProducts
        );

    const inventoryValue =
        calculateInventorySaleValue(
            allProducts
        );

    const expectedProfit =
        Math.max(
            0,
            inventoryValue
            - totalCapital
        );

    const lowStockProducts =
        getLowStockProducts(
            allProducts
        );

    setText(
        elements.productCount,
        allProducts.length
    );

    setText(
        elements.stockCount,
        totalStock
    );

    setText(
        elements.lowStockCount,
        lowStockProducts.length
    );

    setText(
        elements.totalCapital,
        formatMoney(
            totalCapital
        )
    );

    setText(
        elements.inventoryValue,
        formatMoney(
            inventoryValue
        )
    );

    setText(
        elements.expectedProfit,
        formatMoney(
            expectedProfit
        )
    );

    renderRecentProducts(
        allProducts
    );

    if (
        elements.lowStockModal
        &&
        !elements.lowStockModal
            .classList
            .contains(
                "hidden"
            )
    ) {
        renderLowStockProducts(
            lowStockProducts
        );
    }
});

/**
 * Lấy số lượng tồn kho hợp lệ.
 */
function getProductQuantity(
    product
) {
    const rawQuantity =
        product?.quantity
        ??
        product?.stock
        ??
        product?.stockQuantity
        ??
        0;

    const quantity =
        toNumber(
            rawQuantity
        );

    if (quantity < 0) {
        return 0;
    }

    return Math.floor(
        quantity
    );
}

/**
 * Lấy giá vốn sản phẩm.
 *
 * Hỗ trợ dữ liệu cũ và mới.
 */
function getProductCostPrice(
    product
) {
    const rawCostPrice =
        product?.purchasePrice
        ??
        product?.costPrice
        ??
        product?.importPrice
        ??
        product?.buyPrice
        ??
        product?.entryPrice
        ??
        0;

    const costPrice =
        toNumber(
            rawCostPrice
        );

    if (costPrice < 0) {
        return 0;
    }

    return Math.round(
        costPrice
    );
}

/**
 * Lấy giá bán sản phẩm.
 */
function getProductSalePrice(
    product
) {
    const rawSalePrice =
        product?.salePrice
        ??
        product?.price
        ??
        product?.sellingPrice
        ??
        0;

    const salePrice =
        toNumber(
            rawSalePrice
        );

    if (salePrice < 0) {
        return 0;
    }

    return Math.round(
        salePrice
    );
}

/**
 * Lấy đường dẫn ảnh sản phẩm.
 */
function getProductImage(
    product
) {
    return String(
        product?.image
        ||
        product?.imageUrl
        ||
        ""
    ).trim()
    ||
    placeholderImage();
}

/**
 * Tổng số lượng hàng tồn.
 */
function calculateTotalStock(
    products
) {
    return products.reduce(
        (
            total,
            product
        ) => {
            return (
                total
                +
                getProductQuantity(
                    product
                )
            );
        },
        0
    );
}

/**
 * Tổng tiền vốn hàng tồn.
 *
 * Giá vốn × số lượng.
 */
function calculateTotalCapital(
    products
) {
    return products.reduce(
        (
            total,
            product
        ) => {
            const costPrice =
                getProductCostPrice(
                    product
                );

            const quantity =
                getProductQuantity(
                    product
                );

            return (
                total
                +
                costPrice
                *
                quantity
            );
        },
        0
    );
}

/**
 * Tổng giá trị kho theo giá bán.
 *
 * Giá bán × số lượng.
 */
function calculateInventorySaleValue(
    products
) {
    return products.reduce(
        (
            total,
            product
        ) => {
            const salePrice =
                getProductSalePrice(
                    product
                );

            const quantity =
                getProductQuantity(
                    product
                );

            return (
                total
                +
                salePrice
                *
                quantity
            );
        },
        0
    );
}

/**
 * Tìm sản phẩm có tồn kho bất thường.
 *
 * Chỉ cảnh báo trong Console.
 */
function logUnusualStockProducts(
    products
) {
    const unusualProducts =
        products
            .map((product) => {
                const quantity =
                    getProductQuantity(
                        product
                    );

                const salePrice =
                    getProductSalePrice(
                        product
                    );

                const costPrice =
                    getProductCostPrice(
                        product
                    );

                return {
                    name:
                        product?.name
                        ||
                        "Chưa có tên",

                    sku:
                        product?.sku
                        ||
                        product?.code
                        ||
                        product?.barcode
                        ||
                        "Chưa có mã",

                    quantity,

                    costPrice,

                    salePrice,

                    capitalValue:
                        costPrice
                        *
                        quantity,

                    inventoryValue:
                        salePrice
                        *
                        quantity
                };
            })
            .filter((product) => {
                return (
                    product.quantity
                    >=
                    UNUSUAL_STOCK_LIMIT
                );
            })
            .sort(
                (
                    firstProduct,
                    secondProduct
                ) => {
                    return (
                        secondProduct.quantity
                        -
                        firstProduct.quantity
                    );
                }
            );

    if (!unusualProducts.length) {
        return;
    }

    console.warn(
        `Có ${unusualProducts.length} sản phẩm tồn kho từ ${UNUSUAL_STOCK_LIMIT} trở lên.`
    );

    console.table(
        unusualProducts
    );
}

/**
 * Lấy sản phẩm sắp hết.
 */
function getLowStockProducts(
    products
) {
    return products
        .filter((product) => {
            const quantity =
                getProductQuantity(
                    product
                );

            return (
                quantity > 0
                &&
                quantity
                <= LOW_STOCK_LIMIT
            );
        })
        .sort(
            (
                firstProduct,
                secondProduct
            ) => {
                const firstQuantity =
                    getProductQuantity(
                        firstProduct
                    );

                const secondQuantity =
                    getProductQuantity(
                        secondProduct
                    );

                return (
                    firstQuantity
                    -
                    secondQuantity
                );
            }
        );
}

/**
 * Hiển thị tối đa 5 sản phẩm mới nhất.
 */
function renderRecentProducts(
    products
) {
    if (!elements.recentProducts) {
        return;
    }

    const recentProducts =
        products.slice(
            0,
            5
        );

    if (!recentProducts.length) {
        elements.recentProducts
            .innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        Chưa có sản phẩm.
                    </td>
                </tr>
            `;

        return;
    }

    elements.recentProducts
        .innerHTML =
            recentProducts
                .map(
                    (
                        product,
                        index
                    ) => {
                        const productName =
                            product.name
                            ||
                            "Sản phẩm chưa đặt tên";

                        const sku =
                            product.sku
                            ||
                            product.code
                            ||
                            "Chưa có mã";

                        const image =
                            getProductImage(
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

                        /*
                            Ảnh đầu tiên nằm ngay trên màn hình:
                            tải ngay với ưu tiên cao.

                            Các ảnh sau:
                            tải nhẹ hơn để không chặn giao diện.
                        */
                        const loading =
                            index === 0
                                ? "eager"
                                : "lazy";

                        const fetchPriority =
                            index === 0
                                ? "high"
                                : "low";

                        return `
                            <tr>

                                <td>

                                    <div class="product-cell">

                                        <img
                                            class="product-image js-product-image"
                                            src="${escapeHtml(
                                                image
                                            )}"
                                            alt="${escapeHtml(
                                                productName
                                            )}"
                                            loading="${loading}"
                                            decoding="async"
                                            fetchpriority="${fetchPriority}"
                                            width="64"
                                            height="64"
                                        >

                                        <strong>
                                            ${escapeHtml(
                                                productName
                                            )}
                                        </strong>

                                    </div>

                                </td>

                                <td>
                                    ${escapeHtml(
                                        sku
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

                            </tr>
                        `;
                    }
                )
                .join("");

    bindImageFallbackEvents(
        elements.recentProducts
    );
}

/**
 * Hiển thị danh sách sản phẩm sắp hết.
 */
function renderLowStockProducts(
    products
) {
    if (
        !elements.lowStockProductList
    ) {
        return;
    }

    if (!products.length) {
        elements.lowStockProductList
            .innerHTML = `
                <div class="low-stock-empty">

                    <strong>
                        Không có sản phẩm sắp hết
                    </strong>

                    <p>
                        Hiện không có sản phẩm nào còn từ
                        1 đến ${LOW_STOCK_LIMIT}.
                    </p>

                </div>
            `;

        return;
    }

    elements.lowStockProductList
        .innerHTML =
            products
                .map(
                    (
                        product,
                        index
                    ) => {
                        const productName =
                            product.name
                            ||
                            "Sản phẩm chưa đặt tên";

                        const sku =
                            product.sku
                            ||
                            product.code
                            ||
                            "Chưa có mã";

                        const image =
                            getProductImage(
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

                        const loading =
                            index < 3
                                ? "eager"
                                : "lazy";

                        const fetchPriority =
                            index === 0
                                ? "high"
                                : "low";

                        return `
                            <article class="low-stock-item">

                                <img
                                    class="low-stock-image js-product-image"
                                    src="${escapeHtml(
                                        image
                                    )}"
                                    alt="${escapeHtml(
                                        productName
                                    )}"
                                    loading="${loading}"
                                    decoding="async"
                                    fetchpriority="${fetchPriority}"
                                    width="72"
                                    height="72"
                                >

                                <div class="low-stock-info">

                                    <strong>
                                        ${escapeHtml(
                                            productName
                                        )}
                                    </strong>

                                    <span>
                                        Mã:
                                        ${escapeHtml(
                                            sku
                                        )}
                                    </span>

                                    <span>
                                        Giá bán:
                                        ${formatMoney(
                                            salePrice
                                        )}
                                    </span>

                                </div>

                                <div class="low-stock-quantity">
                                    Còn ${quantity}
                                </div>

                            </article>
                        `;
                    }
                )
                .join("");

    bindImageFallbackEvents(
        elements.lowStockProductList
    );
}

/**
 * Khi ảnh sản phẩm bị lỗi,
 * thay bằng ảnh No Image nội bộ.
 *
 * Không dùng onerror viết trực tiếp trong HTML,
 * giúp code an toàn và dễ quản lý hơn.
 */
function bindImageFallbackEvents(
    container
) {
    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            ".js-product-image"
        )
        .forEach((imageElement) => {
            imageElement.addEventListener(
                "error",
                handleImageError,
                {
                    once: true
                }
            );
        });
}

/**
 * Xử lý ảnh không tải được.
 */
function handleImageError(
    event
) {
    const imageElement =
        event.currentTarget;

    if (!imageElement) {
        return;
    }

    imageElement.src =
        placeholderImage();

    imageElement.removeAttribute(
        "fetchpriority"
    );

    imageElement.loading =
        "lazy";
}

/**
 * Mở modal sản phẩm sắp hết.
 */
function openLowStockModal() {
    if (!elements.lowStockModal) {
        return;
    }

    const lowStockProducts =
        getLowStockProducts(
            allProducts
        );

    renderLowStockProducts(
        lowStockProducts
    );

    elements.lowStockModal
        .classList
        .remove(
            "hidden"
        );

    elements.lowStockModal
        .setAttribute(
            "aria-hidden",
            "false"
        );

    document.body.style.overflow =
        "hidden";
}

/**
 * Đóng modal sản phẩm sắp hết.
 */
function closeLowStockModal() {
    if (!elements.lowStockModal) {
        return;
    }

    elements.lowStockModal
        .classList
        .add(
            "hidden"
        );

    elements.lowStockModal
        .setAttribute(
            "aria-hidden",
            "true"
        );

    document.body.style.overflow =
        "";
}

/**
 * Click thẻ sản phẩm sắp hết.
 */
elements.lowStockCard
    ?.addEventListener(
        "click",
        openLowStockModal
    );

/**
 * Mở modal bằng bàn phím.
 */
elements.lowStockCard
    ?.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Enter"
                ||
                event.key === " "
            ) {
                event.preventDefault();

                openLowStockModal();
            }
        }
    );

/**
 * Các nút đóng modal.
 */
document
    .querySelectorAll(
        "[data-close-low-stock-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closeLowStockModal
        );
    });

/**
 * Đóng modal bằng phím Escape.
 */
document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape"
            &&
            elements.lowStockModal
            &&
            !elements.lowStockModal
                .classList
                .contains(
                    "hidden"
                )
        ) {
            closeLowStockModal();
        }
    }
);

/**
 * Gán nội dung cho element.
 */
function setText(
    element,
    value
) {
    if (!element) {
        return;
    }

    element.textContent =
        String(value);
}

/**
 * Chuyển dữ liệu thành số an toàn.
 */
function toNumber(
    value
) {
    if (
        value === null
        ||
        value === undefined
        ||
        value === ""
    ) {
        return 0;
    }

    const normalizedValue =
        typeof value === "string"
            ? value.trim()
            : value;

    const number =
        Number(
            normalizedValue
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}