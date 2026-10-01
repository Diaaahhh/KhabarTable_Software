"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../constants/api";
import { capitalizeWords } from "../../utils/formatText";

interface Designation {
  id: number;
  code: string;
  name: string;
  description: string;
  status?: string;
}

const AddViewDesignation = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [designations, setDesignations] = useState<Designation[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );

  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [duplicateName, setDuplicateName] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /*
   * =========================================================
   * LOAD DESIGNATIONS
   * =========================================================
   */

  const fetchDesignations = async () => {
    try {
      setTableLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/designations?page=${page}&limit=${limit}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load designations.");
      }

      setDesignations(data.data || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error ? error.message : "Failed to load designations.",
      );

      setMessageType("error");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, [page]);

  /*
   * =========================================================
   * DUPLICATE NAME CHECK
   *
   * Runs 2 seconds after user stops typing.
   * =========================================================
   */

  useEffect(() => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setDuplicateName(false);
      setDuplicateChecking(false);
      return;
    }

    setDuplicateChecking(true);

    const timer = setTimeout(async () => {
      try {
        const formattedName = capitalizeWords(trimmedName);

        const params = new URLSearchParams({
          name: formattedName,
        });

        if (editingId !== null) {
          params.append("excludeId", String(editingId));
        }

        const response = await fetch(
          `${API_BASE_URL}/api/designations/check-name?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        setDuplicateName(data.exists === true);
      } catch (error) {
        console.error("Duplicate check failed:", error);
      } finally {
        setDuplicateChecking(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [name, editingId]);

  /*
   * =========================================================
   * FORM SUBMIT
   * =========================================================
   */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");

    const formattedName = capitalizeWords(name.trim());
    const trimmedDescription = description.trim();

    if (!formattedName) {
      setMessage("Designation name is required.");
      setMessageType("error");
      return;
    }

    if (duplicateName) {
      setMessage("This designation name already exists.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const url =
        editingId !== null
          ? `${API_BASE_URL}/api/designations/${editingId}`
          : `${API_BASE_URL}/api/designations`;

      const response = await fetch(url, {
        method: editingId !== null ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formattedName,
          description: trimmedDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setMessage(data.message || "Designation saved successfully.");
      setMessageType("success");

      resetForm();

      // If we're on another page, go back to first page
      if (page !== 1) {
        setPage(1);
      } else {
        fetchDesignations();
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error ? error.message : "Failed to save designation.",
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  const handleEdit = (designation: Designation) => {
    setEditingId(designation.id);
    setName(designation.name);
    setDescription(designation.description || "");

    setDuplicateName(false);

    setMessage("Editing designation...");
    setMessageType("info");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/designations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete designation.");
      }

      setMessage(data.message || "Designation deleted successfully.");
      setMessageType("success");

      setDeleteId(null);

      /*
       * If deleting the last item of the current page,
       * move to the previous page.
       */
      if (designations.length === 1 && page > 1) {
        setPage((previousPage) => previousPage - 1);
      } else {
        fetchDesignations();
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete designation.",
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * RESET FORM
   * =========================================================
   */

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingId(null);
    setDuplicateName(false);
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="w-full space-y-6">
      {/* =====================================================
          FORM
          ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingId !== null ? "Edit Designation" : "Add Designation"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {editingId !== null
                ? "Update the designation information."
                : "Create a new organization designation."}
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>

        {/* Inline message */}

        {message && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Designation Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setMessage("");
                }}
                placeholder="e.g. Chief Chef"
                maxLength={255}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition ${
                  duplicateName
                    ? "border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-[#7d1119] focus:ring-2 focus:ring-[#7d1119]/10"
                }`}
              />

              {duplicateChecking && name.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {duplicateName && (
              <p className="mt-1.5 text-sm text-red-600">
                This designation name already exists.
              </p>
            )}

            {!duplicateName && !duplicateChecking && name.trim() && (
              <p className="mt-1.5 text-xs text-gray-500">
                The name will be saved as:{" "}
                <strong>{capitalizeWords(name.trim())}</strong>
              </p>
            )}
          </div>

          {/* Description */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter designation description..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#7d1119] focus:ring-2 focus:ring-[#7d1119]/10"
            />
          </div>

          {/* Buttons */}

          <div className="flex justify-end gap-3">
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading || duplicateName || duplicateChecking}
              className="flex items-center gap-2 rounded-lg bg-[#7d1119] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#651016] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : editingId !== null ? (
                "Update Designation"
              ) : (
                <>
                  <Plus size={17} />
                  Add Designation
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* =====================================================
          DESIGNATION TABLE
          ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Designations
            </h2>

            <p className="text-sm text-gray-500">
              {total} designation{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  #
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Code
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <Loader2
                      size={24}
                      className="mx-auto animate-spin text-gray-400"
                    />

                    <p className="mt-2 text-sm text-gray-500">
                      Loading designations...
                    </p>
                  </td>
                </tr>
              ) : designations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No designations found.
                  </td>
                </tr>
              ) : (
                designations.map((designation, index) => (
                  <tr
                    key={designation.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(page - 1) * limit + index + 1}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {designation.code}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {designation.name}
                    </td>

                    <td className="max-w-[350px] px-6 py-4 text-sm text-gray-600">
                      {designation.description || "-"}
                    </td>

                    <td className="px-6 py-4">
                      {deleteId === designation.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="mr-1 text-xs text-red-600">
                            Delete?
                          </span>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDelete(designation.id)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Yes
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(designation)}
                            className="rounded-md border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteId(designation.id)}
                            className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            PAGINATION
            ===================================================== */}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`min-w-[36px] rounded-md px-3 py-1.5 text-sm ${
                      page === pageNumber
                        ? "bg-[#7d1119] text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddViewDesignation;
