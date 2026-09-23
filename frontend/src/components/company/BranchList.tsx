"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

const BranchList = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openActionId, setOpenActionId] = useState(null);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [menus, setMenus] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionSaving, setPermissionSaving] = useState(false);
  
  /* =========================================================
     FETCH BRANCHES
     ========================================================= */

  useEffect(() => {
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

        /*
         * Expected response:
         *
         * {
         *   success: true,
         *   branches: [...]
         * }
         */

        setBranches(data.branches || []);
      } catch (err) {
        console.error("Fetch branches error:", err);

        setError(err.message || "Unable to load branches.");
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  /* =========================================================
     SEARCH
     ========================================================= */

  const filteredBranches = branches.filter((branch) => {
    const searchValue = search.toLowerCase();

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
     DATE FORMAT
     ========================================================= */

  const formatDate = (date) => {
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

  const getExpiryStatus = (date) => {
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

    const difference = (expiryDate - today) / (1000 * 60 * 60 * 24);

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
     RENDER
     ========================================================= */

 const handlePermissionClick = async (branch) => {
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch permissions."
      );
    }

    // Menus available to the logged-in user
    setMenus(data.menus || []);

    // Menus currently assigned to this branch
    setSelectedPermissions(
      (data.selectedPermissionIds || []).map(Number)
    );
  } catch (err) {
    console.error("Fetch permissions error:", err);

    setPermissionError(
      err.message || "Unable to load permissions."
    );
  } finally {
    setPermissionLoading(false);
  }
};

  const handlePermissionChange = (menuId) => {
    setSelectedPermissions((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId],
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to save permissions."
      );
    }

    console.log("Permissions saved:", data);

    setPermissionModalOpen(false);
  } catch (err) {
    console.error("Save permissions error:", err);

    setPermissionError(
      err.message || "Unable to save permissions."
    );
  } finally {
    setPermissionSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-surface-grey px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ===================================================== */}

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

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {/* ===================================================
              TABLE HEADER / SEARCH
          =================================================== */}

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

            {/* Search */}

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

          {/* ===================================================
              ERROR
          =================================================== */}

          {error && (
            <div className="m-5 flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertCircle size={18} />

              <span>{error}</span>
            </div>
          )}

          {/* ===================================================
              TABLE
          =================================================== */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              {/* Table Head */}

              <thead>
                <tr className="border-b border-border bg-surface-grey">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Branch Name
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Phone
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Email
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Address
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Expiry Date
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Created By
                  </th>

                  <th className="w-16 px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Action
                  </th>
                </tr>
              </thead>

              {/* Table Body */}

              <tbody className="divide-y divide-border">
                {/* =================================================
                    LOADING
                ================================================= */}

                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <Loader2
                          size={28}
                          className="animate-spin text-primary"
                        />

                        <p className="mt-3 text-sm text-text-secondary">
                          Loading branches...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredBranches.length > 0 ? (
                  /* =================================================
                     BRANCHES
                  ================================================= */

                  filteredBranches.map((branch) => {
                    const expiryStatus = getExpiryStatus(branch.expiry_date);

                    return (
                      <tr
                        key={branch.id}
                        className="transition hover:bg-surface-dark"
                      >
                        {/* Branch Name */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                              {(branch.branch_name || "B")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="font-medium text-text-primary">
                                {branch.branch_name || "-"}
                              </p>

                              <p className="mt-0.5 text-xs text-text-muted">
                                Branch #{branch.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-text-primary">
                            <Phone
                              size={15}
                              className="shrink-0 text-text-muted"
                            />

                            {branch.phone || "-"}
                          </div>
                        </td>

                        {/* Email */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-text-primary">
                            <Mail
                              size={15}
                              className="shrink-0 text-text-muted"
                            />

                            {branch.email || "-"}
                          </div>
                        </td>

                        {/* Address */}

                        <td className="max-w-[250px] px-5 py-4">
                          <div className="flex items-start gap-2 text-sm text-text-secondary">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0 text-text-muted"
                            />

                            <span className="truncate">
                              {branch.address || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Expiry Date */}

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {formatDate(branch.expiry_date)}
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${expiryStatus.className}`}
                            >
                              {expiryStatus.text}
                            </span>
                          </div>
                        </td>

                        {/* Created By */}

                        <td className="px-5 py-4">
                          <span className="text-sm text-text-secondary">
                            {branch.created_by || "-"}
                          </span>
                        </td>

                        {/* Action */}

                        <td className="px-5 py-4 text-center">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionId((prev) =>
                                  prev === branch.id ? null : branch.id,
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface-grey hover:text-primary"
                              aria-label={`Actions for ${
                                branch.branch_name || "branch"
                              }`}
                            >
                              <MoreVertical size={17} />
                            </button>

                            {/* Dropdown */}

                            {openActionId === branch.id && (
                              <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-lg border border-border bg-white py-1 text-left shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    handlePermissionClick(branch);
                                  }}
                                  className="flex w-full items-center px-3 py-2.5 text-sm text-text-primary transition hover:bg-surface-grey hover:text-primary"
                                >
                                  Permission
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  /* =================================================
                     EMPTY STATE
                  ================================================= */

                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-grey">
                          <Search size={22} className="text-text-muted" />
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

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <div className="flex items-center justify-between border-t border-border bg-surface-dark px-5 py-3">
            <p className="text-xs text-text-muted">
              Showing{" "}
              <span className="font-medium text-text-secondary">
                {filteredBranches.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-text-secondary">
                {branches.length}
              </span>{" "}
              branches
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          PERMISSION MODAL
      ===================================================== */}

      {permissionModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setPermissionModalOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {/* Loading */}
              {permissionLoading && (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-primary" />

                  <p className="mt-3 text-sm text-text-secondary">
                    Loading permissions...
                  </p>
                </div>
              )}

              {/* Error */}
              {!permissionLoading && permissionError && (
                <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={18} />

                  <span>{permissionError}</span>
                </div>
              )}

              {/* Menu Permissions */}
              {!permissionLoading && !permissionError && menus.length > 0 && (
                <div className="space-y-2">
                  {menus.map((menu) => (
                    <label
                      key={menu.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-grey px-4 py-3 transition hover:bg-surface-dark"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(menu.id)}
                        onChange={() => handlePermissionChange(menu.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />

                      {/* Menu Information */}
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

              {/* No Permissions */}
              {!permissionLoading && !permissionError && menus.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No permissions found
                  </p>

                  <p className="mt-1 text-xs text-text-muted">
                    No menu permissions are assigned to this branch.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
