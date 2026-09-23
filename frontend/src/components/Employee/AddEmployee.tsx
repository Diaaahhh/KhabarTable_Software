"use client";

import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../constants/api";
/* =========================================================
   CUSTOM DATE PICKER
   ========================================================= */

const CustomDatePicker = ({ value, onChange, placeholder = "Select date" }) => {
  const calendarRef = useRef(null);

  const today = new Date();

  const [isOpen, setIsOpen] = useState(false);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split("-").map(Number);

      if (year && month) {
        return new Date(year, month - 1, 1);
      }
    }

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [showMonths, setShowMonths] = useState(false);
  const [showYears, setShowYears] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  /*
    Years available in the year dropdown.

    1950 -> current year + 10
  */
  const currentYear = today.getFullYear();

  const years = Array.from(
    { length: currentYear + 10 - 1950 + 1 },
    (_, index) => 1950 + index,
  );

  /* =========================================================
     CLOSE WHEN CLICKING OUTSIDE
     ========================================================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowMonths(false);
        setShowYears(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* =========================================================
     ESCAPE KEY
     ========================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowMonths(false);
        setShowYears(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* =========================================================
     CALENDAR DATA
     ========================================================= */

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previousMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = [];

  /*
    Previous month's dates
  */
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: previousMonthDays - i,
      currentMonth: false,
      date: new Date(year, month - 1, previousMonthDays - i),
    });
  }

  /*
    Current month's dates
  */
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      currentMonth: true,
      date: new Date(year, month, day),
    });
  }

  /*
    Next month's dates
  */
  const remainingDays = 42 - calendarDays.length;

  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      currentMonth: false,
      date: new Date(year, month + 1, day),
    });
  }

  /* =========================================================
     FORMAT DATE
     ========================================================= */

  const formatDateValue = (date) => {
    const selectedYear = date.getFullYear();
    const selectedMonth = String(date.getMonth() + 1).padStart(2, "0");
    const selectedDay = String(date.getDate()).padStart(2, "0");

    return `${selectedYear}-${selectedMonth}-${selectedDay}`;
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return placeholder;

    const [selectedYear, selectedMonth, selectedDay] = dateValue
      .split("-")
      .map(Number);

    const date = new Date(selectedYear, selectedMonth - 1, selectedDay);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  /* =========================================================
     SELECT DATE
     ========================================================= */

  const handleDateSelect = (date) => {
    const formattedDate = formatDateValue(date);

    onChange(formattedDate);

    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));

    setIsOpen(false);
    setShowMonths(false);
    setShowYears(false);
  };

  /* =========================================================
     MONTH NAVIGATION
     ========================================================= */

  const goToPreviousMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  /* =========================================================
     CHANGE MONTH
     ========================================================= */

  const changeMonth = (monthIndex) => {
    setViewDate(new Date(year, monthIndex, 1));

    setShowMonths(false);
  };

  /* =========================================================
     CHANGE YEAR
     ========================================================= */

  const changeYear = (selectedYear) => {
    setViewDate(new Date(selectedYear, month, 1));

    setShowYears(false);
  };

  /* =========================================================
     CHECK SELECTED DATE
     ========================================================= */

  const isSelectedDate = (date) => {
    if (!value) return false;

    return formatDateValue(date) === value;
  };

  /* =========================================================
     CHECK TODAY
     ========================================================= */

  const isToday = (date) => {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  return (
    <div ref={calendarRef} className="relative w-full">
      {/* =====================================================
          DATE INPUT BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setShowMonths(false);
          setShowYears(false);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition hover:border-primary focus:border-primary"
      >
        <span className={value ? "text-text-primary" : "text-text-muted"}>
          {formatDisplayDate(value)}
        </span>

        {/* Calendar SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-text-secondary"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />

          <line x1="16" y1="2" x2="16" y2="6" />

          <line x1="8" y1="2" x2="8" y2="6" />

          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {/* =====================================================
          CALENDAR POPUP
      ===================================================== */}

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[300px] rounded-xl border border-border bg-white p-3 shadow-xl">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-3 flex items-center justify-between">
            {/* Previous Month */}
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface-grey hover:text-primary"
              aria-label="Previous month"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Month + Year */}
            <div className="flex items-center gap-1">
              {/* Month */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonths((prev) => !prev);
                    setShowYears(false);
                  }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-primary transition hover:bg-surface-grey"
                >
                  {months[month]}

                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Month Dropdown */}
                {showMonths && (
                  <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-32 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg">
                    {months.map((monthName, index) => (
                      <button
                        key={monthName}
                        type="button"
                        onClick={() => changeMonth(index)}
                        className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                          index === month
                            ? "bg-primary text-white"
                            : "text-text-primary hover:bg-surface-grey"
                        }`}
                      >
                        {monthName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowYears((prev) => !prev);
                    setShowMonths(false);
                  }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-primary transition hover:bg-surface-grey"
                >
                  {year}

                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Year Dropdown */}
                {showYears && (
                  <div className="absolute right-0 top-full z-50 mt-1 max-h-52 w-20 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg">
                    {years.map((yearItem) => (
                      <button
                        key={yearItem}
                        type="button"
                        onClick={() => changeYear(yearItem)}
                        className={`w-full rounded-md px-2 py-2 text-center text-xs transition ${
                          yearItem === year
                            ? "bg-primary text-white"
                            : "text-text-primary hover:bg-surface-grey"
                        }`}
                      >
                        {yearItem}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Month */}
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface-grey hover:text-primary"
              aria-label="Next month"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* =================================================
              WEEK DAYS
          ================================================= */}

          <div className="mb-1 grid grid-cols-7">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="flex h-7 items-center justify-center text-[10px] font-medium text-text-muted"
              >
                {day}
              </div>
            ))}
          </div>

          {/* =================================================
              CALENDAR DATES
          ================================================= */}

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((item, index) => {
              const selected = isSelectedDate(item.date);
              const todayDate = isToday(item.date);

              return (
                <button
                  key={`${item.date.toISOString()}-${index}`}
                  type="button"
                  onClick={() => handleDateSelect(item.date)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md text-xs transition ${
                    selected
                      ? "bg-primary font-semibold text-white"
                      : item.currentMonth
                        ? "text-text-primary hover:bg-primary/10 hover:text-primary"
                        : "text-text-muted/50"
                  } ${
                    !selected && todayDate
                      ? "font-semibold text-primary ring-1 ring-primary/40"
                      : ""
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* =================================================
              TODAY BUTTON
          ================================================= */}

          <div className="mt-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => handleDateSelect(today)}
              className="w-full rounded-md py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
const AddEmployee = () => {
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    preferred_name: "",
    employee_email: "",
    personal_email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    marital_status: "",
    national_id: "",
    passport_number: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    joining_date: "",
    confirmation_date: "",
    leaving_date: "",
    employment_status: "active",
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({
    type: "",
    text: "",
  });

  /* =========================================================
     HANDLE INPUT
     ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Remove error once user starts correcting the field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleNameChange = (e) => {
    const { name, value } = e.target;

    // Allow alphabets and spaces only
    const filteredValue = value.replace(/[^A-Za-z\s]/g, "");

    setFormData((prev) => ({
      ...prev,
      [name]: filteredValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };
  /* =========================================================
     NUMBER ONLY
     ========================================================= */

  const handleNumberChange = (e, maxLength = null) => {
    let value = e.target.value.replace(/\D/g, "");

    if (maxLength) {
      value = value.slice(0, maxLength);
    }

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));

    if (errors[e.target.name]) {
      setErrors((prev) => ({
        ...prev,
        [e.target.name]: "",
      }));
    }
  };

  /* =========================================================
     EMAIL VALIDATION
     ========================================================= */

  const isValidEmail = (email) => {
    return email.includes("@") && email.includes(".");
  };

  /* =========================================================
     DATE PICKER
     ========================================================= */

  /* =========================================================
     PHOTO COMPRESSOR
     ========================================================= */

  const compressImage = (file, maxSize = 50 * 1024) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const image = new Image();

        image.onload = () => {
          const canvas = document.createElement("canvas");

          // Crop to 1:1
          const size = Math.min(image.width, image.height);

          const sourceX = (image.width - size) / 2;
          const sourceY = (image.height - size) / 2;

          // Keep the final image reasonably small for performance
          const outputSize = Math.min(size, 800);

          canvas.width = outputSize;
          canvas.height = outputSize;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas is not supported."));
            return;
          }

          ctx.drawImage(
            image,
            sourceX,
            sourceY,
            size,
            size,
            0,
            0,
            outputSize,
            outputSize,
          );

          let quality = 0.9;

          const compress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Unable to compress image."));
                  return;
                }

                // If already under 50KB
                if (blob.size <= maxSize || quality <= 0.1) {
                  resolve(
                    new File([blob], "employee-photo.jpg", {
                      type: "image/jpeg",
                    }),
                  );
                  return;
                }

                quality -= 0.1;
                compress();
              },
              "image/jpeg",
              quality,
            );
          };

          compress();
        };

        image.onerror = () => {
          reject(new Error("Invalid image."));
        };

        image.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error("Unable to read image."));
      };

      reader.readAsDataURL(file);
    });
  };

  /* =========================================================
     PHOTO UPLOAD
     ========================================================= */

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please upload an image file.");
      return;
    }

    try {
      const compressedFile = await compressImage(file);

      if (compressedFile.size > 50 * 1024) {
        setPhotoError("Unable to reduce the image below 50 KB.");
        return;
      }

      setPhoto(compressedFile);

      const previewUrl = URL.createObjectURL(compressedFile);
      setPhotoPreview(previewUrl);
    } catch (error) {
      setPhotoError("Unable to process this image.");
    }
  };

  /* =========================================================
     VALIDATION
     ========================================================= */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = "Employee ID is required.";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required.";
    }

    if (!formData.employee_email.trim()) {
      newErrors.employee_email = "Employee email is required.";
    } else if (!isValidEmail(formData.employee_email)) {
      newErrors.employee_email = "Enter a valid email address.";
    }

    if (!formData.personal_email.trim()) {
      newErrors.personal_email = "Personal email is required.";
    } else if (!isValidEmail(formData.personal_email)) {
      newErrors.personal_email = "Enter a valid email address.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (formData.phone.length > 11) {
      newErrors.phone = "Phone number cannot exceed 11 digits.";
    }

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = "Date of birth is required.";
    }

    if (!formData.gender) {
      newErrors.gender = "Please select gender.";
    }

    if (!formData.blood_group) {
      newErrors.blood_group = "Please select blood group.";
    }

    if (!formData.marital_status) {
      newErrors.marital_status = "Please select marital status.";
    }

    if (!formData.national_id.trim()) {
      newErrors.national_id = "National ID is required.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required.";
    }

    if (
      formData.emergency_contact_phone &&
      formData.emergency_contact_phone.length > 11
    ) {
      newErrors.emergency_contact_phone =
        "Emergency contact phone cannot exceed 11 digits.";
    }

    if (!formData.joining_date) {
      newErrors.joining_date = "Joining date is required.";
    }

    return newErrors;
  };

  /* =========================================================
   SUBMIT
   ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous submit message
    setSubmitMessage({
      type: "",
      text: "",
    });

    // Validate form
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      /*
      FormData is required because the employee photo
      is being uploaded together with the employee data.
    */

      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      /*
      Add photo if the user selected one.

      The backend will save it inside:

      uploads/employees
    */

      if (photo) {
        data.append("photo", photo);
      }

      // --------------------------------------------------
      // Send data to backend
      // --------------------------------------------------

      const response = await fetch(
        `${API_BASE_URL}/api/employees/create-employee`,
        {
          method: "POST",

          /*
          IMPORTANT:

          Do NOT manually set Content-Type.

          Browser automatically sets:

          multipart/form-data; boundary=...
        */

          credentials: "include",

          body: data,
        },
      );

      // --------------------------------------------------
      // Read backend response
      // --------------------------------------------------

      const result = await response.json();

      // --------------------------------------------------
      // Backend returned an error
      // --------------------------------------------------

      if (!response.ok) {
        setSubmitMessage({
          type: "error",
          text: result.message || "Failed to create employee.",
        });

        return;
      }

      // --------------------------------------------------
      // Success
      // --------------------------------------------------

      setSubmitMessage({
        type: "success",
        text: result.message || "Employee created successfully.",
      });

      // --------------------------------------------------
      // Reset form
      // --------------------------------------------------

      setFormData({
        employee_id: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        preferred_name: "",
        employee_email: "",
        personal_email: "",
        phone: "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
        marital_status: "",
        national_id: "",
        passport_number: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relation: "",
        joining_date: "",
        confirmation_date: "",
        leaving_date: "",
        employment_status: "active",
      });

      setPhoto(null);
      setPhotoPreview("");
      setPhotoError("");
      setErrors({});

      // Clear file input if needed
      e.target.reset();
    } catch (error) {
      console.error("Create employee error:", error);

      setSubmitMessage({
        type: "error",
        text: "Unable to connect to the server. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     STYLES
     ========================================================= */

  const inputStyle =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

  const labelStyle = "mb-1.5 block text-sm font-medium text-text-primary";

  const errorStyle = "mt-1 text-xs text-danger";

  const sectionTitle =
    "mb-5 flex items-center gap-3 text-base font-semibold text-palette-dark";

  /* =========================================================
     DATE FIELD COMPONENT
     ========================================================= */

  /* =========================================================
   DATE FIELD COMPONENT
   ========================================================= */

  const DateField = ({ label, name, required = false }) => (
    <div>
      <label className={labelStyle}>
        {label}

        {required && <span className="ml-1 text-danger">*</span>}
      </label>

      <CustomDatePicker
        value={formData[name]}
        onChange={(value) => {
          setFormData((prev) => ({
            ...prev,
            [name]: value,
          }));

          if (errors[name]) {
            setErrors((prev) => ({
              ...prev,
              [name]: "",
            }));
          }
        }}
        placeholder={`Select ${label.toLowerCase()}`}
      />

      {errors[name] && <p className={errorStyle}>{errors[name]}</p>}
    </div>
  );

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="min-h-screen bg-surface-grey px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-palette-dark">Add Employee</h1>

          <p className="mt-1 text-sm text-text-secondary">
            Create a new employee profile and employment record.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className={sectionTitle}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                01
              </span>

              <span>Personal Information</span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* Employee ID */}
              <div>
                <label className={labelStyle}>
                  Employee ID <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                  className={inputStyle}
                />

                {errors.employee_id && (
                  <p className={errorStyle}>{errors.employee_id}</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className={labelStyle}>
                  First Name <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleNameChange}
                  placeholder="Enter first name"
                  className={inputStyle}
                />

                {errors.first_name && (
                  <p className={errorStyle}>{errors.first_name}</p>
                )}
              </div>

              {/* Middle Name */}
              <div>
                <label className={labelStyle}>
                  Middle Name{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleNameChange}
                  placeholder="Enter middle name"
                  className={inputStyle}
                />
              </div>

              {/* Last Name */}
              <div>
                <label className={labelStyle}>
                  Last Name{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleNameChange}
                  placeholder="Enter last name"
                  className={inputStyle}
                />
              </div>

              {/* Preferred Name */}
              <div>
                <label className={labelStyle}>
                  Preferred Name{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  name="preferred_name"
                  value={formData.preferred_name}
                  onChange={handleNameChange}
                  placeholder="Enter preferred name"
                  className={inputStyle}
                />
              </div>

              {/* Gender */}
              <div>
                <label className={labelStyle}>
                  Gender <span className="text-danger">*</span>
                </label>

                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={inputStyle}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="others">Others</option>
                </select>

                {errors.gender && <p className={errorStyle}>{errors.gender}</p>}
              </div>

              {/* Blood Group */}
              <div>
                <label className={labelStyle}>
                  Blood Group <span className="text-danger">*</span>
                </label>

                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  className={inputStyle}
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>

                {errors.blood_group && (
                  <p className={errorStyle}>{errors.blood_group}</p>
                )}
              </div>

              {/* Marital Status */}
              <div>
                <label className={labelStyle}>
                  Marital Status <span className="text-danger">*</span>
                </label>

                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  className={inputStyle}
                >
                  <option value="">Select marital status</option>
                  <option value="married">Married</option>
                  <option value="unmarried">Unmarried</option>
                  <option value="divorcee">Divorcee</option>
                  <option value="widow">Widow</option>
                </select>

                {errors.marital_status && (
                  <p className={errorStyle}>{errors.marital_status}</p>
                )}
              </div>

              {/* Date of Birth */}
              <DateField label="Date of Birth" name="date_of_birth" required />
            </div>
          </section>

          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className={sectionTitle}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                02
              </span>

              <span>Contact Information</span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Employee Email */}
              <div>
                <label className={labelStyle}>
                  Employee Email <span className="text-danger">*</span>
                </label>

                <input
                  type="email"
                  name="employee_email"
                  value={formData.employee_email}
                  onChange={handleChange}
                  placeholder="employee@company.com"
                  className={inputStyle}
                />

                {errors.employee_email && (
                  <p className={errorStyle}>{errors.employee_email}</p>
                )}
              </div>

              {/* Personal Email */}
              <div>
                <label className={labelStyle}>
                  Personal Email <span className="text-danger">*</span>
                </label>

                <input
                  type="email"
                  name="personal_email"
                  value={formData.personal_email}
                  onChange={handleChange}
                  placeholder="personal@email.com"
                  className={inputStyle}
                />

                {errors.personal_email && (
                  <p className={errorStyle}>{errors.personal_email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className={labelStyle}>
                  Phone <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleNumberChange(e, 11)}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className={inputStyle}
                />

                <p className="mt-1 text-xs text-text-muted">
                  Numbers only • Maximum 11 digits
                </p>

                {errors.phone && <p className={errorStyle}>{errors.phone}</p>}
              </div>

              {/* National ID */}
              <div>
                <label className={labelStyle}>
                  National ID <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="national_id"
                  value={formData.national_id}
                  onChange={(e) => handleNumberChange(e)}
                  placeholder="Enter National ID"
                  className={inputStyle}
                />

                {errors.national_id && (
                  <p className={errorStyle}>{errors.national_id}</p>
                )}
              </div>

              {/* Passport */}
              <div>
                <label className={labelStyle}>
                  Passport Number{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="passport_number"
                  value={formData.passport_number}
                  onChange={(e) => handleNumberChange(e)}
                  placeholder="Enter passport number"
                  className={inputStyle}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className={labelStyle}>
                  Address <span className="text-danger">*</span>
                </label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter complete address"
                  className={`${inputStyle} resize-none`}
                />

                {errors.address && (
                  <p className={errorStyle}>{errors.address}</p>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              EMERGENCY CONTACT
          ================================================= */}

          <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className={sectionTitle}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                03
              </span>

              <span>
                Emergency Contact{" "}
                <span className="text-xs font-normal text-text-muted">
                  (Optional)
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Name */}
              <div>
                <label className={labelStyle}>
                  Contact Name{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleNameChange}
                  placeholder="Enter contact name"
                  className={inputStyle}
                />
              </div>

              {/* Phone */}
              <div>
                <label className={labelStyle}>
                  Contact Phone{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleNumberChange(e, 11)}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className={inputStyle}
                />

                {errors.emergency_contact_phone && (
                  <p className={errorStyle}>{errors.emergency_contact_phone}</p>
                )}
              </div>

              {/* Relation */}
              <div>
                <label className={labelStyle}>
                  Contact Relation{" "}
                  <span className="font-normal text-text-muted">
                    (Optional)
                  </span>
                </label>

                <input
                  type="text"
                  name="emergency_contact_relation"
                  value={formData.emergency_contact_relation}
                  onChange={handleChange}
                  placeholder="e.g. Father, Mother, Spouse"
                  className={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              EMPLOYMENT INFORMATION
          ================================================= */}

          <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className={sectionTitle}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                04
              </span>

              <span>Employment Information</span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* Joining Date */}
              <DateField label="Joining Date" name="joining_date" required />

              {/* Confirmation Date */}
              <DateField label="Confirmation Date" name="confirmation_date" />

              {/* Leaving Date */}
              <DateField label="Leaving Date" name="leaving_date" />

              {/* Employment Status */}
              <div className="lg:col-span-3">
                <label className={labelStyle}>Employment Status</label>

                <div className="inline-flex rounded-lg border border-border bg-surface-grey p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        employment_status: "active",
                      }))
                    }
                    className={`rounded-md px-6 py-2 text-sm font-medium transition ${
                      formData.employment_status === "active"
                        ? "bg-success text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        employment_status: "inactive",
                      }))
                    }
                    className={`rounded-md px-6 py-2 text-sm font-medium transition ${
                      formData.employment_status === "inactive"
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              PHOTO
          ================================================= */}

          <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className={sectionTitle}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                05
              </span>

              <span>Employee Photo</span>
            </div>

            <div className="flex flex-col items-center">
              {/* 1:1 Preview */}
              <div className="mb-4 h-40 w-40 overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-grey">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Employee preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="mb-2 text-text-muted"
                    >
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>

                    <span className="text-xs text-text-muted">1:1 Photo</span>
                  </div>
                )}
              </div>

              <label className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover">
                {photo ? "Change Photo" : "Upload Photo"}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>

              <p className="mt-2 text-center text-xs text-text-muted">
                JPG, JPEG, PNG • Automatically cropped to 1:1
                <br />
                Maximum 50 KB
              </p>

              {photo && (
                <p className="mt-2 text-xs font-medium text-success">
                  Photo ready • {(photo.size / 1024).toFixed(1)} KB
                </p>
              )}

              {photoError && (
                <p className="mt-2 text-xs text-danger">{photoError}</p>
              )}
            </div>
          </section>

          {/* =================================================
    SUBMIT MESSAGE
================================================= */}

          {submitMessage.text && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                submitMessage.type === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger"
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          {/* =================================================
    ACTIONS
================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-lg border border-border bg-white px-6 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-grey"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating Employee..." : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;
