import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listShifts } from "../lib/api";
import { formatDateVN, addDays, toISODate } from "../lib/date";

export function ShiftsSection() {
  const { t } = useTranslation();
  const [days, setDays] = useState(14);

  const { from, to } = useMemo(() => {
    const today = new Date();
    return {
      from: toISODate(addDays(today, -days)),
      to: toISODate(addDays(today, 1)),
    };
  }, [days]);

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", from, to],
    queryFn: () => listShifts(from, to),
  });

  return (
    <section className="card p-5">
      <div className="flex items-center mb-3">
        <h2 className="text-md font-semibold">{t("shift.list")}</h2>
        <div className="flex-1" />
        <select
          className="input w-36"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
        >
          <option value={7}>7 ngày qua</option>
          <option value={14}>14 ngày qua</option>
          <option value={30}>30 ngày qua</option>
          <option value={90}>90 ngày qua</option>
        </select>
      </div>

      {shifts.length === 0 ? (
        <div className="text-sm text-muted py-2">{t("common.noResults")}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left">
            <tr>
              <th className="py-2 font-medium">Nhân viên</th>
              <th className="py-2 font-medium">Vào ca</th>
              <th className="py-2 font-medium">Kết ca</th>
              <th className="py-2 font-medium">Giờ</th>
              <th className="py-2 font-medium">Ghi chú bàn giao</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const hours =
                s.clock_out
                  ? (new Date(s.clock_out.replace(" ", "T") + "Z").getTime() -
                      new Date(s.clock_in.replace(" ", "T") + "Z").getTime()) /
                    3_600_000
                  : null;
              return (
                <tr key={s.id} className="border-b border-border">
                  <td className="py-2 font-medium">{s.user_name}</td>
                  <td className="py-2">
                    {formatDateVN(s.clock_in.slice(0, 10))}{" "}
                    <span className="text-muted">{s.clock_in.slice(11, 16)}</span>
                  </td>
                  <td className="py-2">
                    {s.clock_out ? (
                      <>
                        {formatDateVN(s.clock_out.slice(0, 10))}{" "}
                        <span className="text-muted">
                          {s.clock_out.slice(11, 16)}
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-700 font-medium">
                        Đang mở
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-muted">
                    {hours !== null ? `${hours.toFixed(1)} giờ` : "—"}
                  </td>
                  <td className="py-2 text-muted truncate max-w-xs">
                    {s.handover_notes || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
