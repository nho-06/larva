import {
    ref,
    push,
    set,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
    db
} from "../firebase-config.js";

const categoryRef =
    ref(
        db,
        "categories"
    );

function normalizePrefix(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-zA-Z0-9]/g,
            ""
        )
        .toUpperCase()
        .slice(0, 6);
}

export function listenCategories(callback) {
    return onValue(
        categoryRef,
        (snapshot) => {
            const data =
                snapshot.val()
                || {};

            const categories =
                Object.entries(data)
                    .map(
                        ([id, category]) => {
                            return {
                                id,
                                ...category
                            };
                        }
                    )
                    .sort(
                        (a, b) => {
                            return String(
                                a.name || ""
                            ).localeCompare(
                                String(
                                    b.name || ""
                                ),
                                "vi"
                            );
                        }
                    );

            callback(categories);
        },
        (error) => {
            console.error(
                "Không thể đọc danh mục:",
                error
            );

            callback([]);
        }
    );
}

export async function createCategory({
    name,
    prefix
}) {
    const cleanName =
        String(name || "")
            .trim();

    const cleanPrefix =
        normalizePrefix(prefix);

    if (!cleanName) {
        throw new Error(
            "Hãy nhập tên danh mục."
        );
    }

    if (!cleanPrefix) {
        throw new Error(
            "Hãy nhập ký hiệu mã sản phẩm."
        );
    }

    const newCategoryRef =
        push(categoryRef);

    const category = {
        name:
            cleanName,

        prefix:
            cleanPrefix,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()
    };

    await set(
        newCategoryRef,
        category
    );

    return {
        id:
            newCategoryRef.key,

        ...category
    };
}

export async function generateNextSku(prefix) {
    const cleanPrefix =
        normalizePrefix(prefix);

    if (!cleanPrefix) {
        throw new Error(
            "Danh mục chưa có ký hiệu mã sản phẩm."
        );
    }

    const counterRef =
        ref(
            db,
            `skuCounters/${cleanPrefix}`
        );

    const transactionResult =
        await runTransaction(
            counterRef,
            (currentValue) => {
                return (
                    Number(
                        currentValue || 0
                    )
                    + 1
                );
            }
        );

    if (
        !transactionResult.committed
    ) {
        throw new Error(
            "Không thể tạo mã sản phẩm."
        );
    }

    const nextNumber =
        Number(
            transactionResult
                .snapshot
                .val()
            || 0
        );

    return (
        cleanPrefix
        + String(nextNumber)
            .padStart(3, "0")
    );
}