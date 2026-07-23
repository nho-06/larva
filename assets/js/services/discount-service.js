import {
    ref,
    push,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { db } from "../firebase-config.js";

function mapDiscountCodes(snapshot) {
    const value = snapshot.val() || {};

    return Object.entries(value)
        .map(([id, item]) => ({
            id,
            ...item
        }))
        .sort(
            (a, b) =>
                Number(b.createdAt || 0) -
                Number(a.createdAt || 0)
        );
}

function normalizeDiscountInput({
    code,
    type,
    value
}) {
    const normalizedCode = String(code || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

    const normalizedType =
        type === "amount"
            ? "amount"
            : "percent";

    const normalizedValue = Number(value || 0);

    if (!normalizedCode) {
        throw new Error(
            "Hãy nhập mã giảm giá."
        );
    }

    if (normalizedValue <= 0) {
        throw new Error(
            "Giá trị giảm phải lớn hơn 0."
        );
    }

    if (
        normalizedType === "percent" &&
        normalizedValue > 100
    ) {
        throw new Error(
            "Giảm theo phần trăm không được lớn hơn 100%."
        );
    }

    return {
        code: normalizedCode,
        type: normalizedType,
        value: normalizedValue
    };
}

/*
    Dùng tại trang bán hàng:
    Chỉ trả về mã đang hoạt động.
*/
export function listenDiscountCodes(callback) {
    return onValue(
        ref(db, "discountCodes"),
        (snapshot) => {
            const discounts =
                mapDiscountCodes(snapshot)
                    .filter(
                        (item) =>
                            item.active !== false
                    );

            callback(discounts);
        }
    );
}

/*
    Dùng tại trang quản lý:
    Trả về cả mã đang hoạt động
    và mã đã tắt.
*/
export function listenAllDiscountCodes(callback) {
    return onValue(
        ref(db, "discountCodes"),
        (snapshot) => {
            callback(
                mapDiscountCodes(snapshot)
            );
        }
    );
}

export async function createDiscountCode(input) {
    const normalized =
        normalizeDiscountInput(input);

    const discountRef = push(
        ref(db, "discountCodes")
    );

    const now = Date.now();

    const discount = {
        id: discountRef.key,
        ...normalized,
        active: true,
        createdAt: now,
        updatedAt: now
    };

    await set(
        discountRef,
        discount
    );

    return discount;
}

export async function updateDiscountCode(
    discountId,
    input
) {
    const id = String(
        discountId || ""
    ).trim();

    if (!id) {
        throw new Error(
            "Không tìm thấy mã giảm giá."
        );
    }

    const normalized =
        normalizeDiscountInput(input);

    await update(
        ref(
            db,
            `discountCodes/${id}`
        ),
        {
            ...normalized,
            updatedAt: Date.now()
        }
    );
}

export async function setDiscountCodeActive(
    discountId,
    active
) {
    const id = String(
        discountId || ""
    ).trim();

    if (!id) {
        throw new Error(
            "Không tìm thấy mã giảm giá."
        );
    }

    await update(
        ref(
            db,
            `discountCodes/${id}`
        ),
        {
            active: Boolean(active),
            updatedAt: Date.now()
        }
    );
}

export async function deleteDiscountCode(
    discountId
) {
    const id = String(
        discountId || ""
    ).trim();

    if (!id) {
        throw new Error(
            "Không tìm thấy mã giảm giá."
        );
    }

    await remove(
        ref(
            db,
            `discountCodes/${id}`
        )
    );
}