import {
    ref,
    push,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

/**
 * Thanh toán hóa đơn:
 * - Kiểm tra tồn kho mới nhất trên Firebase.
 * - Trừ tồn kho.
 * - Lưu hóa đơn vào sales.
 * - Cập nhật tất cả trong một lần update.
 */
export async function checkoutSale({
    items,
    paymentMethod,
    paidAmount,
    totalAmount,
    transferCode = ""
}) {
    if (
        !Array.isArray(items)
        || items.length === 0
    ) {
        throw new Error(
            "Giỏ hàng đang trống."
        );
    }

    const normalizedItems =
        items.map((item) => {
            return {
                productId:
                    String(
                        item.productId
                        || item.id
                        || ""
                    ).trim(),

                name:
                    item.name || "Sản phẩm",

                sku:
                    item.sku || "",

                barcode:
                    item.barcode || "",

                image:
                    item.image || "",

                price:
                    Number(
                        item.price
                        ?? item.salePrice
                        ?? 0
                    ),

                quantity:
                    Number(
                        item.quantity || 0
                    )
            };
        });

    for (const item of normalizedItems) {
        if (!item.productId) {
            throw new Error(
                `Sản phẩm "${item.name}" không có ID Firebase.`
            );
        }

        if (item.quantity <= 0) {
            throw new Error(
                `Số lượng của "${item.name}" không hợp lệ.`
            );
        }
    }

    /*
        Lấy toàn bộ sản phẩm mới nhất từ Firebase.
    */
    const productsSnapshot =
        await get(
            ref(db, "products")
        );

    const products =
        productsSnapshot.val() || {};

    const updates = {};
    const now = Date.now();

    /*
        Kiểm tra tồn kho từng sản phẩm.
    */
    for (const item of normalizedItems) {
        const product =
            products[item.productId];

        if (!product) {
            throw new Error(
                `Không tìm thấy sản phẩm "${item.name}" trên Firebase.`
            );
        }

        const currentStock =
            Number(
                product.quantity || 0
            );

        if (currentStock < item.quantity) {
            throw new Error(
                `"${item.name}" chỉ còn ${currentStock} sản phẩm.`
            );
        }

        const newStock =
            currentStock - item.quantity;

        updates[
            `products/${item.productId}/quantity`
        ] = newStock;

        updates[
            `products/${item.productId}/updatedAt`
        ] = now;
    }

    /*
        Tạo ID hóa đơn mới.
    */
    const saleId =
        push(
            ref(db, "sales")
        ).key;

    if (!saleId) {
        throw new Error(
            "Không thể tạo mã hóa đơn."
        );
    }

    const finalTotal =
        Number(totalAmount || 0);

    const finalPaidAmount =
        Number(paidAmount || 0);

    const saleItems =
        normalizedItems.map((item) => {
            return {
                productId:
                    item.productId,

                name:
                    item.name,

                sku:
                    item.sku,

                barcode:
                    item.barcode,

                image:
                    item.image,

                price:
                    item.price,

                quantity:
                    item.quantity,

                lineTotal:
                    item.price
                    * item.quantity
            };
        });

    const saleData = {
        id:
            saleId,

        saleId,

        items:
            saleItems,

        totalAmount:
            finalTotal,

        paymentMethod:
            paymentMethod || "cash",

        paidAmount:
            finalPaidAmount,

        changeAmount:
            paymentMethod === "cash"
                ? Math.max(
                    0,
                    finalPaidAmount
                    - finalTotal
                )
                : 0,

        transferCode:
            transferCode || "",

        status:
            "paid",

        createdAt:
            now
    };

    /*
        Lưu hóa đơn và trừ kho cùng một lần.
    */
    updates[
        `sales/${saleId}`
    ] = saleData;

    await update(
        ref(db),
        updates
    );

    return saleData;
}