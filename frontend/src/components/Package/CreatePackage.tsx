"use client";

import React, { useEffect, useState } from "react";

import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Swal from "sweetalert2";

import { API_BASE_URL } from "../../constants/api";

import { capitalizeWords } from "../../utils/formatText";

/* =========================================================
   TYPES
   ========================================================= */

interface Menu {
  id: number;
  parent_id: number | null;
  menu: string;
}

interface PackageMenu {
  id: number;
  parent_id: number | null;
  menu: string;
}

interface Package {
  id: number;
  package_name: string;
  menus: PackageMenu[];
  created_at?: string;
  updated_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* =========================================================
   COMPONENT
   ========================================================= */

const CreatePackage = () => {
  /* =======================================================
     FORM STATE
     ======================================================= */

  const [packageName, setPackageName] = useState("");

  const [selectedMenuIds, setSelectedMenuIds] =
    useState<number[]>([]);

  const [menus, setMenus] = useState<Menu[]>([]);

  /* =======================================================
     LOADING STATE
     ======================================================= */

  const [loadingMenus, setLoadingMenus] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [loadingPackages, setLoadingPackages] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /* =======================================================
     EDIT STATE
     ======================================================= */

  const [editingPackageId, setEditingPackageId] =
    useState<number | null>(null);

  /* =======================================================
     PACKAGE TABLE STATE
     ======================================================= */

  const [packages, setPackages] =
    useState<Package[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  /* =========================================================
     FETCH MENUS
     ========================================================= */

  const fetchMenus = async () => {
    try {
      setLoadingMenus(true);

      const response = await fetch(
        `${API_BASE_URL}/api/packages/menus`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load menus.",
        );
      }

      setMenus(data.data || []);
    } catch (error) {
      console.error(
        "Error loading menus:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Failed to load menus",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingMenus(false);
    }
  };

  /* =========================================================
     FETCH PACKAGES
     ========================================================= */

  const fetchPackages = async (
    page = pagination.page,
  ) => {
    try {
      setLoadingPackages(true);

      const response = await fetch(
        `${API_BASE_URL}/api/packages?page=${page}&limit=${pagination.limit}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load packages.",
        );
      }

      setPackages(data.data || []);

      setPagination(
        data.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      console.error(
        "Error loading packages:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Failed to load packages",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        confirmButtonColor: "#7d1119",
      });
    } finally {
      setLoadingPackages(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    fetchMenus();
    fetchPackages(1);
  }, []);

  /* =========================================================
     HANDLE CHECKBOX CHANGE
     ========================================================= */

  const handleMenuChange = (
    menuId: number,
  ) => {
    setSelectedMenuIds((previous) => {
      if (previous.includes(menuId)) {
        return previous.filter(
          (id) => id !== menuId,
        );
      }

      return [...previous, menuId];
    });
  };

  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setPackageName("");
    setSelectedMenuIds([]);
    setEditingPackageId(null);
  };

  /* =========================================================
     SUBMIT
     ========================================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const formattedPackageName =
      capitalizeWords(
        packageName.trim(),
      );

    /* =====================================================
       VALIDATE PACKAGE NAME
       ===================================================== */

    if (!formattedPackageName) {
      Swal.fire({
        icon: "error",
        title: "Package name required",
        text: "Please enter a package name.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    /* =====================================================
       VALIDATE MENUS
       ===================================================== */

    if (selectedMenuIds.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Menu required",
        text: "Please select at least one menu.",
        confirmButtonColor: "#7d1119",
      });

      return;
    }

    try {
      setSaving(true);

      const isEditing =
        editingPackageId !== null;

      const url = isEditing
        ? `${API_BASE_URL}/api/packages/${editingPackageId}`
        : `${API_BASE_URL}/api/packages`;

      const response = await fetch(url, {
        method: isEditing
          ? "PUT"
          : "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          package_name:
            formattedPackageName,

          menu_ids:
            selectedMenuIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? "Failed to update package."
              : "Failed to create package."),
        );
      }

      await Swal.fire({
        icon: "success",

        title: isEditing
          ? "Package updated"
          : "Package created",

        text:
          data.message ||
          (isEditing
            ? "Package updated successfully."
            : "Package created successfully."),

        confirmButtonColor: "#7d1119",
      });

      resetForm();

      /* Refresh current page */
      fetchPackages(
        pagination.page,
      );
    } catch (error) {
      console.error(
        "Error saving package:",
        error,
      );

      Swal.fire({
        icon: "error",

        title: isEditing
          ? "Failed to update package"
          : "Failed to create package",

        text:
          error instanceof Error
            ? error.message
            : "Something went wrong.",

        confirmButtonColor: "#7d1119",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EDIT PACKAGE
     ========================================================= */

  const handleEdit = (
    packageItem: Package,
  ) => {
    setEditingPackageId(
      packageItem.id,
    );

    setPackageName(
      packageItem.package_name,
    );

    /*
      Only selectable menu IDs should be placed
      inside the checkbox state.

      Parent menus that were automatically added
      by backend are not selectable, so we don't
      check them here.
    */

    const selectableMenuIds =
      packageItem.menus
        .filter((item) =>
          menus.some(
            (menu) =>
              menu.id === item.id,
          ),
        )
        .map((item) => item.id);

    setSelectedMenuIds(
      selectableMenuIds,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     DELETE PACKAGE
     ========================================================= */

  const handleDelete = async (
    packageItem: Package,
  ) => {
    const result = await Swal.fire({
      icon: "warning",

      title: "Delete package?",

      text: `Are you sure you want to delete "${packageItem.package_name}"?`,

      showCancelButton: true,

      confirmButtonText: "Yes, delete",

      cancelButtonText: "Cancel",

      confirmButtonColor: "#d33",

      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeletingId(
        packageItem.id,
      );

      const response = await fetch(
        `${API_BASE_URL}/api/packages/${packageItem.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete package.",
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text:
          data.message ||
          "Package deleted successfully.",
        confirmButtonColor:
          "#7d1119",
      });

      /*
        If the last item on the current page
        was deleted, go to previous page.
      */

      if (
        packages.length === 1 &&
        pagination.page > 1
      ) {
        fetchPackages(
          pagination.page - 1,
        );
      } else {
        fetchPackages(
          pagination.page,
        );
      }
    } catch (error) {
      console.error(
        "Error deleting package:",
        error,
      );

      Swal.fire({
        icon: "error",
        title: "Failed to delete package",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        confirmButtonColor:
          "#7d1119",
      });
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     PAGINATION
     ========================================================= */

  const goToPage = (
    page: number,
  ) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    fetchPackages(page);
  };

  /* =========================================================
     GENERATE PAGE NUMBERS
     ========================================================= */

  const getPageNumbers = () => {
    const pages: number[] = [];

    const totalPages =
      pagination.totalPages;

    const currentPage =
      pagination.page;

    if (totalPages <= 5) {
      for (
        let i = 1;
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push(-1);
    }

    const start = Math.max(
      2,
      currentPage - 1,
    );

    const end = Math.min(
      totalPages - 1,
      currentPage + 1,
    );

    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }

    if (
      currentPage <
      totalPages - 2
    ) {
      pages.push(-1);
    }

    pages.push(totalPages);

    return pages;
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="w-full space-y-6">

      {/* =====================================================
          CREATE / EDIT FORM
          ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        {/* HEADER */}

        <div className="mb-6 flex items-start justify-between">

          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingPackageId
                ? "Edit Package"
                : "Create Package"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {editingPackageId
                ? "Update package information and assigned menus."
                : "Create a package and assign menus to it."}
            </p>
          </div>

          {editingPackageId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <X size={16} />
              Cancel Edit
            </button>
          )}
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* PACKAGE NAME */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Package Name
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              type="text"
              value={packageName}
              onChange={(e) =>
                setPackageName(
                  e.target.value,
                )
              }
              placeholder="e.g. Restaurant Manager"
              maxLength={255}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#7d1119] focus:ring-2 focus:ring-[#7d1119]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            {packageName.trim() && (
              <p className="mt-1.5 text-xs text-gray-500">
                The name will be saved as:{" "}
                <strong>
                  {capitalizeWords(
                    packageName.trim(),
                  )}
                </strong>
              </p>
            )}
          </div>

          {/* MENU CHECKBOXES */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Menu
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            {loadingMenus ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Loading menus...
              </div>
            ) : menus.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                No menus available.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {menus.map((menu) => (
                  <label
                    key={menu.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                      selectedMenuIds.includes(
                        menu.id,
                      )
                        ? "border-[#7d1119] bg-[#7d1119]/5"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${
                      saving
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                  >

                    <input
                      type="checkbox"
                      checked={selectedMenuIds.includes(
                        menu.id,
                      )}
                      onChange={() =>
                        handleMenuChange(
                          menu.id,
                        )
                      }
                      disabled={saving}
                      className="h-4 w-4 cursor-pointer accent-[#7d1119]"
                    />

                    <span className="text-sm text-gray-700">
                      {menu.menu}
                    </span>

                  </label>
                ))}

              </div>
            )}

            <p className="mt-1.5 text-xs text-gray-500">
              Select one or more menus.
              Parent menus will be included
              automatically.
            </p>

          </div>

          {/* SELECTED COUNT */}

          {selectedMenuIds.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">
                  {selectedMenuIds.length}
                </span>{" "}
                menu
                {selectedMenuIds.length >
                1
                  ? "s"
                  : ""}{" "}
                selected
              </p>
            </div>
          )}

          {/* BUTTON */}

          <div className="flex justify-end gap-3">

            {editingPackageId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                loadingMenus ||
                selectedMenuIds.length === 0
              }
              className="flex items-center gap-2 rounded-lg bg-[#7d1119] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#651016] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  {editingPackageId
                    ? "Updating..."
                    : "Creating..."}
                </>
              ) : (
                <>
                  {editingPackageId ? (
                    <>
                      <Pencil size={17} />
                      Update Package
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Package
                    </>
                  )}
                </>
              )}

            </button>

          </div>

        </form>
      </div>

      {/* =====================================================
          PACKAGE TABLE
          ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* TABLE HEADER */}

        <div className="border-b border-gray-200 px-6 py-5">

          <h2 className="text-lg font-semibold text-gray-800">
            Package List
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage your existing packages.
          </p>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[700px]">

            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">

                <th className="w-20 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  SL
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Package Name
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Menu
                </th>

                <th className="w-32 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>

              {loadingPackages ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Loading packages...
                    </div>
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No packages found.
                  </td>
                </tr>
              ) : (
                packages.map(
                  (
                    packageItem,
                    index,
                  ) => {

                    const serialNumber =
                      (pagination.page -
                        1) *
                        pagination.limit +
                      index +
                      1;

                    return (
                      <tr
                        key={
                          packageItem.id
                        }
                        className="border-b border-gray-100 transition hover:bg-gray-50"
                      >

                        {/* SL */}

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {
                            serialNumber
                          }
                        </td>

                        {/* PACKAGE NAME */}

                        <td className="px-6 py-4">

                          <span className="text-sm font-medium text-gray-800">
                            {
                              packageItem.package_name
                            }
                          </span>

                        </td>

                        {/* MENU */}

                        <td className="px-6 py-4">

                          <div className="flex flex-wrap gap-2">

                            {packageItem.menus
                              ?.length >
                            0 ? (
                              packageItem.menus.map(
                                (
                                  menu,
                                ) => (
                                  <span
                                    key={`${packageItem.id}-${menu.id}`}
                                    className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                                  >
                                    {
                                      menu.menu
                                    }
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-sm text-gray-400">
                                No menu
                              </span>
                            )}

                          </div>

                        </td>

                        {/* ACTIONS */}

                        <td className="px-6 py-4">

                          <div className="flex items-center justify-center gap-2">

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  packageItem,
                                )
                              }
                              disabled={
                                saving ||
                                deletingId !==
                                  null
                              }
                              title="Edit"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-[#7d1119] hover:bg-[#7d1119]/5 hover:text-[#7d1119] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  packageItem,
                                )
                              }
                              disabled={
                                deletingId ===
                                packageItem.id
                              }
                              title="Delete"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {deletingId ===
                              packageItem.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}

                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  },
                )
              )}

            </tbody>

          </table>

        </div>

        {/* ===================================================
            PAGINATION
            =================================================== */}

        {!loadingPackages &&
          pagination.total > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row">

              {/* SHOWING */}

              <p className="text-sm text-gray-500">

                Showing{" "}

                <span className="font-medium text-gray-700">
                  {(pagination.page -
                    1) *
                    pagination.limit +
                    1}
                </span>

                {" "}to{" "}

                <span className="font-medium text-gray-700">
                  {Math.min(
                    pagination.page *
                      pagination.limit,
                    pagination.total,
                  )}
                </span>

                {" "}of{" "}

                <span className="font-medium text-gray-700">
                  {pagination.total}
                </span>

                {" "}packages

              </p>

              {/* PAGE BUTTONS */}

              <div className="flex items-center gap-1">

                {/* PREVIOUS */}

                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      pagination.page -
                        1,
                    )
                  }
                  disabled={
                    pagination.page <=
                      1 ||
                    loadingPackages
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Previous"
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>

                {/* NUMBERS */}

                {getPageNumbers().map(
                  (pageNumber, index) =>
                    pageNumber === -1 ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() =>
                          goToPage(
                            pageNumber,
                          )
                        }
                        disabled={
                          loadingPackages
                        }
                        className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition ${
                          pagination.page ===
                          pageNumber
                            ? "bg-[#7d1119] text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        } disabled:cursor-not-allowed`}
                      >
                        {
                          pageNumber
                        }
                      </button>
                    ),
                )}

                {/* NEXT */}

                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      pagination.page +
                        1,
                    )
                  }
                  disabled={
                    pagination.page >=
                      pagination.totalPages ||
                    loadingPackages
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Next"
                >
                  <ChevronRight
                    size={17}
                  />
                </button>

              </div>

            </div>
          )}

      </div>

    </div>
  );
};

export default CreatePackage;