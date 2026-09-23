"use client";

import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import Swal from "sweetalert2";

import { API_BASE_URL } from "../../constants/api";

interface MenuCategory {
  id: number;
  category_name: string;
  Restaurant_category_id: number;
}

interface Ingredient {
  id: number;
  ingredient_name: string;
  unit_id: number;
  cost_per_unit: number;
}

interface SubMenu {
  id: number;
  menu_category_id: number;
  category_name: string;
  menu_name: string;
  ingredients: string;
}

const CreateSubMenu = () => {
  const [menuCategory, setMenuCategory] = useState("");
  const [menuName, setMenuName] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);

  const [menuCategories, setMenuCategories] = useState<
    MenuCategory[]
  >([]);

  const [ingredientList, setIngredientList] = useState<
    Ingredient[]
  >([]);

  const [subMenus, setSubMenus] = useState<SubMenu[]>([]);

  const [loadingData, setLoadingData] =
    useState(true);

  const [loadingSubMenus, setLoadingSubMenus] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [editingCategory, setEditingCategory] =
    useState("");

  const [editingName, setEditingName] =
    useState("");

  const [editingIngredients, setEditingIngredients] =
    useState<string[]>([]);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /**
   * ------------------------------------------------------------------------
   * Fetch Menu Categories + Ingredients
   * ------------------------------------------------------------------------
   */
  const fetchData = async () => {
    try {
      setLoadingData(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch menu data.",
        );
      }

      setMenuCategories(
        data.data?.menuCategories || [],
      );

      setIngredientList(
        data.data?.ingredients || [],
      );
    } catch (error) {
      console.error(
        "Error fetching menu data:",
        error,
      );

      setMenuCategories([]);
      setIngredientList([]);

      Swal.fire({
        icon: "error",
        title: "Failed to load menu data",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load menu categories and ingredients.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingData(false);
    }
  };

  /**
   * ------------------------------------------------------------------------
   * Fetch Sub Menus
   * ------------------------------------------------------------------------
   */
  const fetchSubMenus = async () => {
    try {
      setLoadingSubMenus(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories/list`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch sub-menus.",
        );
      }

      setSubMenus(data.data || []);
    } catch (error) {
      console.error(
        "Error fetching sub-menus:",
        error,
      );

      setSubMenus([]);

      Swal.fire({
        icon: "error",
        title: "Failed to load sub-menus",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load sub-menus.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingSubMenus(false);
    }
  };

  /**
   * ------------------------------------------------------------------------
   * Initial Data Loading
   * ------------------------------------------------------------------------
   */
  useEffect(() => {
    fetchData();
    fetchSubMenus();
  }, []);

  /**
   * ------------------------------------------------------------------------
   * Handle Ingredient Checkbox
   * ------------------------------------------------------------------------
   */
  const handleIngredientChange = (
    ingredientId: string,
  ) => {
    setIngredients((previous) => {
      if (previous.includes(ingredientId)) {
        return previous.filter(
          (id) => id !== ingredientId,
        );
      }

      return [...previous, ingredientId];
    });
  };

  /**
   * ------------------------------------------------------------------------
   * Handle Edit Ingredient Checkbox
   * ------------------------------------------------------------------------
   */
  const handleEditIngredientChange = (
    ingredientId: string,
  ) => {
    setEditingIngredients((previous) => {
      if (previous.includes(ingredientId)) {
        return previous.filter(
          (id) => id !== ingredientId,
        );
      }

      return [...previous, ingredientId];
    });
  };

  /**
   * ------------------------------------------------------------------------
   * Submit Create Form
   * ------------------------------------------------------------------------
   */
  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!menuCategory) {
      Swal.fire({
        icon: "warning",
        title: "Menu Category Required",
        text: "Please select a menu category.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    if (!menuName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Menu Name Required",
        text: "Please enter a menu name.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    if (ingredients.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Ingredients Required",
        text: "Please select at least one ingredient.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            menu_category_id:
              Number(menuCategory),
            menu_name: menuName.trim(),
            ingredients:
              ingredients.map(Number),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create menu.",
        );
      }

      Swal.fire({
        icon: "success",
        title: "Menu Created",
        text:
          "The menu has been created successfully.",
        confirmButtonColor: "#7d1119",
      });

      setMenuCategory("");
      setMenuName("");
      setIngredients([]);

      await fetchSubMenus();
    } catch (error) {
      console.error(
        "Error creating menu:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the menu.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ------------------------------------------------------------------------
   * Start Editing
   * ------------------------------------------------------------------------
   */
  const handleEdit = async (subMenu: SubMenu) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories/${subMenu.id}`,
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load sub-menu.",
        );
      }

      setEditingId(subMenu.id);

      setEditingCategory(
        String(data.data.menu_category_id),
      );

      setEditingName(
        data.data.menu_name,
      );

      setEditingIngredients(
        (data.data.ingredients || []).map(
          (id: number) => String(id),
        ),
      );
    } catch (error) {
      console.error(
        "Error loading sub-menu:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Edit Failed",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load sub-menu.",
        confirmButtonColor: "#7d1119",
      });
    }
  };

  /**
   * ------------------------------------------------------------------------
   * Cancel Edit
   * ------------------------------------------------------------------------
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCategory("");
    setEditingName("");
    setEditingIngredients([]);
  };

  /**
   * ------------------------------------------------------------------------
   * Save Edit
   * ------------------------------------------------------------------------
   */
  const handleSaveEdit = async () => {
    if (!editingId) {
      return;
    }

    if (!editingCategory) {
      Swal.fire({
        icon: "warning",
        title: "Menu Category Required",
        text: "Please select a menu category.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    if (!editingName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Menu Name Required",
        text: "Please enter a menu name.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    if (editingIngredients.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Ingredients Required",
        text: "Please select at least one ingredient.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    try {
      setSavingEdit(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories/${editingId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            menu_category_id:
              Number(editingCategory),
            menu_name: editingName.trim(),
            ingredients:
              editingIngredients.map(Number),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update sub-menu.",
        );
      }

      Swal.fire({
        icon: "success",
        title: "Updated Successfully",
        text:
          "The sub-menu has been updated successfully.",
        confirmButtonColor: "#7d1119",
      });

      handleCancelEdit();

      await fetchSubMenus();
    } catch (error) {
      console.error(
        "Error updating sub-menu:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while updating the sub-menu.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  /**
   * ------------------------------------------------------------------------
   * Delete
   * ------------------------------------------------------------------------
   */
  const handleDelete = async (
    subMenu: SubMenu,
  ) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Sub Menu?",
      text: `Are you sure you want to delete "${subMenu.menu_name}"? Its ingredient assignments will also be deleted.`,
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeletingId(subMenu.id);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-subcategories/${subMenu.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete sub-menu.",
        );
      }

      Swal.fire({
        icon: "success",
        title: "Deleted Successfully",
        text: "The sub-menu has been deleted.",
        confirmButtonColor: "#7d1119",
      });

      await fetchSubMenus();
    } catch (error) {
      console.error(
        "Error deleting sub-menu:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while deleting the sub-menu.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dark)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================================================================
            PAGE HEADER
        ================================================================= */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Create Sub Menu
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create a menu item and assign its ingredients.
          </p>
        </div>

        {/* ================================================================
            CREATE FORM
        ================================================================= */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <form onSubmit={handleSubmit}>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Menu Category */}
              <div>
                <label
                  htmlFor="menuCategory"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Menu Category
                  <span className="ml-1 text-[var(--danger)]">
                    *
                  </span>
                </label>

                <select
                  id="menuCategory"
                  value={menuCategory}
                  onChange={(e) =>
                    setMenuCategory(
                      e.target.value,
                    )
                  }
                  disabled={
                    loadingData || submitting
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                >
                  <option value="">
                    {loadingData
                      ? "Loading menu categories..."
                      : "Select menu category"}
                  </option>

                  {menuCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={String(
                          category.id,
                        )}
                      >
                        {category.category_name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Menu Name */}
              <div>
                <label
                  htmlFor="menuName"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Menu Name
                  <span className="ml-1 text-[var(--danger)]">
                    *
                  </span>
                </label>

                <input
                  id="menuName"
                  type="text"
                  value={menuName}
                  onChange={(e) =>
                    setMenuName(
                      e.target.value,
                    )
                  }
                  placeholder="Enter menu name"
                  disabled={submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Ingredients
                <span className="ml-1 text-[var(--danger)]">
                  *
                </span>
              </label>

              <div
                className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] ${
                  ingredientList.length > 5
                    ? "max-h-[190px] overflow-y-auto"
                    : ""
                }`}
              >
                {loadingData ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-[var(--text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading ingredients...
                  </div>
                ) : ingredientList.length ===
                  0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    No ingredients found.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {ingredientList.map(
                      (ingredient) => {
                        const isSelected =
                          ingredients.includes(
                            String(
                              ingredient.id,
                            ),
                          );

                        return (
                          <label
                            key={ingredient.id}
                            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--surface-grey)]"
                          >
                            <input
                              type="checkbox"
                              value={
                                ingredient.id
                              }
                              checked={
                                isSelected
                              }
                              onChange={() =>
                                handleIngredientChange(
                                  String(
                                    ingredient.id,
                                  ),
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                            />

                            <span className="text-sm text-[var(--text-primary)]">
                              {
                                ingredient.ingredient_name
                              }
                            </span>
                          </label>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Select one or more ingredients.
              </p>
            </div>

            {/* Selected Ingredients */}
            {ingredients.length > 0 && (
              <div className="mt-4 rounded-lg bg-[var(--surface-grey)] p-4">
                <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  Selected Ingredients (
                  {ingredients.length})
                </p>

                <div className="flex flex-wrap gap-2">
                  {ingredients.map(
                    (ingredientId) => {
                      const ingredient =
                        ingredientList.find(
                          (item) =>
                            item.id ===
                            Number(
                              ingredientId,
                            ),
                        );

                      return (
                        <span
                          key={ingredientId}
                          className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-medium text-white"
                        >
                          {ingredient
                            ? ingredient.ingredient_name
                            : ingredientId}
                        </span>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingData
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
                    Create Menu
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ================================================================
            SUB MENU TABLE
        ================================================================= */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">

          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Sub Menus
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                All sub menus and their ingredients.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchSubMenus}
              disabled={loadingSubMenus}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingSubMenus
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">

              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    #
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Category Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Sub Menu Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Ingredients
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {loadingSubMenus ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading sub menus...
                      </div>
                    </td>
                  </tr>
                ) : subMenus.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-[var(--text-muted)]"
                    >
                      No sub menus found.
                    </td>
                  </tr>
                ) : (
                  subMenus.map(
                    (subMenu, index) => {

                      const isEditing =
                        editingId ===
                        subMenu.id;

                      const isDeleting =
                        deletingId ===
                        subMenu.id;

                      return (
                        <tr
                          key={subMenu.id}
                          className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-grey)]"
                        >

                          {/* Number */}
                          <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                            {index + 1}
                          </td>

                          {/* Category */}
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <select
                                value={
                                  editingCategory
                                }
                                onChange={(e) =>
                                  setEditingCategory(
                                    e.target.value,
                                  )
                                }
                                disabled={
                                  savingEdit
                                }
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <option value="">
                                  Select category
                                </option>

                                {menuCategories.map(
                                  (
                                    category,
                                  ) => (
                                    <option
                                      key={
                                        category.id
                                      }
                                      value={String(
                                        category.id,
                                      )}
                                    >
                                      {
                                        category.category_name
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {
                                  subMenu.category_name
                                }
                              </span>
                            )}
                          </td>

                          {/* Sub Menu Name */}
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={
                                  editingName
                                }
                                onChange={(e) =>
                                  setEditingName(
                                    e.target.value,
                                  )
                                }
                                disabled={
                                  savingEdit
                                }
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            ) : (
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {
                                  subMenu.menu_name
                                }
                              </span>
                            )}
                          </td>

                          {/* Ingredients */}
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <div className="max-h-[180px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                                <div className="divide-y divide-[var(--border)]">
                                  {ingredientList.map(
                                    (
                                      ingredient,
                                    ) => {
                                      const selected =
                                        editingIngredients.includes(
                                          String(
                                            ingredient.id,
                                          ),
                                        );

                                      return (
                                        <label
                                          key={
                                            ingredient.id
                                          }
                                          className="flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-[var(--surface-grey)]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              selected
                                            }
                                            onChange={() =>
                                              handleEditIngredientChange(
                                                String(
                                                  ingredient.id,
                                                ),
                                              )
                                            }
                                            disabled={
                                              savingEdit
                                            }
                                            className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                                          />

                                          <span className="text-sm text-[var(--text-primary)]">
                                            {
                                              ingredient.ingredient_name
                                            }
                                          </span>
                                        </label>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {subMenu.ingredients ? (
                                  subMenu.ingredients
                                    .split(", ")
                                    .map(
                                      (
                                        ingredient,
                                      ) => (
                                        <span
                                          key={
                                            ingredient
                                          }
                                          className="rounded-full bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                                        >
                                          {
                                            ingredient
                                          }
                                        </span>
                                      ),
                                    )
                                ) : (
                                  <span className="text-sm text-[var(--text-muted)]">
                                    No ingredients
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={
                                    handleSaveEdit
                                  }
                                  disabled={
                                    savingEdit
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {savingEdit ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}

                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    handleCancelEdit
                                  }
                                  disabled={
                                    savingEdit
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <X className="h-4 w-4" />
                                  Cancel
                                </button>

                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      subMenu,
                                    )
                                  }
                                  disabled={
                                    editingId !==
                                      null ||
                                    deletingId !==
                                      null
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      subMenu,
                                    )
                                  }
                                  disabled={
                                    editingId !==
                                      null ||
                                    deletingId !==
                                      null
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}

                                  Delete
                                </button>

                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    },
                  )
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSubMenu;