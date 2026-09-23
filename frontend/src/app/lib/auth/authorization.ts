import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "../../../constants/api";

export async function checkPermission(path: string) {
  const cookieStore = await cookies();

  // Your login creates "auth", not "userId"
  const authCookie = cookieStore.get("auth")?.value;

  console.log("=================================");
  console.log("NEXT.JS PERMISSION CHECK");
  console.log("Auth cookie:", authCookie);
  console.log("Requested path:", path);

  // ---------------------------------------
  // No logged-in user
  // ---------------------------------------
  if (!authCookie) {
    console.log("NO AUTH COOKIE -> LOGIN");
    redirect("/login");
  }

  // ---------------------------------------
  // Parse auth cookie
  // ---------------------------------------
  let user;

  try {
    user = JSON.parse(decodeURIComponent(authCookie));
  } catch (error) {
    console.error("AUTH COOKIE PARSE ERROR:", error);
    redirect("/login");
  }

  const userId = Number(user.id);

  console.log("Parsed user:", user);
  console.log("User ID:", userId);
  console.log("Path:", path);

  // ---------------------------------------
  // Invalid user ID
  // ---------------------------------------
  if (!userId || Number.isNaN(userId)) {
    console.log("INVALID USER ID -> LOGIN");
    redirect("/login");
  }

  // ---------------------------------------
  // Send auth cookie to backend
  // ---------------------------------------
  const response = await fetch(
    `${API_BASE_URL}/api/authorization/check?path=${encodeURIComponent(path)}`,
    {
      method: "GET",
      headers: {
        Cookie: `auth=${authCookie}`,
      },
      cache: "no-store",
    }
  );

  console.log("Permission API status:", response.status);

  // ---------------------------------------
  // Read backend response
  // ---------------------------------------
  const data = await response.json();

  console.log("Permission API response:", data);

  // ---------------------------------------
  // Not authenticated
  // ---------------------------------------
  if (response.status === 401) {
    console.log("401 -> LOGIN");
    redirect("/login");
  }

  // ---------------------------------------
  // Permission denied
  // ---------------------------------------
  if (response.status === 403) {
    console.log("403 -> LOGIN");
    redirect("/login");
  }

  // ---------------------------------------
  // Other error
  // ---------------------------------------
  if (!response.ok) {
    console.log("OTHER ERROR");
    throw new Error("Failed to check permission");
  }

  // ---------------------------------------
  // Permission denied
  // ---------------------------------------
  if (!data.allowed) {
    console.log("allowed=false -> LOGIN");
    redirect("/login");
  }

  // ---------------------------------------
  // Permission granted
  // ---------------------------------------
  console.log("PERMISSION GRANTED");

  return true;
}