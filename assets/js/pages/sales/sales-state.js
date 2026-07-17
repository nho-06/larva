export const BANK_CONFIG = {
    bank:
        "MB",

    accountNumber:
        "0384343705",

    accountHolder:
        "TRAN THI TAM",

    storeName:
        "LARVA"
};

export const state = {
    /*
        Danh sách sản phẩm lấy từ Firebase.
    */
    products:
        [],

    /*
        Danh sách danh mục lấy từ Firebase.
    */
    categories:
        [],

    /*
        ID danh mục đang được chọn trên trang bán hàng.

        Chuỗi rỗng nghĩa là:
        Tất cả danh mục.
    */
    selectedCategoryId:
        "",

    /*
        Danh sách sản phẩm trong giỏ hàng.
    */
    cart:
        [],

    scanner:
        null,

    scannerRunning:
        false,

    scanLocked:
        false,

    isPaying:
        false,

    audioContext:
        null,

    transferCode:
        ""
};