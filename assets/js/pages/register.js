import {
    getRegisterErrorMessage,
    registerStaffAccount
} from "../auth/auth-service.js";

const elements = {
    registerForm:
        document.querySelector(
            "#registerForm"
        ),

    displayNameInput:
        document.querySelector(
            "#displayNameInput"
        ),

    usernameInput:
        document.querySelector(
            "#usernameInput"
        ),

    passwordInput:
        document.querySelector(
            "#passwordInput"
        ),

    confirmPasswordInput:
        document.querySelector(
            "#confirmPasswordInput"
        ),

    togglePasswordButton:
        document.querySelector(
            "#togglePasswordButton"
        ),

    toggleConfirmPasswordButton:
        document.querySelector(
            "#toggleConfirmPasswordButton"
        ),

    registerMessage:
        document.querySelector(
            "#registerMessage"
        ),

    registerButton:
        document.querySelector(
            "#registerButton"
        )
};

let isSubmitting =
    false;

async function handleRegisterSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    hideRegisterMessage();

    const displayName =
        String(
            elements.displayNameInput?.value
            || ""
        ).trim();

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

    const confirmPassword =
        String(
            elements.confirmPasswordInput?.value
            || ""
        );

    if (!displayName) {
        showRegisterMessage(
            "Vui lòng nhập tên nhân viên.",
            "error"
        );

        elements.displayNameInput
            ?.focus();

        return;
    }

    if (!username) {
        showRegisterMessage(
            "Vui lòng nhập tên đăng nhập.",
            "error"
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    if (password.length < 6) {
        showRegisterMessage(
            "Mật khẩu phải có ít nhất 6 ký tự.",
            "error"
        );

        elements.passwordInput
            ?.focus();

        return;
    }

    if (
        password
        !== confirmPassword
    ) {
        showRegisterMessage(
            "Mật khẩu nhập lại không khớp.",
            "error"
        );

        elements.confirmPasswordInput
            ?.focus();

        return;
    }

    isSubmitting =
        true;

    setFormDisabled(
        true
    );

    setRegisterButtonLoading(
        true
    );

    try {
        const result =
            await registerStaffAccount({
                displayName,
                username,
                password
            });

        console.log(
            "Đăng ký nhân viên thành công:",
            result
        );

        showRegisterMessage(
            "Đăng ký nhân viên thành công. "
            + "Đang chuyển về trang đăng nhập...",
            "success"
        );

        clearRegisterForm();

        window.setTimeout(() => {
            window.location.replace(
                "./login.html"
            );
        }, 1400);

    } catch (error) {
        console.error(
            "Đăng ký nhân viên thất bại:",
            error
        );

        showRegisterMessage(
            getRegisterErrorMessage(
                error
            ),
            "error"
        );

        isSubmitting =
            false;

        setFormDisabled(
            false
        );

        setRegisterButtonLoading(
            false
        );

        elements.passwordInput.value =
            "";

        elements.confirmPasswordInput.value =
            "";

        elements.passwordInput
            ?.focus();
    }
}

function togglePasswordVisibility(
    input,
    button
) {
    if (
        !input
        ||
        !button
    ) {
        return;
    }

    const isHidden =
        input.type
        === "password";

    input.type =
        isHidden
            ? "text"
            : "password";

    button.textContent =
        isHidden
            ? "Ẩn"
            : "Hiện";

    input.focus();
}

function showRegisterMessage(
    message,
    type
) {
    if (!elements.registerMessage) {
        return;
    }

    elements.registerMessage.textContent =
        String(
            message
            || ""
        );

    elements.registerMessage.className =
        `register-message ${type}`;
}

function hideRegisterMessage() {
    if (!elements.registerMessage) {
        return;
    }

    elements.registerMessage.textContent =
        "";

    elements.registerMessage.className =
        "register-message hidden";
}

function setFormDisabled(disabled) {
    const fields = [
        elements.displayNameInput,
        elements.usernameInput,
        elements.passwordInput,
        elements.confirmPasswordInput,
        elements.togglePasswordButton,
        elements.toggleConfirmPasswordButton,
        elements.registerButton
    ];

    fields.forEach((field) => {
        if (!field) {
            return;
        }

        field.disabled =
            disabled;
    });
}

function setRegisterButtonLoading(loading) {
    if (!elements.registerButton) {
        return;
    }

    elements.registerButton.textContent =
        loading
            ? "Đang đăng ký..."
            : "Đăng ký nhân viên";
}

function clearRegisterForm() {
    elements.registerForm
        ?.reset();

    if (
        elements.passwordInput
        &&
        elements.passwordInput.type
        !== "password"
    ) {
        elements.passwordInput.type =
            "password";
    }

    if (
        elements.confirmPasswordInput
        &&
        elements.confirmPasswordInput.type
        !== "password"
    ) {
        elements.confirmPasswordInput.type =
            "password";
    }

    if (elements.togglePasswordButton) {
        elements.togglePasswordButton.textContent =
            "Hiện";
    }

    if (
        elements.toggleConfirmPasswordButton
    ) {
        elements.toggleConfirmPasswordButton.textContent =
            "Hiện";
    }
}

elements.registerForm
    ?.addEventListener(
        "submit",
        handleRegisterSubmit
    );

elements.togglePasswordButton
    ?.addEventListener(
        "click",
        () => {
            togglePasswordVisibility(
                elements.passwordInput,
                elements.togglePasswordButton
            );
        }
    );

elements.toggleConfirmPasswordButton
    ?.addEventListener(
        "click",
        () => {
            togglePasswordVisibility(
                elements.confirmPasswordInput,
                elements.toggleConfirmPasswordButton
            );
        }
    );

[
    elements.displayNameInput,
    elements.usernameInput,
    elements.passwordInput,
    elements.confirmPasswordInput
]
    .forEach((input) => {
        input?.addEventListener(
            "input",
            hideRegisterMessage
        );
    });