import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";


/* =========================================================
   CHUYỂN GIÁ TRỊ THÀNH SỐ AN TOÀN
========================================================= */

function toNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


/* =========================================================
   LẤY DANH SÁCH SẢN PHẨM TRONG HÓA ĐƠN
========================================================= */

function getSaleItems(sale) {
    return Array.isArray(sale?.items)
        ? sale.items
        : [];
}


/* =========================================================
   LẤY SỐ LƯỢNG SẢN PHẨM
========================================================= */

function getItemQuantity(item) {
    return Math.max(
        0,
        toNumber(
            item?.quantity
        )
    );
}


/* =========================================================
   LẤY GIÁ BÁN MỘT SẢN PHẨM
========================================================= */

function getItemSalePrice(item) {
    return Math.max(
        0,
        toNumber(
            item?.price
            ?? item?.salePrice
            ?? item?.sellingPrice
            ?? 0
        )
    );
}


/* =========================================================
   LẤY GIÁ VỐN MỘT SẢN PHẨM
========================================================= */

function getItemCostPrice(item) {
    return Math.max(
        0,
        toNumber(
            item?.costPrice
            ?? item?.purchasePrice
            ?? item?.importPrice
            ?? item?.buyPrice
            ?? item?.entryPrice
            ?? 0
        )
    );
}


/* =========================================================
   DOANH THU DÒNG SẢN PHẨM TRƯỚC GIẢM GIÁ
========================================================= */

function getItemOriginalRevenue(item) {
    const quantity =
        getItemQuantity(item);

    const savedLineTotal =
        toNumber(
            item?.lineTotal
        );

    /*
        Nếu hóa đơn đã lưu lineTotal thì dùng lại.
    */
    if (savedLineTotal > 0) {
        return savedLineTotal;
    }

    return (
        getItemSalePrice(item)
        * quantity
    );
}


/* =========================================================
   GIÁ VỐN DÒNG SẢN PHẨM
========================================================= */

function getItemLineCost(item) {
    const quantity =
        getItemQuantity(item);

    const savedLineCost =
        toNumber(
            item?.lineCost
        );

    /*
        Nếu đã lưu lineCost thì dùng lại.
    */
    if (
        item?.lineCost !== undefined
        &&
        item?.lineCost !== null
    ) {
        return Math.max(
            0,
            savedLineCost
        );
    }

    return (
        getItemCostPrice(item)
        * quantity
    );
}


/* =========================================================
   TỔNG TIỀN HÀNG TRƯỚC GIẢM GIÁ
========================================================= */

function calculateSaleSubtotal(sale) {
    const savedSubtotal =
        toNumber(
            sale?.subtotalAmount
        );

    if (
        sale?.subtotalAmount !== undefined
        &&
        sale?.subtotalAmount !== null
    ) {
        return Math.max(
            0,
            savedSubtotal
        );
    }

    return getSaleItems(sale).reduce(
        (
            total,
            item
        ) => {
            return (
                total
                + getItemOriginalRevenue(item)
            );
        },
        0
    );
}


/* =========================================================
   SỐ TIỀN GIẢM GIÁ
========================================================= */

function calculateSaleDiscount(sale) {
    const savedDiscount =
        toNumber(
            sale?.discountAmount
        );

    if (
        sale?.discountAmount !== undefined
        &&
        sale?.discountAmount !== null
    ) {
        return Math.max(
            0,
            savedDiscount
        );
    }

    const subtotal =
        calculateSaleSubtotal(sale);

    const totalAmount =
        toNumber(
            sale?.totalAmount
            ?? sale?.totalRevenue
        );

    return Math.max(
        0,
        subtotal - totalAmount
    );
}


/* =========================================================
   DOANH THU THỰC NHẬN CỦA HÓA ĐƠN

   Doanh thu = số tiền khách phải trả sau giảm giá.
========================================================= */

function calculateSaleRevenue(sale) {
    if (
        sale?.totalAmount !== undefined
        &&
        sale?.totalAmount !== null
    ) {
        return Math.max(
            0,
            toNumber(
                sale.totalAmount
            )
        );
    }

    if (
        sale?.totalRevenue !== undefined
        &&
        sale?.totalRevenue !== null
    ) {
        return Math.max(
            0,
            toNumber(
                sale.totalRevenue
            )
        );
    }

    const subtotal =
        calculateSaleSubtotal(sale);

    const discount =
        calculateSaleDiscount(sale);

    return Math.max(
        0,
        subtotal - discount
    );
}


/* =========================================================
   TỔNG GIÁ VỐN CỦA HÓA ĐƠN
========================================================= */

function calculateSaleCost(sale) {
    if (
        sale?.totalCost !== undefined
        &&
        sale?.totalCost !== null
    ) {
        return Math.max(
            0,
            toNumber(
                sale.totalCost
            )
        );
    }

    return getSaleItems(sale).reduce(
        (
            total,
            item
        ) => {
            return (
                total
                + getItemLineCost(item)
            );
        },
        0
    );
}


/* =========================================================
   TIỀN LỜI THỰC TẾ CỦA HÓA ĐƠN

   Không lấy sale.totalProfit cũ vì dữ liệu cũ có thể
   được tính trước giảm giá.

   Tiền lời = doanh thu thực nhận - giá vốn.
========================================================= */

function calculateSaleProfit(sale) {
    return (
        calculateSaleRevenue(sale)
        - calculateSaleCost(sale)
    );
}


/* =========================================================
   LẮNG NGHE DỮ LIỆU HÓA ĐƠN
========================================================= */

export function listenSales(callback) {
    const salesReference =
        ref(
            db,
            "sales"
        );

    return onValue(
        salesReference,

        (snapshot) => {
            const value =
                snapshot.val()
                || {};

            const sales =
                Object.entries(value)
                    .map((
                        [
                            id,
                            sale
                        ]
                    ) => {
                        return {
                            id,
                            ...sale
                        };
                    })
                    .filter((sale) => {
                        return (
                            sale.status === "paid"
                            ||
                            !sale.status
                        );
                    })
                    .sort((
                        firstSale,
                        secondSale
                    ) => {
                        return (
                            toNumber(
                                secondSale.createdAt
                            )
                            -
                            toNumber(
                                firstSale.createdAt
                            )
                        );
                    });

            callback(sales);
        },

        (error) => {
            console.error(
                "Không thể tải dữ liệu doanh thu:",
                error
            );

            callback([]);
        }
    );
}


/* =========================================================
   LẤY THỜI GIAN ĐẦU NGÀY
========================================================= */

export function getStartOfDay(value) {
    const date =
        new Date(value);

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date.getTime();
}


/* =========================================================
   LẤY THỜI GIAN CUỐI NGÀY
========================================================= */

export function getEndOfDay(value) {
    const date =
        new Date(value);

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date.getTime();
}


/* =========================================================
   CHUYỂN NGÀY THÀNH YYYY-MM-DD
========================================================= */

export function toDateInputValue(value) {
    const date =
        new Date(value);

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


/* =========================================================
   LỌC HÓA ĐƠN THEO KHOẢNG NGÀY
========================================================= */

export function filterSalesByDate(
    sales,
    startDate,
    endDate
) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    const startTime =
        startDate
            ? getStartOfDay(
                `${startDate}T00:00:00`
            )
            : 0;

    const endTime =
        endDate
            ? getEndOfDay(
                `${endDate}T00:00:00`
            )
            : Number.MAX_SAFE_INTEGER;

    return normalizedSales.filter(
        (sale) => {
            const createdAt =
                toNumber(
                    sale.createdAt
                );

            return (
                createdAt >= startTime
                &&
                createdAt <= endTime
            );
        }
    );
}


/* =========================================================
   TÍNH TỔNG DOANH THU
========================================================= */

export function calculateRevenue(sales) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            total,
            sale
        ) => {
            return (
                total
                + calculateSaleRevenue(sale)
            );
        },
        0
    );
}


/* =========================================================
   TÍNH TỔNG GIÁ VỐN
========================================================= */

export function calculateCost(sales) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            total,
            sale
        ) => {
            return (
                total
                + calculateSaleCost(sale)
            );
        },
        0
    );
}


/* =========================================================
   TÍNH TỔNG TIỀN LỜI
========================================================= */

export function calculateProfit(sales) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            total,
            sale
        ) => {
            return (
                total
                + calculateSaleProfit(sale)
            );
        },
        0
    );
}


/* =========================================================
   TÍNH TỔNG TIỀN GIẢM GIÁ
========================================================= */

export function calculateDiscount(sales) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            total,
            sale
        ) => {
            return (
                total
                + calculateSaleDiscount(sale)
            );
        },
        0
    );
}


/* =========================================================
   TÍNH TỔNG SỐ SẢN PHẨM ĐÃ BÁN
========================================================= */

export function calculateSoldQuantity(sales) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            total,
            sale
        ) => {
            const saleQuantity =
                getSaleItems(sale).reduce(
                    (
                        itemTotal,
                        item
                    ) => {
                        return (
                            itemTotal
                            + getItemQuantity(item)
                        );
                    },
                    0
                );

            return (
                total
                + saleQuantity
            );
        },
        0
    );
}


/* =========================================================
   TỔNG HỢP TIỀN MẶT VÀ CHUYỂN KHOẢN
========================================================= */

export function calculatePaymentSummary(
    sales
) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.reduce(
        (
            summary,
            sale
        ) => {
            const amount =
                calculateSaleRevenue(sale);

            if (
                sale.paymentMethod
                === "transfer"
            ) {
                summary.transfer +=
                    amount;
            } else {
                summary.cash +=
                    amount;
            }

            return summary;
        },
        {
            cash: 0,
            transfer: 0
        }
    );
}


/* =========================================================
   TÍNH SẢN PHẨM BÁN CHẠY

   Điểm quan trọng:

   Doanh thu từng sản phẩm được phân bổ theo tỷ lệ
   trong tổng hóa đơn sau khi đã trừ giảm giá.

   Ví dụ:

   - Tổng hàng trước giảm: 100.000
   - Khách được giảm: 10.000
   - Khách trả: 90.000
   - Sản phẩm chiếm 50% hóa đơn
   - Doanh thu thực nhận của sản phẩm: 45.000
========================================================= */

export function calculateBestSellingProducts(
    sales
) {
    const productMap =
        new Map();

    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    normalizedSales.forEach((sale) => {
        const items =
            getSaleItems(sale);

        const actualSaleRevenue =
            calculateSaleRevenue(sale);

        /*
            Tính tổng tiền hàng dựa trực tiếp
            trên từng dòng sản phẩm.

            Cách này tránh dữ liệu subtotalAmount cũ bị sai.
        */
        const itemsSubtotal =
            items.reduce(
                (
                    total,
                    item
                ) => {
                    return (
                        total
                        + getItemOriginalRevenue(item)
                    );
                },
                0
            );

        items.forEach((
            item,
            itemIndex
        ) => {
            const productId =
                String(
                    item.productId
                    ||
                    item.barcode
                    ||
                    item.sku
                    ||
                    item.name
                    ||
                    `unknown-${itemIndex}`
                );

            const quantity =
                getItemQuantity(item);

            const originalRevenue =
                getItemOriginalRevenue(item);

            const cost =
                getItemLineCost(item);

            /*
                Phân bổ số tiền khách thực trả
                cho sản phẩm theo tỷ lệ giá trị sản phẩm.
            */
            let actualItemRevenue =
                originalRevenue;

            if (itemsSubtotal > 0) {
                actualItemRevenue =
                    actualSaleRevenue
                    *
                    (
                        originalRevenue
                        / itemsSubtotal
                    );
            }

            /*
                Làm tròn về đơn vị đồng.
            */
            actualItemRevenue =
                Math.round(
                    actualItemRevenue
                );

            const actualItemProfit =
                actualItemRevenue
                - cost;

            const currentProduct =
                productMap.get(productId)
                || {
                    productId,

                    name:
                        item.name
                        || "Sản phẩm",

                    image:
                        item.image
                        || item.imageUrl
                        || "",

                    sku:
                        item.sku
                        || item.barcode
                        || "",

                    quantity:
                        0,

                    revenue:
                        0,

                    cost:
                        0,

                    profit:
                        0
                };

            currentProduct.quantity +=
                quantity;

            currentProduct.revenue +=
                actualItemRevenue;

            currentProduct.cost +=
                cost;

            currentProduct.profit +=
                actualItemProfit;

            productMap.set(
                productId,
                currentProduct
            );
        });
    });

    return Array.from(
        productMap.values()
    ).sort((
        firstProduct,
        secondProduct
    ) => {
        if (
            secondProduct.quantity
            !== firstProduct.quantity
        ) {
            return (
                secondProduct.quantity
                - firstProduct.quantity
            );
        }

        return (
            secondProduct.revenue
            - firstProduct.revenue
        );
    });
}


/* =========================================================
   TÍNH DOANH THU THEO NGÀY
========================================================= */

export function calculateDailyRevenue(sales) {
    const dailyMap =
        new Map();

    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    normalizedSales.forEach((sale) => {
        const createdAt =
            toNumber(
                sale.createdAt
            );

        if (!createdAt) {
            return;
        }

        const key =
            toDateInputValue(
                createdAt
            );

        const currentDay =
            dailyMap.get(key)
            || {
                date:
                    key,

                revenue:
                    0,

                cost:
                    0,

                profit:
                    0,

                invoiceCount:
                    0
            };

        currentDay.revenue +=
            calculateSaleRevenue(sale);

        currentDay.cost +=
            calculateSaleCost(sale);

        currentDay.profit +=
            calculateSaleProfit(sale);

        currentDay.invoiceCount +=
            1;

        dailyMap.set(
            key,
            currentDay
        );
    });

    return Array.from(
        dailyMap.values()
    ).sort((
        firstDay,
        secondDay
    ) => {
        return firstDay.date.localeCompare(
            secondDay.date
        );
    });
}


/* =========================================================
   LẤY HÓA ĐƠN THEO THÁNG
========================================================= */

export function getMonthSales(
    sales,
    year,
    month
) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.filter(
        (sale) => {
            const createdAt =
                toNumber(
                    sale.createdAt
                );

            if (!createdAt) {
                return false;
            }

            const date =
                new Date(createdAt);

            return (
                date.getFullYear()
                === Number(year)
                &&
                date.getMonth() + 1
                === Number(month)
            );
        }
    );
}


/* =========================================================
   LẤY HÓA ĐƠN THEO NĂM
========================================================= */

export function getYearSales(
    sales,
    year
) {
    const normalizedSales =
        Array.isArray(sales)
            ? sales
            : [];

    return normalizedSales.filter(
        (sale) => {
            const createdAt =
                toNumber(
                    sale.createdAt
                );

            if (!createdAt) {
                return false;
            }

            return (
                new Date(
                    createdAt
                ).getFullYear()
                === Number(year)
            );
        }
    );
}