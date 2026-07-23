import {
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    get,
    ref,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    auth,
    db
} from "../firebase-config.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";

export const USER_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    LOCKED: "locked",
    DELETED: "deleted"
};

export const USER_ROLE = {
    ADMIN: "admin",
    STAFF: "staff"
};

/**
 * Chuẩn hóa email.
 */
export function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

/**
 * Chuẩn hóa tên đăng nhập.
 *
 * Chỉ giữ:
 * - Chữ cái
 * - Chữ số
 * - Dấu gạch dưới
 * - Dấu chấm
 */
export function normalizeUsername(username) {
    return String(username || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(
            /[^a-z0-9._]/g,
            ""
        );
}

/**
 * Chuẩn hóa họ và tên.
 */
export function normalizeDisplayName(
    displayName
) {
    return String(displayName || "")
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Chuẩn hóa vai trò.
 */
export function normalizeRole(role) {
    const normalizedRole =
        String(role || "")
            .trim()
            .toLowerCase();

    if (
        normalizedRole ===
        USER_ROLE.ADMIN
    ) {
        return USER_ROLE.ADMIN;
    }

    return USER_ROLE.STAFF;
}

/**
 * Chuẩn hóa trạng thái.
 */
export function normalizeStatus(status) {
    const normalizedStatus =
        String(status || "")
            .trim()
            .toLowerCase();

    if (
        Object.values(USER_STATUS)
            .includes(normalizedStatus)
    ) {
        return normalizedStatus;
    }

    return USER_STATUS.PENDING;
}

/**
 * Kiểm tra email hợp lệ.
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(email || "")
        );
}

/**
 * Kiểm tra username hợp lệ.
 */
function isValidUsername(username) {
    return /^[a-z0-9._]{3,30}$/
        .test(
            String(username || "")
        );
}

/**
 * Chuyển dữ liệu profile thành dữ liệu dùng trong phiên.
 */
function createSessionProfile({
    user,
    profile
}) {
    const role =
        normalizeRole(
            profile?.role
        );

    const rawStatus =
        String(
            profile?.status || ""
        )
            .trim()
            .toLowerCase();

    /*
        Hỗ trợ tài khoản admin cũ
        chưa có trường status.
    */
    const status =
        role === USER_ROLE.ADMIN
        && !rawStatus
            ? USER_STATUS.APPROVED
            : normalizeStatus(
                rawStatus
            );

    return {
        uid:
            user?.uid
            || profile?.uid
            || "",

        email:
            normalizeEmail(
                user?.email
                || profile?.email
            ),

        username:
            normalizeUsername(
                profile?.username
            ),

        displayName:
            normalizeDisplayName(
                profile?.displayName
                || profile?.fullName
            ),

        role,
        status
    };
}

/**
 * Lưu profile trong sessionStorage.
 */
export function saveSessionProfile(profile) {
    try {
        if (!profile) {
            sessionStorage.removeItem(
                SESSION_PROFILE_KEY
            );

            return;
        }

        sessionStorage.setItem(
            SESSION_PROFILE_KEY,
            JSON.stringify(profile)
        );
    } catch (error) {
        console.warn(
            "Không lưu được phiên đăng nhập:",
            error
        );
    }
}

/**
 * Đọc profile từ sessionStorage.
 */
export function getSavedSessionProfile() {
    try {
        const rawProfile =
            sessionStorage.getItem(
                SESSION_PROFILE_KEY
            );

        if (!rawProfile) {
            return null;
        }

        const profile =
            JSON.parse(rawProfile);

        if (
            !profile
            || typeof profile !== "object"
            || !profile.uid
        ) {
            clearSessionProfile();

            return null;
        }

        return {
            ...profile,
            role:
                normalizeRole(
                    profile.role
                ),
            status:
                normalizeStatus(
                    profile.status
                )
        };
    } catch (error) {
        console.error(
            "Không đọc được phiên đăng nhập:",
            error
        );

        clearSessionProfile();

        return null;
    }
}

/**
 * Xóa profile đã lưu.
 */
export function clearSessionProfile() {
    try {
        sessionStorage.removeItem(
            SESSION_PROFILE_KEY
        );
    } catch (error) {
        console.warn(
            "Không xóa được phiên đăng nhập:",
            error
        );
    }
}

/**
 * Đọc thông tin tài khoản theo UID.
 */
export async function getUserProfile(uid) {
    const normalizedUid =
        String(uid || "")
            .trim();

    if (!normalizedUid) {
        return null;
    }

    const profileSnapshot =
        await get(
            ref(
                db,
                `users/${normalizedUid}`
            )
        );

    if (!profileSnapshot.exists()) {
        return null;
    }

    const profile =
        profileSnapshot.val();

    const role =
        normalizeRole(
            profile?.role
        );

    const rawStatus =
        String(
            profile?.status || ""
        )
            .trim()
            .toLowerCase();

    const status =
        role === USER_ROLE.ADMIN
        && !rawStatus
            ? USER_STATUS.APPROVED
            : normalizeStatus(
                rawStatus
            );

    return {
        ...profile,

        uid:
            normalizedUid,

        email:
            normalizeEmail(
                profile?.email
            ),

        username:
            normalizeUsername(
                profile?.username
            ),

        displayName:
            normalizeDisplayName(
                profile?.displayName
                || profile?.fullName
            ),

        role,
        status
    };
}

/**
 * Kiểm tra tài khoản được phép đăng nhập không.
 */
export function getAccountAccessResult(
    profile
) {
    if (!profile) {
        return {
            allowed: false,
            code: "PROFILE_NOT_FOUND",
            message:
                "Không tìm thấy thông tin tài khoản."
        };
    }

    const role =
        normalizeRole(
            profile.role
        );

    const originalStatus =
        String(
            profile.status || ""
        )
            .trim()
            .toLowerCase();

    /*
        Admin cũ chưa có status
        vẫn được phép đăng nhập.
    */
    if (
        role === USER_ROLE.ADMIN
        && !originalStatus
    ) {
        return {
            allowed: true,
            code: "APPROVED",
            message:
                "Tài khoản được phép đăng nhập."
        };
    }

    const status =
        normalizeStatus(
            profile.status
        );

    if (
        status === USER_STATUS.PENDING
    ) {
        return {
            allowed: false,
            code: "PENDING_APPROVAL",
            message:
                "Tài khoản đang chờ admin xác nhận."
        };
    }

    if (
        status === USER_STATUS.LOCKED
    ) {
        return {
            allowed: false,
            code: "ACCOUNT_LOCKED",
            message:
                "Tài khoản đã bị khóa. Vui lòng liên hệ admin."
        };
    }

    if (
        status === USER_STATUS.DELETED
    ) {
        return {
            allowed: false,
            code: "ACCOUNT_DELETED",
            message:
                "Tài khoản đã bị xóa khỏi hệ thống."
        };
    }

    if (
        status !== USER_STATUS.APPROVED
    ) {
        return {
            allowed: false,
            code: "ACCOUNT_NOT_APPROVED",
            message:
                "Tài khoản chưa được phép sử dụng."
        };
    }

    return {
        allowed: true,
        code: "APPROVED",
        message:
            "Tài khoản được phép đăng nhập."
    };
}

/**
 * Đăng nhập bằng email và mật khẩu.
 */
export async function loginAccount(
    email,
    password
) {
    const normalizedEmail =
        normalizeEmail(email);

    const normalizedPassword =
        String(password || "");

    if (!normalizedEmail) {
        throw new Error(
            "Vui lòng nhập email."
        );
    }

    if (
        !isValidEmail(
            normalizedEmail
        )
    ) {
        throw new Error(
            "Email đăng nhập không hợp lệ."
        );
    }

    if (!normalizedPassword) {
        throw new Error(
            "Vui lòng nhập mật khẩu."
        );
    }

    try {
        const credential =
            await signInWithEmailAndPassword(
                auth,
                normalizedEmail,
                normalizedPassword
            );

        const user =
            credential.user;

        const profile =
            await getUserProfile(
                user.uid
            );

        if (!profile) {
            await safeSignOut();

            throw new Error(
                "Tài khoản đã tồn tại trong Firebase Authentication nhưng chưa có dữ liệu trong users."
            );
        }

        const accessResult =
            getAccountAccessResult(
                profile
            );

        if (!accessResult.allowed) {
            await safeSignOut();

            throw new Error(
                accessResult.message
            );
        }

        const sessionProfile =
            createSessionProfile({
                user,
                profile
            });

        saveSessionProfile(
            sessionProfile
        );

        /*
            Không chờ cập nhật thời gian
            để đăng nhập nhanh hơn.
        */
        update(
            ref(
                db,
                `users/${user.uid}`
            ),
            {
                lastLoginAt:
                    Date.now(),

                updatedAt:
                    Date.now()
            }
        ).catch((error) => {
            console.warn(
                "Không cập nhật được thời gian đăng nhập:",
                error
            );
        });

        return {
            user,
            profile:
                sessionProfile
        };
    } catch (error) {
        clearSessionProfile();

        throw normalizeAuthError(
            error
        );
    }
}

/**
 * Nhân viên tự đăng ký.
 *
 * Tài khoản mới:
 * role: staff
 * status: pending
 *
 * Admin phải duyệt trước khi đăng nhập.
 */
export async function registerStaffAccount({
    email,
    password,
    username,
    displayName
}) {
    const normalizedEmail =
        normalizeEmail(email);

    const normalizedPassword =
        String(password || "");

    const normalizedUsername =
        normalizeUsername(username);

    const normalizedDisplayName =
        normalizeDisplayName(
            displayName
        );

    if (!normalizedDisplayName) {
        throw new Error(
            "Vui lòng nhập họ và tên."
        );
    }

    if (
        normalizedDisplayName.length < 2
    ) {
        throw new Error(
            "Họ và tên phải có ít nhất 2 ký tự."
        );
    }

    if (!normalizedUsername) {
        throw new Error(
            "Vui lòng nhập tên đăng nhập."
        );
    }

    if (
        !isValidUsername(
            normalizedUsername
        )
    ) {
        throw new Error(
            "Tên đăng nhập phải có từ 3 đến 30 ký tự và chỉ gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới."
        );
    }

    if (!normalizedEmail) {
        throw new Error(
            "Vui lòng nhập email."
        );
    }

    if (
        !isValidEmail(
            normalizedEmail
        )
    ) {
        throw new Error(
            "Email không hợp lệ."
        );
    }

    if (!normalizedPassword) {
        throw new Error(
            "Vui lòng nhập mật khẩu."
        );
    }

    if (
        normalizedPassword.length < 6
    ) {
        throw new Error(
            "Mật khẩu phải có ít nhất 6 ký tự."
        );
    }

    /*
        Kiểm tra username đã tồn tại chưa.

        Database Rules phải cho phép đọc:
        usernames/{username}
    */
    let usernameSnapshot;

    try {
        usernameSnapshot =
            await get(
                ref(
                    db,
                    `usernames/${normalizedUsername}`
                )
            );
    } catch (error) {
        if (
            String(
                error?.code || ""
            ) === "PERMISSION_DENIED"
            || String(
                error?.message || ""
            ).includes(
                "Permission denied"
            )
        ) {
            throw new Error(
                "Firebase Database Rules đang chặn kiểm tra tên đăng nhập."
            );
        }

        throw error;
    }

    if (
        usernameSnapshot.exists()
    ) {
        throw new Error(
            "Tên đăng nhập đã được sử dụng."
        );
    }

    let createdUser = null;

    try {
        const credential =
            await createUserWithEmailAndPassword(
                auth,
                normalizedEmail,
                normalizedPassword
            );

        createdUser =
            credential.user;

        const now =
            Date.now();

        const profile = {
            uid:
                createdUser.uid,

            email:
                normalizedEmail,

            username:
                normalizedUsername,

            displayName:
                normalizedDisplayName,

            role:
                USER_ROLE.STAFF,

            status:
                USER_STATUS.PENDING,

            approved:
                false,

            locked:
                false,

            deleted:
                false,

            createdAt:
                now,

            updatedAt:
                now,

            approvedAt:
                null,

            approvedBy:
                null,

            lockedAt:
                null,

            lockedBy:
                null,

            deletedAt:
                null,

            deletedBy:
                null,

            lastLoginAt:
                null
        };

        /*
            Lưu cùng lúc:
            - users/{uid}
            - usernames/{username}

            Nếu một phần lỗi thì toàn bộ update bị hủy.
        */
        await update(
            ref(db),
            {
                [`users/${createdUser.uid}`]:
                    profile,

                [`usernames/${normalizedUsername}`]:
                    {
                        uid:
                            createdUser.uid,

                        email:
                            normalizedEmail,

                        createdAt:
                            now
                    }
            }
        );

        /*
            Tài khoản đang pending,
            bắt buộc đăng xuất sau đăng ký.
        */
        await safeSignOut();

        return {
            success: true,

            userId:
                createdUser.uid,

            profile,

            message:
                "Đăng ký thành công. Tài khoản đang chờ admin xác nhận."
        };
    } catch (error) {
        /*
            Nếu đã tạo Authentication nhưng không ghi được Database,
            thử xóa tài khoản Auth vừa tạo để tránh tài khoản bị thiếu profile.
        */
        if (
            createdUser
            && auth.currentUser?.uid ===
                createdUser.uid
        ) {
            try {
                await deleteUser(
                    createdUser
                );
            } catch (
                deleteError
            ) {
                console.warn(
                    "Không xóa được tài khoản Auth sau khi lưu Database thất bại:",
                    deleteError
                );
            }
        }

        await safeSignOut();

        throw normalizeAuthError(
            error
        );
    }
}

/**
 * Đăng xuất tài khoản.
 */
export async function logout() {
    await safeSignOut();
}

/**
 * Đăng xuất an toàn.
 */
async function safeSignOut() {
    try {
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch (error) {
        console.warn(
            "Không đăng xuất được Firebase:",
            error
        );
    } finally {
        clearSessionProfile();
    }
}

/**
 * Theo dõi trạng thái Firebase Authentication.
 */
export function observeAuthState(
    callback
) {
    return onAuthStateChanged(
        auth,
        async (user) => {
            if (!user) {
                clearSessionProfile();

                callback?.(null);

                return;
            }

            try {
                const profile =
                    await getUserProfile(
                        user.uid
                    );

                if (!profile) {
                    await safeSignOut();

                    callback?.({
                        user: null,

                        profile: null,

                        accessResult: {
                            allowed: false,

                            code:
                                "PROFILE_NOT_FOUND",

                            message:
                                "Không tìm thấy thông tin tài khoản."
                        }
                    });

                    return;
                }

                const accessResult =
                    getAccountAccessResult(
                        profile
                    );

                if (!accessResult.allowed) {
                    await safeSignOut();

                    callback?.({
                        user: null,
                        profile,
                        accessResult
                    });

                    return;
                }

                const sessionProfile =
                    createSessionProfile({
                        user,
                        profile
                    });

                saveSessionProfile(
                    sessionProfile
                );

                callback?.({
                    user,

                    profile:
                        sessionProfile,

                    accessResult
                });
            } catch (error) {
                console.error(
                    "Lỗi kiểm tra trạng thái đăng nhập:",
                    error
                );

                clearSessionProfile();

                callback?.({
                    user: null,

                    profile: null,

                    accessResult: {
                        allowed: false,

                        code:
                            "AUTH_STATE_ERROR",

                        message:
                            "Không kiểm tra được phiên đăng nhập."
                    },

                    error
                });
            }
        }
    );
}

/**
 * Chuyển lỗi Firebase thành thông báo dễ hiểu.
 */
function normalizeAuthError(error) {
    const code =
        String(
            error?.code || ""
        );

    const rawMessage =
        String(
            error?.message || ""
        );

    /*
        Giữ nguyên lỗi do code tự tạo.
    */
    if (
        rawMessage
        && !rawMessage.startsWith(
            "Firebase:"
        )
    ) {
        return new Error(
            rawMessage
        );
    }

    const errorMessages = {
        "auth/email-already-in-use":
            "Email này đã được đăng ký.",

        "auth/invalid-email":
            "Email không hợp lệ.",

        "auth/weak-password":
            "Mật khẩu quá yếu. Vui lòng dùng ít nhất 6 ký tự.",

        "auth/missing-password":
            "Vui lòng nhập mật khẩu.",

        "auth/invalid-credential":
            "Email hoặc mật khẩu không đúng.",

        "auth/invalid-login-credentials":
            "Email hoặc mật khẩu không đúng.",

        "auth/user-disabled":
            "Tài khoản Firebase Authentication đã bị vô hiệu hóa.",

        "auth/user-not-found":
            "Không tìm thấy tài khoản.",

        "auth/wrong-password":
            "Email hoặc mật khẩu không đúng.",

        "auth/too-many-requests":
            "Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.",

        "auth/network-request-failed":
            "Không thể kết nối Firebase. Vui lòng kiểm tra mạng.",

        "auth/operation-not-allowed":
            "Firebase chưa bật phương thức đăng nhập Email/Password.",

        "auth/internal-error":
            "Firebase gặp lỗi nội bộ. Vui lòng thử lại."
    };

    return new Error(
        errorMessages[code]
        || rawMessage
        || "Không thể xử lý tài khoản."
    );
}