"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";
import { capitalizeWords } from "../../utils/formatText";

interface Unit {
  id: number;
  unit_name: string;
}

interface Ingredient {
  id: number;
  ingredient_name: string;
  unit_id: number;
  unit_name: string;
  cost_per_unit: number;
}

interface StatusMessage {
  type: "success" | "error" | "warning";
  title: string;
  text: string;
}

const CreateIngredients = () => {
  // =========================================================
  // FORM STATES
  // =========================================================

  const [ingredientName, setIngredientName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // =========================================================
  // DATA STATES
  // =========================================================

  const [units, setUnits] = useState<Unit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // =========================================================
  // UI STATES
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // =========================================================
  // INLINE STATUS MESSAGE
  // =========================================================

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

  // =========================================================
  // AUTO DISMISS STATUS
  // =========================================================

  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  // =========================================================
  // FETCH UNITS
  // =========================================================

  const fetchUnits = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/menu-ingredients/units`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch units.");
      }

      setUnits(data.data || []);
    } catch (error) {
      console.error("Failed to fetch units:", error);

      showStatus(
        "error",
        "Failed to load units",
        error instanceof Error ? error.message : "Failed to load units.",
      );
    }
  };

  // =========================================================
  // FETCH INGREDIENTS
  // =========================================================

  const fetchIngredients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/menu-ingredients`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch ingredients.");
      }

      setIngredients(data.data || []);
    } catch (error) {
      console.error("Failed to fetch ingredients:", error);

      showStatus(
        "error",
        "Failed to load ingredients",
        error instanceof Error
          ? error.message
          : "Failed to load ingredients.",
      );
    }
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    setLoading(true);

    try {
      await Promise.all([fetchUnits(), fetchIngredients()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setIngredientName("");
    setUnitId("");
    setCostPerUnit("");
    setEditingId(null);
  };

  // =========================================================
  // CREATE / UPDATE INGREDIENT
  // =========================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    clearStatus();

    const cleanName = capitalizeWords(ingredientName.trim());
    const numericCost = Number(costPerUnit);

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!cleanName) {
      showStatus(
        "warning",
        "Ingredient Name Required",
        "Please enter an ingredient name.",
      );
      return;
    }

    if (!unitId) {
      showStatus(
        "warning",
        "Unit Required",
        "Please select a unit.",
      );
      return;
    }

    if (
      costPerUnit === "" ||
      !Number.isFinite(numericCost) ||
      numericCost < 0
    ) {
      showStatus(
        "warning",
        "Invalid Cost",
        "Please enter a valid cost.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const isEditing = editingId !== null;

      const url = isEditing
        ? `${API_BASE_URL}/api/menu-ingredients/${editingId}`
        : `${API_BASE_URL}/api/menu-ingredients`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredient_name: cleanName,
          unit_id: Number(unitId),
          cost_per_unit: Number(numericCost.toFixed(2)),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${isEditing ? "update" : "create"} ingredient.`,
        );
      }

      showStatus(
        "success",
        isEditing ? "Ingredient Updated" : "Ingredient Created",
        data.message ||
          `Ingredient ${isEditing ? "updated" : "created"} successfully.`,
      );

      resetForm();

      await fetchIngredients();
    } catch (error) {
      console.error("Ingredient submit error:", error);

      showStatus(
        "error",
        "Operation Failed",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // EDIT INGREDIENT
  // =========================================================

  const handleEdit = (ingredient: Ingredient) => {
    clearStatus();

    setEditingId(ingredient.id);

    setIngredientName(ingredient.ingredient_name);
    setUnitId(String(ingredient.unit_id));
    setCostPerUnit(Number(ingredient.cost_per_unit).toFixed(2));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // DELETE INGREDIENT
  // =========================================================

  const handleDelete = async (ingredient: Ingredient) => {
    clearStatus();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${ingredient.ingredient_name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(ingredient.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/menu-ingredients/${ingredient.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete ingredient.");
      }

      if (editingId === ingredient.id) {
        resetForm();
      }

      showStatus(
        "success",
        "Deleted",
        data.message || "Ingredient deleted successfully.",
      );

      await fetchIngredients();
    } catch (error) {
      console.error("Delete ingredient error:", error);

      showStatus(
        "error",
        "Delete Failed",
        error instanceof Error
          ? error.message
          : "Failed to delete ingredient.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredIngredients = ingredients.filter((ingredient) => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return true;

    return (
      ingredient.ingredient_name.toLowerCase().includes(search) ||
      ingredient.unit_name.toLowerCase().includes(search) ||
      String(ingredient.cost_per_unit).includes(search)
    );
  });

  // =========================================================
  // STATUS STYLES
  // =========================================================

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

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-surface-dark p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ===================================================
            INLINE STATUS MESSAGE
        =================================================== */}

        {statusMessage && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${statusStyles[statusMessage.type]}`}
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

        {/* ===================================================
            FORM CARD
        =================================================== */}

        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h1 className="text-xl font-semibold text-text-primary">
              {editingId !== null ? "Edit Ingredient" : "Create Ingredient"}
            </h1>

            <p className="mt-1 text-sm text-text-secondary">
              {editingId !== null
                ? "Update the ingredient information below."
                : "Add a new ingredient with its unit and cost."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Ingredient Name */}
              <div>
                <label
                  htmlFor="ingredientName"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Ingredient Name
                  <span className="ml-1 text-danger">*</span>
                </label>

                <input
                  id="ingredientName"
                  type="text"
                  value={ingredientName}
                  onChange={(event) =>
                    setIngredientName(capitalizeWords(event.target.value))
                  }
                  onBlur={(event) =>
                    setIngredientName(capitalizeWords(event.target.value))
                  }
                  placeholder="Enter ingredient name"
                  disabled={submitting}
                  className="
                    w-full
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-text-primary
                    outline-none
                    transition
                    placeholder:text-text-muted
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:bg-surface-grey
                  "
                />
              </div>

              {/* Unit */}
              <div>
                <label
                  htmlFor="unit"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Unit
                  <span className="ml-1 text-danger">*</span>
                </label>

                <select
                  id="unit"
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  disabled={submitting}
                  className="
                    w-full
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-text-primary
                    outline-none
                    transition
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:bg-surface-grey
                  "
                >
                  <option value="">Select Unit</option>

                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost */}
              <div>
                <label
                  htmlFor="costPerUnit"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Cost per Unit
                  <span className="ml-1 text-danger">*</span>
                </label>

                <div className="relative">
                  <span
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-sm
                      font-semibold
                      text-text-secondary
                    "
                  >
                    ৳
                  </span>

                  <input
                    id="costPerUnit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(event) => setCostPerUnit(event.target.value)}
                    placeholder="0.00"
                    disabled={submitting}
                    className="
                      w-full
                      rounded-lg
                      border
                      border-border
                      bg-white
                      py-3
                      pl-10
                      pr-4
                      text-sm
                      text-text-primary
                      outline-none
                      transition
                      placeholder:text-text-muted
                      focus:border-primary
                      focus:ring-2
                      focus:ring-primary/10
                      disabled:cursor-not-allowed
                      disabled:bg-surface-grey
                      [appearance:textfield]
                      [&::-webkit-inner-spin-button]:appearance-none
                      [&::-webkit-outer-spin-button]:appearance-none
                    "
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="
                  rounded-lg
                  bg-primary
                  px-6
                  py-3
                  text-sm
                  font-medium
                  text-text-white
                  transition
                  hover:bg-primary-hover
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {submitting
                  ? editingId !== null
                    ? "Updating..."
                    : "Creating..."
                  : editingId !== null
                    ? "Update Ingredient"
                    : "Create Ingredient"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-6
                    py-3
                    text-sm
                    font-medium
                    text-text-secondary
                    transition
                    hover:bg-surface-grey
                    hover:text-text-primary
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  <X size={17} />
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ===================================================
            TABLE CARD
        =================================================== */}

        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Ingredients
                </h2>

                <p className="mt-1 text-sm text-text-secondary">
                  List of all available menu ingredients.
                </p>
              </div>

              <div className="w-full md:w-80">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search ingredients..."
                  className="
                    w-full
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-text-primary
                    outline-none
                    transition
                    placeholder:text-text-muted
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                  "
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-surface-grey">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    #
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Ingredient Name
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Unit
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Cost per Unit
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-text-secondary"
                    >
                      Loading ingredients...
                    </td>
                  </tr>
                ) : filteredIngredients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-text-muted"
                    >
                      {searchTerm.trim()
                        ? "No ingredients match your search."
                        : "No ingredients found."}
                    </td>
                  </tr>
                ) : (
                  filteredIngredients.map((ingredient, index) => (
                    <tr
                      key={ingredient.id}
                      className="transition hover:bg-surface-dark"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-text-primary">
                        {ingredient.ingredient_name}
                      </td>

                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {ingredient.unit_name}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-text-primary">
                        ৳{Number(ingredient.cost_per_unit).toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEdit(ingredient)}
                            disabled={submitting || deletingId !== null}
                            title="Edit"
                            className="
                              inline-flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-border
                              bg-white
                              text-info
                              transition
                              hover:border-info
                              hover:bg-info/10
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(ingredient)}
                            disabled={submitting || deletingId !== null}
                            title="Delete"
                            className="
                              inline-flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-border
                              bg-white
                              text-danger
                              transition
                              hover:border-danger
                              hover:bg-danger/10
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            {deletingId === ingredient.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateIngredients;