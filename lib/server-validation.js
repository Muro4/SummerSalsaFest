import 'server-only';
import { ApiError } from "./room-server";
import { isOptionalEmail } from "./validation";
export function emailAddress(value) {
  if (typeof value !== "string" || !value.trim() || !isOptionalEmail(value) || /[,;<>\r\n]/.test(value)) throw new ApiError("invalidInput");
  return value.trim().toLowerCase();
}
export function boundedText(value, maximum, optional = false) {
  if (optional && value == null) return "";
  if (typeof value !== "string" || value.length > maximum || (!optional && !value.trim())) throw new ApiError("invalidInput");
  return value.trim();
}
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
