import {
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    escapeHtml,
    formatMoney,
    placeholderImage
} from "../../utils.js";

export function getCartTotal() {
    return state.cart.reduce(
        (total, item) => {
            return (
                total
                + Number(item.price || 0)
                * Number(item.quantity || 0)
            );
        },
        0
    );
}

export function getCartQuantity() {
    return state.cart.reduce(
        (total, item) => {
            return (
                total
                + Number(item.quantity || 0)
            );
        },
        0
    );
}

export function showSaleMessage(
    message,
    type = "success"
) {
    elements.saleMessage.textContent =
        message;

    elements.saleMessage.className =
        `pos-message ${type}`;

    window.clearTimeout(
        showSaleMessage.timer
    );

    showSaleMessage.timer =
        window.setTimeout(() => {
            elements.saleMessage
                .classList.add("hidden");
        }, 2200);
}

export function renderCart() {
    const total =
        getCartTotal();

    const quantity =
        getCartQuantity();

    elements.cartItems.innerHTML =
        state.cart
            .map((item) => {
                const image =
                    item.image
                    || placeholderImage();

                const lineTotal =
                    Number(item.price || 0)
                    * Number(item.quantity || 0);

                return `
                    <div class="cart-item">

                        <img
                            class="cart-item-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(item.name)}"
                            onerror="this.src='${placeholderImage()}'"
                        >

                        <div class="cart-item-info">

                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    item.sku
                                    || item.barcode
                                    || ""
                                )}
                            </small>

                            <span>
                                ${formatMoney(item.price)}
                            </span>

                        </div>

                        <div class="cart-item-actions">

                            <div class="quantity-control">

                                <button
                                    type="button"
                                    data-decrease="${item.productId}"
                                    aria-label="Giảm số lượng"
                                >
                                    −
                                </button>

                                <span>
                                    ${item.quantity}
                                </span>

                                <button
                                    type="button"
                                    data-increase="${item.productId}"
                                    aria-label="Tăng số lượng"
                                >
                                    +
                                </button>

                            </div>

                            <strong>
                                ${formatMoney(lineTotal)}
                            </strong>

                            <button
                                class="remove-cart-item"
                                type="button"
                                data-remove="${item.productId}"
                            >
                                Xóa
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");

    elements.emptyCartState
        .classList.toggle(
            "hidden",
            state.cart.length > 0
        );

    elements.cartCount.textContent =
        quantity;

    elements.cartTotal.textContent =
        formatMoney(total);

    elements.openPaymentButton.disabled =
        state.cart.length === 0;

    elements.clearCartButton.disabled =
        state.cart.length === 0;
}

export function addProductToCart(
    product,
    fromScanner = false
) {
    const stock =
        Number(
            product.quantity || 0
        );

    if (stock <= 0) {
        showSaleMessage(
            "Sản phẩm đã hết hàng.",
            "error"
        );

        return false;
    }

    const currentItem =
        state.cart.find(
            (item) => {
                return item.productId
                    === product.id;
            }
        );

    const currentQuantity =
        Number(
            currentItem?.quantity || 0
        );

    if (currentQuantity >= stock) {
        showSaleMessage(
            `Không thể thêm. Sản phẩm chỉ còn ${stock}.`,
            "error"
        );

        return false;
    }

    if (currentItem) {
        currentItem.quantity += 1;
    } else {
        state.cart.push({
            productId:
                product.id,

            name:
                product.name || "Sản phẩm",

            sku:
                product.sku || "",

            barcode:
                product.barcode || "",

            image:
                product.image || "",

            price:
                Number(
                    product.salePrice || 0
                ),

            quantity:
                1,

            stock
        });
    }

    renderCart();

    showSaleMessage(
        fromScanner
            ? `Đã quét: ${product.name}`
            : `Đã thêm: ${product.name}`
    );

    return true;
}

export function updateCartQuantity(
    productId,
    change
) {
    const item =
        state.cart.find(
            (cartItem) => {
                return cartItem.productId
                    === productId;
            }
        );

    if (!item) {
        return;
    }

    const product =
        state.products.find(
            (currentProduct) => {
                return currentProduct.id
                    === productId;
            }
        );

    const currentStock =
        Number(
            product?.quantity
            || item.stock
            || 0
        );

    const nextQuantity =
        Number(item.quantity)
        + Number(change);

    if (nextQuantity <= 0) {
        state.cart =
            state.cart.filter(
                (cartItem) => {
                    return cartItem.productId
                        !== productId;
                }
            );
    } else if (
        nextQuantity > currentStock
    ) {
        showSaleMessage(
            `Sản phẩm chỉ còn ${currentStock}.`,
            "error"
        );

        return;
    } else {
        item.quantity =
            nextQuantity;

        item.stock =
            currentStock;
    }

    renderCart();
}

export function removeCartItem(
    productId
) {
    state.cart =
        state.cart.filter(
            (item) => {
                return item.productId
                    !== productId;
            }
        );

    renderCart();
}

export function clearCart() {
    if (state.cart.length === 0) {
        return;
    }

    const accepted =
        confirm(
            "Xóa toàn bộ sản phẩm trong giỏ?"
        );

    if (!accepted) {
        return;
    }

    state.cart = [];

    renderCart();
}