"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../constants/api";

const EmployeeList = () => {
  /* ======================================================
     STATE
     ====================================================== */

  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");

  const [saveError, setSaveError] = useState("");

  const [formData, setFormData] = useState({});

  /* ======================================================
     FETCH EMPLOYEES
     ====================================================== */

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/employees/list-employees?page=${page}&limit=${limit}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch employees.",
        );
      }

      setEmployees(data.employees || []);

      setPagination(
        data.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (error) {
      console.error("Fetch employees error:", error);

      setError(
        error.message || "Unable to load employees.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     FETCH WHEN PAGE CHANGES
     ====================================================== */

  useEffect(() => {
    fetchEmployees();
  }, [page]);

  /* ======================================================
     OPEN EMPLOYEE MODAL
     ====================================================== */

  const openEmployeeModal = (employee) => {
    setSelectedEmployee(employee);

    setFormData({
      package_id: employee.package_id ?? "",
      public_id: employee.public_id ?? "",
      first_name: employee.first_name ?? "",
      personal_email: employee.personal_email ?? "",
      phone: employee.phone ?? "",
      date_of_birth: employee.date_of_birth
        ? String(employee.date_of_birth).slice(0, 10)
        : "",
      gender: employee.gender ?? "",
      blood_group: employee.blood_group ?? "",
      marital_status: employee.marital_status ?? "",
      national_id: employee.national_id ?? "",
      passport_number: employee.passport_number ?? "",
      address: employee.address ?? "",
      emergency_contact_name:
        employee.emergency_contact_name ?? "",
      emergency_contact_phone:
        employee.emergency_contact_phone ?? "",
      emergency_contact_relation:
        employee.emergency_contact_relation ?? "",
      joining_date: employee.joining_date
        ? String(employee.joining_date).slice(0, 10)
        : "",
      confirmation_date: employee.confirmation_date
        ? String(employee.confirmation_date).slice(0, 10)
        : "",
      employment_status:
        employee.employment_status ?? "active",
      driving_lecense:
        employee.driving_lecense ?? "",
      photo: null,
    });

    setIsEditMode(false);

    setSaveMessage("");
    setSaveError("");

    setShowModal(true);
  };

  /* ======================================================
     CLOSE MODAL
     ====================================================== */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setSelectedEmployee(null);
    setIsEditMode(false);
    setSaveMessage("");
    setSaveError("");
  };

  /* ======================================================
     FORM CHANGE
     ====================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ======================================================
     PHOTO CHANGE
     ====================================================== */

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 50 * 1024) {
      setSaveError(
        "Employee photo must be smaller than 50 KB.",
      );

      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSaveError(
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
      );

      e.target.value = "";
      return;
    }

    setSaveError("");

    setFormData((prev) => ({
      ...prev,
      photo: file,
    }));
  };

  /* ======================================================
     UPDATE EMPLOYEE
     ====================================================== */

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) return;

    try {
      setSaving(true);

      setSaveMessage("");
      setSaveError("");

      const form = new FormData();

      form.append(
        "package_id",
        formData.package_id || "",
      );

      form.append(
        "employee_id",
        formData.public_id || "",
      );

      form.append(
        "first_name",
        formData.first_name || "",
      );

      form.append(
        "personal_email",
        formData.personal_email || "",
      );

      form.append(
        "phone",
        formData.phone || "",
      );

      form.append(
        "date_of_birth",
        formData.date_of_birth || "",
      );

      form.append(
        "gender",
        formData.gender || "",
      );

      form.append(
        "blood_group",
        formData.blood_group || "",
      );

      form.append(
        "marital_status",
        formData.marital_status || "",
      );

      form.append(
        "national_id",
        formData.national_id || "",
      );

      form.append(
        "passport_number",
        formData.passport_number || "",
      );

      form.append(
        "address",
        formData.address || "",
      );

      form.append(
        "emergency_contact_name",
        formData.emergency_contact_name || "",
      );

      form.append(
        "emergency_contact_phone",
        formData.emergency_contact_phone || "",
      );

      form.append(
        "emergency_contact_relation",
        formData.emergency_contact_relation || "",
      );

      form.append(
        "joining_date",
        formData.joining_date || "",
      );

      form.append(
        "confirmation_date",
        formData.confirmation_date || "",
      );

      form.append(
        "employment_status",
        formData.employment_status || "active",
      );

      form.append(
        "driving_lecense",
        formData.driving_lecense || "",
      );

      if (formData.photo) {
        form.append("photo", formData.photo);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/employees/update-employee/${selectedEmployee.id}`,
        {
          method: "PUT",
          credentials: "include",
          body: form,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update employee.",
        );
      }

      setSaveMessage(
        data.message || "Employee updated successfully.",
      );

      setIsEditMode(false);

      /* Refresh list */
      await fetchEmployees();

      /* Refresh selected employee information */
      const employeeResponse = await fetch(
        `${API_BASE_URL}/api/employees/employee/${selectedEmployee.id}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const employeeData =
        await employeeResponse.json();

      if (employeeResponse.ok) {
        setSelectedEmployee(employeeData.employee);

        setFormData((prev) => ({
          ...prev,

          package_id:
            employeeData.employee.package_id ?? "",

          public_id:
            employeeData.employee.public_id ?? "",

          first_name:
            employeeData.employee.first_name ?? "",

          personal_email:
            employeeData.employee.personal_email ?? "",

          phone:
            employeeData.employee.phone ?? "",

          date_of_birth:
            employeeData.employee.date_of_birth
              ? String(
                  employeeData.employee.date_of_birth,
                ).slice(0, 10)
              : "",

          gender:
            employeeData.employee.gender ?? "",

          blood_group:
            employeeData.employee.blood_group ?? "",

          marital_status:
            employeeData.employee.marital_status ?? "",

          national_id:
            employeeData.employee.national_id ?? "",

          passport_number:
            employeeData.employee.passport_number ?? "",

          address:
            employeeData.employee.address ?? "",

          emergency_contact_name:
            employeeData.employee
              .emergency_contact_name ?? "",

          emergency_contact_phone:
            employeeData.employee
              .emergency_contact_phone ?? "",

          emergency_contact_relation:
            employeeData.employee
              .emergency_contact_relation ?? "",

          joining_date:
            employeeData.employee.joining_date
              ? String(
                  employeeData.employee.joining_date,
                ).slice(0, 10)
              : "",

          confirmation_date:
            employeeData.employee.confirmation_date
              ? String(
                  employeeData.employee.confirmation_date,
                ).slice(0, 10)
              : "",

          employment_status:
            employeeData.employee
              .employment_status ?? "active",

          driving_lecense:
            employeeData.employee
              .driving_lecense ?? "",

          photo: null,
        }));
      }
    } catch (error) {
      console.error("Update employee error:", error);

      setSaveError(
        error.message || "Unable to update employee.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     IMAGE URL
     ====================================================== */

  const getPhotoUrl = (photo) => {
    if (!photo) return null;

    return `${API_BASE_URL}/uploads/employees/${photo}`;
  };

  /* ======================================================
     PAGINATION
     ====================================================== */

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  /* ======================================================
     LOADING
     ====================================================== */

  if (loading) {
    return (
      <div className="p-6 text-center">
        Loading employees...
      </div>
    );
  }

  /* ======================================================
     MAIN UI
     ====================================================== */

  return (
    <div className="p-6">
      {/* ==================================================
          HEADER
          ================================================== */}

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Employee List
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Total Employees: {pagination.total}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEmployees}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {/* ==================================================
          ERROR
          ================================================== */}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ==================================================
          TABLE
          ================================================== */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                  #
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                  Photo
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                  Employee ID
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                  Full Name
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    onClick={() =>
                      openEmployeeModal(employee)
                    }
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    {/* Serial */}
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {(page - 1) * limit + index + 1}
                    </td>

                    {/* Photo */}
                    <td className="px-5 py-4">
                      {employee.photo ? (
                        <img
                          src={getPhotoUrl(employee.photo)}
                          alt={employee.first_name || "Employee"}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-500">
                          {employee.first_name
                            ?.charAt(0)
                            ?.toUpperCase() || "?"}
                        </div>
                      )}
                    </td>

                    {/* Employee ID */}
                    <td className="px-5 py-4 text-sm font-medium text-gray-800">
                      {employee.public_id}
                    </td>

                    {/* Full Name */}
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {employee.first_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ==================================================
            PAGINATION
            ================================================== */}

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of{" "}
            {pagination.totalPages || 1}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={
                page >= pagination.totalPages
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================
          EMPLOYEE MODAL
          ================================================== */}

      {showModal && selectedEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ==================================================
                MODAL HEADER
                ================================================== */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Employee Details
                </h2>

                <p className="text-sm text-gray-500">
                  {selectedEmployee.public_id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            {/* ==================================================
                PHOTO
                ================================================== */}

            <div className="flex flex-col items-center px-6 pt-6">
              {selectedEmployee.photo ? (
                <img
                  src={getPhotoUrl(
                    selectedEmployee.photo,
                  )}
                  alt={selectedEmployee.first_name}
                  className="h-32 w-32 rounded-full border-4 border-gray-100 object-cover shadow"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-200 text-4xl font-bold text-gray-500">
                  {selectedEmployee.first_name
                    ?.charAt(0)
                    ?.toUpperCase() || "?"}
                </div>
              )}

              <h3 className="mt-3 text-lg font-semibold text-gray-800">
                {selectedEmployee.first_name}
              </h3>

              <p className="text-sm text-gray-500">
                Employee ID:{" "}
                {selectedEmployee.public_id}
              </p>
            </div>

            {/* ==================================================
                VIEW MODE
                ================================================== */}

            {!isEditMode && (
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoItem
                    label="Package ID"
                    value={
                      selectedEmployee.package_id
                    }
                  />

                  <InfoItem
                    label="Created By ID"
                    value={
                      selectedEmployee.created_by_id
                    }
                  />

                  <InfoItem
                    label="Updated By ID"
                    value={
                      selectedEmployee.updated_by_id
                    }
                  />

                  <InfoItem
                    label="Public ID / Employee ID"
                    value={
                      selectedEmployee.public_id
                    }
                  />

                  <InfoItem
                    label="Full Name"
                    value={
                      selectedEmployee.first_name
                    }
                  />

                  <InfoItem
                    label="Personal Email"
                    value={
                      selectedEmployee.personal_email
                    }
                  />

                  <InfoItem
                    label="Phone"
                    value={
                      selectedEmployee.phone
                    }
                  />

                  <InfoItem
                    label="Date of Birth"
                    value={
                      selectedEmployee.date_of_birth
                    }
                  />

                  <InfoItem
                    label="Gender"
                    value={
                      selectedEmployee.gender
                    }
                  />

                  <InfoItem
                    label="Blood Group"
                    value={
                      selectedEmployee.blood_group
                    }
                  />

                  <InfoItem
                    label="Marital Status"
                    value={
                      selectedEmployee.marital_status
                    }
                  />

                  <InfoItem
                    label="National ID"
                    value={
                      selectedEmployee.national_id
                    }
                  />

                  <InfoItem
                    label="Passport Number"
                    value={
                      selectedEmployee.passport_number
                    }
                  />

                  <InfoItem
                    label="Joining Date"
                    value={
                      selectedEmployee.joining_date
                    }
                  />

                  <InfoItem
                    label="Confirmation Date"
                    value={
                      selectedEmployee.confirmation_date
                    }
                  />

                  <InfoItem
                    label="Employment Status"
                    value={
                      selectedEmployee.employment_status
                    }
                  />

                  <InfoItem
                    label="Driving License"
                    value={
                      selectedEmployee.driving_lecense
                    }
                  />

                  <InfoItem
                    label="Emergency Contact Name"
                    value={
                      selectedEmployee
                        .emergency_contact_name
                    }
                  />

                  <InfoItem
                    label="Emergency Contact Phone"
                    value={
                      selectedEmployee
                        .emergency_contact_phone
                    }
                  />

                  <InfoItem
                    label="Emergency Contact Relation"
                    value={
                      selectedEmployee
                        .emergency_contact_relation
                    }
                  />

                  <div className="md:col-span-2">
                    <InfoItem
                      label="Address"
                      value={
                        selectedEmployee.address
                      }
                    />
                  </div>
                </div>

                {/* Update button */}
                {/* <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMessage("");
                      setSaveError("");
                      setIsEditMode(true);
                    }}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Update Employee
                  </button>
                </div> */}
              </div>
            )}

            {/* ==================================================
                EDIT MODE
                ================================================== */}

            {isEditMode && (
              <form
                onSubmit={handleUpdate}
                className="p-6"
              >
                {saveError && (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {saveError}
                  </div>
                )}

                {saveMessage && (
                  <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
                    {saveMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormInput
                    label="Package ID"
                    name="package_id"
                    value={formData.package_id}
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Employee ID"
                    name="public_id"
                    value={formData.public_id}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Full Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Personal Email"
                    name="personal_email"
                    type="email"
                    value={formData.personal_email}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Blood Group"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Marital Status"
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="National ID"
                    name="national_id"
                    value={formData.national_id}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Passport Number"
                    name="passport_number"
                    value={formData.passport_number}
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Driving License"
                    name="driving_lecense"
                    value={formData.driving_lecense}
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Emergency Contact Name"
                    name="emergency_contact_name"
                    value={
                      formData.emergency_contact_name
                    }
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Emergency Contact Phone"
                    name="emergency_contact_phone"
                    value={
                      formData.emergency_contact_phone
                    }
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Emergency Contact Relation"
                    name="emergency_contact_relation"
                    value={
                      formData.emergency_contact_relation
                    }
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Joining Date"
                    name="joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    required
                  />

                  <FormInput
                    label="Confirmation Date"
                    name="confirmation_date"
                    type="date"
                    value={
                      formData.confirmation_date
                    }
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Employment Status"
                    name="employment_status"
                    value={
                      formData.employment_status
                    }
                    onChange={handleChange}
                  />

                  {/* Photo */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Employee Photo
                    </label>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      Maximum size: 50 KB
                    </p>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Address
                    </label>

                    <textarea
                      name="address"
                      value={formData.address || ""}
                      onChange={handleChange}
                      rows={3}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* ==================================================
                    BUTTONS
                    ================================================== */}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setSaveError("");
                      setSaveMessage("");
                    }}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Updating..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


/* ======================================================
   INFO ITEM
   ====================================================== */

const InfoItem = ({ label, value }) => {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-gray-800">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : String(value)}
      </p>
    </div>
  );
};


/* ======================================================
   FORM INPUT
   ====================================================== */

const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}) => {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
};

export default EmployeeList;