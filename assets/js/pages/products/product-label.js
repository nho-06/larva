/*
    Quản lý tem mã vạch sản phẩm 50 × 30 mm.

    Máy in MXW01 thường có độ phân giải khoảng 203 DPI.

    Tem 50 × 30 mm tương ứng gần:
    - Rộng: 400 px
    - Cao: 240 px

    Barcode được tạo đúng kích thước cuối cùng,
    không phóng to hoặc thu nhỏ để tránh vạch bị nhòe.
*/

const LABEL_WIDTH_PX = 400;
const LABEL_HEIGHT_PX = 240;

const LABEL_WIDTH_MM = 50;
const LABEL_HEIGHT_MM = 30;


/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

function fitCanvasText(
    context,
    text,
    maxWidth,
    startSize,
    minSize,
    weight = "700"
) {
    let fontSize = startSize;

    while (fontSize > minSize) {
        context.font =
            `${weight} ${fontSize}px Arial, sans-serif`;

        const measuredWidth =
            context.measureText(text).width;

        if (measuredWidth <= maxWidth) {
            break;
        }

        fontSize -= 1;
    }

    return fontSize;
}

function canvasToBlob(canvas) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                        return;
                    }

                    reject(
                        new Error(
                            "Không thể tạo ảnh tem."
                        )
                    );
                },
                "image/png",
                1
            );
        }
    );
}

function normalizeFilePart(value) {
    return String(
        value || "san-pham"
    )
        .trim()
        .replace(
            /[^a-zA-Z0-9_-]/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        );
}

function normalizePriceText(
    value,
    formatMoney
) {
    return String(
        formatMoney(value)
        || ""
    )
        .replace(
            /\s+/g,
            ""
        )
        .replace(
            /₫/g,
            "đ"
        );
}

function getBarcodeText(product) {
    /*
        Ưu tiên SKU ngắn để barcode dễ quét.

        Ví dụ:
        MK007
        H001
        BN015

        Không ưu tiên chuỗi barcode dài kiểu:
        LRV-1761234567890-123
    */
    return String(
        product?.sku
        || product?.barcode
        || ""
    ).trim();
}

function assertDependencies(
    elements,
    formatMoney
) {
    if (
        typeof formatMoney
        !== "function"
    ) {
        throw new Error(
            "Thiếu hàm formatMoney."
        );
    }

    if (
        typeof window.JsBarcode
        !== "function"
    ) {
        throw new Error(
            "Thư viện JsBarcode chưa được tải."
        );
    }

    if (!elements?.labelPrintModal) {
        throw new Error(
            "Không tìm thấy modal in tem."
        );
    }

    if (!elements?.labelCanvas) {
        throw new Error(
            "Không tìm thấy canvas tem."
        );
    }
}


/* =========================================================
   TẠO ẢNH TEM
========================================================= */

async function drawProductLabel({
    product,
    canvas,
    formatMoney
}) {
    const barcodeText =
        getBarcodeText(product);

    if (!barcodeText) {
        throw new Error(
            "Sản phẩm chưa có mã để in."
        );
    }

    /*
        Luôn đặt đúng kích thước cuối cùng.

        Việc này tránh trường hợp canvas bị giữ kích thước
        1000 × 600 từ phiên bản cũ.
    */
    canvas.width =
        LABEL_WIDTH_PX;

    canvas.height =
        LABEL_HEIGHT_PX;

    const context =
        canvas.getContext(
            "2d",
            {
                alpha: false
            }
        );

    if (!context) {
        throw new Error(
            "Trình duyệt không hỗ trợ tạo ảnh tem."
        );
    }

    /*
        Không làm mịn hình ảnh barcode.

        Nếu bật image smoothing, trình duyệt có thể tạo
        các điểm xám ở rìa vạch, làm máy quét khó nhận.
    */
    context.imageSmoothingEnabled =
        false;

    context.clearRect(
        0,
        0,
        LABEL_WIDTH_PX,
        LABEL_HEIGHT_PX
    );

    context.fillStyle =
        "#ffffff";

    context.fillRect(
        0,
        0,
        LABEL_WIDTH_PX,
        LABEL_HEIGHT_PX
    );

    const productName =
        String(
            product?.name
            || "Sản phẩm"
        ).trim();

    const priceText =
        normalizePriceText(
            product?.salePrice,
            formatMoney
        );


    /* =====================================================
       TÊN SẢN PHẨM
    ===================================================== */

    context.fillStyle =
        "#000000";

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    const titleSize =
        fitCanvasText(
            context,
            productName,
            350,
            25,
            15,
            "700"
        );

    context.font =
        `700 ${titleSize}px Arial, sans-serif`;

    context.fillText(
        productName,
        LABEL_WIDTH_PX / 2,
        25
    );


    /* =====================================================
       BARCODE CODE 128
    ===================================================== */

    const barcodeCanvas =
        document.createElement(
            "canvas"
        );

    /*
        width phải là số nguyên.

        width: 3 nghĩa là module nhỏ nhất rộng 3 pixel.
        Barcode sẽ sắc hơn và dễ quét hơn width thập phân.
    */
    window.JsBarcode(
        barcodeCanvas,
        barcodeText,
        {
            format:
                "CODE128",

            width:
                3,

            height:
                92,

            displayValue:
                false,

            /*
                Quiet zone hai bên barcode.

                Máy quét cần khoảng trắng để xác định
                điểm bắt đầu và kết thúc barcode.
            */
            marginLeft:
                18,

            marginRight:
                18,

            marginTop:
                0,

            marginBottom:
                0,

            background:
                "#ffffff",

            lineColor:
                "#000000"
        }
    );

    if (
        barcodeCanvas.width
        > LABEL_WIDTH_PX - 20
    ) {
        throw new Error(
            "Mã sản phẩm quá dài để in rõ trên tem 50 × 30 mm."
        );
    }

    const barcodeX =
        Math.round(
            (
                LABEL_WIDTH_PX
                - barcodeCanvas.width
            ) / 2
        );

    const barcodeY =
        55;

    /*
        Chỉ truyền tọa độ X và Y.

        Không truyền width/height vào drawImage,
        vì truyền kích thước sẽ làm barcode bị co giãn.
    */
    context.drawImage(
        barcodeCanvas,
        barcodeX,
        barcodeY
    );


    /* =====================================================
       MÃ SẢN PHẨM VÀ GIÁ
    ===================================================== */

    context.fillStyle =
        "#000000";

    context.textBaseline =
        "alphabetic";

    context.font =
        "700 18px Arial, sans-serif";

    context.textAlign =
        "left";

    context.fillText(
        barcodeText,
        22,
        218
    );

    context.textAlign =
        "right";

    context.fillText(
        priceText,
        LABEL_WIDTH_PX - 22,
        218
    );

    return canvasToBlob(
        canvas
    );
}


/* =========================================================
   CONTROLLER TEM
========================================================= */

export function createProductLabelController({
    elements,
    formatMoney
}) {
    assertDependencies(
        elements,
        formatMoney
    );

    const state = {
        product:
            null,

        blob:
            null,

        isGenerating:
            false
    };


    function setMessage(message) {
        if (
            elements.labelPrintMessage
        ) {
            elements.labelPrintMessage.textContent =
                message;
        }
    }


    function getFileName() {
        const product =
            state.product
            || {};

        const code =
            normalizeFilePart(
                product.sku
                || product.barcode
                || "san-pham"
            );

        return (
            `tem-${code}-`
            + `${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}.png`
        );
    }


    async function open(product) {
        if (state.isGenerating) {
            return;
        }

        const barcodeText =
            getBarcodeText(product);

        if (!barcodeText) {
            window.alert(
                "Sản phẩm này chưa có mã để in."
            );

            return;
        }

        state.product =
            product;

        state.blob =
            null;

        state.isGenerating =
            true;

        if (
            elements.labelProductName
        ) {
            elements.labelProductName.textContent =
                product.name
                || "Sản phẩm";
        }

        if (
            elements.labelProductMeta
        ) {
            elements.labelProductMeta.textContent =
                `${barcodeText} • ${
                    formatMoney(
                        product.salePrice
                    )
                }`;
        }

        setMessage(
            "Đang tạo ảnh tem..."
        );

        elements.labelPrintModal
            .classList.remove(
                "hidden"
            );

        try {
            state.blob =
                await drawProductLabel({
                    product,
                    canvas:
                        elements.labelCanvas,
                    formatMoney
                });

            setMessage(
                "Tem đã sẵn sàng. Trong Fun Print hãy chọn Nguyên văn, khổ 50 × 30 mm."
            );
        } catch (error) {
            console.error(
                "Không thể tạo tem:",
                error
            );

            setMessage(
                error.message
                || "Không thể tạo ảnh tem."
            );
        } finally {
            state.isGenerating =
                false;
        }
    }


    function close() {
        state.product =
            null;

        state.blob =
            null;

        state.isGenerating =
            false;

        setMessage(
            ""
        );

        elements.labelPrintModal
            .classList.add(
                "hidden"
            );
    }


    async function download() {
        if (!state.blob) {
            setMessage(
                "Ảnh tem chưa được tạo."
            );

            return;
        }

        const objectUrl =
            URL.createObjectURL(
                state.blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            objectUrl;

        link.download =
            getFileName();

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        window.setTimeout(
            () => {
                URL.revokeObjectURL(
                    objectUrl
                );
            },
            1000
        );
    }


    async function share() {
        if (!state.blob) {
            setMessage(
                "Ảnh tem chưa được tạo."
            );

            return;
        }

        const file =
            new File(
                [
                    state.blob
                ],
                getFileName(),
                {
                    type:
                        "image/png"
                }
            );

        try {
            const canShareFile =
                typeof navigator.share
                    === "function"

                && typeof navigator.canShare
                    === "function"

                && navigator.canShare({
                    files: [
                        file
                    ]
                });

            if (canShareFile) {
                await navigator.share({
                    title:
                        "Tem mã vạch Larva",

                    text:
                        "Tem mã vạch 50 × 30 mm",

                    files: [
                        file
                    ]
                });

                return;
            }

            await download();

            setMessage(
                "Thiết bị không hỗ trợ chia sẻ file. Ảnh tem đã được lưu."
            );
        } catch (error) {
            if (
                error?.name
                === "AbortError"
            ) {
                return;
            }

            console.error(
                "Không thể chia sẻ tem:",
                error
            );

            setMessage(
                "Không thể chia sẻ. Hãy dùng nút Lưu ảnh tem."
            );
        }
    }


    function bindEvents() {
        document
            .querySelectorAll(
                "[data-close-label-modal]"
            )
            .forEach(
                (element) => {
                    element.addEventListener(
                        "click",
                        close
                    );
                }
            );

        elements.downloadLabelButton
            ?.addEventListener(
                "click",
                download
            );

        elements.shareLabelButton
            ?.addEventListener(
                "click",
                share
            );
    }


    return {
        bindEvents,
        open,
        close,
        download,
        share,

        isOpen() {
            return !elements
                .labelPrintModal
                .classList
                .contains(
                    "hidden"
                );
        }
    };
}