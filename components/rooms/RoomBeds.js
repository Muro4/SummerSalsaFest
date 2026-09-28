"use client";
import { Bed, Clock, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { GENDERS, remainingTime, roomState } from "@/lib/rooms";

export default function RoomBeds({ room, now, ownerId, onAssign, onUnassign, disabled }) {
  const t = useTranslations("RoomSystem");
  const state = roomState(room, now);
  const beds = [
    ...state.occupants.map(occupant => ({ ...occupant, kind: "occupied" })),
    ...state.locks.map(lock => ({ ...lock, kind: "held" })),
    ...Array.from({ length: Math.max(0, room.capacity - state.used) }, () => ({ kind: "empty" })),
  ];
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label={t("beds")}>
      {beds.map((bed, index) => {
        const owned = bed.kind === "held" && bed.ownerId === ownerId;
        const action = bed.kind === "empty" && !room.isBlocked ? onAssign : owned && onUnassign ? () => onUnassign(bed.draftId) : null;
        const Icon = bed.kind === "held" ? Clock : bed.kind === "occupied" ? UserRound : Bed;
        const contents = <>
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold">{bed.name || t(bed.kind === "empty" ? "emptyBed" : "unnamed")}</span>
            <span className="block text-[11px]">
              {t(bed.kind)}{bed.kind !== "empty" && <> · {t(`gender.${GENDERS.includes(bed.gender) ? bed.gender : "unspecified"}`)}</>}
            </span>
            {bed.kind === "held" && <span className="block text-[11px] tabular-nums">{t(owned ? "yourHold" : "temporaryHold")} · {remainingTime(bed.expiresAt, now)}</span>}
          </span>
        </>;
        const style = `flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${bed.kind === "occupied" ? "border-slate-200 bg-slate-100 text-slate-700" : bed.kind === "held" ? "border-salsa-pink/30 bg-salsa-pink/10 text-slate-900" : "border-salsa-mint/60 bg-salsa-mint/10 text-slate-800"}`;
        return <li key={`${bed.kind}-${bed.ticketId || bed.draftId || index}`}>
          {action ? <button type="button" disabled={disabled} onClick={action} aria-label={t(owned ? "removeNamed" : "assignBed", { name: bed.name || t("unnamed"), bed: index + 1 })} className={`${style} hover:border-salsa-pink focus-visible:outline-2 focus-visible:outline-salsa-pink disabled:cursor-not-allowed disabled:opacity-50`}>{contents}</button> : <div className={style}>{contents}</div>}
        </li>;
      })}
    </ul>
  );
}
