"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";

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
  const [processedImage, setProcessedImage] = useState<File | null>(null);

  const [branchCount, setBranchCount] = useState<number>(0);
  const [branchCountRemaining, setBranchCountRemaining] = useState<number>(0);

  const [loadingBranchCount, setLoadingBranchCount] = useState<boolean>(true);

  const [checkingEmail, setCheckingEmail] = useState<boolean>(false);
  const [checkingPhone, setCheckingPhone] = useState<boolean>(false);

  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // CLEANUP DEBOUNCE TIMERS
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
  // EMAIL VALIDATION
  // =========================================================
  const validateEmail = (email: string): boolean => {
    const emailAtIndex = email.indexOf("@");

    return (
      emailAtIndex > 0 &&
      emailAtIndex < email.length - 1 &&
      email.includes(".", emailAtIndex + 1) &&
      !email.includes(" ")
    );
  };

  // =========================================================
  // PHONE VALIDATION
  // =========================================================
  const validatePhone = (phone: string): boolean => {
    return /^\d{11}$/.test(phone);
  };

  // =========================================================
  // CHECK DUPLICATE VALUE
  // =========================================================
  const checkDuplicate = async (field: "email" | "phone", value: string) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return;
    }

    if (field === "email" && !validateEmail(cleanValue)) {
      return;
    }

    if (field === "phone" && !/^\d{11}$/.test(cleanValue)) {
      return;
    }

    try {
      if (field === "email") {
        setCheckingEmail(true);
      } else {
        setCheckingPhone(true);
      }

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
            value: cleanValue,
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
      console.error(`Duplicate ${field} check failed:`, error);
    } finally {
      if (field === "email") {
        setCheckingEmail(false);
      } else {
        setCheckingPhone(false);
      }
    }
  };

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================
  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    // ---------------------------------------------------------
    // PHONE
    // ---------------------------------------------------------

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      const phoneValue = digitsOnly.slice(0, 11);

      setFormData((previous) => ({
        ...previous,
        phone: phoneValue,
      }));

      // Clear general error
      setErrors((previous) => ({
        ...previous,
        general: "",
      }));

      // Clear previous duplicate-check timer
      if (phoneCheckTimer.current) {
        clearTimeout(phoneCheckTimer.current);
      }

      // -------------------------------------------------------
      // REAL-TIME PHONE VALIDATION
      // -------------------------------------------------------

      let phoneError = "";

      if (phoneValue.length === 0) {
        phoneError = "";
      } else if (phoneValue.length < 11) {
        phoneError = "Phone number must contain exactly 11 digits.";
      } else if (!validatePhone(phoneValue)) {
        phoneError = "Phone number must contain exactly 11 digits.";
      }

      setErrors((previous) => ({
        ...previous,
        phone: phoneError,
      }));

      // -------------------------------------------------------
      // DUPLICATE PHONE CHECK
      // Only check when exactly 11 digits are entered
      // -------------------------------------------------------

      if (phoneValue.length === 11 && validatePhone(phoneValue)) {
        phoneCheckTimer.current = setTimeout(() => {
          checkDuplicate("phone", phoneValue);
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

      // Clear general error
      setErrors((previous) => ({
        ...previous,
        general: "",
      }));

      // Clear previous duplicate-check timer
      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
      }

      const cleanEmail = value.trim();

      // -------------------------------------------------------
      // REAL-TIME EMAIL VALIDATION
      // -------------------------------------------------------

      let emailError = "";

      if (cleanEmail.length === 0) {
        emailError = "";
      } else if (!validateEmail(cleanEmail)) {
        emailError =
          "Please enter a valid email address (example: name@example.com).";
      }

      setErrors((previous) => ({
        ...previous,
        email: emailError,
      }));

      // -------------------------------------------------------
      // DUPLICATE EMAIL CHECK
      // Only check when email format is valid
      // -------------------------------------------------------

      if (validateEmail(cleanEmail)) {
        emailCheckTimer.current = setTimeout(() => {
          checkDuplicate("email", cleanEmail);
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
  // PROCESS IMAGE
  //
  // Any size / any dimension:
  // 1. Center crop to square
  // 2. Resize maximum 512x512
  // 3. Convert to JPEG
  // 4. Compress until <= 50 KB
  // =========================================================
  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const image = new Image();

      const objectUrl = URL.createObjectURL(file);

      image.onload = async () => {
        try {
          URL.revokeObjectURL(objectUrl);

          const sourceWidth = image.naturalWidth;
          const sourceHeight = image.naturalHeight;

          if (!sourceWidth || !sourceHeight) {
            throw new Error("Invalid image dimensions.");
          }

          // ---------------------------------------------------
          // CENTER CROP TO SQUARE
          // ---------------------------------------------------
          const cropSize = Math.min(sourceWidth, sourceHeight);

          const cropX = Math.floor((sourceWidth - cropSize) / 2);

          const cropY = Math.floor((sourceHeight - cropSize) / 2);

          // ---------------------------------------------------
          // RESIZE TO MAX 512x512
          // ---------------------------------------------------
          const outputSize = Math.min(cropSize, 512);

          const canvas = document.createElement("canvas");

          canvas.width = outputSize;
          canvas.height = outputSize;

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not create image processing context.");
          }

          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";

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

          // ---------------------------------------------------
          // COMPRESS IMAGE
          // ---------------------------------------------------
          const MAX_FILE_SIZE = 50 * 1024;

          const qualities = [
            0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35,
            0.3,
          ];

          const convertCanvasToBlob = (
            quality: number,
          ): Promise<Blob | null> => {
            return new Promise((blobResolve) => {
              canvas.toBlob(
                (blob) => {
                  blobResolve(blob);
                },
                "image/jpeg",
                quality,
              );
            });
          };

          let finalBlob: Blob | null = null;

          // First try quality compression.
          for (const quality of qualities) {
            const blob = await convertCanvasToBlob(quality);

            if (!blob) {
              continue;
            }

            if (blob.size <= MAX_FILE_SIZE) {
              finalBlob = blob;
              break;
            }
          }

          // ---------------------------------------------------
          // IF STILL TOO LARGE, REDUCE DIMENSIONS
          // ---------------------------------------------------
          if (!finalBlob) {
            let currentSize = outputSize;

            while (currentSize > 128) {
              currentSize = Math.floor(currentSize * 0.85);

              canvas.width = currentSize;
              canvas.height = currentSize;

              context.clearRect(0, 0, currentSize, currentSize);

              context.imageSmoothingEnabled = true;
              context.imageSmoothingQuality = "high";

              context.drawImage(
                image,
                cropX,
                cropY,
                cropSize,
                cropSize,
                0,
                0,
                currentSize,
                currentSize,
              );

              for (const quality of qualities) {
                const blob = await convertCanvasToBlob(quality);

                if (!blob) {
                  continue;
                }

                if (blob.size <= MAX_FILE_SIZE) {
                  finalBlob = blob;
                  break;
                }
              }

              if (finalBlob) {
                break;
              }
            }
          }

          if (!finalBlob) {
            throw new Error("Unable to compress image below 50 KB.");
          }

          // ---------------------------------------------------
          // CREATE FINAL FILE
          // ---------------------------------------------------
          const finalFile = new File([finalBlob], "branch-logo.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve(finalFile);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Invalid image file."));
      };

      image.src = objectUrl;
    });
  };

  // =========================================================
  // IMAGE CHANGE
  // =========================================================
  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const processedFile = await processImage(file);

      // -------------------------------------------------------
      // SAVE PROCESSED FILE
      // -------------------------------------------------------
      setProcessedImage(processedFile);

      // -------------------------------------------------------
      // PREVIEW PROCESSED IMAGE
      // -------------------------------------------------------
      const previewUrl = URL.createObjectURL(processedFile);

      setImagePreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return previewUrl;
      });
    } catch (error) {
      console.error("Image processing error:", error);

      event.target.value = "";

      setProcessedImage(null);

      setImagePreview(null);

      await Swal.fire({
        icon: "error",
        title: "Image processing failed",
        text:
          error instanceof Error
            ? error.message
            : "Unable to process the selected image.",
        confirmButtonColor: "#7d1119",
      });
    }
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // =========================================================
    // STOP WHILE BRANCH COUNT IS LOADING
    // =========================================================
    if (loadingBranchCount) {
      return;
    }

    // =========================================================
    // STOP IF NO BRANCH SLOT
    // =========================================================
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

    // =========================================================
    // EMAIL VALIDATION
    // =========================================================
    if (!validateEmail(email)) {
      setErrors((previous) => ({
        ...previous,
        email:
          "Please enter a valid email address (example: name@example.com).",
      }));

      hasError = true;
    }

    // =========================================================
    // PHONE VALIDATION
    // =========================================================
    if (!validatePhone(phone)) {
      setErrors((previous) => ({
        ...previous,
        phone: "Phone number must contain exactly 11 digits.",
      }));

      hasError = true;
    }

    // =========================================================
    // CHECK DUPLICATE STATUS
    // =========================================================
    if (checkingEmail || checkingPhone) {
      setErrors((previous) => ({
        ...previous,
        general: "Please wait while we verify your email and phone number.",
      }));

      return;
    }

    // =========================================================
    // STOP IF DUPLICATE ERROR ALREADY EXISTS
    // =========================================================
    if (errors.email || errors.phone) {
      return;
    }

    // =========================================================
    // STOP IF VALIDATION FAILED
    // =========================================================
    if (hasError) {
      return;
    }

    // =========================================================
    // FORM DATA
    // =========================================================
    const form = new FormData();

    form.append("branchName", formData.branchName.trim());
    form.append("name", formData.name.trim());
    form.append("email", email);
    form.append("phone", phone);
    form.append("password", formData.password);
    form.append("designation", formData.designation.trim());
    form.append("location", formData.location.trim());

    // =========================================================
    // APPEND PROCESSED IMAGE IF PROVIDED
    // =========================================================

    if (processedImage) {
      form.append("logo", processedImage);
    }

    // =========================================================
    // SEND TO BACKEND
    // =========================================================
    try {
      const response = await fetch(`${API_BASE_URL}/api/registration/branch`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await response.json();

      // =======================================================
      // BACKEND VALIDATION ERROR
      // =======================================================
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

        if (data.code === "NO_BRANCH_SLOT") {
          setBranchCountRemaining(0);

          setErrors((previous) => ({
            ...previous,
            general: data.message || "No branch slots remaining.",
          }));

          return;
        }

        setErrors((previous) => ({
          ...previous,
          general: data.message || "Branch registration failed.",
        }));

        return;
      }

      // =======================================================
      // UPDATE REMAINING BRANCH COUNT
      // =======================================================
      if (data.data && typeof data.data.branchCount_Remaining !== "undefined") {
        setBranchCountRemaining(Number(data.data.branchCount_Remaining) || 0);
      } else {
        setBranchCountRemaining((previous) => Math.max(previous - 1, 0));
      }

      // =======================================================
      // SUCCESS
      // =======================================================
      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text: "The branch has been registered successfully.",
        confirmButtonText: "OK",
        confirmButtonColor: "#7d1119",
      });

      // =======================================================
      // RESET FORM
      // =======================================================
      setFormData({
        branchName: "",
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        location: "",
      });

      setProcessedImage(null);

      setImagePreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });

      setErrors({
        email: "",
        phone: "",
        general: "",
      });

      const imageInput = document.getElementById(
        "branch-image",
      ) as HTMLInputElement | null;

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

  // =========================================================
  // FETCH BRANCH COUNT
  // =========================================================
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
        ====================================================== */}
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
        ====================================================== */}
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

                {checkingEmail && !errors.email && (
                  <p className="mt-1 pl-2 text-xs text-gray-500">
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
                  <p className="mt-1 pl-2 text-xs text-gray-500">
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
                  OPTIONAL IMAGE UPLOAD
              ================================================== */}
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
                      : "Click or drag image here to upload (Optional)"}
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
