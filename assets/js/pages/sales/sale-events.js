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
    clearCart,
    renderCart
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

import {
    addDiscountCode,
    toggleDiscount
} from "./discount.js";

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
        Các nút tăng, giảm, xóa
        trong giỏ hàng.
    */
    elements.cartItems
        ?.addEventListener(
            "click",
            handleCartClick
        );

    /*
        Xóa toàn bộ giỏ hàng.
    */
    elements.clearCartButton
        ?.addEventListener(
            "click",
            clearCart
        );

    /*
        Chọn hoặc bỏ chọn mã giảm giá.

        Danh sách mã có thể lướt ngang
        trên điện thoại.
    */
    elements.discountCodeList
        ?.addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        "[data-discount-id]"
                    );

                if (!button) {
                    return;
                }

                toggleDiscount(
                    button.dataset.discountId
                );

                renderCartAfterDiscountChange();
            }
        );

    /*
        Tự thêm mã giảm giá mới.
    */
    elements.addDiscountButton
        ?.addEventListener(
            "click",
            async () => {
                await addDiscountCode();

                renderCartAfterDiscountChange();
            }
        );

    /*
        Nhấn Enter tại ô giá trị giảm
        cũng có thể thêm mã.
    */
    elements.discountValueInput
        ?.addEventListener(
            "keydown",
            async (event) => {
                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                await addDiscountCode();

                renderCartAfterDiscountChange();
            }
        );

    /*
        Mở máy quét mã vạch.
    */
    elements.openScannerButton
        ?.addEventListener(
            "click",
            openScanner
        );

    /*
        Mở cửa sổ thanh toán.
    */
    elements.openPaymentButton
        ?.addEventListener(
            "click",
            openPaymentModal
        );

    /*
        Xác nhận thanh toán tiền mặt.
    */
    elements.confirmPaymentButton
        ?.addEventListener(
            "click",
            () => {
                confirmPayment(
                    "cash"
                );
            }
        );

    /*
        Tạo QR chuyển khoản.
    */
    elements.createQrButton
        ?.addEventListener(
            "click",
            createPaymentQr
        );

    /*
        Xác nhận đã nhận được
        tiền chuyển khoản.
    */
    elements.confirmReceivedButton
        ?.addEventListener(
            "click",
            () => {
                confirmPayment(
                    "transfer"
                );
            }
        );

    /*
        Tự tính tiền thừa
        khi nhập số tiền khách đưa.
    */
    elements.paidAmountInput
        ?.addEventListener(
            "input",
            updatePaymentView
        );

    /*
        Chuyển giữa tiền mặt
        và chuyển khoản.
    */
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

    /*
        Các nút đóng cửa sổ quét mã.
    */
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

    /*
        Các nút đóng cửa sổ thanh toán.
    */
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

    /*
        Các nút đóng hóa đơn.
    */
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

    /*
        In hóa đơn.
    */
    elements.printReceiptButton
        ?.addEventListener(
            "click",
            printReceipt
        );

    /*
        Khi rời trang thì dừng camera,
        tránh camera vẫn chạy ngầm.
    */
    window.addEventListener(
        "pagehide",
        clearScannerInstance
    );
}

/*
    Khi đổi danh mục sản phẩm.
*/
function handleCategoryChange(
    event
) {
    state.selectedCategoryId =
        String(
            event.target.value || ""
        );

    renderProducts();
}

/*
    Nhấn nút thêm sản phẩm
    từ danh sách sản phẩm.
*/
function handleProductGridClick(
    event
) {
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
                    String(
                        item.id || ""
                    ) ===
                    String(
                        productId || ""
                    )
                );
            }
        );

    if (!product) {
        return;
    }

    addProductToCart(
        product
    );
}

/*
    Xử lý tăng, giảm
    hoặc xóa sản phẩm trong giỏ.
*/
function handleCartClick(
    event
) {
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

/*
    Sau khi chọn hoặc tạo mã giảm giá,
    cập nhật lại cả giỏ hàng
    và cửa sổ thanh toán.
*/
function renderCartAfterDiscountChange() {
    renderCart();

    updatePaymentView();
}