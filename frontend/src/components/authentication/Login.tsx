"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../constants/api";

export default function Login() {
  const router = useRouter();

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous messages
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
    setSuccessMessage("");

    const formData = new FormData(e.currentTarget);

    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    // ---------------------------------------------------------
    // Frontend validation
    // ---------------------------------------------------------

    if (!email) {
      setEmailError("Email is required.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------------
      // Send login request to backend
      // -------------------------------------------------------

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      // -------------------------------------------------------
      // User not found
      // -------------------------------------------------------

      if (data.code === "USER_NOT_FOUND") {
        setEmailError("No such user found.");
        return;
      }

      // -------------------------------------------------------
      // Wrong password
      // -------------------------------------------------------

      if (data.code === "WRONG_PASSWORD") {
        setPasswordError("Wrong password.");
        return;
      }

      // -------------------------------------------------------
      // Other backend error
      // -------------------------------------------------------

      if (!response.ok || !data.success) {
        setGeneralError(
          data.message || "Login failed. Please try again."
        );
        return;
      }

      // -------------------------------------------------------
      // Successful login
      // -------------------------------------------------------

      setSuccessMessage("Login successful. Welcome back!");

      // Give the user a moment to see the success message
      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (error) {
      console.error("Login request failed:", error);

      setGeneralError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="flex min-h-screen w-full items-center justify-center px-6 sm:px-10">
        {/* Login Form */}
        <div
          className="
            w-full max-w-[400px]
            rounded-xl
            border border-border/70
            bg-white/95
            p-7
            shadow-[0_15px_40px_rgba(34,31,36,0.10)]
            backdrop-blur-sm
            sm:p-9
          "
        >
          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-[30px] font-bold leading-tight text-palette-dark">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-text-secondary">
              Login to your account
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-text-primary"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className="
                  h-[46px]
                  w-full
                  rounded-md
                  border
                  border-border
                  bg-white
                  px-3.5
                  text-sm
                  text-text-primary
                  outline-none
                  placeholder:text-text-muted
                  focus:border-palette-burgundy
                  focus:ring-3
                  focus:ring-palette-burgundy/10
                "
              />

              {/* Email Error */}
              {emailError && (
                <p className="text-sm text-danger">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-text-primary"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                defaultValue="000000"
                placeholder="Enter your password"
                required
                className="
                  h-[46px]
                  w-full
                  rounded-md
                  border
                  border-border
                  bg-white
                  px-3.5
                  text-sm
                  text-text-primary
                  outline-none
                  placeholder:text-text-muted
                  focus:border-palette-burgundy
                  focus:ring-3
                  focus:ring-palette-burgundy/10
                "
              />

              {/* Password Error */}
              {passwordError && (
                <p className="text-sm text-danger">
                  {passwordError}
                </p>
              )}
            </div>

            {/* General Error */}
            {generalError && (
              <div
                className="
                  rounded-md
                  border
                  border-danger/20
                  bg-danger/5
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  text-danger
                "
              >
                {generalError}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                className="
                  rounded-md
                  border
                  border-green-200
                  bg-green-50
                  px-3
                  py-2.5
                  text-center
                  text-sm
                  font-medium
                  text-green-700
                "
              >
                {successMessage}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-1
                h-[46px]
                w-full
                cursor-pointer
                rounded-md
                border-0
                bg-palette-burgundy
                text-[15px]
                font-semibold
                text-white
                transition-all
                duration-200
                hover:bg-palette-dark
                hover:shadow-[0_6px_15px_rgba(34,31,36,0.15)]
                active:translate-y-px
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}