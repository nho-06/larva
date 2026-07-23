import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    get,
    ref
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    auth,
    db
} from "../firebase-config.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";

const AUTH_MESSAGE_KEY =
    "larva_auth_message";

const LOGIN_PAGE =
    "login.html";

const REGISTER_PAGE =
    "register.html";

const DEFAULT_ADMIN_PAGE =
    "index.html";

const DEFAULT_STAFF_PAGE =
    "sales.html";

const ADMIN_ROLE =
    "admin";

const STAFF_ROLE =
    "staff";

const ACCOUNT_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    LOCKED: "locked",
    DELETED: "deleted"
};

/**
 * Các trang admin được phép truy cập.
 *
 * Khi tạo thêm trang quản trị mới,
 * phải thêm tên file vào đây.
 */
const ADMIN_ALLOWED_PAGES = [
    "index.html",
    "products.html",
    "sales.html",
    "statistics.html",
    "order-history.html",
    "discount-management.html",
    "staff-management.html"
];

/**
 * Nhân viên chỉ được sử dụng trang bán hàng.
 */
const STAFF_ALLOWED_PAGES = [
    "sales.html"
];

/**
 * Những trang người chưa đăng nhập vẫn được mở.
 */
const PUBLIC_PAGES = [
    LOGIN_PAGE,
    REGISTER_PAGE
];

let authReadyResolved = false;

/**
 * Lấy tên trang hiện tại.
 */
function getCurrentPage() {
    const pathname =
        String(
            window.location.pathname || ""
        );

    const pageName =
        pathname
            .split("/")
            .filter(Boolean)
            .pop();

    return pageName || DEFAULT_ADMIN_PAGE;
}

/**
 * Chuẩn hóa quyền tài khoản.
 */
function normalizeRole(role) {
    const normalizedRole =
        String(role || "")
            .trim()
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
        String(status || "")
            .trim()
            .toLowerCase();

    if (
        Object.values(
            ACCOUNT_STATUS
        ).includes(normalizedStatus)
    ) {
        return normalizedStatus;
    }

    return "";
}

/**
 * Đọc profile đang lưu trong tab hiện tại.
 */
function readSavedProfile() {
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
            clearSavedProfile();

            return null;
        }

        return profile;
    } catch (error) {
        console.warn(
            "Không đọc được profile đã lưu:",
            error
        );

        clearSavedProfile();

        return null;
    }
}

/**
 * Lưu profile sau khi Firebase xác thực thành công.
 */
function saveProfile(profile) {
    try {
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
 * Xóa profile khỏi sessionStorage.
 */
function clearSavedProfile() {
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
 * Lưu thông báo để login.html hiển thị.
 */
function setAuthMessage(message) {
    try {
        if (!message) {
            sessionStorage.removeItem(
                AUTH_MESSAGE_KEY
            );

            return;
        }

        sessionStorage.setItem(
            AUTH_MESSAGE_KEY,
            String(message)
        );
    } catch (error) {
        console.warn(
            "Không lưu được thông báo đăng nhập:",
            error
        );
    }
}

/**
 * Kiểm tra trang hiện tại có phải trang công khai không.
 */
function isPublicPage(pageName) {
    return PUBLIC_PAGES.includes(
        pageName
    );
}

/**
 * Kiểm tra tài khoản có được vào trang hiện tại không.
 */
function isPageAllowed(
    pageName,
    role
) {
    const normalizedRole =
        normalizeRole(role);

    if (
        normalizedRole === ADMIN_ROLE
    ) {
        return ADMIN_ALLOWED_PAGES.includes(
            pageName
        );
    }

    if (
        normalizedRole === STAFF_ROLE
    ) {
        return STAFF_ALLOWED_PAGES.includes(
            pageName
        );
    }

    return false;
}

/**
 * Lấy trang mặc định theo quyền.
 */
function getDefaultPageByRole(role) {
    const normalizedRole =
        normalizeRole(role);

    if (
        normalizedRole === ADMIN_ROLE
    ) {
        return DEFAULT_ADMIN_PAGE;
    }

    if (
        normalizedRole === STAFF_ROLE
    ) {
        return DEFAULT_STAFF_PAGE;
    }

    return LOGIN_PAGE;
}

/**
 * Chuyển trang nhưng không thêm lịch sử trình duyệt.
 */
function redirectTo(pageName) {
    const normalizedPage =
        String(pageName || "")
            .trim();

    if (!normalizedPage) {
        return;
    }

    const currentPage =
        getCurrentPage();

    if (
        currentPage === normalizedPage
    ) {
        return;
    }

    window.location.replace(
        `./${normalizedPage}`
    );
}

/**
 * Chuyển trang theo quyền tài khoản.
 */
function redirectByRole(role) {
    redirectTo(
        getDefaultPageByRole(role)
    );
}

/**
 * Hiển thị nội dung trang sau khi xác thực.
 */
function showPage() {
    document.documentElement
        .classList.add(
            "auth-ready"
        );

    if (document.body) {
        document.body.classList.add(
            "auth-ready"
        );
    }
}

/**
 * Ẩn trang trong lúc Firebase đang kiểm tra.
 */
function hidePage() {
    document.documentElement
        .classList.remove(
            "auth-ready"
        );

    if (document.body) {
        document.body.classList.remove(
            "auth-ready"
        );
    }
}

/**
 * Tạo promise để các file khác chờ auth-guard.
 */
function createAuthReadyController() {
    let resolvePromise;

    const promise =
        new Promise((resolve) => {
            resolvePromise = resolve;
        });

    return {
        promise,

        resolve(value) {
            if (authReadyResolved) {
                return;
            }

            authReadyResolved = true;

            resolvePromise(value);
        }
    };
}

const authReadyController =
    createAuthReadyController();

window.LARVA_AUTH_READY_PROMISE =
    authReadyController.promise;

/**
 * Đọc profile thật từ Firebase Database.
 */
async function loadUserProfile(uid) {
    const normalizedUid =
        String(uid || "")
            .trim();

    if (!normalizedUid) {
        return null;
    }

    const userSnapshot =
        await get(
            ref(
                db,
                `users/${normalizedUid}`
            )
        );

    if (!userSnapshot.exists()) {
        return null;
    }

    const rawProfile =
        userSnapshot.val();

    if (
        !rawProfile
        || typeof rawProfile !== "object"
    ) {
        return null;
    }

    const role =
        normalizeRole(
            rawProfile.role
        );

    const rawStatus =
        normalizeStatus(
            rawProfile.status
        );

    const status =
        role === ADMIN_ROLE
        && !rawStatus
            ? ACCOUNT_STATUS.APPROVED
            : rawStatus;

    return {
        ...rawProfile,

        uid:
            normalizedUid,

        email:
            String(
                rawProfile.email || ""
            )
                .trim()
                .toLowerCase(),

        username:
            String(
                rawProfile.username || ""
            )
                .trim()
                .toLowerCase(),

        displayName:
            String(
                rawProfile.displayName
                || rawProfile.fullName
                || ""
            )
                .trim(),

        role,
        status
    };
}

/**
 * Kiểm tra trạng thái tài khoản.
 */
function getAccountAccessResult(profile) {
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

    if (!role) {
        return {
            allowed: false,
            code: "INVALID_ROLE",
            message:
                "Tài khoản chưa được gán quyền admin hoặc nhân viên."
        };
    }

    const status =
        normalizeStatus(
            profile.status
        );

    if (
        role === ADMIN_ROLE
        && !status
    ) {
        return {
            allowed: true,
            code: "APPROVED",
            message:
                "Tài khoản được phép sử dụng."
        };
    }

    if (
        status ===
        ACCOUNT_STATUS.PENDING
    ) {
        return {
            allowed: false,
            code: "PENDING",
            message:
                "Tài khoản đang chờ admin xác nhận."
        };
    }

    if (
        status ===
        ACCOUNT_STATUS.LOCKED
    ) {
        return {
            allowed: false,
            code: "LOCKED",
            message:
                "Tài khoản đã bị khóa. Vui lòng liên hệ admin."
        };
    }

    if (
        status ===
        ACCOUNT_STATUS.DELETED
    ) {
        return {
            allowed: false,
            code: "DELETED",
            message:
                "Tài khoản đã bị xóa khỏi hệ thống."
        };
    }

    if (
        status !==
        ACCOUNT_STATUS.APPROVED
    ) {
        return {
            allowed: false,
            code: "NOT_APPROVED",
            message:
                "Tài khoản chưa được phép sử dụng."
        };
    }

    return {
        allowed: true,
        code: "APPROVED",
        message:
            "Tài khoản được phép sử dụng."
    };
}

/**
 * Tạo dữ liệu phiên gọn để lưu sessionStorage.
 */
function createSessionProfile(
    firebaseUser,
    databaseProfile
) {
    return {
        uid:
            firebaseUser.uid,

        email:
            String(
                firebaseUser.email
                || databaseProfile.email
                || ""
            )
                .trim()
                .toLowerCase(),

        username:
            String(
                databaseProfile.username
                || ""
            )
                .trim()
                .toLowerCase(),

        displayName:
            String(
                databaseProfile.displayName
                || databaseProfile.fullName
                || ""
            )
                .trim(),

        role:
            normalizeRole(
                databaseProfile.role
            ),

        status:
            normalizeStatus(
                databaseProfile.status
            )
            || (
                normalizeRole(
                    databaseProfile.role
                ) === ADMIN_ROLE
                    ? ACCOUNT_STATUS.APPROVED
                    : ACCOUNT_STATUS.PENDING
            )
    };
}

/**
 * Đăng xuất tài khoản không còn hợp lệ.
 */
async function logoutInvalidAccount() {
    clearSavedProfile();

    try {
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch (error) {
        console.warn(
            "Không đăng xuất được tài khoản:",
            error
        );
    }
}

/**
 * Xử lý nhanh bằng cache để tránh giao diện chớp trắng lâu.
 */
function handleCachedProfile(
    currentPage
) {
    const cachedProfile =
        readSavedProfile();

    if (!cachedProfile) {
        return;
    }

    const accessResult =
        getAccountAccessResult(
            cachedProfile
        );

    if (!accessResult.allowed) {
        clearSavedProfile();

        return;
    }

    const role =
        normalizeRole(
            cachedProfile.role
        );

    if (!role) {
        clearSavedProfile();

        return;
    }

    if (
        currentPage === LOGIN_PAGE
    ) {
        redirectByRole(role);

        return;
    }

    if (
        currentPage === REGISTER_PAGE
        && role === STAFF_ROLE
    ) {
        redirectTo(
            DEFAULT_STAFF_PAGE
        );

        return;
    }

    if (
        !isPublicPage(currentPage)
        && !isPageAllowed(
            currentPage,
            role
        )
    ) {
        redirectByRole(role);

        return;
    }

    showPage();
}

hidePage();

const currentPage =
    getCurrentPage();

handleCachedProfile(
    currentPage
);

/**
 * Xác minh chính thức bằng Firebase Authentication.
 */
onAuthStateChanged(
    auth,
    async (firebaseUser) => {
        try {
            if (!firebaseUser) {
                clearSavedProfile();

                if (
                    isPublicPage(
                        currentPage
                    )
                ) {
                    showPage();

                    authReadyController.resolve(
                        null
                    );

                    return;
                }

                setAuthMessage(
                    "Vui lòng đăng nhập để tiếp tục."
                );

                authReadyController.resolve(
                    null
                );

                redirectTo(
                    LOGIN_PAGE
                );

                return;
            }

            const databaseProfile =
                await loadUserProfile(
                    firebaseUser.uid
                );

            if (!databaseProfile) {
                await logoutInvalidAccount();

                setAuthMessage(
                    "Tài khoản đã có trong Firebase Authentication nhưng chưa có dữ liệu phân quyền trong users."
                );

                authReadyController.resolve(
                    null
                );

                redirectTo(
                    LOGIN_PAGE
                );

                return;
            }

            const accessResult =
                getAccountAccessResult(
                    databaseProfile
                );

            if (!accessResult.allowed) {
                await logoutInvalidAccount();

                setAuthMessage(
                    accessResult.message
                );

                authReadyController.resolve(
                    null
                );

                redirectTo(
                    LOGIN_PAGE
                );

                return;
            }

            const sessionProfile =
                createSessionProfile(
                    firebaseUser,
                    databaseProfile
                );

            saveProfile(
                sessionProfile
            );

            setAuthMessage("");

            const role =
                sessionProfile.role;

            if (
                currentPage === LOGIN_PAGE
            ) {
                authReadyController.resolve(
                    sessionProfile
                );

                redirectByRole(role);

                return;
            }

            if (
                currentPage === REGISTER_PAGE
                && role === STAFF_ROLE
            ) {
                authReadyController.resolve(
                    sessionProfile
                );

                redirectTo(
                    DEFAULT_STAFF_PAGE
                );

                return;
            }

            if (
                !isPublicPage(
                    currentPage
                )
                && !isPageAllowed(
                    currentPage,
                    role
                )
            ) {
                authReadyController.resolve(
                    sessionProfile
                );

                redirectByRole(role);

                return;
            }

            showPage();

            authReadyController.resolve(
                sessionProfile
            );
        } catch (error) {
            console.error(
                "Lỗi xác minh tài khoản:",
                error
            );

            await logoutInvalidAccount();

            setAuthMessage(
                "Không thể xác minh tài khoản. Vui lòng đăng nhập lại."
            );

            authReadyController.resolve(
                null
            );

            if (
                isPublicPage(
                    currentPage
                )
            ) {
                showPage();

                return;
            }

            redirectTo(
                LOGIN_PAGE
            );
        }
    }
);