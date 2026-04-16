import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Edit3 } from "lucide-react";
import { createUser, listUsers, updateUser } from "../lib/api";
import { Modal } from "../components/Modal";
import { ApiError } from "../lib/http";
import type { Role, User } from "../lib/types";

export function UsersSection() {
  const { t } = useTranslation();
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <section className="card p-5">
      <div className="flex items-center mb-3">
        <h2 className="text-md font-semibold">{t("users.title")}</h2>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          {t("users.add")}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left">
          <tr>
            <th className="py-2 font-medium">{t("users.name")}</th>
            <th className="py-2 font-medium">{t("users.role")}</th>
            <th className="py-2 font-medium">{t("users.active")}</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border">
              <td className="py-2 font-medium">{u.name}</td>
              <td className="py-2">{t(`auth.role.${u.role}`)}</td>
              <td className="py-2">
                {u.active ? (
                  <span className="text-xs bg-emerald-100 text-emerald-800 rounded px-2 py-0.5">
                    {t("users.active")}
                  </span>
                ) : (
                  <span className="text-xs bg-stone-200 text-stone-600 rounded px-2 py-0.5">
                    {t("users.inactive")}
                  </span>
                )}
              </td>
              <td className="py-2 text-right">
                <button
                  className="btn-ghost !h-8 !px-2"
                  onClick={() => setEditing(u)}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t("users.add")}
      >
        <UserForm onDone={() => setAdding(false)} />
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t("users.edit")}
      >
        {editing && (
          <UserForm existing={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </section>
  );
}

function UserForm({
  existing,
  onDone,
}: {
  existing?: User;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState<Role>(existing?.role ?? "staff");
  const [active, setActive] = useState(existing?.active ?? true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const create = useMutation({
    mutationFn: () => createUser({ name: name.trim(), pin, role }),
    onSuccess: () => {
      toast.success(t("users.created"));
      qc.invalidateQueries({ queryKey: ["users"] });
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });
  const update = useMutation({
    mutationFn: () => {
      if (!existing) throw new Error("no existing");
      return updateUser({
        id: existing.id,
        name: name.trim(),
        role,
        active,
        newPin: pin || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("users.updated"));
      qc.invalidateQueries({ queryKey: ["users"] });
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  const pinLabel = existing ? t("users.newPin") : t("users.pin");
  const pinsMatch = pin === confirmPin;
  const pinRequired = !existing;
  const pinOk = pinRequired ? pin.length >= 4 && pinsMatch : !pin || (pin.length >= 4 && pinsMatch);

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="label mb-1">{t("users.name")}</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="label mb-1">{t("users.role")}</div>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="staff">{t("auth.role.staff")}</option>
            <option value="manager">{t("auth.role.manager")}</option>
            <option value="director">{t("auth.role.director")}</option>
          </select>
        </label>
        {existing && (
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="text-sm">{t("users.active")}</span>
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="label mb-1">{pinLabel}</div>
          <input
            type="password"
            inputMode="numeric"
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={12}
          />
        </label>
        <label className="block">
          <div className="label mb-1">{t("auth.confirmPin")}</div>
          <input
            type="password"
            inputMode="numeric"
            className="input"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            maxLength={12}
          />
        </label>
      </div>
      {pin && !pinsMatch && (
        <div className="text-xs text-red-600">{t("auth.pinMismatch")}</div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button className="btn-ghost" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button
          className="btn-primary"
          onClick={() => (existing ? update.mutate() : create.mutate())}
          disabled={
            !name.trim() ||
            !pinOk ||
            create.isPending ||
            update.isPending
          }
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
