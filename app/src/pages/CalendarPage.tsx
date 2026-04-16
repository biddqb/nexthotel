import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Columns3,
  Grid3x3,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  listArrivalsForDate,
  listDeparturesForDate,
  listReservationsInRange,
  listRooms,
  occupancyReport,
} from "../lib/api";
import {
  addDays,
  endOfMonth,
  monthDays,
  startOfMonth,
  today,
  toISODate,
} from "../lib/date";
import { ReservationDrawer } from "./ReservationDrawer";
import { ReservationForm } from "./ReservationForm";
import { Modal } from "../components/Modal";
import { cn } from "../lib/cn";
import { formatVND } from "../lib/money";
import type { ReservationWithDetails } from "../lib/types";

type CalendarView = "week" | "month";

/** Monday-based start of week. ISO week. */
function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0 = Sun, 1 = Mon, ...
  const delta = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + delta);
  return copy;
}

export function CalendarPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(() => new Date());

  const { days, fromISO, toISO, label } = useMemo(() => {
    if (view === "week") {
      const start = startOfWeekMonday(cursor);
      const arr = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const last = arr[arr.length - 1];
      const sameMonth = start.getMonth() === last.getMonth();
      const startLabel = format(start, "d/M");
      const endLabel = sameMonth
        ? format(last, "d/M")
        : format(last, "d/M");
      return {
        days: arr,
        fromISO: toISODate(start),
        toISO: toISODate(addDays(start, 7)),
        label: `${startLabel} – ${endLabel}/${start.getFullYear()}`,
      };
    }
    const arr = monthDays(cursor.getFullYear(), cursor.getMonth());
    return {
      days: arr,
      fromISO: toISODate(startOfMonth(cursor)),
      toISO: toISODate(addDays(endOfMonth(cursor), 1)),
      label: `${t(`months.${cursor.getMonth() + 1}`)}, ${cursor.getFullYear()}`,
    };
  }, [view, cursor, t]);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: listRooms,
  });
  const { data: reservations = [], refetch: refetchRes } = useQuery({
    queryKey: ["reservations-range", fromISO, toISO],
    queryFn: () => listReservationsInRange(fromISO, toISO),
  });

  const todayISO = today();
  const { data: arrivals = [] } = useQuery({
    queryKey: ["arrivals", todayISO],
    queryFn: () => listArrivalsForDate(todayISO),
  });
  const { data: departures = [] } = useQuery({
    queryKey: ["departures", todayISO],
    queryFn: () => listDeparturesForDate(todayISO),
  });
  const { data: occ } = useQuery({
    queryKey: ["occ-today", todayISO],
    queryFn: () =>
      occupancyReport(todayISO, toISODate(addDays(new Date(todayISO), 1))),
  });

  const [openResId, setOpenResId] = useState<number | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{
    roomId: number;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  const prev = () => {
    if (view === "week") setCursor((c) => addDays(c, -7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };
  const next = () => {
    if (view === "week") setCursor((c) => addDays(c, 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };
  const jumpToday = () => setCursor(new Date());

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="h-14 shrink-0 border-b border-border bg-surface flex items-center px-4 gap-2">
        <button className="btn-ghost" onClick={prev} aria-label="prev">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-md font-semibold min-w-[11rem] text-center">
          {label}
        </div>
        <button className="btn-ghost" onClick={next} aria-label="next">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="btn-ghost ml-1" onClick={jumpToday}>
          <CalendarIcon className="h-4 w-4" />
          {t("common.today")}
        </button>

        <div className="ml-3 inline-flex rounded border border-border overflow-hidden">
          <button
            onClick={() => setView("week")}
            className={cn(
              "inline-flex items-center gap-1 px-3 h-9 text-sm",
              view === "week"
                ? "bg-accent text-white"
                : "bg-surface text-text hover:bg-stone-50",
            )}
            aria-label="week view"
          >
            <Columns3 className="h-4 w-4" />
            Tuần
          </button>
          <button
            onClick={() => setView("month")}
            className={cn(
              "inline-flex items-center gap-1 px-3 h-9 text-sm border-l border-border",
              view === "month"
                ? "bg-accent text-white border-l-accent"
                : "bg-surface text-text hover:bg-stone-50",
            )}
            aria-label="month view"
          >
            <Grid3x3 className="h-4 w-4" />
            Tháng
          </button>
        </div>

        <div className="flex-1" />
        <button
          className="btn-primary"
          onClick={() =>
            setCreatePrefill({
              roomId: rooms[0]?.id ?? 0,
              checkIn: todayISO,
              checkOut: toISODate(addDays(new Date(todayISO), 1)),
            })
          }
          disabled={rooms.length === 0}
        >
          <Plus className="h-4 w-4" />
          {t("calendar.newBooking")}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0 overflow-auto">
          <CalendarGrid
            view={view}
            days={days}
            rooms={rooms}
            reservations={reservations}
            onOpenReservation={(id) => setOpenResId(id)}
            onEmptyCell={(roomId, dateISO) =>
              setCreatePrefill({
                roomId,
                checkIn: dateISO,
                checkOut: toISODate(addDays(new Date(dateISO), 1)),
              })
            }
          />
        </div>

        {/* Right sidebar */}
        <aside className="w-64 shrink-0 border-l border-border bg-surface p-4 overflow-auto">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              {t("calendar.occupancy")} ({t("common.today")})
            </div>
            <div className="text-2xl font-semibold">
              {occ ? `${occ.occupancy_pct.toFixed(0)}%` : "—"}
            </div>
            <div className="text-xs text-muted">
              {occ
                ? `${occ.sold_room_nights} / ${occ.total_room_nights} phòng-đêm`
                : ""}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              {t("calendar.arrivals")} ({arrivals.length})
            </div>
            {arrivals.length === 0 ? (
              <div className="text-sm text-muted">
                {t("calendar.noArrivals")}
              </div>
            ) : (
              <ul className="space-y-1">
                {arrivals.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setOpenResId(r.id)}
                      className="w-full text-left p-2 rounded hover:bg-stone-50 text-sm"
                    >
                      <div className="font-medium">{r.guest_name}</div>
                      <div className="text-xs text-muted">
                        {t("calendar.room")} {r.room_number} · {r.nights} đêm
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              {t("calendar.departures")} ({departures.length})
            </div>
            {departures.length === 0 ? (
              <div className="text-sm text-muted">
                {t("calendar.noDepartures")}
              </div>
            ) : (
              <ul className="space-y-1">
                {departures.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setOpenResId(r.id)}
                      className="w-full text-left p-2 rounded hover:bg-stone-50 text-sm"
                    >
                      <div className="font-medium">{r.guest_name}</div>
                      <div className="text-xs text-muted">
                        {t("calendar.room")} {r.room_number}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {rooms.length === 0 && (
        <div className="p-8 text-center text-muted">
          {t("calendar.firstBookingHint")}
        </div>
      )}

      <ReservationDrawer
        reservationId={openResId}
        onClose={() => {
          setOpenResId(null);
          refetchRes();
        }}
      />

      <Modal
        open={!!createPrefill}
        onClose={() => setCreatePrefill(null)}
        title={t("reservation.create")}
        size="lg"
      >
        {createPrefill && (
          <ReservationForm
            prefill={createPrefill}
            onSuccess={() => {
              setCreatePrefill(null);
              refetchRes();
            }}
            onCancel={() => setCreatePrefill(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------- Grid ----------

const VI_DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function CalendarGrid({
  view,
  days,
  rooms,
  reservations,
  onOpenReservation,
  onEmptyCell,
}: {
  view: CalendarView;
  days: Date[];
  rooms: { id: number; room_number: string; room_type: string }[];
  reservations: ReservationWithDetails[];
  onOpenReservation: (id: number) => void;
  onEmptyCell: (roomId: number, dateISO: string) => void;
}) {
  const dayCols = days.length;
  const cellW = view === "week" ? 180 : 44;
  const cellH = view === "week" ? 64 : 40;
  const roomColW = view === "week" ? 150 : 140;
  const todayISO = today();

  const byRoom = useMemo(() => {
    const m = new Map<number, ReservationWithDetails[]>();
    for (const r of reservations) {
      const arr = m.get(r.room_id) ?? [];
      arr.push(r);
      m.set(r.room_id, arr);
    }
    return m;
  }, [reservations]);

  const colorMap: Record<string, string> = {
    confirmed: "bg-status-confirmed",
    checked_in: "bg-status-checkedIn",
    checked_out: "bg-status-checkedOut",
    cancelled:
      "bg-transparent border border-status-cancelled text-status-cancelled line-through",
    no_show: "bg-status-noShow",
  };

  return (
    <div className="inline-block min-w-full">
      {/* Header row */}
      <div
        className="sticky top-0 z-10 bg-surface border-b border-border flex"
        style={{ minWidth: roomColW + dayCols * cellW }}
      >
        <div
          className="shrink-0 flex items-center px-3 border-r border-border text-xs font-medium text-muted"
          style={{ width: roomColW, height: cellH }}
        >
          Phòng / Ngày
        </div>
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const weekday = d.getDay();
          const weekend = weekday === 0 || weekday === 6;
          return (
            <div
              key={iso}
              className={cn(
                "shrink-0 flex flex-col items-center justify-center border-r border-border",
                view === "week" ? "text-sm" : "text-xs",
                isToday ? "bg-accent-50 text-accent font-semibold" : "",
                weekend && !isToday ? "bg-stone-50" : "",
              )}
              style={{ width: cellW, height: cellH }}
            >
              <div
                className={cn(
                  "text-muted uppercase",
                  view === "week" ? "text-xs" : "text-[10px]",
                )}
              >
                {VI_DOW[weekday]}
              </div>
              <div className={view === "week" ? "text-md font-semibold" : ""}>
                {d.getDate()}
              </div>
              {view === "week" && (
                <div className="text-[10px] text-muted">
                  {format(d, "MM/yyyy")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Body rows */}
      {rooms.map((room) => {
        const reses = byRoom.get(room.id) ?? [];
        return (
          <div
            key={room.id}
            className="flex border-b border-border relative"
            style={{ minWidth: roomColW + dayCols * cellW, height: cellH }}
          >
            <div
              className="shrink-0 flex items-center px-3 border-r border-border bg-surface sticky left-0 z-10"
              style={{ width: roomColW, height: cellH }}
            >
              <div>
                <div className="text-sm font-medium">{room.room_number}</div>
                <div className="text-xs text-muted">{room.room_type}</div>
              </div>
            </div>
            {days.map((d) => {
              const iso = toISODate(d);
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  key={iso}
                  onClick={() => onEmptyCell(room.id, iso)}
                  className={cn(
                    "shrink-0 border-r border-border hover:bg-accent-50/40 relative",
                    weekend && "bg-stone-50/60",
                  )}
                  style={{ width: cellW, height: cellH }}
                  tabIndex={-1}
                  aria-label={`${room.room_number} ${iso}`}
                />
              );
            })}

            {/* Reservation bars, absolutely positioned */}
            {reses.map((r) => {
              const ciDate = new Date(r.check_in);
              const coDate = new Date(r.check_out);
              const firstDay = days[0];
              const lastDay = days[days.length - 1];
              const start = Math.max(
                0,
                Math.round(
                  (ciDate.getTime() - firstDay.getTime()) / 86_400_000,
                ),
              );
              const end = Math.min(
                dayCols,
                Math.round(
                  (coDate.getTime() - firstDay.getTime()) / 86_400_000,
                ),
              );
              const width = Math.max(0, end - start) * cellW;
              if (width <= 0) return null;
              const startsBefore = ciDate < firstDay;
              const endsAfter = coDate > addDays(lastDay, 1);
              const isDark = r.status !== "cancelled";
              const visibleNights = end - start;

              return (
                <button
                  key={r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReservation(r.id);
                  }}
                  className={cn(
                    "absolute rounded flex",
                    view === "week"
                      ? "px-3 py-1.5 text-xs flex-col items-start text-left gap-0.5"
                      : "px-2 text-xs items-center gap-1 truncate",
                    colorMap[r.status],
                    isDark ? "text-white" : "",
                    startsBefore ? "rounded-l-none" : "",
                    endsAfter ? "rounded-r-none" : "",
                  )}
                  style={{
                    left: roomColW + start * cellW + 2,
                    top: 4,
                    width: width - 4,
                    height: cellH - 8,
                  }}
                  title={`${r.guest_name} — ${r.check_in} → ${r.check_out}`}
                >
                  {view === "week" ? (
                    <WeekBarContent res={r} visibleNights={visibleNights} />
                  ) : (
                    <>
                      <span className="truncate">{r.guest_name}</span>
                      {r.payment_status === "paid" && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-white/90" />
                      )}
                      {r.payment_status === "deposit_paid" && (
                        <span className="ml-auto h-2 w-2 rounded-full border-2 border-white" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="h-6" />
    </div>
  );
}

function WeekBarContent({
  res: r,
  visibleNights,
}: {
  res: ReservationWithDetails;
  visibleNights: number;
}) {
  const isDark = r.status !== "cancelled";
  const remaining = r.total - r.paid_amount;
  const payLabel =
    r.payment_status === "paid"
      ? "Đã thanh toán"
      : r.payment_status === "deposit_paid"
      ? `Còn ${formatVND(Math.max(0, remaining))}`
      : r.payment_status === "unpaid"
      ? "Chưa thanh toán"
      : "Đã hoàn tiền";

  return (
    <>
      <div className="flex w-full items-center gap-1 min-w-0">
        <span className="font-semibold truncate flex-1">{r.guest_name}</span>
        <span
          className={cn(
            "shrink-0 text-[10px] tabular-nums px-1 rounded",
            isDark ? "bg-white/15" : "bg-red-100",
          )}
        >
          {r.nights}đ
        </span>
      </div>
      <div
        className={cn(
          "text-[11px] truncate w-full",
          isDark ? "opacity-80" : "opacity-80",
        )}
      >
        {r.guest_phone ? r.guest_phone : "—"}
      </div>
      {visibleNights >= 2 && (
        <div className="flex w-full items-center gap-1 text-[11px] min-w-0">
          <span className="opacity-75 truncate">{formatVND(r.rate)}/đêm</span>
          <span className="ml-auto flex items-center gap-1 shrink-0">
            {r.payment_status === "paid" && (
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            )}
            {r.payment_status === "deposit_paid" && (
              <span className="h-1.5 w-1.5 rounded-full border-2 border-white" />
            )}
            <span className="opacity-90">{payLabel}</span>
          </span>
        </div>
      )}
    </>
  );
}
