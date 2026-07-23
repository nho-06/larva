import {
    logout
} from "./auth/auth-service.js";

const SESSION_PROFILE_KEY =
    "larva_current_profile";
    
const SIDEBAR_VERSION =
    "68";

const SIDEBAR_CACHE_PREFIX =
    "larva_sidebar_cache";

const ADMIN_ROLE =
    "admin";

const STAFF_ROLE =
    "staff";

let currentProfile = null;

let isLoggingOut = false;

/**
 * Chuẩn hóa vai trò người dùng.
 */
function normalizeRole(value) {
    const role =
        String(value || "")
            .trim()
            .toLowerCase();

    if (role === ADMIN_ROLE) {
        return ADMIN_ROLE;
    }

    if (role === STAFF_ROLE) {
        return STAFF_ROLE;
    }

    return "";
}

/**
 * Chuẩn hóa trạng thái tài khoản.
 */
function normalizeStatus(
    value,
    role
) {
    const status =
        String(value || "")
            .trim()
            .toLowerCase();

    if (
        status === "pending"
        || status === "approved"
        || status === "locked"
        || status === "deleted"
    ) {
        return status;
    }

    /*
        Hỗ trợ tài khoản admin cũ
        chưa có trường status.
    */
    if (
        normalizeRole(role)
        === ADMIN_ROLE
    ) {
        return "approved";
    }

    return "pending";
}

/**
 * Chuẩn hóa dữ liệu profile.
 */
function normalizeProfile(profile) {
    if (
        !profile
        || typeof profile !== "object"
    ) {
        return null;
    }

    /*
        Một số phiên bản auth-guard trả về:
        {
            user,
            profile
        }

        Một số phiên bản chỉ trả về profile.
    */
    const sourceProfile =
        profile.profile
        && typeof profile.profile === "object"
            ? profile.profile
            : profile;

    const role =
        normalizeRole(
            sourceProfile.role
        );

    if (!role) {
        return null;
    }

    return {
        uid:
            String(
                sourceProfile.uid || ""
            ).trim(),

        email:
            String(
                sourceProfile.email || ""
            )
                .trim()
                .toLowerCase(),

        username:
            String(
                sourceProfile.username || ""
            )
                .trim()
                .toLowerCase(),

        displayName:
            String(
                sourceProfile.displayName
                || sourceProfile.fullName
                || sourceProfile.name
                || ""
            ).trim(),

        role,

        status:
            normalizeStatus(
                sourceProfile.status,
                role
            )
    };
}

/**
 * Đọc profile từ sessionStorage.
 *
 * Đây là phần giúp sidebar hiện nhanh:
 * không cần chờ Firebase tải lại profile
 * trước khi hiển thị menu.
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

        const parsedProfile =
            JSON.parse(
                rawProfile
            );

        return normalizeProfile(
            parsedProfile
        );
    } catch (error) {
        console.warn(
            "Không đọc được phiên đăng nhập:",
            error
        );

        clearSavedProfile();

        return null;
    }
}

/**
 * Xóa profile đã lưu.
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
 * Chọn sidebar theo quyền.
 */
function getSidebarFileByRole(role) {
    const normalizedRole =
        normalizeRole(role);

    if (
        normalizedRole ===
        ADMIN_ROLE
    ) {
        return "./sidebar.html";
    }

    if (
        normalizedRole ===
        STAFF_ROLE
    ) {
        return "./sidebar-staff.html";
    }

    return "";
}

/**
 * Kiểm tra tài khoản có được phép
 * hiển thị sidebar hay không.
 */
function isProfileAllowed(profile) {
    if (!profile) {
        return false;
    }

    const role =
        normalizeRole(
            profile.role
        );

    const status =
        normalizeStatus(
            profile.status,
            role
        );

    if (!role) {
        return false;
    }

    return status === "approved";
}

/**
 * Bắt đầu tải sidebar.
 */
async function loadSidebar() {
    const sidebarContainer =
        document.querySelector(
            "#sidebarContainer"
        );

    if (!sidebarContainer) {
        return;
    }

    /*
        BƯỚC 1:
        Đọc quyền đã lưu trong sessionStorage
        và hiển thị menu ngay lập tức.
    */
    let profile =
        readSavedProfile();

    if (
        profile
        && isProfileAllowed(profile)
    ) {
        try {
            await renderSidebarForProfile(
                sidebarContainer,
                profile
            );
        } catch (error) {
            console.error(
                "Không tải được sidebar nhanh:",
                error
            );

            renderSidebarError(
                sidebarContainer,
                error
            );

            return;
        }

        /*
            BƯỚC 2:
            Firebase vẫn xác minh lại tài khoản ở nền.

            Vì chạy ở nền nên không làm menu
            bị đứng ở dòng "Đang tải menu...".
        */
        verifySidebarProfileInBackground(
            sidebarContainer,
            profile
        );

        return;
    }

    /*
        Chỉ hiện loading khi trình duyệt chưa có
        profile đăng nhập được lưu.
    */
    renderLoadingSidebar(
        sidebarContainer
    );

    try {
        if (
            window.LARVA_AUTH_READY_PROMISE
        ) {
            const verifiedResult =
                await window
                    .LARVA_AUTH_READY_PROMISE;

            profile =
                normalizeProfile(
                    verifiedResult
                );
        }

        if (!profile) {
            await redirectToLogin(
                "Vui lòng đăng nhập để tiếp tục."
            );

            return;
        }

        if (
            !isProfileAllowed(profile)
        ) {
            await redirectToLogin(
                getInvalidAccountMessage(
                    profile.status
                )
            );

            return;
        }

        await renderSidebarForProfile(
            sidebarContainer,
            profile
        );
    } catch (error) {
        console.error(
            "Không tải được sidebar:",
            error
        );

        renderSidebarError(
            sidebarContainer,
            error
        );
    }
}

/**
 * Hiển thị sidebar theo profile.
 */
async function renderSidebarForProfile(
    sidebarContainer,
    profile
) {
    const normalizedProfile =
        normalizeProfile(
            profile
        );

    if (
        !normalizedProfile
        || !isProfileAllowed(
            normalizedProfile
        )
    ) {
        throw new Error(
            "Phiên đăng nhập không hợp lệ."
        );
    }

    currentProfile =
        normalizedProfile;

    const sidebarFile =
        getSidebarFileByRole(
            normalizedProfile.role
        );

    if (!sidebarFile) {
        throw new Error(
            "Tài khoản chưa được gán quyền hợp lệ."
        );
    }

    const sidebarHtml =
        await fetchSidebarHtml(
            sidebarFile,
            normalizedProfile.role
        );

    sidebarContainer.innerHTML =
        sidebarHtml;

    removeUnauthorizedMenuItems(
        normalizedProfile.role
    );

    setActiveMenu();

    setSidebarUserInfo(
        normalizedProfile
    );

    bindLogoutEvents();

    bindMobileSidebarEvents();
}

/**
 * Xác minh tài khoản ở nền.
 */
function verifySidebarProfileInBackground(
    sidebarContainer,
    initialProfile
) {
    if (
        !window.LARVA_AUTH_READY_PROMISE
    ) {
        return;
    }

    window.LARVA_AUTH_READY_PROMISE
        .then(async (verifiedResult) => {
            const verifiedProfile =
                normalizeProfile(
                    verifiedResult
                );

            if (
                !verifiedProfile
                || !isProfileAllowed(
                    verifiedProfile
                )
            ) {
                return;
            }

            const oldRole =
                normalizeRole(
                    initialProfile.role
                );

            const newRole =
                normalizeRole(
                    verifiedProfile.role
                );

            /*
                Nếu admin bị đổi thành nhân viên
                hoặc ngược lại thì tải lại menu.
            */
            if (oldRole !== newRole) {
                await renderSidebarForProfile(
                    sidebarContainer,
                    verifiedProfile
                );

                return;
            }

            currentProfile =
                verifiedProfile;

            setSidebarUserInfo(
                verifiedProfile
            );
        })
        .catch((error) => {
            console.warn(
                "Không xác minh được sidebar ở nền:",
                error
            );
        });
}

/**
 * Tải nội dung sidebar.
 *
 * Ưu tiên lấy từ localStorage để menu hiện ngay.
 * Sau đó cập nhật phiên bản mới ở nền.
 */
async function fetchSidebarHtml(
    sidebarFile,
    role
) {
    const cacheKey =
        getSidebarCacheKey(
            role
        );

    const cachedHtml =
        readSidebarCache(
            cacheKey
        );

    if (cachedHtml) {
        refreshSidebarCache(
            sidebarFile,
            cacheKey
        );

        return cachedHtml;
    }

    const sidebarHtml =
        await requestSidebarHtml(
            sidebarFile
        );

    writeSidebarCache(
        cacheKey,
        sidebarHtml
    );

    return sidebarHtml;
}

/**
 * Tạo tên cache riêng cho admin
 * và nhân viên.
 */
function getSidebarCacheKey(role) {
    return [
        SIDEBAR_CACHE_PREFIX,
        SIDEBAR_VERSION,
        normalizeRole(role)
    ].join("_");
}

/**
 * Đọc sidebar từ localStorage.
 */
function readSidebarCache(cacheKey) {
    try {
        const sidebarHtml =
            localStorage.getItem(
                cacheKey
            );

        if (
            sidebarHtml
            && sidebarHtml.includes(
                'class="sidebar"'
            )
        ) {
            return sidebarHtml;
        }
    } catch (error) {
        console.warn(
            "Không đọc được cache sidebar:",
            error
        );
    }

    return "";
}

/**
 * Lưu sidebar vào localStorage.
 */
function writeSidebarCache(
    cacheKey,
    sidebarHtml
) {
    if (!sidebarHtml) {
        return;
    }

    try {
        localStorage.setItem(
            cacheKey,
            sidebarHtml
        );
    } catch (error) {
        console.warn(
            "Không lưu được cache sidebar:",
            error
        );
    }
}
/**
 * Cập nhật sidebar mới ở nền.
 */
async function refreshSidebarCache(
    sidebarFile,
    cacheKey
) {
    try {
        const latestHtml =
            await requestSidebarHtml(
                sidebarFile
            );

        writeSidebarCache(
            cacheKey,
            latestHtml
        );
    } catch (error) {
        console.warn(
            "Không cập nhật được cache sidebar:",
            error
        );
    }
}

/**
 * Gửi request lấy file sidebar.
 */
async function requestSidebarHtml(
    sidebarFile
) {
    const separator =
        sidebarFile.includes("?")
            ? "&"
            : "?";

    const response =
        await fetch(
            `${sidebarFile}${separator}v=${SIDEBAR_VERSION}`,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `Không thể tải ${sidebarFile}: ${response.status}`
        );
    }

    const sidebarHtml =
        await response.text();

    if (
        !sidebarHtml
        || !sidebarHtml.includes(
            'class="sidebar"'
        )
    ) {
        throw new Error(
            "Nội dung sidebar không hợp lệ."
        );
    }

    return sidebarHtml;
}

/**
 * Xóa những menu không đúng quyền.
 */
function removeUnauthorizedMenuItems(
    role
) {
    const normalizedRole =
        normalizeRole(role);

    const menuLinks =
        document.querySelectorAll(
            ".menu-link"
        );

    menuLinks.forEach(
        (menuLink) => {
            const requiredRole =
                normalizeRole(
                    menuLink.dataset.role
                );

            if (
                requiredRole
                && requiredRole !==
                    normalizedRole
            ) {
                menuLink.remove();
            }
        }
    );

    /*
        Nhân viên chỉ được dùng trang bán hàng.
        Nếu sidebar-staff.html cũ còn cache
        các menu khác thì vẫn loại bỏ tại đây.
    */
    if (
        normalizedRole ===
        STAFF_ROLE
    ) {
        document
            .querySelectorAll(
                ".menu-link"
            )
            .forEach(
                (menuLink) => {
                    const page =
                        String(
                            menuLink.dataset.page ||
                            ""
                        ).trim();

                    if (
                        page !== "sales"
                    ) {
                        menuLink.remove();
                    }
                }
            );
    }
}

/**
 * Lấy tên trang hiện tại.
 */
function getCurrentPageName() {
    const pathname =
        window.location.pathname;

    const fileName =
        pathname
            .split("/")
            .pop()
            .split("?")[0]
            .split("#")[0]
            .trim()
            .toLowerCase();

    if (
        !fileName
        || fileName === "/"
        || fileName === "index.html"
    ) {
        return "index";
    }

    return fileName.replace(
        /\.html$/,
        ""
    );
}

/**
 * Đánh dấu menu đang mở.
 */
function setActiveMenu() {
    const currentPage =
        getCurrentPageName();

    const menuLinks =
        document.querySelectorAll(
            ".menu-link"
        );

    menuLinks.forEach(
        (menuLink) => {
            const menuPage =
                String(
                    menuLink.dataset.page ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const href =
                String(
                    menuLink.getAttribute(
                        "href"
                    ) || ""
                )
                    .split("?")[0]
                    .split("#")[0]
                    .split("/")
                    .pop()
                    .replace(
                        /\.html$/,
                        ""
                    )
                    .trim()
                    .toLowerCase();

            const isActive =
                menuPage
                    ? menuPage ===
                        currentPage
                    : href ===
                        currentPage;

            menuLink.classList.toggle(
                "active",
                isActive
            );

            if (isActive) {
                menuLink.setAttribute(
                    "aria-current",
                    "page"
                );
            } else {
                menuLink.removeAttribute(
                    "aria-current"
                );
            }
        }
    );
}

/**
 * Hiển thị thông tin người dùng
 * nếu sidebar có khu vực user.
 */
function setSidebarUserInfo(profile) {
    const displayNameElement =
        document.querySelector(
            "#sidebarUserName"
        );

    const roleElement =
        document.querySelector(
            "#sidebarUserRole"
        );

    const emailElement =
        document.querySelector(
            "#sidebarUserEmail"
        );

    const displayName =
        profile.displayName
        || profile.username
        || profile.email
        || (
            profile.role === ADMIN_ROLE
                ? "Quản trị viên"
                : "Nhân viên"
        );

    if (displayNameElement) {
        displayNameElement.textContent =
            displayName;
    }

    if (roleElement) {
        roleElement.textContent =
            profile.role === ADMIN_ROLE
                ? "Quản trị viên"
                : "Nhân viên";
    }

    if (emailElement) {
        emailElement.textContent =
            profile.email || "";
    }
}

/**
 * Hiển thị sidebar loading.
 */
function renderLoadingSidebar(
    sidebarContainer
) {
    sidebarContainer.innerHTML = `
        <aside class="sidebar sidebar-loading">
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

            <div class="sidebar-loading-content">
                <span class="sidebar-loading-spinner"></span>

                <p>
                    Đang tải menu...
                </p>
            </div>
        </aside>
    `;
}

/**
 * Hiển thị lỗi khi không tải được sidebar.
 */
function renderSidebarError(
    sidebarContainer,
    error
) {
    const message =
        String(
            error?.message ||
            "Không thể tải menu."
        );

    sidebarContainer.innerHTML = `
        <aside class="sidebar sidebar-error">
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

            <div class="sidebar-error-content">
                <strong>
                    Không tải được menu
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

                <button
                    id="retrySidebarButton"
                    type="button"
                >
                    Thử lại
                </button>
            </div>
        </aside>
    `;

    const retryButton =
        document.querySelector(
            "#retrySidebarButton"
        );

    retryButton?.addEventListener(
        "click",
        () => {
            clearSidebarCache();

            loadSidebar();
        }
    );
}

/**
 * Escape nội dung trước khi render HTML.
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

/**
 * Xóa toàn bộ cache sidebar cũ.
 */
function clearSidebarCache() {
    try {
        const keysToRemove = [];

        for (
            let index = 0;
            index < localStorage.length;
            index += 1
        ) {
            const key =
                localStorage.key(
                    index
                );

            if (
                key
                && key.startsWith(
                    SIDEBAR_CACHE_PREFIX
                )
            ) {
                keysToRemove.push(
                    key
                );
            }
        }

        keysToRemove.forEach(
            (key) => {
                localStorage.removeItem(
                    key
                );
            }
        );
    } catch (error) {
        console.warn(
            "Không xóa được cache sidebar:",
            error
        );
    }
}

/**
 * Nội dung thông báo tài khoản
 * không được phép đăng nhập.
 */
function getInvalidAccountMessage(
    status
) {
    const normalizedStatus =
        String(status || "")
            .trim()
            .toLowerCase();

    if (
        normalizedStatus ===
        "pending"
    ) {
        return (
            "Tài khoản đang chờ quản trị viên xác nhận."
        );
    }

    if (
        normalizedStatus ===
        "locked"
    ) {
        return (
            "Tài khoản đã bị khóa."
        );
    }

    if (
        normalizedStatus ===
        "deleted"
    ) {
        return (
            "Tài khoản không còn tồn tại."
        );
    }

    return (
        "Tài khoản không có quyền truy cập."
    );
}

/**
 * Chuyển về trang đăng nhập.
 */
async function redirectToLogin(
    message = ""
) {
    clearSavedProfile();

    try {
        await logout();
    } catch (error) {
        console.warn(
            "Không thể đăng xuất Firebase:",
            error
        );
    }

    const redirectUrl =
        new URL(
            "./login.html",
            window.location.href
        );

    if (message) {
        redirectUrl.searchParams.set(
            "message",
            message
        );
    }

    window.location.replace(
        redirectUrl.href
    );
}

/**
 * Gắn sự kiện đăng xuất.
 */
function bindLogoutEvents() {
    const logoutButton =
        document.querySelector(
            "#logoutButton"
        );

    const confirmLogoutButton =
        document.querySelector(
            "#confirmLogoutButton"
        );

    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    if (
        !logoutButton
        || !confirmLogoutButton
        || !logoutModal
    ) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        () => {
            if (isLoggingOut) {
                return;
            }

            openLogoutModal(
                logoutModal
            );
        }
    );

    confirmLogoutButton.addEventListener(
        "click",
        async () => {
            if (isLoggingOut) {
                return;
            }

            await handleLogout(
                logoutButton,
                confirmLogoutButton
            );
        }
    );

    logoutModal
        .querySelectorAll(
            "[data-close-logout-modal]"
        )
        .forEach(
            (element) => {
                element.addEventListener(
                    "click",
                    () => {
                        if (
                            isLoggingOut
                        ) {
                            return;
                        }

                        closeLogoutModal(
                            logoutModal
                        );
                    }
                );
            }
        );

    document.addEventListener(
        "keydown",
        handleLogoutEscape
    );
}
/**
 * Mở hộp thoại xác nhận đăng xuất.
 */
function openLogoutModal(
    logoutModal
) {
    logoutModal.classList.remove(
        "hidden"
    );

    logoutModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    document.body.style.overflow =
        "hidden";

    window.setTimeout(
        () => {
            document
                .querySelector(
                    "#confirmLogoutButton"
                )
                ?.focus();
        },
        0
    );
}

/**
 * Đóng hộp thoại xác nhận đăng xuất.
 */
function closeLogoutModal(
    logoutModal
) {
    logoutModal.classList.add(
        "hidden"
    );

    logoutModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    document.body.style.overflow =
        "";
}

/**
 * Đóng hộp thoại đăng xuất
 * bằng phím Escape.
 */
function handleLogoutEscape(event) {
    if (
        event.key !== "Escape"
        || isLoggingOut
    ) {
        return;
    }

    const logoutModal =
        document.querySelector(
            "#logoutConfirmModal"
        );

    if (
        !logoutModal
        || logoutModal.classList.contains(
            "hidden"
        )
    ) {
        return;
    }

    closeLogoutModal(
        logoutModal
    );
}

/**
 * Thực hiện đăng xuất.
 */
async function handleLogout(
    logoutButton,
    confirmLogoutButton
) {
    if (isLoggingOut) {
        return;
    }

    isLoggingOut = true;

    const logoutButtonText =
        document.querySelector(
            "#logoutButtonText"
        );

    logoutButton.disabled =
        true;

    confirmLogoutButton.disabled =
        true;

    confirmLogoutButton.textContent =
        "Đang đăng xuất...";

    if (logoutButtonText) {
        logoutButtonText.textContent =
            "Đang đăng xuất...";
    }

    try {
        await logout();
    } catch (error) {
        console.warn(
            "Firebase đăng xuất có lỗi:",
            error
        );
    } finally {
        clearSavedProfile();

        currentProfile = null;

        document.body.classList.remove(
            "modal-open"
        );

        document.body.classList.remove(
            "sidebar-open"
        );

        document.body.style.overflow =
            "";

        window.location.replace(
            "./login.html"
        );
    }
}

/**
 * Gắn sự kiện sidebar trên điện thoại.
 */
function bindMobileSidebarEvents() {
    const sidebarToggle =
        document.querySelector(
            "#sidebarToggle"
        );

    const sidebar =
        document.querySelector(
            "#sidebarContainer .sidebar"
        );

    const sidebarOverlay =
        document.querySelector(
            "#sidebarOverlay"
        );

    if (
        !sidebarToggle
        || !sidebar
    ) {
        return;
    }

    function openSidebar() {
        sidebar.classList.add(
            "mobile-open"
        );

        sidebarOverlay?.classList.add(
            "show"
        );

        document.body.classList.add(
            "sidebar-open"
        );
    }

    function closeSidebar() {
        sidebar.classList.remove(
            "mobile-open"
        );

        sidebarOverlay?.classList.remove(
            "show"
        );

        document.body.classList.remove(
            "sidebar-open"
        );
    }

    sidebarToggle.onclick = () => {
        const isOpen =
            sidebar.classList.contains(
                "mobile-open"
            );

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    };

    if (sidebarOverlay) {
        sidebarOverlay.onclick =
            closeSidebar;
    }

    document
        .querySelectorAll(
            "#sidebarContainer .menu-link"
        )
        .forEach(
            (menuLink) => {
                menuLink.addEventListener(
                    "click",
                    closeSidebar
                );
            }
        );
}

/**
 * Nhận profile mới do auth-guard
 * gửi sang sau khi Firebase xác minh.
 */
function handleAuthProfileUpdated(
    event
) {
    const updatedProfile =
        normalizeProfile(
            event?.detail?.profile
        );

    if (
        !updatedProfile
        || !isProfileAllowed(
            updatedProfile
        )
    ) {
        return;
    }

    const previousRole =
        normalizeRole(
            currentProfile?.role
        );

    const newRole =
        normalizeRole(
            updatedProfile.role
        );

    currentProfile =
        updatedProfile;

    /*
        Khi quyền tài khoản thay đổi,
        tải lại đúng sidebar.
    */
    if (
        previousRole
        && previousRole !== newRole
    ) {
        const sidebarContainer =
            document.querySelector(
                "#sidebarContainer"
            );

        if (sidebarContainer) {
            renderSidebarForProfile(
                sidebarContainer,
                updatedProfile
            ).catch(
                (error) => {
                    console.error(
                        "Không cập nhật được sidebar:",
                        error
                    );
                }
            );
        }

        return;
    }

    setSidebarUserInfo(
        updatedProfile
    );

    removeUnauthorizedMenuItems(
        updatedProfile.role
    );

    setActiveMenu();
}

/**
 * Khởi chạy sidebar sau khi HTML
 * đã tải xong.
 */
function startSidebar() {
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            loadSidebar,
            {
                once: true
            }
        );

        return;
    }

    loadSidebar();
}

/**
 * Gỡ sự kiện khi rời trang.
 */
window.addEventListener(
    "beforeunload",
    () => {
        document.removeEventListener(
            "keydown",
            handleLogoutEscape
        );
    }
);

window.addEventListener(
    "larva-auth-profile-updated",
    handleAuthProfileUpdated
);

startSidebar();