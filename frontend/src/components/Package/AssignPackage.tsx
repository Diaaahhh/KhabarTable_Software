"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  Edit,
  Loader2,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

interface Package {
  id: number;
  package_name: string;
}

interface Employee {
  id: number;
  public_id: string;
  first_name: string;
  personal_email?: string | null;
  package_id?: number | null;
}

interface Assignment {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  package_id: number;
  package_name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AssignPackage = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  /* =========================================================
     EMPLOYEE NAME
     ========================================================= */

  const getEmployeeName = (employee: Employee) => {
    return employee.first_name || `Employee #${employee.id}`;
  };

  /* =========================================================
     MESSAGE
     ========================================================= */

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
  };

  /* =========================================================
     FETCH PACKAGES — sorted alphabetically by package_name
     ========================================================= */

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);

      const response = await fetch(
        `${API_BASE_URL}/api/packages?page=1&limit=100&sort=name`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch packages.");
      }

      setPackages(
        (data.data || []).map((item: any) => ({
          id: item.id,
          package_name: item.package_name,
        })),
      );
    } catch (error) {
      console.error("Error fetching packages:", error);

      showMessage(
        error instanceof Error ? error.message : "Failed to load packages.",
        "error",
      );
    } finally {
      setLoadingPackages(false);
    }
  };

  /* =========================================================
     FETCH EMPLOYEES — sorted alphabetically by first_name
     ========================================================= */

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const response = await fetch(
        `${API_BASE_URL}/api/packages/employees`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch employees.");
      }

      setEmployees(data.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);

      showMessage(
        error instanceof Error ? error.message : "Failed to load employees.",
        "error",
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  /* =========================================================
     FETCH ASSIGNMENTS — sorted alphabetically by employee_name
     ========================================================= */

  const fetchAssignments = async (requestedPage = page) => {
    try {
      setLoadingAssignments(true);

      const response = await fetch(
        `${API_BASE_URL}/api/packages/assignment-list?page=${requestedPage}&limit=10`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch assignments.");
      }

      setAssignments(data.data || []);
      setPagination(
        data.pagination || {
          page: requestedPage,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      console.error("Error fetching assignments:", error);

      showMessage(
        error instanceof Error ? error.message : "Failed to load assignments.",
        "error",
      );
    } finally {
      setLoadingAssignments(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    fetchPackages();
    fetchEmployees();
    fetchAssignments(1);
  }, []);

  useEffect(() => {
    fetchAssignments(page);
  }, [page]);

  /* =========================================================
     2 SECOND DUPLICATE CHECK
     ========================================================= */

  useEffect(() => {
    if (!selectedEmployeeId) {
      setDuplicateExists(false);
      setCheckingDuplicate(false);
      return;
    }

    setCheckingDuplicate(true);
    setDuplicateExists(false);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/packages/check-duplicate`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employee_id: Number(selectedEmployeeId),
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to check duplicate.");
        }

        setDuplicateExists(Boolean(data.exists));
      } catch (error) {
        console.error("Duplicate check error:", error);

        showMessage(
          error instanceof Error
            ? error.message
            : "Failed to check duplicate.",
          "error",
        );
      } finally {
        setCheckingDuplicate(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedEmployeeId, editingId]);

  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setSelectedPackageId("");
    setSelectedEmployeeId("");
    setEditingId(null);
    setDuplicateExists(false);
    setCheckingDuplicate(false);
  };

  /* =========================================================
     SUBMIT
     ========================================================= */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!selectedEmployeeId) {
      showMessage("Please choose an employee.", "error");
      return;
    }

    if (!selectedPackageId) {
      showMessage("Please choose a package.", "error");
      return;
    }

    if (duplicateExists && !editingId) {
      showMessage(
        "This employee already has a package assigned.",
        "error",
      );
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const unassignResponse = await fetch(
          `${API_BASE_URL}/api/packages/unassign`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employee_id: Number(selectedEmployeeId),
            }),
          },
        );

        const unassignData = await unassignResponse.json();

        if (!unassignResponse.ok) {
          throw new Error(
            unassignData.message || "Failed to update assignment.",
          );
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/api/packages/assign`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: Number(selectedEmployeeId),
            package_id: Number(selectedPackageId),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingId
              ? "Failed to update assignment."
              : "Failed to assign package."),
        );
      }

      showMessage(
        data.message ||
          (editingId
            ? "Assignment updated successfully."
            : "Package assigned successfully."),
        "success",
      );

      resetForm();

      await fetchEmployees();
      await fetchAssignments(page);
    } catch (error) {
      console.error("Assignment submit error:", error);

      showMessage(
        error instanceof Error ? error.message : "Something went wrong.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EDIT
     ========================================================= */

  const handleEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setSelectedEmployeeId(String(assignment.employee_id));
    setSelectedPackageId(String(assignment.package_id));

    setDuplicateExists(false);
    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     DELETE — remove assignment from employee
     ========================================================= */

  const handleDelete = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this package assignment?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(assignment.id);
      setMessage("");
      setMessageType("");

      const response = await fetch(
        `${API_BASE_URL}/api/packages/unassign`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: Number(assignment.employee_id),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete assignment.",
        );
      }

      showMessage(
        data.message || "Package assignment deleted successfully.",
        "success",
      );

      if (assignments.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchAssignments(page);
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Delete assignment error:", error);

      showMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete assignment.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="w-full">
      {/* FORM */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingId ? "Edit Package Assignment" : "Assign Package"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Assign a package to an employee.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{message}</span>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMessageType("");
              }}
              className="shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* EMPLOYEE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choose Employee
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  disabled={saving || loadingEmployees}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-[#7d1119] focus:ring-2 focus:ring-[#7d1119]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingEmployees
                      ? "Loading employees..."
                      : "Choose employee"}
                  </option>

                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {getEmployeeName(employee).slice(0, 20)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>

              {checkingDuplicate && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 size={12} className="animate-spin" />
                  Checking employee assignment...
                </p>
              )}

              {!checkingDuplicate && duplicateExists && (
                <p className="mt-1.5 text-xs text-red-600">
                  This employee already has a package assigned.
                </p>
              )}
            </div>

            {/* PACKAGE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choose Package
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  disabled={saving || loadingPackages}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-[#7d1119] focus:ring-2 focus:ring-[#7d1119]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingPackages
                      ? "Loading packages..."
                      : "Choose package"}
                  </option>

                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.package_name.slice(0, 20)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* BUTTONS */}

          <div className="flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                loadingEmployees ||
                loadingPackages ||
                checkingDuplicate ||
                (duplicateExists && !editingId) ||
                !selectedEmployeeId ||
                !selectedPackageId
              }
              className="flex items-center gap-2 rounded-lg bg-[#7d1119] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#651016] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  {editingId ? "Updating..." : "Assigning..."}
                </>
              ) : editingId ? (
                <>
                  <Save size={17} />
                  Update Assignment
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  Assign Package
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE */}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Assigned Packages
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Employees and their assigned packages.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  SL
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Employee Name
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Assigned Package
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingAssignments ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Loader2 size={18} className="animate-spin" />
                      Loading assignments...
                    </div>
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No package assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment, index) => (
                  <tr
                    key={assignment.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(page - 1) * 10 + index + 1}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {assignment.employee_name}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {assignment.package_name}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(assignment)}
                          disabled={deletingId !== null}
                          title="Edit"
                          className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(assignment)}
                          disabled={deletingId === assignment.id}
                          title="Delete"
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === assignment.id ? (
                            <Loader2 size={16} className="animate-spin" />
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

        {/* PAGINATION */}

        {pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 10 + 1}–
              {Math.min(page * 10, pagination.total)} of {pagination.total}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) => Math.max(previous - 1, 1))
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() =>
                  setPage((previous) =>
                    Math.min(previous + 1, pagination.totalPages),
                  )
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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

export default AssignPackage;