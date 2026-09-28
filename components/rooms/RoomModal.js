"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function RoomModal({ title, onClose, busy = false, wide = false, children }) {
  const t = useTranslations("RoomSystem");
  const titleId = useId();
  const panel = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => [...panel.current.querySelectorAll("button, input, select, textarea, [tabindex='0']")].filter(node => !node.matches(":disabled"));
    (controls()[0] || panel.current).focus();
    const handleKey = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!latest.current.busy) latest.current.onClose();
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (!first) { event.preventDefault(); panel.current.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-3 font-montserrat" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`max-h-[90dvh] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl outline-none ${wide ? "max-w-4xl" : "max-w-xl"}`}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
          <h2 id={titleId} className="font-bebas text-2xl">{title}</h2>
          <button type="button" aria-label={t("cancel")} disabled={busy} onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-salsa-pink disabled:opacity-40"><X size={18} /></button>
        </header>
        <div className="p-3">{children}</div>
      </section>
    </div>, document.body
  );
}
