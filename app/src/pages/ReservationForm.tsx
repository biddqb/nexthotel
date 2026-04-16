import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  createGuest,
  createReservation,
  listGuests,
  listRooms,
  quoteRate,
  updateReservation,
} from "../lib/api";
import { formatVND, parseVND } from "../lib/money";
import { nightsBetween } from "../lib/date";
import type { Guest, ReservationWithDetails } from "../lib/types";
import { AlertTriangle } from "lucide-react";

export function ReservationForm({
  prefill,
  existing,
  onSuccess,
  onCancel,
}: {
  prefill?: {
    roomId: number;
    checkIn: string;
    checkOut: string;
  };
  existing?: ReservationWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const [roomId, setRoomId] = useState<number>(
    existing?.room_id ?? prefill?.roomId ?? 0,
  );
  const [checkIn, setCheckIn] = useState(
    existing?.check_in ?? prefill?.checkIn ?? "",
  );
  const [checkOut, setCheckOut] = useState(
    existing?.check_out ?? prefill?.checkOut ?? "",
  );
  const [guestId, setGuestId] = useState<number | null>(
    existing?.guest_id ?? null,
  );
  const [rate, setRate] = useState<number>(existing?.rate ?? 0);
  const [deposit, setDeposit] = useState<number>(existing?.deposit ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [guestQuery, setGuestQuery] = useState(existing?.guest_name ?? "");
  const [showGuestList, setShowGuestList] = useState(false);
  const [quickCreate, setQuickCreate] = useState<null | {
    name: string;
    phone: string;
  }>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: listRooms,
  });
  const { data: guests = [] } = useQuery({
    queryKey: ["guests", guestQuery],
    queryFn: () => listGuests(guestQuery),
  });

  const nights = useMemo(() => {
    try {
      return checkIn && checkOut ? Math.max(0, nightsBetween(checkIn, checkOut)) : 0;
    } catch {
      return 0;
    }
  }, [checkIn, checkOut]);

  // Auto-quote rate on change (only when not edited manually for existing).
  const [rateDirty, setRateDirty] = useState(false);
  useEffect(() => {
    if (rateDirty || !roomId || nights <= 0) return;
    let cancelled = false;
    quoteRate({ roomId, checkIn, checkOut })
      .then((r) => {
        if (!cancelled) setRate(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [roomId, checkIn, checkOut, nights, rateDirty]);

  const total = rate * nights;

  const createMut = useMutation({
    mutationFn: () => {
      if (!guestId) throw { code: "GUEST_REQUIRED", message: t("reservation.errors.guestRequired") };
      if (!roomId) throw { code: "ROOM_REQUIRED", message: t("reservation.errors.roomRequired") };
      return createReservation({
        room_id: roomId,
        guest_id: guestId,
        check_in: checkIn,
        check_out: checkOut,
        rate: rateDirty ? rate : null,
        deposit,
        notes,
      });
    },
    onSuccess: () => {
      toast.success(t("reservation.created"));
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!existing) throw new Error("no existing");
      if (!guestId) throw { message: t("reservation.errors.guestRequired") };
      return updateReservation({
        id: existing.id,
        room_id: roomId,
        guest_id: guestId,
        check_in: checkIn,
        check_out: checkOut,
        rate,
        deposit,
        notes,
      });
    },
    onSuccess: () => {
      toast.success(t("reservation.updated"));
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });

  const quickGuestMut = useMutation({
    mutationFn: async () => {
      if (!quickCreate) throw new Error("no quick");
      return createGuest({
        name: quickCreate.name,
        phone: quickCreate.phone,
        idNumber: "",
      });
    },
    onSuccess: (g) => {
      setGuestId(g.id);
      setGuestQuery(g.name);
      setQuickCreate(null);
      setShowGuestList(false);
      toast.success(t("guest.created"));
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });

  return (
    <div className="space-y-4">
      {/* Section 1: Room & dates */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          1. {t("reservation.room")} & {t("reservation.checkIn")}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <div className="label mb-1">{t("reservation.room")}</div>
            <select
              className="input"
              value={roomId}
              onChange={(e) => setRoomId(parseInt(e.target.value))}
            >
              <option value={0}>—</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number} · {r.room_type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="label mb-1">{t("reservation.checkIn")}</div>
            <input
              type="date"
              className="input"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label className="block">
            <div className="label mb-1">{t("reservation.checkOut")}</div>
            <input
              type="date"
              className="input"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
        </div>
        <div className="text-sm text-muted">
          {nights} {t("reservation.nights")}
        </div>
      </section>

      {/* Section 2: Guest */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          2. {t("reservation.guest")}
        </h3>
        <div className="relative">
          <input
            className="input"
            placeholder={t("guest.searchPlaceholder")}
            value={guestQuery}
            onFocus={() => setShowGuestList(true)}
            onChange={(e) => {
              setGuestQuery(e.target.value);
              setGuestId(null);
              setShowGuestList(true);
            }}
          />
          {showGuestList && guestQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-lg z-20 max-h-60 overflow-auto">
              {guests.length === 0 ? (
                <button
                  className="w-full text-left p-3 hover:bg-stone-50 text-sm"
                  onClick={() =>
                    setQuickCreate({ name: guestQuery, phone: "" })
                  }
                >
                  <span className="text-accent font-medium">+ {t("guest.quickCreate")}:</span>{" "}
                  {guestQuery}
                </button>
              ) : (
                guests.map((g) => (
                  <button
                    key={g.id}
                    className="w-full text-left p-2 hover:bg-stone-50 text-sm border-b border-border last:border-0"
                    onClick={() => {
                      setGuestId(g.id);
                      setGuestQuery(g.name);
                      setSelectedGuest(g);
                      setShowGuestList(false);
                    }}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {g.is_blacklisted && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      )}
                      {g.name}
                    </div>
                    <div className="text-xs text-muted">{g.phone}</div>
                  </button>
                ))
              )}
              {guests.length > 0 && (
                <button
                  className="w-full text-left p-2 text-sm text-accent border-t border-border"
                  onClick={() =>
                    setQuickCreate({ name: guestQuery, phone: "" })
                  }
                >
                  + {t("guest.quickCreate")}: {guestQuery}
                </button>
              )}
            </div>
          )}
        </div>
        {selectedGuest?.is_blacklisted && (
          <div className="rounded border border-red-300 bg-red-50 text-red-800 text-sm p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">{t("blacklist.warning")}</div>
              {selectedGuest.blacklist_reason && (
                <div className="text-xs mt-1">
                  {t("blacklist.reason")}: {selectedGuest.blacklist_reason}
                </div>
              )}
            </div>
          </div>
        )}
        {quickCreate && (
          <div className="card p-3 space-y-2">
            <div className="text-xs text-muted">{t("guest.quickCreate")}</div>
            <input
              className="input"
              placeholder={t("guest.name")}
              value={quickCreate.name}
              onChange={(e) =>
                setQuickCreate({ ...quickCreate, name: e.target.value })
              }
              autoFocus
            />
            <input
              className="input"
              placeholder={t("guest.phone")}
              value={quickCreate.phone}
              onChange={(e) =>
                setQuickCreate({ ...quickCreate, phone: e.target.value })
              }
            />
            <div className="flex gap-2 justify-end">
              <button
                className="btn-ghost"
                onClick={() => setQuickCreate(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={() => quickGuestMut.mutate()}
                disabled={!quickCreate.name.trim() || quickGuestMut.isPending}
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Rate & deposit */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          3. {t("reservation.rate")} & {t("reservation.deposit")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="label mb-1">
              {t("reservation.rate")}{" "}
              {!rateDirty && <span className="text-muted">(tự động)</span>}
            </div>
            <input
              className="input"
              value={formatVND(rate)}
              onChange={(e) => {
                setRate(parseVND(e.target.value));
                setRateDirty(true);
              }}
            />
          </label>
          <label className="block">
            <div className="label mb-1">{t("reservation.deposit")}</div>
            <input
              className="input"
              value={formatVND(deposit)}
              onChange={(e) => setDeposit(parseVND(e.target.value))}
            />
          </label>
        </div>
        <div className="flex items-center justify-between p-3 rounded bg-stone-50">
          <span className="text-sm text-muted">{t("reservation.total")}</span>
          <span className="text-lg font-semibold text-accent">
            {formatVND(total)}
          </span>
        </div>
      </section>

      {/* Section 4: Notes */}
      <section>
        <label className="block">
          <div className="label mb-1">{t("reservation.notes")}</div>
          <textarea
            className="input !h-20 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>
      </section>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button className="btn-ghost" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          className="btn-primary"
          onClick={() => (existing ? updateMut.mutate() : createMut.mutate())}
          disabled={
            !roomId ||
            !guestId ||
            nights <= 0 ||
            rate <= 0 ||
            createMut.isPending ||
            updateMut.isPending
          }
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
