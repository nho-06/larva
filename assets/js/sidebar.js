async function loadSidebar() {
    const sidebarContainer =
        document.querySelector("#sidebarContainer");

    if (!sidebarContainer) {
        return;
    }

    try {
        const response = await fetch("./sidebar.html");

        if (!response.ok) {
            throw new Error(
                `Không thể tải sidebar.html: ${response.status}`
            );
        }

        const sidebarHtml =
            await response.text();

        sidebarContainer.innerHTML =
            sidebarHtml;

        setActiveMenu();
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

                <p style="
                    padding: 12px;
                    color: #7b5a68;
                    line-height: 1.5;
                ">
                    Không thể tải menu.
                    Hãy chạy web bằng Live Server.
                </p>

            </aside>
        `;
    }
}

function setActiveMenu() {
    let currentFile =
        window.location.pathname
            .split("/")
            .pop();

    if (!currentFile) {
        currentFile = "index.html";
    }

    const currentPage =
        currentFile.replace(".html", "");

    const menuLinks =
        document.querySelectorAll(".menu-link");

    menuLinks.forEach((link) => {
        const linkPage =
            link.dataset.page;

        link.classList.toggle(
            "active",
            linkPage === currentPage
        );
    });
}

loadSidebar();