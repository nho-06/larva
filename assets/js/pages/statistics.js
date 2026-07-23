import {
    listenSales,
    filterSalesByDate,
    calculateRevenue,
    calculateProfit,
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

    todayProfit:
        document.querySelector(
            "#todayProfit"
        ),

    monthRevenue:
        document.querySelector(
            "#monthRevenue"
        ),

    monthProfit:
        document.querySelector(
            "#monthProfit"
        ),

    yearRevenue:
        document.querySelector(
            "#yearRevenue"
        ),

    yearProfit:
        document.querySelector(
            "#yearProfit"
        ),

    bestSellingTableBody:
        document.querySelector(
            "#bestSellingTableBody"
        ),

    emptyBestSelling:
        document.querySelector(
            "#emptyBestSelling"
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


function toNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function setText(
    element,
    value
) {
    if (!element) {
        return;
    }

    element.textContent =
        String(value);
}


function setDefaultDateRange() {
    const today =
        new Date();

    const firstDayOfMonth =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    if (elements.startDateInput) {
        elements.startDateInput.value =
            toDateInputValue(
                firstDayOfMonth
            );
    }

    if (elements.endDateInput) {
        elements.endDateInput.value =
            toDateInputValue(
                today
            );
    }
}


function showStatisticsMessage(
    message,
    type = "error"
) {
    if (!elements.statisticsMessage) {
        return;
    }

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
        }, 2800);
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
        elements.startDateInput?.value
        || "";

    const endDate =
        elements.endDateInput?.value
        || "";

    if (!startDate || !endDate) {
        showStatisticsMessage(
            "Vui lòng chọn đầy đủ từ ngày và đến ngày."
        );

        return;
    }

    if (startDate > endDate) {
        showStatisticsMessage(
            "Từ ngày không được lớn hơn đến ngày."
        );

        return;
    }

    state.filteredSales =
        filterSalesByDate(
            state.sales,
            startDate,
            endDate
        );

    /*
        Bộ lọc ngày chỉ áp dụng cho:

        - Biểu đồ
        - Sản phẩm bán chạy

        Sáu ô doanh thu hôm nay, tháng này
        và năm nay vẫn tính theo thời gian thực.
    */
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

    setText(
        elements.todayRevenue,
        formatMoney(
            calculateRevenue(
                todaySales
            )
        )
    );

    setText(
        elements.todayProfit,
        formatMoney(
            calculateProfit(
                todaySales
            )
        )
    );

    setText(
        elements.monthRevenue,
        formatMoney(
            calculateRevenue(
                monthSales
            )
        )
    );

    setText(
        elements.monthProfit,
        formatMoney(
            calculateProfit(
                monthSales
            )
        )
    );

    setText(
        elements.yearRevenue,
        formatMoney(
            calculateRevenue(
                yearSales
            )
        )
    );

    setText(
        elements.yearProfit,
        formatMoney(
            calculateProfit(
                yearSales
            )
        )
    );
}


function renderBestSellingProducts() {
    if (
        !elements.bestSellingTableBody
        ||
        !elements.emptyBestSelling
    ) {
        return;
    }

    const products =
        calculateBestSellingProducts(
            state.filteredSales
        ).slice(
            0,
            10
        );

    const fallbackImage =
        placeholderImage();

    elements.bestSellingTableBody.innerHTML =
        products
            .map((product, index) => {
                const image =
                    product.image
                    || fallbackImage;

                const productName =
                    product.name
                    || "Sản phẩm";

                const sku =
                    product.sku
                    || "Chưa có mã";

                const quantity =
                    toNumber(
                        product.quantity
                    );

                const revenue =
                    toNumber(
                        product.revenue
                    );

                const cost =
                    toNumber(
                        product.cost
                    );

                const profit =
                    toNumber(
                        product.profit
                    );

                return `
                    <tr>

                        <td class="statistics-index-cell">
                            ${index + 1}
                        </td>

                        <td class="statistics-product-table-cell">

                            <div class="statistics-product-cell">

                                <img
                                    class="statistics-product-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(productName)}"
                                    loading="lazy"
                                    onerror="
                                        this.onerror = null;
                                        this.src = '${escapeHtml(fallbackImage)}';
                                    "
                                >

                                <div class="statistics-product-info">

                                    <strong
                                        title="${escapeHtml(productName)}"
                                    >
                                        ${escapeHtml(productName)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(sku)}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td class="statistics-number-cell">
                            <strong>
                                ${quantity}
                            </strong>
                        </td>

                        <td class="statistics-money-cell">
                            ${formatMoney(revenue)}
                        </td>

                        <td class="statistics-money-cell">
                            ${formatMoney(cost)}
                        </td>

                        <td
                            class="
                                statistics-money-cell
                                profit-value
                            "
                        >
                            <strong>
                                ${formatMoney(profit)}
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


function renderDailyRevenueChart() {
    if (
        !elements.dailyRevenueChart
        ||
        !elements.emptyDailyRevenue
    ) {
        return;
    }

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

    const values =
        dailyData.flatMap((day) => {
            return [
                Math.max(
                    0,
                    toNumber(day.revenue)
                ),

                Math.max(
                    0,
                    toNumber(day.cost)
                ),

                Math.max(
                    0,
                    toNumber(day.profit)
                )
            ];
        });

    const maxValue =
        Math.max(
            ...values,
            1
        );

    dailyData.forEach((day) => {
        const revenue =
            toNumber(
                day.revenue
            );

        const cost =
            toNumber(
                day.cost
            );

        const profit =
            toNumber(
                day.profit
            );

        const revenueHeight =
            revenue > 0
                ? Math.max(
                    3,
                    (
                        revenue
                        / maxValue
                    ) * 100
                )
                : 0;

        const costHeight =
            cost > 0
                ? Math.max(
                    3,
                    (
                        cost
                        / maxValue
                    ) * 100
                )
                : 0;

        const profitHeight =
            profit > 0
                ? Math.max(
                    3,
                    (
                        profit
                        / maxValue
                    ) * 100
                )
                : 0;

        const dateText =
            new Date(
                `${day.date}T00:00:00`
            ).toLocaleDateString(
                "vi-VN",
                {
                    day: "2-digit",
                    month: "2-digit"
                }
            );

        const column =
            document.createElement(
                "div"
            );

        column.className =
            "statistics-chart-column";

        column.innerHTML = `
            <div class="statistics-chart-bars">

                <div
                    class="statistics-chart-bar revenue"
                    style="height: ${revenueHeight}%"
                    title="Doanh thu: ${formatMoney(revenue)}"
                ></div>

                <div
                    class="statistics-chart-bar cost"
                    style="height: ${costHeight}%"
                    title="Giá vốn: ${formatMoney(cost)}"
                ></div>

                <div
                    class="statistics-chart-bar profit"
                    style="height: ${profitHeight}%"
                    title="Tiền lời: ${formatMoney(profit)}"
                ></div>

            </div>

            <strong class="daily-revenue-date">
                ${escapeHtml(dateText)}
            </strong>

            <small>
                ${toNumber(day.invoiceCount)} hóa đơn
            </small>
        `;

        elements.dailyRevenueChart
            .appendChild(
                column
            );
    });
}


function renderStatistics() {
    renderSummaryCards();
    renderDailyRevenueChart();
    renderBestSellingProducts();
}


elements.applyFilterButton
    ?.addEventListener(
        "click",
        applyDateFilter
    );


elements.resetFilterButton
    ?.addEventListener(
        "click",
        resetDateFilter
    );


elements.startDateInput
    ?.addEventListener(
        "change",
        applyDateFilter
    );


elements.endDateInput
    ?.addEventListener(
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