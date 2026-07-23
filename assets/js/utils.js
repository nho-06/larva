/**
 * Định dạng tiền Việt Nam.
 */
export function formatMoney(value) {
    const number =
        Number(value || 0);

    const safeNumber =
        Number.isFinite(number)
            ? number
            : 0;

    return (
        safeNumber.toLocaleString(
            "vi-VN"
        )
        +
        " ₫"
    );
}


/**
 * Chống chèn mã HTML.
 */
export function escapeHtml(value) {
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
 * Chuẩn hóa văn bản để tìm kiếm.
 */
export function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(
            "vi"
        );
}


/**
 * Tạo ảnh thay thế ngay trong trình duyệt.
 *
 * Không gọi placehold.co hoặc website bên ngoài,
 * nên ảnh No Image xuất hiện ngay cả khi mạng chậm.
 */
export function placeholderImage() {
    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="160"
            height="160"
            viewBox="0 0 160 160"
        >
            <rect
                width="160"
                height="160"
                rx="18"
                fill="#eeeeee"
            />

            <g
                fill="none"
                stroke="#b7b7b7"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <rect
                    x="42"
                    y="38"
                    width="76"
                    height="66"
                    rx="9"
                />

                <circle
                    cx="64"
                    cy="60"
                    r="8"
                />

                <path
                    d="M48 95l21-22 14 14 11-11 20 19"
                />
            </g>

            <text
                x="80"
                y="128"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="13"
                fill="#888888"
            >
                No Image
            </text>
        </svg>
    `;

    return (
        "data:image/svg+xml;charset=UTF-8,"
        +
        encodeURIComponent(svg)
    );
}


/**
 * Lấy link ảnh hợp lệ của sản phẩm.
 *
 * Hỗ trợ cả dữ liệu dùng trường image
 * và dữ liệu cũ dùng imageUrl.
 */
export function getProductImage(
    product
) {
    const image =
        String(
            product?.image
            ||
            product?.imageUrl
            ||
            ""
        ).trim();

    return (
        image
        ||
        placeholderImage()
    );
}


/**
 * Kiểm tra một đường dẫn có phải
 * ảnh Base64 hay không.
 */
export function isBase64Image(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .startsWith(
            "data:image/"
        );
}