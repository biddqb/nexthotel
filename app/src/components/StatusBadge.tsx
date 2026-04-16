import { useTranslation } from "react-i18next";
import type { PaymentStatus, ReservationStatus } from "../lib/types";
import { cn } from "../lib/cn";

const STATUS_CLASS: Record<ReservationStatus, string> = {
  confirmed: "bg-status-confirmed text-white",
  checked_in: "bg-status-checkedIn text-white",
  checked_out: "bg-status-checkedOut text-white",
  cancelled: "border border-status-cancelled text-status-cancelled line-through",
  no_show: "bg-status-noShow text-white",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 h-6 text-xs font-medium",
        STATUS_CLASS[status],
      )}
    >
      {t(`reservation.status.${status}`)}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation();
  const cls: Record<PaymentStatus, string> = {
    unpaid: "bg-stone-100 text-stone-700",
    deposit_paid: "bg-amber-100 text-amber-800",
    paid: "bg-emerald-100 text-emerald-800",
    refunded: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 h-6 text-xs font-medium",
        cls[status],
      )}
    >
      {t(`reservation.payment.${status}`)}
    </span>
  );
}
