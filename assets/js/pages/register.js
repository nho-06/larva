import {
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

    emailInput:
        document.querySelector(
            "#emailInput"
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

let isSubmitting = false;

/**
 * Chuẩn hóa họ và tên.
 */
function normalizeDisplayName(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Chuẩn hóa tên đăng nhập.
 */
function normalizeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}

/**
 * Chuẩn hóa email.
 */
function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

/**
 * Kiểm tra định dạng email.
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(email || "")
        );
}

/**
 * Kiểm tra tên đăng nhập.
 *
 * Chỉ chấp nhận:
 * - Chữ thường không dấu
 * - Chữ số
 * - Dấu chấm
 * - Dấu gạch dưới
 */
function isValidUsername(username) {
    return /^[a-z0-9._]{3,30}$/
        .test(
            String(username || "")
        );
}

/**
 * Khởi tạo trang đăng ký.
 */
function initializeRegisterPage() {
    hideRegisterMessage();

    setFormDisabled(false);

    elements.displayNameInput
        ?.focus();
}

/**
 * Xử lý submit form đăng ký.
 */
async function handleRegisterSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    hideRegisterMessage();

    const displayName =
        normalizeDisplayName(
            elements.displayNameInput
                ?.value
        );

    const username =
        normalizeUsername(
            elements.usernameInput
                ?.value
        );

    const email =
        normalizeEmail(
            elements.emailInput
                ?.value
        );

    const password =
        String(
            elements.passwordInput
                ?.value
            || ""
        );

    const confirmPassword =
        String(
            elements.confirmPasswordInput
                ?.value
            || ""
        );

    /**
     * Kiểm tra họ và tên.
     */
    if (!displayName) {
        showRegisterMessage(
            "Vui lòng nhập họ và tên.",
            "error"
        );

        elements.displayNameInput
            ?.focus();

        return;
    }

    if (displayName.length < 2) {
        showRegisterMessage(
            "Họ và tên phải có ít nhất 2 ký tự.",
            "error"
        );

        elements.displayNameInput
            ?.focus();

        return;
    }

    if (displayName.length > 100) {
        showRegisterMessage(
            "Họ và tên không được vượt quá 100 ký tự.",
            "error"
        );

        elements.displayNameInput
            ?.focus();

        return;
    }

    /**
     * Kiểm tra tên đăng nhập.
     */
    if (!username) {
        showRegisterMessage(
            "Vui lòng nhập tên đăng nhập.",
            "error"
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    if (username.length < 3) {
        showRegisterMessage(
            "Tên đăng nhập phải có ít nhất 3 ký tự.",
            "error"
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    if (username.length > 30) {
        showRegisterMessage(
            "Tên đăng nhập không được vượt quá 30 ký tự.",
            "error"
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    if (!isValidUsername(username)) {
        showRegisterMessage(
            "Tên đăng nhập chỉ được gồm chữ thường không dấu, số, dấu chấm hoặc dấu gạch dưới.",
            "error"
        );

        elements.usernameInput
            ?.focus();

        return;
    }

    /**
     * Kiểm tra email.
     */
    if (!email) {
        showRegisterMessage(
            "Vui lòng nhập email.",
            "error"
        );

        elements.emailInput
            ?.focus();

        return;
    }

    if (!isValidEmail(email)) {
        showRegisterMessage(
            "Email không đúng định dạng.",
            "error"
        );

        elements.emailInput
            ?.focus();

        return;
    }

    if (email.length > 150) {
        showRegisterMessage(
            "Email không được vượt quá 150 ký tự.",
            "error"
        );

        elements.emailInput
            ?.focus();

        return;
    }

    /**
     * Kiểm tra mật khẩu.
     */
    if (!password) {
        showRegisterMessage(
            "Vui lòng nhập mật khẩu.",
            "error"
        );

        elements.passwordInput
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

    if (password.length > 128) {
        showRegisterMessage(
            "Mật khẩu không được vượt quá 128 ký tự.",
            "error"
        );

        elements.passwordInput
            ?.focus();

        return;
    }

    /**
     * Kiểm tra nhập lại mật khẩu.
     */
    if (!confirmPassword) {
        showRegisterMessage(
            "Vui lòng nhập lại mật khẩu.",
            "error"
        );

        elements.confirmPasswordInput
            ?.focus();

        return;
    }

    if (confirmPassword !== password) {
        showRegisterMessage(
            "Mật khẩu nhập lại không khớp.",
            "error"
        );

        if (
            elements.confirmPasswordInput
        ) {
            elements.confirmPasswordInput
                .value = "";

            elements.confirmPasswordInput
                .focus();
        }

        return;
    }

    isSubmitting = true;

    setFormDisabled(true);
    setRegisterButtonLoading(true);

    try {
        const result =
            await registerStaffAccount({
                displayName,
                username,
                email,
                password
            });

        clearRegisterForm();

        showRegisterMessage(
            result?.message
            || (
                "Đăng ký thành công. "
                + "Tài khoản đang chờ admin xác nhận."
            ),
            "success"
        );

        /**
         * Sau khi đăng ký thành công:
         * - Không tự đăng nhập
         * - Không chuyển vào trang bán hàng
         * - Chờ admin duyệt tài khoản
         */
        window.setTimeout(() => {
            window.location.replace(
                "./login.html"
            );
        }, 2200);
    } catch (error) {
        console.error(
            "Đăng ký tài khoản thất bại:",
            error
        );

        showRegisterMessage(
            getFriendlyRegisterError(
                error
            ),
            "error"
        );

        focusFieldByError(error);
    } finally {
        isSubmitting = false;

        setFormDisabled(false);
        setRegisterButtonLoading(false);
    }
}

/**
 * Hiện hoặc ẩn mật khẩu.
 */
function togglePasswordVisibility({
    input,
    button
}) {
    if (!input || !button) {
        return;
    }

    const isPasswordHidden =
        input.type === "password";

    input.type =
        isPasswordHidden
            ? "text"
            : "password";

    button.textContent =
        isPasswordHidden
            ? "Ẩn"
            : "Hiện";

    button.setAttribute(
        "aria-label",
        isPasswordHidden
            ? "Ẩn mật khẩu"
            : "Hiện mật khẩu"
    );

    button.setAttribute(
        "aria-pressed",
        String(isPasswordHidden)
    );

    input.focus();
}

/**
 * Hiện thông báo đăng ký.
 */
function showRegisterMessage(
    message,
    type = "error"
) {
    if (!elements.registerMessage) {
        return;
    }

    elements.registerMessage.textContent =
        String(
            message
            || "Không thể đăng ký tài khoản."
        );

    elements.registerMessage.hidden =
        false;

    elements.registerMessage.classList.remove(
        "hidden",
        "success",
        "error",
        "is-success",
        "is-error"
    );

    if (type === "success") {
        elements.registerMessage
            .classList.add(
                "success",
                "is-success"
            );

        return;
    }

    elements.registerMessage
        .classList.add(
            "error",
            "is-error"
        );
}

/**
 * Ẩn thông báo.
 */
function hideRegisterMessage() {
    if (!elements.registerMessage) {
        return;
    }

    elements.registerMessage.textContent =
        "";

    elements.registerMessage.hidden =
        true;

    elements.registerMessage.classList.add(
        "hidden"
    );

    elements.registerMessage.classList.remove(
        "success",
        "error",
        "is-success",
        "is-error"
    );
}

/**
 * Khóa hoặc mở toàn bộ form.
 */
function setFormDisabled(disabled) {
    const fields = [
        elements.displayNameInput,
        elements.usernameInput,
        elements.emailInput,
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
            Boolean(disabled);
    });
}

/**
 * Đổi nội dung nút đăng ký.
 */
function setRegisterButtonLoading(
    loading
) {
    if (!elements.registerButton) {
        return;
    }

    elements.registerButton.textContent =
        loading
            ? "Đang đăng ký..."
            : "Đăng ký tài khoản";

    elements.registerButton.classList.toggle(
        "is-loading",
        Boolean(loading)
    );
}

/**
 * Xóa dữ liệu form sau khi đăng ký thành công.
 */
function clearRegisterForm() {
    if (elements.registerForm) {
        elements.registerForm.reset();
    }

    resetPasswordToggle(
        elements.passwordInput,
        elements.togglePasswordButton
    );

    resetPasswordToggle(
        elements.confirmPasswordInput,
        elements.toggleConfirmPasswordButton
    );
}

/**
 * Đưa ô mật khẩu trở lại trạng thái ẩn.
 */
function resetPasswordToggle(
    input,
    button
) {
    if (input) {
        input.type = "password";
    }

    if (button) {
        button.textContent = "Hiện";

        button.setAttribute(
            "aria-label",
            "Hiện mật khẩu"
        );

        button.setAttribute(
            "aria-pressed",
            "false"
        );
    }
}

/**
 * Đưa con trỏ đến trường phù hợp với lỗi.
 */
function focusFieldByError(error) {
    const message =
        String(
            error?.message || ""
        ).toLowerCase();

    const code =
        String(
            error?.code || ""
        ).toLowerCase();

    if (
        message.includes(
            "tên đăng nhập"
        )
        || message.includes(
            "username"
        )
    ) {
        elements.usernameInput
            ?.focus();

        return;
    }

    if (
        code ===
            "auth/email-already-in-use"
        || code ===
            "auth/invalid-email"
        || message.includes(
            "email"
        )
    ) {
        elements.emailInput
            ?.focus();

        return;
    }

    if (
        code ===
            "auth/weak-password"
        || message.includes(
            "mật khẩu"
        )
    ) {
        if (elements.passwordInput) {
            elements.passwordInput.value =
                "";

            elements.passwordInput.focus();
        }

        if (
            elements.confirmPasswordInput
        ) {
            elements.confirmPasswordInput
                .value = "";
        }

        return;
    }

    elements.displayNameInput
        ?.focus();
}

/**
 * Chuyển lỗi Firebase thành thông báo dễ hiểu.
 */
function getFriendlyRegisterError(error) {
    const code =
        String(
            error?.code || ""
        );

    const message =
        String(
            error?.message || ""
        );

    if (
        code ===
            "auth/email-already-in-use"
        || message.includes(
            "Email này đã được đăng ký"
        )
    ) {
        return (
            "Email này đã được sử dụng. "
            + "Vui lòng dùng email khác."
        );
    }

    if (
        code === "auth/invalid-email"
    ) {
        return (
            "Email không hợp lệ."
        );
    }

    if (
        code === "auth/weak-password"
    ) {
        return (
            "Mật khẩu quá yếu. "
            + "Vui lòng nhập ít nhất 6 ký tự."
        );
    }

    if (
        code ===
        "auth/operation-not-allowed"
    ) {
        return (
            "Firebase chưa bật đăng nhập bằng Email/Password."
        );
    }

    if (
        code ===
        "auth/network-request-failed"
    ) {
        return (
            "Không thể kết nối Firebase. "
            + "Vui lòng kiểm tra mạng."
        );
    }

    if (
        code ===
        "auth/too-many-requests"
    ) {
        return (
            "Bạn đã thao tác quá nhiều lần. "
            + "Vui lòng đợi một lúc rồi thử lại."
        );
    }

    if (
        message.includes(
            "Tên đăng nhập đã được sử dụng"
        )
    ) {
        return (
            "Tên đăng nhập đã được sử dụng. "
            + "Vui lòng chọn tên khác."
        );
    }

    if (
        message.includes(
            "Database Rules đang chặn"
        )
        || message.includes(
            "Permission denied"
        )
        || message.includes(
            "PERMISSION_DENIED"
        )
    ) {
        return (
            "Firebase Database Rules đang chặn đăng ký. "
            + "Cần cập nhật database.rules.json."
        );
    }

    if (
        message.includes(
            "Tên đăng nhập phải"
        )
        || message.includes(
            "Vui lòng nhập tên đăng nhập"
        )
    ) {
        return message;
    }

    if (
        message.includes(
            "Họ và tên"
        )
        || message.includes(
            "Vui lòng nhập họ và tên"
        )
    ) {
        return message;
    }

    if (
        message.includes(
            "Email không hợp lệ"
        )
        || message.includes(
            "Vui lòng nhập email"
        )
    ) {
        return message;
    }

    if (
        message.includes(
            "Mật khẩu"
        )
        || message.includes(
            "Vui lòng nhập mật khẩu"
        )
    ) {
        return message;
    }

    return (
        message
        || "Không thể đăng ký tài khoản."
    );
}

/**
 * Khi người dùng sửa nội dung,
 * ẩn thông báo lỗi cũ.
 */
[
    elements.displayNameInput,
    elements.usernameInput,
    elements.emailInput,
    elements.passwordInput,
    elements.confirmPasswordInput
].forEach((input) => {
    input?.addEventListener(
        "input",
        hideRegisterMessage
    );
});

/**
 * Tự chuẩn hóa username khi rời khỏi ô.
 */
elements.usernameInput
    ?.addEventListener(
        "blur",
        () => {
            if (
                !elements.usernameInput
            ) {
                return;
            }

            elements.usernameInput.value =
                normalizeUsername(
                    elements.usernameInput
                        .value
                );
        }
    );

/**
 * Tự chuẩn hóa email khi rời khỏi ô.
 */
elements.emailInput
    ?.addEventListener(
        "blur",
        () => {
            if (!elements.emailInput) {
                return;
            }

            elements.emailInput.value =
                normalizeEmail(
                    elements.emailInput
                        .value
                );
        }
    );

/**
 * Submit form.
 */
elements.registerForm
    ?.addEventListener(
        "submit",
        handleRegisterSubmit
    );

/**
 * Hiện hoặc ẩn mật khẩu chính.
 */
elements.togglePasswordButton
    ?.addEventListener(
        "click",
        () => {
            togglePasswordVisibility({
                input:
                    elements.passwordInput,

                button:
                    elements.togglePasswordButton
            });
        }
    );

/**
 * Hiện hoặc ẩn mật khẩu xác nhận.
 */
elements.toggleConfirmPasswordButton
    ?.addEventListener(
        "click",
        () => {
            togglePasswordVisibility({
                input:
                    elements.confirmPasswordInput,

                button:
                    elements
                        .toggleConfirmPasswordButton
            });
        }
    );

initializeRegisterPage();