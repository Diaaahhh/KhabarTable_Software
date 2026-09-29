"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";

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

interface StatusMessage {
  type: "success" | "error" | "warning";
  title: string;
  text: string;
}

const NO_VARIANT_ID = 0;

const CreateMenuVariant = () => {
  const [categoryId, setCategoryId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");

  /* ------------------------------------------------------------------------
     Selected Variants
     ------------------------------------------------------------------------ */
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);

  /* ------------------------------------------------------------------------
     Sell Price Per Variant
     ------------------------------------------------------------------------ */
  const [variantPrices, setVariantPrices] = useState<VariantPrice[]>([]);

  /* ------------------------------------------------------------------------
     Data
     ------------------------------------------------------------------------ */
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  /* ------------------------------------------------------------------------
     IMPORTANT:
     ingredientList now contains ALL ingredients allocated to
     the selected submenu/menu item.
     ------------------------------------------------------------------------ */
  const [ingredientList, setIngredientList] = useState<Ingredient[]>([]);

  /* ------------------------------------------------------------------------
     Ingredient Quantities
     ------------------------------------------------------------------------ */
  const [ingredientQuantities, setIngredientQuantities] = useState<
    Record<number, Record<number, string>>
  >({});

  const [showVariants, setShowVariants] = useState(false);

  /* ------------------------------------------------------------------------
     Loading States
     ------------------------------------------------------------------------ */
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ------------------------------------------------------------------------
     Inline Status Message
     ------------------------------------------------------------------------ */
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null,
  );

  const showStatus = (
    type: StatusMessage["type"],
    title: string,
    text: string,
  ) => {
    setStatusMessage({ type, title, text });
  };

  const clearStatus = () => {
    setStatusMessage(null);
  };

  /* ------------------------------------------------------------------------
     Auto-dismiss status
     ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  /* ------------------------------------------------------------------------
     Fetch Categories
     ------------------------------------------------------------------------ */
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

      showStatus(
        "error",
        "Failed to load categories",
        error instanceof Error ? error.message : "Unable to load categories.",
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  /* ------------------------------------------------------------------------
     Fetch Menu Items According To Category
     ------------------------------------------------------------------------ */
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

      showStatus(
        "error",
        "Failed to load menu items",
        error instanceof Error ? error.message : "Unable to load menu items.",
      );
    } finally {
      setLoadingMenuItems(false);
    }
  };

  /* ------------------------------------------------------------------------
     Fetch Variants According To Menu Item and Category
     ------------------------------------------------------------------------ */
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

      showStatus(
        "error",
        "Failed to load variants",
        error instanceof Error ? error.message : "Unable to load variants.",
      );
    } finally {
      setLoadingVariants(false);
    }
  };

  /* ------------------------------------------------------------------------
     Fetch ALL Allocated Ingredients According To Menu Item
     ------------------------------------------------------------------------ */
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

      showStatus(
        "error",
        "Failed to load ingredients",
        error instanceof Error
          ? error.message
          : "Unable to load ingredients.",
      );
    } finally {
      setLoadingIngredients(false);
    }
  };

  /* ------------------------------------------------------------------------
     Initial Category Loading
     ------------------------------------------------------------------------ */
  useEffect(() => {
    fetchCategories();
  }, []);

  /* ------------------------------------------------------------------------
     Keep Ingredient Quantity Matrix In Sync
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     Category Change
     ------------------------------------------------------------------------ */
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setCategoryId(value);

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

  /* ------------------------------------------------------------------------
     Menu Item Change
     ------------------------------------------------------------------------ */
  const handleMenuItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setMenuItemId(value);

    setSelectedVariantIds([]);
    setVariantPrices([]);
    setVariants([]);
    setIngredientList([]);
    setIngredientQuantities({});
    setShowVariants(false);

    if (value) {
      fetchVariants(value);
      fetchIngredients(value);
    }
  };

  /* ------------------------------------------------------------------------
     Variant Selection
     ------------------------------------------------------------------------ */
  const handleVariantChange = (variantId: number) => {
    if (variantId === NO_VARIANT_ID) {
      setSelectedVariantIds((previous) => {
        const exists = previous.includes(NO_VARIANT_ID);

        if (exists) {
          setVariantPrices((prices) =>
            prices.filter((item) => item.variantId !== NO_VARIANT_ID),
          );

          return previous.filter((id) => id !== NO_VARIANT_ID);
        }

        setVariantPrices([
          {
            variantId: NO_VARIANT_ID,
            price: "",
          },
        ]);

        return [NO_VARIANT_ID];
      });

      return;
    }

    setSelectedVariantIds((previous) => {
      const exists = previous.includes(variantId);

      if (exists) {
        setVariantPrices((prices) =>
          prices.filter((item) => item.variantId !== variantId),
        );

        return previous.filter((id) => id !== variantId);
      }

      const nextIds = previous.filter((id) => id !== NO_VARIANT_ID);

      setVariantPrices((prices) => [
        ...prices.filter((item) => item.variantId !== NO_VARIANT_ID),
        ...(!nextIds.includes(variantId)
          ? [
              {
                variantId,
                price: "",
              },
            ]
          : []),
      ]);

      return [...nextIds, variantId];
    });
  };

  /* ------------------------------------------------------------------------
     Select / Unselect All Variants
     ------------------------------------------------------------------------ */
  const handleSelectAllVariants = () => {
    if (selectedVariantIds.length === variants.length && variants.length > 0) {
      setSelectedVariantIds([]);
      setVariantPrices([]);
      return;
    }

    const allIds = variants.map((variant) => variant.id);

    setSelectedVariantIds(allIds);

    setVariantPrices(
      allIds.map((variantId) => ({
        variantId,
        price: "",
      })),
    );
  };

  /* ------------------------------------------------------------------------
     Quantity Change
     ------------------------------------------------------------------------ */
  const handleQuantityChange = (
    ingredientId: number,
    variantId: number,
    quantity: string,
  ) => {
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

  /* ------------------------------------------------------------------------
     Get Quantity
     ------------------------------------------------------------------------ */
  const getIngredientQuantity = (ingredientId: number, variantId: number) => {
    return ingredientQuantities[ingredientId]?.[variantId] || "";
  };

  /* ------------------------------------------------------------------------
     Sell Price Change
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     Get Ingredient Cost
     ------------------------------------------------------------------------ */
  const getIngredientCost = (ingredientId: number, quantity: string) => {
    const ingredient = ingredientList.find((item) => item.id === ingredientId);

    if (!ingredient || !quantity) {
      return 0;
    }

    return Number(ingredient.cost_per_unit) * Number(quantity);
  };

  /* ------------------------------------------------------------------------
     Calculate Total Cost For One Variant
     ------------------------------------------------------------------------ */
  const getVariantTotalCost = (variantId: number) => {
    return ingredientList.reduce((total, ingredient) => {
      const quantity = getIngredientQuantity(ingredient.id, variantId);

      return total + getIngredientCost(ingredient.id, quantity);
    }, 0);
  };

  /* ------------------------------------------------------------------------
     Variant Sell Price
     ------------------------------------------------------------------------ */
  const getVariantPrice = (variantId: number) => {
    return (
      variantPrices.find((item) => item.variantId === variantId)?.price || ""
    );
  };

  /* ------------------------------------------------------------------------
     Variant Profit
     ------------------------------------------------------------------------ */
  const getVariantProfit = (variantId: number) => {
    const cost = getVariantTotalCost(variantId);
    const price = Number(getVariantPrice(variantId));

    if (!price) {
      return 0;
    }

    return price - cost;
  };

  /* ------------------------------------------------------------------------
     Submit
     ------------------------------------------------------------------------ */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    clearStatus();

    if (!categoryId) {
      showStatus(
        "warning",
        "Category Required",
        "Please choose a category.",
      );

      return;
    }

    if (!menuItemId) {
      showStatus(
        "warning",
        "Menu Item Required",
        "Please choose a menu item.",
      );

      return;
    }

    if (selectedVariantIds.length === 0) {
      showStatus(
        "warning",
        "Variant Required",
        "Please select at least one variant.",
      );

      return;
    }

    if (ingredientList.length === 0) {
      showStatus(
        "warning",
        "No Ingredients Found",
        "No ingredients are allocated to this submenu.",
      );

      return;
    }

    for (const ingredient of ingredientList) {
      for (const variantId of selectedVariantIds) {
        const quantity = getIngredientQuantity(ingredient.id, variantId);

        if (!quantity || Number(quantity) <= 0) {
          const variant = variants.find((item) => item.id === variantId);

          const variantName =
            variantId === NO_VARIANT_ID
              ? "No Variant"
              : variant?.variant_name || variantId;

          showStatus(
            "warning",
            "Quantity Required",
            `Please enter a valid quantity for ${ingredient.ingredient_name} under variant ${variantName}.`,
          );

          return;
        }
      }
    }

    for (const variantId of selectedVariantIds) {
      const price = getVariantPrice(variantId);

      if (!price || Number(price) <= 0) {
        const variant = variants.find((item) => item.id === variantId);

        const variantName =
          variantId === NO_VARIANT_ID
            ? "No Variant"
            : variant?.variant_name || "variant";

        showStatus(
          "warning",
          "Sell Price Required",
          `Please enter a valid sell price for ${variantName}.`,
        );

        return;
      }
    }

    try {
      setSubmitting(true);

      const variantData = selectedVariantIds.map((variantId) => {
        const variant = variants.find((item) => item.id === variantId);

        return {
          variant_id: variantId === NO_VARIANT_ID ? null : variantId,

          variant_name:
            variantId === NO_VARIANT_ID
              ? "No Variant"
              : variant?.variant_name || "",

          buy_cost: Number(getVariantTotalCost(variantId).toFixed(2)),

          sell_price: Number(getVariantPrice(variantId)),

          profit: Number(getVariantProfit(variantId).toFixed(2)),

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
            profit: item.profit,
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

      showStatus(
        "success",
        "Created Successfully",
        "Menu variant has been created successfully.",
      );

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

      showStatus(
        "error",
        "Creation Failed",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------------
     Selected Variant Objects
     ------------------------------------------------------------------------ */
  const selectedVariantObjects = useMemo(() => {
    if (selectedVariantIds.includes(NO_VARIANT_ID)) {
      return [
        {
          id: NO_VARIANT_ID,
          variant_name: "No Variant",
        },
      ];
    }

    return variants.filter((variant) =>
      selectedVariantIds.includes(variant.id),
    );
  }, [variants, selectedVariantIds]);

  /* ------------------------------------------------------------------------
     Status styles
     ------------------------------------------------------------------------ */
  const statusStyles: Record<StatusMessage["type"], string> = {
    success:
      "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    error:
      "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
    warning:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  };

  const StatusIcon = ({ type }: { type: StatusMessage["type"] }) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

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

        {/* Inline Status Message */}
        {statusMessage && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${statusStyles[statusMessage.type]}`}
          >
            <span className="mt-0.5 shrink-0">
              <StatusIcon type={statusMessage.type} />
            </span>

            <div className="flex-1">
              <p className="font-semibold">{statusMessage.title}</p>
              <p className="mt-0.5">{statusMessage.text}</p>
            </div>

            <button
              type="button"
              onClick={clearStatus}
              className="shrink-0 rounded p-0.5 transition hover:bg-black/10"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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

            {/* =========================================================
                Multiple Variants
               ========================================================= */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Variants
                <span className="ml-1 text-xs text-[var(--text-muted)]">
                  (optional)
                </span>
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
                      : selectedVariantIds.includes(NO_VARIANT_ID)
                        ? "No Variant selected"
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
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  {variants.length > 0 && (
                    <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedVariantIds.length === variants.length &&
                          variants.length > 0 &&
                          !selectedVariantIds.includes(NO_VARIANT_ID)
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

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {(() => {
                      const selected = selectedVariantIds.includes(
                        NO_VARIANT_ID,
                      );

                      return (
                        <button
                          key="no-variant"
                          type="button"
                          onClick={() => handleVariantChange(NO_VARIANT_ID)}
                          disabled={submitting}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-grey)]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span className="truncate font-medium">
                            No Variant
                          </span>

                          {selected && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      );
                    })()}

                    {variants.map((variant) => {
                      const selected = selectedVariantIds.includes(variant.id);

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleVariantChange(variant.id)}
                          disabled={submitting}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-grey)]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span className="truncate font-medium">
                            {variant.variant_name}
                          </span>

                          {selected && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {variants.length === 0 && (
                    <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                      No variants found for this menu item. You can still
                      create a "No Variant" entry.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* =========================================================
                Excel-Style Pricing Table
               ========================================================= */}
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
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                        <th
                          rowSpan={2}
                          className="sticky left-0 z-20 w-[180px] border-r border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--text-primary)]"
                        >
                          Ingredient
                        </th>

                        {selectedVariantObjects.map((variant) => (
                          <th
                            key={variant.id}
                            colSpan={2}
                            className="border-r border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--text-primary)]"
                          >
                            {variant.variant_name}
                          </th>
                        ))}
                      </tr>

                      <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <th className="w-[90px] border-r border-[var(--border)] px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                              Qty
                            </th>

                            <th className="w-[100px] border-r border-[var(--border)] px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                              Cost
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {ingredientList.map((ingredient) => (
                        <tr
                          key={ingredient.id}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-2">
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
                                <td className="border-r border-[var(--border)] px-2 py-2">
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
                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-center text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                  />
                                </td>

                                <td className="border-r border-[var(--border)] px-2 py-2 text-right">
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
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 font-semibold text-[var(--text-primary)]">
                          Buy Cost
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-2 py-2"></td>

                            <td className="border-r border-[var(--border)] px-2 py-2 text-right font-semibold text-[var(--text-primary)]">
                              ৳ {getVariantTotalCost(variant.id).toFixed(2)}
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>

                      {/* Sell Price */}
                      <tr className="bg-[var(--surface-grey)]">
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 font-semibold text-[var(--text-primary)]">
                          Sell Price
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-2 py-2"></td>

                            <td className="border-r border-[var(--border)] px-2 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
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
                                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-6 pr-2 text-center text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                />
                              </div>
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>

                      {/* Profit */}
                      <tr className="bg-[var(--surface-grey)]">
                        <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-grey)] px-3 py-2 font-semibold text-[var(--text-primary)]">
                          Profit
                        </td>

                        {selectedVariantObjects.map((variant) => (
                          <React.Fragment key={variant.id}>
                            <td className="border-r border-[var(--border)] px-2 py-2"></td>

                            <td className="border-r border-[var(--border)] px-2 py-2 text-right font-semibold text-[var(--text-primary)]">
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