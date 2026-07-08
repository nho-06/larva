import {
    listenProducts
} from "../services/product-service.js";

import {
    checkoutSale
} from "../services/sale-service.js";

import {
    escapeHtml,
    formatMoney,
    normalizeText,
    placeholderImage
} from "../utils.js";

const state = {
    products: [],
    cart: [],
    scanner: null,
    scannerRunning: false,
    scanLocked: false,
    isPaying: false
};

const elements = {
    productSearchInput:
        document.querySelector(
            "#productSearchInput"
        ),

    saleProductGrid:
        document.querySelector(
            "#saleProductGrid"
        ),

    emptyProductState:
        document.querySelector(
            "#emptyProductState"
        ),

    saleMessage:
        document.querySelector(
            "#saleMessage"
        ),

    cartItems:
        document.querySelector(
            "#cartItems"
        ),

    emptyCartState:
        document.querySelector(
            "#emptyCartState"
        ),

    cartCount:
        document.querySelector(
            "#cartCount"
        ),

    cartTotal:
        document.querySelector(
            "#cartTotal"
        ),

    clearCartButton:
        document.querySelector(
            "#clearCartButton"
        ),

    openScannerButton:
        document.querySelector(
            "#openScannerButton"
        ),

    openPaymentButton:
        document.querySelector(
            "#openPaymentButton"
        ),

    scannerModal:
        document.querySelector(
            "#scannerModal"
        ),

    barcodeReader:
        document.querySelector(
            "#barcodeReader"
        ),

    scannerMessage:
        document.querySelector(
            "#scannerMessage"
        ),

    paymentModal:
        document.querySelector(
            "#paymentModal"
        ),

    paymentTotal:
        document.querySelector(
            "#paymentTotal"
        ),

    paidAmountWrap:
        document.querySelector(
            "#paidAmountWrap"
        ),

    paidAmountInput:
        document.querySelector(
            "#paidAmountInput"
        ),

    changeAmount:
        document.querySelector(
            "#changeAmount"
        ),

    paymentError:
        document.querySelector(
            "#paymentError"
        ),

    confirmPaymentButton:
        document.querySelector(
            "#confirmPaymentButton"
        ),

    receiptModal:
        document.querySelector(
            "#receiptModal"
        ),

    receiptContent:
        document.querySelector(
            "#receiptContent"
        ),

    printReceiptButton:
        document.querySelector(
            "#printReceiptButton"
        )
};

function getCartTotal() {
    return state.cart.reduce(
        (total, item) => {
            return (
                total
                + Number(item.price || 0)
                * Number(item.quantity || 0)
            );
        },
        0
    );
}

function getCartQuantity() {
    return state.cart.reduce(
        (total, item) => {
            return (
                total
                + Number(item.quantity || 0)
            );
        },
        0
    );
}

function showSaleMessage(
    message,
    type = "success"
) {
    elements.saleMessage.textContent =
        message;

    elements.saleMessage.className =
        `pos-message ${type}`;

    window.clearTimeout(
        showSaleMessage.timer
    );

    showSaleMessage.timer =
        window.setTimeout(() => {
            elements.saleMessage
                .classList.add("hidden");
        }, 2200);
}

function getFilteredProducts() {
    const keyword =
        normalizeText(
            elements.productSearchInput.value
        );

    return state.products.filter(
        (product) => {
            if (!keyword) {
                return true;
            }

            return (
                normalizeText(
                    product.name
                ).includes(keyword)

                || normalizeText(
                    product.sku
                ).includes(keyword)

                || normalizeText(
                    product.barcode
                ).includes(keyword)
            );
        }
    );
}

function renderProducts() {
    const products =
        getFilteredProducts();

    elements.saleProductGrid.innerHTML =
        products
            .map((product) => {
                const stock =
                    Number(
                        product.quantity || 0
                    );

                const isOutOfStock =
                    stock <= 0;

                const image =
                    product.image
                    || placeholderImage();

                return `
                    <article
                        class="
                            sale-product-card
                            ${isOutOfStock
                                ? "out-of-stock"
                                : ""}
                        "
                    >
                        <img
                            class="sale-product-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(product.name)}"
                            onerror="this.src='${placeholderImage()}'"
                        >

                        <div class="sale-product-body">
                            <h3>
                                ${escapeHtml(product.name)}
                            </h3>

                            <p class="sale-product-code">
                                ${escapeHtml(
                                    product.sku
                                    || product.barcode
                                    || "Chưa có mã"
                                )}
                            </p>

                            <div class="sale-product-meta">
                                <strong>
                                    ${formatMoney(
                                        product.salePrice
                                    )}
                                </strong>

                                <span>
                                    Còn ${stock}
                                </span>
                            </div>

                            <button
                                class="button sale-add-button"
                                type="button"
                                data-add-product="${product.id}"
                                ${isOutOfStock
                                    ? "disabled"
                                    : ""}
                            >
                                ${isOutOfStock
                                    ? "Hết hàng"
                                    : "Thêm vào giỏ"}
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");

    elements.emptyProductState
        .classList.toggle(
            "hidden",
            products.length > 0
        );
}

function renderCart() {
    const total =
        getCartTotal();

    const quantity =
        getCartQuantity();

    elements.cartItems.innerHTML =
        state.cart
            .map((item) => {
                const image =
                    item.image
                    || placeholderImage();

                const lineTotal =
                    Number(item.price || 0)
                    * Number(item.quantity || 0);

                return `
                    <div class="cart-item">
                        <img
                            class="cart-item-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(item.name)}"
                            onerror="this.src='${placeholderImage()}'"
                        >

                        <div class="cart-item-info">
                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    item.sku
                                    || item.barcode
                                    || ""
                                )}
                            </small>

                            <span>
                                ${formatMoney(item.price)}
                            </span>
                        </div>

                        <div class="cart-item-actions">
                            <div class="quantity-control">
                                <button
                                    type="button"
                                    data-decrease="${item.productId}"
                                    aria-label="Giảm số lượng"
                                >
                                    −
                                </button>

                                <span>
                                    ${item.quantity}
                                </span>

                                <button
                                    type="button"
                                    data-increase="${item.productId}"
                                    aria-label="Tăng số lượng"
                                >
                                    +
                                </button>
                            </div>

                            <strong>
                                ${formatMoney(lineTotal)}
                            </strong>

                            <button
                                class="remove-cart-item"
                                type="button"
                                data-remove="${item.productId}"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                `;
            })
            .join("");

    elements.emptyCartState
        .classList.toggle(
            "hidden",
            state.cart.length > 0
        );

    elements.cartCount.textContent =
        quantity;

    elements.cartTotal.textContent =
        formatMoney(total);

    elements.openPaymentButton.disabled =
        state.cart.length === 0;

    elements.clearCartButton.disabled =
        state.cart.length === 0;
}

function addProductToCart(
    product,
    fromScanner = false
) {
    const stock =
        Number(
            product.quantity || 0
        );

    if (stock <= 0) {
        showSaleMessage(
            "Sản phẩm đã hết hàng.",
            "error"
        );

        return false;
    }

    const currentItem =
        state.cart.find((item) => {
            return item.productId
                === product.id;
        });

    const currentQuantity =
        Number(
            currentItem?.quantity || 0
        );

    if (currentQuantity >= stock) {
        showSaleMessage(
            `Không thể thêm. Sản phẩm chỉ còn ${stock}.`,
            "error"
        );

        return false;
    }

    if (currentItem) {
        currentItem.quantity += 1;
    } else {
        state.cart.push({
            productId:
                product.id,

            name:
                product.name || "Sản phẩm",

            sku:
                product.sku || "",

            barcode:
                product.barcode || "",

            image:
                product.image || "",

            price:
                Number(
                    product.salePrice || 0
                ),

            quantity:
                1,

            stock
        });
    }

    renderCart();

    showSaleMessage(
        fromScanner
            ? `Đã quét: ${product.name}`
            : `Đã thêm: ${product.name}`
    );

    return true;
}

function updateCartQuantity(
    productId,
    change
) {
    const item =
        state.cart.find((cartItem) => {
            return cartItem.productId
                === productId;
        });

    if (!item) {
        return;
    }

    const product =
        state.products.find(
            (currentProduct) => {
                return currentProduct.id
                    === productId;
            }
        );

    const currentStock =
        Number(
            product?.quantity
            || item.stock
            || 0
        );

    const nextQuantity =
        Number(item.quantity)
        + change;

    if (nextQuantity <= 0) {
        state.cart =
            state.cart.filter(
                (cartItem) => {
                    return cartItem.productId
                        !== productId;
                }
            );
    } else if (
        nextQuantity > currentStock
    ) {
        showSaleMessage(
            `Sản phẩm chỉ còn ${currentStock}.`,
            "error"
        );

        return;
    } else {
        item.quantity =
            nextQuantity;

        item.stock =
            currentStock;
    }

    renderCart();
}

function removeCartItem(productId) {
    state.cart =
        state.cart.filter((item) => {
            return item.productId
                !== productId;
        });

    renderCart();
}

function clearCart() {
    if (state.cart.length === 0) {
        return;
    }

    const accepted =
        confirm(
            "Xóa toàn bộ sản phẩm trong giỏ?"
        );

    if (!accepted) {
        return;
    }

    state.cart = [];

    renderCart();
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
            360,
            Math.max(
                260,
                screenWidth - 40
            )
        );

    return {
        fps:
            20,

        qrbox: {
            width:
                scanWidth,

            height:
                150
        },

        aspectRatio:
            16 / 9,

        disableFlip:
            true,

        formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ],

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
                        1
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

async function clearScannerInstance() {
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

    state.scannerRunning = false;
    state.scanner = null;

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
        return (
            "Không tìm thấy camera."
        );
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

async function openScanner() {
    if (state.scannerRunning) {
        return;
    }

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

async function closeScanner() {
    state.scanLocked =
        false;

    await clearScannerInstance();

    elements.scannerModal
        .classList.add("hidden");

    elements.scannerMessage.textContent =
        "";
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
        state.scanLocked =
            false;

        elements.scannerMessage.textContent =
            `Không tìm thấy mã ${scannedCode}.`;

        return;
    }

    const added =
        addProductToCart(
            product,
            true
        );

    if (added) {
        elements.scannerMessage.textContent =
            `Đã thêm ${product.name}. Quét tiếp sản phẩm khác.`;
    }

    setTimeout(() => {
        state.scanLocked =
            false;
    }, 700);
}

function getSelectedPaymentMethod() {
    return (
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value
        || "cash"
    );
}

function updatePaymentView() {
    const total =
        getCartTotal();

    const method =
        getSelectedPaymentMethod();

    const paidAmount =
        Number(
            elements.paidAmountInput.value || 0
        );

    const change =
        method === "cash"
            ? Math.max(
                0,
                paidAmount - total
            )
            : 0;

    elements.paymentTotal.textContent =
        formatMoney(total);

    elements.changeAmount.textContent =
        formatMoney(change);

    elements.paidAmountWrap
        .classList.toggle(
            "hidden",
            method !== "cash"
        );

    elements.paymentError
        .classList.add("hidden");
}

function openPaymentModal() {
    if (state.cart.length === 0) {
        return;
    }

    const total =
        getCartTotal();

    elements.paymentModal
        .classList.remove("hidden");

    elements.paymentTotal.textContent =
        formatMoney(total);

    elements.paidAmountInput.value =
        total;

    updatePaymentView();
}

function closePaymentModal() {
    if (state.isPaying) {
        return;
    }

    elements.paymentModal
        .classList.add("hidden");

    elements.paymentError
        .classList.add("hidden");
}

function renderReceipt(sale) {
    const methodText =
        sale.paymentMethod === "cash"
            ? "Tiền mặt"
            : "Chuyển khoản";

    const createdDate =
        new Date(
            sale.createdAt
        ).toLocaleString("vi-VN");

    elements.receiptContent.innerHTML = `
        <div class="receipt">
            <div class="receipt-shop">
                <h2>LARVA</h2>
                <p>Hóa đơn bán hàng</p>
            </div>

            <div class="receipt-meta">
                <p>
                    Mã hóa đơn:
                    <strong>
                        ${escapeHtml(sale.saleId)}
                    </strong>
                </p>

                <p>
                    Thời gian:
                    <strong>
                        ${escapeHtml(createdDate)}
                    </strong>
                </p>
            </div>

            <div class="receipt-items">
                ${sale.items
                    .map((item) => {
                        return `
                            <div class="receipt-item">
                                <div>
                                    <strong>
                                        ${escapeHtml(item.name)}
                                    </strong>

                                    <small>
                                        ${item.quantity}
                                        ×
                                        ${formatMoney(item.price)}
                                    </small>
                                </div>

                                <span>
                                    ${formatMoney(
                                        item.lineTotal
                                    )}
                                </span>
                            </div>
                        `;
                    })
                    .join("")}
            </div>

            <div class="receipt-summary">
                <div>
                    <span>Tổng tiền</span>

                    <strong>
                        ${formatMoney(
                            sale.totalAmount
                        )}
                    </strong>
                </div>

                <div>
                    <span>Thanh toán</span>

                    <strong>
                        ${methodText}
                    </strong>
                </div>

                ${
                    sale.paymentMethod === "cash"
                        ? `
                            <div>
                                <span>Khách đưa</span>

                                <strong>
                                    ${formatMoney(
                                        sale.paidAmount
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Tiền thừa</span>

                                <strong>
                                    ${formatMoney(
                                        sale.changeAmount
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }
            </div>

            <p class="receipt-thanks">
                Cảm ơn quý khách!
            </p>
        </div>
    `;
}

async function confirmPayment() {
    if (
        state.isPaying
        || state.cart.length === 0
    ) {
        return;
    }

    const totalAmount =
        getCartTotal();

    const paymentMethod =
        getSelectedPaymentMethod();

    const paidAmount =
        paymentMethod === "cash"
            ? Number(
                elements.paidAmountInput.value || 0
            )
            : totalAmount;

    if (
        paymentMethod === "cash"
        && paidAmount < totalAmount
    ) {
        elements.paymentError.textContent =
            "Số tiền khách đưa chưa đủ.";

        elements.paymentError
            .classList.remove("hidden");

        return;
    }

    state.isPaying =
        true;

    elements.confirmPaymentButton.disabled =
        true;

    elements.confirmPaymentButton.textContent =
        "Đang thanh toán...";

    try {
        const sale =
            await checkoutSale({
                items:
                    state.cart,

                paymentMethod,

                paidAmount,

                totalAmount
            });

        state.cart =
            [];

        renderCart();

        elements.paymentModal
            .classList.add("hidden");

        renderReceipt(sale);

        elements.receiptModal
            .classList.remove("hidden");

    } catch (error) {
        console.error(error);

        elements.paymentError.textContent =
            error.message
            || "Không thể thanh toán.";

        elements.paymentError
            .classList.remove("hidden");

    } finally {
        state.isPaying =
            false;

        elements.confirmPaymentButton.disabled =
            false;

        elements.confirmPaymentButton.textContent =
            "Xác nhận thanh toán";
    }
}

function closeReceiptModal() {
    elements.receiptModal
        .classList.add("hidden");
}

function printReceipt() {
    window.print();
}

elements.productSearchInput
    .addEventListener(
        "input",
        renderProducts
    );

elements.saleProductGrid
    .addEventListener(
        "click",
        (event) => {
            const button =
                event.target.closest(
                    "[data-add-product]"
                );

            if (!button) {
                return;
            }

            const product =
                state.products.find(
                    (item) => {
                        return item.id
                            === button.dataset.addProduct;
                    }
                );

            if (product) {
                addProductToCart(
                    product
                );
            }
        }
    );

elements.cartItems
    .addEventListener(
        "click",
        (event) => {
            const increaseButton =
                event.target.closest(
                    "[data-increase]"
                );

            const decreaseButton =
                event.target.closest(
                    "[data-decrease]"
                );

            const removeButton =
                event.target.closest(
                    "[data-remove]"
                );

            if (increaseButton) {
                updateCartQuantity(
                    increaseButton.dataset.increase,
                    1
                );
            }

            if (decreaseButton) {
                updateCartQuantity(
                    decreaseButton.dataset.decrease,
                    -1
                );
            }

            if (removeButton) {
                removeCartItem(
                    removeButton.dataset.remove
                );
            }
        }
    );

elements.clearCartButton
    .addEventListener(
        "click",
        clearCart
    );

elements.openScannerButton
    .addEventListener(
        "click",
        openScanner
    );

elements.openPaymentButton
    .addEventListener(
        "click",
        openPaymentModal
    );

elements.confirmPaymentButton
    .addEventListener(
        "click",
        confirmPayment
    );

elements.paidAmountInput
    .addEventListener(
        "input",
        updatePaymentView
    );

document
    .querySelectorAll(
        'input[name="paymentMethod"]'
    )
    .forEach((input) => {
        input.addEventListener(
            "change",
            updatePaymentView
        );
    });

document
    .querySelectorAll(
        "[data-close-scanner-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closeScanner
        );
    });

document
    .querySelectorAll(
        "[data-close-payment-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closePaymentModal
        );
    });

document
    .querySelectorAll(
        "[data-close-receipt-modal]"
    )
    .forEach((button) => {
        button.addEventListener(
            "click",
            closeReceiptModal
        );
    });

elements.printReceiptButton
    .addEventListener(
        "click",
        printReceipt
    );

window.addEventListener(
    "pagehide",
    () => {
        clearScannerInstance();
    }
);

listenProducts((products) => {
    state.products =
        products;

    state.cart.forEach((cartItem) => {
        const product =
            products.find((item) => {
                return item.id
                    === cartItem.productId;
            });

        if (product) {
            cartItem.stock =
                Number(
                    product.quantity || 0
                );
        }
    });

    renderProducts();
    renderCart();
});