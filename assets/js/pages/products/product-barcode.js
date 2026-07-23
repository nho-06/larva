
/*
    Tạo giá trị mã vạch tự động
    cho sản phẩm mới.

    Ví dụ:
    LRV-1784512345678-123
*/
export function generateBarcodeValue() {
    const timePart =
        Date.now();

    const randomPart =
        Math.floor(
            100
            + Math.random() * 900
        );

    return (
        `LRV-${timePart}-${randomPart}`
    );
}

/*
    Vẽ mã vạch bằng thư viện JsBarcode.

    compact = false:
    Dùng cho phần xem trước trong form.

    compact = true:
    Dùng cho mã vạch nhỏ trong bảng sản phẩm.
*/
export function renderBarcode(
    target,
    barcodeValue,
    compact = false
) {
    if (
        !target
        || !barcodeValue
        || typeof window.JsBarcode
            !== "function"
    ) {
        return;
    }

    try {
        window.JsBarcode(
            target,
            barcodeValue,
            {
                format:
                    "CODE128",

                width:
                    compact
                        ? 2
                        : 2.4,

                height:
                    compact
                        ? 42
                        : 80,

                displayValue:
                    true,

                fontSize:
                    compact
                        ? 11
                        : 14,

                margin:
                    compact
                        ? 6
                        : 10,

                background:
                    "#ffffff",

                lineColor:
                    "#111111"
            }
        );
    } catch (error) {
        console.error(
            "Không thể tạo mã vạch:",
            error
        );
    }
}

