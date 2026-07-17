import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    auth
} from "../firebase-config.js";

import {
    getUserProfile,
    logout
} from "./auth-service.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";

const STAFF_ALLOWED_PAGES = [
    "sales.html"
];

const ADMIN_ALLOWED_PAGES = [
    "index.html",
    "products.html",
    "sales.html",
    "statistics.html"
];

/*
    Sidebar và các file khác có thể chờ Promise này
    trước khi chạy.
*/
window.LARVA_AUTH_READY_PROMISE =
    protectCurrentPage();

async function protectCurrentPage() {
    const currentPage =
        getCurrentPage();

    try {
        const firebaseUser =
            await waitForFirebaseUser();

        /*
            Chưa đăng nhập.
        */
        if (!firebaseUser) {
            clearSavedProfile();

            redirectToLogin();

            return null;
        }

        const profile =
            await getUserProfileWithTimeout(
                firebaseUser.uid
            );

        /*
            Có tài khoản Authentication nhưng không có
            hồ sơ phân quyền trong Database.
        */
        if (
            !profile
            ||
            profile.active === false
        ) {
            await safelyLogout();

            clearSavedProfile();

            redirectToLogin();

            return null;
        }

        const role =
            normalizeRole(
                profile.role
            );

        if (!role) {
            await safelyLogout();

            clearSavedProfile();

            redirectToLogin();

            return null;
        }

        saveProfile(
            profile
        );

        window.LARVA_CURRENT_SESSION = {
            user:
                firebaseUser,

            profile
        };

        /*
            Admin được vào những trang quản trị.
        */
        if (role === "admin") {
            if (
                !ADMIN_ALLOWED_PAGES.includes(
                    currentPage
                )
            ) {
                window.location.replace(
                    "./index.html"
                );

                return null;
            }

            showPage();

            return {
                user:
                    firebaseUser,

                profile
            };
        }

        /*
            Nhân viên chỉ được vào sales.html.
        */
        if (role === "staff") {
            if (
                !STAFF_ALLOWED_PAGES.includes(
                    currentPage
                )
            ) {
                window.location.replace(
                    "./sales.html"
                );

                return null;
            }

            showPage();

            return {
                user:
                    firebaseUser,

                profile
            };
        }

        await safelyLogout();

        clearSavedProfile();

        redirectToLogin();

        return null;
    } catch (error) {
        console.error(
            "Lỗi kiểm tra quyền truy cập:",
            error
        );

        clearSavedProfile();

        redirectToLogin();

        return null;
    }
}

function getCurrentPage() {
    const fileName =
        window.location.pathname
            .split("/")
            .pop();

    return fileName || "index.html";
}

async function waitForFirebaseUser() {
    /*
        Firebase 10 hỗ trợ authStateReady().
    */
    if (
        typeof auth.authStateReady
        === "function"
    ) {
        await Promise.race([
            auth.authStateReady(),

            createTimeoutPromise(
                10000,
                "Firebase kiểm tra đăng nhập quá lâu."
            )
        ]);

        return auth.currentUser;
    }

    /*
        Dự phòng nếu authStateReady không có.
    */
    return new Promise(
        (resolve, reject) => {
            let unsubscribe =
                null;

            const timeoutId =
                window.setTimeout(
                    () => {
                        unsubscribe?.();

                        reject(
                            new Error(
                                "Firebase kiểm tra đăng nhập quá lâu."
                            )
                        );
                    },
                    10000
                );

            unsubscribe =
                onAuthStateChanged(
                    auth,

                    (user) => {
                        window.clearTimeout(
                            timeoutId
                        );

                        unsubscribe?.();

                        resolve(
                            user
                        );
                    },

                    (error) => {
                        window.clearTimeout(
                            timeoutId
                        );

                        unsubscribe?.();

                        reject(
                            error
                        );
                    }
                );
        }
    );
}

async function getUserProfileWithTimeout(
    uid
) {
    return Promise.race([
        getUserProfile(
            uid
        ),

        createTimeoutPromise(
            10000,
            "Không đọc được quyền tài khoản."
        )
    ]);
}

function normalizeRole(role) {
    const normalizedRole =
        String(
            role || ""
        )
            .trim()
            .toLowerCase();

    if (
        normalizedRole === "admin"
    ) {
        return "admin";
    }

    if (
        normalizedRole === "staff"
        ||
        normalizedRole === "employee"
        ||
        normalizedRole === "nhanvien"
        ||
        normalizedRole === "nhân viên"
    ) {
        return "staff";
    }

    return "";
}

function saveProfile(profile) {
    try {
        sessionStorage.setItem(
            SESSION_PROFILE_KEY,
            JSON.stringify({
                uid:
                    profile?.uid || "",

                username:
                    profile?.username || "",

                displayName:
                    profile?.displayName || "",

                role:
                    normalizeRole(
                        profile?.role
                    )
            })
        );
    } catch (error) {
        console.warn(
            "Không lưu được phiên đăng nhập:",
            error
        );
    }
}

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

async function safelyLogout() {
    try {
        await logout();
    } catch (error) {
        console.warn(
            "Không thể đăng xuất Firebase:",
            error
        );
    }
}

function redirectToLogin() {
    window.location.replace(
        "./login.html"
    );
}

function showPage() {
    document.documentElement.classList.add(
        "auth-ready"
    );
}

function createTimeoutPromise(
    milliseconds,
    message
) {
    return new Promise(
        (_, reject) => {
            window.setTimeout(
                () => {
                    reject(
                        new Error(
                            message
                        )
                    );
                },
                milliseconds
            );
        }
    );
}