/*
    Quản lý tem mã vạch sản phẩm 30 × 50 mm.

    Tem thực tế:
    - Rộng: 30 mm
    - Cao theo chiều kéo giấy: 50 mm

    Máy in nhiệt 203 DPI:
    - 30 mm ≈ 240 px
    - 50 mm ≈ 400 px

    Ảnh PNG được chèn metadata 203 DPI
    để ứng dụng in nhận đúng kích thước vật lý.
*/

const LABEL_WIDTH_PX = 240;
const LABEL_HEIGHT_PX = 400;

const LABEL_WIDTH_MM = 30;
const LABEL_HEIGHT_MM = 50;

const LABEL_DPI = 203;


/* =========================================================
   HÀM HỖ TRỢ VĂN BẢN
========================================================= */

function fitCanvasText(
    context,
    text,
    maxWidth,
    startSize,
    minSize,
    weight = "700"
) {
    let fontSize =
        startSize;

    while (
        fontSize > minSize
    ) {
        context.font =
            `${weight} ${fontSize}px Arial, sans-serif`;

        const measuredWidth =
            context.measureText(
                text
            ).width;

        if (
            measuredWidth <= maxWidth
        ) {
            break;
        }

        fontSize -=
            1;
    }

    return fontSize;
}


function normalizeFilePart(value) {
    return String(
        value
        || "san-pham"
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
        formatMoney(
            value
        )
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


function getBarcodeText(
    product
) {
    /*
        Ưu tiên SKU ngắn để mã dễ quét.

        Ví dụ:
        MK005
        H001
        GB012
    */
    return String(
        product?.sku
        || product?.barcode
        || ""
    ).trim();
}


/* =========================================================
   KIỂM TRA PHỤ THUỘC
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
   CRC32 CHO PNG
========================================================= */

function calculateCrc32(
    bytes
) {
    let crc =
        0xffffffff;

    for (
        let index = 0;
        index < bytes.length;
        index += 1
    ) {
        crc ^=
            bytes[index];

        for (
            let bit = 0;
            bit < 8;
            bit += 1
        ) {
            crc =
                (
                    crc >>> 1
                )
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
   THÊM DPI VÀO ẢNH PNG
========================================================= */

function createPhysChunk(
    dpi
) {
    /*
        pHYs lưu số pixel trên mét.

        203 DPI:
        203 / 0.0254 ≈ 7992 pixel/mét.
    */
    const pixelsPerMeter =
        Math.round(
            dpi / 0.0254
        );

    /*
        Cấu trúc chunk:

        4 byte: độ dài dữ liệu
        4 byte: tên pHYs
        9 byte: dữ liệu
        4 byte: CRC
    */
    const chunk =
        new Uint8Array(
            21
        );

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
        Tên chunk "pHYs".
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
        Pixel/mét theo chiều X.
    */
    view.setUint32(
        8,
        pixelsPerMeter,
        false
    );

    /*
        Pixel/mét theo chiều Y.
    */
    view.setUint32(
        12,
        pixelsPerMeter,
        false
    );

    /*
        1 = đơn vị mét.
    */
    chunk[16] =
        1;

    /*
        CRC tính từ tên chunk và dữ liệu.
    */
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


function findFirstPngChunkEnd(
    source
) {
    /*
        PNG bắt đầu bằng 8 byte signature.

        Chunk đầu tiên thường là IHDR.
        Ta chèn pHYs ngay sau IHDR để ứng dụng dễ nhận.
    */
    const view =
        new DataView(
            source.buffer,
            source.byteOffset,
            source.byteLength
        );

    const firstChunkLength =
        view.getUint32(
            8,
            false
        );

    /*
        8 byte signature
        + 4 byte length
        + 4 byte type
        + dữ liệu
        + 4 byte CRC
    */
    return (
        8
        + 4
        + 4
        + firstChunkLength
        + 4
    );
}


function addPngDpiMetadata(
    pngArrayBuffer,
    dpi = LABEL_DPI
) {
    const source =
        new Uint8Array(
            pngArrayBuffer
        );

    /*
        Kiểm tra PNG signature.
    */
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

    const isPng =
        pngSignature.every(
            (
                byte,
                index
            ) => {
                return (
                    source[index]
                    === byte
                );
            }
        );

    if (
        !isPng
    ) {
        throw new Error(
            "Dữ liệu ảnh không phải PNG hợp lệ."
        );
    }

    const physChunk =
        createPhysChunk(
            dpi
        );

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
   CHUYỂN CANVAS THÀNH PNG CÓ DPI
========================================================= */

function canvasToBlob(
    canvas
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            canvas.toBlob(
                async (
                    originalBlob
                ) => {
                    if (
                        !originalBlob
                    ) {
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

                        const finalBlob =
                            new Blob(
                                [
                                    pngWithDpi
                                ],
                                {
                                    type:
                                        "image/png"
                                }
                            );

                        resolve(
                            finalBlob
                        );
                    } catch (
                        error
                    ) {
                        reject(
                            error
                        );
                    }
                },
                "image/png",
                1
            );
        }
    );
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
        getBarcodeText(
            product
        );

    if (
        !barcodeText
    ) {
        throw new Error(
            "Sản phẩm chưa có mã để in."
        );
    }

    /*
        Kích thước ảnh đúng 30 × 50 mm ở 203 DPI.
    */
    canvas.width =
        LABEL_WIDTH_PX;

    canvas.height =
        LABEL_HEIGHT_PX;

    const context =
        canvas.getContext(
            "2d",
            {
                alpha:
                    false
            }
        );

    if (
        !context
    ) {
        throw new Error(
            "Trình duyệt không hỗ trợ tạo ảnh tem."
        );
    }

    /*
        Không làm mịn barcode.
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
            LABEL_WIDTH_PX - 24,
            25,
            13,
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
       TẠO BARCODE CODE 128
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
                Module rộng 2 px.

                Với SKU ngắn, barcode vừa tem 30 mm
                và vẫn đủ rõ để quét.
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
        76;

    /*
        Không co giãn barcode.
    */
    context.drawImage(
        barcodeCanvas,
        barcodeX,
        barcodeY
    );


    /* =====================================================
       MÃ DƯỚI BARCODE
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
        253
    );


    /* =====================================================
       SKU VÀ GIÁ Ở DƯỚI TEM
    ===================================================== */

    context.font =
        "700 19px Arial, sans-serif";

    context.textAlign =
        "left";

    context.fillText(
        barcodeText,
        13,
        381
    );

    context.textAlign =
        "right";

    context.fillText(
        priceText,
        LABEL_WIDTH_PX - 13,
        381
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


    function setMessage(
        message
    ) {
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
            + `${LABEL_WIDTH_MM}x${LABEL_HEIGHT_MM}-`
            + `${LABEL_DPI}dpi.png`
        );
    }


    async function open(
        product
    ) {
        if (
            state.isGenerating
        ) {
            return;
        }

        const barcodeText =
            getBarcodeText(
                product
            );

        if (
            !barcodeText
        ) {
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
            "Đang tạo ảnh tem 30 × 50 mm..."
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
                "Tem 30 × 50 mm, 203 DPI đã sẵn sàng. Trong Fun Print chọn giấy dán nhãn có khe hở và Nguyên văn."
            );
        } catch (
            error
        ) {
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
        if (
            !state.blob
        ) {
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
        if (
            !state.blob
        ) {
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

            if (
                canShareFile
            ) {
                await navigator.share({
                    title:
                        "Tem mã vạch Larva",

                    text:
                        "Tem mã vạch 30 × 50 mm, 203 DPI",

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
        } catch (
            error
        ) {
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
                (
                    element
                ) => {
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