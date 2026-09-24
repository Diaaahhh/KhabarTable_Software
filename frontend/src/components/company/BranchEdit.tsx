"use client";

import {
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { useParams, useRouter } from "next/navigation";

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
  Loader2,
  ArrowLeft,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

export default function BranchEdit() {
  const router = useRouter();
  const params = useParams();

  const branchId = params?.id;

  // =========================================================
  // STATE
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    email: "",
    phone: "",
    general: "",
  });

  const [formData, setFormData] = useState({
    branchName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    location: "",
  });

  // =========================================================
  // FETCH BRANCH
  // =========================================================

  useEffect(() => {
    if (!branchId) return;

    const fetchBranch = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/api/branches/${branchId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch branch information."
          );
        }

        const branch = data.branch || data.data;

        if (!branch) {
          throw new Error("Branch information was not found.");
        }

        // =====================================================
        // FILL FORM
        // =====================================================

        setFormData({
          branchName: branch.branch_name || "",
          name: branch.name || "",
          email: branch.email || "",
          phone: branch.phone || "",
          password: "",
          designation: branch.designation || "",
          location: branch.address || branch.location || "",
        });

        // =====================================================
        // EXISTING IMAGE
        // =====================================================

        if (branch.logo) {
          const imageUrl = branch.logo.startsWith("http")
            ? branch.logo
            : `${API_BASE_URL}${branch.logo}`;

          setImagePreview(imageUrl);
        }
      } catch (error) {
        console.error("Fetch branch error:", error);

        setErrors({
          email: "",
          phone: "",
          general:
            error instanceof Error
              ? error.message
              : "Unable to load branch information.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBranch();
  }, [branchId]);

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    // ---------------------------------------------------------
    // PHONE
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
    // CLEAR EMAIL ERROR
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

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
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
        if (previous && previous.startsWith("blob:")) {
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

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
    form.append("designation", formData.designation);
    form.append("location", formData.location);

    // =======================================================
    // PASSWORD
    // Only send if user entered a new password.
    // =======================================================

    if (formData.password.trim()) {
      form.append("password", formData.password);
    }

    // =======================================================
    // IMAGE
    // =======================================================

    const imageInput = document.getElementById(
      "branch-image"
    ) as HTMLInputElement | null;

    if (imageInput?.files?.[0]) {
      form.append("logo", imageInput.files[0]);
    }

    // =======================================================
    // SEND TO BACKEND
    // =======================================================

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${branchId}`,
        {
          method: "PUT",
          credentials: "include",
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            email:
              data.message ||
              "This email is already registered.",
          }));

          return;
        }

        if (data.code === "PHONE_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            phone:
              data.message ||
              "This phone number is already registered.",
          }));

          return;
        }

        if (data.code === "EMAIL_PHONE_EXISTS") {
          setErrors({
            email:
              data.emailMessage ||
              "This email is already registered.",
            phone:
              data.phoneMessage ||
              "This phone number is already registered.",
            general: "",
          });

          return;
        }

        throw new Error(
          data.message || "Failed to update branch."
        );
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      await Swal.fire({
        icon: "success",
        title: "Branch Updated!",
        text: "The branch information has been updated successfully.",
        confirmButtonText: "OK",
        confirmButtonColor: "#7d1119",
      });

      router.push("/company/list");
    } catch (error) {
      console.error("Branch update error:", error);

      setErrors((previous) => ({
        ...previous,
        general:
          error instanceof Error
            ? error.message
            : "Unable to connect to the server.",
      }));
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-surface px-4 py-8">
        <div className="mx-auto flex min-h-[500px] w-full max-w-[620px] items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2
              size={32}
              className="animate-spin text-primary"
            />

            <p className="mt-3 text-sm text-text-secondary">
              Loading branch information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto w-full max-w-[620px]">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-0 bg-primary px-5 py-4 text-center">

          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Edit Branch
          </h1>

          <p className="mt-1 text-sm text-white/80">
            Update branch information
          </p>
        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="bg-surface px-5 py-7 sm:px-8 sm:py-8"
        >
          <div className="space-y-3">

            {/* =================================================
                BRANCH NAME
            ================================================= */}

            <FormField
              icon={
                <Building2
                  size={18}
                  strokeWidth={2}
                />
              }
              label="Branch Name"
              name="branchName"
              value={formData.branchName}
              onChange={handleChange}
              placeholder="Branch Name"
              required
            />

            {/* =================================================
                NAME
            ================================================= */}

            <FormField
              icon={
                <User
                  size={18}
                  strokeWidth={2}
                />
              }
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              required
            />

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>
              <FormField
                icon={
                  <Mail
                    size={18}
                    strokeWidth={2}
                  />
                }
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

            {/* =================================================
                PHONE
            ================================================= */}

            <div>
              <FormField
                icon={
                  <Phone
                    size={18}
                    strokeWidth={2}
                  />
                }
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

            {/* =================================================
                PASSWORD
            ================================================= */}

            <FormField
              icon={
                <LockKeyhole
                  size={18}
                  strokeWidth={2}
                />
              }
              label="New Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave blank to keep current password"
            />

            {/* =================================================
                DESIGNATION
            ================================================= */}

            <FormField
              icon={
                <BriefcaseBusiness
                  size={18}
                  strokeWidth={2}
                />
              }
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Designation"
              required
            />

            {/* =================================================
                LOCATION
            ================================================= */}

            <FormField
              icon={
                <MapPin
                  size={18}
                  strokeWidth={2}
                />
              }
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
              BUTTONS
          =================================================== */}

          <div className="mt-4 flex items-center gap-2">

            <button
              type="button"
              disabled={saving}
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-[125px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {saving ? "Updating..." : "Update Branch"}
            </button>

          </div>
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
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex min-h-[38px] w-full overflow-hidden rounded-md border border-border bg-white">

      {/* Label */}

      <div className="flex min-w-fit items-center bg-gray-100 px-3 py-2">
        <label
          htmlFor={name}
          className="text-sm font-medium text-text-primary"
        >
          {label}

          {required && (
            <span className="ml-1 text-secondary">
              *
            </span>
          )}
        </label>
      </div>

      {/* Input */}

      <div className="flex flex-1 items-center">

        <span className="hidden pl-3 text-text-primary sm:block">
          {icon}
        </span>

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