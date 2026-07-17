import {
    listenSales,
    filterSalesByDate,
    calculateRevenue,
    calculateProfit,
    calculateSoldQuantity,
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
    sales:
        [],

    filteredSales:
        []
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

    monthRevenue:
        document.querySelector(
            "#monthRevenue"
        ),

    yearRevenue:
        document.querySelector(
            "#yearRevenue"
        ),

    todayProfit:
        document.querySelector(
            "#todayProfit"
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

/*
    Mặc định chọn từ ngày đầu tháng hiện tại
    đến ngày hôm nay.
*/
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
        }, 2600);
}

/*
    Lấy hóa đơn trong ngày hôm nay.
*/
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

/*
    Lọc dữ liệu theo khoảng ngày để dùng cho:

    - Tổng hóa đơn
    - Tổng sản phẩm đã bán
    - Biểu đồ
    - Sản phẩm bán chạy
*/
function applyDateFilter() {
    const startDate =
        elements.startDateInput?.value
        || "";

    const endDate =
        elements.endDateInput?.value
        || "";

    if (
        startDate
        &&
        endDate
        &&
        startDate > endDate
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

/*
    Hiển thị các ô doanh thu và tiền lời.

    Doanh thu:
    Tổng số tiền bán hàng thu được.

    Tiền lời:
    Doanh thu trừ giá vốn.
*/
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
        elements.monthRevenue,
        formatMoney(
            calculateRevenue(
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
        elements.todayProfit,
        formatMoney(
            calculateProfit(
                todaySales
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
        elements.yearProfit,
        formatMoney(
            calculateProfit(
                yearSales
            )
        )
    );

    setText(
        elements.totalInvoices,
        state.filteredSales.length
    );

    setText(
        elements.totalSoldQuantity,
        calculateSoldQuantity(
            state.filteredSales
        )
    );
}

/*
    Hiển thị tối đa 10 sản phẩm bán chạy.
*/
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
        ).slice(0, 10);

    elements.bestSellingTableBody.innerHTML =
        products
            .map((product, index) => {
                const image =
                    product.image
                    || placeholderImage();

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

                        <td>
                            ${index + 1}
                        </td>

                        <td>

                            <div class="statistics-product-cell">

                                <img
                                    class="statistics-product-image"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(productName)}"
                                    onerror="
                                        this.onerror = null;
                                        this.src = '${placeholderImage()}';
                                    "
                                >

                                <div>

                                    <strong>
                                        ${escapeHtml(productName)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(sku)}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${quantity}
                        </td>

                        <td>
                            ${formatMoney(revenue)}
                        </td>

                        <td>
                            ${formatMoney(cost)}
                        </td>

                        <td>

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

/*
    Hiển thị biểu đồ doanh thu và tiền lời
    theo từng ngày trong khoảng đã chọn.
*/
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

    const maxRevenue =
        Math.max(
            ...dailyData.map((day) => {
                return toNumber(
                    day.revenue
                );
            }),
            1
        );

    dailyData.forEach((day) => {
        const revenue =
            toNumber(
                day.revenue
            );

        const profit =
            toNumber(
                day.profit
            );

        const heightPercent =
            Math.max(
                4,
                (
                    revenue
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
                title="${formatMoney(revenue)}"
            >
                ${formatMoney(revenue)}
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
                Lời ${formatMoney(profit)}
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
    renderBestSellingProducts();
    renderDailyRevenueChart();
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

function toNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
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