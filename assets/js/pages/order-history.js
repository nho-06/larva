import {
    listenOrderHistory,
    decreaseSaleItem,
    removeSaleItem,
    cancelSale
} from "../services/order-history-service.js";

import {
    escapeHtml,
    formatMoney
} from "../utils.js";

const elements = {
    searchInput:
        document.querySelector(
            "#historySearchInput"
        ),

    dateInput:
        document.querySelector(
            "#historyDateInput"
        ),

    paymentFilter:
        document.querySelector(
            "#historyPaymentFilter"
        ),

    statusFilter:
        document.querySelector(
            "#historyStatusFilter"
        ),

    list:
        document.querySelector(
            "#orderHistoryList"
        ),

    emptyState:
        document.querySelector(
            "#emptyHistoryState"
        ),

    message:
        document.querySelector(
            "#historyMessage"
        ),

    detailModal:
        document.querySelector(
            "#orderDetailModal"
        ),

    detailTitle:
        document.querySelector(
            "#orderDetailTitle"
        ),

    detailContent:
        document.querySelector(
            "#orderDetailContent"
        ),

    confirmModal:
        document.querySelector(
            "#historyConfirmModal"
        ),

    confirmTitle:
        document.querySelector(
            "#historyConfirmTitle"
        ),

    confirmMessage:
        document.querySelector(
            "#historyConfirmMessage"
        ),

    confirmButton:
        document.querySelector(
            "#historyConfirmButton"
        )
};

const state = {
    sales: [],
    selectedSaleId: "",
    pendingAction: null,
    unsubscribe: null
};


/* =========================================================
   CHUYỂN GIÁ TRỊ THÀNH SỐ
========================================================= */

function toNumber(
    value
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* =========================================================
   ĐỊNH DẠNG NGÀY GIỜ
========================================================= */

function formatDateTime(
    timestamp
) {
    const date =
        new Date(
            toNumber(
                timestamp
            )
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Không rõ thời gian";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    ).format(
        date
    );
}


/* =========================================================
   TÊN PHƯƠNG THỨC THANH TOÁN
========================================================= */

function getPaymentName(
    method
) {
    return method ===
        "transfer"
        ? "Chuyển khoản"
        : "Tiền mặt";
}


/* =========================================================
   TÊN TRẠNG THÁI HÓA ĐƠN
========================================================= */

function getStatusName(
    status
) {
    return status ===
        "cancelled"
        ? "Đã hủy"
        : "Đã thanh toán";
}


/* =========================================================
   HIỂN THỊ THÔNG BÁO
========================================================= */

function showMessage(
    message,
    type = "success"
) {
    if (
        !elements.message
    ) {
        return;
    }

    elements.message.textContent =
        message;

    elements.message.classList.remove(
        "hidden",
        "error",
        "success"
    );

    elements.message.classList.add(
        type
    );

    window.setTimeout(
        () => {
            elements.message
                ?.classList.add(
                    "hidden"
                );
        },
        3500
    );
}


/* =========================================================
   LỌC DANH SÁCH HÓA ĐƠN
========================================================= */

function getFilteredSales() {
    const keyword =
        String(
            elements.searchInput
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const selectedDate =
        String(
            elements.dateInput
                ?.value ||
            ""
        );

    const paymentMethod =
        String(
            elements.paymentFilter
                ?.value ||
            ""
        );

    const status =
        String(
            elements.statusFilter
                ?.value ||
            ""
        );

    return state.sales.filter(
        (sale) => {
            if (
                paymentMethod
                &&
                sale.paymentMethod !==
                    paymentMethod
            ) {
                return false;
            }

            const saleStatus =
                sale.status ||
                "paid";

            if (
                status
                &&
                saleStatus !==
                    status
            ) {
                return false;
            }

            if (
                selectedDate
            ) {
                const saleDate =
                    new Date(
                        toNumber(
                            sale.createdAt
                        )
                    );

                const localDate = [
                    saleDate.getFullYear(),

                    String(
                        saleDate.getMonth() +
                        1
                    ).padStart(
                        2,
                        "0"
                    ),

                    String(
                        saleDate.getDate()
                    ).padStart(
                        2,
                        "0"
                    )
                ].join(
                    "-"
                );

                if (
                    localDate !==
                    selectedDate
                ) {
                    return false;
                }
            }

            if (
                !keyword
            ) {
                return true;
            }

            const searchable = [
                sale.billName,
                sale.pendingBillName,
                sale.id,
                sale.saleId,
                sale.discountCode,

                ...(
                    sale.items ||
                    []
                ).flatMap(
                    (item) => [
                        item.name,
                        item.sku,
                        item.barcode
                    ]
                )
            ]
                .join(
                    " "
                )
                .toLowerCase();

            return searchable.includes(
                keyword
            );
        }
    );
}


/* =========================================================
   HIỂN THỊ DANH SÁCH HÓA ĐƠN
========================================================= */

function renderHistory() {
    const sales =
        getFilteredSales();

    elements.emptyState
        ?.classList.toggle(
            "hidden",
            sales.length > 0
        );

    if (
        !elements.list
    ) {
        return;
    }

    elements.list.innerHTML =
        sales
            .map(
                (sale) => {
                    const status =
                        sale.status ||
                        "paid";

                    const itemCount =
                        (
                            sale.items ||
                            []
                        ).reduce(
                            (
                                total,
                                item
                            ) => {
                                return (
                                    total +
                                    toNumber(
                                        item.quantity
                                    )
                                );
                            },
                            0
                        );

                    const billName =
                        sale.billName ||
                        sale.pendingBillName ||
                        "Bill";

                    return `
                        <article
                            class="
                                panel
                                order-history-card
                                ${
                                    status ===
                                    "cancelled"
                                        ? "cancelled"
                                        : ""
                                }
                            "
                        >

                            <div class="order-history-card-head">

                                <div>

                                    <div class="order-history-title-row">

                                        <h2>
                                            ${escapeHtml(
                                                billName
                                            )}
                                        </h2>

                                        <span
                                            class="
                                                order-status-badge
                                                ${status}
                                            "
                                        >
                                            ${getStatusName(
                                                status
                                            )}
                                        </span>

                                    </div>

                                    <p>
                                        ${formatDateTime(
                                            sale.createdAt
                                        )}
                                        ·
                                        ${getPaymentName(
                                            sale.paymentMethod
                                        )}
                                    </p>

                                    <small>
                                        Mã:
                                        ${escapeHtml(
                                            sale.saleId ||
                                            sale.id ||
                                            ""
                                        )}
                                    </small>

                                </div>

                                <div class="order-history-total">

                                    <span>
                                        ${itemCount} sản phẩm
                                    </span>

                                    <strong>
                                        ${formatMoney(
                                            toNumber(
                                                sale.totalAmount
                                            )
                                        )}
                                    </strong>

                                </div>

                            </div>

                            <div class="order-history-summary">

                                <span>
                                    Tạm tính:

                                    <strong>
                                        ${formatMoney(
                                            toNumber(
                                                sale.subtotalAmount
                                            )
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Giảm:

                                    <strong>
                                        −
                                        ${formatMoney(
                                            toNumber(
                                                sale.discountAmount
                                            )
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Giá vốn:

                                    <strong>
                                        ${formatMoney(
                                            toNumber(
                                                sale.totalCost
                                            )
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Lợi nhuận:

                                    <strong>
                                        ${formatMoney(
                                            toNumber(
                                                sale.totalProfit ??
                                                sale.netProfit
                                            )
                                        )}
                                    </strong>
                                </span>

                            </div>

                            <div class="order-history-actions">

                                <button
                                    class="button button-light"
                                    type="button"
                                    data-view-sale="${escapeHtml(
                                        sale.id
                                    )}"
                                >
                                    Xem chi tiết bill
                                </button>

                                ${
                                    status !==
                                    "cancelled"
                                        ? `
                                            <button
                                                class="
                                                    button
                                                    order-cancel-button
                                                "
                                                type="button"
                                                data-cancel-sale="${escapeHtml(
                                                    sale.id
                                                )}"
                                            >
                                                Hủy hóa đơn
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </article>
                    `;
                }
            )
            .join(
                ""
            );
}


/* =========================================================
   TÌM HÓA ĐƠN THEO ID
========================================================= */

function findSale(
    saleId
) {
    return state.sales.find(
        (sale) => {
            return (
                String(
                    sale.id
                ) ===
                String(
                    saleId
                )
            );
        }
    );
}


/* =========================================================
   HIỂN THỊ CHI TIẾT BILL
========================================================= */

function renderDetail(
    saleId
) {
    const sale =
        findSale(
            saleId
        );

    if (
        !sale
        ||
        !elements.detailContent
    ) {
        return;
    }

    state.selectedSaleId =
        saleId;

    const status =
        sale.status ||
        "paid";

    const billName =
        sale.billName ||
        sale.pendingBillName ||
        "Bill";

    if (
        elements.detailTitle
    ) {
        elements.detailTitle.textContent =
            billName;
    }

    const itemsHtml =
        (
            sale.items ||
            []
        )
            .map(
                (
                    item,
                    index
                ) => {
                    return `
                        <div class="order-detail-item">

                            <img
                                src="${escapeHtml(
                                    item.image ||
                                    "./assets/images/larva-mascot.png"
                                )}"
                                alt="${escapeHtml(
                                    item.name ||
                                    "Sản phẩm"
                                )}"
                                onerror="
                                    this.src='./assets/images/larva-mascot.png'
                                "
                            >

                            <div class="order-detail-item-info">

                                <strong>
                                    ${escapeHtml(
                                        item.name ||
                                        "Sản phẩm"
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        item.sku ||
                                        item.barcode ||
                                        "Không có mã"
                                    )}
                                </small>

                                <span>
                                    ${formatMoney(
                                        toNumber(
                                            item.price ??
                                            item.salePrice
                                        )
                                    )}
                                    ×
                                    ${toNumber(
                                        item.quantity
                                    )}
                                </span>

                            </div>

                            <div class="order-detail-item-total">

                                <strong>
                                    ${formatMoney(
                                        toNumber(
                                            item.lineRevenue ??
                                            item.lineTotal
                                        )
                                    )}
                                </strong>

                                ${
                                    status !==
                                    "cancelled"
                                        ? `
                                            <div class="order-item-actions">

                                                <button
                                                    type="button"
                                                    class="bill-action-button"
                                                    data-decrease-item="${index}"
                                                >
                                                    −1
                                                </button>

                                                <button
                                                    type="button"
                                                    class="
                                                        bill-action-button
                                                        bill-delete-button
                                                    "
                                                    data-remove-item="${index}"
                                                >
                                                    Xóa
                                                </button>

                                            </div>
                                        `
                                        : ""
                                }

                            </div>

                        </div>
                    `;
                }
            )
            .join(
                ""
            );

    elements.detailContent.innerHTML = `
        <div class="order-detail-meta">

            <span>
                Mã hóa đơn:

                <strong>
                    ${escapeHtml(
                        sale.saleId ||
                        sale.id ||
                        ""
                    )}
                </strong>
            </span>

            <span>
                Thời gian:

                <strong>
                    ${formatDateTime(
                        sale.createdAt
                    )}
                </strong>
            </span>

            <span>
                Thanh toán:

                <strong>
                    ${getPaymentName(
                        sale.paymentMethod
                    )}
                </strong>
            </span>

            <span>
                Trạng thái:

                <strong>
                    ${getStatusName(
                        status
                    )}
                </strong>
            </span>

        </div>

        <div class="order-detail-items">

            ${
                itemsHtml
                ||
                `
                    <p class="empty-state">
                        Hóa đơn không còn sản phẩm.
                    </p>
                `
            }

        </div>

        <div class="order-detail-totals">

            <div>

                <span>
                    Tạm tính
                </span>

                <strong>
                    ${formatMoney(
                        toNumber(
                            sale.subtotalAmount
                        )
                    )}
                </strong>

            </div>

            <div>

                <span>
                    Giảm giá
                    ${
                        sale.discountCode
                            ? `(${escapeHtml(
                                sale.discountCode
                            )})`
                            : ""
                    }
                </span>

                <strong>
                    −
                    ${formatMoney(
                        toNumber(
                            sale.discountAmount
                        )
                    )}
                </strong>

            </div>

            <div class="order-detail-grand-total">

                <span>
                    Tổng thanh toán
                </span>

                <strong>
                    ${formatMoney(
                        toNumber(
                            sale.totalAmount
                        )
                    )}
                </strong>

            </div>

            <div>

                <span>
                    Giá vốn
                </span>

                <strong>
                    ${formatMoney(
                        toNumber(
                            sale.totalCost
                        )
                    )}
                </strong>

            </div>

            <div>

                <span>
                    Lợi nhuận
                </span>

                <strong>
                    ${formatMoney(
                        toNumber(
                            sale.totalProfit ??
                            sale.netProfit
                        )
                    )}
                </strong>

            </div>

            ${
                sale.paymentMethod ===
                "cash"
                    ? `
                        <div>

                            <span>
                                Khách đưa / Tiền thừa
                            </span>

                            <strong>
                                ${formatMoney(
                                    toNumber(
                                        sale.paidAmount
                                    )
                                )}
                                /
                                ${formatMoney(
                                    toNumber(
                                        sale.changeAmount
                                    )
                                )}
                            </strong>

                        </div>
                    `
                    : ""
            }

            ${
                sale.transferCode
                    ? `
                        <div>

                            <span>
                                Nội dung chuyển khoản
                            </span>

                            <strong>
                                ${escapeHtml(
                                    sale.transferCode
                                )}
                            </strong>

                        </div>
                    `
                    : ""
            }

        </div>
    `;

    elements.detailModal
        ?.classList.remove(
            "hidden"
        );

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   ĐÓNG MODAL CHI TIẾT
========================================================= */

function closeDetailModal() {
    elements.detailModal
        ?.classList.add(
            "hidden"
        );

    state.selectedSaleId =
        "";

    updateBodyModalClass();
}


/* =========================================================
   MỞ MODAL XÁC NHẬN
========================================================= */

function openConfirm({
    title,
    message,
    buttonText,
    action
}) {
    state.pendingAction =
        action;

    if (
        elements.confirmTitle
    ) {
        elements.confirmTitle.textContent =
            title;
    }

    if (
        elements.confirmMessage
    ) {
        elements.confirmMessage.textContent =
            message;
    }

    if (
        elements.confirmButton
    ) {
        elements.confirmButton.textContent =
            buttonText;
    }

    elements.confirmModal
        ?.classList.remove(
            "hidden"
        );

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   ĐÓNG MODAL XÁC NHẬN
========================================================= */

function closeConfirmModal() {
    if (
        elements.confirmButton
            ?.disabled
    ) {
        return;
    }

    elements.confirmModal
        ?.classList.add(
            "hidden"
        );

    state.pendingAction =
        null;

    updateBodyModalClass();
}


/* =========================================================
   CẬP NHẬT TRẠNG THÁI MODAL CỦA BODY
========================================================= */

function updateBodyModalClass() {
    document.body.classList.toggle(
        "modal-open",
        Boolean(
            document.querySelector(
                ".modal:not(.hidden)"
            )
        )
    );
}


/* =========================================================
   THỰC HIỆN THAO TÁC ĐÃ XÁC NHẬN
========================================================= */

async function runPendingAction() {
    if (
        !state.pendingAction
        ||
        !elements.confirmButton
    ) {
        return;
    }

    const action =
        state.pendingAction;

    elements.confirmButton.disabled =
        true;

    elements.confirmButton.textContent =
        "Đang cập nhật...";

    try {
        await action();

        closeDetailModal();

        elements.confirmModal
            ?.classList.add(
                "hidden"
            );

        state.pendingAction =
            null;

        updateBodyModalClass();

        showMessage(
            "Đã cập nhật hóa đơn, tồn kho và doanh thu."
        );
    } catch (error) {
        console.error(
            error
        );

        showMessage(
            error.message ||
            "Không thể cập nhật hóa đơn.",
            "error"
        );
    } finally {
        elements.confirmButton.disabled =
            false;

        elements.confirmButton.textContent =
            "Xác nhận";
    }
}


/* =========================================================
   SỰ KIỆN TRONG DANH SÁCH HÓA ĐƠN
========================================================= */

function handleListClick(
    event
) {
    const viewButton =
        event.target.closest(
            "[data-view-sale]"
        );

    const cancelButton =
        event.target.closest(
            "[data-cancel-sale]"
        );

    if (
        viewButton
    ) {
        renderDetail(
            viewButton.dataset.viewSale
        );

        return;
    }

    if (
        cancelButton
    ) {
        const sale =
            findSale(
                cancelButton.dataset
                    .cancelSale
            );

        openConfirm({
            title:
                "Hủy toàn bộ hóa đơn?",

            message:
                `Toàn bộ sản phẩm của ${
                    sale?.billName ||
                    "bill này"
                } sẽ được hoàn lại kho và doanh thu của hóa đơn sẽ về 0 ₫.`,

            buttonText:
                "Hủy hóa đơn",

            action:
                () => {
                    return cancelSale(
                        cancelButton.dataset
                            .cancelSale
                    );
                }
        });
    }
}


/* =========================================================
   SỰ KIỆN TRONG CHI TIẾT HÓA ĐƠN
========================================================= */

function handleDetailClick(
    event
) {
    const decreaseButton =
        event.target.closest(
            "[data-decrease-item]"
        );

    const removeButton =
        event.target.closest(
            "[data-remove-item]"
        );

    const sale =
        findSale(
            state.selectedSaleId
        );

    if (
        !sale
    ) {
        return;
    }

    if (
        decreaseButton
    ) {
        const index =
            Number(
                decreaseButton.dataset
                    .decreaseItem
            );

        const item =
            sale.items[
                index
            ];

        openConfirm({
            title:
                "Giảm 1 sản phẩm?",

            message:
                `Giảm 1 "${
                    item?.name ||
                    "sản phẩm"
                }" khỏi bill. Hệ thống sẽ cộng lại 1 vào tồn kho và tính lại doanh thu.`,

            buttonText:
                "Giảm 1",

            action:
                () => {
                    return decreaseSaleItem(
                        sale.id,
                        index
                    );
                }
        });

        return;
    }

    if (
        removeButton
    ) {
        const index =
            Number(
                removeButton.dataset
                    .removeItem
            );

        const item =
            sale.items[
                index
            ];

        openConfirm({
            title:
                "Xóa món khỏi bill?",

            message:
                `Xóa toàn bộ "${
                    item?.name ||
                    "sản phẩm"
                }" khỏi bill. Số lượng đã bán sẽ được hoàn lại kho và doanh thu sẽ được tính lại.`,

            buttonText:
                "Xóa món",

            action:
                () => {
                    return removeSaleItem(
                        sale.id,
                        index
                    );
                }
        });
    }
}


/* =========================================================
   KHỞI TẠO SỰ KIỆN
========================================================= */

function initializeEvents() {
    [
        elements.searchInput,
        elements.dateInput,
        elements.paymentFilter,
        elements.statusFilter
    ].forEach(
        (element) => {
            element?.addEventListener(
                "input",
                renderHistory
            );
        }
    );

    elements.list
        ?.addEventListener(
            "click",
            handleListClick
        );

    elements.detailContent
        ?.addEventListener(
            "click",
            handleDetailClick
        );

    elements.confirmButton
        ?.addEventListener(
            "click",
            runPendingAction
        );

    document
        .querySelectorAll(
            "[data-close-order-detail]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeDetailModal
                );
            }
        );

    document
        .querySelectorAll(
            "[data-close-history-confirm]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    closeConfirmModal
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
                !elements.confirmModal
                    ?.classList.contains(
                        "hidden"
                    )
            ) {
                closeConfirmModal();
            } else if (
                !elements.detailModal
                    ?.classList.contains(
                        "hidden"
                    )
            ) {
                closeDetailModal();
            }
        }
    );
}


/* =========================================================
   KHỞI ĐỘNG TRANG
========================================================= */

initializeEvents();

state.unsubscribe =
    listenOrderHistory(
        (
            sales,
            error
        ) => {
            state.sales =
                sales;

            renderHistory();

            if (
                error
            ) {
                showMessage(
                    "Không tải được lịch sử đơn hàng.",
                    "error"
                );
            }

            if (
                state.selectedSaleId
                &&
                !elements.detailModal
                    ?.classList.contains(
                        "hidden"
                    )
            ) {
                renderDetail(
                    state.selectedSaleId
                );
            }
        }
    );

window.addEventListener(
    "pagehide",
    () => {
        state.unsubscribe
            ?.();
    }
);