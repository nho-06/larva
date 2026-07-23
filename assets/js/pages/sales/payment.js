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
    completeActiveBill,
    getActiveBill,
    saveBillsToStorage
} from "./bill-manager.js";

import {
    formatMoney
} from "../../utils.js";


/* =========================================================
   HIỂN THỊ LỖI THANH TOÁN
========================================================= */

export function showPaymentError(
    message
) {
    if (
        !elements.paymentError
    ) {
        return;
    }

    elements.paymentError.textContent =
        message;

    elements.paymentError
        .classList.remove(
            "hidden"
        );
}


/* =========================================================
   ẨN LỖI THANH TOÁN
========================================================= */

export function hidePaymentError() {
    if (
        !elements.paymentError
    ) {
        return;
    }

    elements.paymentError.textContent =
        "";

    elements.paymentError
        .classList.add(
            "hidden"
        );
}


/* =========================================================
   LẤY PHƯƠNG THỨC THANH TOÁN ĐANG CHỌN
========================================================= */

export function getSelectedPaymentMethod() {
    return (
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value ||
        "cash"
    );
}


/* =========================================================
   TẠO NỘI DUNG CHUYỂN KHOẢN
========================================================= */

function generateTransferCode() {
    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    const hour =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );

    const minute =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );

    const second =
        String(
            now.getSeconds()
        ).padStart(
            2,
            "0"
        );

    const random =
        Math.floor(
            100 +
            Math.random() * 900
        );

    return (
        "LARVA" +
        `${year}${month}${day}` +
        `${hour}${minute}${second}` +
        random
    );
}


/* =========================================================
   ĐẶT LẠI MÃ QR
========================================================= */

export function resetPaymentQr(
    clearTransferCode = true
) {
    if (clearTransferCode) {
        /*
            Chỉ xóa mã chuyển khoản
            của bill đang mở.
        */
        state.transferCode =
            "";

        saveBillsToStorage();
    }

    if (
        elements.paymentQrImage
    ) {
        elements.paymentQrImage.src =
            "";
    }

    if (
        elements.transferContent
    ) {
        elements.transferContent.textContent =
            "";
    }

    if (
        elements.qrBankName
    ) {
        elements.qrBankName.textContent =
            "";
    }

    if (
        elements.qrAccountNumber
    ) {
        elements.qrAccountNumber.textContent =
            "";
    }

    if (
        elements.qrAccountHolder
    ) {
        elements.qrAccountHolder.textContent =
            "";
    }

    if (
        elements.qrAmount
    ) {
        elements.qrAmount.textContent =
            "";
    }

    elements.paymentQrBox
        ?.classList.add(
            "hidden"
        );
}


/* =========================================================
   TẠO QR THANH TOÁN CHO BILL ĐANG MỞ
========================================================= */

export function createPaymentQr() {
    hidePaymentError();

    const activeBill =
        getActiveBill();

    const total =
        getCartTotal();

    if (
        !activeBill ||
        state.cart.length === 0 ||
        total <= 0
    ) {
        showPaymentError(
            "Bill đang trống."
        );

        return;
    }

    if (
        !BANK_CONFIG.accountNumber ||
        BANK_CONFIG.accountNumber ===
        "NHAP_SO_TAI_KHOAN"
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
                    Math.round(
                        total
                    )
                ),

            des:
                transferCode
        });

    if (
        elements.paymentQrImage
    ) {
        elements.paymentQrImage.src =
            `https://qr.sepay.vn/img?${parameters.toString()}`;
    }

    if (
        elements.qrBankName
    ) {
        elements.qrBankName.textContent =
            BANK_CONFIG.bank;
    }

    if (
        elements.qrAccountNumber
    ) {
        elements.qrAccountNumber.textContent =
            BANK_CONFIG.accountNumber;
    }

    if (
        elements.qrAccountHolder
    ) {
        elements.qrAccountHolder.textContent =
            BANK_CONFIG.accountHolder;
    }

    if (
        elements.qrAmount
    ) {
        elements.qrAmount.textContent =
            formatMoney(
                total
            );
    }

    if (
        elements.transferContent
    ) {
        elements.transferContent.textContent =
            transferCode;
    }

    elements.paymentQrBox
        ?.classList.remove(
            "hidden"
        );

    /*
        Lưu mã chuyển khoản riêng
        vào bill đang mở.
    */
    state.transferCode =
        transferCode;

    saveBillsToStorage();
}


/* =========================================================
   CẬP NHẬT GIAO DIỆN THANH TOÁN
========================================================= */

export function updatePaymentView() {
    const total =
        getCartTotal();

    const method =
        getSelectedPaymentMethod();

    const paidAmount =
        Number(
            elements.paidAmountInput
                ?.value ||
            0
        );

    const changeAmount =
        method === "cash"
            ? Math.max(
                0,
                paidAmount - total
            )
            : 0;

    if (
        elements.paymentTotal
    ) {
        elements.paymentTotal.textContent =
            formatMoney(
                total
            );
    }

    if (
        elements.changeAmount
    ) {
        elements.changeAmount.textContent =
            formatMoney(
                changeAmount
            );
    }

    elements.cashPaymentBox
        ?.classList.toggle(
            "hidden",
            method !== "cash"
        );

    elements.bankTransferBox
        ?.classList.toggle(
            "hidden",
            method !== "transfer"
        );

    elements.confirmPaymentButton
        ?.classList.toggle(
            "hidden",
            method === "transfer"
        );

    /*
        Nếu chuyển về tiền mặt,
        xóa QR và mã chuyển khoản
        của bill hiện tại.
    */
    if (
        method !== "transfer"
    ) {
        resetPaymentQr();
    }

    hidePaymentError();
}


/* =========================================================
   MỞ MODAL THANH TOÁN
========================================================= */

export function openPaymentModal() {
    const activeBill =
        getActiveBill();

    if (
        !activeBill ||
        state.cart.length === 0
    ) {
        return;
    }

    const total =
        getCartTotal();

    /*
        Mỗi lần mở thanh toán sẽ tạo QR mới
        nếu khách chọn chuyển khoản.
    */
    resetPaymentQr();

    elements.paymentModal
        ?.classList.remove(
            "hidden"
        );

    document.body.classList.add(
        "modal-open"
    );

    if (
        elements.paymentBillName
    ) {
        elements.paymentBillName.textContent =
            activeBill.name ||
            "Bill";
    }

    if (
        elements.paymentTotal
    ) {
        elements.paymentTotal.textContent =
            formatMoney(
                total
            );
    }

    if (
        elements.paidAmountInput
    ) {
        elements.paidAmountInput.value =
            total;
    }

    updatePaymentView();
}


/* =========================================================
   ĐÓNG MODAL THANH TOÁN
========================================================= */

export function closePaymentModal(
    forceClose = false
) {
    if (
        state.isPaying
        &&
        !forceClose
    ) {
        return;
    }

    elements.paymentModal
        ?.classList.add(
            "hidden"
        );

    resetPaymentQr();

    hidePaymentError();

    const hasOpenModal =
        document.querySelector(
            ".modal:not(.hidden)"
        );

    if (!hasOpenModal) {
        document.body.classList.remove(
            "modal-open"
        );
    }
}


/* =========================================================
   ĐẶT TRẠNG THÁI NÚT THANH TOÁN
========================================================= */

function setPaymentLoading(
    isLoading
) {
    if (
        elements.confirmPaymentButton
    ) {
        elements.confirmPaymentButton.disabled =
            isLoading;

        elements.confirmPaymentButton.textContent =
            isLoading
                ? "Đang thanh toán..."
                : "Xác nhận thanh toán";
    }

    if (
        elements.confirmReceivedButton
    ) {
        elements.confirmReceivedButton.disabled =
            isLoading;

        elements.confirmReceivedButton.textContent =
            isLoading
                ? "Đang lưu hóa đơn..."
                : "Đã nhận được tiền";
    }

    if (
        elements.createQrButton
    ) {
        elements.createQrButton.disabled =
            isLoading;
    }
}
/* =========================================================
   XÁC NHẬN THANH TOÁN
========================================================= */

export async function confirmPayment(
    forcedMethod = ""
) {
    if (
        state.isPaying
    ) {
        return;
    }

    const activeBill =
        getActiveBill();

    if (
        !activeBill
        ||
        state.cart.length === 0
    ) {
        showPaymentError(
            "Bill đang trống."
        );

        return;
    }

    const paymentMethod =
        forcedMethod
        ||
        getSelectedPaymentMethod();

    const subtotalAmount =
        getCartSubtotal();

    const discountAmount =
        getDiscountAmount();

    const selectedDiscount =
        getSelectedDiscount();

    const totalAmount =
        getCartTotal();

    const paidAmount =
        paymentMethod ===
            "cash"
            ? Number(
                elements.paidAmountInput
                    ?.value ||
                0
            )
            : totalAmount;

    const changeAmount =
        paymentMethod ===
            "cash"
            ? Math.max(
                0,
                paidAmount -
                totalAmount
            )
            : 0;

    if (
        totalAmount <= 0
    ) {
        showPaymentError(
            "Tổng thanh toán không hợp lệ."
        );

        return;
    }

    if (
        paymentMethod ===
            "cash"
        &&
        paidAmount <
            totalAmount
    ) {
        showPaymentError(
            "Số tiền khách đưa chưa đủ."
        );

        return;
    }

    if (
        paymentMethod ===
            "transfer"
        &&
        !state.transferCode
    ) {
        showPaymentError(
            "Hãy tạo mã QR trước khi xác nhận đã nhận tiền."
        );

        return;
    }

    hidePaymentError();

    state.isPaying =
        true;

    setPaymentLoading(
        true
    );

    /*
        Lưu tên bill trước khi hoàn tất,
        vì completeActiveBill() sẽ chuyển
        sang bill tiếp theo hoặc tạo bill mới.
    */
    const payingBillName =
        String(
            activeBill.name ||
            "Bill"
        );

    const payingBillId =
        String(
            activeBill.id ||
            ""
        );

    try {
        const sale =
            await checkoutSale({
    items:
        state.cart,

                paymentMethod,

                paidAmount,

                totalAmount,

                subtotalAmount,

                discountAmount,

                discountId:
                    selectedDiscount?.id
                    ||
                    "",

                discountCode:
                    selectedDiscount?.code
                    ||
                    "",

                discountType:
                    selectedDiscount?.type
                    ||
                    "",

                discountValue:
                    Number(
                        selectedDiscount?.value
                        ||
                        0
                    ),

                transferCode:
                    paymentMethod ===
                        "transfer"
                        ? state.transferCode
                        : "",

                /*
                    Lưu tên bill vào Firebase
                    để trang lịch sử hiển thị được.
                */
                billName:
                    payingBillName,

                pendingBillId:
                    payingBillId
            });

        /*
            Dùng tên bill vừa thanh toán
            để in hóa đơn ngay sau đó.
        */
        const receiptSale = {
            ...sale,

            billName:
                sale.billName
                ||
                payingBillName,

            pendingBillName:
                sale.billName
                ||
                payingBillName
        };

        completeActiveBill();

        saveBillsToStorage();

        /*
            Đang ở trong quá trình thanh toán nên cần
            đóng cưỡng bức modal thanh toán. Nếu không,
            closePaymentModal() sẽ bị chặn bởi state.isPaying
            và khi đóng hóa đơn thành công modal thanh toán
            cũ sẽ hiện lại với tổng tiền 0 đ.
        */
        closePaymentModal(
            true
        );

        renderCart();

        renderReceipt(
            receiptSale
        );

        openReceiptModal();

        window.dispatchEvent(
            new CustomEvent(
                "larva:bill-changed"
            )
        );
    } catch (error) {
        console.error(
            "Lỗi thanh toán:",
            error
        );

        showPaymentError(
            error.message
            ||
            "Không thể hoàn tất thanh toán."
        );
    } finally {
        state.isPaying =
            false;

        setPaymentLoading(
            false
        );
    }
}