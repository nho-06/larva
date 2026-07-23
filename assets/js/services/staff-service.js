import {
    get,
    onValue,
    ref,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    auth,
    db
} from "../firebase-config.js";

const STAFF_ROLE = "staff";
const ADMIN_ROLE = "admin";

const STAFF_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    LOCKED: "locked",
    DELETED: "deleted"
};

/**
 * Chuẩn hóa chuỗi.
 */
function normalizeText(value) {
    return String(value ?? "")
        .trim();
}

/**
 * Chuẩn hóa email.
 */
function normalizeEmail(value) {
    return normalizeText(value)
        .toLowerCase();
}

/**
 * Chuẩn hóa tên đăng nhập.
 */
function normalizeUsername(value) {
    return normalizeText(value)
        .toLowerCase();
}

/**
 * Chuẩn hóa vai trò.
 *
 * Không tự đổi quyền không hợp lệ thành staff.
 */
function normalizeRole(role) {
    const normalizedRole =
        normalizeText(role)
            .toLowerCase();

    if (
        normalizedRole === ADMIN_ROLE
        || normalizedRole === STAFF_ROLE
    ) {
        return normalizedRole;
    }

    return "";
}

/**
 * Chuẩn hóa trạng thái tài khoản.
 */
function normalizeStatus(status) {
    const normalizedStatus =
        normalizeText(status)
            .toLowerCase();

    if (
        Object.values(
            STAFF_STATUS
        ).includes(normalizedStatus)
    ) {
        return normalizedStatus;
    }

    return "";
}

/**
 * Lấy trạng thái hợp lệ từ dữ liệu tài khoản.
 *
 * Admin cũ chưa có status được xem là approved.
 * Nhân viên cũ chưa có status được xem là pending.
 */
function resolveAccountStatus(profile) {
    const role =
        normalizeRole(
            profile?.role
        );

    const status =
        normalizeStatus(
            profile?.status
        );

    if (status) {
        return status;
    }

    if (role === ADMIN_ROLE) {
        return STAFF_STATUS.APPROVED;
    }

    return STAFF_STATUS.PENDING;
}

/**
 * Kiểm tra người đang thao tác có phải admin không.
 */
async function requireAdmin() {
    const currentUser =
        auth.currentUser;

    if (!currentUser) {
        throw new Error(
            "Bạn chưa đăng nhập."
        );
    }

    const adminSnapshot =
        await get(
            ref(
                db,
                `users/${currentUser.uid}`
            )
        );

    if (!adminSnapshot.exists()) {
        throw new Error(
            "Không tìm thấy thông tin tài khoản admin."
        );
    }

    const adminProfile =
        adminSnapshot.val() || {};

    const adminRole =
        normalizeRole(
            adminProfile.role
        );

    const adminStatus =
        resolveAccountStatus(
            adminProfile
        );

    if (adminRole !== ADMIN_ROLE) {
        throw new Error(
            "Bạn không có quyền quản lý nhân viên."
        );
    }

    if (
        adminStatus !==
        STAFF_STATUS.APPROVED
    ) {
        throw new Error(
            "Tài khoản admin không ở trạng thái hoạt động."
        );
    }

    return {
        uid:
            currentUser.uid,

        email:
            normalizeEmail(
                currentUser.email
                || adminProfile.email
            ),

        displayName:
            normalizeText(
                adminProfile.displayName
                || adminProfile.fullName
                || adminProfile.username
                || "Admin"
            ),

        role:
            ADMIN_ROLE,

        status:
            STAFF_STATUS.APPROVED
    };
}

/**
 * Chuẩn hóa dữ liệu một tài khoản.
 */
function normalizeStaffRecord(
    uid,
    value
) {
    const staff =
        value
        && typeof value === "object"
            ? value
            : {};

    const role =
        normalizeRole(
            staff.role
        );

    const status =
        resolveAccountStatus(
            staff
        );

    return {
        uid:
            normalizeText(uid),

        email:
            normalizeEmail(
                staff.email
            ),

        username:
            normalizeUsername(
                staff.username
            ),

        displayName:
            normalizeText(
                staff.displayName
                || staff.fullName
                || staff.username
                || staff.email
                || "Nhân viên"
            ),

        role,

        status,

        approved:
            status ===
            STAFF_STATUS.APPROVED,

        locked:
            status ===
            STAFF_STATUS.LOCKED,

        deleted:
            status ===
            STAFF_STATUS.DELETED,

        createdAt:
            Number(
                staff.createdAt
                || 0
            ),

        updatedAt:
            Number(
                staff.updatedAt
                || 0
            ),

        approvedAt:
            Number(
                staff.approvedAt
                || 0
            ),

        approvedBy:
            normalizeText(
                staff.approvedBy
            ),

        approvedByName:
            normalizeText(
                staff.approvedByName
            ),

        lockedAt:
            Number(
                staff.lockedAt
                || 0
            ),

        lockedBy:
            normalizeText(
                staff.lockedBy
            ),

        lockedByName:
            normalizeText(
                staff.lockedByName
            ),

        unlockedAt:
            Number(
                staff.unlockedAt
                || 0
            ),

        unlockedBy:
            normalizeText(
                staff.unlockedBy
            ),

        unlockedByName:
            normalizeText(
                staff.unlockedByName
            ),

        deletedAt:
            Number(
                staff.deletedAt
                || 0
            ),

        deletedBy:
            normalizeText(
                staff.deletedBy
            ),

        deletedByName:
            normalizeText(
                staff.deletedByName
            ),

        restoredAt:
            Number(
                staff.restoredAt
                || 0
            ),

        restoredBy:
            normalizeText(
                staff.restoredBy
            ),

        restoredByName:
            normalizeText(
                staff.restoredByName
            ),

        lastLoginAt:
            Number(
                staff.lastLoginAt
                || 0
            )
    };
}

/**
 * Chuyển object users thành danh sách nhân viên.
 */
function convertUsersToStaffList(users) {
    if (
        !users
        || typeof users !== "object"
    ) {
        return [];
    }

    const statusPriority = {
        pending: 1,
        approved: 2,
        locked: 3,
        deleted: 4
    };

    return Object.entries(users)
        .map(([uid, value]) => {
            return normalizeStaffRecord(
                uid,
                value
            );
        })
        .filter((account) => {
            return (
                account.role ===
                STAFF_ROLE
            );
        })
        .sort((first, second) => {
            const firstPriority =
                statusPriority[
                    first.status
                ] || 99;

            const secondPriority =
                statusPriority[
                    second.status
                ] || 99;

            if (
                firstPriority !==
                secondPriority
            ) {
                return (
                    firstPriority
                    - secondPriority
                );
            }

            return (
                second.createdAt
                - first.createdAt
            );
        });
}

/**
 * Chờ auth-guard xác minh xong nếu có.
 */
async function waitForAuthReady() {
    if (
        window.LARVA_AUTH_READY_PROMISE
    ) {
        const session =
            await window
                .LARVA_AUTH_READY_PROMISE;

        if (!session) {
            throw new Error(
                "Bạn chưa đăng nhập."
            );
        }

        if (
            session.role !==
            ADMIN_ROLE
        ) {
            throw new Error(
                "Bạn không có quyền quản lý nhân viên."
            );
        }
    }

    return requireAdmin();
}

/**
 * Theo dõi danh sách nhân viên theo thời gian thực.
 *
 * Trả về hàm unsubscribe.
 */
export function listenStaffAccounts(
    callback,
    errorCallback
) {
    let unsubscribeDatabase =
        null;

    let isCancelled =
        false;

    waitForAuthReady()
        .then(() => {
            if (isCancelled) {
                return;
            }

            const usersRef =
                ref(
                    db,
                    "users"
                );

            unsubscribeDatabase =
                onValue(
                    usersRef,

                    (snapshot) => {
                        const users =
                            snapshot.exists()
                                ? snapshot.val()
                                : {};

                        const staffList =
                            convertUsersToStaffList(
                                users
                            );

                        callback?.(
                            staffList
                        );
                    },

                    (error) => {
                        console.error(
                            "Không tải được danh sách nhân viên:",
                            error
                        );

                        errorCallback?.(
                            normalizeDatabaseError(
                                error,
                                "Không tải được danh sách nhân viên."
                            )
                        );
                    }
                );
        })
        .catch((error) => {
            console.error(
                "Không thể bắt đầu tải danh sách nhân viên:",
                error
            );

            errorCallback?.(
                error
            );
        });

    return () => {
        isCancelled = true;

        if (
            typeof unsubscribeDatabase
            === "function"
        ) {
            unsubscribeDatabase();
        }
    };
}

/**
 * Đọc một tài khoản nhân viên.
 */
export async function getStaffAccount(
    staffUid
) {
    await waitForAuthReady();

    const normalizedUid =
        normalizeText(
            staffUid
        );

    if (!normalizedUid) {
        throw new Error(
            "Thiếu mã tài khoản nhân viên."
        );
    }

    const staffSnapshot =
        await get(
            ref(
                db,
                `users/${normalizedUid}`
            )
        );

    if (!staffSnapshot.exists()) {
        throw new Error(
            "Không tìm thấy tài khoản nhân viên."
        );
    }

    const staff =
        normalizeStaffRecord(
            normalizedUid,
            staffSnapshot.val()
        );

    if (
        staff.role !==
        STAFF_ROLE
    ) {
        throw new Error(
            "Tài khoản này không phải tài khoản nhân viên."
        );
    }

    return staff;
}

/**
 * Kiểm tra dữ liệu trước khi admin thao tác.
 */
async function prepareStaffAction(
    staffUid
) {
    const admin =
        await waitForAuthReady();

    const normalizedUid =
        normalizeText(
            staffUid
        );

    if (!normalizedUid) {
        throw new Error(
            "Thiếu mã tài khoản nhân viên."
        );
    }

    if (
        normalizedUid ===
        admin.uid
    ) {
        throw new Error(
            "Bạn không thể thao tác trên chính tài khoản đang đăng nhập."
        );
    }

    const staffSnapshot =
        await get(
            ref(
                db,
                `users/${normalizedUid}`
            )
        );

    if (!staffSnapshot.exists()) {
        throw new Error(
            "Không tìm thấy tài khoản nhân viên."
        );
    }

    const staff =
        normalizeStaffRecord(
            normalizedUid,
            staffSnapshot.val()
        );

    if (
        staff.role === ADMIN_ROLE
    ) {
        throw new Error(
            "Không được thao tác trên tài khoản admin."
        );
    }

    if (
        staff.role !== STAFF_ROLE
    ) {
        throw new Error(
            "Tài khoản không có vai trò hợp lệ."
        );
    }

    return {
        admin,
        staff
    };
}

/**
 * Duyệt tài khoản nhân viên.
 */
export async function approveStaffAccount(
    staffUid
) {
    const {
        admin,
        staff
    } = await prepareStaffAction(
        staffUid
    );

    if (
        staff.status ===
        STAFF_STATUS.DELETED
    ) {
        throw new Error(
            "Tài khoản đã bị xóa. Hãy khôi phục trước khi duyệt."
        );
    }

    if (
        staff.status ===
        STAFF_STATUS.APPROVED
    ) {
        throw new Error(
            "Tài khoản đã được duyệt trước đó."
        );
    }

    const now =
        Date.now();

    try {
        await update(
            ref(
                db,
                `users/${staff.uid}`
            ),
            {
                status:
                    STAFF_STATUS.APPROVED,

                approved:
                    true,

                locked:
                    false,

                deleted:
                    false,

                approvedAt:
                    now,

                approvedBy:
                    admin.uid,

                approvedByName:
                    admin.displayName,

                lockedAt:
                    null,

                lockedBy:
                    null,

                lockedByName:
                    null,

                deletedAt:
                    null,

                deletedBy:
                    null,

                deletedByName:
                    null,

                restoredAt:
                    null,

                restoredBy:
                    null,

                restoredByName:
                    null,

                updatedAt:
                    now
            }
        );

        return {
            success: true,

            message:
                `Đã duyệt tài khoản ${
                    staff.displayName
                    || staff.email
                }.`
        };
    } catch (error) {
        throw normalizeDatabaseError(
            error,
            "Không thể duyệt tài khoản nhân viên."
        );
    }
}

/**
 * Khóa tài khoản nhân viên.
 */
export async function lockStaffAccount(
    staffUid
) {
    const {
        admin,
        staff
    } = await prepareStaffAction(
        staffUid
    );

    if (
        staff.status ===
        STAFF_STATUS.DELETED
    ) {
        throw new Error(
            "Tài khoản đã bị xóa."
        );
    }

    if (
        staff.status ===
        STAFF_STATUS.LOCKED
    ) {
        throw new Error(
            "Tài khoản đã bị khóa trước đó."
        );
    }

    if (
        staff.status ===
        STAFF_STATUS.PENDING
    ) {
        throw new Error(
            "Tài khoản đang chờ duyệt. Bạn có thể xóa tài khoản này thay vì khóa."
        );
    }

    const now =
        Date.now();

    try {
        await update(
            ref(
                db,
                `users/${staff.uid}`
            ),
            {
                status:
                    STAFF_STATUS.LOCKED,

                approved:
                    false,

                locked:
                    true,

                deleted:
                    false,

                lockedAt:
                    now,

                lockedBy:
                    admin.uid,

                lockedByName:
                    admin.displayName,

                updatedAt:
                    now
            }
        );

        return {
            success: true,

            message:
                `Đã khóa tài khoản ${
                    staff.displayName
                    || staff.email
                }.`
        };
    } catch (error) {
        throw normalizeDatabaseError(
            error,
            "Không thể khóa tài khoản nhân viên."
        );
    }
}

/**
 * Mở khóa tài khoản.
 *
 * Sau khi mở khóa, tài khoản trở lại approved.
 */
export async function unlockStaffAccount(
    staffUid
) {
    const {
        admin,
        staff
    } = await prepareStaffAction(
        staffUid
    );

    if (
        staff.status ===
        STAFF_STATUS.DELETED
    ) {
        throw new Error(
            "Tài khoản đã bị xóa. Hãy khôi phục tài khoản trước."
        );
    }

    if (
        staff.status !==
        STAFF_STATUS.LOCKED
    ) {
        throw new Error(
            "Tài khoản hiện không bị khóa."
        );
    }

    const now =
        Date.now();

    try {
        await update(
            ref(
                db,
                `users/${staff.uid}`
            ),
            {
                status:
                    STAFF_STATUS.APPROVED,

                approved:
                    true,

                locked:
                    false,

                deleted:
                    false,

                unlockedAt:
                    now,

                unlockedBy:
                    admin.uid,

                unlockedByName:
                    admin.displayName,

                updatedAt:
                    now
            }
        );

        return {
            success: true,

            message:
                `Đã mở khóa tài khoản ${
                    staff.displayName
                    || staff.email
                }.`
        };
    } catch (error) {
        throw normalizeDatabaseError(
            error,
            "Không thể mở khóa tài khoản nhân viên."
        );
    }
}

/**
 * Xóa mềm tài khoản nhân viên.
 *
 * Đây không phải xóa tài khoản trong Firebase Authentication.
 * Web chạy phía trình duyệt không có quyền Admin SDK.
 *
 * Sau khi xóa mềm:
 * - Nhân viên không vào được hệ thống.
 * - Thông tin cũ trong hóa đơn vẫn được giữ.
 * - Admin có thể khôi phục.
 */
export async function deleteStaffAccount(
    staffUid
) {
    const {
        admin,
        staff
    } = await prepareStaffAction(
        staffUid
    );

    if (
        staff.status ===
        STAFF_STATUS.DELETED
    ) {
        throw new Error(
            "Tài khoản đã được xóa trước đó."
        );
    }

    const now =
        Date.now();

    try {
        await update(
            ref(
                db,
                `users/${staff.uid}`
            ),
            {
                status:
                    STAFF_STATUS.DELETED,

                approved:
                    false,

                locked:
                    true,

                deleted:
                    true,

                deletedAt:
                    now,

                deletedBy:
                    admin.uid,

                deletedByName:
                    admin.displayName,

                lockedAt:
                    now,

                lockedBy:
                    admin.uid,

                lockedByName:
                    admin.displayName,

                updatedAt:
                    now
            }
        );

        return {
            success: true,

            message:
                `Đã xóa tài khoản ${
                    staff.displayName
                    || staff.email
                } khỏi hệ thống.`
        };
    } catch (error) {
        throw normalizeDatabaseError(
            error,
            "Không thể xóa tài khoản nhân viên."
        );
    }
}

/**
 * Khôi phục tài khoản đã xóa mềm.
 *
 * Sau khi khôi phục:
 * - Tài khoản chuyển về pending.
 * - Admin phải duyệt lại.
 */
export async function restoreStaffAccount(
    staffUid
) {
    const {
        admin,
        staff
    } = await prepareStaffAction(
        staffUid
    );

    if (
        staff.status !==
        STAFF_STATUS.DELETED
    ) {
        throw new Error(
            "Tài khoản này chưa bị xóa."
        );
    }

    const now =
        Date.now();

    try {
        await update(
            ref(
                db,
                `users/${staff.uid}`
            ),
            {
                status:
                    STAFF_STATUS.PENDING,

                approved:
                    false,

                locked:
                    false,

                deleted:
                    false,

                restoredAt:
                    now,

                restoredBy:
                    admin.uid,

                restoredByName:
                    admin.displayName,

                deletedAt:
                    null,

                deletedBy:
                    null,

                deletedByName:
                    null,

                lockedAt:
                    null,

                lockedBy:
                    null,

                lockedByName:
                    null,

                approvedAt:
                    null,

                approvedBy:
                    null,

                approvedByName:
                    null,

                updatedAt:
                    now
            }
        );

        return {
            success: true,

            message:
                `Đã khôi phục tài khoản ${
                    staff.displayName
                    || staff.email
                }. Tài khoản đang chờ duyệt lại.`
        };
    } catch (error) {
        throw normalizeDatabaseError(
            error,
            "Không thể khôi phục tài khoản nhân viên."
        );
    }
}

/**
 * Đếm tài khoản theo trạng thái.
 */
export function getStaffStatusSummary(
    staffList
) {
    const summary = {
        total: 0,
        pending: 0,
        approved: 0,
        locked: 0,
        deleted: 0
    };

    if (!Array.isArray(staffList)) {
        return summary;
    }

    staffList.forEach((staff) => {
        const status =
            normalizeStatus(
                staff?.status
            );

        summary.total += 1;

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    summary,
                    status
                )
        ) {
            summary[status] += 1;
        }
    });

    return summary;
}

/**
 * Chuyển lỗi Database thành thông báo dễ hiểu.
 */
function normalizeDatabaseError(
    error,
    fallbackMessage
) {
    const code =
        String(
            error?.code || ""
        );

    const message =
        String(
            error?.message || ""
        );

    if (
        code === "PERMISSION_DENIED"
        || message.includes(
            "Permission denied"
        )
        || message.includes(
            "PERMISSION_DENIED"
        )
    ) {
        return new Error(
            "Firebase Database Rules đang chặn thao tác quản lý nhân viên."
        );
    }

    if (
        message.includes(
            "network"
        )
        || message.includes(
            "Network"
        )
    ) {
        return new Error(
            "Không thể kết nối Firebase. Vui lòng kiểm tra mạng."
        );
    }

    return new Error(
        message
        || fallbackMessage
        || "Không thể xử lý tài khoản nhân viên."
    );
}

export {
    STAFF_STATUS
};