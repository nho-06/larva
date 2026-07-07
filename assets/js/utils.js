export function formatMoney(value) {
    const number = Number(value || 0);

    return number.toLocaleString("vi-VN") + " ₫";
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase("vi");
}

export function placeholderImage() {
    return "https://placehold.co/96x116?text=No+Image";
}