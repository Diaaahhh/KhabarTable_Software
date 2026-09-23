"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Swal from "sweetalert2";

import {
  Building2,
  User,
  Compass,
  Mail,
  Phone,
  LockKeyhole,
  BriefcaseBusiness,
  MapPin,
  Building,
  UploadCloud,
  ArrowLeft,
} from "lucide-react";
import {API_BASE_URL} from "../../constants/api"

export default function CompanyRegistration() {
  const [restaurantType, setRestaurantType] = useState("");
  const [restaurantCategories, setRestaurantCategories] = useState<
    {
      id: number;
      res_category: string;
    }[]
  >([]);

  const [loadingRestaurantCategories, setLoadingRestaurantCategories] =
    useState(true);

  const [branchCount, setBranchCount] = useState("1");
  const [customBranchCount, setCustomBranchCount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    address: "",
  });

  // =========================================================
  // VALIDATION ERRORS
  // =========================================================

  const [errors, setErrors] = useState({
    email: "",
    phone: "",
    general: "",
  });

  // =========================================================
  // FETCH RESTAURANT CATEGORIES
  // =========================================================

  useEffect(() => {
    const fetchRestaurantCategories = async () => {
      try {
        setLoadingRestaurantCategories(true);

        const response = await fetch(
          `${API_BASE_URL}/api/registration/restaurant-categories`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch restaurant categories.",
          );
        }

        setRestaurantCategories(data.data || []);
      } catch (error) {
        console.error("Error fetching restaurant categories:", error);

        setRestaurantCategories([]);

        Swal.fire({
          icon: "error",
          title: "Failed to load restaurant types",
          text: "Unable to load restaurant types from the server.",
          confirmButtonColor: "#7d1119",
        });
      } finally {
        setLoadingRestaurantCategories(false);
      }
    };

    fetchRestaurantCategories();
  }, []);

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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

      // Clear phone error while editing
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

    // Clear corresponding errors while editing
    if (name === "email") {
      setErrors((previous) => ({
        ...previous,
        email: "",
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

    // =========================================================
    // FILE SIZE VALIDATION
    // =========================================================

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

    // =========================================================
    // SQUARE IMAGE VALIDATION
    // =========================================================

    const image = new Image();

    image.onload = () => {
      if (image.width !== image.height) {
        Swal.fire({
          icon: "warning",
          title: "Invalid image shape",
          text: "Please select a square image (for example, 500 × 500 pixels).",
          confirmButtonColor: "#7d1119",
        });

        event.target.value = "";
        return;
      }

      // =======================================================
      // VALID SQUARE IMAGE
      // =======================================================

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

    // Clear previous errors
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
    // STOP IF CLIENT VALIDATION FAILED
    // =======================================================

    if (hasError) {
      return;
    }

    // =======================================================
    // BRANCH COUNT
    // =======================================================

    const finalBranchCount =
      branchCount === "Custom"
        ? Number(customBranchCount)
        : Number(branchCount);

    // =======================================================
    // FORM DATA
    // =======================================================

    const form = new FormData();

    form.append("companyName", formData.companyName);
    form.append("name", formData.name);
    form.append("email", email);
    form.append("phone", phone);
    form.append("password", formData.password);
    form.append("designation", formData.designation);
    form.append("address", formData.address);
    form.append("restaurantType", restaurantType);
    form.append("branchCount", String(finalBranchCount));

    // =======================================================
    // COMPANY LOGO
    // =======================================================

    const imageInput = document.getElementById(
      "company-image",
    ) as HTMLInputElement | null;

    if (imageInput?.files?.[0]) {
      form.append("logo", imageInput.files[0]);
    }

    // =======================================================
    // SEND TO BACKEND
    // =======================================================

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registration/company`,
        {
          method: "POST",
          body: form,
        },
      );

      const data = await response.json();

      // =====================================================
      // BACKEND VALIDATION ERROR
      // =====================================================

      if (!response.ok) {
        // ---------------------------------------------------
        // EMAIL ALREADY EXISTS
        // ---------------------------------------------------

        if (data.code === "EMAIL_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            email: data.message || "This email is already registered.",
          }));

          return;
        }

        // ---------------------------------------------------
        // PHONE ALREADY EXISTS
        // ---------------------------------------------------

        if (data.code === "PHONE_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            phone: data.message || "This phone number is already registered.",
          }));

          return;
        }

        // ---------------------------------------------------
        // BOTH EMAIL + PHONE EXIST
        // ---------------------------------------------------

        if (data.code === "EMAIL_PHONE_EXISTS") {
          setErrors({
            email: data.emailMessage || "This email is already registered.",
            phone:
              data.phoneMessage || "This phone number is already registered.",
            general: "",
          });

          return;
        }

        // ---------------------------------------------------
        // OTHER ERROR
        // ---------------------------------------------------

        setErrors((previous) => ({
          ...previous,
          general: data.message || "Registration failed.",
        }));

        return;
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      console.log("Registration successful:", data);

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text: "The company has been registered successfully.",
        confirmButtonText: "OK",
        confirmButtonColor: "#7d1119",
      });

      // Optional: reset form after successful registration
      setFormData({
        companyName: "",
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        address: "",
      });

      setRestaurantType("");
      setBranchCount("1");
      setCustomBranchCount("");
      setImagePreview(null);

      const imageInput = document.getElementById(
        "company-image",
      ) as HTMLInputElement | null;

      if (imageInput) {
        imageInput.value = "";
      }
    } catch (error) {
      console.error("Registration error:", error);

      setErrors((previous) => ({
        ...previous,
        general: "Unable to connect to the server.",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto w-full max-w-[620px]">
        {/* Header */}

        <div className="mb-0 bg-primary px-5 py-4 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Company Registration
          </h1>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="bg-surface px-5 py-7 sm:px-8 sm:py-8"
        >
          <div className="space-y-7">
            {/* Company Name */}

            <FormField
              icon={<Building2 size={20} strokeWidth={2} />}
              label="Company"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Type company name"
              required
            />

            {/* Name */}

            <FormField
              icon={<User size={20} strokeWidth={2} />}
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Type Name"
              required
            />

            {/* Restaurant Type */}

            <div>
              <div className="mb-2 flex items-center gap-3">
                <Compass
                  size={20}
                  strokeWidth={2}
                  className="text-text-primary"
                />

                <label className="text-base font-bold text-text-primary">
                  Restaurant Type
                  <span className="ml-1 text-secondary">*</span>
                </label>
              </div>

              <select
                value={restaurantType}
                onChange={(event) => setRestaurantType(event.target.value)}
                required
                disabled={loadingRestaurantCategories}
                className="w-full border-b-2 border-secondary-light bg-transparent px-0 py-2 text-[16px] text-text-muted outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" disabled>
                  {loadingRestaurantCategories
                    ? "Loading restaurant types..."
                    : "Select restaurant type..."}
                </option>

                {restaurantCategories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.res_category}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}

            <div>
              <FormField
                icon={<Mail size={20} strokeWidth={2} />}
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Type email address"
                required
              />

              {errors.email && (
                <p className="mt-1 text-sm text-danger">{errors.email}</p>
              )}
            </div>

            {/* Phone */}

            <div>
              <FormField
                icon={<Phone size={20} strokeWidth={2} />}
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Type Phone Number"
                required
              />

              {errors.phone && (
                <p className="mt-1 text-sm text-danger">{errors.phone}</p>
              )}
            </div>

            {/* Password */}

            <FormField
              icon={<LockKeyhole size={20} strokeWidth={2} />}
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Type password"
              required
            />

            {/* Designation */}

            <FormField
              icon={<BriefcaseBusiness size={20} strokeWidth={2} />}
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Type designation"
              required
            />

            {/* Address */}

            <FormField
              icon={<MapPin size={20} strokeWidth={2} />}
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Type address"
              required
            />

            {/* Branch Count */}

            <div>
              <div className="mb-2 flex items-center gap-3">
                <Building
                  size={20}
                  strokeWidth={2}
                  className="text-text-primary"
                />

                <label className="text-base font-bold text-text-primary">
                  Number of Branches
                  <span className="ml-1 text-secondary">*</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-x-5 gap-y-3 border-b-2 border-secondary-light pb-3 sm:grid-cols-6">
                {["1", "2", "3", "4", "5", "Custom"].map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
                  >
                    <input
                      type="radio"
                      name="branchCount"
                      value={value}
                      checked={branchCount === value}
                      onChange={(event) => {
                        setBranchCount(event.target.value);

                        if (event.target.value !== "Custom") {
                          setCustomBranchCount("");
                        }
                      }}
                      className="h-5 w-5 cursor-pointer accent-primary"
                    />

                    <span>{value}</span>
                  </label>
                ))}
              </div>

              {branchCount === "Custom" && (
                <div className="mt-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customBranchCount}
                    onChange={(event) =>
                      setCustomBranchCount(event.target.value)
                    }
                    placeholder="Enter number of branches"
                    required
                    className="w-full appearance-none border-b-2 border-secondary-light bg-transparent px-0 py-2 text-[16px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Image Upload */}

            <div>
              <div className="mb-2 flex items-center gap-3">
                <UploadCloud
                  size={20}
                  strokeWidth={2}
                  className="text-text-primary"
                />

                <label className="text-base font-bold text-text-primary">
                  Company Logo
                </label>
              </div>

              <label
                htmlFor="company-image"
                className="flex min-h-[125px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-white px-5 py-5 text-center transition hover:border-primary hover:bg-primary-light"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Company preview"
                    className="mb-3 h-20 w-20 object-contain"
                  />
                ) : (
                  <UploadCloud
                    size={28}
                    strokeWidth={1.8}
                    className="mb-3 text-info"
                  />
                )}

                <span className="text-sm text-text-secondary">
                  {imagePreview
                    ? "Click to change image"
                    : "Click to upload image"}
                </span>

                <span className="mt-1 text-xs text-text-muted">
                  Maximum file size: 50 KB
                </span>
              </label>

              <input
                id="company-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* General Error */}

          {errors.general && (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {errors.general}
            </div>
          )}

          {/* Buttons */}

          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-md bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary-hover"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <button
              type="submit"
              className="inline-flex min-w-[135px] items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   Reusable Input Field
   ========================================================= */

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
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="text-text-primary">{icon}</span>

        <label htmlFor={name} className="text-base font-bold text-text-primary">
          {label}

          {required && <span className="ml-1 text-secondary">*</span>}
        </label>
      </div>

      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border-b-2 border-secondary-light bg-transparent px-0 py-2 text-[16px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary"
      />
    </div>
  );
}
