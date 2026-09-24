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
  menu_name: string;
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

interface VariantPrice {
  variantId: number;
  price: string;
}

const CreateMenuVariant = () => {
  const [categoryId, setCategoryId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");

  /*
   * --------------------------------------------------------------------------
   * Selected Variants
   * --------------------------------------------------------------------------
   */
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);

  /*
   * --------------------------------------------------------------------------
   * sell Price Per Variant
   * --------------------------------------------------------------------------
   */
  const [variantPrices, setVariantPrices] = useState<VariantPrice[]>([]);

  /*
   * --------------------------------------------------------------------------
   * Data
   * --------------------------------------------------------------------------
   */
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  /*
   * IMPORTANT:
   * ingredientList now contains ALL ingredients allocated to
   * the selected submenu/menu item.
   *
   * There is no ingredient selection anymore.
   */
  const [ingredientList, setIngredientList] = useState<Ingredient[]>([]);

  /*
   * --------------------------------------------------------------------------
   * Ingredient Quantities
   * --------------------------------------------------------------------------
   *
   * Structure:
   *
   * {
   *   ingredientId: {
   *     variantId: "quantity"
   *   }
   * }
   *
   * Example:
   *
   * {
   *   1: {
   *     6: "100",
   *     9: "150"
   *   },
   *   2: {
   *     6: "50",
   *     9: "75"
   *   }
   * }
   */
  const [ingredientQuantities, setIngredientQuantities] = useState<
    Record<number, Record<number, string>>
  >({});

  const [showVariants, setShowVariants] = useState(false);

  /*
   * --------------------------------------------------------------------------
   * Loading States
   * --------------------------------------------------------------------------
   */
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /*
   * --------------------------------------------------------------------------
   * Fetch Categories
   * --------------------------------------------------------------------------
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
   * --------------------------------------------------------------------------
   * Fetch Menu Items According To Category
   * --------------------------------------------------------------------------
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
   * --------------------------------------------------------------------------
   * Fetch Variants According To Menu Item
   * --------------------------------------------------------------------------
   */
  /*
   * --------------------------------------------------------------------------
   * Fetch Variants According To Menu Item and Category
   * --------------------------------------------------------------------------
   */
  const fetchVariants = async (selectedMenuItemId: string) => {
    if (!selectedMenuItemId) {
      setVariants([]);
      return;
    }

    try {
      setLoadingVariants(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-varient/variants?menu_subcategory_id=${selectedMenuItemId}&category_id=${categoryId}`,
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
   * --------------------------------------------------------------------------
   * Fetch ALL Allocated Ingredients According To Menu Item
   * --------------------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The backend endpoint should return only the ingredients that are
   * allocated to this particular submenu/menu item.
   *
   * Example:
   *
   * /api/menu-varient/ingredients?menu_subcategory_id=123
   *
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

      /*
       * These are automatically used in the pricing table.
       * No checkbox/selection is required.
       */
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
   * --------------------------------------------------------------------------
   * Initial Category Loading
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    fetchCategories();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * Keep Ingredient Quantity Matrix In Sync
   * --------------------------------------------------------------------------
   *
   * Whenever ingredients or variants change, make sure every combination
   * has a quantity field.
   *
   * This means:
   *
   * Ingredient 1 + Variant 6
   * Ingredient 1 + Variant 9
   * Ingredient 2 + Variant 6
   * Ingredient 2 + Variant 9
   *
   * etc.
   */
  useEffect(() => {
    setIngredientQuantities((previous) => {
      const updated: Record<number, Record<number, string>> = {};

      ingredientList.forEach((ingredient) => {
        updated[ingredient.id] = {};

        selectedVariantIds.forEach((variantId) => {
          updated[ingredient.id][variantId] =
            previous[ingredient.id]?.[variantId] || "";
        });
      });

      return updated;
    });
  }, [ingredientList, selectedVariantIds]);

  /*
   * --------------------------------------------------------------------------
   * Category Change
   * --------------------------------------------------------------------------
   */
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setCategoryId(value);

    /*
     * Reset dependent fields.
     */
    setMenuItemId("");
    setSelectedVariantIds([]);
    setVariantPrices([]);
    setMenuItems([]);
    setVariants([]);
    setIngredientList([]);
    setIngredientQuantities({});
    setShowVariants(false);

    if (value) {
      fetchMenuItems(value);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * Menu Item Change
   * --------------------------------------------------------------------------
   *
   * As soon as the submenu/menu item is selected:
   *
   * 1. Fetch variants
   * 2. Fetch ALL allocated ingredients
   *
   * Both requests run immediately.
   */
  const handleMenuItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setMenuItemId(value);

    /*
     * Reset dependent fields.
     */
    setSelectedVariantIds([]);
    setVariantPrices([]);
    setVariants([]);
    setIngredientList([]);
    setIngredientQuantities({});
    setShowVariants(false);

    if (value) {
      /*
       * Fetch both independently.
       * They can run at the same time.
       */
      fetchVariants(value);
      fetchIngredients(value);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * Variant Selection
   * --------------------------------------------------------------------------
   */
  const handleVariantChange = (variantId: number) => {
    setSelectedVariantIds((previous) => {
      const exists = previous.includes(variantId);

      if (exists) {
        /*
         * Remove variant price.
         */
        setVariantPrices((prices) =>
          prices.filter((item) => item.variantId !== variantId),
        );

        return previous.filter((id) => id !== variantId);
      }

      /*
       * Add variant with empty sell price.
       */
      setVariantPrices((prices) => [
        ...prices,
        {
          variantId,
          price: "",
        },
      ]);

      return [...previous, variantId];
    });
  };

  /*
   * --------------------------------------------------------------------------
   * Select / Unselect All Variants
   * --------------------------------------------------------------------------
   */
  const handleSelectAllVariants = () => {
    /*
     * If everything is already selected,
     * remove everything.
     */
    if (selectedVariantIds.length === variants.length && variants.length > 0) {
      setSelectedVariantIds([]);
      setVariantPrices([]);
      return;
    }

    /*
     * Select all variants.
     */
    const allIds = variants.map((variant) => variant.id);

    setSelectedVariantIds(allIds);

    setVariantPrices(
      allIds.map((variantId) => ({
        variantId,
        price: "",
      })),
    );
  };

  /*
   * --------------------------------------------------------------------------
   * Quantity Change
   * --------------------------------------------------------------------------
   */
  const handleQuantityChange = (
    ingredientId: number,
    variantId: number,
    quantity: string,
  ) => {
    /*
     * Allow:
     *
     * 10
     * 10.
     * 10.5
     * empty string
     */
    if (quantity !== "" && !/^\d*\.?\d*$/.test(quantity)) {
      return;
    }

    setIngredientQuantities((previous) => ({
      ...previous,

      [ingredientId]: {
        ...(previous[ingredientId] || {}),
        [variantId]: quantity,
      },
    }));
  };

  /*
   * --------------------------------------------------------------------------
   * Get Quantity
   * --------------------------------------------------------------------------
   */
  const getIngredientQuantity = (ingredientId: number, variantId: number) => {
    return ingredientQuantities[ingredientId]?.[variantId] || "";
  };

  /*
   * --------------------------------------------------------------------------
   * sell Price Change
   * --------------------------------------------------------------------------
   */
  const handlePriceChange = (variantId: number, price: string) => {
    if (price !== "" && !/^\d*\.?\d*$/.test(price)) {
      return;
    }

    setVariantPrices((previous) =>
      previous.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              price,
            }
          : item,
      ),
    );
  };

  /*
   * --------------------------------------------------------------------------
   * Get Ingredient Cost
   * --------------------------------------------------------------------------
   */
  const getIngredientCost = (ingredientId: number, quantity: string) => {
    const ingredient = ingredientList.find((item) => item.id === ingredientId);

    if (!ingredient || !quantity) {
      return 0;
    }

    return Number(ingredient.cost_per_unit) * Number(quantity);
  };

  /*
   * --------------------------------------------------------------------------
   * Calculate Total Cost For One Variant
   * --------------------------------------------------------------------------
   *
   * IMPORTANT:
   * Now we loop through ALL allocated ingredients.
   */
  const getVariantTotalCost = (variantId: number) => {
    return ingredientList.reduce((total, ingredient) => {
      const quantity = getIngredientQuantity(ingredient.id, variantId);

      return total + getIngredientCost(ingredient.id, quantity);
    }, 0);
  };

  /*
   * --------------------------------------------------------------------------
   * Variant sell Price
   * --------------------------------------------------------------------------
   */
  const getVariantPrice = (variantId: number) => {
    return (
      variantPrices.find((item) => item.variantId === variantId)?.price || ""
    );
  };

  /*
   * --------------------------------------------------------------------------
   * Variant Profit
   * --------------------------------------------------------------------------
   */
  const getVariantProfit = (variantId: number) => {
    const cost = getVariantTotalCost(variantId);
    const price = Number(getVariantPrice(variantId));

    if (!price) {
      return 0;
    }

    return price - cost;
  };

  /*
   * --------------------------------------------------------------------------
   * Submit
   * --------------------------------------------------------------------------
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    /*
     * Category validation
     */
    if (!categoryId) {
      Swal.fire({
        icon: "warning",
        title: "Category Required",
        text: "Please choose a category.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    /*
     * Menu item validation
     */
    if (!menuItemId) {
      Swal.fire({
        icon: "warning",
        title: "Menu Item Required",
        text: "Please choose a menu item.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    /*
     * Variant validation
     */
    if (selectedVariantIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Variant Required",
        text: "Please select at least one variant.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    /*
     * ------------------------------------------------------------------------
     * Ingredient validation
     * ------------------------------------------------------------------------
     *
     * Ingredients are no longer selected manually.
     *
     * They are automatically loaded from the submenu.
     */
    if (ingredientList.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Ingredients Found",
        text: "No ingredients are allocated to this submenu.",
        confirmButtonColor: "#7d1119",
      });
      return;
    }

    /*
     * ------------------------------------------------------------------------
     * Validate Quantities
     * ------------------------------------------------------------------------
     *
     * Every allocated ingredient must have a quantity
     * for every selected variant.
     */
    for (const ingredient of ingredientList) {
      for (const variantId of selectedVariantIds) {
        const quantity = getIngredientQuantity(ingredient.id, variantId);

        if (!quantity || Number(quantity) <= 0) {
          const variant = variants.find((item) => item.id === variantId);

          Swal.fire({
            icon: "warning",
            title: "Quantity Required",
            text: `Please enter a valid quantity for ${ingredient.ingredient_name} under variant ${
              variant?.variant_name || variantId
            }.`,
            confirmButtonColor: "#7d1119",
          });

          return;
        }
      }
    }

    /*
     * ------------------------------------------------------------------------
     * Validate Prices
     * ------------------------------------------------------------------------
     */
    for (const variantId of selectedVariantIds) {
      const price = getVariantPrice(variantId);

      if (!price || Number(price) <= 0) {
        const variant = variants.find((item) => item.id === variantId);

        Swal.fire({
          icon: "warning",
          title: "Sell Price Required",
          text: `Please enter a valid sell price for ${
            variant?.variant_name || "variant"
          }.`,
          confirmButtonColor: "#7d1119",
        });

        return;
      }
    }

    try {
      setSubmitting(true);

      /*
       * ----------------------------------------------------------------------
       * Prepare Variant Data
       * ----------------------------------------------------------------------
       *
       * Every variant receives ALL allocated ingredients.
       */
      const variantData = selectedVariantIds.map((variantId) => {
        const variant = variants.find((item) => item.id === variantId);

        return {
          variant_id: variantId,

          variant_name: variant?.variant_name || "",

          buy_cost: Number(getVariantTotalCost(variantId).toFixed(2)),

          sell_price: Number(getVariantPrice(variantId)),

          profit: Number(getVariantProfit(variantId).toFixed(2)),

          /*
           * ALL allocated ingredients.
           */
          ingredients: ingredientList.map((ingredient) => {
            const quantity = Number(
              getIngredientQuantity(ingredient.id, variantId),
            );

            const cost = Number(
              getIngredientCost(
                ingredient.id,
                getIngredientQuantity(ingredient.id, variantId),
              ).toFixed(2),
            );

            return {
              ingredient_id: ingredient.id,

              ingredient_name: ingredient.ingredient_name,

              unit_id: ingredient.unit_id || null,

              unit_name: ingredient.unit_name || "",

              quantity,

              cost_per_unit: Number(ingredient.cost_per_unit || 0),

              cost,
            };
          }),
        };
      });

      /*
       * ----------------------------------------------------------------------
       * Combined Total Cost
       * ----------------------------------------------------------------------
       */
      const totalCost = selectedVariantIds.reduce(
        (total, variantId) => total + getVariantTotalCost(variantId),
        0,
      );

      /*
       * ----------------------------------------------------------------------
       * API Request
       * ----------------------------------------------------------------------
       */
      const response = await fetch(`${API_BASE_URL}/api/menu-varient`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(
          variantData.map((item) => ({
            menu_subcategory_id: Number(menuItemId),
            variant_id: item.variant_id,
            price: item.sell_price,
            profit: item.profit, // Pass the calculated profit value
            ingredients: item.ingredients.map((ing) => ({
              ingredient_id: ing.ingredient_id,
              quantity: ing.quantity,
            })),
          })),
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create menu variant.");
      }

      /*
       * Success message
       */
      Swal.fire({
        icon: "success",
        title: "Created Successfully",
        text: "Menu variant has been created successfully.",
        confirmButtonColor: "#7d1119",
      });

      /*
       * ----------------------------------------------------------------------
       * Reset Form
       * ----------------------------------------------------------------------
       */
      setCategoryId("");
      setMenuItemId("");
      setSelectedVariantIds([]);
      setVariantPrices([]);
      setMenuItems([]);
      setVariants([]);
      setIngredientList([]);
      setIngredientQuantities({});
      setShowVariants(false);
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

  /*
   * --------------------------------------------------------------------------
   * Selected Variant Objects
   * --------------------------------------------------------------------------
   */
  const selectedVariantObjects = useMemo(() => {
    return variants.filter((variant) =>
      selectedVariantIds.includes(variant.id),
    );
  }, [variants, selectedVariantIds]);

  return (
    <div className="min-h-screen bg-[var(--surface-dark)] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* Page Header */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Create Menu Variant
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create menu variants with allocated ingredients, quantity, cost,
            selling price and profit.
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
            </div>

            {/* Allocated Ingredient Loading Status */}

            {menuItemId && loadingIngredients && (
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading allocated ingredients...
              </div>
            )}

            {/* Multiple Variants */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Variants
                <span className="ml-1 text-[var(--danger)]">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowVariants(!showVariants)}
                disabled={!menuItemId || loadingVariants || submitting}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
              >
                <span>
                  {loadingVariants
                    ? "Loading variants..."
                    : selectedVariantIds.length === 0
                      ? !menuItemId
                        ? "Choose menu item first"
                        : "Choose variants"
                      : `${selectedVariantIds.length} variant${
                          selectedVariantIds.length > 1 ? "s" : ""
                        } selected`}
                </span>

                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showVariants ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showVariants && (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  {/* Select All */}

                  {variants.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-grey)] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedVariantIds.length === variants.length &&
                          variants.length > 0
                        }
                        onChange={handleSelectAllVariants}
                        disabled={submitting}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />

                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Select All
                      </span>
                    </label>
                  )}

                  {variants.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      No variants found for this menu item.
                    </div>
                  ) : (
                    variants.map((variant) => {
                      const selected = selectedVariantIds.includes(variant.id);

                      return (
                        <label
                          key={variant.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--surface-grey)]"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleVariantChange(variant.id)}
                            disabled={submitting}
                            className="h-4 w-4 accent-[var(--primary)]"
                          />

                          <span className="text-sm text-[var(--text-primary)]">
                            {variant.variant_name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ================================================================
                Excel-Style Pricing Table

                IMPORTANT:
                No ingredient dropdown exists anymore.

                ingredientList already contains ALL ingredients allocated
                to the selected submenu.
               ================================================================ */}

            {ingredientList.length > 0 && selectedVariantObjects.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="bg-[var(--surface-grey)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Ingredient Cost & Variant Pricing
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    All ingredients allocated to this submenu are shown
                    automatically.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-max w-full border-collapse text-sm">
                    {/* Header */}

                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                        {/* Ingredient */}

                        <th
                          rowSpan={2}
                          className="sticky left-0 z-20 min-w-[160px] border-r border-[var(--border)] px-4 py-3 text-left font-semibold text-[var(--text-primary)]"
                        >
                          Ingredient
                        </th>

                        {/* Variants */}

                        {selectedVariantObjects.map((variant) => (
                          <th
                            key={variant.id}
                            colSpan={2}
                            className="border-r border-[var(--border)] px-4 py-3 text-center font-semibold text-[var(--text-primary)]"
                          >
                            {variant.variant_name}
                          </th>
                        ))}
                      </tr>

                      <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <th className="min-w-[110px] border-r border-[var(--border)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                              Qty
                            </th>

                            <th className="min-w-[120px] border-r border-[var(--border)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                              Cost
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    {/* Body */}

                    <tbody>
                      {/* =====================================================
                            ALL ALLOCATED INGREDIENTS
                           ===================================================== */}

                      {ingredientList.map((ingredient) => (
                        <tr
                          key={ingredient.id}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          {/* Ingredient Name */}

                          <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {ingredient.ingredient_name}
                              </p>

                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                ৳ {Number(ingredient.cost_per_unit).toFixed(2)}/
                                {ingredient.unit_name}
                              </p>
                            </div>
                          </td>

                          {/* Variant Columns */}

                          {selectedVariantObjects.map((variant) => {
                            const quantity = getIngredientQuantity(
                              ingredient.id,
                              variant.id,
                            );

                            const cost = getIngredientCost(
                              ingredient.id,
                              quantity,
                            );

                            return (
                              <React.Fragment key={variant.id}>
                                {/* Quantity */}

                                <td className="border-r border-[var(--border)] px-3 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        ingredient.id,
                                        variant.id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0"
                                    disabled={submitting}
                                    className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                  />
                                </td>

                                {/* Cost */}

                                <td className="border-r border-[var(--border)] px-3 py-3 text-right">
                                  <span className="font-medium text-[var(--text-primary)]">
                                    ৳ {cost.toFixed(2)}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Buy Cost */}

                      <tr className="bg-[var(--surface-grey)]">
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                          Buy Cost
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-3 py-3"></td>

                            <td className="border-r border-[var(--border)] px-3 py-3 text-right font-semibold text-[var(--text-primary)]">
                              ৳ {getVariantTotalCost(variant.id).toFixed(2)}
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>

                      {/* sell Price */}

                      <tr className="bg-[var(--surface-grey)]">
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                          Sell Price
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-3 py-3"></td>

                            <td className="border-r border-[var(--border)] px-3 py-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
                                  ৳
                                </span>

                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={getVariantPrice(variant.id)}
                                  onChange={(e) =>
                                    handlePriceChange(
                                      variant.id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  disabled={submitting}
                                  className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-7 pr-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                              </div>
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>

                      {/* Profit */}

                      <tr className="bg-[var(--surface-grey)]">
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                          Profit
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-3 py-3"></td>

                            <td className="border-r border-[var(--border)] px-3 py-3 text-right font-semibold text-[var(--text-primary)]">
                              ৳ {getVariantProfit(variant.id).toFixed(2)}
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
