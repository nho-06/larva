import {
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    addProductToCart,
    updateCartQuantity,
    removeCartItem,
    clearCart
} from "./cart.js";

import {
    renderProducts
} from "./product-list.js";

import {
    openScanner,
    closeScanner,
    clearScannerInstance
} from "./scanner.js";

import {
    openPaymentModal,
    closePaymentModal,
    confirmPayment,
    createPaymentQr,
    updatePaymentView
} from "./payment.js";

import {
    closeReceiptModal,
    printReceipt
} from "./receipt.js";

export function initializeSaleEvents() {
    /*
        Tìm kiếm sản phẩm.
    */
    elements.productSearchInput
        ?.addEventListener(
            "input",
            renderProducts
        );

    /*
        Lọc sản phẩm theo danh mục.
    */
    elements.saleCategoryFilter
        ?.addEventListener(
            "change",
            handleCategoryChange
        );

    /*
        Nhấn nút thêm sản phẩm vào giỏ.
    */
    elements.saleProductGrid
        ?.addEventListener(
            "click",
            handleProductGridClick
        );

    /*
        Các nút tăng, giảm, xóa trong giỏ hàng.
    */
    elements.cartItems
        ?.addEventListener(
            "click",
            handleCartClick
        );

    elements.clearCartButton
        ?.addEventListener(
            "click",
            clearCart
        );

    elements.openScannerButton
        ?.addEventListener(
            "click",
            openScanner
        );

    elements.openPaymentButton
        ?.addEventListener(
            "click",
            openPaymentModal
        );

    elements.confirmPaymentButton
        ?.addEventListener(
            "click",
            () => {
                confirmPayment("cash");
            }
        );

    elements.createQrButton
        ?.addEventListener(
            "click",
            createPaymentQr
        );

    elements.confirmReceivedButton
        ?.addEventListener(
            "click",
            () => {
                confirmPayment("transfer");
            }
        );

    elements.paidAmountInput
        ?.addEventListener(
            "input",
            updatePaymentView
        );

    document
        .querySelectorAll(
            'input[name="paymentMethod"]'
        )
        .forEach((input) => {
            input.addEventListener(
                "change",
                updatePaymentView
            );
        });

    document
        .querySelectorAll(
            "[data-close-scanner-modal]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                closeScanner
            );
        });

    document
        .querySelectorAll(
            "[data-close-payment-modal]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                closePaymentModal
            );
        });

    document
        .querySelectorAll(
            "[data-close-receipt-modal]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                closeReceiptModal
            );
        });

    elements.printReceiptButton
        ?.addEventListener(
            "click",
            printReceipt
        );

    /*
        Khi rời trang thì dừng camera.
    */
    window.addEventListener(
        "pagehide",
        clearScannerInstance
    );
}

function handleCategoryChange(event) {
    state.selectedCategoryId =
        String(
            event.target.value || ""
        );

    renderProducts();
}

function handleProductGridClick(event) {
    const button =
        event.target.closest(
            "[data-add-product]"
        );

    if (!button) {
        return;
    }

    const productId =
        button.dataset.addProduct;

    const product =
        state.products.find(
            (item) => {
                return (
                    String(item.id || "")
                    === String(productId || "")
                );
            }
        );

    if (!product) {
        return;
    }

    addProductToCart(product);
}

function handleCartClick(event) {
    const increaseButton =
        event.target.closest(
            "[data-increase]"
        );

    const decreaseButton =
        event.target.closest(
            "[data-decrease]"
        );

    const removeButton =
        event.target.closest(
            "[data-remove]"
        );

    if (increaseButton) {
        updateCartQuantity(
            increaseButton.dataset.increase,
            1
        );

        return;
    }

    if (decreaseButton) {
        updateCartQuantity(
            decreaseButton.dataset.decrease,
            -1
        );

        return;
    }

    if (removeButton) {
        removeCartItem(
            removeButton.dataset.remove
        );
    }
}