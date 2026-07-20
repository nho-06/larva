import {
    checkoutSale
} from "../../services/sale-service.js";

import {
    BANK_CONFIG,
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    getCartTotal,
    renderCart
} from "./cart.js";

import {
    getCartSubtotal,
    getDiscountAmount,
    getSelectedDiscount
} from "./discount.js";

import {
    renderReceipt,
    openReceiptModal
} from "./receipt.js";

import {
    formatMoney
} from "../../utils.js";

export function showPaymentError(message) {
    elements.paymentError.textContent =
        message;

    elements.paymentError
        .classList.remove("hidden");
}

export function hidePaymentError() {
    elements.paymentError.textContent =
        "";

    elements.paymentError
        .classList.add("hidden");
}

export function getSelectedPaymentMethod() {
    return (
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value
        || "cash"
    );
}

function generateTransferCode() {
    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    const hour =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minute =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const second =
        String(
            now.getSeconds()
        ).padStart(2, "0");

    return (
        "LARVA"
        + `${year}${month}${day}`
        + `${hour}${minute}${second}`
    );
}

export function resetPaymentQr() {
    state.transferCode =
        "";

    elements.paymentQrImage.src =
        "";

    elements.transferContent.textContent =
        "";

    elements.qrBankName.textContent =
        "";

    elements.qrAccountNumber.textContent =
        "";

    elements.qrAccountHolder.textContent =
        "";

    elements.qrAmount.textContent =
        "";

    elements.paymentQrBox
        .classList.add("hidden");
}

export function createPaymentQr() {
    hidePaymentError();

    const total =
        getCartTotal();

    if (total <= 0) {
        showPaymentError(
            "Giỏ hàng đang trống."
        );

        return;
    }

    if (
        !BANK_CONFIG.accountNumber
        || BANK_CONFIG.accountNumber
            === "NHAP_SO_TAI_KHOAN"
    ) {
        showPaymentError(
            "Bạn chưa nhập số tài khoản trong BANK_CONFIG."
        );

        return;
    }

    if (!BANK_CONFIG.bank) {
        showPaymentError(
            "Bạn chưa nhập mã ngân hàng trong BANK_CONFIG."
        );

        return;
    }

    const transferCode =
        generateTransferCode();

    const parameters =
        new URLSearchParams({
            acc:
                BANK_CONFIG.accountNumber,

            bank:
                BANK_CONFIG.bank,

            amount:
                String(
                    Math.round(total)
                ),

            des:
                transferCode
        });

    elements.paymentQrImage.src =
        `https://qr.sepay.vn/img?${parameters.toString()}`;

    elements.qrBankName.textContent =
        BANK_CONFIG.bank;

    elements.qrAccountNumber.textContent =
        BANK_CONFIG.accountNumber;

    elements.qrAccountHolder.textContent =
        BANK_CONFIG.accountHolder;

    elements.qrAmount.textContent =
        formatMoney(total);

    elements.transferContent.textContent =
        transferCode;

    elements.paymentQrBox
        .classList.remove("hidden");

    state.transferCode =
        transferCode;
}

export function updatePaymentView() {
    const total =
        getCartTotal();

    const method =
        getSelectedPaymentMethod();

    const paidAmount =
        Number(
            elements.paidAmountInput.value || 0
        );

    const changeAmount =
        method === "cash"
            ? Math.max(
                0,
                paidAmount - total
            )
            : 0;

    elements.paymentTotal.textContent =
        formatMoney(total);

    elements.changeAmount.textContent =
        formatMoney(changeAmount);

    elements.cashPaymentBox
        .classList.toggle(
            "hidden",
            method !== "cash"
        );

    elements.bankTransferBox
        .classList.toggle(
            "hidden",
            method !== "transfer"
        );

    elements.confirmPaymentButton
        .classList.toggle(
            "hidden",
            method === "transfer"
        );

    if (method !== "transfer") {
        resetPaymentQr();
    }

    hidePaymentError();
}

export function openPaymentModal() {
    if (state.cart.length === 0) {
        return;
    }

    const total =
        getCartTotal();

    resetPaymentQr();

    elements.paymentModal
        .classList.remove("hidden");

    elements.paymentTotal.textContent =
        formatMoney(total);

    elements.paidAmountInput.value =
        total;

    updatePaymentView();
}

export function closePaymentModal() {
    if (state.isPaying) {
        return;
    }

    elements.paymentModal
        .classList.add("hidden");

    resetPaymentQr();
    hidePaymentError();
}

export async function confirmPayment(
    forcedMethod = null
) {
    if (
        state.isPaying
        || state.cart.length === 0
    ) {
        return;
    }

    const totalAmount =
        getCartTotal();

    const paymentMethod =
        forcedMethod
        || getSelectedPaymentMethod();

    const paidAmount =
        paymentMethod === "cash"
            ? Number(
                elements.paidAmountInput.value || 0
            )
            : totalAmount;

    if (
        paymentMethod === "cash"
        && paidAmount < totalAmount
    ) {
        showPaymentError(
            "Số tiền khách đưa chưa đủ."
        );

        return;
    }

    if (
        paymentMethod === "transfer"
        && !state.transferCode
    ) {
        showPaymentError(
            "Hãy tạo mã QR trước khi xác nhận."
        );

        return;
    }

    state.isPaying =
        true;

    elements.confirmPaymentButton.disabled =
        true;

    elements.confirmReceivedButton.disabled =
        true;

    elements.confirmPaymentButton.textContent =
        "Đang thanh toán...";

    elements.confirmReceivedButton.textContent =
        "Đang lưu hóa đơn...";

    try {
        const subtotalAmount =
            getCartSubtotal();

        const discountAmount =
            getDiscountAmount(
                subtotalAmount
            );

        const selectedDiscount =
            getSelectedDiscount();

        const sale =
            await checkoutSale({
                items:
                    state.cart,

                paymentMethod,

                paidAmount,

                totalAmount,

                subtotalAmount,

                discountAmount,

                discountCode:
                    selectedDiscount?.code
                    || "",

                discountType:
                    selectedDiscount?.type
                    || "",

                discountValue:
                    Number(
                        selectedDiscount?.value
                        || 0
                    ),

                transferCode:
                    paymentMethod === "transfer"
                        ? state.transferCode
                        : ""
            });

        state.cart =
            [];

        state.selectedDiscountId =
            "";

        renderCart();

        elements.paymentModal
            .classList.add("hidden");

        resetPaymentQr();

        renderReceipt(sale);

        openReceiptModal();

    } catch (error) {
        console.error(
            "Lỗi thanh toán:",
            error
        );

        showPaymentError(
            error.message
            || "Không thể thanh toán."
        );

    } finally {
        state.isPaying =
            false;

        elements.confirmPaymentButton.disabled =
            false;

        elements.confirmReceivedButton.disabled =
            false;

        elements.confirmPaymentButton.textContent =
            "Xác nhận thanh toán";

        elements.confirmReceivedButton.textContent =
            "Đã nhận được tiền";
    }
}