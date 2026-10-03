"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { useParams, useRouter } from "next/navigation";

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
  ChevronDown,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

interface DesignationOption {
  id: number;
  code: string;
  name: string;
}

interface StatusMessage {
  type: "success" | "error" | "warning";
  title: string;
  text: string;
}

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

  // Original hashed password fetched from server
  const [originalHashedPassword, setOriginalHashedPassword] = useState("");

  // Designations dropdown
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loadingDesignations, setLoadingDesignations] = useState(true);
  const [designationOpen, setDesignationOpen] = useState(false);
  const designationRef = useRef<HTMLDivElement>(null);

  // =========================================================
  // DEBOUNCE TIMERS FOR DUPLICATE CHECK
  // =========================================================
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track in-flight state so we can disable submit while checking
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    phone: "",
    designation: "",
    general: "",
  });

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null,
  );

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
  // CLEANUP DEBOUNCE TIMERS ON UNMOUNT
  // =========================================================
  useEffect(() => {
    return () => {
      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
      }

      if (phoneCheckTimer.current) {
        clearTimeout(phoneCheckTimer.current);
      }
    };
  }, []);

  // =========================================================
  // AUTO-DISMISS STATUS
  // =========================================================
  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  const showStatus = (
    type: StatusMessage["type"],
    title: string,
    text: string,
  ) => {
    setStatusMessage({ type, title, text });
  };

  // =========================================================
  // VALIDATION HELPERS
  // =========================================================
  const isValidEmail = (email: string): boolean => {
    const emailAtIndex = email.indexOf("@");

    return (
      emailAtIndex > 0 &&
      emailAtIndex < email.length - 1 &&
      email.includes(".", emailAtIndex + 1) &&
      !email.includes(" ")
    );
  };

  const isValidPhone = (phone: string): boolean => {
    return /^\d{11}$/.test(phone);
  };

  // =========================================================
  // CHECK DUPLICATE EMAIL / PHONE ON SERVER
  // =========================================================
  const checkDuplicateOnServer = async (
    field: "email" | "phone",
    value: string,
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registration/check-duplicate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            field,
            value: value.trim(),
            companyId: branchId ? Number(branchId) : undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      if (data.exists) {
        setErrors((previous) => ({
          ...previous,
          [field]:
            field === "email"
              ? "This email address is already registered."
              : "This phone number is already registered.",
        }));
      } else {
        setErrors((previous) => ({
          ...previous,
          [field]: "",
        }));
      }
    } catch (error) {
      console.error(`Failed to check duplicate ${field}:`, error);
    }
  };

  // =========================================================
  // FETCH DESIGNATIONS
  // =========================================================
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        setLoadingDesignations(true);

        const response = await fetch(
          `${API_BASE_URL}/api/registration/designations`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch designations.",
          );
        }

        setDesignations(data.data || []);
      } catch (error) {
        console.error("Fetch designations error:", error);

        setDesignations([]);

        showStatus(
          "error",
          "Failed to load designations",
          "Unable to load designations from the server.",
        );
      } finally {
        setLoadingDesignations(false);
      }
    };

    fetchDesignations();
  }, []);

  // =========================================================
  // CLICK OUTSIDE FOR DESIGNATION DROPDOWN
  // =========================================================
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        designationRef.current &&
        !designationRef.current.contains(event.target as Node)
      ) {
        setDesignationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch branch information.",
          );
        }

        const branch = data.branch || data.data;

        if (!branch) {
          throw new Error("Branch information was not found.");
        }

        // Keep the raw hashed password for later comparison
        setOriginalHashedPassword(branch.password || "");

        setFormData({
          branchName: branch.branch_name || "",
          name: branch.name || "",
          email: branch.email || "",
          phone: branch.phone || "",
          password: branch.password || "",
          designation:
            branch.designation !== null &&
            branch.designation !== undefined
              ? String(branch.designation)
              : "",
          location: branch.address || branch.location || "",
        });

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
          designation: "",
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
  // HANDLE INPUT CHANGE (WITH 2s DEBOUNCE DUPLICATE CHECK)
  // =========================================================
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    // ---------------------------------------------------------
    // PHONE
    // ---------------------------------------------------------
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);

      setFormData((previous) => ({
        ...previous,
        phone: digitsOnly,
      }));

      // Clear error while typing
      setErrors((previous) => ({
        ...previous,
        phone: "",
        general: "",
      }));

      // Clear any pending duplicate-check timer
      if (phoneCheckTimer.current) {
        clearTimeout(phoneCheckTimer.current);
        phoneCheckTimer.current = null;
      }

      // Only schedule duplicate check when phone looks valid
      if (isValidPhone(digitsOnly)) {
        phoneCheckTimer.current = setTimeout(async () => {
          setCheckingPhone(true);
          try {
            await checkDuplicateOnServer("phone", digitsOnly);
          } finally {
            setCheckingPhone(false);
          }
        }, 2000);
      }

      return;
    }

    // ---------------------------------------------------------
    // EMAIL
    // ---------------------------------------------------------
    if (name === "email") {
      setFormData((previous) => ({
        ...previous,
        email: value,
      }));

      setErrors((previous) => ({
        ...previous,
        email: "",
        general: "",
      }));

      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
        emailCheckTimer.current = null;
      }

      const cleanEmail = value.trim();

      if (isValidEmail(cleanEmail)) {
        emailCheckTimer.current = setTimeout(async () => {
          setCheckingEmail(true);
          try {
            await checkDuplicateOnServer("email", cleanEmail);
          } finally {
            setCheckingEmail(false);
          }
        }, 2000);
      }

      return;
    }

    // ---------------------------------------------------------
    // OTHER FIELDS
    // ---------------------------------------------------------
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      general: "",
    }));
  };

  // =========================================================
  // IMAGE CHANGE
  // =========================================================
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 50 * 1024) {
      showStatus(
        "warning",
        "Image too large",
        "Please select an image smaller than 50 KB.",
      );

      event.target.value = "";
      return;
    }

    const image = new Image();

    image.onload = () => {
      if (image.width !== image.height) {
        showStatus(
          "warning",
          "Invalid image shape",
          "Please select a square image.",
        );

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
      showStatus(
        "error",
        "Invalid image",
        "Please select a valid image file.",
      );

      event.target.value = "";
    };

    image.src = URL.createObjectURL(file);
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrors({
      email: "",
      phone: "",
      designation: "",
      general: "",
    });

    const email = formData.email.trim();
    const phone = formData.phone.trim();

    let hasError = false;

    if (!isValidEmail(email)) {
      setErrors((previous) => ({
        ...previous,
        email:
          "Please enter a valid email address (example: name@example.com).",
      }));

      hasError = true;
    }

    if (!isValidPhone(phone)) {
      setErrors((previous) => ({
        ...previous,
        phone: "Phone number must contain exactly 11 digits.",
      }));

      hasError = true;
    }

    if (!formData.designation) {
      setErrors((previous) => ({
        ...previous,
        designation: "Please select a designation.",
      }));

      hasError = true;
    }

    // =========================================================
    // STOP IF A DUPLICATE CHECK IS IN-FLIGHT
    // =========================================================
    if (checkingEmail || checkingPhone) {
      setErrors((previous) => ({
        ...previous,
        general:
          "Please wait while we verify your email and phone number.",
      }));

      return;
    }

    if (hasError) {
      return;
    }

    const form = new FormData();

    form.append("branchName", formData.branchName);
    form.append("name", formData.name);
    form.append("email", email);
    form.append("phone", phone);
    form.append("designation", formData.designation);
    form.append("location", formData.location);

    if (formData.password.trim()) {
      form.append("password", formData.password.trim());
    }

    const imageInput = document.getElementById(
      "branch-image",
    ) as HTMLInputElement | null;

    if (imageInput?.files?.[0]) {
      form.append("logo", imageInput.files[0]);
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/api/branches/${branchId}`,
        {
          method: "PUT",
          credentials: "include",
          body: form,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            email:
              data.message || "This email is already registered.",
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
              data.emailMessage || "This email is already registered.",
            phone:
              data.phoneMessage ||
              "This phone number is already registered.",
            designation: "",
            general: "",
          });

          return;
        }

        throw new Error(
          data.message || "Failed to update branch.",
        );
      }

      showStatus(
        "success",
        "Branch Updated!",
        "The branch information has been updated successfully.",
      );

      router.push("/company/branch_list");
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
  // SELECTED DESIGNATION
  // =========================================================
  const selectedDesignation = designations.find(
    (item) => String(item.id) === formData.designation,
  );

  // =========================================================
  // STATUS STYLES
  // =========================================================
  const statusStyles: Record<StatusMessage["type"], string> = {
    success:
      "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    error:
      "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
    warning:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  };

  const StatusIcon = ({ type }: { type: StatusMessage["type"] }) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
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
        {/* HEADER */}
        <div className="mb-0 bg-primary px-5 py-4 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Edit Branch
          </h1>

          <p className="mt-1 text-sm text-white/80">
            Update branch information
          </p>
        </div>

        {/* INLINE STATUS */}
        {statusMessage && (
          <div
            className={`flex items-start gap-2 border-x border-b px-3 py-2 text-xs ${statusStyles[statusMessage.type]}`}
          >
            <span className="mt-0.5 shrink-0">
              <StatusIcon type={statusMessage.type} />
            </span>

            <div className="flex-1">
              <p className="font-semibold">{statusMessage.title}</p>
              <p className="mt-0.5">{statusMessage.text}</p>
            </div>

            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="shrink-0 rounded p-0.5 transition hover:bg-black/10"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface px-5 py-7 sm:px-8 sm:py-8"
        >
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

              {checkingEmail && !errors.email && (
                <p className="mt-1 pl-2 text-xs text-text-muted">
                  Checking email...
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

              {checkingPhone && !errors.phone && (
                <p className="mt-1 pl-2 text-xs text-text-muted">
                  Checking phone...
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
              placeholder="Leave blank to keep current password"
            />

            {/* Designation — Dropdown */}
            <div>
              <div className="flex min-h-[38px] w-full overflow-visible rounded-md border border-border bg-white">
                <div className="flex min-w-fit items-center bg-gray-100 px-3 py-2">
                  <BriefcaseBusiness
                    size={18}
                    strokeWidth={2}
                    className="mr-2 text-text-primary"
                  />

                  <label className="text-sm font-medium text-text-primary">
                    Designation
                    <span className="ml-1 text-secondary">*</span>
                  </label>
                </div>

                <div
                  ref={designationRef}
                  className="relative flex flex-1 items-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDesignationOpen((previous) => !previous)
                    }
                    disabled={loadingDesignations}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      className={
                        selectedDesignation
                          ? "text-text-primary"
                          : "text-text-muted"
                      }
                    >
                      {loadingDesignations
                        ? "Loading designations..."
                        : selectedDesignation
                          ? selectedDesignation.name
                          : "Select designation"}
                    </span>

                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-text-secondary transition-transform ${
                        designationOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {designationOpen && !loadingDesignations && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-white py-1 shadow-lg">
                      {designations.length === 0 ? (
                        <div className="px-3 py-3 text-center text-sm text-text-muted">
                          No designations available.
                        </div>
                      ) : (
                        designations.map((item) => {
                          const isSelected =
                            String(item.id) === formData.designation;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setFormData((previous) => ({
                                  ...previous,
                                  designation: String(item.id),
                                }));

                                setDesignationOpen(false);

                                if (errors.designation) {
                                  setErrors((previous) => ({
                                    ...previous,
                                    designation: "",
                                  }));
                                }
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "text-text-primary hover:bg-surface-grey"
                              }`}
                            >
                              <span>{item.name}</span>

                              {isSelected && (
                                <Check
                                  size={14}
                                  strokeWidth={3}
                                />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {errors.designation && (
                <p className="mt-1 pl-2 text-sm text-danger">
                  {errors.designation}
                </p>
              )}
            </div>

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

            {/* IMAGE UPLOAD */}
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
                    onError={() => {
                      setImagePreview(null);
                    }}
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

          {/* GENERAL ERROR */}
          {errors.general && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {errors.general}
            </div>
          )}

          {/* BUTTONS */}
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
              disabled={saving || checkingEmail || checkingPhone}
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
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex min-h-[38px] w-full overflow-hidden rounded-md border border-border bg-white">
      <div className="flex min-w-fit items-center bg-gray-100 px-3 py-2">
        <label
          htmlFor={name}
          className="text-sm font-medium text-text-primary"
        >
          {label}

          {required && <span className="ml-1 text-secondary">*</span>}
        </label>
      </div>

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