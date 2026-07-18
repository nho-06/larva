/*
    Camera quét mã vạch sản phẩm.

    Chức năng:
    - Ưu tiên camera sau.
    - Không ép camera về 0.5x.
    - Zoom thủ công nếu trình duyệt hỗ trợ.
    - Nút quay về 1x.
    - Chạm vào camera để yêu cầu lấy nét.
    - Tìm sản phẩm bằng SKU hoặc barcode.
*/

export function createProductScannerController({
    elements,
    getProducts,
    normalizeText,
    onProductFound
}) {
    const state = {
        scanner: null,
        running: false,
        scanLocked: false,

        video: null,
        videoTrack: null,

        zoomMin: 1,
        zoomMax: 1,
        zoomStep: 0.1,
        currentZoom: 1
    };


    /* =====================================================
       KIỂM TRA
    ===================================================== */

    function assertDependencies() {
        if (
            typeof window.Html5Qrcode
            !== "function"
        ) {
            throw new Error(
                "Thư viện Html5Qrcode chưa được tải."
            );
        }

        if (
            typeof window.Html5QrcodeSupportedFormats
            === "undefined"
        ) {
            throw new Error(
                "Thiếu định dạng mã vạch hỗ trợ."
            );
        }

        if (
            typeof getProducts
            !== "function"
        ) {
            throw new Error(
                "Thiếu hàm lấy danh sách sản phẩm."
            );
        }

        if (
            typeof normalizeText
            !== "function"
        ) {
            throw new Error(
                "Thiếu hàm normalizeText."
            );
        }

        if (
            typeof onProductFound
            !== "function"
        ) {
            throw new Error(
                "Thiếu hàm xử lý sản phẩm sau khi quét."
            );
        }

        if (!elements?.scannerModal) {
            throw new Error(
                "Không tìm thấy scannerModal."
            );
        }

        if (!elements?.barcodeReader) {
            throw new Error(
                "Không tìm thấy barcodeReader."
            );
        }
    }


    /* =====================================================
       GIAO DIỆN
    ===================================================== */

    function setMessage(message) {
        if (elements.scannerMessage) {
            elements.scannerMessage.textContent =
                message;
        }
    }


    function showModal() {
        elements.scannerModal
            .classList.remove(
                "hidden"
            );
    }


    function hideModal() {
        elements.scannerModal
            .classList.add(
                "hidden"
            );
    }


    function showCameraControls() {
        elements.cameraControls
            ?.classList.remove(
                "hidden"
            );
    }


    function hideCameraControls() {
        elements.cameraControls
            ?.classList.add(
                "hidden"
            );
    }


    function updateZoomText(value) {
        if (!elements.cameraZoomValue) {
            return;
        }

        const numericValue =
            Number(value);

        elements.cameraZoomValue.textContent =
            `${
                Number.isFinite(numericValue)
                    ? numericValue.toFixed(1)
                    : "1.0"
            }x`;
    }


    /* =====================================================
       CẤU HÌNH SCANNER
    ===================================================== */

    function createScanner() {
        return new window.Html5Qrcode(
            "barcodeReader",
            false
        );
    }


    function getScannerConfig() {
        const viewportWidth =
            Math.max(
                window.innerWidth || 320,
                320
            );

        const scanWidth =
            Math.min(
                380,
                Math.max(
                    250,
                    viewportWidth - 50
                )
            );

        return {
            fps: 20,

            qrbox: {
                width: scanWidth,
                height: 170
            },

            aspectRatio: 16 / 9,

            disableFlip: true,

            experimentalFeatures: {
                useBarCodeDetectorIfSupported:
                    true
            },

            formatsToSupport: [
                window
                    .Html5QrcodeSupportedFormats
                    .CODE_128,

                window
                    .Html5QrcodeSupportedFormats
                    .CODE_39,

                window
                    .Html5QrcodeSupportedFormats
                    .EAN_13,

                window
                    .Html5QrcodeSupportedFormats
                    .EAN_8,

                window
                    .Html5QrcodeSupportedFormats
                    .UPC_A,

                window
                    .Html5QrcodeSupportedFormats
                    .UPC_E,

                window
                    .Html5QrcodeSupportedFormats
                    .ITF
            ]
        };
    }


    /* =====================================================
       CAMERA HIỆN TẠI
    ===================================================== */

    function getActiveVideo() {
        return (
            elements.barcodeReader
                ?.querySelector("video")
            || null
        );
    }


    function getActiveTrack() {
        const video =
            getActiveVideo();

        const stream =
            video?.srcObject;

        return (
            stream
                ?.getVideoTracks?.()[0]
            || null
        );
    }


    /* =====================================================
       ZOOM CAMERA
    ===================================================== */

    async function applyZoom(value) {
        if (!state.videoTrack) {
            return;
        }

        const requestedZoom =
            Number(value);

        if (
            !Number.isFinite(requestedZoom)
        ) {
            return;
        }

        const safeZoom =
            Math.min(
                state.zoomMax,
                Math.max(
                    state.zoomMin,
                    requestedZoom
                )
            );

        try {
            await state.videoTrack
                .applyConstraints({
                    advanced: [
                        {
                            zoom: safeZoom
                        }
                    ]
                });

            state.currentZoom =
                safeZoom;

            if (
                elements.cameraZoomInput
            ) {
                elements.cameraZoomInput.value =
                    String(safeZoom);
            }

            updateZoomText(
                safeZoom
            );
        } catch (error) {
            console.warn(
                "Camera không hỗ trợ đổi zoom:",
                error
            );
        }
    }


    async function resetZoom() {
        const zoomOneX =
            Math.min(
                state.zoomMax,
                Math.max(
                    state.zoomMin,
                    1
                )
            );

        await applyZoom(
            zoomOneX
        );
    }


    /* =====================================================
       LẤY NÉT
    ===================================================== */

    async function focusAtPoint(event) {
        if (
            !state.videoTrack
            || !state.video
        ) {
            return;
        }

        try {
            const capabilities =
                state.videoTrack
                    .getCapabilities
                    ? state.videoTrack
                        .getCapabilities()
                    : {};

            const rectangle =
                state.video
                    .getBoundingClientRect();

            if (
                rectangle.width <= 0
                || rectangle.height <= 0
            ) {
                return;
            }

            const pointX =
                Math.min(
                    1,
                    Math.max(
                        0,
                        (
                            event.clientX
                            - rectangle.left
                        ) / rectangle.width
                    )
                );

            const pointY =
                Math.min(
                    1,
                    Math.max(
                        0,
                        (
                            event.clientY
                            - rectangle.top
                        ) / rectangle.height
                    )
                );

            if (
                capabilities.pointsOfInterest
            ) {
                await state.videoTrack
                    .applyConstraints({
                        advanced: [
                            {
                                pointsOfInterest: [
                                    {
                                        x: pointX,
                                        y: pointY
                                    }
                                ]
                            }
                        ]
                    });
            }

            if (
                Array.isArray(
                    capabilities.focusMode
                )
            ) {
                if (
                    capabilities.focusMode.includes(
                        "single-shot"
                    )
                ) {
                    await state.videoTrack
                        .applyConstraints({
                            advanced: [
                                {
                                    focusMode:
                                        "single-shot"
                                }
                            ]
                        });
                } else if (
                    capabilities.focusMode.includes(
                        "continuous"
                    )
                ) {
                    await state.videoTrack
                        .applyConstraints({
                            advanced: [
                                {
                                    focusMode:
                                        "continuous"
                                }
                            ]
                        });
                }
            }

            setMessage(
                "Đang lấy nét..."
            );

            window.setTimeout(
                () => {
                    if (state.running) {
                        setMessage(
                            "Đưa toàn bộ mã vạch vào giữa khung."
                        );
                    }
                },
                600
            );
        } catch (error) {
            console.warn(
                "Trình duyệt không hỗ trợ lấy nét thủ công:",
                error
            );
        }
    }


    /* =====================================================
       THIẾT LẬP CAMERA SAU KHI MỞ
    ===================================================== */

    async function configureCamera() {
        state.video =
            getActiveVideo();

        state.videoTrack =
            getActiveTrack();

        if (
            !state.video
            || !state.videoTrack
        ) {
            hideCameraControls();
            return;
        }

        state.video.removeEventListener(
            "click",
            focusAtPoint
        );

        state.video.addEventListener(
            "click",
            focusAtPoint
        );

        try {
            const capabilities =
                state.videoTrack
                    .getCapabilities
                    ? state.videoTrack
                        .getCapabilities()
                    : {};

            const settings =
                state.videoTrack
                    .getSettings
                    ? state.videoTrack
                        .getSettings()
                    : {};

            if (
                Array.isArray(
                    capabilities.focusMode
                )
                && capabilities.focusMode.includes(
                    "continuous"
                )
            ) {
                await state.videoTrack
                    .applyConstraints({
                        advanced: [
                            {
                                focusMode:
                                    "continuous"
                            }
                        ]
                    });
            }

            const hasZoom =
                capabilities.zoom
                && Number.isFinite(
                    capabilities.zoom.min
                )
                && Number.isFinite(
                    capabilities.zoom.max
                )
                && elements.cameraZoomInput;

            if (!hasZoom) {
                hideCameraControls();
                return;
            }

            state.zoomMin =
                Number(
                    capabilities.zoom.min
                );

            state.zoomMax =
                Number(
                    capabilities.zoom.max
                );

            state.zoomStep =
                Number(
                    capabilities.zoom.step
                    || 0.1
                );

            state.currentZoom =
                Number(
                    settings.zoom
                    || 1
                );

            elements.cameraZoomInput.min =
                String(
                    state.zoomMin
                );

            elements.cameraZoomInput.max =
                String(
                    state.zoomMax
                );

            elements.cameraZoomInput.step =
                String(
                    state.zoomStep
                );

            elements.cameraZoomInput.value =
                String(
                    state.currentZoom
                );

            updateZoomText(
                state.currentZoom
            );

            showCameraControls();
        } catch (error) {
            console.warn(
                "Không thể cấu hình camera:",
                error
            );

            hideCameraControls();
        }
    }


    /* =====================================================
       TÌM SẢN PHẨM
    ===================================================== */

    function findProductByCode(
        decodedText
    ) {
        const scannedCode =
            normalizeText(
                decodedText
            );

        const products =
            getProducts();

        if (
            !Array.isArray(products)
        ) {
            return null;
        }

        const productBySku =
            products.find(
                (product) => {
                    return (
                        normalizeText(
                            product.sku
                        ) === scannedCode
                    );
                }
            );

        if (productBySku) {
            return productBySku;
        }

        return (
            products.find(
                (product) => {
                    return (
                        normalizeText(
                            product.barcode
                        ) === scannedCode
                    );
                }
            )
            || null
        );
    }


    /* =====================================================
       KẾT QUẢ QUÉT
    ===================================================== */

    async function handleScanSuccess(
        decodedText
    ) {
        if (state.scanLocked) {
            return;
        }

        state.scanLocked =
            true;

        const product =
            findProductByCode(
                decodedText
            );

        if (product) {
            setMessage(
                `Đã tìm thấy: ${product.name}`
            );

            if (navigator.vibrate) {
                navigator.vibrate(
                    120
                );
            }

            await onProductFound(
                product,
                decodedText
            );

            window.setTimeout(
                async () => {
                    await close();
                },
                350
            );

            return;
        }

        setMessage(
            `Không tìm thấy sản phẩm với mã: ${decodedText}`
        );

        window.setTimeout(
            () => {
                state.scanLocked =
                    false;

                if (state.running) {
                    setMessage(
                        "Tiếp tục đưa mã vạch vào giữa khung."
                    );
                }
            },
            1300
        );
    }


    function handleScanFailure() {
        // Không hiển thị lỗi mỗi khung hình.
    }


    /* =====================================================
       MỞ CAMERA
    ===================================================== */

    async function startWithConstraints(
        cameraConstraints,
        scannerConfig
    ) {
        await state.scanner.start(
            cameraConstraints,
            scannerConfig,
            handleScanSuccess,
            handleScanFailure
        );

        state.running =
            true;

        setMessage(
            "Đưa toàn bộ mã vạch vào giữa khung."
        );

        await configureCamera();
    }


    async function start() {
        if (state.running) {
            return;
        }

        setMessage(
            "Đang mở camera sau..."
        );

        state.scanLocked =
            false;

        if (!state.scanner) {
            state.scanner =
                createScanner();
        }

        const scannerConfig =
            getScannerConfig();

        try {
            await startWithConstraints(
                {
                    facingMode: {
                        exact:
                            "environment"
                    }
                },
                scannerConfig
            );

            return;
        } catch (error) {
            console.warn(
                "Không mở được camera sau exact:",
                error
            );
        }

        try {
            await startWithConstraints(
                {
                    facingMode:
                        "environment"
                },
                scannerConfig
            );

            return;
        } catch (error) {
            console.error(
                "Không thể mở camera:",
                error
            );
        }

        state.running =
            false;

        setMessage(
            "Không mở được camera. Hãy cấp quyền camera và mở web bằng HTTPS."
        );
    }


    /* =====================================================
       DỪNG CAMERA
    ===================================================== */

    async function stop() {
        if (
            state.video
        ) {
            state.video.removeEventListener(
                "click",
                focusAtPoint
            );
        }

        if (
            state.scanner
            && state.running
        ) {
            try {
                await state.scanner.stop();
            } catch (error) {
                console.warn(
                    "Không thể dừng camera:",
                    error
                );
            }

            try {
                await state.scanner.clear();
            } catch (error) {
                console.warn(
                    "Không thể xóa vùng camera:",
                    error
                );
            }
        }

        state.running =
            false;

        state.scanLocked =
            false;

        state.video =
            null;

        state.videoTrack =
            null;

        hideCameraControls();
    }


    async function open() {
        showModal();

        await start();
    }


    async function close() {
        await stop();

        setMessage(
            ""
        );

        hideModal();
    }


    /* =====================================================
       SỰ KIỆN
    ===================================================== */

    function bindEvents() {
        document
            .querySelectorAll(
                "[data-close-scanner-modal]"
            )
            .forEach(
                (element) => {
                    element.addEventListener(
                        "click",
                        close
                    );
                }
            );

        elements.cameraZoomInput
            ?.addEventListener(
                "input",
                (event) => {
                    applyZoom(
                        event.target.value
                    );
                }
            );

        elements.resetCameraZoomButton
            ?.addEventListener(
                "click",
                resetZoom
            );
    }


    assertDependencies();

    return {
        bindEvents,
        open,
        close,
        start,
        stop,

        isOpen() {
            return !elements
                .scannerModal
                .classList.contains(
                    "hidden"
                );
        },

        isRunning() {
            return state.running;
        }
    };
}