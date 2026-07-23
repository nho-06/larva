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

/*
    Khóa dùng để lưu các bill đang chờ
    vào localStorage.

    Nhờ vậy, khi tải lại trang bán hàng,
    các bill chưa thanh toán vẫn được giữ lại.
*/
export const PENDING_BILLS_STORAGE_KEY =
    "larva_pending_sales_bills_v1";

/*
    Khóa lưu ID bill đang được mở.
*/
export const ACTIVE_BILL_STORAGE_KEY =
    "larva_active_sales_bill_id_v1";

/*
    Giới hạn số bill đang chờ cùng lúc.

    Có thể tăng số này nếu cửa hàng cần.
*/
export const MAX_PENDING_BILLS =
    20;

/*
    Tạo ID duy nhất cho bill.
*/
export function createBillId() {
    const randomPart =
        Math.random()
            .toString(36)
            .slice(2, 9);

    return [
        "bill",
        Date.now(),
        randomPart
    ].join("-");
}

/*
    Tạo một bill trống.

    billNumber:
        Số thứ tự dùng để đặt tên mặc định,
        ví dụ Bill 1, Bill 2...
*/
export function createEmptyBill(
    billNumber = 1
) {
    const safeBillNumber =
        Math.max(
            1,
            Number(billNumber) || 1
        );

    const now =
        new Date().toISOString();

    return {
        /*
            ID nội bộ của bill.
        */
        id:
            createBillId(),

        /*
            Tên hiển thị.

            Người dùng có thể đổi thành:
            - Chị áo đen
            - Khách 1
            - Anh Nam
        */
        name:
            `Bill ${safeBillNumber}`,

        /*
            Danh sách sản phẩm riêng
            của bill này.
        */
        cart:
            [],

        /*
            Mã giảm giá riêng
            của bill này.
        */
        selectedDiscountId:
            "",

        /*
            Nội dung chuyển khoản riêng
            của bill này.
        */
        transferCode:
            "",

        /*
            Thời điểm tạo bill.
        */
        createdAt:
            now,

        /*
            Thời điểm bill được cập nhật
            gần nhất.
        */
        updatedAt:
            now
    };
}

/*
    Bill mặc định khi vừa mở trang.
*/
const firstBill =
    createEmptyBill(1);

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
        ID danh mục đang được chọn
        trên trang bán hàng.

        Chuỗi rỗng nghĩa là:
        Tất cả danh mục.
    */
    selectedCategoryId:
        "",

    /*
        Danh sách tất cả bill đang chờ.

        Mỗi bill có:
        - id
        - name
        - cart
        - selectedDiscountId
        - transferCode
        - createdAt
        - updatedAt
    */
    bills:
        [
            firstBill
        ],

    /*
        ID bill đang được mở.
    */
    activeBillId:
        firstBill.id,

    /*
        Danh sách mã giảm giá
        đang hoạt động lấy từ Firebase.
    */
    discountCodes:
        [],

    /*
        Đối tượng máy quét mã vạch.
    */
    scanner:
        null,

    /*
        Trạng thái camera quét mã
        đang chạy.
    */
    scannerRunning:
        false,

    /*
        Khóa quét tạm thời
        để tránh cùng một mã
        bị đọc liên tục.
    */
    scanLocked:
        false,

    /*
        Ngăn người dùng nhấn
        thanh toán nhiều lần liên tiếp.
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
        Trả về bill đang được mở.
    */
    get activeBill() {
        let currentBill =
            this.bills.find(
                (bill) =>
                    bill.id ===
                    this.activeBillId
            );

        /*
            Nếu ID bill đang chọn không còn tồn tại,
            tự chuyển sang bill đầu tiên.
        */
        if (
            !currentBill &&
            this.bills.length > 0
        ) {
            currentBill =
                this.bills[0];

            this.activeBillId =
                currentBill.id;
        }

        /*
            Nếu vì lý do nào đó danh sách bill trống,
            tự tạo lại một bill mới.
        */
        if (!currentBill) {
            currentBill =
                createEmptyBill(1);

            this.bills = [
                currentBill
            ];

            this.activeBillId =
                currentBill.id;
        }

        return currentBill;
    },

    /*
        Giữ lại cách gọi state.cart
        giống code cũ.

        Nhưng thực tế dữ liệu sẽ được lấy từ
        bill đang được mở.
    */
    get cart() {
        return this.activeBill.cart;
    },

    /*
        Cho phép các file cũ vẫn có thể dùng:

        state.cart = [];

        Khi gán như vậy, chỉ giỏ hàng của
        bill đang mở bị thay đổi.
    */
    set cart(newCart) {
        this.activeBill.cart =
            Array.isArray(newCart)
                ? newCart
                : [];

        this.activeBill.updatedAt =
            new Date().toISOString();
    },

    /*
        Giữ lại cách gọi
        state.selectedDiscountId
        giống code cũ.

        Mỗi bill sẽ có mã giảm giá riêng.
    */
    get selectedDiscountId() {
        return (
            this.activeBill
                .selectedDiscountId ||
            ""
        );
    },

    set selectedDiscountId(
        discountId
    ) {
        this.activeBill
            .selectedDiscountId =
            String(
                discountId || ""
            );

        this.activeBill.updatedAt =
            new Date().toISOString();
    },

    /*
        Giữ lại cách gọi
        state.transferCode
        giống code cũ.

        Mỗi bill có một nội dung
        chuyển khoản riêng.
    */
    get transferCode() {
        return (
            this.activeBill
                .transferCode ||
            ""
        );
    },

    set transferCode(
        transferCode
    ) {
        this.activeBill
            .transferCode =
            String(
                transferCode || ""
            );

        this.activeBill.updatedAt =
            new Date().toISOString();
    }
};