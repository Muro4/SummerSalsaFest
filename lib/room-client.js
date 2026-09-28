import { auth } from "@/lib/firebase";

export async function roomRequest(path, body) {
  if (!auth.currentUser) throw new Error("unauthorized");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "serverError");
  return result;
}

export function roomError(t, error) {
  return t.has(`errors.${error.message}`) ? t(`errors.${error.message}`) : t("errors.serverError");
}
