import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Clock, LogIn, LogOut } from "lucide-react";
import { activeShift, clockIn, clockOut } from "../lib/api";
import { Modal } from "./Modal";
import { ApiError } from "../lib/http";

export function ShiftIndicator() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: shift } = useQuery({
    queryKey: ["active-shift"],
    queryFn: activeShift,
    refetchInterval: 60_000,
  });
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");

  const clockInMut = useMutation({
    mutationFn: () => clockIn(),
    onSuccess: () => {
      toast.success("Đã mở ca");
      qc.invalidateQueries({ queryKey: ["active-shift"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  const clockOutMut = useMutation({
    mutationFn: () => clockOut(notes),
    onSuccess: () => {
      toast.success("Đã kết thúc ca");
      qc.invalidateQueries({ queryKey: ["active-shift"] });
      setClosing(false);
      setNotes("");
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  if (shift) {
    return (
      <>
        <button
          onClick={() => setClosing(true)}
          className="flex items-center gap-2 px-2 h-8 rounded text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
          title={`${t("shift.clockedInAt")} ${shift.clock_in}`}
        >
          <Clock className="h-3 w-3" />
          {t("shift.active")}
        </button>
        <Modal
          open={closing}
          onClose={() => setClosing(false)}
          title={t("shift.clockOut")}
        >
          <div className="space-y-3">
            <div className="text-sm text-muted">
              {t("shift.clockedInAt")}: {shift.clock_in}
            </div>
            <label className="block">
              <div className="label mb-1">{t("shift.handoverNotes")}</div>
              <textarea
                className="input !h-24 py-2"
                placeholder={t("shift.handoverPrompt")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button className="btn-ghost" onClick={() => setClosing(false)}>
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={() => clockOutMut.mutate()}
                disabled={clockOutMut.isPending}
              >
                <LogOut className="h-4 w-4" />
                {t("shift.clockOut")}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <button
      onClick={() => clockInMut.mutate()}
      disabled={clockInMut.isPending}
      className="flex items-center gap-2 px-2 h-8 rounded text-xs bg-stone-100 text-muted hover:bg-stone-200"
    >
      <LogIn className="h-3 w-3" />
      {t("shift.clockIn")}
    </button>
  );
}
