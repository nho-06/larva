/*
    Quản lý tem mã vạch sản phẩm 30 × 50 mm (tem dọc).

    Tem thực tế của bạn:
    - Rộng: 30 mm
    - Dài theo chiều kéo giấy: 50 mm

    Kích thước canvas tương ứng:
    - Rộng: 240 px
    - Cao: 400 px

    Mục tiêu:
    - Xuất ảnh đúng tỉ lệ tem dọc.
    - Barcode to, rõ, dễ quét.
    - Hạn chế khoảng trắng thừa.
*/

const LABEL_WIDTH_PX = 240;
const LABEL_HEIGHT_PX = 400;

const LABEL_WIDTH_MM = 30;
const LABEL_HEIGHT_MM = 50;


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
        Ưu tiên SKU ngắn để barcode dễ quét hơn.
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
        Đặt đúng kích thước tem dọc 30 × 50 mm.
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
            210,
            26,
            14,
            "700"
        );

    context.font =
        `700 ${titleSize}px Arial, sans-serif`;

    context.fillText(
        productName,
        LABEL_WIDTH_PX / 2,
        32
    );


    /* =====================================================
       BARCODE
    ===================================================== */

    const barcodeCanvas =
        document.createElement(
            "canvas"
        );

    window.JsBarcode(
        barcodeCanvas,
        barcodeText,
        {
            format:
                "CODE128",

            /*
                Để barcode đủ to và dễ quét.
            */
            width:
                2,

            height:
                145,

            displayValue:
                false,

            marginLeft:
                10,

            marginRight:
                10,

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
        > LABEL_WIDTH_PX - 8
    ) {
        throw new Error(
            "Mã sản phẩm quá dài để in rõ trên tem 30 × 50 mm."
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
        78;

    context.drawImage(
        barcodeCanvas,
        barcodeX,
        barcodeY
    );


    /* =====================================================
       SKU / BARCODE TEXT NHỎ DƯỚI MÃ
    ===================================================== */

    context.fillStyle =
        "#000000";

    context.textAlign =
        "center";

    context.textBaseline =
        "alphabetic";

    context.font =
        "700 18px Arial, sans-serif";

    context.fillText(
        barcodeText,
        LABEL_WIDTH_PX / 2,
        255
    );


    /* =====================================================
       MÃ SP VÀ GIÁ Ở DƯỚI
    ===================================================== */

    context.font =
        "700 20px Arial, sans-serif";

    context.textAlign =
        "left";

    context.fillText(
        barcodeText,
        14,
        382
    );

    context.textAlign =
        "right";

    context.fillText(
        priceText,
        LABEL_WIDTH_PX - 14,
        382
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
        product: null,
        blob: null,
        isGenerating: false
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
                "Tem đã sẵn sàng. Trong Fun Print hãy chọn giấy dán nhãn có khe hở, khổ 30 × 50 mm, chế độ Nguyên văn."
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
                [state.blob],
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
                    files: [file]
                });

            if (canShareFile) {
                await navigator.share({
                    title:
                        "Tem mã vạch Larva",
                    text:
                        "Tem mã vạch 30 × 50 mm",
                    files: [file]
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