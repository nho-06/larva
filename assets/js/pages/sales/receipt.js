import {
    elements
} from "./sales-elements.js";

import {
    escapeHtml,
    formatMoney
} from "../../utils.js";

export function renderReceipt(sale) {
    const methodText =
        sale.paymentMethod === "cash"
            ? "Tiền mặt"
            : "Chuyển khoản";

    const createdDate =
        new Date(
            sale.createdAt
        ).toLocaleString("vi-VN");

    elements.receiptContent.innerHTML = `
        <div class="receipt">

            <div class="receipt-shop">
                <h2>
                    LARVA
                </h2>

                <p>
                    Hóa đơn bán hàng
                </p>
            </div>

            <div class="receipt-meta">

                <p>
                    Mã hóa đơn:

                    <strong>
                        ${escapeHtml(
                            sale.saleId || sale.id || ""
                        )}
                    </strong>
                </p>

                <p>
                    Thời gian:

                    <strong>
                        ${escapeHtml(createdDate)}
                    </strong>
                </p>

                ${
                    sale.transferCode
                        ? `
                            <p>
                                Nội dung chuyển khoản:

                                <strong>
                                    ${escapeHtml(
                                        sale.transferCode
                                    )}
                                </strong>
                            </p>
                        `
                        : ""
                }

            </div>

            <div class="receipt-items">

                ${(sale.items || [])
                    .map((item) => {
                        return `
                            <div class="receipt-item">

                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            item.name || "Sản phẩm"
                                        )}
                                    </strong>

                                    <small>
                                        ${Number(
                                            item.quantity || 0
                                        )}
                                        ×
                                        ${formatMoney(
                                            item.price || 0
                                        )}
                                    </small>
                                </div>

                                <span>
                                    ${formatMoney(
                                        item.lineTotal
                                        ?? (
                                            Number(item.price || 0)
                                            * Number(item.quantity || 0)
                                        )
                                    )}
                                </span>

                            </div>
                        `;
                    })
                    .join("")}

            </div>

            <div class="receipt-summary">

                ${
                    Number(
                        sale.discountAmount || 0
                    ) > 0
                        ? `
                            <div>
                                <span>
                                    Tạm tính
                                </span>

                                <strong>
                                    ${formatMoney(
                                        sale.subtotalAmount || 0
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
                                    − ${formatMoney(
                                        sale.discountAmount || 0
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }

                <div>
                    <span>
                        Tổng tiền
                    </span>

                    <strong>
                        ${formatMoney(
                            sale.totalAmount || 0
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Thanh toán
                    </span>

                    <strong>
                        ${methodText}
                    </strong>
                </div>

                ${
                    sale.paymentMethod === "cash"
                        ? `
                            <div>
                                <span>
                                    Khách đưa
                                </span>

                                <strong>
                                    ${formatMoney(
                                        sale.paidAmount || 0
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Tiền thừa
                                </span>

                                <strong>
                                    ${formatMoney(
                                        sale.changeAmount || 0
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }

            </div>

            <p class="receipt-thanks">
                Cảm ơn quý khách!
            </p>

        </div>
    `;
}

export function openReceiptModal() {
    elements.receiptModal
        .classList.remove(
            "hidden"
        );
}

export function closeReceiptModal() {
    elements.receiptModal
        .classList.add(
            "hidden"
        );

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

export function printReceipt() {
    window.print();
}