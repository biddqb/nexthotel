import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Printer, LogIn, LogOut, Ban, Edit3, Plus, Trash2 } from "lucide-react";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  createCharge,
  deleteCharge,
  getReservation,
  listChargesForReservation,
  listPaymentsForReservation,
  recordPayment,
} from "../lib/api";
import type { ChargeCategory } from "../lib/types";
import { Drawer, Modal } from "../components/Modal";
import { PaymentBadge, StatusBadge } from "../components/StatusBadge";
import { formatVND, parseVND } from "../lib/money";
import { formatDateVN } from "../lib/date";
import { ReservationForm } from "./ReservationForm";
import { InvoiceView } from "./InvoiceView";

export function ReservationDrawer({
  reservationId,
  onClose,
}: {
  reservationId: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const open = reservationId !== null;
  const { data: res, refetch } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => getReservation(reservationId!),
    enabled: open,
  });
  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["payments", reservationId],
    queryFn: () => listPaymentsForReservation(reservationId!),
    enabled: open,
  });
  const { data: charges = [], refetch: refetchCharges } = useQuery({
    queryKey: ["charges", reservationId],
    queryFn: () => listChargesForReservation(reservationId!),
    enabled: open,
  });

  const [editing, setEditing] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<"cash" | "bank" | "card" | "other">(
    "cash",
  );
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const invalidate = () => {
    refetch();
    refetchPayments();
    refetchCharges();
    qc.invalidateQueries({ queryKey: ["reservations-range"] });
    qc.invalidateQueries({ queryKey: ["arrivals"] });
    qc.invalidateQueries({ queryKey: ["departures"] });
  };

  const checkInMut = useMutation({
    mutationFn: () => checkInReservation(reservationId!),
    onSuccess: () => {
      toast.success(t("reservation.checkedIn"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });
  const checkOutMut = useMutation({
    mutationFn: () => checkOutReservation(reservationId!),
    onSuccess: () => {
      toast.success(t("reservation.checkedOut"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });
  const cancelMut = useMutation({
    mutationFn: () => cancelReservation(reservationId!),
    onSuccess: () => {
      toast.success(t("reservation.cancelled"));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });
  const payMut = useMutation({
    mutationFn: () =>
      recordPayment({
        reservationId: reservationId!,
        amount: payAmount,
        method: payMethod,
      }),
    onSuccess: () => {
      toast.success(t("payment.recorded"));
      setPayAmount(0);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });

  const chargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  const folioTotal = res ? res.total + chargesTotal : 0;
  const remaining = res ? folioTotal - res.paid_amount : 0;

  const [newCharge, setNewCharge] = useState<{
    category: ChargeCategory;
    description: string;
    amount: number;
  } | null>(null);
  const addChargeMut = useMutation({
    mutationFn: () => {
      if (!newCharge || !reservationId) throw new Error("no charge");
      return createCharge({
        reservationId,
        category: newCharge.category,
        description: newCharge.description,
        amount: newCharge.amount,
      });
    },
    onSuccess: () => {
      setNewCharge(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });
  const removeChargeMut = useMutation({
    mutationFn: (id: number) => deleteCharge(id),
    onSuccess: () => invalidate(),
  });

  return (
    <>
      <Drawer
        open={open && !editing && !invoiceOpen}
        onClose={onClose}
        title={t("reservation.title")}
        width={520}
      >
        {res && (
          <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={res.status} />
            <PaymentBadge status={res.payment_status} />
            <button
              className="ml-auto btn-ghost"
              onClick={() => setEditing(true)}
              disabled={res.status === "cancelled" || res.status === "checked_out"}
            >
              <Edit3 className="h-4 w-4" />
              {t("common.edit")}
            </button>
          </div>

          <Section title={`${t("reservation.room")} · ${res.room_number}`}>
            <Row label={t("reservation.checkIn")} value={formatDateVN(res.check_in)} />
            <Row label={t("reservation.checkOut")} value={formatDateVN(res.check_out)} />
            <Row label={t("reservation.nights")} value={String(res.nights)} />
          </Section>

          <Section title={t("reservation.guest")}>
            <Row label={t("guest.name")} value={res.guest_name} />
            <Row label={t("guest.phone")} value={res.guest_phone || "—"} />
          </Section>

          <Section title={t("charges.title")}>
            {charges.length === 0 ? (
              <div className="text-xs text-muted">{t("charges.empty")}</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {charges.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="text-muted mr-2">
                          [{t(`charges.categories.${c.category}`)}]
                        </span>
                        {c.description}
                      </div>
                      <div className="text-xs text-muted">
                        {c.created_by_name ?? "—"} · {c.created_at.slice(0, 16)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{formatVND(c.amount)}</span>
                      <button
                        className="text-muted hover:text-red-600"
                        onClick={() => removeChargeMut.mutate(c.id)}
                        aria-label="delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {res.status !== "cancelled" &&
              res.status !== "checked_out" &&
              (newCharge ? (
                <div className="mt-2 p-2 rounded border border-border bg-stone-50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input !h-8"
                      value={newCharge.category}
                      onChange={(e) =>
                        setNewCharge({
                          ...newCharge,
                          category: e.target.value as ChargeCategory,
                        })
                      }
                    >
                      <option value="minibar">
                        {t("charges.categories.minibar")}
                      </option>
                      <option value="laundry">
                        {t("charges.categories.laundry")}
                      </option>
                      <option value="food">
                        {t("charges.categories.food")}
                      </option>
                      <option value="service">
                        {t("charges.categories.service")}
                      </option>
                      <option value="other">
                        {t("charges.categories.other")}
                      </option>
                    </select>
                    <input
                      className="input !h-8"
                      placeholder={t("charges.amount")}
                      value={
                        newCharge.amount > 0 ? formatVND(newCharge.amount) : ""
                      }
                      onChange={(e) =>
                        setNewCharge({
                          ...newCharge,
                          amount: parseVND(e.target.value),
                        })
                      }
                    />
                  </div>
                  <input
                    className="input !h-8"
                    placeholder={t("charges.description")}
                    value={newCharge.description}
                    onChange={(e) =>
                      setNewCharge({
                        ...newCharge,
                        description: e.target.value,
                      })
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-ghost !h-7 text-xs"
                      onClick={() => setNewCharge(null)}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      className="btn-primary !h-7 text-xs"
                      onClick={() => addChargeMut.mutate()}
                      disabled={
                        !newCharge.description.trim() ||
                        newCharge.amount <= 0 ||
                        addChargeMut.isPending
                      }
                    >
                      {t("common.save")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn-ghost !h-8 text-xs mt-2"
                  onClick={() =>
                    setNewCharge({ category: "minibar", description: "", amount: 0 })
                  }
                >
                  <Plus className="h-3 w-3" />
                  {t("charges.addCharge")}
                </button>
              ))}
          </Section>

          <Section title={`${t("reservation.rate")} & ${t("payment.title")}`}>
            <Row label={t("reservation.rate")} value={formatVND(res.rate)} />
            <Row label="Tiền phòng" value={formatVND(res.total)} />
            {chargesTotal > 0 && (
              <Row label="Dịch vụ phát sinh" value={formatVND(chargesTotal)} />
            )}
            <Row
              label={t("reservation.total")}
              value={formatVND(folioTotal)}
              bold
            />
            <Row label={t("reservation.deposit")} value={formatVND(res.deposit)} />
            <Row
              label="Đã trả"
              value={formatVND(res.paid_amount)}
            />
            <Row
              label="Còn lại"
              value={formatVND(Math.max(0, remaining))}
              bold
            />
            {res.status !== "cancelled" && remaining > 0 && (
              <div className="mt-3 p-3 rounded border border-border space-y-2 bg-stone-50">
                <div className="text-xs font-medium text-muted">
                  {t("reservation.actions.recordPayment")}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Số tiền"
                    value={payAmount > 0 ? formatVND(payAmount) : ""}
                    onChange={(e) => setPayAmount(parseVND(e.target.value))}
                  />
                  <select
                    className="input w-36"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                  >
                    <option value="cash">{t("payment.cash")}</option>
                    <option value="bank">{t("payment.bank")}</option>
                    <option value="card">{t("payment.card")}</option>
                    <option value="other">{t("payment.other")}</option>
                  </select>
                  <button
                    className="btn-primary"
                    onClick={() => payMut.mutate()}
                    disabled={payAmount <= 0 || payMut.isPending}
                  >
                    {t("common.save")}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    className="text-xs text-accent hover:underline"
                    onClick={() => setPayAmount(remaining)}
                  >
                    Còn lại ({formatVND(remaining)})
                  </button>
                </div>
              </div>
            )}

            {payments.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-muted mb-1">
                  {t("payment.title")}
                </div>
                <ul className="space-y-1 text-sm">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between py-1 border-b border-border last:border-0"
                    >
                      <span className="text-muted">
                        {t(`payment.${p.method}`)} · {p.paid_at.slice(0, 10)}
                      </span>
                      <span className="font-medium">{formatVND(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {res.notes && (
            <Section title={t("reservation.notes")}>
              <p className="text-sm">{res.notes}</p>
            </Section>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {res.status === "confirmed" && (
              <button
                className="btn-primary"
                onClick={() => checkInMut.mutate()}
                disabled={checkInMut.isPending}
              >
                <LogIn className="h-4 w-4" />
                {t("reservation.actions.checkIn")}
              </button>
            )}
            {res.status === "checked_in" && (
              <button
                className="btn-primary"
                onClick={() => checkOutMut.mutate()}
                disabled={checkOutMut.isPending}
              >
                <LogOut className="h-4 w-4" />
                {t("reservation.actions.checkOut")}
              </button>
            )}
            <button className="btn-ghost" onClick={() => setInvoiceOpen(true)}>
              <Printer className="h-4 w-4" />
              {t("reservation.actions.printInvoice")}
            </button>
            {res.status === "confirmed" && (
              <button
                className="btn-danger ml-auto"
                onClick={() => {
                  if (confirm("Huỷ đặt phòng này?")) cancelMut.mutate();
                }}
                disabled={cancelMut.isPending}
              >
                <Ban className="h-4 w-4" />
                {t("reservation.actions.cancel")}
              </button>
            )}
          </div>

        </div>
      )}
      </Drawer>

      {res && (
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          title={t("reservation.edit")}
          size="lg"
        >
          <ReservationForm
            existing={res}
            onSuccess={() => {
              setEditing(false);
              invalidate();
            }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}

      {res && (
        <Modal
          open={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          size="md"
        >
          <InvoiceView reservation={res} payments={payments} />
        </Modal>
      )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-muted">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
