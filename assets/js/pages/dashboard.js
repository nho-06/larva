import {
    listenProducts
} from "../services/product-service.js";

import {
    escapeHtml,
    formatMoney,
    placeholderImage
} from "../utils.js";

const elements = {
    productCount:
        document.querySelector("#productCount"),

    stockCount:
        document.querySelector("#stockCount"),

    lowStockCount:
        document.querySelector("#lowStockCount"),

    inventoryValue:
        document.querySelector("#inventoryValue"),

    recentProducts:
        document.querySelector("#recentProducts")
};

listenProducts((products) => {
    const totalStock = products.reduce(
        (total, product) => {
            return total
                + Number(product.quantity || 0);
        },
        0
    );

    const totalInventoryValue = products.reduce(
        (total, product) => {
            const costPrice =
                Number(product.costPrice || 0);

            const quantity =
                Number(product.quantity || 0);

            return total
                + costPrice * quantity;
        },
        0
    );

    const lowStockCount = products.filter(
        (product) => {
            return Number(product.quantity || 0) <= 5;
        }
    ).length;

    elements.productCount.textContent =
        products.length;

    elements.stockCount.textContent =
        totalStock;

    elements.lowStockCount.textContent =
        lowStockCount;

    elements.inventoryValue.textContent =
        formatMoney(totalInventoryValue);

    renderRecentProducts(products);
});

function renderRecentProducts(products) {
    const recentProducts = products.slice(0, 5);

    elements.recentProducts.innerHTML =
        recentProducts
            .map((product) => {
                const image =
                    product.image
                    || placeholderImage();

                return `
                    <tr>

                        <td>
                            <div class="product-cell">

                                <img
                                    class="product-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(product.name)}"
                                    onerror="this.src='${placeholderImage()}'"
                                >

                                <strong>
                                    ${escapeHtml(product.name)}
                                </strong>

                            </div>
                        </td>

                        <td>
                            ${escapeHtml(product.sku)}
                        </td>

                        <td>
                            ${formatMoney(product.salePrice)}
                        </td>

                        <td>
                            ${Number(product.quantity || 0)}
                        </td>

                    </tr>
                `;
            })
            .join("");

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
    }
}