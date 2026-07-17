import {
    listenProducts
} from "../services/product-service.js";

import {
    escapeHtml,
    formatMoney,
    placeholderImage
} from "../utils.js";

const LOW_STOCK_LIMIT = 5;

let allProducts = [];

const elements = {
    productCount:
        document.querySelector("#productCount"),

    stockCount:
        document.querySelector("#stockCount"),

    lowStockCount:
        document.querySelector("#lowStockCount"),

    totalCapital:
        document.querySelector("#totalCapital"),

    inventoryValue:
        document.querySelector("#inventoryValue"),

    expectedProfit:
        document.querySelector("#expectedProfit"),

    recentProducts:
        document.querySelector("#recentProducts"),

    lowStockCard:
        document.querySelector("#lowStockCard"),

    lowStockModal:
        document.querySelector("#lowStockModal"),

    lowStockProductList:
        document.querySelector("#lowStockProductList")
};

listenProducts((products) => {
    allProducts =
        Array.isArray(products)
            ? products
            : [];

    const totalStock =
        calculateTotalStock(allProducts);

    /*
        Tổng tiền vốn của hàng đang tồn:

        Giá nhập × số lượng còn lại.
    */
    const totalCapital =
        calculateTotalCapital(allProducts);

    /*
        Tổng giá trị kho theo giá bán:

        Giá bán × số lượng còn lại.
    */
    const inventoryValue =
        calculateInventorySaleValue(allProducts);

    /*
        Lợi nhuận dự kiến khi bán hết hàng tồn.
    */
    const expectedProfit =
        inventoryValue - totalCapital;

    const lowStockProducts =
        getLowStockProducts(allProducts);

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
        formatMoney(totalCapital)
    );

    setText(
        elements.inventoryValue,
        formatMoney(inventoryValue)
    );

    setText(
        elements.expectedProfit,
        formatMoney(expectedProfit)
    );

    renderRecentProducts(allProducts);

    /*
        Nếu modal đang mở, Firebase thay đổi
        thì danh sách trong modal cũng cập nhật.
    */
    if (
        elements.lowStockModal
        &&
        !elements.lowStockModal.classList.contains("hidden")
    ) {
        renderLowStockProducts(lowStockProducts);
    }
});

function calculateTotalStock(products) {
    return products.reduce(
        (total, product) => {
            return (
                total
                +
                toNumber(product.quantity)
            );
        },
        0
    );
}

function calculateTotalCapital(products) {
    return products.reduce(
        (total, product) => {
            const costPrice =
                toNumber(product.costPrice);

            const quantity =
                toNumber(product.quantity);

            return (
                total
                +
                costPrice * quantity
            );
        },
        0
    );
}

function calculateInventorySaleValue(products) {
    return products.reduce(
        (total, product) => {
            const salePrice =
                toNumber(product.salePrice);

            const quantity =
                toNumber(product.quantity);

            return (
                total
                +
                salePrice * quantity
            );
        },
        0
    );
}

function getLowStockProducts(products) {
    return products
        .filter((product) => {
            const quantity =
                toNumber(product.quantity);

            return (
                quantity > 0
                &&
                quantity <= LOW_STOCK_LIMIT
            );
        })
        .sort((firstProduct, secondProduct) => {
            const firstQuantity =
                toNumber(firstProduct.quantity);

            const secondQuantity =
                toNumber(secondProduct.quantity);

            return firstQuantity - secondQuantity;
        });
}

function renderRecentProducts(products) {
    if (!elements.recentProducts) {
        return;
    }

    const recentProducts =
        products.slice(0, 5);

    if (!recentProducts.length) {
        elements.recentProducts.innerHTML = `
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

    elements.recentProducts.innerHTML =
        recentProducts
            .map((product) => {
                const productName =
                    product.name
                    ||
                    "Sản phẩm chưa đặt tên";

                const sku =
                    product.sku
                    ||
                    "Chưa có mã";

                const image =
                    product.image
                    ||
                    placeholderImage();

                const salePrice =
                    toNumber(product.salePrice);

                const quantity =
                    toNumber(product.quantity);

                return `
                    <tr>

                        <td>

                            <div class="product-cell">

                                <img
                                    class="product-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(productName)}"
                                    onerror="
                                        this.onerror = null;
                                        this.src = '${placeholderImage()}';
                                    "
                                >

                                <strong>
                                    ${escapeHtml(productName)}
                                </strong>

                            </div>

                        </td>

                        <td>
                            ${escapeHtml(sku)}
                        </td>

                        <td>
                            ${formatMoney(salePrice)}
                        </td>

                        <td>
                            ${quantity}
                        </td>

                    </tr>
                `;
            })
            .join("");
}

function renderLowStockProducts(products) {
    if (!elements.lowStockProductList) {
        return;
    }

    if (!products.length) {
        elements.lowStockProductList.innerHTML = `
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

    elements.lowStockProductList.innerHTML =
        products
            .map((product) => {
                const productName =
                    product.name
                    ||
                    "Sản phẩm chưa đặt tên";

                const sku =
                    product.sku
                    ||
                    "Chưa có mã";

                const image =
                    product.image
                    ||
                    placeholderImage();

                const salePrice =
                    toNumber(product.salePrice);

                const quantity =
                    toNumber(product.quantity);

                return `
                    <article class="low-stock-item">

                        <img
                            class="low-stock-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(productName)}"
                            onerror="
                                this.onerror = null;
                                this.src = '${placeholderImage()}';
                            "
                        >

                        <div class="low-stock-info">

                            <strong>
                                ${escapeHtml(productName)}
                            </strong>

                            <span>
                                Mã: ${escapeHtml(sku)}
                            </span>

                            <span>
                                Giá bán: ${formatMoney(salePrice)}
                            </span>

                        </div>

                        <div class="low-stock-quantity">
                            Còn ${quantity}
                        </div>

                    </article>
                `;
            })
            .join("");
}

function openLowStockModal() {
    if (!elements.lowStockModal) {
        return;
    }

    const lowStockProducts =
        getLowStockProducts(allProducts);

    renderLowStockProducts(
        lowStockProducts
    );

    elements.lowStockModal.classList.remove(
        "hidden"
    );

    elements.lowStockModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";
}

function closeLowStockModal() {
    if (!elements.lowStockModal) {
        return;
    }

    elements.lowStockModal.classList.add(
        "hidden"
    );

    elements.lowStockModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";
}

elements.lowStockCard?.addEventListener(
    "click",
    openLowStockModal
);

elements.lowStockCard?.addEventListener(
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

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape"
            &&
            elements.lowStockModal
            &&
            !elements.lowStockModal.classList.contains(
                "hidden"
            )
        ) {
            closeLowStockModal();
        }
    }
);

function setText(element, value) {
    if (!element) {
        return;
    }

    element.textContent =
        String(value);
}

function toNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}