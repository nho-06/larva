import {
    createDiscountCode,
    deleteDiscountCode,
    listenAllDiscountCodes,
    setDiscountCodeActive,
    updateDiscountCode
} from "../services/discount-service.js";

const elements = {
    tableBody: document.querySelector(
        "#discountTableBody"
    ),

    loadingState: document.querySelector(
        "#discountLoadingState"
    ),

    emptyState: document.querySelector(
        "#discountEmptyState"
    ),

    searchInput: document.querySelector(
        "#discountSearchInput"
    ),

    statusFilter: document.querySelector(
        "#discountStatusFilter"
    ),

    totalCount: document.querySelector(
        "#discountTotalCount"
    ),

    activeCount: document.querySelector(
        "#discountActiveCount"
    ),

    inactiveCount: document.querySelector(
        "#discountInactiveCount"
    ),

    pageMessage: document.querySelector(
        "#discountPageMessage"
    ),

    openFormButton: document.querySelector(
        "#openDiscountFormButton"
    ),

    formModal: document.querySelector(
        "#discountFormModal"
    ),

    formTitle: document.querySelector(
        "#discountFormTitle"
    ),

    form: document.querySelector(
        "#discountForm"
    ),

    codeInput: document.querySelector(
        "#discountCodeInput"
    ),

    typeInput: document.querySelector(
        "#discountTypeInput"
    ),

    valueInput: document.querySelector(
        "#discountValueInput"
    ),

    formMessage: document.querySelector(
        "#discountFormMessage"
    ),

    saveButton: document.querySelector(
        "#saveDiscountButton"
    ),

    confirmModal: document.querySelector(
        "#discountConfirmModal"
    ),

    confirmTitle: document.querySelector(
        "#discountConfirmTitle"
    ),

    confirmMessage: document.querySelector(
        "#discountConfirmMessage"
    ),

    confirmButton: document.querySelector(
        "#discountConfirmButton"
    )
};

let discountCodes = [];

let editingDiscountId = "";

let confirmAction = null;

let unsubscribeDiscounts = null;

let pageMessageTimer = null;

function safe(value) {
    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

function formatMoney(value) {
    return (
        new Intl.NumberFormat(
            "vi-VN"
        ).format(
            Number(value || 0)
        ) + " đ"
    );
}

function formatDateTime(timestamp) {
    const value = Number(
        timestamp || 0
    );

    if (!value) {
        return "Chưa có";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(
        new Date(value)
    );
}

function getDiscountValueLabel(
    discount
) {
    if (
        discount.type ===
        "amount"
    ) {
        return formatMoney(
            discount.value
        );
    }

    return `${
        Number(
            discount.value || 0
        )
    }%`;
}

function normalizeCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );
}

function getFilteredDiscounts() {
    const keyword =
        normalizeCode(
            elements.searchInput
                ?.value
        );

    const status = String(
        elements.statusFilter
            ?.value ||
        "all"
    );

    return discountCodes.filter(
        (discount) => {
            const isActive =
                discount.active !==
                false;

            if (
                status ===
                    "active" &&
                !isActive
            ) {
                return false;
            }

            if (
                status ===
                    "inactive" &&
                isActive
            ) {
                return false;
            }

            return (
                !keyword ||
                normalizeCode(
                    discount.code
                ).includes(
                    keyword
                )
            );
        }
    );
}

function updateSummary() {
    const activeCount =
        discountCodes.filter(
            (discount) =>
                discount.active !==
                false
        ).length;

    elements.totalCount.textContent =
        String(
            discountCodes.length
        );

    elements.activeCount.textContent =
        String(
            activeCount
        );

    elements.inactiveCount.textContent =
        String(
            discountCodes.length -
            activeCount
        );
}

function renderDiscounts() {
    const filtered =
        getFilteredDiscounts();

    updateSummary();

    elements.loadingState
        .classList
        .add(
            "hidden"
        );

    elements.emptyState
        .classList
        .toggle(
            "hidden",
            filtered.length > 0
        );

    elements.tableBody.innerHTML =
        filtered
            .map(
                (discount) => {
                    const active =
                        discount.active !==
                        false;

                    return `
                        <tr>

                            <td>
                                <strong
                                    class="discount-code-name"
                                >
                                    ${safe(
                                        discount.code
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${
                                    discount.type ===
                                    "amount"
                                        ? "Số tiền"
                                        : "Phần trăm"
                                }
                            </td>

                            <td>
                                <strong>
                                    ${safe(
                                        getDiscountValueLabel(
                                            discount
                                        )
                                    )}
                                </strong>
                            </td>

                            <td>
                                <span
                                    class="
                                        discount-status-badge
                                        ${
                                            active
                                                ? "is-active"
                                                : "is-inactive"
                                        }
                                    "
                                >
                                    ${
                                        active
                                            ? "Đang hoạt động"
                                            : "Đã tắt"
                                    }
                                </span>
                            </td>

                            <td>
                                ${safe(
                                    formatDateTime(
                                        discount.createdAt
                                    )
                                )}
                            </td>

                            <td>
                                <div
                                    class="discount-row-actions"
                                >

                                    <button
                                        class="
                                            discount-action-button
                                            edit
                                        "
                                        type="button"
                                        data-action="edit"
                                        data-id="${safe(
                                            discount.id
                                        )}"
                                    >
                                        Sửa
                                    </button>

                                    <button
                                        class="
                                            discount-action-button
                                            toggle
                                        "
                                        type="button"
                                        data-action="toggle"
                                        data-id="${safe(
                                            discount.id
                                        )}"
                                    >
                                        ${
                                            active
                                                ? "Tắt"
                                                : "Bật"
                                        }
                                    </button>

                                    <button
                                        class="
                                            discount-action-button
                                            delete
                                        "
                                        type="button"
                                        data-action="delete"
                                        data-id="${safe(
                                            discount.id
                                        )}"
                                    >
                                        Xóa
                                    </button>

                                </div>
                            </td>

                        </tr>
                    `;
                }
            )
            .join(
                ""
            );
}

function showPageMessage(
    message,
    type = "success"
) {
    clearTimeout(
        pageMessageTimer
    );

    elements.pageMessage.textContent =
        message;

    elements.pageMessage.className =
        `discount-page-message ${type}`;

    pageMessageTimer =
        window.setTimeout(
            () => {
                elements.pageMessage
                    .classList
                    .add(
                        "hidden"
                    );
            },
            3500
        );
}

function showFormMessage(
    message
) {
    elements.formMessage.textContent =
        message;

    elements.formMessage.className =
        "discount-form-message error";
}

function clearFormMessage() {
    elements.formMessage.textContent =
        "";

    elements.formMessage.className =
        "discount-form-message hidden";
}

function openForm(
    discount = null
) {
    editingDiscountId =
        String(
            discount?.id || ""
        );

    elements.form.reset();

    clearFormMessage();

    elements.formTitle.textContent =
        discount
            ? "Chỉnh sửa mã giảm giá"
            : "Thêm mã giảm giá";

    elements.saveButton.textContent =
        discount
            ? "Lưu thay đổi"
            : "Thêm mã";

    if (discount) {
        elements.codeInput.value =
            discount.code || "";

        elements.typeInput.value =
            discount.type ===
            "amount"
                ? "amount"
                : "percent";

        elements.valueInput.value =
            Number(
                discount.value || 0
            );
    }

    elements.formModal
        .classList
        .remove(
            "hidden"
        );

    elements.formModal
        .setAttribute(
            "aria-hidden",
            "false"
        );

    window.setTimeout(
        () => {
            elements.codeInput
                .focus();
        },
        0
    );
}

function closeForm() {
    if (
        elements.saveButton
            .disabled
    ) {
        return;
    }

    editingDiscountId = "";

    elements.formModal
        .classList
        .add(
            "hidden"
        );

    elements.formModal
        .setAttribute(
            "aria-hidden",
            "true"
        );
}

function openConfirm({
    title,
    message,
    action
}) {
    elements.confirmTitle.textContent =
        title;

    elements.confirmMessage.textContent =
        message;

    confirmAction =
        action;

    elements.confirmModal
        .classList
        .remove(
            "hidden"
        );

    elements.confirmModal
        .setAttribute(
            "aria-hidden",
            "false"
        );
}

function closeConfirm() {
    if (
        elements.confirmButton
            .disabled
    ) {
        return;
    }

    confirmAction = null;

    elements.confirmModal
        .classList
        .add(
            "hidden"
        );

    elements.confirmModal
        .setAttribute(
            "aria-hidden",
            "true"
        );
}

function findDiscountById(
    id
) {
    return discountCodes.find(
        (discount) =>
            String(
                discount.id
            ) ===
            String(
                id
            )
    );
}

async function handleSubmit(
    event
) {
    event.preventDefault();

    clearFormMessage();

    const code =
        normalizeCode(
            elements.codeInput
                .value
        );

    const type =
        elements.typeInput
            .value;

    const value =
        Number(
            elements.valueInput
                .value || 0
        );

    const duplicate =
        discountCodes.some(
            (discount) =>
                normalizeCode(
                    discount.code
                ) ===
                    code &&
                String(
                    discount.id
                ) !==
                    editingDiscountId
        );

    if (duplicate) {
        showFormMessage(
            "Mã giảm giá này đã tồn tại."
        );

        return;
    }

    elements.saveButton.disabled =
        true;

    elements.saveButton.textContent =
        "Đang lưu...";

    try {
        if (
            editingDiscountId
        ) {
            await updateDiscountCode(
                editingDiscountId,
                {
                    code,
                    type,
                    value
                }
            );

            showPageMessage(
                "Đã cập nhật mã giảm giá."
            );
        } else {
            await createDiscountCode(
                {
                    code,
                    type,
                    value
                }
            );

            showPageMessage(
                "Đã thêm mã giảm giá mới."
            );
        }

        elements.formModal
            .classList
            .add(
                "hidden"
            );

        elements.formModal
            .setAttribute(
                "aria-hidden",
                "true"
            );

        editingDiscountId = "";
    } catch (error) {
        console.error(
            "Lỗi lưu mã giảm giá:",
            error
        );

        showFormMessage(
            error?.message ||
            "Không thể lưu mã giảm giá."
        );
    } finally {
        elements.saveButton.disabled =
            false;

        elements.saveButton.textContent =
            editingDiscountId
                ? "Lưu thay đổi"
                : "Thêm mã";
    }
}

function handleTableClick(
    event
) {
    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) {
        return;
    }

    const discount =
        findDiscountById(
            button.dataset.id
        );

    if (!discount) {
        return;
    }

    if (
        button.dataset.action ===
        "edit"
    ) {
        openForm(
            discount
        );

        return;
    }

    if (
        button.dataset.action ===
        "toggle"
    ) {
        const willActivate =
            discount.active ===
            false;

        openConfirm({
            title:
                willActivate
                    ? "Bật mã giảm giá"
                    : "Tắt mã giảm giá",

            message:
                willActivate
                    ? `Bật lại mã ${discount.code} để dùng khi bán hàng?`
                    : `Tắt mã ${discount.code}? Mã sẽ không còn xuất hiện khi bán hàng.`,

            action:
                async () => {
                    await setDiscountCodeActive(
                        discount.id,
                        willActivate
                    );

                    showPageMessage(
                        willActivate
                            ? "Đã bật mã giảm giá."
                            : "Đã tắt mã giảm giá."
                    );
                }
        });

        return;
    }

    if (
        button.dataset.action ===
        "delete"
    ) {
        openConfirm({
            title:
                "Xóa mã giảm giá",

            message:
                `Xóa vĩnh viễn mã ${discount.code}?`,

            action:
                async () => {
                    await deleteDiscountCode(
                        discount.id
                    );

                    showPageMessage(
                        "Đã xóa mã giảm giá."
                    );
                }
        });
    }
}

async function handleConfirm() {
    if (!confirmAction) {
        return;
    }

    elements.confirmButton.disabled =
        true;

    elements.confirmButton.textContent =
        "Đang xử lý...";

    try {
        await confirmAction();

        elements.confirmModal
            .classList
            .add(
                "hidden"
            );

        elements.confirmModal
            .setAttribute(
                "aria-hidden",
                "true"
            );

        confirmAction = null;
    } catch (error) {
        console.error(
            "Lỗi xử lý mã giảm giá:",
            error
        );

        showPageMessage(
            error?.message ||
            "Không thể thực hiện thao tác.",
            "error"
        );
    } finally {
        elements.confirmButton.disabled =
            false;

        elements.confirmButton.textContent =
            "Xác nhận";
    }
}

function bindEvents() {
    elements.openFormButton
        .addEventListener(
            "click",
            () => {
                openForm();
            }
        );

    elements.form
        .addEventListener(
            "submit",
            handleSubmit
        );

    elements.tableBody
        .addEventListener(
            "click",
            handleTableClick
        );

    elements.searchInput
        .addEventListener(
            "input",
            renderDiscounts
        );

    elements.statusFilter
        .addEventListener(
            "change",
            renderDiscounts
        );

    elements.confirmButton
        .addEventListener(
            "click",
            handleConfirm
        );

    document
        .querySelectorAll(
            "[data-close-discount-form]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeForm
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-discount-confirm]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    closeConfirm
                );
            }
        );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            if (
                !elements
                    .confirmModal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {
                closeConfirm();

                return;
            }

            if (
                !elements
                    .formModal
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {
                closeForm();
            }
        }
    );
}

function initialize() {
    bindEvents();

    unsubscribeDiscounts =
        listenAllDiscountCodes(
            (items) => {
                discountCodes =
                    items;

                renderDiscounts();
            }
        );
}

window.addEventListener(
    "beforeunload",
    () => {
        if (
            typeof unsubscribeDiscounts ===
            "function"
        ) {
            unsubscribeDiscounts();
        }
    }
);

initialize();