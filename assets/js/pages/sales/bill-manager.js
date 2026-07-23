import {
    state,
    createEmptyBill,
    PENDING_BILLS_STORAGE_KEY,
    ACTIVE_BILL_STORAGE_KEY,
    MAX_PENDING_BILLS
} from "./sales-state.js";


/* =========================================================
   CÁC HÀM CHUẨN HÓA DỮ LIỆU
========================================================= */

function normalizeText(
    value
) {
    return String(
        value ?? ""
    ).trim();
}


function toNumber(
    value
) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function normalizeCartItem(
    item
) {
    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }

    const productId =
        normalizeText(
            item.productId ||
            item.id
        );

    if (!productId) {
        return null;
    }

    return {
        ...item,

        productId,

        name:
            normalizeText(
                item.name
            ) ||
            "Sản phẩm",

        sku:
            normalizeText(
                item.sku
            ),

        barcode:
            normalizeText(
                item.barcode
            ),

        image:
            normalizeText(
                item.image
            ),

        price:
            Math.max(
                0,
                toNumber(
                    item.price
                )
            ),

        stock:
            Math.max(
                0,
                toNumber(
                    item.stock
                )
            ),

        quantity:
            Math.max(
                1,
                Math.floor(
                    toNumber(
                        item.quantity
                    )
                )
            )
    };
}


function normalizeBill(
    bill,
    billNumber
) {
    if (
        !bill ||
        typeof bill !== "object"
    ) {
        return null;
    }

    const billId =
        normalizeText(
            bill.id
        );

    if (!billId) {
        return null;
    }

    const fallbackBill =
        createEmptyBill(
            billNumber
        );

    return {
        id:
            billId,

        name:
            normalizeText(
                bill.name
            ) ||
            `Bill ${billNumber}`,

        cart:
            Array.isArray(
                bill.cart
            )
                ? bill.cart
                    .map(
                        normalizeCartItem
                    )
                    .filter(Boolean)
                : [],

        selectedDiscountId:
            normalizeText(
                bill.selectedDiscountId
            ),

        transferCode:
            normalizeText(
                bill.transferCode
            ),

        createdAt:
            normalizeText(
                bill.createdAt
            ) ||
            fallbackBill.createdAt,

        updatedAt:
            normalizeText(
                bill.updatedAt
            ) ||
            fallbackBill.updatedAt
    };
}


/* =========================================================
   PHÁT SỰ KIỆN BILL THAY ĐỔI
========================================================= */

function dispatchBillChangedEvent(
    action,
    bill = null,
    extraDetail = {}
) {
    window.dispatchEvent(
        new CustomEvent(
            "larva:bill-changed",
            {
                detail: {
                    action,

                    bill,

                    billId:
                        bill?.id ||
                        "",

                    bills:
                        state.bills,

                    activeBillId:
                        state.activeBillId,

                    ...extraDetail
                }
            }
        )
    );
}


/* =========================================================
   LẤY BILL ĐANG CHỌN
========================================================= */

export function getActiveBill() {
    let activeBill =
        state.bills.find(
            (bill) => {
                return (
                    bill.id ===
                    state.activeBillId
                );
            }
        );

    if (
        !activeBill &&
        state.bills.length > 0
    ) {
        activeBill =
            state.bills[0];

        state.activeBillId =
            activeBill.id;
    }

    if (!activeBill) {
        activeBill =
            createEmptyBill(1);

        state.bills.splice(
            0,
            state.bills.length,
            activeBill
        );

        state.activeBillId =
            activeBill.id;
    }

    return activeBill;
}


/* =========================================================
   TÌM BILL THEO ID
========================================================= */

export function findBillById(
    billId
) {
    const normalizedBillId =
        normalizeText(
            billId
        );

    if (!normalizedBillId) {
        return null;
    }

    return (
        state.bills.find(
            (bill) => {
                return (
                    bill.id ===
                    normalizedBillId
                );
            }
        ) ||
        null
    );
}


/* =========================================================
   TÍNH SỐ LƯỢNG SẢN PHẨM TRONG BILL
========================================================= */

export function getBillItemCount(
    bill
) {
    if (
        !bill ||
        !Array.isArray(
            bill.cart
        )
    ) {
        return 0;
    }

    return bill.cart.reduce(
        (
            total,
            item
        ) => {
            return (
                total +
                Math.max(
                    0,
                    toNumber(
                        item.quantity
                    )
                )
            );
        },
        0
    );
}


/* =========================================================
   TÍNH TẠM TÍNH CỦA BILL
========================================================= */

export function getBillSubtotal(
    bill
) {
    if (
        !bill ||
        !Array.isArray(
            bill.cart
        )
    ) {
        return 0;
    }

    return bill.cart.reduce(
        (
            total,
            item
        ) => {
            const price =
                Math.max(
                    0,
                    toNumber(
                        item.price
                    )
                );

            const quantity =
                Math.max(
                    0,
                    toNumber(
                        item.quantity
                    )
                );

            return (
                total +
                price * quantity
            );
        },
        0
    );
}


/* =========================================================
   LƯU BILL VÀO LOCALSTORAGE
========================================================= */

export function saveBillsToStorage() {
    try {
        const normalizedBills =
            state.bills
                .map(
                    (
                        bill,
                        index
                    ) => {
                        return normalizeBill(
                            bill,
                            index + 1
                        );
                    }
                )
                .filter(Boolean);

        localStorage.setItem(
            PENDING_BILLS_STORAGE_KEY,
            JSON.stringify(
                normalizedBills
            )
        );

        localStorage.setItem(
            ACTIVE_BILL_STORAGE_KEY,
            String(
                state.activeBillId ||
                ""
            )
        );

        return true;
    } catch (error) {
        console.error(
            "Không thể lưu bill đang chờ:",
            error
        );

        return false;
    }
}


/* =========================================================
   ĐỌC BILL TỪ LOCALSTORAGE
========================================================= */

export function loadBillsFromStorage() {
    try {
        const savedBillsJson =
            localStorage.getItem(
                PENDING_BILLS_STORAGE_KEY
            );

        const savedActiveBillId =
            normalizeText(
                localStorage.getItem(
                    ACTIVE_BILL_STORAGE_KEY
                )
            );

        if (!savedBillsJson) {
            saveBillsToStorage();

            return state.bills;
        }

        const parsedBills =
            JSON.parse(
                savedBillsJson
            );

        if (
            !Array.isArray(
                parsedBills
            )
        ) {
            throw new Error(
                "Dữ liệu bill không hợp lệ."
            );
        }

        const validBills =
            parsedBills
                .slice(
                    0,
                    MAX_PENDING_BILLS
                )
                .map(
                    (
                        bill,
                        index
                    ) => {
                        return normalizeBill(
                            bill,
                            index + 1
                        );
                    }
                )
                .filter(Boolean);

        if (
            validBills.length === 0
        ) {
            const firstBill =
                createEmptyBill(1);

            state.bills.splice(
                0,
                state.bills.length,
                firstBill
            );

            state.activeBillId =
                firstBill.id;

            saveBillsToStorage();

            return state.bills;
        }

        /*
            Dùng splice để cập nhật ngay mảng cũ.

            Việc này tránh trường hợp giao diện
            hoặc module khác vẫn giữ tham chiếu
            tới mảng bill trước đó.
        */
        state.bills.splice(
            0,
            state.bills.length,
            ...validBills
        );

        const savedActiveBillExists =
            state.bills.some(
                (bill) => {
                    return (
                        bill.id ===
                        savedActiveBillId
                    );
                }
            );

        state.activeBillId =
            savedActiveBillExists
                ? savedActiveBillId
                : state.bills[0].id;

        saveBillsToStorage();

        return state.bills;
    } catch (error) {
        console.error(
            "Không thể tải bill đang chờ:",
            error
        );

        const firstBill =
            createEmptyBill(1);

        state.bills.splice(
            0,
            state.bills.length,
            firstBill
        );

        state.activeBillId =
            firstBill.id;

        saveBillsToStorage();

        return state.bills;
    }
}


/* =========================================================
   TÌM SỐ BILL MẶC ĐỊNH TIẾP THEO
========================================================= */

function getNextBillNumber() {
    const usedNumbers =
        state.bills
            .map(
                (bill) => {
                    const match =
                        normalizeText(
                            bill.name
                        ).match(
                            /^Bill\s+(\d+)$/i
                        );

                    if (!match) {
                        return 0;
                    }

                    return (
                        Number(
                            match[1]
                        ) ||
                        0
                    );
                }
            )
            .filter(
                (number) => {
                    return number > 0;
                }
            );

    let nextNumber =
        1;

    while (
        usedNumbers.includes(
            nextNumber
        )
    ) {
        nextNumber +=
            1;
    }

    return nextNumber;
}


/* =========================================================
   TẠO BILL MỚI
========================================================= */

export function addNewBill() {
    if (
        state.bills.length >=
        MAX_PENDING_BILLS
    ) {
        return {
            success:
                false,

            message:
                `Chỉ được mở tối đa ${MAX_PENDING_BILLS} bill cùng lúc.`,

            bill:
                null
        };
    }

    const newBill =
        createEmptyBill(
            getNextBillNumber()
        );

    state.bills.push(
        newBill
    );

    state.activeBillId =
        newBill.id;

    saveBillsToStorage();

    dispatchBillChangedEvent(
        "created",
        newBill
    );

    return {
        success:
            true,

        message:
            "Đã tạo bill mới.",

        bill:
            newBill
    };
}


/* =========================================================
   CHUYỂN SANG BILL KHÁC
========================================================= */

export function switchActiveBill(
    billId
) {
    const bill =
        findBillById(
            billId
        );

    if (!bill) {
        return {
            success:
                false,

            message:
                "Không tìm thấy bill.",

            bill:
                null
        };
    }

    state.activeBillId =
        bill.id;

    saveBillsToStorage();

    dispatchBillChangedEvent(
        "switched",
        bill
    );

    return {
        success:
            true,

        message:
            "Đã chuyển bill.",

        bill
    };
}


/* =========================================================
   ĐỔI TÊN BILL
========================================================= */

export function renameActiveBill(
    newName
) {
    const normalizedName =
        normalizeText(
            newName
        );

    if (!normalizedName) {
        return {
            success:
                false,

            message:
                "Vui lòng nhập tên bill.",

            bill:
                null
        };
    }

    if (
        normalizedName.length >
        40
    ) {
        return {
            success:
                false,

            message:
                "Tên bill không được dài quá 40 ký tự.",

            bill:
                null
        };
    }

    const duplicatedName =
        state.bills.some(
            (bill) => {
                return (
                    bill.id !==
                    state.activeBillId
                    &&
                    normalizeText(
                        bill.name
                    ).toLocaleLowerCase(
                        "vi"
                    ) ===
                    normalizedName.toLocaleLowerCase(
                        "vi"
                    )
                );
            }
        );

    if (duplicatedName) {
        return {
            success:
                false,

            message:
                "Tên bill này đang được sử dụng.",

            bill:
                null
        };
    }

    const activeBill =
        getActiveBill();

    activeBill.name =
        normalizedName;

    activeBill.updatedAt =
        new Date().toISOString();

    saveBillsToStorage();

    dispatchBillChangedEvent(
        "renamed",
        activeBill
    );

    return {
        success:
            true,

        message:
            "Đã đổi tên bill.",

        bill:
            activeBill
    };
}


/* =========================================================
   XÓA BILL THEO ID
========================================================= */

export function deleteBill(
    billId
) {
    const normalizedBillId =
        normalizeText(
            billId
        );

    const deletedBillIndex =
        state.bills.findIndex(
            (bill) => {
                return (
                    bill.id ===
                    normalizedBillId
                );
            }
        );

    if (
        deletedBillIndex ===
        -1
    ) {
        return {
            success:
                false,

            message:
                "Không tìm thấy bill.",

            deletedBill:
                null,

            activeBill:
                getActiveBill()
        };
    }

    const deletedBill =
        state.bills[
            deletedBillIndex
        ];

    /*
        Xóa trực tiếp bằng splice thay vì
        tạo một mảng mới bằng filter.

        Nhờ đó giao diện nhận thay đổi ngay,
        không cần tải lại trang.
    */
    state.bills.splice(
        deletedBillIndex,
        1
    );

    /*
        Nếu vừa xóa bill cuối cùng,
        tự tạo lại Bill 1.
    */
    if (
        state.bills.length === 0
    ) {
        const firstBill =
            createEmptyBill(1);

        state.bills.push(
            firstBill
        );

        state.activeBillId =
            firstBill.id;
    } else if (
        state.activeBillId ===
        normalizedBillId
    ) {
        /*
            Ưu tiên bill nằm ở đúng vị trí
            của bill vừa xóa.

            Nếu đó là bill cuối cùng thì
            chuyển sang bill phía trước.
        */
        const nextBillIndex =
            Math.min(
                deletedBillIndex,
                state.bills.length - 1
            );

        state.activeBillId =
            state.bills[
                nextBillIndex
            ].id;
    }

    saveBillsToStorage();

    const newActiveBill =
        getActiveBill();

    dispatchBillChangedEvent(
        "deleted",
        newActiveBill,
        {
            deletedBill,

            deletedBillId:
                normalizedBillId
        }
    );

    return {
        success:
            true,

        message:
            "Đã xóa bill.",

        deletedBill,

        activeBill:
            newActiveBill
    };
}


/* =========================================================
   XÓA BILL ĐANG CHỌN
========================================================= */

export function deleteActiveBill() {
    return deleteBill(
        state.activeBillId
    );
}


/* =========================================================
   HOÀN TẤT BILL SAU THANH TOÁN
========================================================= */

export function completeActiveBill() {
    const activeBill =
        getActiveBill();

    if (!activeBill) {
        return {
            success:
                false,

            message:
                "Không tìm thấy bill cần thanh toán.",

            completedBill:
                null,

            activeBill:
                null
        };
    }

    const completedBill =
        {
            ...activeBill,

            cart:
                activeBill.cart.map(
                    (item) => {
                        return {
                            ...item
                        };
                    }
                )
        };

    const completedBillIndex =
        state.bills.findIndex(
            (bill) => {
                return (
                    bill.id ===
                    activeBill.id
                );
            }
        );

    if (
        completedBillIndex ===
        -1
    ) {
        return {
            success:
                false,

            message:
                "Không tìm thấy bill cần thanh toán.",

            completedBill:
                null,

            activeBill:
                getActiveBill()
        };
    }

    /*
        Xóa trực tiếp bill vừa thanh toán.
    */
    state.bills.splice(
        completedBillIndex,
        1
    );

    if (
        state.bills.length === 0
    ) {
        const firstBill =
            createEmptyBill(1);

        state.bills.push(
            firstBill
        );

        state.activeBillId =
            firstBill.id;
    } else {
        const nextBillIndex =
            Math.min(
                completedBillIndex,
                state.bills.length - 1
            );

        state.activeBillId =
            state.bills[
                nextBillIndex
            ].id;
    }

    saveBillsToStorage();

    const newActiveBill =
        getActiveBill();

    dispatchBillChangedEvent(
        "completed",
        newActiveBill,
        {
            completedBill
        }
    );

    return {
        success:
            true,

        message:
            "Đã hoàn tất bill.",

        completedBill,

        activeBill:
            newActiveBill
    };
}


/* =========================================================
   XÓA GIỎ CỦA BILL ĐANG CHỌN
========================================================= */

export function clearActiveBillCart() {
    const activeBill =
        getActiveBill();

    activeBill.cart.splice(
        0,
        activeBill.cart.length
    );

    activeBill.selectedDiscountId =
        "";

    activeBill.transferCode =
        "";

    activeBill.updatedAt =
        new Date().toISOString();

    saveBillsToStorage();

    dispatchBillChangedEvent(
        "cart-cleared",
        activeBill
    );

    return activeBill;
}


/* =========================================================
   CẬP NHẬT THỜI GIAN BILL
========================================================= */

export function touchActiveBill() {
    const activeBill =
        getActiveBill();

    activeBill.updatedAt =
        new Date().toISOString();

    saveBillsToStorage();

    return activeBill;
}


/* =========================================================
   KIỂM TRA BILL CÓ SẢN PHẨM KHÔNG
========================================================= */

export function activeBillHasItems() {
    const activeBill =
        getActiveBill();

    return (
        Array.isArray(
            activeBill.cart
        )
        &&
        activeBill.cart.length >
        0
    );
}


/* =========================================================
   KHỞI TẠO QUẢN LÝ BILL
========================================================= */

export function initializeBillManager() {
    loadBillsFromStorage();

    const activeBill =
        getActiveBill();

    dispatchBillChangedEvent(
        "initialized",
        activeBill
    );

    return activeBill;
}


/* =========================================================
   LƯU KHI RỜI TRANG
========================================================= */

window.addEventListener(
    "beforeunload",
    saveBillsToStorage
);