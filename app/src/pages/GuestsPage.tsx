import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createGuest, listGuests, setBlacklist, updateGuest } from "../lib/api";
import { hasRoleAtLeast, useAuth } from "../lib/auth";
import { ApiError } from "../lib/http";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../components/Modal";
import type { Guest } from "../lib/types";
import { formatDateVN } from "../lib/date";

export function GuestsPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const { data: guests = [] } = useQuery({
    queryKey: ["guests", q],
    queryFn: () => listGuests(q),
  });

  const [editing, setEditing] = useState<Guest | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold">{t("nav.guests")}</h1>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-4 w-4 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-8 w-80"
            placeholder={t("guest.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("guest.add")}
        </button>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">{t("guest.name")}</th>
              <th className="px-4 py-2 font-medium">{t("guest.phone")}</th>
              <th className="px-4 py-2 font-medium">{t("guest.idNumber")}</th>
              <th className="px-4 py-2 font-medium">{t("guest.nationality")}</th>
              <th className="px-4 py-2 font-medium">Ngày thêm</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {t("guest.empty")}
                </td>
              </tr>
            )}
            {guests.map((g) => (
              <tr
                key={g.id}
                className="border-b border-border hover:bg-stone-50 cursor-pointer"
                onClick={() => setEditing(g)}
              >
                <td className="px-4 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    {g.is_blacklisted && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    {g.name}
                  </div>
                </td>
                <td className="px-4 py-2">{g.phone || "—"}</td>
                <td className="px-4 py-2">{g.id_number || "—"}</td>
                <td className="px-4 py-2">{g.nationality}</td>
                <td className="px-4 py-2 text-muted">
                  {g.created_at ? formatDateVN(g.created_at.slice(0, 10)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={t("guest.add")}
      >
        <GuestForm
          onSuccess={() => {
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t("guest.title")}
      >
        {editing && (
          <GuestForm
            existing={editing}
            onSuccess={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function GuestForm({
  existing,
  onSuccess,
  onCancel,
}: {
  existing?: Guest;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canBlacklist = hasRoleAtLeast(user, "manager");
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [idNumber, setIdNumber] = useState(existing?.id_number ?? "");
  const [nationality, setNationality] = useState(existing?.nationality ?? "VN");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [blReason, setBlReason] = useState(existing?.blacklist_reason ?? "");

  const toggleBl = useMutation({
    mutationFn: (args: { flag: boolean; reason: string }) => {
      if (!existing) throw new Error("no existing");
      return setBlacklist({
        id: existing.id,
        isBlacklisted: args.flag,
        reason: args.reason,
      });
    },
    onSuccess: () => {
      toast.success(t("blacklist.updated"));
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createGuest({ name, phone, idNumber, nationality, notes }),
    onSuccess: () => {
      toast.success(t("guest.created"));
      qc.invalidateQueries({ queryKey: ["guests"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });
  const updateMut = useMutation({
    mutationFn: () => {
      if (!existing) throw new Error("no existing");
      return updateGuest({
        id: existing.id,
        name,
        phone,
        idNumber,
        nationality,
        notes,
      });
    },
    onSuccess: () => {
      toast.success(t("guest.updated"));
      qc.invalidateQueries({ queryKey: ["guests"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? t("errors.UNKNOWN")),
  });

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="label mb-1">{t("guest.name")}</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="label mb-1">{t("guest.phone")}</div>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="label mb-1">{t("guest.nationality")}</div>
          <input
            className="input"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <div className="label mb-1">{t("guest.idNumber")}</div>
        <input
          className="input"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
        />
      </label>
      <label className="block">
        <div className="label mb-1">{t("guest.notes")}</div>
        <textarea
          className="input !h-20 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>

      {existing && canBlacklist && (
        <div
          className={`rounded border p-3 space-y-2 ${
            existing.is_blacklisted
              ? "bg-red-50 border-red-300"
              : "bg-stone-50 border-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${
                existing.is_blacklisted ? "text-red-600" : "text-muted"
              }`}
            />
            <div className="text-sm font-medium">{t("blacklist.title")}</div>
          </div>
          {existing.is_blacklisted ? (
            <>
              <div className="text-sm text-red-700">
                {t("blacklist.on")}
                {existing.blacklist_reason && `: ${existing.blacklist_reason}`}
              </div>
              <button
                className="btn-ghost !h-8 text-xs"
                onClick={() =>
                  toggleBl.mutate({ flag: false, reason: "" })
                }
              >
                {t("blacklist.unmark")}
              </button>
            </>
          ) : (
            <>
              <input
                className="input"
                placeholder={t("blacklist.reason")}
                value={blReason}
                onChange={(e) => setBlReason(e.target.value)}
              />
              <button
                className="btn-danger !h-8 text-xs"
                onClick={() =>
                  toggleBl.mutate({ flag: true, reason: blReason })
                }
                disabled={!blReason.trim()}
              >
                {t("blacklist.mark")}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button className="btn-ghost" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          className="btn-primary"
          onClick={() => (existing ? updateMut.mutate() : createMut.mutate())}
          disabled={!name.trim() || createMut.isPending || updateMut.isPending}
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
