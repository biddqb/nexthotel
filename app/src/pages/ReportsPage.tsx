import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, HelpCircle, Info } from "lucide-react";
import { dailyRevenue, occupancyReport } from "../lib/api";
import { formatVND } from "../lib/money";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  toISODate,
} from "../lib/date";

type Preset = "this_week" | "this_month" | "last_month" | "custom";

function rangeFor(preset: Preset): [string, string] {
  const now = new Date();
  if (preset === "this_week") {
    const day = now.getDay() || 7;
    const monday = addDays(now, -(day - 1));
    return [toISODate(monday), toISODate(addDays(monday, 7))];
  }
  if (preset === "this_month") {
    return [
      toISODate(startOfMonth(now)),
      toISODate(addDays(endOfMonth(now), 1)),
    ];
  }
  if (preset === "last_month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [
      toISODate(startOfMonth(prev)),
      toISODate(addDays(endOfMonth(prev), 1)),
    ];
  }
  return [toISODate(startOfMonth(now)), toISODate(addDays(endOfMonth(now), 1))];
}

export function ReportsPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [from, to] = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return [customFrom, customTo];
    }
    return rangeFor(preset);
  }, [preset, customFrom, customTo]);

  const { data: occ } = useQuery({
    queryKey: ["occ", from, to],
    queryFn: () => occupancyReport(from, to),
  });
  const { data: rev = [] } = useQuery({
    queryKey: ["rev", from, to],
    queryFn: () => dailyRevenue(from, to),
  });

  const maxRev = rev.reduce((m, r) => Math.max(m, r.revenue), 0) || 1;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{t("report.title")}</h1>
        <div className="flex-1" />
        <select
          className="input w-40"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
        >
          <option value="this_week">{t("report.thisWeek")}</option>
          <option value="this_month">{t("report.thisMonth")}</option>
          <option value="last_month">{t("report.lastMonth")}</option>
          <option value="custom">{t("report.custom")}</option>
        </select>
        {preset === "custom" && (
          <>
            <input
              type="date"
              className="input w-40"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-muted">→</span>
            <input
              type="date"
              className="input w-40"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        )}
      </div>

      <div className="text-xs text-muted">
        {from} → {to}
      </div>

      {/* KPI strip */}
      <div className="card p-4 grid grid-cols-5 divide-x divide-border">
        <Kpi
          label={t("report.occupancy")}
          value={occ ? `${occ.occupancy_pct.toFixed(1)}%` : "—"}
          sub={
            occ
              ? `${occ.sold_room_nights}/${occ.total_room_nights} phòng-đêm`
              : ""
          }
          info="% phòng đã bán trên tổng số phòng-đêm có sẵn trong khoảng thời gian. Ví dụ: 31 phòng × 30 ngày = 930 phòng-đêm; bán được 600 = 64.5%."
        />
        <Kpi
          label={t("report.revenue")}
          value={occ ? formatVND(occ.revenue) : "—"}
          info="Tổng số tiền đã nhận trong khoảng thời gian, tính theo ngày thanh toán thực tế (không phải ngày nhận phòng)."
        />
        <Kpi
          label={t("report.adr")}
          value={occ ? formatVND(occ.adr) : "—"}
          sub="Giá / phòng đã bán"
          info="Average Daily Rate — giá trung bình của một đêm PHÒNG ĐÃ BÁN. Công thức: Doanh thu ÷ Số phòng-đêm đã bán. Cho biết khách trả trung bình bao nhiêu cho một đêm."
        />
        <Kpi
          label={t("report.revpar")}
          value={occ ? formatVND(occ.revpar) : "—"}
          sub="Giá / phòng có sẵn"
          info="Revenue Per Available Room — doanh thu trên mỗi phòng CÓ SẴN (kể cả phòng trống). Công thức: Doanh thu ÷ Tổng phòng-đêm. RevPAR = ADR × Công suất. Đây là chỉ số quan trọng nhất để đo hiệu quả kinh doanh."
        />
        <Kpi
          label={t("report.bookings")}
          value={occ ? String(occ.bookings) : "—"}
          info="Số đặt phòng có ít nhất một đêm rơi vào khoảng thời gian này (không tính đặt phòng đã huỷ hoặc không đến)."
        />
      </div>

      {/* Daily revenue bar chart */}
      <div className="card p-4">
        <div className="text-sm font-medium mb-3">Doanh thu theo ngày</div>
        {rev.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">
            {t("report.empty")}
          </div>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {rev.map((r) => (
              <div
                key={r.date}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${r.date}: ${formatVND(r.revenue)}`}
              >
                <div className="text-[10px] text-muted opacity-0 group-hover:opacity-100">
                  {formatVND(r.revenue)}
                </div>
                <div
                  className="w-full bg-accent rounded-t"
                  style={{ height: `${(r.revenue / maxRev) * 100}%` }}
                />
                <div className="text-[10px] text-muted">
                  {format(new Date(r.date), "d/M")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Glossary />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  info?: string;
}) {
  return (
    <div className="px-6 first:pl-0 last:pr-0">
      <div className="text-xs uppercase tracking-wide text-muted flex items-center gap-1">
        {label}
        {info && (
          <span
            className="cursor-help text-muted hover:text-accent"
            title={info}
          >
            <Info className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

function Glossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button
        className="w-full flex items-center gap-2 px-4 h-11 text-sm font-medium text-left hover:bg-stone-50 rounded"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted" />
        )}
        <HelpCircle className="h-4 w-4 text-accent" />
        Giải thích các chỉ số báo cáo
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 text-sm">
          <Term
            name="Công suất"
            formula="(Phòng đã bán ÷ Tổng phòng có sẵn) × 100%"
            desc="Tỉ lệ phòng được sử dụng. Tính theo phòng-đêm: 31 phòng × 30 ngày = 930 phòng-đêm có sẵn trong tháng. Nếu bán được 600, công suất = 64,5%."
            hint="Tốt: ≥70% với khách sạn 3 sao. Thấp có thể do giá cao hoặc ít kênh bán."
          />
          <Term
            name="Doanh thu"
            formula="Tổng số tiền khách đã thanh toán trong khoảng thời gian"
            desc="Tính theo NGÀY THANH TOÁN, không phải ngày nhận phòng. Bao gồm cọc và các lần thanh toán từng phần."
            hint="Khác với 'tổng giá trị đặt phòng trong kỳ' — vì khách có thể trả trước hoặc trả sau."
          />
          <Term
            name="ADR — Average Daily Rate"
            formula="Doanh thu ÷ Số phòng-đêm đã bán"
            desc="Giá trung bình của một đêm phòng đã bán. ADR chỉ tính những phòng thực sự có khách, bỏ qua phòng trống."
            hint="So sánh: nếu ADR = 500.000 đ, khách trung bình trả 500k/đêm. Thay đổi giá theo mùa sẽ kéo ADR lên xuống."
          />
          <Term
            name="RevPAR — Revenue Per Available Room"
            formula="Doanh thu ÷ Tổng phòng-đêm (có sẵn) = ADR × Công suất"
            desc="Doanh thu trung bình trên MỖI phòng trong khách sạn, kể cả phòng trống. Chỉ số quan trọng nhất đánh giá hiệu quả."
            hint="Vì sao RevPAR > ADR về độ quan trọng: hai khách sạn cùng ADR 500k nhưng một nơi công suất 80% (RevPAR 400k), nơi kia 40% (RevPAR 200k) — kinh doanh rất khác nhau."
            example="VD: Chiến lược giá cao ADR 700k × 50% công suất = RevPAR 350k. Chiến lược giá thấp ADR 400k × 85% công suất = RevPAR 340k. Gần bằng nhau, nên phải nhìn RevPAR để quyết định."
          />
          <Term
            name="Số đặt phòng"
            formula="Số đặt phòng chạm vào khoảng thời gian"
            desc="Đếm đặt phòng có ít nhất một đêm trong khoảng thời gian. Không tính đặt phòng đã huỷ hoặc khách không đến."
          />
        </div>
      )}
    </div>
  );
}

function Term({
  name,
  formula,
  desc,
  hint,
  example,
}: {
  name: string;
  formula: string;
  desc: string;
  hint?: string;
  example?: string;
}) {
  return (
    <div className="border-l-2 border-accent-100 pl-3">
      <div className="font-semibold text-text">{name}</div>
      <div className="text-xs text-muted font-mono mt-0.5">= {formula}</div>
      <div className="text-sm mt-1">{desc}</div>
      {hint && (
        <div className="text-xs text-muted mt-1">
          <span className="font-medium">Mẹo:</span> {hint}
        </div>
      )}
      {example && (
        <div className="text-xs text-muted mt-1">
          <span className="font-medium">Ví dụ:</span> {example}
        </div>
      )}
    </div>
  );
}
