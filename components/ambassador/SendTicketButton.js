"use client";
import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import { usePopup } from "@/components/PopupProvider";
import { auth } from "@/lib/firebase";

export default function SendTicketButton({ roster }) {
  const t = useTranslations("TicketModal");
  const { showPopup } = usePopup();
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const attachment = useRef(null);
  const email = (roster.email || "").trim();

  const send = async event => {
    event.stopPropagation();
    if (!email || busy.current) return;
    busy.current = true;
    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const [{ toPng }, { default: jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const image = await toPng(attachment.current, { pixelRatio: 2, skipFonts: true });
      const pdf = new jsPDF({ unit: "px", format: [360, 480] });
      pdf.addImage(image, "PNG", 0, 0, 360, 480);
      const response = await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, ticket: { id: roster.id }, pdfAttachment: pdf.output("datauristring") }),
      });
      if (!response.ok) throw new Error("Email delivery failed");
      showPopup({ type: "success", title: t("successSentTitle"), message: t("successSentMsg", { email }), confirmText: t("btnDone") });
    } catch {
      showPopup({ type: "error", title: t("errSendTitle"), message: t("errSendMsg"), confirmText: t("btnClose") });
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return <>
    <span className="inline-flex" onClick={event => event.stopPropagation()}>
      <Button size="sm" variant="ghost" icon={Send} disabled={!email} isLoading={sending} onClick={send}
        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors disabled:pointer-events-none">
        {t("btnSend")}
      </Button>
    </span>
    <div aria-hidden="true" className="fixed -left-[10000px] top-0 pointer-events-none">
      <div ref={attachment} className="flex h-[480px] w-[360px] flex-col items-center justify-center gap-6 bg-white p-8 text-center text-slate-900" style={{ fontFamily: "Arial, sans-serif" }}>
        <p className="text-xl font-bold">Summer Salsa Fest {roster.festivalYear}</p>
        <QRCodeSVG value={roster.ticketID} size={180} marginSize={4} />
        <p className="text-xl font-bold break-words max-w-full">{roster.userName}</p>
        <p>{roster.passType}</p>
        <p>{roster.ticketID}</p>
      </div>
    </div>
  </>;
}
