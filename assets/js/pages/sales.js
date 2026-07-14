import {
    listenProducts
} from "../services/product-service.js";

import {
    state
} from "./sales/sales-state.js";

import {
    initializeSaleEvents
} from "./sales/sale-events.js";

import {
    renderProducts
} from "./sales/product-list.js";

import {
    renderCart
} from "./sales/cart.js";

function syncCartStock(products) {
    state.cart.forEach((cartItem) => {
        const product =
            products.find((item) => {
                return item.id
                    === cartItem.productId;
            });

        if (!product) {
            return;
        }

        const stock =
            Number(
                product.quantity || 0
            );

        cartItem.stock =
            stock;

        if (cartItem.quantity > stock) {
            cartItem.quantity =
                stock;
        }
    });

    state.cart =
        state.cart.filter((item) => {
            return (
                Number(item.stock || 0) > 0
                && Number(item.quantity || 0) > 0
            );
        });
}

function initializeSalesPage() {
    initializeSaleEvents();

    renderProducts();
    renderCart();

    listenProducts((products) => {
        state.products =
            Array.isArray(products)
                ? products
                : [];

        syncCartStock(
            state.products
        );

        renderProducts();
        renderCart();
    });
}

initializeSalesPage();