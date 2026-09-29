"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

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
  AlertCircle,
  CheckCircle2,
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

export default function CompanyRegistration() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("id");
  const isEditMode = Boolean(companyId);

  const [loadingCompany, setLoadingCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [restaurantType, setRestaurantType] = useState<string[]>([]);
  const [restaurantTypeOpen, setRestaurantTypeOpen] = useState(false);

  /* ------------------------------------------------------------------
     Designation dropdown
     ------------------------------------------------------------------ */
  const [designationId, setDesignationId] = useState("");
  const [designationOpen, setDesignationOpen] = useState(false);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loadingDesignations, setLoadingDesignations] = useState(true);

  const restaurantTypeRef = useRef<HTMLDivElement>(null);
  const designationRef = useRef<HTMLDivElement>(null);

  const emailDuplicateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const phoneDuplicateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
    address: "",
  });

  /* ------------------------------------------------------------------
     Inline status message
     ------------------------------------------------------------------ */
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null,
  );

  const showStatus = (
    type: StatusMessage["type"],
    title: string,
    text: string,
  ) => {
    setStatusMessage({ type, title, text });
  };

  const clearStatus = () => {
    setStatusMessage(null);
  };

  /* ------------------------------------------------------------------
     Field errors
     ------------------------------------------------------------------ */
  const [errors, setErrors] = useState({
    email: "",
    phone: "",
    designation: "",
    general: "",
  });

  const [touched, setTouched] = useState({
    email: false,
    phone: false,
  });

  /* ------------------------------------------------------------------
     Auto-dismiss status
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  /* ------------------------------------------------------------------
     Validation helpers
     ------------------------------------------------------------------ */
  const validateEmail = (email: string): string => {
    const trimmed = email.trim();
    if (!trimmed) return "Email is required.";

    const emailAtIndex = trimmed.indexOf("@");
    const isValid =
      emailAtIndex > 0 &&
      emailAtIndex < trimmed.length - 1 &&
      trimmed.includes(".", emailAtIndex + 1) &&
      !trimmed.includes(" ");

    return isValid
      ? ""
      : "Please enter a valid email address (example: name@example.com).";
  };

  const validatePhone = (phone: string): string => {
    const trimmed = phone.trim();
    if (!trimmed) return "Phone number is required.";

    const phoneRegex = /^\d{11}$/;
    return phoneRegex.test(trimmed)
      ? ""
      : "Phone number must contain exactly 11 digits.";
  };

  /* ------------------------------------------------------------------
     Click outside handler (restaurant type + designation)
     ------------------------------------------------------------------ */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        restaurantTypeRef.current &&
        !restaurantTypeRef.current.contains(event.target as Node)
      ) {
        setRestaurantTypeOpen(false);
      }

      if (
        designationRef.current &&
        !designationRef.current.contains(event.target as Node)
      ) {
        setDesignationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ------------------------------------------------------------------
     Cleanup timers
     ------------------------------------------------------------------ */
  useEffect(() => {
    return () => {
      if (emailDuplicateTimerRef.current) {
        clearTimeout(emailDuplicateTimerRef.current);
      }

      if (phoneDuplicateTimerRef.current) {
        clearTimeout(phoneDuplicateTimerRef.current);
      }
    };
  }, []);

  /* ------------------------------------------------------------------
     Fetch restaurant categories
     ------------------------------------------------------------------ */
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

        showStatus(
          "error",
          "Failed to load restaurant types",
          "Unable to load restaurant types from the server.",
        );
      } finally {
        setLoadingRestaurantCategories(false);
      }
    };

    fetchRestaurantCategories();
  }, []);

  /* ------------------------------------------------------------------
     Fetch designations
     ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        setLoadingDesignations(true);

        const response = await fetch(
          `${API_BASE_URL}/api/registration/designations`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch designations.",
          );
        }

        setDesignations(data.data || []);
      } catch (error) {
        console.error("Error fetching designations:", error);

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

  /* ------------------------------------------------------------------
     Fetch company for edit
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!companyId) return;

    const fetchCompany = async () => {
      try {
        setLoadingCompany(true);

        const response = await fetch(
          `${API_BASE_URL}/api/registration/company/${companyId}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load company.");
        }

        const company = result.data;

        /* ----------------------------------------------------------
           Populate form state, including `name` and `designation`
           ---------------------------------------------------------- */
        setFormData((previous) => ({
          ...previous,
          companyName: company.company_name || "",
          name: company.name || "",
          email: company.email || "",
          phone: company.phone || "",
          address: company.address || "",
          password: "",
        }));

        /* Designation */
        if (company.designation) {
          setDesignationId(String(company.designation));
        }

        /* Restaurant types */
        let restaurantTypes: string[] = [];

        if (company.restaurant_type) {
          try {
            const parsed =
              typeof company.restaurant_type === "string"
                ? JSON.parse(company.restaurant_type)
                : company.restaurant_type;

            if (Array.isArray(parsed)) {
              restaurantTypes = parsed.map(String);
            }
          } catch (error) {
            console.error("Failed to parse restaurant types:", error);
          }
        }

        setRestaurantType(restaurantTypes);

        /* ----------------------------------------------------------
           Branch count
           ---------------------------------------------------------- */
        const savedBranchCount = Number(company.branchCount ?? 0);

        if (savedBranchCount >= 0 && savedBranchCount <= 5) {
          setBranchCount(String(savedBranchCount));
          setCustomBranchCount("");
        } else {
          setBranchCount("Custom");
          setCustomBranchCount(String(savedBranchCount));
        }

        /* ----------------------------------------------------------
           Logo preview
           ----------------------------------------------------------
           The DB stores the logo as a path such as:
             /uploads/company/xxx.jpg

           Some legacy rows may only store the filename:
             xxx.jpg

           Handle both cases without producing a double-prefixed URL.
           ---------------------------------------------------------- */
        if (company.logo) {
          const logo = String(company.logo).trim();

          const logoSrc = logo.startsWith("http")
            ? logo
            : logo.startsWith("/uploads/")
              ? `${API_BASE_URL}${logo}`
              : logo.includes("/")
                ? `${API_BASE_URL}${logo}`
                : `${API_BASE_URL}/uploads/company/${logo}`;

          setImagePreview(logoSrc);
        }
      } catch (error) {
        console.error("Failed to fetch company for editing:", error);

        showStatus(
          "error",
          "Failed to load company",
          error instanceof Error
            ? error.message
            : "Unable to load company information.",
        );
      } finally {
        setLoadingCompany(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  /* ------------------------------------------------------------------
     Server-side duplicate check
     ------------------------------------------------------------------ */
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
          body: JSON.stringify({
            field,
            value: value.trim(),
            companyId: companyId ? Number(companyId) : undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      if (data.exists) {
        setErrors((prev) => ({
          ...prev,
          [field]:
            field === "email"
              ? "This email address is already registered."
              : "This phone number is already registered.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    } catch (error) {
      console.error(`Failed to check duplicate for ${field}:`, error);
    }
  };

  /* ------------------------------------------------------------------
     Realtime input change handler
     ------------------------------------------------------------------ */
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    clearStatus();

    /* ---------------- PHONE ---------------- */
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);

      setFormData((previous) => ({
        ...previous,
        phone: digitsOnly,
      }));

      if (phoneDuplicateTimerRef.current) {
        clearTimeout(phoneDuplicateTimerRef.current);
      }

      const phoneErr = validatePhone(digitsOnly);

      setErrors((previous) => ({
        ...previous,
        phone: phoneErr,
        general: "",
      }));

      if (!phoneErr) {
        phoneDuplicateTimerRef.current = setTimeout(() => {
          checkDuplicateOnServer("phone", digitsOnly);
        }, 2000);
      }

      return;
    }

    /* ---------------- EMAIL ---------------- */
    if (name === "email") {
      setFormData((previous) => ({
        ...previous,
        email: value,
      }));

      if (emailDuplicateTimerRef.current) {
        clearTimeout(emailDuplicateTimerRef.current);
      }

      const emailErr = validateEmail(value);

      setErrors((previous) => ({
        ...previous,
        email: emailErr,
        general: "",
      }));

      if (!emailErr) {
        emailDuplicateTimerRef.current = setTimeout(() => {
          checkDuplicateOnServer("email", value);
        }, 2000);
      }

      return;
    }

    /* ---------------- OTHER ---------------- */
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      general: "",
    }));
  };

  /* ------------------------------------------------------------------
     Image change handler
     ------------------------------------------------------------------ */
  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = new Image();
      const imageUrl = URL.createObjectURL(file);
      image.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image."));
      });

      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const cropSize = Math.min(sourceWidth, sourceHeight);

      const cropX = (sourceWidth - cropSize) / 2;
      const cropY = (sourceHeight - cropSize) / 2;

      let outputSize = Math.min(cropSize, 512);
      let compressedBlob: Blob | null = null;

      while (outputSize >= 64) {
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Unable to process image.");

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, outputSize, outputSize);

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

        if (compressedBlob) break;
        outputSize = Math.floor(outputSize * 0.8);
      }

      if (!compressedBlob || compressedBlob.size > 50 * 1024) {
        throw new Error("Unable to compress image below 50 KB.");
      }

      const processedFile = new File([compressedBlob], "company-logo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      const previewUrl = URL.createObjectURL(processedFile);

      setImagePreview((previous) => {
        if (previous && previous.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }
        return previewUrl;
      });

      setCompanyLogo(processedFile);
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error("Image processing error:", error);
      setImagePreview(null);
      setCompanyLogo(null);
      event.target.value = "";

      showStatus(
        "error",
        "Unable to process image",
        "Please select a valid image.",
      );
    }
  };

  /* ------------------------------------------------------------------
     Submit
     ------------------------------------------------------------------ */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    clearStatus();

    const email = formData.email.trim();
    const phone = formData.phone.trim();

    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);

    let generalError = "";
    let designationError = "";

    if (!designationId) {
      designationError = "Please select a designation.";
    }

    if (restaurantType.length === 0) {
      generalError = "Please select at least one restaurant type.";
    }

    const finalBranchCount =
      branchCount === "Custom"
        ? customBranchCount.trim() === ""
          ? 0
          : Number(customBranchCount)
        : Number(branchCount);

    if (!Number.isInteger(finalBranchCount) || finalBranchCount < 0) {
      generalError = "Please enter a valid branch count.";
    }

    setTouched({ email: true, phone: true });

    setErrors({
      email: emailError,
      phone: phoneError,
      designation: designationError,
      general: generalError,
    });

    if (emailError || phoneError || designationError || generalError) return;

    try {
      setSubmitting(true);

      /* ---------------- EDIT ---------------- */
      if (isEditMode && companyId) {
        const response = await fetch(
          `${API_BASE_URL}/api/registration/company/${companyId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              companyName: formData.companyName.trim(),
              name: formData.name.trim(),
              email,
              phone,
              address: formData.address.trim(),
              restaurantType,
              branchCount: finalBranchCount,
              designation: Number(designationId),
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          if (data.code === "EMAIL_EXISTS") {
            setErrors((previous) => ({
              ...previous,
              email:
                data.message || "This email address is already registered.",
              general: "",
            }));
            return;
          }

          if (data.code === "PHONE_EXISTS") {
            setErrors((previous) => ({
              ...previous,
              phone:
                data.message || "This phone number is already registered.",
              general: "",
            }));
            return;
          }

          if (data.code === "EMAIL_PHONE_EXISTS") {
            setErrors((previous) => ({
              ...previous,
              email:
                data.emailMessage ||
                "This email address is already registered.",
              phone:
                data.phoneMessage ||
                "This phone number is already registered.",
              general: "",
            }));
            return;
          }

          showStatus(
            "error",
            "Update failed",
            data.message || "Update failed.",
          );

          return;
        }

        showStatus(
          "success",
          "Company updated successfully",
          "Redirecting...",
        );

        setTimeout(() => {
          window.location.href = "/root/list";
        }, 1200);

        return;
      }

      /* ---------------- CREATE ---------------- */
      const form = new FormData();

      form.append("companyName", formData.companyName.trim());
      form.append("name", formData.name.trim());
      form.append("email", email);
      form.append("phone", phone);
      form.append("password", formData.password);
      form.append("designation", String(designationId));
      form.append("address", formData.address.trim());
      form.append("restaurantType", JSON.stringify(restaurantType));
      form.append("branchCount", String(finalBranchCount));

      if (companyLogo) {
        form.append("logo", companyLogo);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/registration/company`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        },
      );

      const data = await response.json();

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
            phone:
              data.message || "This phone number is already registered.",
          }));
          return;
        }

        if (data.code === "EMAIL_PHONE_EXISTS") {
          setErrors((previous) => ({
            ...previous,
            email: data.emailMessage || "This email is already registered.",
            phone:
              data.phoneMessage ||
              "This phone number is already registered.",
          }));
          return;
        }

        showStatus(
          "error",
          "Registration failed",
          data.message || "Registration failed.",
        );

        return;
      }

      showStatus(
        "success",
        "Company registered successfully",
        "Redirecting...",
      );

      setTimeout(() => {
        window.location.href = "/root/list";
      }, 1200);
    } catch (error) {
      console.error("Submit error:", error);

      showStatus(
        "error",
        "Unable to connect to the server",
        error instanceof Error
          ? error.message
          : "Please try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------
     Status helpers
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     Selected designation object
     ------------------------------------------------------------------ */
  const selectedDesignation = designations.find(
    (item) => String(item.id) === designationId,
  );

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto w-full max-w-[620px]">
        {/* Header */}
        <div className="mb-0 bg-primary px-5 py-4 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {isEditMode ? "Edit Company" : "Company Registration"}
          </h1>
        </div>

        {/* Inline status */}
        {statusMessage && (
          <div
            className={`flex items-start gap-2 rounded-none border-x border-b px-3 py-2 text-xs ${statusStyles[statusMessage.type]}`}
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
              onClick={clearStatus}
              className="shrink-0 rounded p-0.5 transition hover:bg-black/10"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Form */}
        <form
          noValidate
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
                <button
                  type="button"
                  onClick={() =>
                    setRestaurantTypeOpen((previous) => !previous)
                  }
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
                                    previous.filter(
                                      (id) => id !== selectedId,
                                    ),
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

                {restaurantTypeOpen && !loadingRestaurantCategories && (
                  <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-md border border-border bg-white shadow-lg">
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

                    <div className="max-h-60 overflow-y-auto py-1">
                      {restaurantCategories.map((category) => {
                        const catId = String(category.id);
                        const isSelected = restaurantType.includes(catId);

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setRestaurantType((previous) => {
                                if (previous.includes(catId)) {
                                  return previous.filter(
                                    (id) => id !== catId,
                                  );
                                }
                                return [...previous, catId];
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
            {!isEditMode && (
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
            )}

            {/* Designation (Dropdown) */}
            <div>
              <div className="mb-2 flex items-center gap-3">
                <BriefcaseBusiness
                  size={20}
                  strokeWidth={2}
                  className="text-text-primary"
                />
                <label className="text-base font-bold text-text-primary">
                  Designation
                  <span className="ml-1 text-secondary">*</span>
                </label>
              </div>

              <div ref={designationRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setDesignationOpen((previous) => !previous)
                  }
                  disabled={loadingDesignations}
                  className="flex min-h-[46px] w-full items-center justify-between gap-3 border-b-2 border-secondary-light bg-transparent px-0 py-2 text-left outline-none transition-colors hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={
                      selectedDesignation
                        ? "text-[16px] text-text-primary"
                        : "text-[16px] text-text-muted"
                    }
                  >
                    {loadingDesignations
                      ? "Loading designations..."
                      : selectedDesignation
                        ? selectedDesignation.name
                        : "Select designation..."}
                  </span>

                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-text-secondary transition-transform duration-200 ${
                      designationOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {designationOpen && !loadingDesignations && (
                  <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-md border border-border bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto py-1">
                      {designations.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-text-muted">
                          No designations available.
                        </div>
                      ) : (
                        designations.map((item) => {
                          const isSelected =
                            String(item.id) === designationId;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setDesignationId(String(item.id));
                                setDesignationOpen(false);

                                if (errors.designation) {
                                  setErrors((previous) => ({
                                    ...previous,
                                    designation: "",
                                  }));
                                }
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                                isSelected
                                  ? "bg-primary-light text-white"
                                  : "text-text-primary hover:bg-surface"
                              }`}
                            >
                              <span>{item.name}</span>

                              {isSelected && (
                                <Check size={14} strokeWidth={3} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errors.designation && (
                <p className="mt-1 text-sm text-danger">
                  {errors.designation}
                </p>
              )}
            </div>

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
                </label>
              </div>

              <div className="flex items-center gap-3 border-b-2 border-secondary-light pb-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {["0", "1", "2", "3", "4", "5", "Custom"].map((value) => (
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

                {branchCount === "Custom" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customBranchCount}
                    onChange={(event) => {
                      const rawValue = event.target.value;

                      if (rawValue === "") {
                        setCustomBranchCount("");
                        return;
                      }

                      if (!/^\d+$/.test(rawValue)) {
                        return;
                      }

                      const normalized =
                        rawValue.replace(/^0+(?=\d)/, "") || "0";

                      setCustomBranchCount(normalized);
                    }}
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "." ||
                        event.key === "-" ||
                        event.key === "+" ||
                        event.key.toLowerCase() === "e"
                      ) {
                        event.preventDefault();
                      }
                    }}
                    placeholder="0"
                    className="w-20 shrink-0 appearance-none border-b-2 border-secondary-light bg-transparent px-1 py-1 text-center text-[16px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary"
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
                    onError={() => {
                      /* If the stored URL is broken, clear it so the
                         upload icon is shown instead of a broken image. */
                      setImagePreview(null);
                    }}
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
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">
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
              disabled={
                submitting || loadingCompany || loadingDesignations
              }
              className="inline-flex min-w-[135px] items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Registering..."
                : isEditMode
                  ? "Update"
                  : "Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   Reusable Input Field Component
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