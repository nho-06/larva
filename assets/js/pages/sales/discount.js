import {
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    escapeHtml,
    formatMoney
} from "../../utils.js";

import {
    saveBillsToStorage
} from "./bill-manager.js";


/* =========================================================
   TÍNH TỔNG TIỀN HÀNG TRƯỚC KHI GIẢM GIÁ
========================================================= */

export function getCartSubtotal() {
    return state.cart.reduce(
        (
            total,
            item
        ) => {
            const price =
                Number(
                    item.price || 0
                );

            const quantity =
                Number(
                    item.quantity || 0
                );

            return (
                total +
                price * quantity
            );
        },
        0
    );
}


/* =========================================================
   LẤY MÃ GIẢM GIÁ ĐANG CHỌN CỦA BILL HIỆN TẠI
========================================================= */

export function getSelectedDiscount() {
    return (
        state.discountCodes.find(
            (item) => {
                return (
                    String(
                        item.id || ""
                    ) ===
                    String(
                        state.selectedDiscountId ||
                        ""
                    )
                );
            }
        ) ||
        null
    );
}


/* =========================================================
   KIỂM TRA MÃ GIẢM GIÁ CÒN TỒN TẠI KHÔNG
========================================================= */

export function validateSelectedDiscount() {
    if (
        !state.selectedDiscountId
    ) {
        return null;
    }

    const selectedDiscount =
        getSelectedDiscount();

    /*
        Nếu mã đã bị xóa hoặc không còn hoạt động,
        bỏ mã khỏi bill hiện tại.
    */
    if (!selectedDiscount) {
        state.selectedDiscountId =
            "";

        saveBillsToStorage();

        return null;
    }

    return selectedDiscount;
}


/* =========================================================
   TÍNH SỐ TIỀN ĐƯỢC GIẢM
========================================================= */

export function getDiscountAmount(
    subtotal = getCartSubtotal()
) {
    const discount =
        validateSelectedDiscount();

    if (
        !discount ||
        subtotal <= 0
    ) {
        return 0;
    }

    const discountValue =
        Math.max(
            0,
            Number(
                discount.value || 0
            )
        );

    const rawAmount =
        discount.type ===
        "amount"
            ? discountValue
            : (
                subtotal *
                discountValue
            ) / 100;

    /*
        Không cho số tiền giảm lớn hơn
        tổng tiền hàng.
    */
    return Math.min(
        subtotal,
        Math.max(
            0,
            Math.round(
                rawAmount
            )
        )
    );
}


/* =========================================================
   TÍNH TỔNG TIỀN SAU GIẢM GIÁ
========================================================= */

export function getFinalTotal() {
    const subtotal =
        getCartSubtotal();

    const discountAmount =
        getDiscountAmount(
            subtotal
        );

    return Math.max(
        0,
        subtotal -
        discountAmount
    );
}


/* =========================================================
   TẠO NỘI DUNG HIỂN THỊ CHO MÃ GIẢM GIÁ
========================================================= */

function getDiscountLabel(
    discount
) {
    if (
        discount.type ===
        "amount"
    ) {
        return `Giảm ${formatMoney(
            discount.value || 0
        )}`;
    }

    return `Giảm ${Number(
        discount.value || 0
    )}%`;
}


/* =========================================================
   HIỂN THỊ DANH SÁCH MÃ GIẢM GIÁ
========================================================= */

export function renderDiscountCodes() {
    /*
        Kiểm tra lại mã đang chọn của bill hiện tại.
    */
    validateSelectedDiscount();

    const hasDiscounts =
        state.discountCodes.length >
        0;

    elements.discountEmptyState
        ?.classList.toggle(
            "hidden",
            hasDiscounts
        );

    if (
        !elements.discountCodeList
    ) {
        return;
    }

    elements.discountCodeList.innerHTML =
        state.discountCodes
            .map(
                (discount) => {
                    const active =
                        String(
                            discount.id ||
                            ""
                        ) ===
                        String(
                            state.selectedDiscountId ||
                            ""
                        );

                    return `
                        <button
                            class="
                                discount-code-chip
                                ${
                                    active
                                        ? "active"
                                        : ""
                                }
                            "
                            type="button"
                            data-discount-id="${escapeHtml(
                                discount.id ||
                                ""
                            )}"
                            aria-pressed="${active}"
                        >
                            <strong>
                                ${escapeHtml(
                                    discount.code ||
                                    "MÃ GIẢM"
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    getDiscountLabel(
                                        discount
                                    )
                                )}
                            </span>
                        </button>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   CHỌN HOẶC BỎ CHỌN MÃ GIẢM GIÁ
========================================================= */

export function toggleDiscount(
    discountId
) {
    const clickedId =
        String(
            discountId || ""
        );

    const currentId =
        String(
            state.selectedDiscountId ||
            ""
        );

    /*
        Không cho chọn mã không tồn tại.
    */
    const discountExists =
        state.discountCodes.some(
            (discount) => {
                return (
                    String(
                        discount.id || ""
                    ) ===
                    clickedId
                );
            }
        );

    if (
        clickedId &&
        !discountExists
    ) {
        return false;
    }

    /*
        Bấm lại mã đang chọn thì bỏ mã.
        Bấm mã khác thì chuyển sang mã mới.
    */
    state.selectedDiscountId =
        currentId === clickedId
            ? ""
            : clickedId;

    /*
        Lưu mã giảm giá riêng vào bill hiện tại.
    */
    saveBillsToStorage();

    renderDiscountCodes();

    return true;
}


/* =========================================================
   BỎ MÃ GIẢM GIÁ KHỎI BILL HIỆN TẠI
========================================================= */

export function clearSelectedDiscount() {
    if (
        !state.selectedDiscountId
    ) {
        return;
    }

    state.selectedDiscountId =
        "";

    saveBillsToStorage();

    renderDiscountCodes();
}