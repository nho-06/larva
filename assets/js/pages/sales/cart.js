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

import {
    getCartSubtotal,
    getDiscountAmount,
    getFinalTotal,
    renderDiscountCodes
} from "./discount.js";

import {
    getActiveBill,
    saveBillsToStorage
} from "./bill-manager.js";


/* =========================================================
   TỔNG TIỀN CỦA BILL ĐANG MỞ
========================================================= */

export function getCartTotal() {
    return getFinalTotal();
}


/* =========================================================
   TỔNG SỐ LƯỢNG SẢN PHẨM CỦA BILL ĐANG MỞ
========================================================= */

export function getCartQuantity() {
    return state.cart.reduce(
        (
            total,
            item
        ) => {
            return (
                total +
                Number(
                    item.quantity || 0
                )
            );
        },
        0
    );
}


/* =========================================================
   HIỂN THỊ THÔNG BÁO BÁN HÀNG
========================================================= */

export function showSaleMessage(
    message,
    type = "success"
) {
    if (!elements.saleMessage) {
        return;
    }

    elements.saleMessage.textContent =
        message;

    elements.saleMessage.className =
        `pos-message ${type}`;

    window.clearTimeout(
        showSaleMessage.timer
    );

    showSaleMessage.timer =
        window.setTimeout(
            () => {
                elements.saleMessage
                    ?.classList.add(
                        "hidden"
                    );
            },
            2200
        );
}


/* =========================================================
   ĐÁNH DẤU BILL VỪA ĐƯỢC CẬP NHẬT
========================================================= */

function updateActiveBillTime() {
    const activeBill =
        getActiveBill();

    if (!activeBill) {
        return;
    }

    activeBill.updatedAt =
        new Date().toISOString();

    saveBillsToStorage();
}


/* =========================================================
   HIỂN THỊ GIỎ HÀNG CỦA BILL ĐANG MỞ
========================================================= */

export function renderCart() {
    const activeBill =
        getActiveBill();

    const subtotal =
        getCartSubtotal();

    const discountAmount =
        getDiscountAmount(
            subtotal
        );

    const total =
        getFinalTotal();

    const quantity =
        getCartQuantity();

    /*
        Hiển thị tên bill đang chọn.
    */
    if (
        elements.activeBillName
    ) {
        elements.activeBillName.textContent =
            activeBill?.name ||
            "Bill";
    }

    /*
        Hiển thị tên bill trong
        cửa sổ thanh toán.
    */
    if (
        elements.paymentBillName
    ) {
        elements.paymentBillName.textContent =
            activeBill?.name ||
            "Bill";
    }

    if (
        elements.cartItems
    ) {
        elements.cartItems.innerHTML =
            state.cart
                .map(
                    (item) => {
                        const image =
                            item.image ||
                            placeholderImage();

                        const lineTotal =
                            Number(
                                item.price || 0
                            ) *
                            Number(
                                item.quantity || 0
                            );

                        return `
                            <div class="cart-item">

                                <img
                                    class="cart-item-image"
                                    src="${escapeHtml(
                                        image
                                    )}"
                                    alt="${escapeHtml(
                                        item.name
                                    )}"
                                    onerror="this.src='${placeholderImage()}'"
                                >

                                <div class="cart-item-info">

                                    <strong>
                                        ${escapeHtml(
                                            item.name
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            item.sku ||
                                            item.barcode ||
                                            ""
                                        )}
                                    </small>

                                    <span>
                                        ${formatMoney(
                                            item.price
                                        )}
                                    </span>

                                </div>

                                <div class="cart-item-actions">

                                    <div class="quantity-control">

                                        <button
                                            type="button"
                                            data-decrease="${escapeHtml(
                                                item.productId
                                            )}"
                                            aria-label="Giảm số lượng"
                                        >
                                            −
                                        </button>

                                        <span>
                                            ${Number(
                                                item.quantity || 0
                                            )}
                                        </span>

                                        <button
                                            type="button"
                                            data-increase="${escapeHtml(
                                                item.productId
                                            )}"
                                            aria-label="Tăng số lượng"
                                        >
                                            +
                                        </button>

                                    </div>

                                    <strong>
                                        ${formatMoney(
                                            lineTotal
                                        )}
                                    </strong>

                                    <button
                                        class="remove-cart-item"
                                        type="button"
                                        data-remove="${escapeHtml(
                                            item.productId
                                        )}"
                                    >
                                        Xóa
                                    </button>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    elements.emptyCartState
        ?.classList.toggle(
            "hidden",
            state.cart.length > 0
        );

    if (
        elements.cartCount
    ) {
        elements.cartCount.textContent =
            String(quantity);
    }

    if (
        elements.cartSubtotal
    ) {
        elements.cartSubtotal.textContent =
            formatMoney(
                subtotal
            );
    }

    if (
        elements.cartDiscount
    ) {
        elements.cartDiscount.textContent =
            `− ${formatMoney(
                discountAmount
            )}`;
    }

    if (
        elements.cartTotal
    ) {
        elements.cartTotal.textContent =
            formatMoney(
                total
            );
    }

    /*
        Mã giảm giá được hiển thị
        theo bill đang mở.
    */
    renderDiscountCodes();

    if (
        elements.openPaymentButton
    ) {
        elements.openPaymentButton.disabled =
            state.cart.length === 0;
    }

    if (
        elements.clearCartButton
    ) {
        elements.clearCartButton.disabled =
            state.cart.length === 0;
    }
}


/* =========================================================
   THÊM SẢN PHẨM VÀO BILL ĐANG MỞ
========================================================= */

export function addProductToCart(
    product,
    fromScanner = false
) {
    if (!product) {
        showSaleMessage(
            "Không tìm thấy sản phẩm.",
            "error"
        );

        return false;
    }

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
                return (
                    item.productId ===
                    product.id
                );
            }
        );

    const currentQuantity =
        Number(
            currentItem?.quantity || 0
        );

    if (
        currentQuantity >=
        stock
    ) {
        showSaleMessage(
            `Không thể thêm. Sản phẩm chỉ còn ${stock}.`,
            "error"
        );

        return false;
    }

    if (currentItem) {
        currentItem.quantity =
            currentQuantity + 1;

        currentItem.stock =
            stock;
    } else {
        state.cart.push({
            productId:
                product.id,

            name:
                product.name ||
                "Sản phẩm",

            sku:
                product.sku ||
                "",

            barcode:
                product.barcode ||
                "",

            image:
                product.image ||
                "",

            price:
                Number(
                    product.salePrice || 0
                ),

            quantity:
                1,

            stock
        });
    }

    /*
        Lưu lại đúng bill đang mở.
    */
    updateActiveBillTime();

    renderCart();

    showSaleMessage(
        fromScanner
            ? `Đã quét: ${product.name}`
            : `Đã thêm: ${product.name}`
    );

    return true;
}


/* =========================================================
   TĂNG HOẶC GIẢM SỐ LƯỢNG
========================================================= */

export function updateCartQuantity(
    productId,
    change
) {
    const item =
        state.cart.find(
            (cartItem) => {
                return (
                    cartItem.productId ===
                    productId
                );
            }
        );

    if (!item) {
        return;
    }

    const product =
        state.products.find(
            (currentProduct) => {
                return (
                    currentProduct.id ===
                    productId
                );
            }
        );

    const currentStock =
        Number(
            product?.quantity ||
            item.stock ||
            0
        );

    const nextQuantity =
        Number(
            item.quantity
        ) +
        Number(
            change
        );

    if (
        nextQuantity <= 0
    ) {
        state.cart =
            state.cart.filter(
                (cartItem) => {
                    return (
                        cartItem.productId !==
                        productId
                    );
                }
            );
    } else if (
        nextQuantity >
        currentStock
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

    updateActiveBillTime();

    renderCart();
}


/* =========================================================
   XÓA MỘT SẢN PHẨM KHỎI BILL
========================================================= */

export function removeCartItem(
    productId
) {
    state.cart =
        state.cart.filter(
            (item) => {
                return (
                    item.productId !==
                    productId
                );
            }
        );

    updateActiveBillTime();

    renderCart();
}


/* =========================================================
   XÓA TOÀN BỘ SẢN PHẨM TRONG BILL ĐANG MỞ
========================================================= */

export function clearCart() {
    if (
        state.cart.length === 0
    ) {
        return;
    }

    const activeBill =
        getActiveBill();

    const accepted =
        window.confirm(
            `Xóa toàn bộ sản phẩm trong "${activeBill?.name || "bill này"}"?`
        );

    if (!accepted) {
        return;
    }

    /*
        Chỉ xóa giỏ hàng của bill đang mở.
        Những bill khác không bị ảnh hưởng.
    */
    state.cart =
        [];

    /*
        Khi xóa toàn bộ giỏ,
        bỏ mã giảm giá của bill này.
    */
    state.selectedDiscountId =
        "";

    /*
        Xóa nội dung chuyển khoản cũ
        của bill này.
    */
    state.transferCode =
        "";

    updateActiveBillTime();

    renderCart();

    showSaleMessage(
        `Đã xóa sản phẩm trong ${activeBill?.name || "bill"}.`
    );
}