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
    renderCart,
    showSaleMessage
} from "./cart.js";

import {
    renderProducts
} from "./product-list.js";

import {
    openScanner,
    closeScanner,
    clearScannerInstance,
    applyCameraZoom,
    resetCameraZoom
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
    toggleDiscount
} from "./discount.js";

import {
    initializeBillManager,
    addNewBill,
    switchActiveBill,
    renameActiveBill,
    deleteActiveBill,
    getActiveBill,
    getBillItemCount,
    getBillSubtotal,
    saveBillsToStorage
} from "./bill-manager.js";

import {
    escapeHtml,
    formatMoney
} from "../../utils.js";


/* =========================================================
   KHỞI TẠO SỰ KIỆN TRANG BÁN HÀNG
========================================================= */

export function initializeSaleEvents() {
    initializeBillManager();

    renderBillTabs();

    renderCart();

    elements.productSearchInput
        ?.addEventListener(
            "input",
            renderProducts
        );

    elements.saleCategoryFilter
        ?.addEventListener(
            "change",
            handleCategoryChange
        );

    elements.saleProductGrid
        ?.addEventListener(
            "click",
            handleProductGridClick
        );

    elements.cartItems
        ?.addEventListener(
            "click",
            handleCartClick
        );

    elements.clearCartButton
        ?.addEventListener(
            "click",
            handleClearCart
        );

    elements.discountCodeList
        ?.addEventListener(
            "click",
            handleDiscountClick
        );

    elements.addBillButton
        ?.addEventListener(
            "click",
            handleAddBill
        );

    elements.billTabs
        ?.addEventListener(
            "click",
            handleBillTabsClick
        );

    elements.renameBillButton
        ?.addEventListener(
            "click",
            openRenameBillModal
        );

    elements.saveBillNameButton
        ?.addEventListener(
            "click",
            handleSaveBillName
        );

    elements.billNameInput
        ?.addEventListener(
            "keydown",
            handleBillNameKeydown
        );

    /*
        Nút Xóa bill chỉ mở modal xác nhận.
        Không dùng window.confirm nữa.
    */
    elements.deleteBillButton
        ?.addEventListener(
            "click",
            openDeleteBillModal
        );

    /*
        Nút xác nhận xóa trong modal.
    */
    elements.confirmDeleteBillButton
        ?.addEventListener(
            "click",
            handleConfirmDeleteBill
        );

    document
        .querySelectorAll(
            "[data-close-rename-bill-modal]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeRenameBillModal
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-delete-bill-modal]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeDeleteBillModal
                );
            }
        );

    elements.openScannerButton
        ?.addEventListener(
            "click",
            openScanner
        );

    /*
        Thanh zoom của camera.
    */
    elements.cameraZoomInput
        ?.addEventListener(
            "input",
            (event) => {
                applyCameraZoom(
                    event.target.value
                );
            }
        );

    /*
        Nút đưa camera về 1x.
    */
    elements.resetCameraZoomButton
        ?.addEventListener(
            "click",
            resetCameraZoom
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
                confirmPayment(
                    "cash"
                );
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
                confirmPayment(
                    "transfer"
                );
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
        .forEach(
            (input) => {
                input.addEventListener(
                    "change",
                    updatePaymentView
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-scanner-modal]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeScanner
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-payment-modal]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closePaymentModal
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-receipt-modal]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeReceiptModal
                );
            }
        );

    elements.printReceiptButton
        ?.addEventListener(
            "click",
            printReceipt
        );

    window.addEventListener(
        "larva:bill-changed",
        handleBillChanged
    );

    window.addEventListener(
        "pagehide",
        handlePageHide
    );

    document.addEventListener(
        "keydown",
        handleGlobalKeydown
    );
}


/* =========================================================
   HIỂN THỊ DANH SÁCH BILL
========================================================= */

export function renderBillTabs() {
    if (!elements.billTabs) {
        return;
    }

    if (
        !Array.isArray(
            state.bills
        )
        ||
        state.bills.length === 0
    ) {
        initializeBillManager();
    }

    elements.billTabs.innerHTML =
        state.bills
            .map(
                (bill) => {
                    const isActive =
                        bill.id ===
                        state.activeBillId;

                    const itemCount =
                        getBillItemCount(
                            bill
                        );

                    const subtotal =
                        getBillSubtotal(
                            bill
                        );

                    return `
                        <button
                            class="bill-tab ${
                                isActive
                                    ? "active"
                                    : ""
                            }"
                            type="button"
                            data-bill-id="${escapeHtml(
                                bill.id
                            )}"
                            aria-pressed="${isActive}"
                            title="Chuyển sang ${escapeHtml(
                                bill.name
                            )}"
                        >
                            <span class="bill-tab-main">

                                <strong class="bill-tab-name">
                                    ${escapeHtml(
                                        bill.name
                                    )}
                                </strong>

                                <small class="bill-tab-info">
                                    ${
                                        itemCount > 0
                                            ? `${itemCount} sản phẩm`
                                            : "Bill trống"
                                    }
                                </small>

                            </span>

                            <span class="bill-tab-total">
                                ${formatMoney(
                                    subtotal
                                )}
                            </span>
                        </button>
                    `;
                }
            )
            .join("");

    const activeBill =
        getActiveBill();

    if (
        elements.activeBillName
    ) {
        elements.activeBillName.textContent =
            activeBill?.name ||
            "Bill";
    }

    if (
        elements.paymentBillName
    ) {
        elements.paymentBillName.textContent =
            activeBill?.name ||
            "Bill";
    }

    if (
        elements.deleteBillButton
    ) {
        const onlyOneEmptyBill =
            state.bills.length === 1
            &&
            state.cart.length === 0;

        elements.deleteBillButton.disabled =
            onlyOneEmptyBill;
    }

    if (
        elements.addBillButton
    ) {
        elements.addBillButton.disabled =
            state.bills.length >= 20;
    }
}


/* =========================================================
   TẠO BILL MỚI
========================================================= */

function handleAddBill() {
    closePaymentModal();

    closeRenameBillModal();

    closeDeleteBillModal();

    const result =
        addNewBill();

    if (!result.success) {
        showSaleMessage(
            result.message,
            "error"
        );

        return;
    }

    resetPaymentForm();

    refreshBillInterface();

    scrollActiveBillIntoView();

    showSaleMessage(
        `Đã tạo ${result.bill.name}.`
    );
}


/* =========================================================
   CHUYỂN SANG BILL KHÁC
========================================================= */

function handleBillTabsClick(
    event
) {
    const billButton =
        event.target.closest(
            "[data-bill-id]"
        );

    if (!billButton) {
        return;
    }

    const billId =
        String(
            billButton.dataset.billId ||
            ""
        );

    if (
        !billId
        ||
        billId ===
        state.activeBillId
    ) {
        return;
    }

    closePaymentModal();

    closeRenameBillModal();

    closeDeleteBillModal();

    const result =
        switchActiveBill(
            billId
        );

    if (!result.success) {
        showSaleMessage(
            result.message,
            "error"
        );

        return;
    }

    resetPaymentForm();

    refreshBillInterface();

    scrollActiveBillIntoView();
}
/* =========================================================
   MỞ MODAL ĐỔI TÊN BILL
========================================================= */

function openRenameBillModal() {
    const activeBill =
        getActiveBill();

    if (
        !activeBill
        ||
        !elements.renameBillModal
    ) {
        return;
    }

    closeDeleteBillModal();

    hideRenameBillError();

    elements.renameBillModal
        .classList.remove(
            "hidden"
        );

    document.body.classList.add(
        "modal-open"
    );

    if (
        elements.billNameInput
    ) {
        elements.billNameInput.value =
            activeBill.name ||
            "";

        window.setTimeout(
            () => {
                elements.billNameInput
                    ?.focus();

                elements.billNameInput
                    ?.select();
            },
            50
        );
    }
}


/* =========================================================
   ĐÓNG MODAL ĐỔI TÊN BILL
========================================================= */

function closeRenameBillModal() {
    elements.renameBillModal
        ?.classList.add(
            "hidden"
        );

    hideRenameBillError();

    updateBodyModalClass();
}


/* =========================================================
   LƯU TÊN BILL
========================================================= */

function handleSaveBillName() {
    const newName =
        String(
            elements.billNameInput
                ?.value ||
            ""
        ).trim();

    const result =
        renameActiveBill(
            newName
        );

    if (!result.success) {
        showRenameBillError(
            result.message
        );

        return;
    }

    closeRenameBillModal();

    refreshBillInterface();

    showSaleMessage(
        "Đã đổi tên bill."
    );
}


/* =========================================================
   PHÍM ENTER VÀ ESCAPE TRONG Ô TÊN BILL
========================================================= */

function handleBillNameKeydown(
    event
) {
    if (
        event.key ===
        "Enter"
    ) {
        event.preventDefault();

        handleSaveBillName();

        return;
    }

    if (
        event.key ===
        "Escape"
    ) {
        event.preventDefault();

        closeRenameBillModal();
    }
}


/* =========================================================
   HIỂN THỊ LỖI ĐỔI TÊN
========================================================= */

function showRenameBillError(
    message
) {
    if (
        !elements.renameBillError
    ) {
        return;
    }

    elements.renameBillError.textContent =
        message;

    elements.renameBillError
        .classList.remove(
            "hidden"
        );
}


/* =========================================================
   ẨN LỖI ĐỔI TÊN
========================================================= */

function hideRenameBillError() {
    if (
        !elements.renameBillError
    ) {
        return;
    }

    elements.renameBillError.textContent =
        "";

    elements.renameBillError
        .classList.add(
            "hidden"
        );
}


/* =========================================================
   MỞ MODAL XÁC NHẬN XÓA BILL
========================================================= */

function openDeleteBillModal() {
    const activeBill =
        getActiveBill();

    if (
        !activeBill
        ||
        !elements.deleteBillModal
    ) {
        return;
    }

    if (
        state.bills.length === 1
        &&
        state.cart.length === 0
    ) {
        showSaleMessage(
            "Phải giữ lại ít nhất một bill.",
            "error"
        );

        return;
    }

    closeRenameBillModal();

    const itemCount =
        getBillItemCount(
            activeBill
        );

    if (
        elements.deleteBillModalTitle
    ) {
        elements.deleteBillModalTitle.textContent =
            `Xóa ${activeBill.name}?`;
    }

    if (
        elements.deleteBillModalMessage
    ) {
        if (itemCount > 0) {
            elements.deleteBillModalMessage.textContent =
                `Bill này đang có ${itemCount} sản phẩm. Toàn bộ sản phẩm đang giữ sẽ bị xóa.`;
        } else {
            elements.deleteBillModalMessage.textContent =
                "Bill này sẽ bị xóa khỏi danh sách đang chờ.";
        }
    }

    elements.deleteBillModal.dataset.billId =
        activeBill.id;

    elements.deleteBillModal
        .classList.remove(
            "hidden"
        );

    document.body.classList.add(
        "modal-open"
    );

    window.setTimeout(
        () => {
            elements.confirmDeleteBillButton
                ?.focus();
        },
        50
    );
}


/* =========================================================
   ĐÓNG MODAL XÁC NHẬN XÓA BILL
========================================================= */

function closeDeleteBillModal() {
    if (
        elements.deleteBillModal
    ) {
        elements.deleteBillModal
            .classList.add(
                "hidden"
            );

        delete elements.deleteBillModal
            .dataset.billId;
    }

    updateBodyModalClass();
}


/* =========================================================
   XÁC NHẬN XÓA BILL
========================================================= */

function handleConfirmDeleteBill() {
    const billId =
        String(
            elements.deleteBillModal
                ?.dataset.billId ||
            ""
        );

    if (!billId) {
        closeDeleteBillModal();

        showSaleMessage(
            "Không tìm thấy bill cần xóa.",
            "error"
        );

        return;
    }

    if (
        state.activeBillId !==
        billId
    ) {
        const switchResult =
            switchActiveBill(
                billId
            );

        if (!switchResult.success) {
            closeDeleteBillModal();

            showSaleMessage(
                "Bill cần xóa không còn tồn tại.",
                "error"
            );

            return;
        }
    }

    const activeBill =
        getActiveBill();

    const deletedBillName =
        activeBill?.name ||
        "bill";

    if (
        elements.confirmDeleteBillButton
    ) {
        elements.confirmDeleteBillButton.disabled =
            true;

        elements.confirmDeleteBillButton.textContent =
            "Đang xóa...";
    }

    const result =
        deleteActiveBill();

    if (
        elements.confirmDeleteBillButton
    ) {
        elements.confirmDeleteBillButton.disabled =
            false;

        elements.confirmDeleteBillButton.textContent =
            "Xóa bill";
    }

    if (!result.success) {
        showSaleMessage(
            result.message,
            "error"
        );

        return;
    }

    closeDeleteBillModal();

    resetPaymentForm();

    refreshBillInterface();

    saveBillsToStorage();

    scrollActiveBillIntoView();

    showSaleMessage(
        `Đã xóa ${deletedBillName}.`
    );
}
/* =========================================================
   THAY ĐỔI DANH MỤC
========================================================= */

function handleCategoryChange(
    event
) {
    state.selectedCategoryId =
        String(
            event?.target?.value ||
            ""
        ).trim();

    renderProducts();
}


/* =========================================================
   NHẤN SẢN PHẨM ĐỂ THÊM VÀO GIỎ
========================================================= */

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
        String(
            button.dataset.addProduct ||
            ""
        ).trim();

    if (!productId) {
        return;
    }

    const product =
        state.products.find(
            (item) => {
                return (
                    String(
                        item.id ||
                        ""
                    ) ===
                    productId
                );
            }
        );

    if (!product) {
        showSaleMessage(
            "Không tìm thấy sản phẩm.",
            "error"
        );

        return;
    }

    const added =
        addProductToCart(
            product
        );

    if (!added) {
        return;
    }

    saveBillsToStorage();

    refreshBillInterface();

    showSaleMessage(
        `Đã thêm ${product.name} vào giỏ.`
    );
}


/* =========================================================
   TĂNG, GIẢM VÀ XÓA SẢN PHẨM TRONG GIỎ
========================================================= */

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
        const productId =
            String(
                increaseButton.dataset.increase ||
                ""
            );

        if (!productId) {
            return;
        }

        updateCartQuantity(
            productId,
            1
        );

        saveBillsToStorage();

        refreshBillInterface();

        return;
    }

    if (decreaseButton) {
        const productId =
            String(
                decreaseButton.dataset.decrease ||
                ""
            );

        if (!productId) {
            return;
        }

        updateCartQuantity(
            productId,
            -1
        );

        saveBillsToStorage();

        refreshBillInterface();

        return;
    }

    if (removeButton) {
        const productId =
            String(
                removeButton.dataset.remove ||
                ""
            );

        if (!productId) {
            return;
        }

        removeCartItem(
            productId
        );

        saveBillsToStorage();

        refreshBillInterface();
    }
}


/* =========================================================
   XÓA TOÀN BỘ GIỎ HÀNG CỦA BILL ĐANG CHỌN
========================================================= */

function handleClearCart() {
    if (
        state.cart.length === 0
    ) {
        showSaleMessage(
            "Bill hiện tại chưa có sản phẩm.",
            "error"
        );

        return;
    }

    clearCart();

    saveBillsToStorage();

    refreshBillInterface();

    showSaleMessage(
        "Đã xóa sản phẩm trong bill hiện tại."
    );
}


/* =========================================================
   CHỌN HOẶC BỎ MÃ GIẢM GIÁ
========================================================= */

function handleDiscountClick(
    event
) {
    const button =
        event.target.closest(
            "[data-discount-id]"
        );

    if (!button) {
        return;
    }

    const discountId =
        String(
            button.dataset.discountId ||
            ""
        ).trim();

    if (!discountId) {
        return;
    }

    toggleDiscount(
        discountId
    );

    saveBillsToStorage();

    refreshBillInterface();
}


/* =========================================================
   BILL ĐƯỢC THAY ĐỔI TỪ MODULE KHÁC
========================================================= */

function handleBillChanged() {
    renderBillTabs();

    renderCart();

    updatePaymentView();
}


/* =========================================================
   LÀM MỚI TOÀN BỘ GIAO DIỆN BILL
========================================================= */

function refreshBillInterface() {
    renderBillTabs();

    renderCart();

    renderProducts();

    updatePaymentView();
}


/* =========================================================
   CUỘN BILL ĐANG CHỌN VÀO VÙNG NHÌN
========================================================= */

function scrollActiveBillIntoView() {
    window.requestAnimationFrame(
        () => {
            const activeBillTab =
                elements.billTabs
                    ?.querySelector(
                        ".bill-tab.active"
                    );

            activeBillTab
                ?.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "nearest",

                    inline:
                        "center"
                });
        }
    );
}


/* =========================================================
   ĐẶT LẠI FORM THANH TOÁN
========================================================= */

function resetPaymentForm() {
    if (
        elements.paidAmountInput
    ) {
        elements.paidAmountInput.value =
            "";
    }

    if (
        elements.changeAmount
    ) {
        elements.changeAmount.textContent =
            formatMoney(
                0
            );
    }

    if (
        elements.paymentError
    ) {
        elements.paymentError.textContent =
            "";

        elements.paymentError
            .classList.add(
                "hidden"
            );
    }

    if (
        elements.paymentQrBox
    ) {
        elements.paymentQrBox
            .classList.add(
                "hidden"
            );
    }

    if (
        elements.paymentQrImage
    ) {
        elements.paymentQrImage.removeAttribute(
            "src"
        );
    }

    if (
        elements.createQrButton
    ) {
        elements.createQrButton.disabled =
            false;

        elements.createQrButton.textContent =
            "Tạo mã QR thanh toán";
    }

    if (
        elements.confirmReceivedButton
    ) {
        elements.confirmReceivedButton.disabled =
            false;

        elements.confirmReceivedButton.textContent =
            "Đã nhận được tiền";
    }

    const cashPaymentInput =
        document.querySelector(
            'input[name="paymentMethod"][value="cash"]'
        );

    if (
        cashPaymentInput
    ) {
        cashPaymentInput.checked =
            true;
    }

    updatePaymentView();
}
/* =========================================================
   ĐÓNG MODAL BẰNG PHÍM ESCAPE
========================================================= */

function handleGlobalKeydown(
    event
) {
    if (
        event.key !==
        "Escape"
    ) {
        return;
    }

    if (
        elements.scannerModal
        &&
        !elements.scannerModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeScanner();

        return;
    }

    if (
        elements.paymentModal
        &&
        !elements.paymentModal
            .classList.contains(
                "hidden"
            )
    ) {
        closePaymentModal();

        return;
    }

    if (
        elements.receiptModal
        &&
        !elements.receiptModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeReceiptModal();

        return;
    }

    if (
        elements.deleteBillModal
        &&
        !elements.deleteBillModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeDeleteBillModal();

        return;
    }

    if (
        elements.renameBillModal
        &&
        !elements.renameBillModal
            .classList.contains(
                "hidden"
            )
    ) {
        closeRenameBillModal();
    }
}


/* =========================================================
   CẬP NHẬT TRẠNG THÁI MODAL CỦA BODY
========================================================= */

function updateBodyModalClass() {
    const openedModal =
        document.querySelector(
            ".modal:not(.hidden)"
        );

    document.body.classList.toggle(
        "modal-open",
        Boolean(
            openedModal
        )
    );
}


/* =========================================================
   RỜI KHỎI TRANG
========================================================= */

function handlePageHide() {
    /*
        Lưu bill lần cuối trước khi rời trang.
    */
    saveBillsToStorage();

    /*
        Dừng camera để tránh camera tiếp tục chạy ngầm.
    */
    clearScannerInstance();
}