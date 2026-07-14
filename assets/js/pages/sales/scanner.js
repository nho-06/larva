import {
    state
} from "./sales-state.js";

import {
    elements
} from "./sales-elements.js";

import {
    addProductToCart,
    showSaleMessage
} from "./cart.js";

async function prepareScanSound() {
    try {
        const AudioContextClass =
            window.AudioContext
            || window.webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        if (!state.audioContext) {
            state.audioContext =
                new AudioContextClass();
        }

        if (
            state.audioContext.state
            === "suspended"
        ) {
            await state.audioContext.resume();
        }
    } catch (error) {
        console.warn(
            "Không thể chuẩn bị âm thanh:",
            error
        );
    }
}

async function playScanSound() {
    try {
        await prepareScanSound();

        const audioContext =
            state.audioContext;

        if (!audioContext) {
            return;
        }

        const oscillator =
            audioContext.createOscillator();

        const gainNode =
            audioContext.createGain();

        oscillator.type =
            "sine";

        oscillator.frequency.setValueAtTime(
            1050,
            audioContext.currentTime
        );

        gainNode.gain.setValueAtTime(
            0.18,
            audioContext.currentTime
        );

        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.14
        );

        oscillator.connect(
            gainNode
        );

        gainNode.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.14
        );
    } catch (error) {
        console.warn(
            "Không phát được âm thanh quét mã:",
            error
        );
    }
}

function createScanner() {
    return new Html5Qrcode(
        "barcodeReader",
        false
    );
}

function getScannerConfig() {
    const screenWidth =
        Math.max(
            window.innerWidth || 320,
            320
        );

    const scanWidth =
        Math.min(
            380,
            Math.max(
                280,
                screenWidth - 24
            )
        );

    return {
        fps: 30,

        qrbox: {
            width:
                scanWidth,

            height:
                190
        },

        aspectRatio:
            16 / 9,

        disableFlip:
            true,

        experimentalFeatures: {
            useBarCodeDetectorIfSupported:
                true
        }
    };
}

async function applyCameraSettings() {
    if (
        !state.scanner
        || !state.scannerRunning
    ) {
        return;
    }

    try {
        const capabilities =
            state.scanner
                .getRunningTrackCameraCapabilities();

        const advancedSettings = {};

        if (
            Array.isArray(
                capabilities.focusMode
            )
            && capabilities.focusMode.includes(
                "continuous"
            )
        ) {
            advancedSettings.focusMode =
                "continuous";
        }

        if (capabilities.zoom) {
            const minZoom =
                Number(
                    capabilities.zoom.min ?? 1
                );

            const maxZoom =
                Number(
                    capabilities.zoom.max ?? 1
                );

            advancedSettings.zoom =
                Math.min(
                    maxZoom,
                    Math.max(
                        minZoom,
                        1.2
                    )
                );
        }

        if (
            Object.keys(
                advancedSettings
            ).length > 0
        ) {
            await state.scanner
                .applyVideoConstraints({
                    advanced: [
                        advancedSettings
                    ]
                });
        }
    } catch (error) {
        console.warn(
            "Không thể chỉnh focus hoặc zoom:",
            error
        );
    }
}

export async function clearScannerInstance() {
    if (!state.scanner) {
        return;
    }

    try {
        if (state.scannerRunning) {
            await state.scanner.stop();
        }
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
            "Không thể xóa trình quét:",
            error
        );
    }

    state.scannerRunning =
        false;

    state.scanner =
        null;

    if (elements.barcodeReader) {
        elements.barcodeReader.innerHTML =
            "";
    }
}

async function getBackCameraDeviceId() {
    const stream =
        await navigator.mediaDevices
            .getUserMedia({
                audio:
                    false,

                video: {
                    facingMode: {
                        ideal:
                            "environment"
                    },

                    width: {
                        ideal:
                            1280
                    },

                    height: {
                        ideal:
                            720
                    }
                }
            });

    try {
        const track =
            stream.getVideoTracks()[0];

        const settings =
            track?.getSettings?.() || {};

        return settings.deviceId || "";
    } finally {
        stream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });
    }
}

async function startCameraByDeviceId(
    deviceId
) {
    state.scanner =
        createScanner();

    await state.scanner.start(
        deviceId,
        getScannerConfig(),
        handleScanSuccess,
        () => {}
    );

    state.scannerRunning =
        true;
}

async function startBackCameraFacingMode() {
    state.scanner =
        createScanner();

    await state.scanner.start(
        {
            facingMode:
                "environment"
        },
        getScannerConfig(),
        handleScanSuccess,
        () => {}
    );

    state.scannerRunning =
        true;
}

async function startCameraByDeviceList() {
    const cameras =
        await Html5Qrcode.getCameras();

    if (
        !Array.isArray(cameras)
        || !cameras.length
    ) {
        throw new Error(
            "Không tìm thấy camera."
        );
    }

    const normalizedCameras =
        cameras.map((camera) => {
            return {
                ...camera,

                normalizedLabel:
                    String(
                        camera.label || ""
                    ).toLowerCase()
            };
        });

    const rearCamera =
        normalizedCameras.find(
            (camera) => {
                const label =
                    camera.normalizedLabel;

                return (
                    label.includes("back")
                    || label.includes("rear")
                    || label.includes(
                        "environment"
                    )
                    || label.includes(
                        "camera sau"
                    )
                );
            }
        );

    const selectedCamera =
        rearCamera
        || normalizedCameras[
            normalizedCameras.length - 1
        ];

    await startCameraByDeviceId(
        selectedCamera.id
    );
}

function getCameraErrorMessage(error) {
    const errorName =
        error?.name || "";

    const errorMessage =
        error?.message
        || String(error || "");

    const lowerMessage =
        errorMessage.toLowerCase();

    if (
        errorName === "NotAllowedError"
        || errorName === "PermissionDeniedError"
        || lowerMessage.includes("permission")
        || lowerMessage.includes("denied")
    ) {
        return (
            "Camera đang bị chặn. "
            + "Hãy cấp quyền camera rồi tải lại trang."
        );
    }

    if (
        errorName === "NotFoundError"
        || lowerMessage.includes("not found")
    ) {
        return "Không tìm thấy camera.";
    }

    if (
        errorName === "NotReadableError"
        || errorName === "TrackStartError"
    ) {
        return (
            "Camera đang được ứng dụng khác sử dụng."
        );
    }

    return (
        "Không mở được camera: "
        + errorMessage
    );
}

export async function openScanner() {
    if (state.scannerRunning) {
        return;
    }

    await prepareScanSound();

    state.scanLocked =
        false;

    elements.scannerModal
        .classList.remove("hidden");

    elements.scannerMessage.textContent =
        "Đang mở camera sau...";

    try {
        if (
            typeof Html5Qrcode
                === "undefined"
            || typeof Html5QrcodeSupportedFormats
                === "undefined"
        ) {
            throw new Error(
                "Thư viện quét mã chưa tải được."
            );
        }

        if (
            !navigator.mediaDevices
            || !navigator.mediaDevices
                .getUserMedia
        ) {
            throw new Error(
                "Trình duyệt không hỗ trợ camera."
            );
        }

        let started =
            false;

        try {
            const backCameraId =
                await getBackCameraDeviceId();

            if (backCameraId) {
                await startCameraByDeviceId(
                    backCameraId
                );

                started =
                    true;
            }
        } catch (error) {
            console.warn(
                "Không lấy được camera sau:",
                error
            );

            await clearScannerInstance();
        }

        if (!started) {
            try {
                await startBackCameraFacingMode();

                started =
                    true;
            } catch (error) {
                console.warn(
                    "Không mở được camera sau:",
                    error
                );

                await clearScannerInstance();
            }
        }

        if (!started) {
            await startCameraByDeviceList();
        }

        elements.scannerMessage.textContent =
            "Đưa toàn bộ mã vạch vào giữa khung.";

        setTimeout(() => {
            applyCameraSettings();
        }, 700);

    } catch (error) {
        console.error(error);

        await clearScannerInstance();

        elements.scannerMessage.textContent =
            getCameraErrorMessage(error);
    }
}

export async function closeScanner() {
    await clearScannerInstance();

    elements.scannerModal
        .classList.add("hidden");

    elements.scannerMessage.textContent =
        "";

    state.scanLocked =
        false;
}

async function handleScanSuccess(
    decodedText
) {
    if (state.scanLocked) {
        return;
    }

    const scannedCode =
        String(decodedText || "")
            .trim();

    if (!scannedCode) {
        return;
    }

    state.scanLocked =
        true;

    const product =
        state.products.find((item) => {
            const barcode =
                String(
                    item.barcode || ""
                ).trim();

            const sku =
                String(
                    item.sku || ""
                ).trim();

            return (
                barcode === scannedCode
                || sku === scannedCode
            );
        });

    if (!product) {
        elements.scannerMessage.textContent =
            `Không tìm thấy mã ${scannedCode}.`;

        setTimeout(() => {
            state.scanLocked =
                false;
        }, 900);

        return;
    }

    const added =
        addProductToCart(
            product,
            true
        );

    if (!added) {
        setTimeout(() => {
            state.scanLocked =
                false;
        }, 900);

        return;
    }

    await playScanSound();

    elements.scannerMessage.textContent =
        `Đã thêm ${product.name} vào giỏ.`;

    setTimeout(async () => {
        await closeScanner();

        showSaleMessage(
            `Đã thêm ${product.name} vào giỏ.`
        );
    }, 350);
}