import {
    listenSales,
    filterSalesByDate,
    calculateRevenue,
    calculateCost,
    calculateProfit,
    calculateSoldQuantity,
    calculatePaymentSummary,
    calculateBestSellingProducts,
    calculateDailyRevenue,
    getMonthSales,
    getYearSales,
    toDateInputValue
} from "../services/statistics-service.js";

import {
    escapeHtml,
    formatMoney,
    placeholderImage
} from "../utils.js";

const state = {
    sales: [],
    filteredSales: []
};

const elements = {
    startDateInput:
        document.querySelector(
            "#startDateInput"
        ),

    endDateInput:
        document.querySelector(
            "#endDateInput"
        ),

    applyFilterButton:
        document.querySelector(
            "#applyFilterButton"
        ),

    resetFilterButton:
        document.querySelector(
            "#resetFilterButton"
        ),

    todayRevenue:
        document.querySelector(
            "#todayRevenue"
        ),

    periodRevenue:
        document.querySelector(
            "#periodRevenue"
        ),

    periodCost:
        document.querySelector(
            "#periodCost"
        ),

    periodProfit:
        document.querySelector(
            "#periodProfit"
        ),

    monthProfit:
        document.querySelector(
            "#monthProfit"
        ),

    yearProfit:
        document.querySelector(
            "#yearProfit"
        ),

    totalInvoices:
        document.querySelector(
            "#totalInvoices"
        ),

    totalSoldQuantity:
        document.querySelector(
            "#totalSoldQuantity"
        ),

    cashRevenue:
        document.querySelector(
            "#cashRevenue"
        ),

    transferRevenue:
        document.querySelector(
            "#transferRevenue"
        ),

    bestSellingTableBody:
        document.querySelector(
            "#bestSellingTableBody"
        ),

    emptyBestSelling:
        document.querySelector(
            "#emptyBestSelling"
        ),

    recentSalesTableBody:
        document.querySelector(
            "#recentSalesTableBody"
        ),

    emptyRecentSales:
        document.querySelector(
            "#emptyRecentSales"
        ),

    dailyRevenueChart:
        document.querySelector(
            "#dailyRevenueChart"
        ),

    emptyDailyRevenue:
        document.querySelector(
            "#emptyDailyRevenue"
        ),

    statisticsMessage:
        document.querySelector(
            "#statisticsMessage"
        )
};

function setDefaultDateRange() {
    const today =
        new Date();

    const firstDayOfMonth =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    elements.startDateInput.value =
        toDateInputValue(
            firstDayOfMonth
        );

    elements.endDateInput.value =
        toDateInputValue(
            today
        );
}

function showStatisticsMessage(
    message,
    type = "error"
) {
    elements.statisticsMessage.textContent =
        message;

    elements.statisticsMessage.className =
        `statistics-message ${type}`;

    window.clearTimeout(
        showStatisticsMessage.timer
    );

    showStatisticsMessage.timer =
        window.setTimeout(() => {
            elements.statisticsMessage
                .classList.add(
                    "hidden"
                );
        }, 2600);
}

function getTodaySales() {
    const today =
        toDateInputValue(
            new Date()
        );

    return filterSalesByDate(
        state.sales,
        today,
        today
    );
}

function applyDateFilter() {
    const startDate =
        elements.startDateInput.value;

    const endDate =
        elements.endDateInput.value;

    if (
        startDate
        && endDate
        && startDate > endDate
    ) {
        showStatisticsMessage(
            "Ngày bắt đầu không được lớn hơn ngày kết thúc."
        );

        return;
    }

    state.filteredSales =
        filterSalesByDate(
            state.sales,
            startDate,
            endDate
        );

    renderStatistics();
}

function resetDateFilter() {
    setDefaultDateRange();
    applyDateFilter();
}

function renderSummaryCards() {
    const now =
        new Date();

    const todaySales =
        getTodaySales();

    const monthSales =
        getMonthSales(
            state.sales,
            now.getFullYear(),
            now.getMonth() + 1
        );

    const yearSales =
        getYearSales(
            state.sales,
            now.getFullYear()
        );

    const paymentSummary =
        calculatePaymentSummary(
            state.filteredSales
        );

    elements.todayRevenue.textContent =
        formatMoney(
            calculateRevenue(
                todaySales
            )
        );

    elements.periodRevenue.textContent =
        formatMoney(
            calculateRevenue(
                state.filteredSales
            )
        );

    elements.periodCost.textContent =
        formatMoney(
            calculateCost(
                state.filteredSales
            )
        );

    elements.periodProfit.textContent =
        formatMoney(
            calculateProfit(
                state.filteredSales
            )
        );

    elements.monthProfit.textContent =
        formatMoney(
            calculateProfit(
                monthSales
            )
        );

    elements.yearProfit.textContent =
        formatMoney(
            calculateProfit(
                yearSales
            )
        );

    elements.totalInvoices.textContent =
        state.filteredSales.length;

    elements.totalSoldQuantity.textContent =
        calculateSoldQuantity(
            state.filteredSales
        );

    elements.cashRevenue.textContent =
        formatMoney(
            paymentSummary.cash
        );

    elements.transferRevenue.textContent =
        formatMoney(
            paymentSummary.transfer
        );
}

function renderBestSellingProducts() {
    const products =
        calculateBestSellingProducts(
            state.filteredSales
        ).slice(0, 10);

    elements.bestSellingTableBody.innerHTML =
        products
            .map((product, index) => {
                const image =
                    product.image
                    || placeholderImage();

                return `
                    <tr>
                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            <div class="statistics-product-cell">
                                <img
                                    class="statistics-product-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(product.name)}"
                                    onerror="this.src='${placeholderImage()}'"
                                >

                                <div>
                                    <strong>
                                        ${escapeHtml(product.name)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            product.sku
                                            || "Chưa có mã"
                                        )}
                                    </small>
                                </div>
                            </div>
                        </td>

                        <td>
                            ${product.quantity}
                        </td>

                        <td>
                            ${formatMoney(
                                product.revenue
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                product.cost
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatMoney(
                                    product.profit
                                )}
                            </strong>
                        </td>
                    </tr>
                `;
            })
            .join("");

    elements.emptyBestSelling
        .classList.toggle(
            "hidden",
            products.length > 0
        );
}

function renderRecentSales() {
    const recentSales =
        state.filteredSales
            .slice(0, 20);

    elements.recentSalesTableBody.innerHTML =
        recentSales
            .map((sale) => {
                const createdAt =
                    Number(
                        sale.createdAt || 0
                    );

                const createdDate =
                    createdAt
                        ? new Date(
                            createdAt
                        ).toLocaleString(
                            "vi-VN"
                        )
                        : "Không rõ";

                const paymentMethod =
                    sale.paymentMethod
                    === "transfer"
                        ? "Chuyển khoản"
                        : "Tiền mặt";

                const itemQuantity =
                    Array.isArray(sale.items)
                        ? sale.items.reduce(
                            (
                                total,
                                item
                            ) => {
                                return (
                                    total
                                    + Number(
                                        item.quantity
                                        || 0
                                    )
                                );
                            },
                            0
                        )
                        : 0;

                const saleCost =
                    Number(
                        sale.totalCost || 0
                    );

                const saleProfit =
                    sale.totalProfit
                    !== undefined
                        ? Number(
                            sale.totalProfit || 0
                        )
                        : (
                            Number(
                                sale.totalAmount || 0
                            )
                            - saleCost
                        );

                return `
                    <tr>
                        <td>
                            <strong>
                                ${escapeHtml(
                                    sale.saleId
                                    || sale.id
                                    || ""
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                createdDate
                            )}
                        </td>

                        <td>
                            ${itemQuantity}
                        </td>

                        <td>
                            ${escapeHtml(
                                paymentMethod
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                sale.totalAmount
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                saleCost
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatMoney(
                                    saleProfit
                                )}
                            </strong>
                        </td>
                    </tr>
                `;
            })
            .join("");

    elements.emptyRecentSales
        .classList.toggle(
            "hidden",
            recentSales.length > 0
        );
}

function renderDailyRevenueChart() {
    const dailyData =
        calculateDailyRevenue(
            state.filteredSales
        );

    elements.dailyRevenueChart.innerHTML =
        "";

    elements.emptyDailyRevenue
        .classList.toggle(
            "hidden",
            dailyData.length > 0
        );

    if (dailyData.length === 0) {
        return;
    }

    const maxRevenue =
        Math.max(
            ...dailyData.map((day) => {
                return Number(
                    day.revenue || 0
                );
            }),
            1
        );

    dailyData.forEach((day) => {
        const heightPercent =
            Math.max(
                4,
                (
                    Number(
                        day.revenue || 0
                    )
                    / maxRevenue
                )
                * 100
            );

        const dateText =
            new Date(
                `${day.date}T00:00:00`
            ).toLocaleDateString(
                "vi-VN",
                {
                    day:
                        "2-digit",

                    month:
                        "2-digit"
                }
            );

        const column =
            document.createElement(
                "div"
            );

        column.className =
            "daily-revenue-column";

        column.innerHTML = `
            <div
                class="daily-revenue-value"
                title="${formatMoney(day.revenue)}"
            >
                ${formatMoney(day.revenue)}
            </div>

            <div class="daily-revenue-bar-wrap">
                <div
                    class="daily-revenue-bar"
                    style="height: ${heightPercent}%"
                ></div>
            </div>

            <div class="daily-revenue-date">
                ${escapeHtml(dateText)}
            </div>

            <small>
                Lời ${formatMoney(day.profit)}
            </small>
        `;

        elements.dailyRevenueChart
            .appendChild(column);
    });
}

function renderStatistics() {
    renderSummaryCards();
    renderBestSellingProducts();
    renderRecentSales();
    renderDailyRevenueChart();
}

elements.applyFilterButton
    .addEventListener(
        "click",
        applyDateFilter
    );

elements.resetFilterButton
    .addEventListener(
        "click",
        resetDateFilter
    );

elements.startDateInput
    .addEventListener(
        "change",
        applyDateFilter
    );

elements.endDateInput
    .addEventListener(
        "change",
        applyDateFilter
    );

setDefaultDateRange();

listenSales((sales) => {
    state.sales =
        Array.isArray(sales)
            ? sales
            : [];

    applyDateFilter();
});