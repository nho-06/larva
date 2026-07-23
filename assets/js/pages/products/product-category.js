import {
    createCategory
} from "../../services/category-service.js";

import {
    normalizeText
} from "../../utils.js";

import {
    productState
} from "./products-state.js";

import {
    productElements
} from "./products-elements.js";

function showCategoryError(
    message
) {
    if (
        !productElements.categoryFormError
    ) {
        return;
    }

    productElements.categoryFormError.textContent =
        message;

    productElements.categoryFormError
        .classList.remove(
            "hidden"
        );
}

export function hideCategoryError() {
    if (
        !productElements.categoryFormError
    ) {
        return;
    }

    productElements.categoryFormError.textContent =
        "";

    productElements.categoryFormError
        .classList.add(
            "hidden"
        );
}

export function findCategoryById(
    categoryId
) {
    return (
        productState.categories.find(
            (category) => {
                return (
                    String(
                        category.id || ""
                    ) ===
                    String(
                        categoryId || ""
                    )
                );
            }
        ) || null
    );
}

export function renderCategoryOptions() {
    const categorySelect =
        productElements.category;

    const categoryFilter =
        productElements.categoryFilter;

    if (
        !categorySelect ||
        !categoryFilter
    ) {
        return;
    }

    const currentFormValue =
        categorySelect.value;

    const currentFilterValue =
        categoryFilter.value;

    categorySelect.innerHTML = `
        <option value="">
            Chọn danh mục
        </option>

        ${productState.categories
            .map((category) => {
                return `
                    <option value="${String(
                        category.id || ""
                    )}">
                        ${String(
                            category.name || ""
                        )}
                    </option>
                `;
            })
            .join("")}
    `;

    categoryFilter.innerHTML = `
        <option value="">
            Tất cả danh mục
        </option>

        ${productState.categories
            .map((category) => {
                return `
                    <option value="${String(
                        category.id || ""
                    )}">
                        ${String(
                            category.name || ""
                        )}
                    </option>
                `;
            })
            .join("")}
    `;

    const formCategoryExists =
        productState.categories.some(
            (category) => {
                return (
                    String(
                        category.id || ""
                    ) ===
                    String(
                        currentFormValue || ""
                    )
                );
            }
        );

    categorySelect.value =
        formCategoryExists
            ? currentFormValue
            : "";

    const filterCategoryExists =
        productState.categories.some(
            (category) => {
                return (
                    String(
                        category.id || ""
                    ) ===
                    String(
                        currentFilterValue || ""
                    )
                );
            }
        );

    categoryFilter.value =
        filterCategoryExists
            ? currentFilterValue
            : "";
}

export function openCategoryModal() {
    productElements.categoryForm
        ?.reset();

    hideCategoryError();

    productElements.categoryModal
        ?.classList.remove(
            "hidden"
        );

    window.setTimeout(
        () => {
            productElements.categoryName
                ?.focus();
        },
        0
    );
}

export function closeCategoryModal() {
    productElements.categoryModal
        ?.classList.add(
            "hidden"
        );

    hideCategoryError();
}

export function normalizeCategoryPrefix(
    value
) {
    return String(
        value || ""
    )
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
        .slice(
            0,
            6
        );
}

export async function handleCategorySubmit(
    event
) {
    event.preventDefault();

    hideCategoryError();

    const categoryName =
        productElements.categoryName
            ?.value
            .trim() || "";

    const categoryPrefix =
        normalizeCategoryPrefix(
            productElements.categoryPrefix
                ?.value
        );

    if (!categoryName) {
        showCategoryError(
            "Hãy nhập tên danh mục."
        );

        return;
    }

    if (!categoryPrefix) {
        showCategoryError(
            "Hãy nhập ký hiệu mã sản phẩm."
        );

        return;
    }

    const duplicatedName =
        productState.categories.some(
            (category) => {
                return (
                    normalizeText(
                        category.name || ""
                    ) ===
                    normalizeText(
                        categoryName
                    )
                );
            }
        );

    if (duplicatedName) {
        showCategoryError(
            "Danh mục này đã tồn tại."
        );

        return;
    }

    const duplicatedPrefix =
        productState.categories.some(
            (category) => {
                return (
                    normalizeCategoryPrefix(
                        category.prefix
                    ) ===
                    categoryPrefix
                );
            }
        );

    if (duplicatedPrefix) {
        showCategoryError(
            "Ký hiệu này đã được sử dụng."
        );

        return;
    }

    if (
        productElements.saveCategoryButton
    ) {
        productElements.saveCategoryButton.disabled =
            true;

        productElements.saveCategoryButton.textContent =
            "Đang lưu...";
    }

    try {
        /*
            createCategory trả về:

            {
                id,
                name,
                prefix,
                createdAt,
                updatedAt
            }
        */
        const newCategory =
            await createCategory({
                name:
                    categoryName,

                prefix:
                    categoryPrefix
            });

        closeCategoryModal();

        /*
            Firebase sẽ cập nhật danh sách
            thông qua listenCategories.

            Chờ select được render lại rồi
            tự chọn danh mục vừa tạo.
        */
        window.setTimeout(
            () => {
                if (
                    productElements.category
                ) {
                    productElements.category.value =
                        newCategory.id;
                }
            },
            150
        );
    } catch (error) {
        console.error(
            "Không thể thêm danh mục:",
            error
        );

        showCategoryError(
            error.message ||
            "Không thể thêm danh mục."
        );
    } finally {
        if (
            productElements.saveCategoryButton
        ) {
            productElements.saveCategoryButton.disabled =
                false;

            productElements.saveCategoryButton.textContent =
                "Lưu danh mục";
        }
    }
}

export function bindProductCategoryEvents() {
    productElements.openCategoryModalButton
        ?.addEventListener(
            "click",
            openCategoryModal
        );

    productElements.categoryForm
        ?.addEventListener(
            "submit",
            handleCategorySubmit
        );

    productElements.categoryPrefix
        ?.addEventListener(
            "input",
            () => {
                productElements.categoryPrefix.value =
                    normalizeCategoryPrefix(
                        productElements.categoryPrefix.value
                    );
            }
        );

    document
        .querySelectorAll(
            "[data-close-category-modal]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                closeCategoryModal
            );
        });
}