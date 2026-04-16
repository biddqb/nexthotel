import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import {
  createExpense,
  deleteExpense,
  expenseSummary,
  listExpenses,
} from "../lib/api";
import { Modal } from "../components/Modal";
import { formatVND, parseVND } from "../lib/money";
import { formatDateVN, toISODate, addDays, endOfMonth, startOfMonth } from "../lib/date";
import { ApiError } from "../lib/http";

type Preset = "this_month" | "last_month" | "custom";

function rangeFor(preset: Preset): [string, string] {
  const now = new Date();
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

export function ExpensesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [adding, setAdding] = useState(false);

  const [from, to] = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return [customFrom, customTo];
    }
    return rangeFor(preset);
  }, [preset, customFrom, customTo]);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", from, to],
    queryFn: () => listExpenses(from, to),
  });
  const { data: summary } = useQuery({
    queryKey: ["expense-summary", from, to],
    queryFn: () => expenseSummary(from, to),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense-summary"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{t("expenses.title")}</h1>
        <div className="flex-1" />
        <select
          className="input w-40"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
        >
          <option value="this_month">{t("report.thisMonth")}</option>
          <option value="last_month">{t("report.lastMonth")}</option>
          <option value="custom">{t("report.custom")}</option>
        </select>
        {preset === "custom" && (
          <>
            <input
              type="date"
              className="input w-36"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-muted">→</span>
            <input
              type="date"
              className="input w-36"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        )}
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          {t("expenses.add")}
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-baseline gap-3">
          <div>
            <div className="text-xs text-muted uppercase">
              {t("expenses.total")}
            </div>
            <div className="text-2xl font-semibold">
              {summary ? formatVND(summary.total) : "—"}
            </div>
          </div>
          {summary && summary.by_category.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-3 text-sm">
              {summary.by_category.slice(0, 5).map(([cat, amt]) => (
                <div key={cat} className="flex gap-1">
                  <span className="text-muted">{cat}:</span>
                  <span className="font-medium">{formatVND(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">{t("expenses.date")}</th>
              <th className="px-4 py-2 font-medium">{t("expenses.category")}</th>
              <th className="px-4 py-2 font-medium">{t("expenses.description")}</th>
              <th className="px-4 py-2 font-medium">{t("expenses.vendor")}</th>
              <th className="px-4 py-2 font-medium text-right">{t("expenses.amount")}</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {t("expenses.empty")}
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border">
                <td className="px-4 py-2">{formatDateVN(e.expense_date)}</td>
                <td className="px-4 py-2 font-medium">{e.category}</td>
                <td className="px-4 py-2">{e.description}</td>
                <td className="px-4 py-2 text-muted">{e.vendor || "—"}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {formatVND(e.amount)}
                </td>
                <td className="px-2 py-2">
                  <button
                    className="btn-ghost !h-8 !px-2 text-muted"
                    onClick={() => {
                      if (confirm("Xoá chi phí này?")) remove.mutate(e.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t("expenses.add")}
      >
        <AddExpenseForm
          onSuccess={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["expenses"] });
            qc.invalidateQueries({ queryKey: ["expense-summary"] });
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </div>
  );
}

function AddExpenseForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));

  const create = useMutation({
    mutationFn: () =>
      createExpense({
        category,
        description,
        amount,
        vendor,
        expenseDate: date,
      }),
    onSuccess: () => {
      toast.success("Đã thêm chi phí");
      onSuccess();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="label mb-1">{t("expenses.date")}</div>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="label mb-1">{t("expenses.category")}</div>
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("expenses.categoryPlaceholder")}
          />
        </label>
      </div>
      <label className="block">
        <div className="label mb-1">{t("expenses.description")}</div>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="label mb-1">{t("expenses.amount")}</div>
          <input
            className="input"
            value={formatVND(amount)}
            onChange={(e) => setAmount(parseVND(e.target.value))}
          />
        </label>
        <label className="block">
          <div className="label mb-1">{t("expenses.vendor")}</div>
          <input
            className="input"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button className="btn-ghost" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          className="btn-primary"
          onClick={() => create.mutate()}
          disabled={
            !category.trim() ||
            amount <= 0 ||
            !date ||
            create.isPending
          }
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
