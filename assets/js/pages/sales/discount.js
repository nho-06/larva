import {
    createDiscountCode
} from "../../services/discount-service.js";

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

/*
    Tính tổng tiền hàng trước khi giảm giá.
*/
export function getCartSubtotal() {
    return state.cart.reduce(
        (total, item) => {
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

/*
    Lấy mã giảm giá đang được chọn.
*/
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
        ) || null
    );
}

/*
    Tính số tiền được giảm.

    Có 2 loại:

    percent:
    Giảm theo phần trăm.

    amount:
    Giảm trực tiếp theo số tiền.
*/
export function getDiscountAmount(
    subtotal = getCartSubtotal()
) {
    const discount =
        getSelectedDiscount();

    if (
        !discount ||
        subtotal <= 0
    ) {
        return 0;
    }

    const rawAmount =
        discount.type === "amount"
            ? Number(
                discount.value || 0
            )
            : (
                subtotal *
                Number(
                    discount.value || 0
                )
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

/*
    Tổng tiền khách phải thanh toán
    sau khi trừ mã giảm giá.
*/
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

/*
    Tạo nội dung hiển thị cho mã giảm giá.
*/
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

/*
    Hiển thị danh sách mã giảm giá.

    Danh sách được thiết kế theo hàng ngang,
    có thể lướt trên điện thoại.
*/
export function renderDiscountCodes() {
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

/*
    Chọn hoặc bỏ chọn mã giảm giá.

    Bấm một lần:
    Áp dụng mã.

    Bấm lại:
    Hủy áp dụng mã.
*/
export function toggleDiscount(
    discountId
) {
    const currentId =
        String(
            state.selectedDiscountId ||
            ""
        );

    const clickedId =
        String(
            discountId || ""
        );

    state.selectedDiscountId =
        currentId === clickedId
            ? ""
            : clickedId;

    renderDiscountCodes();
}

/*
    Hiển thị thông báo khi tạo mã.
*/
function showDiscountMessage(
    message,
    type = "success"
) {
    if (
        !elements.discountFormMessage
    ) {
        return;
    }

    elements.discountFormMessage.textContent =
        message;

    elements.discountFormMessage.className =
        `discount-form-message ${type}`;

    window.clearTimeout(
        showDiscountMessage.timer
    );

    showDiscountMessage.timer =
        window.setTimeout(
            () => {
                elements.discountFormMessage
                    .classList.add(
                        "hidden"
                    );
            },
            2500
        );
}

/*
    Thêm mã giảm giá mới lên Firebase.

    Sau khi thêm thành công,
    mã mới sẽ được tự động chọn.
*/
export async function addDiscountCode() {
    const code =
        elements.discountCodeInput
            ?.value || "";

    const type =
        elements.discountTypeInput
            ?.value || "percent";

    const value =
        Number(
            elements.discountValueInput
                ?.value || 0
        );

    /*
        Kiểm tra mã trùng.
    */
    const duplicate =
        state.discountCodes.some(
            (item) => {
                const existingCode =
                    String(
                        item.code || ""
                    )
                        .trim()
                        .toUpperCase();

                const newCode =
                    String(
                        code || ""
                    )
                        .trim()
                        .toUpperCase();

                return (
                    existingCode ===
                    newCode
                );
            }
        );

    if (duplicate) {
        showDiscountMessage(
            "Mã giảm giá này đã tồn tại.",
            "error"
        );

        return;
    }

    if (
        elements.addDiscountButton
    ) {
        elements.addDiscountButton.disabled =
            true;

        elements.addDiscountButton.textContent =
            "Đang thêm...";
    }

    try {
        const discount =
            await createDiscountCode({
                code,
                type,
                value
            });

        /*
            Tự chọn mã vừa tạo.
        */
        state.selectedDiscountId =
            discount.id;

        if (
            elements.discountCodeInput
        ) {
            elements.discountCodeInput.value =
                "";
        }

        if (
            elements.discountValueInput
        ) {
            elements.discountValueInput.value =
                "";
        }

        showDiscountMessage(
            "Đã thêm và tự áp dụng mã giảm giá."
        );
    } catch (error) {
        console.error(
            "Lỗi thêm mã giảm giá:",
            error
        );

        showDiscountMessage(
            error.message ||
            "Không thể thêm mã giảm giá.",
            "error"
        );
    } finally {
        if (
            elements.addDiscountButton
        ) {
            elements.addDiscountButton.disabled =
                false;

            elements.addDiscountButton.textContent =
                "Thêm mã";
        }
    }
}