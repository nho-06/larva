import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    get,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    auth,
    db
} from "../firebase-config.js";

const INTERNAL_EMAIL_DOMAIN =
    "@gmail.com";

export const USER_ROLES = {
    ADMIN:
        "admin",

    STAFF:
        "staff"
};

export const ROLE_HOME_PAGES = {
    admin:
        "./index.html",

    staff:
        "./sales.html"
};

export function normalizeUsername(
    username
) {
    return String(
        username || ""
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /đ/g,
            "d"
        )
        .replace(
            /[^a-z0-9]/g,
            ""
        );
}

export function usernameToEmail(
    username
) {
    const normalizedUsername =
        normalizeUsername(
            username
        );

    if (!normalizedUsername) {
        throw new Error(
            "Tên đăng nhập không hợp lệ."
        );
    }

    if (
        normalizedUsername.length < 4
    ) {
        throw new Error(
            "Tên đăng nhập phải có ít nhất 4 ký tự."
        );
    }

    return (
        normalizedUsername
        +
        INTERNAL_EMAIL_DOMAIN
    );
}

export async function getUserProfile(
    uid
) {
    const normalizedUid =
        String(
            uid || ""
        ).trim();

    if (!normalizedUid) {
        return null;
    }

    const snapshot =
        await get(
            ref(
                db,
                `users/${normalizedUid}`
            )
        );

    if (!snapshot.exists()) {
        return null;
    }

    const data =
        snapshot.val()
        || {};

    return {
        uid:
            normalizedUid,

        username:
            data.username
            || "",

        normalizedUsername:
            data.normalizedUsername
            ||
            normalizeUsername(
                data.username
            ),

        displayName:
            data.displayName
            ||
            data.username
            ||
            "Người dùng",

        role:
            normalizeRole(
                data.role
            ),

        active:
            data.active !== false,

        createdAt:
            Number(
                data.createdAt || 0
            ),

        updatedAt:
            Number(
                data.updatedAt || 0
            )
    };
}

export async function registerStaffAccount({
    displayName,
    username,
    password
}) {
    const normalizedDisplayName =
        String(
            displayName || ""
        ).trim();

    const originalUsername =
        String(
            username || ""
        ).trim();

    const normalizedUsername =
        normalizeUsername(
            originalUsername
        );

    const normalizedPassword =
        String(
            password || ""
        );

    if (!normalizedDisplayName) {
        throw new Error(
            "Vui lòng nhập tên nhân viên."
        );
    }

    if (
        normalizedDisplayName.length < 2
    ) {
        throw new Error(
            "Tên nhân viên quá ngắn."
        );
    }

    if (!normalizedUsername) {
        throw new Error(
            "Tên đăng nhập không hợp lệ."
        );
    }

    if (
        normalizedUsername.length < 4
    ) {
        throw new Error(
            "Tên đăng nhập phải có ít nhất 4 ký tự."
        );
    }

    if (
        normalizedPassword.length < 6
    ) {
        throw new Error(
            "Mật khẩu phải có ít nhất 6 ký tự."
        );
    }

    const email =
        usernameToEmail(
            originalUsername
        );

    const usernameSnapshot =
        await get(
            ref(
                db,
                `usernames/${normalizedUsername}`
            )
        );

    if (usernameSnapshot.exists()) {
        throw new Error(
            "Tên đăng nhập này đã được sử dụng."
        );
    }

    await setPersistence(
        auth,
        browserLocalPersistence
    );

    const credential =
        await createUserWithEmailAndPassword(
            auth,
            email,
            normalizedPassword
        );

    const firebaseUser =
        credential.user;

    const now =
        Date.now();

    try {
        await updateProfile(
            firebaseUser,
            {
                displayName:
                    normalizedDisplayName
            }
        );

        await set(
            ref(
                db,
                `users/${firebaseUser.uid}`
            ),
            {
                uid:
                    firebaseUser.uid,

                username:
                    originalUsername,

                normalizedUsername,

                displayName:
                    normalizedDisplayName,

                email,

                role:
                    USER_ROLES.STAFF,

                active:
                    true,

                createdAt:
                    now,

                updatedAt:
                    now
            }
        );

        await set(
            ref(
                db,
                `usernames/${normalizedUsername}`
            ),
            {
                uid:
                    firebaseUser.uid,

                role:
                    USER_ROLES.STAFF,

                createdAt:
                    now
            }
        );

        await signOut(
            auth
        );

        return {
            uid:
                firebaseUser.uid,

            username:
                originalUsername,

            displayName:
                normalizedDisplayName,

            role:
                USER_ROLES.STAFF
        };
    } catch (error) {
        try {
            await signOut(
                auth
            );
        } catch (signOutError) {
            console.warn(
                "Không đăng xuất được sau lỗi đăng ký:",
                signOutError
            );
        }

        throw error;
    }
}

export async function loginWithUsername(
    username,
    password
) {
    const email =
        usernameToEmail(
            username
        );

    const normalizedPassword =
        String(
            password || ""
        );

    if (!normalizedPassword) {
        throw new Error(
            "Vui lòng nhập mật khẩu."
        );
    }

    await setPersistence(
        auth,
        browserLocalPersistence
    );

    const credential =
        await signInWithEmailAndPassword(
            auth,
            email,
            normalizedPassword
        );

    const firebaseUser =
        credential.user;

    let profile;

    try {
        profile =
            await getUserProfile(
                firebaseUser.uid
            );
    } catch (error) {
        await signOut(
            auth
        );

        throw new Error(
            "Không đọc được thông tin phân quyền."
        );
    }

    if (!profile) {
        await signOut(
            auth
        );

        throw new Error(
            "Tài khoản chưa được cấp quyền sử dụng."
        );
    }

    if (!profile.active) {
        await signOut(
            auth
        );

        throw new Error(
            "Tài khoản này đã bị khóa."
        );
    }

    if (
        profile.role !== USER_ROLES.ADMIN
        &&
        profile.role !== USER_ROLES.STAFF
    ) {
        await signOut(
            auth
        );

        throw new Error(
            "Tài khoản chưa có quyền hợp lệ."
        );
    }

    return {
        user:
            firebaseUser,

        profile
    };
}

export async function logout() {
    await signOut(
        auth
    );
}

export async function waitForAuthState() {
    /*
        Firebase 10 hỗ trợ authStateReady().
        Dùng timeout để không bị đứng mãi tại
        "Đang tải menu...".
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
        Phương án dự phòng.
    */
    return new Promise(
        (resolve, reject) => {
            let unsubscribe =
                null;

            const timeoutId =
                window.setTimeout(
                    () => {
                        if (unsubscribe) {
                            unsubscribe();
                        }

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

                        if (unsubscribe) {
                            unsubscribe();
                        }

                        resolve(
                            user
                        );
                    },

                    (error) => {
                        window.clearTimeout(
                            timeoutId
                        );

                        if (unsubscribe) {
                            unsubscribe();
                        }

                        reject(
                            error
                        );
                    }
                );
        }
    );
}

export async function getCurrentSession() {
    const user =
        await waitForAuthState();

    if (!user) {
        return {
            user:
                null,

            profile:
                null
        };
    }

    let profile;

    try {
        profile =
            await Promise.race([
                getUserProfile(
                    user.uid
                ),

                createTimeoutPromise(
                    10000,
                    "Không đọc được quyền tài khoản."
                )
            ]);
    } catch (error) {
        console.error(
            "Lỗi đọc hồ sơ người dùng:",
            error
        );

        throw error;
    }

    if (
        !profile
        ||
        !profile.active
    ) {
        await logout();

        return {
            user:
                null,

            profile:
                null
        };
    }

    return {
        user,
        profile
    };
}

export function observeAuthState(
    callback
) {
    return onAuthStateChanged(
        auth,

        async (user) => {
            if (!user) {
                callback({
                    user:
                        null,

                    profile:
                        null
                });

                return;
            }

            try {
                const profile =
                    await getUserProfile(
                        user.uid
                    );

                callback({
                    user,
                    profile
                });
            } catch (error) {
                console.error(
                    "Không đọc được quyền người dùng:",
                    error
                );

                callback({
                    user,
                    profile:
                        null,

                    error
                });
            }
        }
    );
}

export function getHomePageByRole(
    role
) {
    const normalizedRole =
        normalizeRole(
            role
        );

    return (
        ROLE_HOME_PAGES[
            normalizedRole
        ]
        ||
        "./login.html"
    );
}

export function getAuthErrorMessage(
    error
) {
    const errorCode =
        String(
            error?.code || ""
        );

    switch (errorCode) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return (
                "Tên đăng nhập hoặc mật khẩu không đúng."
            );

        case "auth/invalid-email":
            return (
                "Tên đăng nhập không hợp lệ."
            );

        case "auth/user-disabled":
            return (
                "Tài khoản đã bị vô hiệu hóa."
            );

        case "auth/too-many-requests":
            return (
                "Bạn đã đăng nhập sai quá nhiều lần. "
                +
                "Hãy thử lại sau."
            );

        case "auth/network-request-failed":
            return (
                "Không thể kết nối Firebase. "
                +
                "Hãy kiểm tra mạng."
            );

        case "auth/operation-not-allowed":
            return (
                "Đăng nhập Email/Password chưa được bật."
            );

        default:
            return (
                error?.message
                ||
                "Không thể đăng nhập."
            );
    }
}

export function getRegisterErrorMessage(
    error
) {
    const errorCode =
        String(
            error?.code || ""
        );

    switch (errorCode) {
        case "auth/email-already-in-use":
            return (
                "Tên đăng nhập này đã được sử dụng."
            );

        case "auth/invalid-email":
            return (
                "Tên đăng nhập không hợp lệ."
            );

        case "auth/weak-password":
            return (
                "Mật khẩu quá yếu. "
                +
                "Hãy dùng ít nhất 6 ký tự."
            );

        case "auth/network-request-failed":
            return (
                "Không thể kết nối Firebase. "
                +
                "Hãy kiểm tra mạng."
            );

        case "auth/operation-not-allowed":
            return (
                "Đăng ký Email/Password chưa được bật."
            );

        case "auth/too-many-requests":
            return (
                "Bạn thao tác quá nhiều lần. "
                +
                "Hãy thử lại sau."
            );

        default:
            return (
                error?.message
                ||
                "Không thể đăng ký tài khoản."
            );
    }
}

function normalizeRole(
    role
) {
    const normalizedRole =
        String(
            role || ""
        )
            .trim()
            .toLowerCase();

    if (
        normalizedRole
        === USER_ROLES.ADMIN
    ) {
        return USER_ROLES.ADMIN;
    }

    if (
        normalizedRole
        === USER_ROLES.STAFF
        ||
        normalizedRole
        === "employee"
        ||
        normalizedRole
        === "nhanvien"
        ||
        normalizedRole
        === "nhân viên"
    ) {
        return USER_ROLES.STAFF;
    }

    return "";
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