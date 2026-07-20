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

    /*
        Danh sách mã giảm giá lấy từ Firebase.
    */
    discountCodes:
        [],

    /*
        ID mã giảm giá đang được áp dụng.

        Chuỗi rỗng nghĩa là:
        Chưa áp dụng mã giảm giá.
    */
    selectedDiscountId:
        "",

    /*
        Đối tượng máy quét mã vạch.
    */
    scanner:
        null,

    /*
        Trạng thái camera quét mã đang chạy.
    */
    scannerRunning:
        false,

    /*
        Khóa quét tạm thời để tránh
        cùng một mã bị đọc liên tục.
    */
    scanLocked:
        false,

    /*
        Ngăn người dùng nhấn thanh toán
        nhiều lần liên tiếp.
    */
    isPaying:
        false,

    /*
        Dùng để phát âm báo
        khi quét mã thành công.
    */
    audioContext:
        null,

    /*
        Mã nội dung chuyển khoản
        được tạo cho hóa đơn hiện tại.
    */
    transferCode:
        ""
};