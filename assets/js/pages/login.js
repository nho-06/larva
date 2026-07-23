import {
    get,
    ref
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    auth,
    db
} from "../firebase-config.js";

import {
    getSavedSessionProfile,
    loginAccount,
    saveSessionProfile
} from "../auth/auth-service.js";

const elements = {
    loginForm:
        document.querySelector(
            "#loginForm"
        ),

    usernameInput:
        document.querySelector(
            "#usernameInput"
        ),

    passwordInput:
        document.querySelector(
            "#passwordInput"
        ),

    togglePasswordButton:
        document.querySelector(
            "#togglePasswordButton"
        ),

    loginError:
        document.querySelector(
            "#loginError"
        ),

    loginButton:
        document.querySelector(
            "#loginButton"
        )
};

let isSubmitting = false;

/**
 * Chuẩn hóa tên đăng nhập hoặc email.
 */
function normalizeLoginName(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

/**
 * Chuẩn hóa username.
 */
function normalizeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}

/**
 * Kiểm tra chuỗi có phải email không.
 */
function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(value || "")
        );
}

/**
 * Khởi tạo trang đăng nhập.
 */
async function initializeLoginPage() {
    setFormDisabled(true);

    try {
        /*
            Chờ Firebase Auth xác minh phiên đăng nhập
            nếu auth-guard đang hoạt động.
        */
        if (
            window.LARVA_AUTH_READY_PROMISE
        ) {
            const session =
                await window
                    .LARVA_AUTH_READY_PROMISE;

            if (session) {
                redirectByRole(
                    session.role
                );

                return;
            }
        }

        /*
            Kiểm tra phiên đã được lưu trong tab hiện tại.
        */
        const savedProfile =
            getSavedSessionProfile();

        if (
            auth.currentUser
            && savedProfile
            && isProfileAllowed(
                savedProfile
            )
        ) {
            redirectByRole(
                savedProfile.role
            );

            return;
        }
    } catch (error) {
        console.warn(
            "Không kiểm tra được phiên đăng nhập:",
            error
        );
    }

    showSavedAuthMessage();

    setFormDisabled(false);

    elements.usernameInput
        ?.focus();
}

/**
 * Kiểm tra profile có được phép sử dụng không.
 */
function isProfileAllowed(profile) {
    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    const status =
        String(profile.status || "")
            .trim()
            .toLowerCase();

    /*
        Hỗ trợ tài khoản admin cũ
        chưa có trường status.
    */
    if (
        role === "admin"
        && (
            !status
            || status === "approved"
        )
    ) {
        return true;
    }

    return status === "approved";
}

/**
 * Hiển thị thông báo do auth-guard gửi về.
 */
function showSavedAuthMessage() {
    try {
        const message =
            sessionStorage.getItem(
                "larva_auth_message"
            );

        if (!message) {
            return;
        }

        sessionStorage.removeItem(
            "larva_auth_message"
        );

        showLoginError(message);
    } catch (error) {
        console.warn(
            "Không đọc được thông báo đăng nhập:",
            error
        );
    }
}

/**
 * Xử lý khi người dùng nhấn đăng nhập.
 */
async function handleLoginSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    hideLoginError();

    /*
        Lưu ý:
        Chỉ dùng .value một lần.

        Code lỗi trước đây:
        elements.usernameInput?.value?.value

        Code đúng:
        elements.usernameInput?.value
    */
    const loginName =
        normalizeLoginName(
            elements.usernameInput
                ?.value
        );

    const password =
        String(
            elements.passwordInput
                ?.value
            || ""
        );

    if (!loginName) {
        showLoginError(
            "Vui lòng nhập tên đăng nhập hoặc email."
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    if (!password) {
        showLoginError(
            "Vui lòng nhập mật khẩu."
        );

        elements.passwordInput
            ?.focus();

        return;
    }

    isSubmitting = true;

    setFormDisabled(true);
    setLoginButtonLoading(true);

    try {
        /*
            Người dùng có thể đăng nhập bằng:
            - Email
            - Tên đăng nhập
        */
        const email =
            await resolveEmailFromLoginName(
                loginName
            );

        const result =
            await loginAccount(
                email,
                password
            );

        if (!result?.profile) {
            throw new Error(
                "Không tìm thấy thông tin phân quyền của tài khoản."
            );
        }

        saveSessionProfile(
            result.profile
        );

        redirectByRole(
            result.profile.role
        );
    } catch (error) {
        console.error(
            "Đăng nhập thất bại:",
            error
        );

        showLoginError(
            getFriendlyLoginError(
                error
            )
        );

        if (elements.passwordInput) {
            elements.passwordInput.value =
                "";

            elements.passwordInput.focus();
        }

        isSubmitting = false;

        setFormDisabled(false);
        setLoginButtonLoading(false);
    }
}

/**
 * Nếu người dùng nhập email thì dùng trực tiếp.
 *
 * Nếu người dùng nhập username thì đọc:
 * usernames/{username}/email
 */
async function resolveEmailFromLoginName(
    loginName
) {
    if (isEmail(loginName)) {
        return normalizeLoginName(
            loginName
        );
    }

    const username =
        normalizeUsername(
            loginName
        );

    if (!username) {
        throw new Error(
            "Tên đăng nhập không hợp lệ."
        );
    }

    let usernameSnapshot;

    try {
        usernameSnapshot =
            await get(
                ref(
                    db,
                    `usernames/${username}`
                )
            );
    } catch (error) {
        console.error(
            "Không đọc được username:",
            error
        );

        if (
            error?.code ===
                "PERMISSION_DENIED"
            || String(
                error?.message || ""
            ).includes(
                "Permission denied"
            )
        ) {
            throw new Error(
                "Firebase Database Rules đang chặn tra cứu tên đăng nhập."
            );
        }

        throw error;
    }

    if (!usernameSnapshot.exists()) {
        throw new Error(
            "Tên đăng nhập hoặc mật khẩu không đúng."
        );
    }

    const usernameData =
        usernameSnapshot.val();

    /*
        Hỗ trợ cả hai cấu trúc:
        usernames/name = {
            uid,
            email
        }

        hoặc:
        usernames/name = "email@gmail.com"
    */
    const email =
        typeof usernameData === "string"
            ? normalizeLoginName(
                usernameData
            )
            : normalizeLoginName(
                usernameData?.email
            );

    if (!email) {
        throw new Error(
            "Tên đăng nhập chưa được liên kết với email."
        );
    }

    if (!isEmail(email)) {
        throw new Error(
            "Email liên kết với tài khoản không hợp lệ."
        );
    }

    return email;
}

/**
 * Chuyển trang theo quyền tài khoản.
 */
function redirectByRole(role) {
    const normalizedRole =
        String(role || "")
            .trim()
            .toLowerCase();

    if (normalizedRole === "admin") {
        window.location.replace(
            "./index.html"
        );

        return;
    }

    if (normalizedRole === "staff") {
        window.location.replace(
            "./sales.html"
        );

        return;
    }

    showLoginError(
        "Tài khoản chưa được gán quyền admin hoặc nhân viên."
    );

    isSubmitting = false;

    setFormDisabled(false);
    setLoginButtonLoading(false);
}

/**
 * Hiện hoặc ẩn mật khẩu.
 */
function togglePasswordVisibility() {
    if (
        !elements.passwordInput
        || !elements.togglePasswordButton
    ) {
        return;
    }

    const isHidden =
        elements.passwordInput.type ===
        "password";

    elements.passwordInput.type =
        isHidden
            ? "text"
            : "password";

    elements.togglePasswordButton.textContent =
        isHidden
            ? "Ẩn"
            : "Hiện";

    elements.togglePasswordButton.setAttribute(
        "aria-label",
        isHidden
            ? "Ẩn mật khẩu"
            : "Hiện mật khẩu"
    );

    elements.passwordInput.focus();
}

/**
 * Hiển thị lỗi đăng nhập.
 */
function showLoginError(message) {
    if (!elements.loginError) {
        return;
    }

    elements.loginError.textContent =
        String(
            message
            || "Không thể đăng nhập."
        );

    elements.loginError.classList.remove(
        "hidden"
    );

    elements.loginError.hidden = false;
}

/**
 * Ẩn lỗi đăng nhập.
 */
function hideLoginError() {
    if (!elements.loginError) {
        return;
    }

    elements.loginError.textContent = "";

    elements.loginError.classList.add(
        "hidden"
    );

    elements.loginError.hidden = true;
}

/**
 * Khóa hoặc mở form đăng nhập.
 */
function setFormDisabled(disabled) {
    const fields = [
        elements.usernameInput,
        elements.passwordInput,
        elements.togglePasswordButton,
        elements.loginButton
    ];

    fields.forEach((field) => {
        if (!field) {
            return;
        }

        field.disabled =
            Boolean(disabled);
    });
}

/**
 * Thay đổi trạng thái nút đăng nhập.
 */
function setLoginButtonLoading(loading) {
    if (!elements.loginButton) {
        return;
    }

    elements.loginButton.textContent =
        loading
            ? "Đang đăng nhập..."
            : "Đăng nhập";

    elements.loginButton.classList.toggle(
        "is-loading",
        Boolean(loading)
    );
}

/**
 * Chuyển lỗi Firebase thành thông báo dễ hiểu.
 */
function getFriendlyLoginError(error) {
    const code =
        String(
            error?.code || ""
        );

    const message =
        String(
            error?.message || ""
        );

    if (
        code === "auth/invalid-credential"
        || code === "auth/wrong-password"
        || code === "auth/user-not-found"
        || code === "auth/invalid-login-credentials"
        || message.includes(
            "INVALID_LOGIN_CREDENTIALS"
        )
    ) {
        return (
            "Tên đăng nhập hoặc mật khẩu không đúng."
        );
    }

    if (
        code === "auth/too-many-requests"
    ) {
        return (
            "Bạn đã thử đăng nhập quá nhiều lần. "
            + "Vui lòng đợi một lúc rồi thử lại."
        );
    }

    if (
        code === "auth/network-request-failed"
    ) {
        return (
            "Không thể kết nối Firebase. "
            + "Vui lòng kiểm tra mạng."
        );
    }

    if (
        code === "auth/user-disabled"
    ) {
        return (
            "Tài khoản Firebase Authentication đã bị vô hiệu hóa."
        );
    }

    if (
        message.includes(
            "chờ admin xác nhận"
        )
        || message.includes(
            "đang chờ duyệt"
        )
    ) {
        return (
            "Tài khoản đang chờ admin xác nhận. "
            + "Bạn chưa thể đăng nhập."
        );
    }

    if (
        message.includes(
            "đã bị khóa"
        )
    ) {
        return (
            "Tài khoản đã bị khóa. "
            + "Vui lòng liên hệ admin."
        );
    }

    if (
        message.includes(
            "đã bị xóa"
        )
    ) {
        return (
            "Tài khoản đã bị xóa khỏi hệ thống."
        );
    }

    if (
        message.includes(
            "Database Rules đang chặn"
        )
    ) {
        return (
            "Chưa cập nhật Firebase Database Rules. "
            + "Hãy deploy file database.rules.json."
        );
    }

    if (
        message.includes(
            "Permission denied"
        )
        || message.includes(
            "PERMISSION_DENIED"
        )
    ) {
        return (
            "Firebase đang từ chối quyền truy cập dữ liệu tài khoản."
        );
    }

    if (
        message.includes(
            "Tên đăng nhập hoặc mật khẩu không đúng"
        )
        || message.includes(
            "Email hoặc mật khẩu không đúng"
        )
    ) {
        return (
            "Tên đăng nhập hoặc mật khẩu không đúng."
        );
    }

    if (
        message.includes(
            "không có thông tin phân quyền"
        )
        || message.includes(
            "chưa có thông tin phân quyền"
        )
    ) {
        return (
            "Tài khoản đã có trên Firebase Authentication "
            + "nhưng chưa có dữ liệu trong users."
        );
    }

    if (
        message.includes(
            "Không tìm thấy thông tin phân quyền"
        )
    ) {
        return (
            "Không tìm thấy thông tin phân quyền của tài khoản."
        );
    }

    if (
        message.includes(
            "Tên đăng nhập chưa được liên kết"
        )
    ) {
        return (
            "Tên đăng nhập chưa được liên kết với email."
        );
    }

    return (
        message
        || "Không thể đăng nhập."
    );
}

/**
 * Gắn sự kiện submit.
 */
elements.loginForm
    ?.addEventListener(
        "submit",
        handleLoginSubmit
    );

/**
 * Gắn sự kiện hiện/ẩn mật khẩu.
 */
elements.togglePasswordButton
    ?.addEventListener(
        "click",
        togglePasswordVisibility
    );

/**
 * Khi người dùng nhập lại thì ẩn lỗi cũ.
 */
elements.usernameInput
    ?.addEventListener(
        "input",
        hideLoginError
    );

elements.passwordInput
    ?.addEventListener(
        "input",
        hideLoginError
    );

/**
 * Khởi tạo trang.
 */
initializeLoginPage();