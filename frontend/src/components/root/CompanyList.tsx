"use client";

import { useEffect, useState } from "react";

import { Edit, Trash2, Building2, Plus, Loader2 } from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

interface Company {
  id: number;
  company_id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  restaurant_type: string;
  restaurant_types: {
    id: number;
    name: string;
  }[];
  address: string | null;
  expiry_date: string | null;
  status: number;
  status_name: string;
  created_at: string;
}

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // =========================================================
  // PAGINATION
  // =========================================================

  const [currentPage, setCurrentPage] = useState(1);

  const companiesPerPage = 10;

  const totalPages = Math.ceil(companies.length / companiesPerPage);

  const startIndex = (currentPage - 1) * companiesPerPage;

  const endIndex = startIndex + companiesPerPage;

  const currentCompanies = companies.slice(startIndex, endIndex);

  // =========================================================
  // FETCH COMPANIES
  // =========================================================

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/companies`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();

      setCompanies(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // =========================================================
  // KEEP CURRENT PAGE VALID
  // =========================================================

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit = (id: number) => {
    window.location.href = `/root/registration?id=${id}`;
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this company?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(`${API_BASE_URL}/api/companies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete company");
      }

      setCompanies((previousCompanies) =>
        previousCompanies.filter((company) => company.id !== id),
      );

      alert("Company deleted successfully.");
    } catch (error) {
      console.error("Delete error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete company.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // PAGINATION HANDLERS
  // =========================================================

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building2 size={26} className="text-text-primary" />

            <h1 className="text-2xl font-semibold text-gray-800">
              Company List
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Manage all registered companies.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/root/registration";
          }}
          className="flex items-center gap-2 rounded-lg bg-[#7d1119] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#651018]"
        >
          <Plus size={18} />
          Add Company
        </button>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full table-fixed">
          {/* =================================================
              TABLE HEADER
          ================================================= */}

          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {/* # */}
              <th className="w-[4%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                #
              </th>

              {/* Company ID */}
              <th className="w-[8%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Company ID
              </th>

              {/* Company Name */}
              <th className="w-[13%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Company Name
              </th>

              {/* Phone */}
              <th className="w-[10%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Phone
              </th>

              {/* Email */}
              <th className="w-[15%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Email
              </th>

              {/* Restaurant Type */}
              <th className="w-[14%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Restaurant Type
              </th>

              {/* Address */}
              <th className="w-[13%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Address
              </th>

              {/* Expiry Date */}
              <th className="w-[9%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Expiry Date
              </th>

              {/* Status */}
              <th className="w-[7%] px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Status
              </th>

              {/* Actions */}
              <th className="w-[7%] px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Actions
              </th>
            </tr>
          </thead>

          {/* =================================================
              TABLE BODY
          ================================================= */}

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    Loading companies...
                  </div>
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  No companies found.
                </td>
              </tr>
            ) : (
              currentCompanies.map((company, index) => (
                <tr
                  key={company.id}
                  className="transition hover:bg-gray-50"
                >
                  {/* =================================================
                      #
                  ================================================= */}

                  <td className="whitespace-nowrap px-2 py-3 text-xs text-gray-600">
                    {startIndex + index + 1}
                  </td>

                  {/* =================================================
                      COMPANY ID
                  ================================================= */}

                  <td className="whitespace-nowrap px-2 py-3 text-xs font-medium text-gray-700">
                    {company.company_id}
                  </td>

                  {/* =================================================
                      COMPANY NAME
                  ================================================= */}

                  <td className="px-2 py-3">
                    <div
                      className="truncate text-xs font-medium text-gray-800"
                      title={company.company_name}
                    >
                      {company.company_name}
                    </div>
                  </td>

                  {/* =================================================
                      PHONE
                  ================================================= */}

                  <td className="whitespace-nowrap px-2 py-3 text-xs text-gray-600">
                    {company.phone || "-"}
                  </td>

                  {/* =================================================
                      EMAIL
                  ================================================= */}

                  <td className="px-2 py-3">
                    <div
                      className="truncate text-xs text-gray-600"
                      title={company.email || "-"}
                    >
                      {company.email || "-"}
                    </div>
                  </td>

                  {/* =================================================
                      RESTAURANT TYPE
                  ================================================= */}

                  <td className="px-2 py-3">
                    <div className="flex max-w-full flex-wrap gap-1">
                      {company.restaurant_types?.length > 0 ? (
                        company.restaurant_types.map((type) => (
                          <span
                            key={type.id}
                            className="inline-flex max-w-full items-center truncate rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
                            title={type.name}
                          >
                            {type.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          No type
                        </span>
                      )}
                    </div>
                  </td>

                  {/* =================================================
                      ADDRESS
                  ================================================= */}

                  <td className="px-2 py-3">
                    <div
                      className="truncate text-xs text-gray-600"
                      title={company.address || "-"}
                    >
                      {company.address || "-"}
                    </div>
                  </td>

                  {/* =================================================
                      EXPIRY DATE
                  ================================================= */}

                  <td className="whitespace-nowrap px-2 py-3 text-xs text-gray-600">
                    {company.expiry_date
                      ? new Date(
                          company.expiry_date,
                        ).toLocaleDateString("en-GB")
                      : "-"}
                  </td>

                  {/* =================================================
                      STATUS
                  ================================================= */}

                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                        company.status === 1
                          ? "bg-green-100 text-green-700"
                          : company.status === 2
                            ? "bg-gray-100 text-gray-700"
                            : company.status === 3
                              ? "bg-red-100 text-red-700"
                              : company.status === 4
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {company.status_name || "Unknown"}
                    </span>
                  </td>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <td className="px-2 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(company.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(company.id)}
                        disabled={deletingId === company.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === company.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
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

      {/* =====================================================
          PAGINATION + TOTAL
      ===================================================== */}

      {!loading && companies.length > 0 && (
        <div className="flex items-center justify-between">
          {/* Total */}

          <div className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-700">
              {Math.min(endIndex, companies.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {companies.length}
            </span>{" "}
            companies
          </div>

          {/* Pagination */}

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Previous */}

              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {/* Page Numbers */}

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
                      ? "bg-[#7d1119] text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next */}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}