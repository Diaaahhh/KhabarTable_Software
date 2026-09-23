"use client";

import { useEffect, useState } from "react";

import {
  Plus,
  Store,
  Loader2,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {API_BASE_URL} from "../../constants/api"

// ============================================================
// TYPES
// ============================================================

type RestaurantCategory = {
  id: number;
  res_category: string;
};

type Message = {
  type: "success" | "error" | "";
  text: string;
};

// ============================================================
// COMPONENT
// ============================================================

const CreateRestaurantType = () => {
  const [restaurantType, setRestaurantType] = useState("");

  const [categories, setCategories] = useState<
    RestaurantCategory[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [tableLoading, setTableLoading] =
    useState(true);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [message, setMessage] = useState<Message>({
    type: "",
    text: "",
  });

  // ==========================================================
  // GET RESTAURANT CATEGORIES
  // ==========================================================

  const getCategories = async () => {
    try {
      setTableLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-category`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data.message);
        return;
      }

      setCategories(data.categories || []);
    } catch (error) {
      console.error(
        "Failed to fetch restaurant categories:",
        error
      );
    } finally {
      setTableLoading(false);
    }
  };

  // ==========================================================
  // FETCH DATA ON PAGE LOAD
  // ==========================================================

  useEffect(() => {
    getCategories();
  }, []);

  // ==========================================================
  // FORM SUBMIT
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    const value = restaurantType.trim();

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!value) {
      setMessage({
        type: "error",
        text: "Please enter a restaurant type.",
      });

      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // EDIT
      // ======================================================

      if (editingId !== null) {
        const response = await fetch(
          `{API_BASE_URL}/api/restaurant-category/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              res_category: value,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage({
            type: "error",
            text:
              data.message ||
              "Failed to update restaurant type.",
          });

          return;
        }

        setMessage({
          type: "success",
          text: "Restaurant type updated successfully!",
        });

        setRestaurantType("");
        setEditingId(null);

        await getCategories();

        return;
      }

      // ======================================================
      // CREATE
      // ======================================================

      const response = await fetch(
        `${API_BASE_URL}/api/restaurant-category/create-rest-type`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            res_category: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text:
            data.message ||
            "Failed to create restaurant type.",
        });

        return;
      }

      setMessage({
        type: "success",
        text: "Restaurant type created successfully!",
      });

      setRestaurantType("");

      await getCategories();
    } catch (error) {
      console.error(
        "Error submitting restaurant type:",
        error
      );

      setMessage({
        type: "error",
        text: "Unable to connect to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // EDIT CATEGORY
  // ==========================================================

  const handleEdit = (
    category: RestaurantCategory
  ) => {
    setRestaurantType(category.res_category);

    setEditingId(category.id);

    setMessage({
      type: "",
      text: "",
    });

    // Scroll to form
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================================
  // CANCEL EDIT
  // ==========================================================

  const handleCancelEdit = () => {
    setRestaurantType("");

    setEditingId(null);

    setMessage({
      type: "",
      text: "",
    });
  };

  // ==========================================================
  // DELETE CATEGORY
  // ==========================================================

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this restaurant type?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `{API_BASE_URL}/api/restaurant-category/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text:
            data.message ||
            "Failed to delete restaurant type.",
        });

        return;
      }

      // If deleted item was being edited
      if (editingId === id) {
        setRestaurantType("");
        setEditingId(null);
      }

      setMessage({
        type: "success",
        text: "Restaurant type deleted successfully!",
      });

      await getCategories();
    } catch (error) {
      console.error(
        "Error deleting restaurant type:",
        error
      );

      setMessage({
        type: "error",
        text: "Unable to connect to the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-surface
        px-4
        py-5
        sm:px-6
        sm:py-6
        lg:px-8
        lg:py-8
      "
    >
      <div className="mx-auto w-full max-w-4xl">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-5 sm:mb-7 lg:mb-8">
          <h1
            className="
              text-xl
              font-bold
              text-text-primary
              sm:text-2xl
            "
          >
            Restaurant Types
          </h1>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-text-secondary
              sm:text-sm
            "
          >
            Create and manage restaurant categories
            in your system.
          </p>
        </div>

        {/* =====================================================
            FORM CARD
        ====================================================== */}

        <div
          className="
            rounded-xl
            border
            border-border
            bg-white
            p-4
            shadow-sm
            sm:rounded-2xl
            sm:p-6
          "
        >
          {/* ===================================================
              CARD HEADER
          ==================================================== */}

          <div
            className="
              mb-5
              flex
              items-center
              gap-3
              sm:mb-6
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-primary-light
                sm:h-11
                sm:w-11
                sm:rounded-xl
              "
            >
              <Store
                size={20}
                className="text-white sm:size-[22px]"
              />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  text-base
                  font-semibold
                  text-text-primary
                  sm:text-lg
                "
              >
                {editingId !== null
                  ? "Edit Restaurant Type"
                  : "Restaurant Information"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  leading-5
                  text-text-muted
                  sm:text-sm
                "
              >
                {editingId !== null
                  ? "Update the selected restaurant type."
                  : "Enter the restaurant type you want to add."}
              </p>
            </div>
          </div>

          {/* ===================================================
              FORM
          ==================================================== */}

          <form onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="restaurantType"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-text-primary
                "
              >
                Restaurant Type
              </label>

              <input
                id="restaurantType"
                type="text"
                value={restaurantType}
                onChange={(e) =>
                  setRestaurantType(
                    e.target.value
                  )
                }
                placeholder="e.g. Fast Food, Cafe, Fine Dining"
                maxLength={255}
                disabled={loading}
                className="
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  text-text-primary
                  outline-none
                  transition
                  placeholder:text-text-muted
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/20
                  disabled:cursor-not-allowed
                  disabled:bg-surface-dark
                  sm:px-4
                  sm:py-3
                "
              />

              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-text-muted
                  sm:mt-2
                  sm:text-xs
                "
              >
                Maximum 255 characters.
              </p>
            </div>

            {/* =================================================
                MESSAGE
            ================================================== */}

            {message.text && (
              <div
                className={`
                  mt-4
                  flex
                  items-start
                  gap-2
                  rounded-lg
                  border
                  px-3
                  py-2.5
                  text-xs
                  leading-5
                  sm:mt-5
                  sm:px-4
                  sm:py-3
                  sm:text-sm

                  ${
                    message.type === "success"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }
                `}
              >
                {message.type === "success" ? (
                  <CheckCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                ) : (
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                )}

                <span>{message.text}</span>
              </div>
            )}

            {/* =================================================
                BUTTONS
            ================================================== */}

            <div
              className="
                mt-5
                flex
                flex-col
                gap-2
                sm:mt-6
                sm:flex-row
              "
            >
              <button
                type="submit"
                disabled={loading}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-primary
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-primary-hover
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/30
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:flex-1
                  sm:px-5
                  sm:py-3
                "
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    <span>
                      {editingId !== null
                        ? "Updating..."
                        : "Creating..."}
                    </span>
                  </>
                ) : (
                  <>
                    {editingId !== null ? (
                      <Pencil size={18} />
                    ) : (
                      <Plus size={18} />
                    )}

                    <span>
                      {editingId !== null
                        ? "Update Restaurant Type"
                        : "Create Restaurant Type"}
                    </span>
                  </>
                )}
              </button>

              {/* =================================================
                  CANCEL EDIT
              ================================================== */}

              {editingId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-text-secondary
                    transition
                    hover:bg-surface-grey
                    hover:text-text-primary
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    sm:w-auto
                    sm:px-5
                    sm:py-3
                  "
                >
                  <X size={18} />

                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* =====================================================
            CATEGORY TABLE
        ====================================================== */}

        <div
          className="
            mt-6
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-white
            shadow-sm
            sm:mt-8
            sm:rounded-2xl
          "
        >
          {/* ===================================================
              TABLE HEADER
          ==================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-border
              px-4
              py-4
              sm:px-6
            "
          >
            <div>
              <h2
                className="
                  text-base
                  font-semibold
                  text-text-primary
                  sm:text-lg
                "
              >
                Restaurant Categories
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-text-muted
                  sm:text-sm
                "
              >
                {categories.length}{" "}
                {categories.length === 1
                  ? "category"
                  : "categories"}
              </p>
            </div>

            <Store
              size={20}
              className="text-primary"
            />
          </div>

          {/* ===================================================
              TABLE
          ==================================================== */}

          {tableLoading ? (
            <div
              className="
                flex
                items-center
                justify-center
                gap-2
                px-4
                py-12
                text-sm
                text-text-secondary
              "
            >
              <Loader2
                size={20}
                className="animate-spin"
              />

              <span>Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div
              className="
                px-4
                py-12
                text-center
                text-sm
                text-text-muted
              "
            >
              No restaurant categories found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="
                  w-full
                  min-w-[500px]
                  text-left
                "
              >
                <thead>
                  <tr
                    className="
                      border-b
                      border-border
                      bg-surface-grey
                    "
                  >
                    <th
                      className="
                        px-4
                        py-3
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-text-secondary
                        sm:px-6
                      "
                    >
                      #
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-text-secondary
                        sm:px-6
                      "
                    >
                      Restaurant Type
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        text-right
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-text-secondary
                        sm:px-6
                      "
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map(
                    (category, index) => (
                      <tr
                        key={category.id}
                        className="
                          border-b
                          border-border
                          last:border-b-0
                          transition-colors
                          hover:bg-surface
                        "
                      >
                        {/* ID */}

                        <td
                          className="
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-text-muted
                            sm:px-6
                          "
                        >
                          {index + 1}
                        </td>

                        {/* CATEGORY */}

                        <td
                          className="
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-text-primary
                            sm:px-6
                          "
                        >
                          {category.res_category}
                        </td>

                        {/* ACTIONS */}

                        <td
                          className="
                            px-4
                            py-4
                            sm:px-6
                          "
                        >
                          <div
                            className="
                              flex
                              justify-end
                              gap-2
                            "
                          >
                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  category
                                )
                              }
                              disabled={loading}
                              title="Edit"
                              className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-border
                                bg-white
                                text-text-secondary
                                transition
                                hover:border-primary
                                hover:bg-primary-light
                                hover:text-white
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              <Pencil size={16} />
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  category.id
                                )
                              }
                              disabled={loading}
                              title="Delete"
                              className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-border
                                bg-white
                                text-text-secondary
                                transition
                                hover:border-red-300
                                hover:bg-red-50
                                hover:text-danger
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRestaurantType;