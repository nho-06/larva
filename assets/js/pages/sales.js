import {
    listenProducts
} from "../services/product-service.js";

import {
    listenCategories
} from "../services/category-service.js";

import {
    state
} from "./sales/sales-state.js";

import {
    initializeSaleEvents
} from "./sales/sale-events.js";

import {
    renderProducts,
    renderCategoryFilter
} from "./sales/product-list.js";

import {
    renderCart
} from "./sales/cart.js";

function syncCartStock(products) {
    state.cart.forEach((cartItem) => {
        const product =
            products.find((item) => {
                return (
                    String(item.id || "")
                    === String(cartItem.productId || "")
                );
            });

        if (!product) {
            cartItem.stock =
                0;

            return;
        }

        const stock =
            toNumber(product.quantity);

        cartItem.stock =
            stock;

        /*
            Đồng bộ lại giá bán mới nhất
            nếu sản phẩm vừa được chỉnh giá.
        */
        cartItem.price =
            toNumber(product.salePrice);

        /*
            Nếu số lượng đang có trong giỏ
            lớn hơn tồn kho mới nhất thì giảm lại.
        */
        if (
            toNumber(cartItem.quantity)
            > stock
        ) {
            cartItem.quantity =
                stock;
        }
    });

    /*
        Xóa khỏi giỏ những sản phẩm:

        - Không còn tồn tại
        - Đã hết hàng
        - Số lượng trong giỏ bằng 0
    */
    state.cart =
        state.cart.filter((item) => {
            return (
                toNumber(item.stock) > 0
                &&
                toNumber(item.quantity) > 0
            );
        });
}

function initializeSalesPage() {
    /*
        Gắn toàn bộ sự kiện của trang bán hàng.
    */
    initializeSaleEvents();

    /*
        Hiển thị giao diện ban đầu
        trước khi Firebase tải xong.
    */
    renderCategoryFilter();
    renderProducts();
    renderCart();

    /*
        Theo dõi danh mục từ Firebase.

        Khi thêm, sửa hoặc xóa danh mục
        bên trang sản phẩm thì bộ lọc ở đây
        tự cập nhật.
    */
    listenCategories((categories) => {
        state.categories =
            Array.isArray(categories)
                ? categories
                : [];

        /*
            Nếu danh mục đang chọn đã bị xóa
            thì chuyển về Tất cả danh mục.
        */
        const selectedCategoryExists =
            state.categories.some(
                (category) => {
                    return (
                        String(category.id || "")
                        === String(
                            state.selectedCategoryId || ""
                        )
                    );
                }
            );

        if (
            state.selectedCategoryId
            &&
            !selectedCategoryExists
        ) {
            state.selectedCategoryId =
                "";
        }

        renderCategoryFilter();
        renderProducts();
    });

    /*
        Theo dõi sản phẩm từ Firebase.
    */
    listenProducts((products) => {
        state.products =
            Array.isArray(products)
                ? products
                : [];

        syncCartStock(
            state.products
        );

        renderProducts();
        renderCart();
    });
}

function toNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

initializeSalesPage();