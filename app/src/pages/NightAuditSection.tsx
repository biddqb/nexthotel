import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Lock, AlertTriangle } from "lucide-react";
import { listAudits, previewAudit, runAudit } from "../lib/api";
import { formatVND } from "../lib/money";
import { formatDateVN, toISODate, addDays } from "../lib/date";
import { ApiError } from "../lib/http";

export function NightAuditSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const yesterday = toISODate(addDays(new Date(), -1));
  const [date, setDate] = useState(yesterday);
  const [notes, setNotes] = useState("");

  const { data: preview } = useQuery({
    queryKey: ["audit-preview", date],
    queryFn: () => previewAudit(date),
    enabled: !!date,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["audit-history"],
    queryFn: listAudits,
  });

  const run = useMutation({
    mutationFn: () => runAudit(date, notes),
    onSuccess: () => {
      toast.success(t("nightAudit.done"));
      setNotes("");
      qc.invalidateQueries({ queryKey: ["audit-preview"] });
      qc.invalidateQueries({ queryKey: ["audit-history"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  const warnings = preview
    ? [
        preview.unpaid_reservations > 0 &&
          `${preview.unpaid_reservations} đặt phòng chưa thanh toán đầy đủ`,
        preview.dirty_rooms > 0 && `${preview.dirty_rooms} phòng chưa dọn`,
        preview.open_shifts > 0 && `${preview.open_shifts} ca nhân viên chưa đóng`,
      ].filter(Boolean)
    : [];

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold">{t("nightAudit.title")}</h2>
      </div>

      <div className="flex items-end gap-3">
        <label className="block">
          <div className="label mb-1">{t("nightAudit.date")}</div>
          <input
            type="date"
            className="input w-44"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={toISODate(new Date())}
          />
        </label>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Kpi label={t("nightAudit.revenue")} value={formatVND(preview.revenue)} />
            <Kpi
              label={t("nightAudit.occupancy")}
              value={`${preview.occupancy_pct.toFixed(0)}%`}
            />
            <Kpi label={t("nightAudit.adr")} value={formatVND(preview.adr)} />
          </div>

          {preview.already_locked && (
            <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
              {t("nightAudit.alreadyLocked")}
            </div>
          )}

          {!preview.already_locked && warnings.length > 0 && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-900 mb-1">
                <AlertTriangle className="h-4 w-4" />
                {t("nightAudit.warnings")}
              </div>
              <ul className="list-disc ml-6 text-amber-900 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {!preview.already_locked && (
            <div className="space-y-2">
              <label className="block">
                <div className="label mb-1">{t("nightAudit.notes")}</div>
                <textarea
                  className="input !h-16 py-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <button
                className="btn-primary"
                onClick={() => run.mutate()}
                disabled={run.isPending}
              >
                <Lock className="h-4 w-4" />
                {t("nightAudit.run")}
              </button>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted mb-2 uppercase">
            {t("nightAudit.history")}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {history.slice(0, 10).map((a) => (
                <tr key={a.audit_date} className="border-b border-border">
                  <td className="py-1 font-medium">
                    {formatDateVN(a.audit_date)}
                  </td>
                  <td className="py-1 text-muted">
                    {a.locked_by_name ?? "—"}
                  </td>
                  <td className="py-1">{formatVND(a.revenue)}</td>
                  <td className="py-1 text-muted">
                    {a.occupancy_pct.toFixed(0)}% · ADR{" "}
                    {formatVND(a.adr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-3">
      <div className="text-xs text-muted uppercase">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
