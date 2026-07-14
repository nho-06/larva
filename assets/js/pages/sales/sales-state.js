export const BANK_CONFIG = {
    bank: "MB",
    accountNumber: "0384343705",
    accountHolder: "TRAN THI TAM",
    storeName: "LARVA"
};

export const state = {
    products: [],
    cart: [],

    scanner: null,
    scannerRunning: false,
    scanLocked: false,

    isPaying: false,

    audioContext: null,

    transferCode: ""
};