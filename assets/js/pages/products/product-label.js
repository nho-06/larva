/*
    Tạo tem mã vạch nằm ngang 50 × 30 mm.

    Độ phân giải máy in:
    - 203 DPI
    - 50 mm ≈ 400 px
    - 30 mm ≈ 240 px

    Ảnh PNG được gắn metadata 203 DPI để hạn chế
    Fun Print tự hiểu sai kích thước ảnh.
*/

const LABEL_WIDTH_PX = 400;
const LABEL_HEIGHT_PX = 240;

const LABEL_WIDTH_MM = 50;
const LABEL_HEIGHT_MM = 30;

const LABEL_DPI = 203;


/* =========================================================
   HÀM XỬ LÝ VĂN BẢN
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

        if (
            context.measureText(text).width
            <= maxWidth
        ) {
            break;
        }

        fontSize -= 1;
    }

    return fontSize;
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
        formatMoney(value) || ""
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
        Ưu tiên SKU ngắn như:
        MK005
        Q001
        GB012

        SKU ngắn giúp barcode ít vạch,
        to hơn và dễ quét hơn.
    */
    return String(
        product?.sku
        || product?.barcode
        || ""
    ).trim();
}


/* =========================================================
   KIỂM TRA THÀNH PHẦN CẦN THIẾT
========================================================= */

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

    if (
        !elements?.labelPrintModal
    ) {
        throw new Error(
            "Không tìm thấy modal in tem."
        );
    }

    if (
        !elements?.labelCanvas
    ) {
        throw new Error(
            "Không tìm thấy canvas tem."
        );
    }
}


/* =========================================================
   CRC32 CHO FILE PNG
========================================================= */

function calculateCrc32(bytes) {
    let crc = 0xffffffff;

    for (
        let index = 0;
        index < bytes.length;
        index += 1
    ) {
        crc ^= bytes[index];

        for (
            let bit = 0;
            bit < 8;
            bit += 1
        ) {
            crc =
                (crc >>> 1)
                ^ (
                    crc & 1
                        ? 0xedb88320
                        : 0
                );
        }
    }

    return (
        crc ^ 0xffffffff
    ) >>> 0;
}


/* =========================================================
   TẠO CHUNK pHYs CHỨA DPI
========================================================= */

function createPhysChunk(dpi) {
    /*
        PNG lưu pixel trên mét.

        203 DPI:
        203 / 0.0254 ≈ 7992 pixel/mét.
    */
    const pixelsPerMeter =
        Math.round(
            dpi / 0.0254
        );

    /*
        Cấu trúc:
        - 4 byte độ dài
        - 4 byte tên pHYs
        - 9 byte dữ liệu
        - 4 byte CRC
    */
    const chunk =
        new Uint8Array(21);

    const view =
        new DataView(
            chunk.buffer
        );

    /*
        Dữ liệu pHYs dài 9 byte.
    */
    view.setUint32(
        0,
        9,
        false
    );

    /*
        Tên chunk: pHYs
    */
    chunk.set(
        [
            0x70,
            0x48,
            0x59,
            0x73
        ],
        4
    );

    /*
        Pixel/mét chiều ngang.
    */
    view.setUint32(
        8,
        pixelsPerMeter,
        false
    );

    /*
        Pixel/mét chiều dọc.
    */
    view.setUint32(
        12,
        pixelsPerMeter,
        false
    );

    /*
        Đơn vị là mét.
    */
    chunk[16] = 1;

    const crc =
        calculateCrc32(
            chunk.slice(
                4,
                17
            )
        );

    view.setUint32(
        17,
        crc,
        false
    );

    return chunk;
}


/* =========================================================
   TÌM VỊ TRÍ SAU CHUNK IHDR
========================================================= */

function findFirstPngChunkEnd(source) {
    const view =
        new DataView(
            source.buffer,
            source.byteOffset,
            source.byteLength
        );

    /*
        Chunk đầu tiên bắt đầu sau signature PNG 8 byte.

        8 byte signature
        + 4 byte length
        + 4 byte type
        + dữ liệu IHDR
        + 4 byte CRC
    */
    const firstChunkLength =
        view.getUint32(
            8,
            false
        );

    return (
        8
        + 4
        + 4
        + firstChunkLength
        + 4
    );
}


/* =========================================================
   CHÈN METADATA DPI VÀO PNG
========================================================= */

function addPngDpiMetadata(
    pngArrayBuffer,
    dpi = LABEL_DPI
) {
    const source =
        new Uint8Array(
            pngArrayBuffer
        );

    const pngSignature = [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a
    ];

    const isValidPng =
        pngSignature.every(
            (byte, index) => {
                return (
                    source[index]
                    === byte
                );
            }
        );

    if (!isValidPng) {
        throw new Error(
            "Dữ liệu ảnh PNG không hợp lệ."
        );
    }

    const physChunk =
        createPhysChunk(dpi);

    const insertPosition =
        findFirstPngChunkEnd(
            source
        );

    const result =
        new Uint8Array(
            source.length
            + physChunk.length
        );

    result.set(
        source.slice(
            0,
            insertPosition
        ),
        0
    );

    result.set(
        physChunk,
        insertPosition
    );

    result.set(
        source.slice(
            insertPosition
        ),
        insertPosition
        + physChunk.length
    );

    return result;
}


/* =========================================================
   CHUYỂN CANVAS THÀNH PNG 203 DPI
========================================================= */

function canvasToBlob(canvas) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                async (originalBlob) => {
                    if (!originalBlob) {
                        reject(
                            new Error(
                                "Không thể tạo ảnh tem."
                            )
                        );

                        return;
                    }

                    try {
                        const arrayBuffer =
                            await originalBlob
                                .arrayBuffer();

                        const pngWithDpi =
                            addPngDpiMetadata(
                                arrayBuffer,
                                LABEL_DPI
                            );

                        resolve(
                            new Blob(
                                [pngWithDpi],
                                {
                                    type:
                                        "image/png"
                                }
                            )
                        );
                    } catch (error) {
                        reject(error);
                    }
                },
                "image/png",
                1
            );
        }
    );
}


/* =========================================================
   TẠO HÌNH TEM 50 × 30 MM
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
        Canvas nằm ngang:
        rộng 400 px × cao 240 px.
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
        Không làm mịn barcode để mép vạch
        giữ nguyên màu đen trắng.
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
            LABEL_WIDTH_PX - 40,
            27,
            15,
            "700"
        );

    context.font =
        `700 ${titleSize}px Arial, sans-serif`;

    context.fillText(
        productName,
        LABEL_WIDTH_PX / 2,
        26
    );


    /* =====================================================
       BARCODE CODE 128
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
                Module rộng 3 px giúp barcode rõ,
                phù hợp với SKU ngắn.
            */
            width:
                3,

            height:
                112,

            displayValue:
                false,

            /*
                Khoảng trắng hai bên barcode
                để camera xác định đầu và cuối mã.
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

    const barcodeY = 56;

    /*
        Không truyền chiều rộng và chiều cao,
        tránh barcode bị trình duyệt kéo giãn.
    */
    context.drawImage(
        barcodeCanvas,
        barcodeX,
        barcodeY
    );


    /* =====================================================
       SKU VÀ GIÁ BÁN
    ===================================================== */

    context.fillStyle =
        "#000000";

    context.textBaseline =
        "alphabetic";

    context.font =
        "700 19px Arial, sans-serif";

    context.textAlign =
        "left";

    context.fillText(
        barcodeText,
        20,
        220
    );

    context.textAlign =
        "right";

    context.fillText(
        priceText,
        LABEL_WIDTH_PX - 20,
        220
    );

    return canvasToBlob(canvas);
}


/* =========================================================
   CONTROLLER TEM SẢN PHẨM
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
            state.product || {};

        const code =
            normalizeFilePart(
                product.sku
                || product.barcode
                || "san-pham"
            );

        return (
            `tem-${code}-`
            + `${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}-`
            + `${LABEL_DPI}dpi.png`
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
            "Đang tạo ảnh tem 50 × 30 mm..."
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
                "Tem ngang 50 × 30 mm, 203 DPI đã sẵn sàng. Trong Fun Print chọn giấy dán nhãn có khe hở, hướng ngang và Nguyên văn."
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

        setMessage("");

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
                        "Tem mã vạch ngang 50 × 30 mm, 203 DPI",

                    files:
                        [file]
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