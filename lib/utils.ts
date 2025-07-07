import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getApiUrl } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a random room code (6 uppercase letters)
export function generateRoomCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking characters
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// API utility function for logging study/practice time
export async function logStudyTime(
  type: "practice" | "learn",
  minutes: number,
  description?: string
): Promise<boolean> {
  try {
    const response = await fetch(
      getApiUrl("api/v1/user/study-time/add"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          type,
          minutes,
          sessionDescription: description || "",
          completedAt: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      console.warn("Failed to log study time:", response.statusText);
      return false;
    }

    console.log(`✅ Successfully logged ${minutes} minutes of ${type} time`);
    return true;
  } catch (error) {
    console.error("Error logging study time:", error);
    return false;
  }
}
