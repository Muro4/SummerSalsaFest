"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { isOptionalEmail } from "@/lib/validation";
import { roomRequest } from "@/lib/room-client";

export default function EditableEmail({ ticket, onSaved }) {
  const t = useTranslations("HistoryTab");
  const email = ticket.guestEmail ?? ticket.email ?? "";
  const [value, setValue] = useState(email);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const cancelled = useRef(false);
  const errorId = useId();

  useEffect(() => { setValue(email); setSaved(false); }, [email]);

  const begin = () => {
    cancelled.current = false;
    setSaved(false);
    setError("");
    setEditing(true);
  };
  const save = async () => {
    if (busy.current || cancelled.current) return;
    const next = value.trim().toLowerCase();
    if (!isOptionalEmail(next)) { setError(t("emailInvalid")); return; }
    if (next === email) { setEditing(false); return; }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await roomRequest("/api/tickets/email", { ticketId: ticket.id, email: next });
      setValue(result.email);
      onSaved?.(ticket.id, result.email);
      setEditing(false);
      setSaved(true);
    } catch {
      setError(t("emailSaveError"));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="w-56 max-w-full font-montserrat text-xs font-bold normal-case text-slate-700" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <div className={`flex min-h-9 items-center gap-2 ${saving ? "opacity-60" : ""}`} aria-busy={saving}>
        {editing ? (
          <input autoFocus type="email" value={value} maxLength={254} readOnly={saving}
            aria-label={t("editEmail", { name: ticket.userName })} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
            className="w-full min-w-0 rounded-lg border-0 bg-transparent px-2 py-2 font-montserrat text-xs font-bold normal-case text-slate-700 outline-none focus:ring-1 focus:ring-slate-300"
            onChange={event => { setValue(event.target.value); setError(""); }} onBlur={save}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); }
              if (event.key === "Escape") { cancelled.current = true; setValue(email); setError(""); setEditing(false); }
            }} />
        ) : (
          <button type="button" onFocus={begin} onClick={begin} title={value || t("emailEmpty")} aria-label={t("editEmail", { name: ticket.userName })}
            className="w-full min-w-0 truncate rounded-lg px-2 py-2 text-left font-montserrat text-xs font-bold normal-case hover:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300">
            {value || <span className="text-slate-400">{t("emailEmpty")}</span>}
          </button>
        )}
        {saving && <Loader2 size={14} className="shrink-0 animate-spin" aria-label={t("emailSaving")} />}
        {saved && <span role="status" aria-label={t("emailSaved")}><Check size={14} className="shrink-0 text-slate-500" /></span>}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-slate-600">{error}</p>}
    </div>
  );
}
