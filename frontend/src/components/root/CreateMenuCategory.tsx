"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";
import { capitalizeWords } from "../../utils/formatText";

interface RestaurantCategory {
  id: number;
  res_category: string;
}

interface MenuCategory {
  id: number;
  category_name: string;
  Restaurant_category_id: number;
}

interface StatusMessage {
  type: "success" | "error" | "warning";
  title: string;
  text: string;
}

const CreateMenuCategory = () => {
  const [restaurantType, setRestaurantType] = useState("");
  const [menuCategory, setMenuCategory] = useState("");

  const [restaurantCategories, setRestaurantCategories] = useState<
    RestaurantCategory[]
  >([]);

  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);

  const [loadingRestaurantTypes, setLoadingRestaurantTypes] = useState(true);
  const [loadingMenuCategories, setLoadingMenuCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingRestaurantType, setEditingRestaurantType] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  // Fetch restaurant types
  const fetchRestaurantCategories = async () => {
    try {
      setLoadingRestaurantTypes(true);

      const response = await fetch(
        `${API_BASE_URL}/api/registration/restaurant-categories`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch restaurant types.");
      }

      setRestaurantCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching restaurant types:", error);

      setRestaurantCategories([]);

      showStatus(
        "error",
        "Failed to load restaurant types",
        "Unable to load restaurant types from the server.",
      );
    } finally {
      setLoadingRestaurantTypes(false);
    }
  };

  // Fetch all menu categories
  const fetchMenuCategories = async () => {
    try {
      setLoadingMenuCategories(true);

      const response = await fetch(`${API_BASE_URL}/api/menu-categories`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch menu categories.");
      }

      setMenuCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching menu categories:", error);

      setMenuCategories([]);

      showStatus(
        "error",
        "Failed to load menu categories",
        "Unable to load menu categories from the server.",
      );
    } finally {
      setLoadingMenuCategories(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchRestaurantCategories();
    fetchMenuCategories();
  }, []);

  // Auto-dismiss status message
  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Submit form
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    clearStatus();

    if (!restaurantType) {
      showStatus(
        "warning",
        "Restaurant Type Required",
        "Please select a restaurant type.",
      );

      return;
    }

    if (!menuCategory.trim()) {
      showStatus(
        "warning",
        "Menu Category Required",
        "Please enter a menu category.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/api/menu-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_name: capitalizeWords(menuCategory.trim()),
          Restaurant_category_id: Number(restaurantType),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create menu category.");
      }

      showStatus(
        "success",
        "Menu Category Created",
        "The menu category has been created successfully.",
      );

      // Clear form
      setRestaurantType("");
      setMenuCategory("");

      // Refresh table
      fetchMenuCategories();
    } catch (error) {
      console.error("Error creating menu category:", error);

      showStatus(
        "error",
        "Creation Failed",
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the menu category.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: MenuCategory) => {
    clearStatus();
    setEditingId(category.id);
    setEditingCategoryName(category.category_name);
    setEditingRestaurantType(String(category.Restaurant_category_id));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCategoryName("");
    setEditingRestaurantType("");
  };

  const handleSaveEdit = async (id: number) => {
    clearStatus();

    if (!editingRestaurantType) {
      showStatus(
        "warning",
        "Restaurant Type Required",
        "Please select a restaurant type.",
      );

      return;
    }

    if (!editingCategoryName.trim()) {
      showStatus(
        "warning",
        "Menu Category Required",
        "Please enter a menu category.",
      );

      return;
    }

    try {
      setSavingEdit(true);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-categories/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category_name: capitalizeWords(editingCategoryName.trim()),
            Restaurant_category_id: Number(editingRestaurantType),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update menu category.");
      }

      showStatus(
        "success",
        "Updated Successfully",
        "The menu category has been updated successfully.",
      );

      handleCancelEdit();

      await fetchMenuCategories();
    } catch (error) {
      console.error("Error updating menu category:", error);

      showStatus(
        "error",
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the menu category.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (category: MenuCategory) => {
    clearStatus();

    // Simple inline confirmation using window.confirm
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.category_name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(category.id);

      const response = await fetch(
        `${API_BASE_URL}/api/menu-categories/${category.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete menu category.");
      }

      showStatus(
        "success",
        "Deleted Successfully",
        "The menu category has been deleted.",
      );

      await fetchMenuCategories();
    } catch (error) {
      console.error("Error deleting menu category:", error);

      showStatus(
        "error",
        "Delete Failed",
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the menu category.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const statusStyles: Record<StatusMessage["type"], string> = {
    success:
      "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    error:
      "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
    warning:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  };

  const StatusIcon = ({ type }: { type: StatusMessage["type"] }) => {
    if (type === "success") return <CheckCircle2 className="h-5 w-5" />;
    if (type === "warning") return <AlertCircle className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-dark)] p-4 md:p-6">
      {" "}
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}{" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Create Menu Category{" "}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create a menu category for a restaurant type.
          </p>
        </div>
        {/* Status Message */}
        {statusMessage && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${statusStyles[statusMessage.type]}`}
          >
            <StatusIcon type={statusMessage.type} />
            <div className="flex-1">
              <p className="font-semibold">{statusMessage.title}</p>
              <p className="mt-0.5">{statusMessage.text}</p>
            </div>
            <button
              type="button"
              onClick={clearStatus}
              className="rounded-md p-1 transition hover:bg-black/10"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Form Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Restaurant Type */}
              <div>
                <label
                  htmlFor="restaurantType"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Restaurant Type
                  <span className="ml-1 text-[var(--danger)]">*</span>
                </label>

                <select
                  id="restaurantType"
                  value={restaurantType}
                  onChange={(e) => setRestaurantType(e.target.value)}
                  disabled={loadingRestaurantTypes || submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                >
                  <option value="">
                    {loadingRestaurantTypes
                      ? "Loading restaurant types..."
                      : "Select restaurant type"}
                  </option>

                  {restaurantCategories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.res_category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Menu Category */}
              <div>
                <label
                  htmlFor="menuCategory"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Menu Category
                  <span className="ml-1 text-[var(--danger)]">*</span>
                </label>

                <input
                  id="menuCategory"
                  type="text"
                  value={menuCategory}
                  onChange={(e) => setMenuCategory(e.target.value)}
                  onBlur={(e) => setMenuCategory(capitalizeWords(e.target.value))}
                  placeholder="Enter menu category"
                  disabled={submitting}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-grey)]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitting || loadingRestaurantTypes}
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
                    Create Category
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        {/* Table Card */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Menu Categories
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                All menu categories available in the system.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchMenuCategories}
              disabled={loadingMenuCategories}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingMenuCategories ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-grey)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    #
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Menu Category
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Restaurant Type
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Restaurant Type ID
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loadingMenuCategories ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading menu categories...
                      </div>
                    </td>
                  </tr>
                ) : menuCategories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-[var(--text-muted)]"
                    >
                      No menu categories found.
                    </td>
                  </tr>
                ) : (
                  menuCategories.map((category, index) => {
                    const restaurantCategory = restaurantCategories.find(
                      (restaurant) =>
                        restaurant.id === category.Restaurant_category_id,
                    );

                    const isEditing = editingId === category.id;
                    const isDeleting = deletingId === category.id;

                    return (
                      <tr
                        key={category.id}
                        className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-grey)]"
                      >
                        {/* Serial Number */}
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {index + 1}
                        </td>

                        {/* Menu Category */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) =>
                                setEditingCategoryName(e.target.value)
                              }
                              onBlur={(e) =>
                                setEditingCategoryName(
                                  capitalizeWords(e.target.value),
                                )
                              }
                              disabled={savingEdit}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {category.category_name}
                            </span>
                          )}
                        </td>

                        {/* Restaurant Type */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select
                              value={editingRestaurantType}
                              onChange={(e) =>
                                setEditingRestaurantType(e.target.value)
                              }
                              disabled={savingEdit}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="">Select restaurant type</option>

                              {restaurantCategories.map((restaurant) => (
                                <option
                                  key={restaurant.id}
                                  value={String(restaurant.id)}
                                >
                                  {restaurant.res_category}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-[var(--text-secondary)]">
                              {restaurantCategory
                                ? restaurantCategory.res_category
                                : "Unknown"}
                            </span>
                          )}
                        </td>

                        {/* Restaurant Type ID */}
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {isEditing
                            ? editingRestaurantType
                            : category.Restaurant_category_id}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              {/* Save */}
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(category.id)}
                                disabled={savingEdit}
                                title="Save"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingEdit ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Save
                              </button>

                              {/* Cancel */}
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                                title="Cancel"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleEdit(category)}
                                disabled={deletingId !== null || savingEdit}
                                title="Edit"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-grey)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(category)}
                                disabled={
                                  deletingId === category.id ||
                                  editingId !== null
                                }
                                title="Delete"
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMenuCategory;