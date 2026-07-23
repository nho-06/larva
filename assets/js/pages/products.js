import {
    listenProducts
} from "../services/product-service.js";

import {
    listenCategories
} from "../services/category-service.js";

import {
    productState
} from "./products/products-state.js";

import {
    renderCategoryOptions
} from "./products/product-category.js";

import {
    renderProducts,
    resetProductPage,
    toggleOutOfStockFilter,
    isShowingOutOfStockOnly
} from "./products/product-list.js";

import {
    setImageMode
} from "./products/product-image.js";

import {
    initializeProductEvents
} from "./products/product-events.js";


/* =========================================================
   CHUYỂN GIÁ TRỊ VỀ SỐ AN TOÀN
========================================================= */

function toNumber(
    value
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* =========================================================
   SẮP XẾP SẢN PHẨM
========================================================= */

function sortProductsWithOutOfStockLast(
    products
) {
    return [
        ...products
    ].sort(
        (
            firstProduct,
            secondProduct
        ) => {
            const firstQuantity =
                toNumber(
                    firstProduct.quantity
                    ??
                    firstProduct.stock
                    ??
                    0
                );

            const secondQuantity =
                toNumber(
                    secondProduct.quantity
                    ??
                    secondProduct.stock
                    ??
                    0
                );

            const firstIsOutOfStock =
                firstQuantity <= 0;

            const secondIsOutOfStock =
                secondQuantity <= 0;

            /*
                Khi đang xem toàn bộ sản phẩm:

                - Sản phẩm còn hàng nằm trước.
                - Sản phẩm hết hàng nằm cuối.
            */
            if (
                firstIsOutOfStock
                !==
                secondIsOutOfStock
            ) {
                return firstIsOutOfStock
                    ? 1
                    : -1;
            }

            /*
                Trong cùng một nhóm,
                sản phẩm vừa cập nhật nằm phía trên.
            */
            const firstTime =
                toNumber(
                    firstProduct.updatedAt
                    ||
                    firstProduct.createdAt
                    ||
                    0
                );

            const secondTime =
                toNumber(
                    secondProduct.updatedAt
                    ||
                    secondProduct.createdAt
                    ||
                    0
                );

            return (
                secondTime
                -
                firstTime
            );
        }
    );
}


/* =========================================================
   TẠO NÚT LỌC HẾT HÀNG
========================================================= */

function createOutOfStockFilterButton() {
    /*
        Nếu nút đã được tạo rồi
        thì không tạo lại.
    */
    const existingButton =
        document.querySelector(
            "#outOfStockFilterButton"
        );

    if (existingButton) {
        updateOutOfStockFilterButton();

        return;
    }

    const categoryFilter =
        document.querySelector(
            "#categoryFilter"
        );

    const toolbar =
        categoryFilter?.closest(
            ".toolbar"
        );

    if (
        !categoryFilter
        ||
        !toolbar
    ) {
        return;
    }

    const button =
        document.createElement(
            "button"
        );

    button.id =
        "outOfStockFilterButton";

    button.type =
        "button";

    button.className =
        "button button-light";

    /*
        Đặt nút ngay sau ô Tất cả danh mục.
    */
    categoryFilter.insertAdjacentElement(
        "afterend",
        button
    );

    button.addEventListener(
        "click",
        handleOutOfStockFilterClick
    );

    updateOutOfStockFilterButton();
}


/* =========================================================
   XỬ LÝ NÚT HẾT HÀNG
========================================================= */

function handleOutOfStockFilterClick() {
    toggleOutOfStockFilter();

    /*
        Khi đổi chế độ lọc,
        luôn quay lại trang đầu.
    */
    resetProductPage();

    updateOutOfStockFilterButton();

    renderProducts();
}


/* =========================================================
   CẬP NHẬT NỘI DUNG NÚT
========================================================= */

function updateOutOfStockFilterButton() {
    const button =
        document.querySelector(
            "#outOfStockFilterButton"
        );

    if (!button) {
        return;
    }

    const showingOutOfStockOnly =
        isShowingOutOfStockOnly();

    if (showingOutOfStockOnly) {
        button.textContent =
            "Tất cả sản phẩm";

        button.classList.remove(
            "button-light"
        );

        button.classList.add(
            "active"
        );

        button.setAttribute(
            "aria-pressed",
            "true"
        );

        return;
    }

    button.textContent =
        "Hết hàng";

    button.classList.add(
        "button-light"
    );

    button.classList.remove(
        "active"
    );

    button.setAttribute(
        "aria-pressed",
        "false"
    );
}


/* =========================================================
   THEO DÕI DỮ LIỆU FIREBASE
========================================================= */

function subscribeProductData() {
    /*
        Theo dõi danh mục.
    */
    listenCategories(
        (
            categories
        ) => {
            productState.categories =
                Array.isArray(
                    categories
                )
                    ? categories
                    : [];

            /*
                Sắp xếp danh mục theo tên.
            */
            productState.categories.sort(
                (
                    firstCategory,
                    secondCategory
                ) => {
                    return String(
                        firstCategory.name
                        ||
                        ""
                    ).localeCompare(
                        String(
                            secondCategory.name
                            ||
                            ""
                        ),
                        "vi"
                    );
                }
            );

            renderCategoryOptions();

            /*
                Sau khi danh mục được render,
                đảm bảo nút hết hàng vẫn tồn tại.
            */
            createOutOfStockFilterButton();

            renderProducts();
        }
    );

    /*
        Theo dõi sản phẩm.
    */
    listenProducts(
        (
            products
        ) => {
            const normalizedProducts =
                Array.isArray(
                    products
                )
                    ? products
                    : [];

            /*
                Luôn sắp xếp hết hàng xuống cuối
                trước khi đưa vào state.
            */
            productState.products =
                sortProductsWithOutOfStockLast(
                    normalizedProducts
                );

            renderProducts();
        }
    );
}


/* =========================================================
   KHỞI TẠO TRANG SẢN PHẨM
========================================================= */

function initializeProductsPage() {
    /*
        Gắn toàn bộ sự kiện có sẵn
        của trang sản phẩm.
    */
    initializeProductEvents();

    /*
        Mặc định nhập ảnh bằng đường dẫn.
    */
    setImageMode(
        "url"
    );

    /*
        Tạo nút lọc hết hàng.
    */
    createOutOfStockFilterButton();

    /*
        Hiển thị giao diện ban đầu
        trong lúc chờ Firebase.
    */
    renderCategoryOptions();

    renderProducts();

    /*
        Bắt đầu theo dõi dữ liệu Firebase.
    */
    subscribeProductData();
}


initializeProductsPage();