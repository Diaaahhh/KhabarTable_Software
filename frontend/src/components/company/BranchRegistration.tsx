"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Swal from "sweetalert2";
import {
  Building2,
  User,
  Mail,
  Phone,
  LockKeyhole,
  BriefcaseBusiness,
  MapPin,
  UploadCloud,
} from "lucide-react";
import { API_BASE_URL } from "../../constants/api";

export default function BranchRegistration() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [branchCount, setBranchCount] = useState<number>(0);
  const [branchCountRemaining, setBranchCountRemaining] = useState<number>(0);
  const [loadingBranchCount, setLoadingBranchCount] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    branchName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    location: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    phone: "",
    general: "",
  });

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    // ---------------------------------------------------------
    // Phone
    // ---------------------------------------------------------

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");

      setFormData((previous) => ({
        ...previous,
        phone: digitsOnly.slice(0, 11),
      }));

      setErrors((previous) => ({
        ...previous,
        phone: "",
        general: "",
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    // ---------------------------------------------------------
    // Clear email error while editing
    // ---------------------------------------------------------

    if (name === "email") {
      setErrors((previous) => ({
        ...previous,
        email: "",
        general: "",
      }));
    } else {
      setErrors((previous) => ({
        ...previous,
        general: "",
      }));
    }
  };

  // =========================================================
  // IMAGE CHANGE
  // =========================================================

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // =======================================================
    // FILE SIZE VALIDATION
    // =======================================================

    if (file.size > 50 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Image too large",
        text: "Please select an image smaller than 50 KB.",
        confirmButtonColor: "#7d1119",
      });

      event.target.value = "";
      return;
    }

    // =======================================================
    // SQUARE IMAGE VALIDATION
    // =======================================================

    const image = new Image();

    image.onload = () => {
      if (image.width !== image.height) {
        Swal.fire({
          icon: "warning",
          title: "Invalid image shape",
          text: "Please select a square image.",
          confirmButtonColor: "#7d1119",
        });

        event.target.value = "";
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      setImagePreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return previewUrl;
      });
    };

    image.onerror = () => {
      Swal.fire({
        icon: "error",
        title: "Invalid image",
        text: "Please select a valid image file.",
        confirmButtonColor: "#7d1119",
      });

      event.target.value = "";
    };

    image.src = URL.createObjectURL(file);
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // =========================================================
    // STOP REGISTRATION IF NO BRANCH SLOT IS AVAILABLE
    // =========================================================

    if (loadingBranchCount) {
      return;
    }

    if (branchCountRemaining <= 0) {
      setErrors({
        email: "",
        phone: "",
        general:
          "You have reached your maximum number of branches. No more branches can be created.",
      });

      return;
    }

    setErrors({
      email: "",
      phone: "",
      general: "",
    });

    const email = formData.email.trim();
    const phone = formData.phone.trim();

    let hasError = false;

    // =======================================================
    // EMAIL VALIDATION
    // =======================================================

    const emailAtIndex = email.indexOf("@");

    const isValidEmail =
      emailAtIndex > 0 &&
      emailAtIndex < email.length - 1 &&
      email.includes(".", emailAtIndex + 1) &&
      !email.includes(" ");

    if (!isValidEmail) {
      setErrors((previous) => ({
        ...previous,
        email:
          "Please enter a valid email address (example: name@example.com).",
      }));

      hasError = true;
    }

    // =======================================================
    // PHONE VALIDATION
    // =======================================================

    const phoneRegex = /^\d{11}$/;

    if (!phoneRegex.test(phone)) {
      setErrors((previous) => ({
        ...previous,
        phone: "Phone number must contain exactly 11 digits.",
      }));

      hasError = true;
    }

    // =======================================================
    // STOP IF VALIDATION FAILED
    // =======================================================

    if (hasError) {
      return;
    }

    // =======================================================
    // FORM DATA
    // =======================================================

    const form = new FormData();

    form.append("branchName", formData.branchName);
    form.append("name", formData.name);
    form.append("email", email);
    form.append("phone", phone);
    form.append("password", formData.password);
    form.append("designation", formData.designation);
    form.append("location", formData.location);

    // =======================================================
    // BRANCH IMAGE
    // =======================================================

    const imageInput = document.getElementById(
      "branch-image",
    ) as HTMLInputElement | null;

    if (imageInput?.files?.[0]) {
      form.append("logo", imageInput.files[0]);
    }

    // =======================================================
    // SEND TO BACKEND
    // =======================================================

    try {
      const response = await fetch(`${API_BASE_URL}/api/registration/branch`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await response.json();

      // =====================================================
      // BACKEND VALIDATION ERROR
      // =====================================================

      if (!response.ok) {
        if (data.code === "EMAIL_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            email: data.message || "This email is already registered.",
          }));

          return;
        }

        if (data.code === "PHONE_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            phone: data.message || "This phone number is already registered.",
          }));

          return;
        }

        if (data.code === "EMAIL_PHONE_EXISTS") {
          setErrors({
            email: data.emailMessage || "This email is already registered.",
            phone:
              data.phoneMessage || "This phone number is already registered.",
            general: "",
          });

          return;
        }

        setErrors((previous) => ({
          ...previous,
          general: data.message || "Branch registration failed.",
        }));

        return;
      }

      // =====================================================
      // UPDATE REMAINING BRANCH COUNT
      // =====================================================

      if (data.data && typeof data.data.branchCount_Remaining !== "undefined") {
        setBranchCountRemaining(Number(data.data.branchCount_Remaining) || 0);
      } else {
        // Fallback
        setBranchCountRemaining((previous) => Math.max(previous - 1, 0));
      }
      // =====================================================
      // SUCCESS
      // =====================================================

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text: "The branch has been registered successfully.",
        confirmButtonText: "OK",
        confirmButtonColor: "#7d1119",
      });

      // =====================================================
      // RESET FORM
      // =====================================================

      setFormData({
        branchName: "",
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        location: "",
      });

      setImagePreview(null);

      if (imageInput) {
        imageInput.value = "";
      }
    } catch (error) {
      console.error("Branch registration error:", error);

      setErrors((previous) => ({
        ...previous,
        general: "Unable to connect to the server.",
      }));
    }
  };

  useEffect(() => {
    const fetchBranchCount = async () => {
      try {
        setLoadingBranchCount(true);

        const response = await fetch(
          `${API_BASE_URL}/api/registration/branch-count`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch branch count.");
        }

        setBranchCount(Number(data.data.branchCount) || 0);

        setBranchCountRemaining(Number(data.data.branchCount_Remaining) || 0);
      } catch (error) {
        console.error("Failed to fetch branch count:", error);

        setBranchCount(0);
        setBranchCountRemaining(0);
      } finally {
        setLoadingBranchCount(false);
      }
    };

    fetchBranchCount();
  }, []);
  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto w-full max-w-[620px]">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-0 bg-primary px-5 py-4 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Branch Registration
          </h1>

          {/* Branch Count Information */}
          <div className="mt-2 text-sm text-white/90">
            {loadingBranchCount ? (
              <span>Checking available branches...</span>
            ) : branchCountRemaining > 0 ? (
              <span>
                You can create{" "}
                <strong className="font-bold text-white">
                  {branchCountRemaining}
                </strong>{" "}
                more {branchCountRemaining === 1 ? "branch" : "branches"}
              </span>
            ) : (
              <span className="font-semibold text-white">
                No branch slots remaining
              </span>
            )}
          </div>
        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="bg-surface px-5 py-7 sm:px-8 sm:py-8"
        >
          <fieldset disabled={loadingBranchCount || branchCountRemaining <= 0}>
            <div className="space-y-3">
              {/* Branch Name */}

              <FormField
                icon={<Building2 size={18} strokeWidth={2} />}
                label="Branch Name"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder="Branch Name"
                required
              />

              {/* Name */}

              <FormField
                icon={<User size={18} strokeWidth={2} />}
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                required
              />

              {/* Email */}

              <div>
                <FormField
                  icon={<Mail size={18} strokeWidth={2} />}
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />

                {errors.email && (
                  <p className="mt-1 pl-2 text-sm text-danger">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}

              <div>
                <FormField
                  icon={<Phone size={18} strokeWidth={2} />}
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  required
                />

                {errors.phone && (
                  <p className="mt-1 pl-2 text-sm text-danger">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Password */}

              <FormField
                icon={<LockKeyhole size={18} strokeWidth={2} />}
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
              />

              {/* Designation */}

              <FormField
                icon={<BriefcaseBusiness size={18} strokeWidth={2} />}
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Designation"
                required
              />

              {/* Location */}

              <FormField
                icon={<MapPin size={18} strokeWidth={2} />}
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Location"
                required
              />

              {/* =================================================
                IMAGE UPLOAD
            ================================================= */}

              <div className="pt-1">
                <label
                  htmlFor="branch-image"
                  className="flex min-h-[74px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-white px-5 py-3 text-center transition hover:border-primary hover:bg-primary-light"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Branch preview"
                      className="mb-1 h-12 w-12 rounded-md object-contain"
                    />
                  ) : (
                    <UploadCloud
                      size={23}
                      strokeWidth={1.8}
                      className="mb-1 text-info"
                    />
                  )}

                  <span className="text-xs text-text-secondary">
                    {imagePreview
                      ? "Click to change image"
                      : "Click or drag image here to upload"}
                  </span>
                </label>

                <input
                  id="branch-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* ===================================================
              GENERAL ERROR
          =================================================== */}

            {errors.general && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                {errors.general}
              </div>
            )}

            {/* ===================================================
              REGISTRATION BUTTON
          =================================================== */}

            <div className="mt-4">
              <button
                type="submit"
                disabled={loadingBranchCount || branchCountRemaining <= 0}
                className="inline-flex min-w-[109px] items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
              >
                {loadingBranchCount
                  ? "Checking..."
                  : branchCountRemaining <= 0
                    ? "No Branch Slot"
                    : "Registration"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

// =============================================================
// REUSABLE FORM FIELD
// =============================================================

function FormField({
  icon,
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex min-h-[38px] w-full overflow-hidden rounded-md border border-border bg-white">
      {/* Label */}

      <div className="flex min-w-fit items-center bg-gray-100 px-3 py-2">
        <label htmlFor={name} className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="ml-1 text-secondary">*</span>}
        </label>
      </div>

      {/* Input */}

      <div className="flex flex-1 items-center">
        <span className="hidden pl-3 text-text-primary sm:block">{icon}</span>

        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}
