"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../../constants/api";

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

      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error instanceof Error ? error.message : "Failed to load units.",
      });
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

      Swal.fire({
        icon: "error",
        title: "Failed",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load ingredients.",
      });
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

    const cleanName = ingredientName.trim();
    const numericCost = Number(costPerUnit);

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!cleanName) {
      Swal.fire({
        icon: "warning",
        title: "Ingredient Name Required",
        text: "Please enter an ingredient name.",
      });
      return;
    }

    if (!unitId) {
      Swal.fire({
        icon: "warning",
        title: "Unit Required",
        text: "Please select a unit.",
      });
      return;
    }

    if (
      costPerUnit === "" ||
      !Number.isFinite(numericCost) ||
      numericCost < 0
    ) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Cost",
        text: "Please enter a valid cost.",
      });
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

      await Swal.fire({
        icon: "success",
        title: isEditing ? "Ingredient Updated" : "Ingredient Created",
        text:
          data.message ||
          `Ingredient ${isEditing ? "updated" : "created"} successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });

      resetForm();

      await fetchIngredients();
    } catch (error) {
      console.error("Ingredient submit error:", error);

      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // EDIT INGREDIENT
  // =========================================================

  const handleEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);

    setIngredientName(ingredient.ingredient_name);
    setUnitId(String(ingredient.unit_id));
    setCostPerUnit(Number(ingredient.cost_per_unit).toFixed(2));

    // Scroll to the form
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // DELETE INGREDIENT
  // =========================================================

  const handleDelete = async (ingredient: Ingredient) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Ingredient?",
      text: `Are you sure you want to delete "${ingredient.ingredient_name}"?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#7d1119",
      cancelButtonColor: "#717b8b",
    });

    if (!result.isConfirmed) {
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

      // If deleted item was being edited, reset the form
      if (editingId === ingredient.id) {
        resetForm();
      }

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: data.message || "Ingredient deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchIngredients();
    } catch (error) {
      console.error("Delete ingredient error:", error);

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete ingredient.",
      });
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
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-surface-dark p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ===================================================
            FORM CARD
        =================================================== */}

        <div className="rounded-xl border border-border bg-surface shadow-sm">
          {/* Header */}

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

          {/* Form */}

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
                  onChange={(event) => setIngredientName(event.target.value)}
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
          {/* Table Header */}

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

          {/* Table */}

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
                      {/* # */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                        {index + 1}
                      </td>

                      {/* Ingredient Name */}

                      <td className="px-6 py-4 text-sm font-medium text-text-primary">
                        {ingredient.ingredient_name}
                      </td>

                      {/* Unit */}

                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {ingredient.unit_name}
                      </td>

                      {/* Cost */}

                      <td className="px-6 py-4 text-right text-sm font-medium text-text-primary">
                        ৳{Number(ingredient.cost_per_unit).toFixed(2)}
                      </td>

                      {/* Actions */}

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
