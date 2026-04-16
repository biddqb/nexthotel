import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import { getHotel } from "../lib/api";
import { formatVND } from "../lib/money";
import { formatDateVN } from "../lib/date";
import type { Payment, ReservationWithDetails } from "../lib/types";

export function InvoiceView({
  reservation: r,
  payments,
}: {
  reservation: ReservationWithDetails;
  payments: Payment[];
}) {
  const { t } = useTranslation();
  const { data: hotel } = useQuery({ queryKey: ["hotel"], queryFn: getHotel });

  const invoiceNumber = `${r.check_in.replace(/-/g, "")}-${String(r.id).padStart(4, "0")}`;
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const lastMethod = payments.at(-1)?.method;

  return (
    <div>
      <div id="print-area" className="bg-white p-6 text-text">
        <div className="text-center border-b-2 border-accent pb-4 mb-4">
          <div className="text-xl font-semibold text-accent tracking-wide">
            {hotel?.name || "—"}
          </div>
          {hotel?.address && (
            <div className="text-xs text-muted mt-1">{hotel.address}</div>
          )}
          {hotel?.tax_id && (
            <div className="text-xs text-muted">MST: {hotel.tax_id}</div>
          )}
          {hotel?.phone && (
            <div className="text-xs text-muted">ĐT: {hotel.phone}</div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-sm font-semibold uppercase tracking-wide">
            {t("invoice.title")}
          </div>
          <div className="text-xs text-muted">#{invoiceNumber}</div>
        </div>

        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t("invoice.guest")}</span>
            <span className="font-medium">{r.guest_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("invoice.stay")}</span>
            <span>
              {formatDateVN(r.check_in)} → {formatDateVN(r.check_out)} · {r.nights}{" "}
              {t("invoice.nights")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("invoice.room")}</span>
            <span>
              {r.room_number} · {r.room_type}
            </span>
          </div>
        </div>

        <table className="w-full text-sm mb-4 border-t border-border">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2">
                Phòng {r.room_number} × {r.nights} {t("invoice.nights")}
                <div className="text-xs text-muted">
                  {formatVND(r.rate)} / đêm
                </div>
              </td>
              <td className="py-2 text-right">{formatVND(r.total)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-accent">
              <td className="py-3 font-semibold uppercase">
                {t("invoice.total")}
              </td>
              <td className="py-3 text-right text-lg font-semibold text-accent">
                {formatVND(r.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="text-sm space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="text-muted">Đã thanh toán</span>
            <span>{formatVND(paidTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Còn lại</span>
            <span className="font-semibold">
              {formatVND(Math.max(0, r.total - paidTotal))}
            </span>
          </div>
          {lastMethod && (
            <div className="flex justify-between">
              <span className="text-muted">{t("invoice.paymentMethod")}</span>
              <span>{t(`payment.${lastMethod}`)}</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted border-t border-border pt-3 mt-6">
          {t("invoice.thanks")}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 no-print">
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("invoice.print")}
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          @page { size: A5 portrait; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
