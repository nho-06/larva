import {
    ref,
    push,
    set,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { db } from "../firebase-config.js";

export function listenDiscountCodes(callback) {
    return onValue(
        ref(db, "discountCodes"),
        (snapshot) => {
            const value =
                snapshot.val() || {};

            const discounts =
                Object.entries(value)
                    .map(([id, item]) => ({
                        id,
                        ...item
                    }))
                    .filter(
                        (item) =>
                            item.active !== false
                    )
                    .sort(
                        (a, b) =>
                            Number(
                                b.createdAt || 0
                            ) -
                            Number(
                                a.createdAt || 0
                            )
                    );

            callback(discounts);
        }
    );
}

export async function createDiscountCode({
    code,
    type,
    value
}) {
    const normalizedCode =
        String(code || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "");

    const normalizedType =
        type === "amount"
            ? "amount"
            : "percent";

    const normalizedValue =
        Number(value || 0);

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

    const discountRef =
        push(
            ref(
                db,
                "discountCodes"
            )
        );

    const now =
        Date.now();

    const discount = {
        id: discountRef.key,
        code: normalizedCode,
        type: normalizedType,
        value: normalizedValue,
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