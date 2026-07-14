import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

export function listenSales(callback) {
    const salesReference =
        ref(db, "sales");

    return onValue(
        salesReference,
        (snapshot) => {
            const value =
                snapshot.val()
                || {};

            const sales =
                Object.entries(value)
                    .map(([id, sale]) => {
                        return {
                            id,
                            ...sale
                        };
                    })
                    .filter((sale) => {
                        return (
                            sale.status
                            === "paid"
                            || !sale.status
                        );
                    })
                    .sort((
                        firstSale,
                        secondSale
                    ) => {
                        return (
                            Number(
                                secondSale.createdAt
                                || 0
                            )
                            -
                            Number(
                                firstSale.createdAt
                                || 0
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

export function toDateInputValue(value) {
    const date =
        new Date(value);

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return (
        `${year}-${month}-${day}`
    );
}

export function filterSalesByDate(
    sales,
    startDate,
    endDate
) {
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

    return sales.filter((sale) => {
        const createdAt =
            Number(
                sale.createdAt || 0
            );

        return (
            createdAt >= startTime
            && createdAt <= endTime
        );
    });
}

export function calculateRevenue(sales) {
    return sales.reduce(
        (total, sale) => {
            return (
                total
                + Number(
                    sale.totalAmount || 0
                )
            );
        },
        0
    );
}

function calculateSaleCost(sale) {
    if (
        sale.totalCost !== undefined
        && sale.totalCost !== null
    ) {
        return Number(
            sale.totalCost || 0
        );
    }

    const items =
        Array.isArray(sale.items)
            ? sale.items
            : [];

    return items.reduce(
        (total, item) => {
            const quantity =
                Number(
                    item.quantity || 0
                );

            const lineCost =
                item.lineCost
                ?? (
                    Number(
                        item.costPrice || 0
                    )
                    * quantity
                );

            return (
                total
                + Number(
                    lineCost || 0
                )
            );
        },
        0
    );
}

function calculateSaleProfit(sale) {
    if (
        sale.totalProfit !== undefined
        && sale.totalProfit !== null
    ) {
        return Number(
            sale.totalProfit || 0
        );
    }

    return (
        Number(
            sale.totalAmount || 0
        )
        -
        calculateSaleCost(sale)
    );
}

export function calculateCost(sales) {
    return sales.reduce(
        (total, sale) => {
            return (
                total
                + calculateSaleCost(
                    sale
                )
            );
        },
        0
    );
}

export function calculateProfit(sales) {
    return sales.reduce(
        (total, sale) => {
            return (
                total
                + calculateSaleProfit(
                    sale
                )
            );
        },
        0
    );
}

export function calculateSoldQuantity(sales) {
    return sales.reduce(
        (total, sale) => {
            const saleQuantity =
                Array.isArray(sale.items)
                    ? sale.items.reduce(
                        (
                            itemTotal,
                            item
                        ) => {
                            return (
                                itemTotal
                                + Number(
                                    item.quantity
                                    || 0
                                )
                            );
                        },
                        0
                    )
                    : 0;

            return (
                total
                + saleQuantity
            );
        },
        0
    );
}

export function calculatePaymentSummary(
    sales
) {
    return sales.reduce(
        (summary, sale) => {
            const amount =
                Number(
                    sale.totalAmount || 0
                );

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

export function calculateBestSellingProducts(
    sales
) {
    const productMap =
        new Map();

    sales.forEach((sale) => {
        const items =
            Array.isArray(sale.items)
                ? sale.items
                : [];

        items.forEach((item) => {
            const productId =
                String(
                    item.productId
                    || item.barcode
                    || item.sku
                    || item.name
                    || ""
                );

            if (!productId) {
                return;
            }

            const currentProduct =
                productMap.get(productId)
                || {
                    productId,

                    name:
                        item.name
                        || "Sản phẩm",

                    image:
                        item.image
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

            const quantity =
                Number(
                    item.quantity || 0
                );

            const revenue =
                Number(
                    item.lineTotal
                    ?? (
                        Number(
                            item.price || 0
                        )
                        * quantity
                    )
                );

            const cost =
                Number(
                    item.lineCost
                    ?? (
                        Number(
                            item.costPrice || 0
                        )
                        * quantity
                    )
                );

            const profit =
                Number(
                    item.lineProfit
                    ?? (
                        revenue - cost
                    )
                );

            currentProduct.quantity +=
                quantity;

            currentProduct.revenue +=
                revenue;

            currentProduct.cost +=
                cost;

            currentProduct.profit +=
                profit;

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
            secondProduct.profit
            - firstProduct.profit
        );
    });
}

export function calculateDailyRevenue(sales) {
    const dailyMap =
        new Map();

    sales.forEach((sale) => {
        const createdAt =
            Number(
                sale.createdAt || 0
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
            Number(
                sale.totalAmount || 0
            );

        currentDay.cost +=
            calculateSaleCost(
                sale
            );

        currentDay.profit +=
            calculateSaleProfit(
                sale
            );

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

export function getMonthSales(
    sales,
    year,
    month
) {
    return sales.filter((sale) => {
        const createdAt =
            Number(
                sale.createdAt || 0
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
    });
}

export function getYearSales(
    sales,
    year
) {
    return sales.filter((sale) => {
        const createdAt =
            Number(
                sale.createdAt || 0
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
    });
}