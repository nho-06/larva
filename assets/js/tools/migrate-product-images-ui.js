import {
    migrateLegacyProductImages
} from "./migrate-product-images.js";


/* =========================================================
   LẤY NÚT CHUYỂN ẢNH
========================================================= */

const migrateButton =
    document.querySelector(
        "#migrateProductImagesButton"
    );

let isMigrating =
    false;


/* =========================================================
   GẮN SỰ KIỆN
========================================================= */

migrateButton
    ?.addEventListener(
        "click",
        handleMigrateButtonClick
    );


/* =========================================================
   XỬ LÝ KHI BẤM NÚT
========================================================= */

async function handleMigrateButtonClick() {
    if (
        isMigrating
    ) {
        return;
    }

    const confirmed =
        window.confirm(
            "Chuyển toàn bộ ảnh Base64 cũ sang Firebase Storage?\n\n"
            +
            "Trước khi chạy, nên sao lưu nhánh products trong Firebase.\n\n"
            +
            "Không đóng trang trong lúc đang chuyển ảnh."
        );

    if (
        !confirmed
    ) {
        return;
    }

    isMigrating =
        true;

    setButtonState({
        disabled:
            true,

        text:
            "Đang kiểm tra ảnh..."
    });

    try {
        const result =
            await migrateLegacyProductImages(
                handleMigrationProgress
            );

        if (
            result.total === 0
        ) {
            window.alert(
                "Không còn ảnh Base64 cũ cần chuyển."
            );

            setButtonState({
                disabled:
                    false,

                text:
                    "Không còn ảnh cũ"
            });

            return;
        }

        const message = [
            "Chuyển ảnh hoàn tất.",
            "",
            `Tổng ảnh: ${result.total}`,
            `Thành công: ${result.success}`,
            `Lỗi: ${result.failed}`
        ].join(
            "\n"
        );

        window.alert(
            message
        );

        if (
            result.failed === 0
        ) {
            setButtonState({
                disabled:
                    true,

                text:
                    "Đã chuyển xong"
            });

            /*
                Tải lại trang để lấy URL ảnh mới
                và xóa các ảnh Base64 khỏi giao diện.
            */
            window.setTimeout(
                () => {
                    window.location.reload();
                },
                1000
            );

            return;
        }

        console.warn(
            "Danh sách ảnh chuyển lỗi:",
            result.errors
        );

        setButtonState({
            disabled:
                false,

            text:
                "Chuyển lại ảnh lỗi"
        });
    } catch (error) {
        console.error(
            "Không thể chuyển ảnh cũ:",
            error
        );

        window.alert(
            error?.message
            ||
            "Không thể chuyển ảnh cũ."
        );

        setButtonState({
            disabled:
                false,

            text:
                "Chuyển ảnh cũ"
        });
    } finally {
        isMigrating =
            false;
    }
}


/* =========================================================
   HIỂN THỊ TIẾN TRÌNH
========================================================= */

function handleMigrationProgress(
    progress
) {
    const current =
        Number(
            progress?.current
            ||
            0
        );

    const total =
        Number(
            progress?.total
            ||
            0
        );

    if (
        total > 0
    ) {
        setButtonState({
            disabled:
                true,

            text:
                `Đang chuyển ${current}/${total}`
        });
    } else {
        setButtonState({
            disabled:
                true,

            text:
                progress?.message
                ||
                "Đang xử lý..."
        });
    }

    if (
        progress?.message
    ) {
        console.log(
            progress.message
        );
    }
}


/* =========================================================
   CẬP NHẬT TRẠNG THÁI NÚT
========================================================= */

function setButtonState({
    disabled,
    text
}) {
    if (
        !migrateButton
    ) {
        return;
    }

    migrateButton.disabled =
        Boolean(
            disabled
        );

    migrateButton.textContent =
        String(
            text
            ||
            "Chuyển ảnh cũ"
        );
}