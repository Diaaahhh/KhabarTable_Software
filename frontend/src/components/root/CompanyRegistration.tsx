"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../../constants/api";

export default function CompanyRegistration() {
  const [restaurantType, setRestaurantType] = useState<string[]>([]);
  const [restaurantTypeOpen, setRestaurantTypeOpen] = useState(false);
  const restaurantTypeRef = useRef<HTMLDivElement>(null);
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
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        restaurantTypeRef.current &&
        !restaurantTypeRef.current.contains(event.target as Node)
      ) {
        setRestaurantTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // =========================================================
  // IMAGE CHANGE + RESIZE + CROP + COMPRESSION
  // =========================================================
  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      // =====================================================
      // CREATE IMAGE
      // =====================================================
      const image = new Image();

      const imageUrl = URL.createObjectURL(file);

      image.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image."));
      });

      // =====================================================
      // SOURCE DIMENSIONS
      // =====================================================
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;

      // =====================================================
      // PERFECT SQUARE CROP
      // =====================================================
      const cropSize = Math.min(sourceWidth, sourceHeight);

      const cropX = (sourceWidth - cropSize) / 2;
      const cropY = (sourceHeight - cropSize) / 2;

      // =====================================================
      // START WITH 512 × 512
      // =====================================================
      let outputSize = Math.min(cropSize, 512);

      let compressedBlob: Blob | null = null;

      // =====================================================
      // COMPRESS
      // =====================================================
      // Try several dimensions until the file is <= 50 KB.
      while (outputSize >= 64) {
        const canvas = document.createElement("canvas");

        canvas.width = outputSize;
        canvas.height = outputSize;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to process image.");
        }

        // Better image quality while resizing
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        // White background
        // Useful because JPEG does not support transparency.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, outputSize, outputSize);

        // ===================================================
        // CENTER-CROP + RESIZE
        // ===================================================
        context.drawImage(
          image,
          cropX,
          cropY,
          cropSize,
          cropSize,
          0,
          0,
          outputSize,
          outputSize,
        );

        // ===================================================
        // TRY DIFFERENT JPEG QUALITIES
        // ===================================================
        const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

        for (const quality of qualities) {
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
          });

          if (blob && blob.size <= 50 * 1024) {
            compressedBlob = blob;
            break;
          }
        }

        // ===================================================
        // STOP IF SUCCESSFULLY COMPRESSED
        // ===================================================
        if (compressedBlob) {
          break;
        }

        // ===================================================
        // STILL TOO LARGE → REDUCE DIMENSIONS
        // ===================================================
        outputSize = Math.floor(outputSize * 0.8);
      }

      // =====================================================
      // CHECK FINAL RESULT
      // =====================================================
      if (!compressedBlob || compressedBlob.size > 50 * 1024) {
        throw new Error("Unable to compress image below 50 KB.");
      }

      // =====================================================
      // CREATE PROCESSED FILE
      // =====================================================
      const processedFile = new File([compressedBlob], "company-logo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      // =====================================================
      // CREATE PREVIEW
      // =====================================================
      const previewUrl = URL.createObjectURL(processedFile);

      setImagePreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return previewUrl;
      });

      // =====================================================
      // STORE PROCESSED FILE
      // =====================================================
      setCompanyLogo(processedFile);

      // =====================================================
      // CLEAN SOURCE URL
      // =====================================================
      URL.revokeObjectURL(imageUrl);

      console.log(
        `Original: ${(file.size / 1024).toFixed(2)} KB`,
        `→ Processed: ${(processedFile.size / 1024).toFixed(2)} KB`,
        `→ Size: ${outputSize} × ${outputSize}`,
      );
    } catch (error) {
      console.error("Image processing error:", error);

      setImagePreview(null);
      setCompanyLogo(null);

      event.target.value = "";

      Swal.fire({
        icon: "error",
        title: "Unable to process image",
        text: "Please select a valid image.",
        confirmButtonColor: "#7d1119",
      });
    }
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
    form.append("restaurantType", JSON.stringify(restaurantType));
    form.append("branchCount", String(finalBranchCount));

    // =======================================================
    // COMPANY LOGO
    // =======================================================
    if (companyLogo) {
      form.append("logo", companyLogo);
    }

    // =======================================================
    // SEND TO BACKEND
    // =======================================================

    try {
      const response = await fetch(`${API_BASE_URL}/api/registration/company`, {
        method: "POST",
        body: form,
      });

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

      setRestaurantType([]);
      setBranchCount("1");
      setCustomBranchCount("");
      setImagePreview(null);
      setCompanyLogo(null);
      
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

              <div ref={restaurantTypeRef} className="relative">
                {/* Selected values / dropdown button */}
                <button
                  type="button"
                  onClick={() => setRestaurantTypeOpen((previous) => !previous)}
                  disabled={loadingRestaurantCategories}
                  className="flex min-h-[46px] w-full items-center justify-between gap-3 border-b-2 border-secondary-light bg-transparent px-0 py-2 text-left outline-none transition-colors hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {loadingRestaurantCategories ? (
                      <span className="text-[16px] text-text-muted">
                        Loading restaurant types...
                      </span>
                    ) : restaurantType.length === 0 ? (
                      <span className="text-[16px] text-text-muted">
                        Select restaurant type...
                      </span>
                    ) : (
                      restaurantType.map((selectedId) => {
                        const category = restaurantCategories.find(
                          (item) => String(item.id) === selectedId,
                        );

                        if (!category) return null;

                        return (
                          <span
                            key={selectedId}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-white"
                          >
                            {category.res_category}

                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();

                                setRestaurantType((previous) =>
                                  previous.filter((id) => id !== selectedId),
                                );
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  event.stopPropagation();

                                  setRestaurantType((previous) =>
                                    previous.filter((id) => id !== selectedId),
                                  );
                                }
                              }}
                              className="cursor-pointer rounded-full p-0.5 transition hover:bg-primary hover:text-white"
                              aria-label={`Remove ${category.res_category}`}
                            >
                              <X size={13} />
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>

                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-text-secondary transition-transform duration-200 ${
                      restaurantTypeOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown */}
                {restaurantTypeOpen && !loadingRestaurantCategories && (
                  <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-md border border-border bg-white shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="text-sm font-semibold text-text-primary">
                        Select Restaurant Types
                      </span>

                      {restaurantType.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRestaurantType([])}
                          className="text-xs font-medium text-secondary transition hover:text-primary"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto py-1">
                      {restaurantCategories.map((category) => {
                        const categoryId = String(category.id);
                        const isSelected = restaurantType.includes(categoryId);

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setRestaurantType((previous) => {
                                if (previous.includes(categoryId)) {
                                  return previous.filter(
                                    (id) => id !== categoryId,
                                  );
                                }

                                return [...previous, categoryId];
                              });
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                              isSelected
                                ? "bg-primary-light text-white"
                                : "text-text-primary hover:bg-surface"
                            }`}
                          >
                            <span>{category.res_category}</span>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-white"
                              }`}
                            >
                              {isSelected && (
                                <Check size={14} strokeWidth={3} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selection information */}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  {restaurantType.length === 0
                    ? "Select one or more restaurant types."
                    : `${restaurantType.length} restaurant type${
                        restaurantType.length > 1 ? "s" : ""
                      } selected`}
                </p>

                {restaurantType.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRestaurantType([])}
                    className="text-xs font-medium text-secondary hover:text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>
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

              <div className="flex items-center gap-3 border-b-2 border-secondary-light pb-3">
                {/* Branch Options */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {["1", "2", "3", "4", "5", "Custom"].map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-1.5 text-sm text-text-primary"
                    >
                      <input
                        type="radio"
                        name="branchCount"
                        value={value}
                        checked={branchCount === value}
                        onChange={(event) => {
                          const selectedValue = event.target.value;

                          setBranchCount(selectedValue);

                          if (selectedValue !== "Custom") {
                            setCustomBranchCount("");
                          }
                        }}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />

                      <span>{value}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Branch Count Input */}
                {branchCount === "Custom" && (
                  <input
                    type="number"
                    min="6"
                    step="1"
                    value={customBranchCount}
                    onChange={(event) => {
                      const value = event.target.value;

                      // Allow empty input while typing
                      if (value === "") {
                        setCustomBranchCount("");
                        return;
                      }

                      // Allow numbers while typing
                      if (/^\d+$/.test(value)) {
                        setCustomBranchCount(value);
                      }
                    }}
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    onKeyDown={(event) => {
                      // Prevent decimal point, minus sign, plus sign, e, E
                      if (
                        event.key === "." ||
                        event.key === "-" ||
                        event.key === "+" ||
                        event.key.toLowerCase() === "e"
                      ) {
                        event.preventDefault();
                      }
                    }}
                    placeholder="6+"
                    required
                    className="
          w-20
          shrink-0
          appearance-none
          border-b-2
          border-secondary-light
          bg-transparent
          px-1
          py-1
          text-center
          text-[16px]
          text-text-primary
          outline-none
          transition-colors
          placeholder:text-text-muted
          focus:border-primary
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
                  />
                )}
              </div>
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
