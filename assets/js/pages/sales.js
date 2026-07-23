import {
    listenProducts
} from "../services/product-service.js";

import {
    listenCategories
} from "../services/category-service.js";

import {
    listenDiscountCodes
} from "../services/discount-service.js";

import {
    state
} from "./sales/sales-state.js";

import {
    initializeSaleEvents,
    renderBillTabs
} from "./sales/sale-events.js";

import {
    renderProducts,
    renderCategoryFilter
} from "./sales/product-list.js";

import {
    renderCart
} from "./sales/cart.js";

import {
    renderDiscountCodes
} from "./sales/discount.js";

import {
    saveBillsToStorage
} from "./sales/bill-manager.js";


/* =========================================================
   CHUYỂN GIÁ TRỊ VỀ SỐ AN TOÀN
========================================================= */

function toNumber(
    value
) {
    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* =========================================================
   TÌM SẢN PHẨM THEO ID
========================================================= */

function findProductById(
    products,
    productId
) {
    return (
        products.find(
            (product) => {
                return (
                    String(
                        product.id || ""
                    ) ===
                    String(
                        productId || ""
                    )
                );
            }
        ) ||
        null
    );
}


/* =========================================================
   ĐỒNG BỘ MỘT SẢN PHẨM TRONG BILL VỚI FIREBASE
========================================================= */

function syncCartItemWithProduct(
    cartItem,
    product
) {
    /*
        Sản phẩm đã bị xóa khỏi Firebase.
    */
    if (!product) {
        cartItem.stock =
            0;

        return;
    }

    const stock =
        Math.max(
            0,
            toNumber(
                product.quantity
            )
        );

    cartItem.stock =
        stock;

    /*
        Đồng bộ giá bán mới nhất.
    */
    cartItem.price =
        Math.max(
            0,
            toNumber(
                product.salePrice
            )
        );

    /*
        Đồng bộ lại thông tin hiển thị.
    */
    cartItem.name =
        product.name ||
        cartItem.name ||
        "Sản phẩm";

    cartItem.image =
        product.image ||
        cartItem.image ||
        "";

    cartItem.sku =
        product.sku ||
        cartItem.sku ||
        "";

    cartItem.barcode =
        product.barcode ||
        cartItem.barcode ||
        "";

    /*
        Nếu số lượng khách đang giữ
        lớn hơn tồn kho mới nhất,
        giảm số lượng xuống bằng tồn kho.
    */
    if (
        toNumber(
            cartItem.quantity
        ) >
        stock
    ) {
        cartItem.quantity =
            stock;
    }
}


/* =========================================================
   ĐỒNG BỘ TỒN KHO CHO TẤT CẢ BILL ĐANG CHỜ
========================================================= */

function syncAllBillsStock(
    products
) {
    let billsChanged =
        false;

    state.bills.forEach(
        (bill) => {
            if (
                !Array.isArray(
                    bill.cart
                )
            ) {
                bill.cart =
                    [];

                billsChanged =
                    true;

                return;
            }

            const oldCartJson =
                JSON.stringify(
                    bill.cart
                );

            bill.cart.forEach(
                (cartItem) => {
                    const product =
                        findProductById(
                            products,
                            cartItem.productId
                        );

                    syncCartItemWithProduct(
                        cartItem,
                        product
                    );
                }
            );

            /*
                Xóa khỏi bill các sản phẩm:

                - Đã bị xóa khỏi Firebase
                - Đã hết hàng
                - Số lượng đang giữ bằng 0
            */
            bill.cart =
                bill.cart.filter(
                    (cartItem) => {
                        return (
                            toNumber(
                                cartItem.stock
                            ) >
                            0
                            &&
                            toNumber(
                                cartItem.quantity
                            ) >
                            0
                        );
                    }
                );

            const newCartJson =
                JSON.stringify(
                    bill.cart
                );

            if (
                oldCartJson !==
                newCartJson
            ) {
                bill.updatedAt =
                    new Date().toISOString();

                billsChanged =
                    true;
            }
        }
    );

    if (billsChanged) {
        saveBillsToStorage();
    }
}


/* =========================================================
   KIỂM TRA MÃ GIẢM GIÁ CỦA TẤT CẢ BILL
========================================================= */

function syncAllBillsDiscountCodes() {
    let billsChanged =
        false;

    const availableDiscountIds =
        new Set(
            state.discountCodes.map(
                (discountCode) => {
                    return String(
                        discountCode.id || ""
                    );
                }
            )
        );

    state.bills.forEach(
        (bill) => {
            const selectedDiscountId =
                String(
                    bill.selectedDiscountId ||
                    ""
                );

            if (
                selectedDiscountId
                &&
                !availableDiscountIds.has(
                    selectedDiscountId
                )
            ) {
                bill.selectedDiscountId =
                    "";

                bill.updatedAt =
                    new Date().toISOString();

                billsChanged =
                    true;
            }
        }
    );

    if (billsChanged) {
        saveBillsToStorage();
    }
}


/* =========================================================
   THEO DÕI MÃ GIẢM GIÁ
========================================================= */

function subscribeDiscountCodes() {
    listenDiscountCodes(
        (discountCodes) => {
            state.discountCodes =
                Array.isArray(
                    discountCodes
                )
                    ? discountCodes
                    : [];

            /*
                Nếu một mã giảm giá đã bị xóa
                hoặc ngừng hoạt động,
                bỏ mã đó khỏi tất cả bill đang chờ.
            */
            syncAllBillsDiscountCodes();

            renderDiscountCodes();

            renderCart();

            renderBillTabs();
        }
    );
}


/* =========================================================
   THEO DÕI DANH MỤC
========================================================= */

function subscribeCategories() {
    listenCategories(
        (categories) => {
            state.categories =
                Array.isArray(
                    categories
                )
                    ? categories
                    : [];

            /*
                Sắp xếp danh mục theo tên.
            */
            state.categories.sort(
                (
                    firstCategory,
                    secondCategory
                ) => {
                    return String(
                        firstCategory.name ||
                        ""
                    ).localeCompare(
                        String(
                            secondCategory.name ||
                            ""
                        ),
                        "vi"
                    );
                }
            );

            /*
                Nếu danh mục đang chọn
                đã bị xóa thì quay về tất cả.
            */
            const selectedCategoryExists =
                state.categories.some(
                    (category) => {
                        return (
                            String(
                                category.id ||
                                ""
                            ) ===
                            String(
                                state.selectedCategoryId ||
                                ""
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
        }
    );
}


/* =========================================================
   THEO DÕI SẢN PHẨM
========================================================= */

function subscribeProducts() {
    listenProducts(
        (products) => {
            state.products =
                Array.isArray(
                    products
                )
                    ? products
                    : [];

            /*
                Sản phẩm còn hàng nằm trước.
                Sản phẩm hết hàng nằm cuối danh sách.
                Trong cùng một nhóm, sản phẩm mới sửa
                hoặc mới tạo sẽ nằm phía trên.
            */
            state.products.sort(
                (
                    firstProduct,
                    secondProduct
                ) => {
                    const firstIsOutOfStock =
                        toNumber(
                            firstProduct.quantity
                            ?? firstProduct.stock
                            ?? 0
                        ) <= 0;

                    const secondIsOutOfStock =
                        toNumber(
                            secondProduct.quantity
                            ?? secondProduct.stock
                            ?? 0
                        ) <= 0;

                    if (
                        firstIsOutOfStock !==
                        secondIsOutOfStock
                    ) {
                        return firstIsOutOfStock
                            ? 1
                            : -1;
                    }

                    const firstTime =
                        toNumber(
                            firstProduct.updatedAt
                            || firstProduct.createdAt
                        );

                    const secondTime =
                        toNumber(
                            secondProduct.updatedAt
                            || secondProduct.createdAt
                        );

                    return (
                        secondTime -
                        firstTime
                    );
                }
            );

            /*
                Đồng bộ thông tin và tồn kho
                cho tất cả bill đang chờ,
                không chỉ bill đang mở.
            */
            syncAllBillsStock(
                state.products
            );

            renderProducts();

            renderCart();

            renderBillTabs();
        }
    );
}


/* =========================================================
   KHỞI TẠO TRANG BÁN HÀNG
========================================================= */

function initializeSalesPage() {
    /*
        Khởi tạo hệ thống bill và
        gắn toàn bộ sự kiện.
    */
    initializeSaleEvents();

    /*
        Hiển thị giao diện ban đầu
        trong lúc chờ Firebase tải dữ liệu.
    */
    renderCategoryFilter();

    renderProducts();

    renderDiscountCodes();

    renderCart();

    renderBillTabs();

    /*
        Bắt đầu theo dõi dữ liệu Firebase.
    */
    subscribeDiscountCodes();

    subscribeCategories();

    subscribeProducts();
}


initializeSalesPage();