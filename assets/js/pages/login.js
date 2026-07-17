import {
    getAuthErrorMessage,
    getCurrentSession,
    loginWithUsername
} from "../auth/auth-service.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";

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

let isSubmitting =
    false;

async function initializeLoginPage() {
    setFormDisabled(
        true
    );

    try {
        const session =
            await getCurrentSession();

        if (
            session?.user
            &&
            session?.profile
        ) {
            saveProfile(
                session.profile
            );

            redirectByRole(
                session.profile.role
            );

            return;
        }
    } catch (error) {
        console.error(
            "Lỗi kiểm tra phiên đăng nhập:",
            error
        );
    }

    clearSavedProfile();

    setFormDisabled(
        false
    );

    elements.usernameInput
        ?.focus();
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    hideLoginError();

    const username =
        String(
            elements.usernameInput?.value
            || ""
        ).trim();

    const password =
        String(
            elements.passwordInput?.value
            || ""
        );

    if (!username) {
        showLoginError(
            "Vui lòng nhập tên đăng nhập."
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

    isSubmitting =
        true;

    setFormDisabled(
        true
    );

    setLoginButtonLoading(
        true
    );

    try {
        const result =
            await loginWithUsername(
                username,
                password
            );

        if (!result?.profile) {
            throw new Error(
                "Không tìm thấy thông tin phân quyền."
            );
        }

        saveProfile(
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

        clearSavedProfile();

        showLoginError(
            getAuthErrorMessage(
                error
            )
        );

        if (elements.passwordInput) {
            elements.passwordInput.value =
                "";

            elements.passwordInput.focus();
        }

        isSubmitting =
            false;

        setFormDisabled(
            false
        );

        setLoginButtonLoading(
            false
        );
    }
}

function saveProfile(profile) {
    try {
        sessionStorage.setItem(
            SESSION_PROFILE_KEY,
            JSON.stringify({
                uid:
                    profile?.uid
                    || "",

                username:
                    profile?.username
                    || "",

                displayName:
                    profile?.displayName
                    || "",

                role:
                    profile?.role
                    || ""
            })
        );
    } catch (error) {
        console.warn(
            "Không lưu được thông tin phiên:",
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
            "Không xóa được thông tin phiên:",
            error
        );
    }
}

function redirectByRole(role) {
    const normalizedRole =
        String(
            role || ""
        )
            .trim()
            .toLowerCase();

    if (
        normalizedRole === "admin"
    ) {
        window.location.replace(
            "./index.html"
        );

        return;
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
        window.location.replace(
            "./sales.html"
        );

        return;
    }

    clearSavedProfile();

    showLoginError(
        "Tài khoản chưa có quyền hợp lệ."
    );

    isSubmitting =
        false;

    setFormDisabled(
        false
    );

    setLoginButtonLoading(
        false
    );
}

function togglePasswordVisibility() {
    if (
        !elements.passwordInput
        ||
        !elements.togglePasswordButton
    ) {
        return;
    }

    const isHidden =
        elements.passwordInput.type
        === "password";

    elements.passwordInput.type =
        isHidden
            ? "text"
            : "password";

    elements.togglePasswordButton.textContent =
        isHidden
            ? "Ẩn"
            : "Hiện";

    elements.passwordInput.focus();
}

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
}

function hideLoginError() {
    if (!elements.loginError) {
        return;
    }

    elements.loginError.textContent =
        "";

    elements.loginError.classList.add(
        "hidden"
    );
}

function setFormDisabled(disabled) {
    const fields = [
        elements.usernameInput,
        elements.passwordInput,
        elements.togglePasswordButton,
        elements.loginButton
    ];

    fields.forEach((field) => {
        if (field) {
            field.disabled =
                disabled;
        }
    });
}

function setLoginButtonLoading(loading) {
    if (!elements.loginButton) {
        return;
    }

    elements.loginButton.textContent =
        loading
            ? "Đang đăng nhập..."
            : "Đăng nhập";
}

elements.loginForm
    ?.addEventListener(
        "submit",
        handleLoginSubmit
    );

elements.togglePasswordButton
    ?.addEventListener(
        "click",
        togglePasswordVisibility
    );

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

initializeLoginPage();