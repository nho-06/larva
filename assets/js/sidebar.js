import {
    logout
} from "./auth/auth-service.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";

const SIDEBAR_VERSION =
    "60";

async function loadSidebar() {
    const sidebarContainer =
        document.querySelector(
            "#sidebarContainer"
        );

    if (!sidebarContainer) {
        return;
    }

    /*
        Đọc quyền đã lưu ngay khi đăng nhập.
        Không chờ Firebase nên sidebar hiện nhanh.
    */
    const profile =
        readSavedProfile();

    if (!profile) {
        window.location.replace(
            "./login.html"
        );

        return;
    }

    const role =
        normalizeRole(
            profile.role
        );

    const sidebarFile =
        getSidebarFileByRole(
            role
        );

    if (!sidebarFile) {
        clearSavedProfile();

        window.location.replace(
            "./login.html"
        );

        return;
    }

    try {
        const response =
            await fetch(
                `${sidebarFile}?v=${SIDEBAR_VERSION}`,
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `Không tải được ${sidebarFile}. Mã lỗi ${response.status}.`
            );
        }

        const sidebarHtml =
            await response.text();

        sidebarContainer.innerHTML =
            sidebarHtml;

        setActiveMenu();

        setSidebarUserInfo(
            profile
        );

        bindLogoutModal();
    } catch (error) {
        console.error(
            "Lỗi tải sidebar:",
            error
        );

        sidebarContainer.innerHTML = `
            <aside class="sidebar">

                <div class="brand-wrap">

                    <img
                        class="brand-logo"
                        src="./assets/images/larva-mascot.png"
                        alt="Larva mascot"
                    >

                    <div class="brand-text">
                        LARVA
                    </div>

                </div>

                <div style="
                    margin: 18px;
                    padding: 14px;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.25);
                    color: #965f75;
                    line-height: 1.5;
                ">
                    Không tải được menu.

                    <br><br>

                    <button
                        id="retrySidebarButton"
                        type="button"
                        style="
                            width: 100%;
                            min-height: 40px;
                            border: 0;
                            border-radius: 10px;
                            background: #d987ad;
                            color: white;
                            font-weight: 700;
                            cursor: pointer;
                        "
                    >
                        Tải lại
                    </button>
                </div>

            </aside>
        `;

        document
            .querySelector(
                "#retrySidebarButton"
            )
            ?.addEventListener(
                "click",
                () => {
                    window.location.reload();
                }
            );
    }
}

function getSidebarFileByRole(role) {
    if (role === "admin") {
        return "./sidebar.html";
    }

    if (role === "staff") {
        return "./sidebar-staff.html";
    }

    return "";
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

function readSavedProfile() {
    try {
        const savedProfile =
            sessionStorage.getItem(
                SESSION_PROFILE_KEY
            );

        if (!savedProfile) {
            return null;
        }

        return JSON.parse(
            savedProfile
        );
    } catch (error) {
        console.warn(
            "Không đọc được thông tin đăng nhập:",
            error
        );

        return null;
    }
}

function clearSavedProfile() {
    try {
        sessionStorage.removeItem(
            SESSION_PROFILE_KEY
        );
    } catch (error) {
        console.warn(
            "Không xóa được thông tin đăng nhập:",
            error
        );
    }
}

function setSidebarUserInfo(profile) {
    const sidebarUserName =
        document.querySelector(
            "#sidebarUserName"
        );

    if (!sidebarUserName) {
        return;
    }

    sidebarUserName.textContent =
        profile?.displayName
        ||
        profile?.username
        ||
        "Nhân viên";
}

function setActiveMenu() {
    let currentFile =
        window.location.pathname
            .split("/")
            .pop();

    if (!currentFile) {
        currentFile =
            "index.html";
    }

    const currentPage =
        currentFile.replace(
            ".html",
            ""
        );

    document
        .querySelectorAll(
            ".menu-link"
        )
        .forEach((link) => {
            link.classList.toggle(
                "active",
                link.dataset.page
                === currentPage
            );
        });
}

function bindLogoutModal() {
    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );

    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    const confirmLogoutButton =
        document.querySelector(
            "#confirmLogoutButton"
        );

    const closeButtons =
        document.querySelectorAll(
            "[data-close-logout-modal]"
        );

    if (
        !logoutButton
        ||
        !logoutModal
        ||
        !confirmLogoutButton
    ) {
        console.error(
            "Sidebar thiếu modal đăng xuất."
        );

        return;
    }

    if (
        logoutButton.dataset.bound
        === "true"
    ) {
        return;
    }

    logoutButton.dataset.bound =
        "true";

    logoutButton.addEventListener(
        "click",
        openLogoutModal
    );

    closeButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                closeLogoutModal
            );
        }
    );

    confirmLogoutButton.addEventListener(
        "click",
        performLogout
    );

    document.addEventListener(
        "keydown",
        handleEscapeKey
    );
}

function openLogoutModal() {
    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    logoutModal?.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";

    document
        .querySelector(
            "#confirmLogoutButton"
        )
        ?.focus();
}

function closeLogoutModal() {
    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    logoutModal?.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";
}

function handleEscapeKey(event) {
    if (
        event.key !== "Escape"
    ) {
        return;
    }

    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    if (
        !logoutModal
        ||
        logoutModal.classList.contains(
            "hidden"
        )
    ) {
        return;
    }

    closeLogoutModal();
}

async function performLogout() {
    const confirmLogoutButton =
        document.querySelector(
            "#confirmLogoutButton"
        );

    if (
        !confirmLogoutButton
        ||
        confirmLogoutButton.disabled
    ) {
        return;
    }

    confirmLogoutButton.disabled =
        true;

    confirmLogoutButton.textContent =
        "Đang đăng xuất...";

    try {
        await logout();
    } catch (error) {
        console.warn(
            "Firebase đăng xuất có lỗi:",
            error
        );
    } finally {
        clearSavedProfile();

        document.body.style.overflow =
            "";

        window.location.replace(
            "./login.html"
        );
    }
}

loadSidebar();