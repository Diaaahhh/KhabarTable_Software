"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreVertical,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

// =========================================================
// TYPES
// =========================================================

interface Branch {
  id: number;
  branch_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  expiry_date: string | null;
  created_by: string | null;
}

interface Menu {
  id: number;
  menu: string;
  href?: string | null;
}

interface EditForm {
  branch_name: string;
  phone: string;
  email: string;
  address: string;
  expiry_date: string;
}

// =========================================================
// COMPONENT
// =========================================================

const BranchList = () => {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState("");
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  // Fixed-position coordinates for the dropdown
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionSaving, setPermissionSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState<EditForm>({
    branch_name: "",
    phone: "",
    email: "",
    address: "",
    expiry_date: "",
  });

  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reference to the currently open trigger button
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /* =========================================================
     SEARCH
     ========================================================= */

  const filteredBranches = branches.filter((branch) => {
    const searchValue = search.toLowerCase().trim();

    return (
      (branch.branch_name || "").toLowerCase().includes(searchValue) ||
      (branch.phone || "").toLowerCase().includes(searchValue) ||
      (branch.email || "").toLowerCase().includes(searchValue) ||
      (branch.address || "").toLowerCase().includes(searchValue) ||
      String(branch.created_by || "")
        .toLowerCase()
        .includes(searchValue)
    );
  });

  /* =========================================================
     PAGINATION
     ========================================================= */

  const branchesPerPage = 10;

  const totalPages = Math.ceil(filteredBranches.length / branchesPerPage);

  const startIndex = (currentPage - 1) * branchesPerPage;
  const endIndex = startIndex + branchesPerPage;

  const currentBranches = filteredBranches.slice(startIndex, endIndex);

  /* =========================================================
     FETCH BRANCHES
     ========================================================= */

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/branches`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch branches.");
      }

      setBranches(data.branches || []);
      setCurrentPage(1);
    } catch (err: unknown) {
      console.error("Fetch branches error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load branches.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  /* =========================================================
     CLOSE ACTION DROPDOWN ON OUTSIDE CLICK
     ========================================================= */

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest("[data-action-dropdown]")) {
        setOpenActionId(null);
        setDropdownPos(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* =========================================================
     CLOSE ON SCROLL / RESIZE
     ========================================================= */

  useEffect(() => {
    if (openActionId === null) return;

    const closeDropdown = () => {
      setOpenActionId(null);
      setDropdownPos(null);
    };

    window.addEventListener("scroll", closeDropdown, true);
    window.addEventListener("resize", closeDropdown);

    return () => {
      window.removeEventListener("scroll", closeDropdown, true);
      window.removeEventListener("resize", closeDropdown);
    };
  }, [openActionId]);

  /* =========================================================
     DATE FORMAT
     ========================================================= */

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    const formattedDate = new Date(date);

    if (Number.isNaN(formattedDate.getTime())) {
      return "-";
    }

    return formattedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  /* =========================================================
     EXPIRY STATUS
     ========================================================= */

  const getExpiryStatus = (date: string | null) => {
    if (!date) {
      return {
        text: "No expiry",
        className: "bg-surface-grey text-text-secondary",
      };
    }

    const today = new Date();
    const expiryDate = new Date(date);

    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const difference =
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return {
        text: "Expired",
        className: "bg-danger/10 text-danger",
      };
    }

    if (difference <= 30) {
      return {
        text: "Expiring Soon",
        className: "bg-warning/10 text-warning",
      };
    }

    return {
      text: "Active",
      className: "bg-success/10 text-success",
    };
  };

  /* =========================================================
     TOGGLE ACTION DROPDOWN
     ========================================================= */

  const toggleActionDropdown = (
    branchId: number,
    button: HTMLButtonElement,
  ) => {
    if (openActionId === branchId) {
      setOpenActionId(null);
      setDropdownPos(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const dropdownWidth = 160; // matches w-40 = 10rem = 160px
    const estimatedHeight = 132; // 3 items × 44 px

    // Align dropdown's right edge with the button's right edge
    let left = rect.right - dropdownWidth;

    // Keep it inside the viewport
    if (left < 8) left = 8;

    let top = rect.bottom + 4;

    // If there isn't room below, open it above the button
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = rect.top - estimatedHeight - 4;
    }

    triggerRef.current = button;

    setOpenActionId(branchId);
    setDropdownPos({ top, left });
  };

  /* =========================================================
     EDIT BRANCH
     ========================================================= */

  const handleEditClick = (branch: Branch) => {
    setOpenActionId(null);
    setDropdownPos(null);
    router.push(`/company/edit/${branch.id}`);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedBranch) return;

    try {
      setEditLoading(true);
      setEditError("");

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${selectedBranch.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(editForm),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update branch.");
      }

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === selectedBranch.id ? data.branch : branch,
        ),
      );

      setEditModalOpen(false);
      setSelectedBranch(null);
    } catch (err: unknown) {
      console.error("Update branch error:", err);

      setEditError(
        err instanceof Error ? err.message : "Unable to update branch.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  /* =========================================================
     DELETE BRANCH
     ========================================================= */

  const handleDeleteBranch = async (branch: Branch) => {
    setOpenActionId(null);
    setDropdownPos(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${branch.branch_name}"?\n\nThis will also remove all permissions assigned to this branch.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${branch.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete branch.");
      }

      setBranches((prev) => prev.filter((item) => item.id !== branch.id));
    } catch (err: unknown) {
      console.error("Delete branch error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to delete branch.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  /* =========================================================
     PERMISSION
     ========================================================= */

  const handlePermissionClick = async (branch: Branch) => {
    setOpenActionId(null);
    setDropdownPos(null);

    try {
      setSelectedBranch(branch);
      setPermissionModalOpen(true);

      setPermissionLoading(true);
      setPermissionError("");

      setMenus([]);
      setSelectedPermissions([]);

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${branch.id}/permissions`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch permissions.");
      }

      setMenus(data.menus || []);

      setSelectedPermissions(
        (data.selectedPermissionIds || []).map(Number),
      );
    } catch (err: unknown) {
      console.error("Fetch permissions error:", err);

      setPermissionError(
        err instanceof Error ? err.message : "Unable to load permissions.",
      );
    } finally {
      setPermissionLoading(false);
    }
  };

  const handlePermissionChange = (menuId: number | string) => {
    const numericMenuId = Number(menuId);

    setSelectedPermissions((prev) =>
      prev.includes(numericMenuId)
        ? prev.filter((id) => id !== numericMenuId)
        : [...prev, numericMenuId],
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedBranch) return;

    try {
      setPermissionSaving(true);
      setPermissionError("");

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${selectedBranch.id}/permissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            menu_ids: selectedPermissions,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save permissions.");
      }

      console.log("Permissions saved:", data);

      setPermissionModalOpen(false);
    } catch (err: unknown) {
      console.error("Save permissions error:", err);

      setPermissionError(
        err instanceof Error ? err.message : "Unable to save permissions.",
      );
    } finally {
      setPermissionSaving(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="min-h-screen bg-surface-grey px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-palette-dark">Branches</h1>

            <p className="mt-1 text-sm text-text-secondary">
              Manage your restaurant branches and branch information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/company/registration")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
          >
            <Plus size={17} />
            Add Branch
          </button>
        </div>

        {/* MAIN CARD */}

        <div className="relative rounded-xl border border-border bg-white shadow-sm">
          {/* SEARCH */}

          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-palette-dark">
                Branch List
              </h2>

              <p className="mt-0.5 text-xs text-text-muted">
                {filteredBranches.length}{" "}
                {filteredBranches.length === 1 ? "branch" : "branches"} found
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search branches..."
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="m-5 flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="relative w-full min-w-[900px] table-fixed border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-grey">
                  <th className="w-[20%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Branch Name
                  </th>

                  <th className="w-[12%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Phone
                  </th>

                  <th className="w-[18%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Email
                  </th>

                  <th className="w-[20%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Address
                  </th>

                  <th className="w-[13%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Expiry Date
                  </th>

                  <th className="w-[10%] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Created By
                  </th>

                  <th className="w-[7%] px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-text-secondary">
                        <Loader2 size={20} className="animate-spin" />
                        Loading branches...
                      </div>
                    </td>
                  </tr>
                ) : currentBranches.length > 0 ? (
                  currentBranches.map((branch) => {
                    const expiryStatus = getExpiryStatus(branch.expiry_date);

                    return (
                      <tr
                        key={branch.id}
                        className="transition hover:bg-surface-dark"
                      >
                        {/* BRANCH NAME */}

                        <td className="px-3 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                              {(branch.branch_name || "B")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p
                                className="truncate text-xs font-medium text-text-primary"
                                title={branch.branch_name || "-"}
                              >
                                {branch.branch_name || "-"}
                              </p>

                              <p className="mt-0.5 text-[10px] text-text-muted">
                                Branch #{branch.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* PHONE */}

                        <td className="px-3 py-3">
                          <div
                            className="truncate text-xs text-text-primary"
                            title={branch.phone || "-"}
                          >
                            {branch.phone || "-"}
                          </div>
                        </td>

                        {/* EMAIL */}

                        <td className="px-3 py-3">
                          <div
                            className="truncate text-xs text-text-primary"
                            title={branch.email || "-"}
                          >
                            {branch.email || "-"}
                          </div>
                        </td>

                        {/* ADDRESS */}

                        <td className="px-3 py-3">
                          <div
                            className="truncate text-xs text-text-secondary"
                            title={branch.address || "-"}
                          >
                            {branch.address || "-"}
                          </div>
                        </td>

                        {/* EXPIRY DATE */}

                        <td className="px-3 py-3">
                          <div>
                            <p className="whitespace-nowrap text-xs font-medium text-text-primary">
                              {formatDate(branch.expiry_date)}
                            </p>

                            <span
                              className={`mt-1 inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[9px] font-medium ${expiryStatus.className}`}
                            >
                              {expiryStatus.text}
                            </span>
                          </div>
                        </td>

                        {/* CREATED BY */}

                        <td className="px-3 py-3">
                          <span
                            className="block truncate text-xs text-text-secondary"
                            title={branch.created_by || "-"}
                          >
                            {branch.created_by || "-"}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-2 py-3">
                          <div
                            className="relative flex justify-center"
                            data-action-dropdown
                          >
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleActionDropdown(
                                  branch.id,
                                  e.currentTarget,
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface-grey hover:text-primary"
                              aria-label={`Actions for ${
                                branch.branch_name || "branch"
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-grey">
                          <Search size={20} className="text-text-muted" />
                        </div>

                        <h3 className="text-sm font-semibold text-text-primary">
                          {search
                            ? "No branches found"
                            : "No branches available"}
                        </h3>

                        <p className="mt-1 text-xs text-text-muted">
                          {search
                            ? "Try changing your search keyword."
                            : "There are currently no branches to display."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION + FOOTER */}

          {!loading && filteredBranches.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border bg-surface-dark px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-text-muted">
                Showing{" "}
                <span className="font-medium text-text-secondary">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-text-secondary">
                  {Math.min(endIndex, filteredBranches.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-text-secondary">
                  {filteredBranches.length}
                </span>{" "}
                branches
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-grey disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "border border-border bg-white text-text-secondary hover:bg-surface-grey"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-grey disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED ACTION DROPDOWN — OUTSIDE EVERY OVERFLOW CONTAINER */}

      {openActionId !== null && dropdownPos && (
        <div
          data-action-dropdown
          className="fixed z-[9999] w-40 overflow-hidden rounded-lg border border-border bg-white py-1 text-left shadow-lg"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            minWidth: "10rem",
          }}
        >
          {(() => {
            const branch = branches.find((b) => b.id === openActionId);
            if (!branch) return null;

            return (
              <>
                <button
                  type="button"
                  onClick={() => handleEditClick(branch)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text-primary transition hover:bg-surface-grey hover:text-primary"
                >
                  <Pencil size={15} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handlePermissionClick(branch)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text-primary transition hover:bg-surface-grey hover:text-primary"
                >
                  Permission
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteBranch(branch)}
                  disabled={deleteLoading}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger transition hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* EDIT MODAL */}

      {editModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => {
            if (!editLoading) {
              setEditModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-palette-dark">
                  Edit Branch
                </h2>

                {selectedBranch && (
                  <p className="mt-1 text-xs text-text-muted">
                    Branch #{selectedBranch.id}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={editLoading}
                onClick={() => setEditModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xl text-text-secondary transition hover:bg-surface-grey hover:text-primary disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="space-y-4 p-5">
                {editError && (
                  <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <AlertCircle size={18} />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Branch Name
                  </label>

                  <input
                    type="text"
                    name="branch_name"
                    value={editForm.branch_name}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter branch name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter branch address"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Expiry Date
                  </label>

                  <input
                    type="date"
                    name="expiry_date"
                    value={editForm.expiry_date}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-dark px-5 py-3">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-grey disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading && (
                    <Loader2 size={15} className="animate-spin" />
                  )}

                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSION MODAL */}

      {permissionModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setPermissionModalOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-palette-dark">
                  Branch Permissions
                </h2>

                {selectedBranch && (
                  <p className="mt-1 text-xs text-text-muted">
                    {selectedBranch.branch_name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPermissionModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xl text-text-secondary transition hover:bg-surface-grey hover:text-primary"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {permissionLoading && (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-primary" />

                  <p className="mt-3 text-sm text-text-secondary">
                    Loading permissions...
                  </p>
                </div>
              )}

              {!permissionLoading && permissionError && (
                <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={18} />
                  <span>{permissionError}</span>
                </div>
              )}

              {!permissionLoading && !permissionError && menus.length > 0 && (
                <div className="space-y-2">
                  {menus.map((menu) => (
                    <label
                      key={menu.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-grey px-4 py-3 transition hover:bg-surface-dark"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(Number(menu.id))}
                        onChange={() => handlePermissionChange(menu.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          {menu.menu}
                        </p>

                        {menu.href && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {menu.href}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!permissionLoading && !permissionError && menus.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No permissions found
                  </p>

                  <p className="mt-1 text-xs text-text-muted">
                    No menu permissions are available.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-surface-dark px-5 py-3">
              <p className="text-xs text-text-muted">
                {selectedPermissions.length} permission
                {selectedPermissions.length !== 1 ? "s" : ""} selected
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionModalOpen(false)}
                  className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-grey"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={permissionSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {permissionSaving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchList;