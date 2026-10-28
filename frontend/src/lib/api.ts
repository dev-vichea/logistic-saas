import axios from "axios";
export const api = axios.create({
  baseURL: "/",
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
});
export async function csrf() {
  await api.get("/sanctum/csrf-cookie");
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const fields = error.response?.data?.errors;
    if (fields) return Object.values(fields).flat().join(" ");
    return (
      error.response?.data?.message || "Unable to connect. Please try again."
    );
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}
