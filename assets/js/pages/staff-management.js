import {
    approveStaffAccount,
    deleteStaffAccount,
    getStaffStatusSummary,
    listenStaffAccounts,
    lockStaffAccount,
    restoreStaffAccount,
    STAFF_STATUS,
    unlockStaffAccount
} from "../services/staff-service.js";

const elements = {
    staffTableBody:
        document.querySelector(
            "#staffTableBody"
        ),

    emptyState:
        document.querySelector(
            "#staffEmptyState"
        ),

    loadingState:
        document.querySelector(
            "#staffLoadingState"
        ),

    searchInput:
        document.querySelector(
            "#staffSearchInput"
        ),

    statusFilter:
        document.querySelector(
            "#staffStatusFilter"
        ),

    refreshButton:
        document.querySelector(
            "#staffRefreshButton"
        ),

    pageMessage:
        document.querySelector(
            "#staffPageMessage"
        ),

    totalCount:
        document.querySelector(
            "#staffTotalCount"
        ),

    pendingCount:
        document.querySelector(
            "#staffPendingCount"
        ),

    approvedCount:
        document.querySelector(
            "#staffApprovedCount"
        ),

    lockedCount:
        document.querySelector(
            "#staffLockedCount"
        ),

    deletedCount:
        document.querySelector(
            "#staffDeletedCount"
        ),

    confirmModal:
        document.querySelector(
            "#staffConfirmModal"
        ),

    confirmModalTitle:
        document.querySelector(
            "#staffConfirmModalTitle"
        ),

    confirmModalMessage:
        document.querySelector(
            "#staffConfirmModalMessage"
        ),

    confirmModalCancel:
        document.querySelector(
            "#staffConfirmModalCancel"
        ),

    confirmModalConfirm:
        document.querySelector(
            "#staffConfirmModalConfirm"
        )
};

let staffList = [];

let unsubscribeStaff = null;

let pendingAction = null;

let isProcessingAction = false;

let messageTimeoutId = null;

/**
 * Chuẩn hóa chuỗi tìm kiếm.
 */
function normalizeSearchText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

/**
 * Chống chèn mã HTML.
 */
function safe(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Định dạng ngày giờ.
 */
function formatDateTime(timestamp) {
    const normalizedTimestamp =
        Number(timestamp || 0);

    if (!normalizedTimestamp) {
        return "Chưa có";
    }

    const date =
        new Date(
            normalizedTimestamp
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Không hợp lệ";
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
    ).format(date);
}

/**
 * Lấy chữ cái đầu làm ảnh đại diện.
 */
function getInitialLetter(staff) {
    const name =
        String(
            staff?.displayName
            || staff?.username
            || staff?.email
            || "N"
        ).trim();

    return (
        name.charAt(0)
            .toUpperCase()
        || "N"
    );
}

/**
 * Lấy tên trạng thái.
 */
function getStatusLabel(status) {
    const labels = {
        pending:
            "Chờ duyệt",

        approved:
            "Đang hoạt động",

        locked:
            "Đã khóa",

        deleted:
            "Đã xóa"
    };

    return (
        labels[status]
        || "Không xác định"
    );
}

/**
 * Lấy class CSS theo trạng thái.
 */
function getStatusClass(status) {
    const classes = {
        pending:
            "is-pending",

        approved:
            "is-approved",

        locked:
            "is-locked",

        deleted:
            "is-deleted"
    };

    return (
        classes[status]
        || ""
    );
}

/**
 * Lọc nhân viên theo từ khóa và trạng thái.
 */
function getFilteredStaffList() {
    const keyword =
        normalizeSearchText(
            elements.searchInput
                ?.value
        );

    const selectedStatus =
        String(
            elements.statusFilter
                ?.value
            || "all"
        )
            .trim()
            .toLowerCase();

    return staffList.filter(
        (staff) => {
            if (
                selectedStatus !== "all"
                && staff.status !==
                    selectedStatus
            ) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            const searchableText = [
                staff.displayName,
                staff.username,
                staff.email
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                keyword
            );
        }
    );
}

/**
 * Hiển thị số lượng tài khoản.
 */
function renderSummary() {
    const summary =
        getStaffStatusSummary(
            staffList
        );

    if (elements.totalCount) {
        elements.totalCount.textContent =
            String(summary.total);
    }

    if (elements.pendingCount) {
        elements.pendingCount.textContent =
            String(summary.pending);
    }

    if (elements.approvedCount) {
        elements.approvedCount.textContent =
            String(summary.approved);
    }

    if (elements.lockedCount) {
        elements.lockedCount.textContent =
            String(summary.locked);
    }

    if (elements.deletedCount) {
        elements.deletedCount.textContent =
            String(summary.deleted);
    }
}

/**
 * Tạo các nút phù hợp trạng thái tài khoản.
 */
function renderActionButtons(staff) {
    const uid =
        safe(staff.uid);

    if (
        staff.status ===
        STAFF_STATUS.PENDING
    ) {
        return `
            <button
                type="button"
                class="staff-action-button approve"
                data-action="approve"
                data-uid="${uid}"
            >
                Duyệt
            </button>

            <button
                type="button"
                class="staff-action-button delete"
                data-action="delete"
                data-uid="${uid}"
            >
                Xóa
            </button>
        `;
    }

    if (
        staff.status ===
        STAFF_STATUS.APPROVED
    ) {
        return `
            <button
                type="button"
                class="staff-action-button lock"
                data-action="lock"
                data-uid="${uid}"
            >
                Khóa
            </button>

            <button
                type="button"
                class="staff-action-button delete"
                data-action="delete"
                data-uid="${uid}"
            >
                Xóa
            </button>
        `;
    }

    if (
        staff.status ===
        STAFF_STATUS.LOCKED
    ) {
        return `
            <button
                type="button"
                class="staff-action-button unlock"
                data-action="unlock"
                data-uid="${uid}"
            >
                Mở khóa
            </button>

            <button
                type="button"
                class="staff-action-button delete"
                data-action="delete"
                data-uid="${uid}"
            >
                Xóa
            </button>
        `;
    }

    if (
        staff.status ===
        STAFF_STATUS.DELETED
    ) {
        return `
            <button
                type="button"
                class="staff-action-button restore"
                data-action="restore"
                data-uid="${uid}"
            >
                Khôi phục
            </button>
        `;
    }

    return "";
}

/**
 * Hiển thị bảng nhân viên.
 */
function renderStaffTable() {
    renderSummary();

    const filteredList =
        getFilteredStaffList();

    if (!elements.staffTableBody) {
        return;
    }

    elements.staffTableBody.innerHTML =
        "";

    if (
        filteredList.length === 0
    ) {
        if (elements.emptyState) {
            elements.emptyState.hidden =
                false;
        }

        return;
    }

    if (elements.emptyState) {
        elements.emptyState.hidden =
            true;
    }

    elements.staffTableBody.innerHTML =
        filteredList
            .map((staff, index) => {
                const statusLabel =
                    getStatusLabel(
                        staff.status
                    );

                const statusClass =
                    getStatusClass(
                        staff.status
                    );

                return `
                    <tr>
                        <td
                            class="staff-index-cell"
                            data-label="STT"
                        >
                            ${index + 1}
                        </td>

                        <td data-label="Nhân viên">
                            <div class="staff-user-cell">

                                <div
                                    class="staff-avatar"
                                    aria-hidden="true"
                                >
                                    ${safe(
                                        getInitialLetter(
                                            staff
                                        )
                                    )}
                                </div>

                                <div class="staff-user-info">

                                    <strong>
                                        ${safe(
                                            staff.displayName
                                            || "Chưa có tên"
                                        )}
                                    </strong>

                                    <span>
                                        ${
                                            staff.username
                                                ? `@${safe(
                                                    staff.username
                                                )}`
                                                : "Chưa có username"
                                        }
                                    </span>

                                </div>

                            </div>
                        </td>

                        <td data-label="Email">
                            <span class="staff-email">
                                ${safe(
                                    staff.email
                                    || "Chưa có email"
                                )}
                            </span>
                        </td>

                        <td data-label="Trạng thái">
                            <span
                                class="staff-status-badge ${statusClass}"
                            >
                                ${safe(
                                    statusLabel
                                )}
                            </span>
                        </td>

                        <td data-label="Ngày đăng ký">
                            ${safe(
                                formatDateTime(
                                    staff.createdAt
                                )
                            )}
                        </td>

                        <td data-label="Đăng nhập gần nhất">
                            ${safe(
                                formatDateTime(
                                    staff.lastLoginAt
                                )
                            )}
                        </td>

                        <td data-label="Thao tác">
                            <div class="staff-actions">
                                ${renderActionButtons(
                                    staff
                                )}
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");
}

/**
 * Hiển thị trạng thái tải dữ liệu.
 */
function setLoadingState(loading) {
    const isLoading =
        Boolean(loading);

    if (elements.loadingState) {
        elements.loadingState.hidden =
            !isLoading;
    }

    if (
        elements.emptyState
        && isLoading
    ) {
        elements.emptyState.hidden =
            true;
    }

    if (
        elements.staffTableBody
        && isLoading
    ) {
        elements.staffTableBody.innerHTML =
            "";
    }

    if (elements.refreshButton) {
        elements.refreshButton.disabled =
            isLoading;

        elements.refreshButton.textContent =
            isLoading
                ? "Đang tải..."
                : "Làm mới";
    }
}

/**
 * Hiển thị thông báo thành công hoặc lỗi.
 */
function showPageMessage(
    message,
    type = "success"
) {
    if (!elements.pageMessage) {
        return;
    }

    window.clearTimeout(
        messageTimeoutId
    );

    elements.pageMessage.textContent =
        String(
            message || ""
        );

    elements.pageMessage.className =
        `staff-page-message ${type}`;

    elements.pageMessage.hidden =
        false;

    messageTimeoutId =
        window.setTimeout(
            hidePageMessage,
            4000
        );
}

/**
 * Ẩn thông báo.
 */
function hidePageMessage() {
    if (!elements.pageMessage) {
        return;
    }

    window.clearTimeout(
        messageTimeoutId
    );

    messageTimeoutId = null;

    elements.pageMessage.textContent =
        "";

    elements.pageMessage.className =
        "staff-page-message";

    elements.pageMessage.hidden =
        true;
}

/**
 * Tìm nhân viên theo UID.
 */
function findStaffByUid(uid) {
    const normalizedUid =
        String(uid || "")
            .trim();

    return (
        staffList.find(
            (staff) => {
                return (
                    staff.uid ===
                    normalizedUid
                );
            }
        )
        || null
    );
}

/**
 * Nội dung modal xác nhận theo thao tác.
 */
function getActionConfirmation(
    action,
    staff
) {
    const staffName =
        staff.displayName
        || staff.username
        || staff.email
        || "nhân viên này";

    const configurations = {
        approve: {
            title:
                "Duyệt tài khoản",

            message:
                `Bạn có chắc muốn duyệt tài khoản của ${staffName}? Sau khi duyệt, nhân viên có thể đăng nhập và sử dụng trang bán hàng.`,

            confirmText:
                "Duyệt tài khoản",

            confirmClass:
                "approve"
        },

        lock: {
            title:
                "Khóa tài khoản",

            message:
                `Bạn có chắc muốn khóa tài khoản của ${staffName}? Nhân viên sẽ không thể đăng nhập vào hệ thống.`,

            confirmText:
                "Khóa tài khoản",

            confirmClass:
                "lock"
        },

        unlock: {
            title:
                "Mở khóa tài khoản",

            message:
                `Bạn có chắc muốn mở khóa tài khoản của ${staffName}? Nhân viên sẽ có thể đăng nhập trở lại.`,

            confirmText:
                "Mở khóa",

            confirmClass:
                "unlock"
        },

        delete: {
            title:
                "Xóa tài khoản",

            message:
                `Bạn có chắc muốn xóa tài khoản của ${staffName} khỏi hệ thống? Nhân viên sẽ không thể đăng nhập, nhưng dữ liệu hóa đơn cũ vẫn được giữ lại.`,

            confirmText:
                "Xóa tài khoản",

            confirmClass:
                "delete"
        },

        restore: {
            title:
                "Khôi phục tài khoản",

            message:
                `Bạn có chắc muốn khôi phục tài khoản của ${staffName}? Tài khoản sẽ trở về trạng thái chờ duyệt.`,

            confirmText:
                "Khôi phục",

            confirmClass:
                "restore"
        }
    };

    return (
        configurations[action]
        || null
    );
}

/**
 * Mở modal xác nhận.
 */
function openConfirmModal(
    action,
    staff
) {
    if (isProcessingAction) {
        return;
    }

    const configuration =
        getActionConfirmation(
            action,
            staff
        );

    if (
        !configuration
        || !elements.confirmModal
    ) {
        return;
    }

    pendingAction = {
        action,

        staffUid:
            staff.uid
    };

    if (elements.confirmModalTitle) {
        elements.confirmModalTitle.textContent =
            configuration.title;
    }

    if (
        elements.confirmModalMessage
    ) {
        elements.confirmModalMessage.textContent =
            configuration.message;
    }

    if (
        elements.confirmModalConfirm
    ) {
        elements.confirmModalConfirm.textContent =
            configuration.confirmText;

        elements.confirmModalConfirm.className =
            `staff-confirm-button confirm ${configuration.confirmClass}`;

        elements.confirmModalConfirm.disabled =
            false;

        elements.confirmModalConfirm.dataset.originalText =
            configuration.confirmText;
    }

    if (
        elements.confirmModalCancel
    ) {
        elements.confirmModalCancel.disabled =
            false;
    }

    elements.confirmModal.hidden =
        false;

    elements.confirmModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    window.setTimeout(() => {
        elements.confirmModalConfirm
            ?.focus();
    }, 0);
}

/**
 * Đóng modal.
 */
function closeConfirmModal({
    force = false
} = {}) {
    if (
        !elements.confirmModal
        || (
            isProcessingAction
            && !force
        )
    ) {
        return;
    }

    elements.confirmModal.hidden =
        true;

    elements.confirmModal.setAttribute(
        "aria-hidden",
        "true"
    );

    pendingAction = null;

    document.body.classList.remove(
        "modal-open"
    );

    elements.confirmModalConfirm
        ?.removeAttribute(
            "data-original-text"
        );
}

/**
 * Đổi trạng thái nút xác nhận.
 */
function setConfirmModalLoading(
    loading
) {
    isProcessingAction =
        Boolean(loading);

    if (
        elements.confirmModalCancel
    ) {
        elements.confirmModalCancel.disabled =
            isProcessingAction;
    }

    if (
        elements.confirmModalConfirm
    ) {
        elements.confirmModalConfirm.disabled =
            isProcessingAction;

        if (isProcessingAction) {
            if (
                !elements
                    .confirmModalConfirm
                    .dataset
                    .originalText
            ) {
                elements
                    .confirmModalConfirm
                    .dataset
                    .originalText =
                    elements
                        .confirmModalConfirm
                        .textContent;
            }

            elements.confirmModalConfirm.textContent =
                "Đang xử lý...";

            return;
        }

        const originalText =
            elements
                .confirmModalConfirm
                .dataset
                .originalText;

        if (originalText) {
            elements.confirmModalConfirm.textContent =
                originalText;
        }
    }
}

/**
 * Thực hiện thao tác đã xác nhận.
 */
async function executePendingAction() {
    if (
        !pendingAction
        || isProcessingAction
    ) {
        return;
    }

    const {
        action,
        staffUid
    } = pendingAction;

    setConfirmModalLoading(true);

    try {
        let result;

        switch (action) {
            case "approve":
                result =
                    await approveStaffAccount(
                        staffUid
                    );
                break;

            case "lock":
                result =
                    await lockStaffAccount(
                        staffUid
                    );
                break;

            case "unlock":
                result =
                    await unlockStaffAccount(
                        staffUid
                    );
                break;

            case "delete":
                result =
                    await deleteStaffAccount(
                        staffUid
                    );
                break;

            case "restore":
                result =
                    await restoreStaffAccount(
                        staffUid
                    );
                break;

            default:
                throw new Error(
                    "Thao tác không hợp lệ."
                );
        }

        setConfirmModalLoading(false);

        closeConfirmModal({
            force: true
        });

        showPageMessage(
            result?.message
            || "Thao tác thành công.",
            "success"
        );
    } catch (error) {
        console.error(
            "Không thể xử lý tài khoản:",
            error
        );

        setConfirmModalLoading(false);

        showPageMessage(
            error?.message
            || "Không thể xử lý tài khoản.",
            "error"
        );
    }
}

/**
 * Xử lý click nút trong bảng.
 */
function handleTableClick(event) {
    const actionButton =
        event.target.closest(
            "[data-action][data-uid]"
        );

    if (
        !actionButton
        || isProcessingAction
    ) {
        return;
    }

    const action =
        String(
            actionButton.dataset.action
            || ""
        ).trim();

    const uid =
        String(
            actionButton.dataset.uid
            || ""
        ).trim();

    const staff =
        findStaffByUid(uid);

    if (!staff) {
        showPageMessage(
            "Không tìm thấy tài khoản nhân viên.",
            "error"
        );

        return;
    }

    openConfirmModal(
        action,
        staff
    );
}

/**
 * Bắt đầu theo dõi danh sách nhân viên.
 */
function subscribeStaffAccounts() {
    if (
        typeof unsubscribeStaff ===
        "function"
    ) {
        unsubscribeStaff();
        unsubscribeStaff = null;
    }

    setLoadingState(true);
    hidePageMessage();

    unsubscribeStaff =
        listenStaffAccounts(
            (newStaffList) => {
                staffList =
                    Array.isArray(
                        newStaffList
                    )
                        ? newStaffList
                        : [];

                setLoadingState(false);
                renderStaffTable();
            },

            (error) => {
                console.error(
                    "Không tải được nhân viên:",
                    error
                );

                staffList = [];

                setLoadingState(false);
                renderStaffTable();

                showPageMessage(
                    error?.message
                    || "Không tải được danh sách nhân viên.",
                    "error"
                );
            }
        );
}

/**
 * Làm mới danh sách.
 */
function handleRefresh() {
    if (isProcessingAction) {
        return;
    }

    subscribeStaffAccounts();
}

/**
 * Đóng modal khi bấm nền bên ngoài.
 */
function handleModalBackdropClick(
    event
) {
    if (
        event.target ===
        elements.confirmModal
    ) {
        closeConfirmModal();
    }
}

/**
 * Xử lý phím Escape.
 */
function handleKeydown(event) {
    if (
        event.key === "Escape"
        && elements.confirmModal
        && !elements.confirmModal.hidden
    ) {
        closeConfirmModal();
    }
}

/**
 * Khởi tạo trang quản lý nhân viên.
 */
async function initializeStaffManagement() {
    try {
        setLoadingState(true);

        if (
            window.LARVA_AUTH_READY_PROMISE
        ) {
            const session =
                await window
                    .LARVA_AUTH_READY_PROMISE;

            if (!session) {
                return;
            }

            if (
                session.role !== "admin"
            ) {
                showPageMessage(
                    "Bạn không có quyền quản lý nhân viên.",
                    "error"
                );

                return;
            }
        }

        subscribeStaffAccounts();
    } catch (error) {
        console.error(
            "Không khởi tạo được trang quản lý nhân viên:",
            error
        );

        setLoadingState(false);

        showPageMessage(
            error?.message
            || "Không thể khởi tạo trang quản lý nhân viên.",
            "error"
        );
    }
}

/**
 * Gắn sự kiện tìm kiếm.
 */
elements.searchInput
    ?.addEventListener(
        "input",
        renderStaffTable
    );

/**
 * Gắn sự kiện lọc trạng thái.
 */
elements.statusFilter
    ?.addEventListener(
        "change",
        renderStaffTable
    );

/**
 * Gắn sự kiện làm mới.
 */
elements.refreshButton
    ?.addEventListener(
        "click",
        handleRefresh
    );

/**
 * Dùng event delegation cho các nút trong bảng.
 */
elements.staffTableBody
    ?.addEventListener(
        "click",
        handleTableClick
    );

/**
 * Nút hủy modal.
 */
elements.confirmModalCancel
    ?.addEventListener(
        "click",
        () => {
            closeConfirmModal();
        }
    );

/**
 * Nút xác nhận modal.
 */
elements.confirmModalConfirm
    ?.addEventListener(
        "click",
        executePendingAction
    );

/**
 * Bấm nền modal để đóng.
 */
elements.confirmModal
    ?.addEventListener(
        "click",
        handleModalBackdropClick
    );

/**
 * Đóng modal bằng Escape.
 */
document.addEventListener(
    "keydown",
    handleKeydown
);

/**
 * Hủy listener Firebase khi rời trang.
 */
window.addEventListener(
    "beforeunload",
    () => {
        if (
            typeof unsubscribeStaff ===
            "function"
        ) {
            unsubscribeStaff();
            unsubscribeStaff = null;
        }

        window.clearTimeout(
            messageTimeoutId
        );
    }
);

initializeStaffManagement();