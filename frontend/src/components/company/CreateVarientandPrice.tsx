"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import Swal from "sweetalert2";

import { API_BASE_URL } from "../../constants/api";

interface MenuCategory {
  id: number;
  category_name: string;
  Restaurant_category_id: number;
}

interface MenuItem {
  id: number;
  menu_name: string;ingred
  menu_category_id: number;
}

interface Variant {
  id: number;
  variant_name: string;
}

interface Ingredient {
  id: number;
  ingredient_name: string;
  unit_id: number;
  unit_name: string;
  cost_per_unit: number;
}

interface SelectedIngredient {
  ingredientId: number;
  quantity: string;
}

const CreateMenuVariant = () => {
  const [categoryId, setCategoryId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [ingredientList, setIngredientList] = useState<Ingredient[]>([]);

  const [selectedIngredients, setSelectedIngredients] = useState<
    SelectedIngredient[]
  >([]);

  const [showIngredients, setShowIngredients] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Fetch Categories
  |--------------------------------------------------------------------------
  */

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-varient/categories`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch categories.");
      }

      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);

      Swal.fire({
        icon: "error",
        title: "Failed to load categories",
        text:
          error instanceof Error ? error.message : "Unable to load categories.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Menu Items According To Category
  |--------------------------------------------------------------------------
  */

  const fetchMenuItems = async (selectedCategoryId: string) => {
    if (!selectedCategoryId) {
      setMenuItems([]);
      return;
    }

    try {
      setLoadingMenuItems(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-varient/menu-items?category_id=${selectedCategoryId}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch menu items.");
      }

      setMenuItems(data.data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);

      setMenuItems([]);

      Swal.fire({
        icon: "error",
        title: "Failed to load menu items",
        text:
          error instanceof Error ? error.message : "Unable to load menu items.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingMenuItems(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Variants According To Menu Item
  |--------------------------------------------------------------------------
  */

  const fetchVariants = async (selectedMenuItemId: string) => {
    if (!selectedMenuItemId) {
      setVariants([]);
      return;
    }

    try {
      setLoadingVariants(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-varient/variants?menu_subcategory_id=${selectedMenuItemId}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch variants.");
      }

      setVariants(data.data || []);
    } catch (error) {
      console.error("Error fetching variants:", error);

      setVariants([]);

      Swal.fire({
        icon: "error",
        title: "Failed to load variants",
        text:
          error instanceof Error ? error.message : "Unable to load variants.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingVariants(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Ingredients According To Menu Item
  |--------------------------------------------------------------------------
  */

  const fetchIngredients = async (selectedMenuItemId: string) => {
    if (!selectedMenuItemId) {
      setIngredientList([]);
      return;
    }

    try {
      setLoadingIngredients(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-varient/ingredients?menu_subcategory_id=${selectedMenuItemId}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch ingredients.");
      }

      setIngredientList(data.data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);

      setIngredientList([]);

      Swal.fire({
        icon: "error",
        title: "Failed to load ingredients",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load ingredients.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingIngredients(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial Category Loading
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchCategories();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Category Change
  |--------------------------------------------------------------------------
  */

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setCategoryId(value);

    // Reset dependent fields
    setMenuItemId("");
    setVariantId("");
    setMenuItems([]);
    setVariants([]);
    setIngredientList([]);
    setSelectedIngredients([]);
    setShowIngredients(false);

    if (value) {
      fetchMenuItems(value);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Menu Item Change
  |--------------------------------------------------------------------------
  */

  const handleMenuItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setMenuItemId(value);

    // Reset dependent fields
    setVariantId("");
    setVariants([]);
    setIngredientList([]);
    setSelectedIngredients([]);
    setShowIngredients(false);

    if (value) {
      fetchVariants(value);
      fetchIngredients(value);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Ingredient Checkbox
  |--------------------------------------------------------------------------
  */

  const handleIngredientChange = (ingredientId: number) => {
    setSelectedIngredients((previous) => {
      const exists = previous.some(
        (item) => item.ingredientId === ingredientId,
      );

      if (exists) {
        return previous.filter((item) => item.ingredientId !== ingredientId);
      }

      return [
        ...previous,
        {
          ingredientId,
          quantity: "",
        },
      ];
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Quantity Change
  |--------------------------------------------------------------------------
  */

  const handleQuantityChange = (ingredientId: number, quantity: string) => {
    // Only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(quantity)) {
      return;
    }

    setSelectedIngredients((previous) =>
      previous.map((item) =>
        item.ingredientId === ingredientId
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Calculate Individual Cost
  |--------------------------------------------------------------------------
  */

  const getIngredientCost = (ingredientId: number, quantity: string) => {
    const ingredient = ingredientList.find((item) => item.id === ingredientId);

    if (!ingredient || !quantity) {
      return 0;
    }

    return Number(ingredient.cost_per_unit) * Number(quantity);
  };

  /*
  |--------------------------------------------------------------------------
  | Calculate Total Cost
  |--------------------------------------------------------------------------
  */

  const totalCost = useMemo(() => {
    return selectedIngredients.reduce(
      (total, selected) =>
        total + getIngredientCost(selected.ingredientId, selected.quantity),
      0,
    );
  }, [selectedIngredients, ingredientList]);

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!categoryId) {
      Swal.fire({
        icon: "warning",
        title: "Category Required",
        text: "Please choose a category.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    if (!menuItemId) {
      Swal.fire({
        icon: "warning",
        title: "Menu Item Required",
        text: "Please choose a menu item.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    if (selectedIngredients.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Ingredients Required",
        text: "Please select at least one ingredient.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    const invalidQuantity = selectedIngredients.some(
      (item) => !item.quantity || Number(item.quantity) <= 0,
    );

    if (invalidQuantity) {
      Swal.fire({
        icon: "warning",
        title: "Quantity Required",
        text: "Please enter a valid quantity for every selected ingredient.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    if (!price || Number(price) <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Price Required",
        text: "Please enter a valid selling price.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/api/menu-varient`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menu_subcategory_id: Number(menuItemId),

          variant_id: variantId ? Number(variantId) : null,

          ingredients: selectedIngredients.map((item) => ({
            ingredient_id: item.ingredientId,
            quantity: Number(item.quantity),
          })),

          total_cost: totalCost,

          price: Number(price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create menu variant.");
      }

      Swal.fire({
        icon: "success",
        title: "Created Successfully",
        text: "Menu variant has been created successfully.",
        confirmButtonColor: "#7d1119",
      });

      // Reset form
      setCategoryId("");
      setMenuItemId("");
      setVariantId("");
      setPrice("");
      setMenuItems([]);
      setVariants([]);
      setIngredientList([]);
      setSelectedIngredients([]);
      setShowIngredients(false);
    } catch (error) {
      console.error("Error creating menu variant:", error);

      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: error instanceof Error ? error.message : "Something went wrong.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dark)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Create Menu Variant
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create a menu variant with ingredients, quantity, cost and selling
            price.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <form onSubmit={handleSubmit}>
            {/* Category + Menu Item */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Choose Category
                  <span className="ml-1 text-[var(--danger)]">*</span>
                </label>

                <select
                  id="category"
                  value={categoryId}
                  onChange={handleCategoryChange}
                  disabled={loadingCategories || submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Choose category"}
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Menu Item */}
              <div>
                <label
                  htmlFor="menuItem"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Choose Menu Item
                  <span className="ml-1 text-[var(--danger)]">*</span>
                </label>

                <select
                  id="menuItem"
                  value={menuItemId}
                  onChange={handleMenuItemChange}
                  disabled={!categoryId || loadingMenuItems || submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                >
                  <option value="">
                    {loadingMenuItems
                      ? "Loading menu items..."
                      : !categoryId
                        ? "Choose category first"
                        : "Choose menu item"}
                  </option>

                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.menu_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant */}
              <div>
                <label
                  htmlFor="variant"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Variant
                </label>

                <select
                  id="variant"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  disabled={!menuItemId || loadingVariants || submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                >
                  <option value="">
                    {loadingVariants
                      ? "Loading variants..."
                      : !menuItemId
                        ? "Choose menu item first"
                        : "Choose variant"}
                  </option>

                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.variant_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredients */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Ingredients
                <span className="ml-1 text-[var(--danger)]">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowIngredients(!showIngredients)}
                disabled={!menuItemId || loadingIngredients || submitting}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
              >
                <span>
                  {loadingIngredients
                    ? "Loading ingredients..."
                    : selectedIngredients.length === 0
                      ? !menuItemId
                        ? "Choose menu item first"
                        : "Choose ingredients"
                      : `${selectedIngredients.length} ingredient${
                          selectedIngredients.length > 1 ? "s" : ""
                        } selected`}
                </span>

                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showIngredients ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showIngredients && (
                <div className="mt-2 max-h-[190px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  {ingredientList.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      No ingredients found for this menu item.
                    </div>
                  ) : (
                    ingredientList.map((ingredient) => {
                      const selected = selectedIngredients.some(
                        (item) => item.ingredientId === ingredient.id,
                      );

                      return (
                        <label
                          key={ingredient.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--surface-grey)]"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              handleIngredientChange(ingredient.id)
                            }
                            disabled={submitting}
                            className="h-4 w-4 accent-[var(--primary)]"
                          />

                          <span className="text-sm text-[var(--text-primary)]">
                            {ingredient.ingredient_name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Ingredients */}
            {selectedIngredients.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="bg-[var(--surface-grey)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Selected Ingredients
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                      <tr>
                        <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                          Ingredient
                        </th>

                        <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                          Unit
                        </th>

                        <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                          Quantity
                        </th>

                        <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                          Cost / Unit
                        </th>

                        <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                          Cost
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedIngredients.map((selected) => {
                        const ingredient = ingredientList.find(
                          (item) => item.id === selected.ingredientId,
                        );

                        if (!ingredient) {
                          return null;
                        }

                        const cost = getIngredientCost(
                          ingredient.id,
                          selected.quantity,
                        );

                        return (
                          <tr
                            key={ingredient.id}
                            className="border-b border-[var(--border)] last:border-b-0"
                          >
                            {/* Ingredient */}
                            <td className="px-4 py-3">
                              <span className="font-medium text-[var(--text-primary)]">
                                {ingredient.ingredient_name}
                              </span>
                            </td>

                            {/* Unit */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={ingredient.unit_name}
                                readOnly
                                className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={selected.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    ingredient.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                                disabled={submitting}
                                className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                              />
                            </td>

                            {/* Cost Per Unit */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={`৳ ${Number(
                                  ingredient.cost_per_unit,
                                ).toFixed(2)}`}
                                readOnly
                                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"
                              />
                            </td>

                            {/* Cost */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={`৳ ${cost.toFixed(2)}`}
                                readOnly
                                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Total Cost + Price */}
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Total Cost */}
              <div>
                <label
                  htmlFor="totalCost"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Total Cost
                </label>

                <input
                  id="totalCost"
                  type="text"
                  value={`৳ ${totalCost.toFixed(2)}`}
                  readOnly
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-grey)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none"
                />
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Price
                  <span className="ml-1 text-[var(--danger)]">*</span>
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">
                    ৳
                  </span>

                  <input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (/^\d*\.?\d*$/.test(value)) {
                        setPrice(value);
                      }
                    }}
                    placeholder="Enter selling price"
                    disabled={submitting}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingCategories ||
                  loadingMenuItems ||
                  loadingVariants ||
                  loadingIngredients
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Variant
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMenuVariant;
