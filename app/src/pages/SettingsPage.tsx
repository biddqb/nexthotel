import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Download, HardDrive } from "lucide-react";
import {
  createBackup,
  createRatePlan,
  createRoom,
  deleteRatePlan,
  getConfig,
  getHotel,
  listBackups,
  listRatePlans,
  listRooms,
  pruneBackups,
  updateRoom,
  upsertHotel,
} from "../lib/api";
import { formatVND, parseVND } from "../lib/money";
import type { RatePlan, Room } from "../lib/types";

import { hasRoleAtLeast, useAuth } from "../lib/auth";
import { AuditLogSection } from "./AuditLogSection";
import { NightAuditSection } from "./NightAuditSection";
import { RoomTypeSelect } from "../components/RoomTypeSelect";
import { ShiftsSection } from "./ShiftsSection";
import { UsersSection } from "./UsersSection";

export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
      <HotelSection />
      <RoomsSection />
      <RatePlansSection />
      <NightAuditSection />
      <ShiftsSection />
      <BackupSection />
      {hasRoleAtLeast(user, "director") && <UsersSection />}
      {hasRoleAtLeast(user, "director") && <AuditLogSection />}
    </div>
  );
}

function HotelSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: hotel } = useQuery({ queryKey: ["hotel"], queryFn: getHotel });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (hotel) {
      setName(hotel.name);
      setAddress(hotel.address);
      setTaxId(hotel.tax_id);
      setPhone(hotel.phone);
    }
  }, [hotel]);

  const save = useMutation({
    mutationFn: () => upsertHotel({ name, address, taxId, phone }),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      qc.invalidateQueries({ queryKey: ["hotel"] });
    },
    onError: (e: any) => toast.error(e?.message ?? ""),
  });

  return (
    <section className="card p-5 space-y-3">
      <h2 className="text-md font-semibold">{t("settings.hotel")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("settings.hotelName")}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("settings.phone")}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <Field label={t("settings.address")}>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label={t("settings.taxId")}>
        <input className="input" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {t("common.save")}
        </button>
      </div>
    </section>
  );
}

function RoomsSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: listRooms });

  const [adding, setAdding] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("standard");
  const [baseRate, setBaseRate] = useState(500_000);

  const create = useMutation({
    mutationFn: () => createRoom({ roomNumber, roomType, baseRate }),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setAdding(false);
      setRoomNumber("");
    },
    onError: (e: any) => toast.error(e?.message ?? ""),
  });

  return (
    <section className="card p-5">
      <div className="flex items-center mb-3">
        <h2 className="text-md font-semibold">{t("settings.rooms")}</h2>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          {t("settings.addRoom")}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left">
          <tr>
            <th className="py-2 font-medium">{t("settings.roomNumber")}</th>
            <th className="py-2 font-medium">{t("settings.roomType")}</th>
            <th className="py-2 font-medium">{t("settings.baseRate")}</th>
            <th className="py-2 font-medium">{t("settings.active")}</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </tbody>
      </table>

      {adding && (
        <div className="mt-3 p-3 border border-border rounded flex gap-2 items-end">
          <Field label={t("settings.roomNumber")}>
            <input
              className="input"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </Field>
          <Field label={t("settings.roomType")}>
            <RoomTypeSelect
              value={roomType}
              onChange={(v) => setRoomType(v ?? "")}
            />
          </Field>
          <Field label={t("settings.baseRate")}>
            <input
              className="input"
              value={formatVND(baseRate)}
              onChange={(e) => setBaseRate(parseVND(e.target.value))}
            />
          </Field>
          <button className="btn-primary h-9" onClick={() => create.mutate()}>
            {t("common.save")}
          </button>
          <button className="btn-ghost h-9" onClick={() => setAdding(false)}>
            {t("common.cancel")}
          </button>
        </div>
      )}
    </section>
  );
}

function RoomRow({ room }: { room: Room }) {
  const qc = useQueryClient();
  const [roomNumber, setRoomNumber] = useState(room.room_number);
  const [roomType, setRoomType] = useState(room.room_type);
  const [baseRate, setBaseRate] = useState(room.base_rate);
  const [active, setActive] = useState(room.active);
  const dirty =
    roomNumber !== room.room_number ||
    roomType !== room.room_type ||
    baseRate !== room.base_rate ||
    active !== room.active;

  const save = useMutation({
    mutationFn: () =>
      updateRoom({
        id: room.id,
        roomNumber,
        roomType,
        baseRate,
        active,
      }),
    onSuccess: () => {
      toast.success("Đã lưu");
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (e: any) => toast.error(e?.message ?? ""),
  });

  return (
    <tr className="border-b border-border">
      <td className="py-1">
        <input
          className="input !h-8"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
        />
      </td>
      <td className="py-1">
        <RoomTypeSelect
          value={roomType}
          onChange={(v) => setRoomType(v ?? "")}
          className="input !h-8"
        />
      </td>
      <td className="py-1">
        <input
          className="input !h-8"
          value={formatVND(baseRate)}
          onChange={(e) => setBaseRate(parseVND(e.target.value))}
        />
      </td>
      <td className="py-1">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-xs">{active ? "✓" : "—"}</span>
        </label>
      </td>
      <td className="py-1 text-right">
        {dirty && (
          <button
            className="btn-primary !h-8 !px-2 text-xs"
            onClick={() => save.mutate()}
          >
            Lưu
          </button>
        )}
      </td>
    </tr>
  );
}

function RatePlansSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["ratePlans"],
    queryFn: listRatePlans,
  });

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [roomType, setRoomType] = useState("");
  const [rate, setRate] = useState(0);

  const create = useMutation({
    mutationFn: () =>
      createRatePlan({
        name,
        startsOn,
        endsOn,
        appliesToRoomType: roomType || null,
        rate,
      }),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      qc.invalidateQueries({ queryKey: ["ratePlans"] });
      setAdding(false);
      setName("");
      setStartsOn("");
      setEndsOn("");
      setRoomType("");
      setRate(0);
    },
    onError: (e: any) => toast.error(e?.message ?? ""),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteRatePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ratePlans"] }),
  });

  return (
    <section className="card p-5">
      <div className="flex items-center mb-3">
        <h2 className="text-md font-semibold">{t("settings.ratePlans")}</h2>
        <div className="flex-1" />
        <button className="btn-ghost" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          {t("settings.addRatePlan")}
        </button>
      </div>
      {plans.length === 0 && !adding && (
        <div className="text-sm text-muted py-2">{t("common.noResults")}</div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {plans.map((p: RatePlan) => (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2 font-medium">{p.name}</td>
              <td className="py-2">
                {p.starts_on} → {p.ends_on}
              </td>
              <td className="py-2 text-muted">
                {p.applies_to_room_type || t("settings.allRoomTypes")}
              </td>
              <td className="py-2 font-medium">{formatVND(p.rate)}</td>
              <td className="py-2 text-right">
                <button
                  className="btn-ghost !h-8 !px-2 text-muted"
                  onClick={() => remove.mutate(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding && (
        <div className="mt-3 p-3 border border-border rounded space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.ratePlanName")}>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("settings.appliesTo")}>
              <RoomTypeSelect
                value={roomType || null}
                onChange={(v) => setRoomType(v ?? "")}
                allowAll
                allLabel={t("settings.allRoomTypes")}
                allValue={null}
              />
            </Field>
            <Field label={t("settings.startsOn")}>
              <input
                type="date"
                className="input"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </Field>
            <Field label={t("settings.endsOn")}>
              <input
                type="date"
                className="input"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </Field>
            <Field label={t("settings.rate")}>
              <input
                className="input"
                value={formatVND(rate)}
                onChange={(e) => setRate(parseVND(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn-primary"
              onClick={() => create.mutate()}
              disabled={!name || !startsOn || !endsOn || rate <= 0 || create.isPending}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BackupSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const { data: backups = [] } = useQuery({
    queryKey: ["backups"],
    queryFn: listBackups,
  });

  const backup = useMutation({
    mutationFn: () => createBackup(),
    onSuccess: (f) => {
      toast.success(`${t("settings.backupCreated")}`.replace("{{path}}", f.filename));
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e: any) => toast.error(e?.message ?? ""),
  });

  const prune = useMutation({
    mutationFn: () => pruneBackups(30),
    onSuccess: (n) => {
      toast.success(`Đã xoá ${n} bản cũ`);
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  return (
    <section className="card p-5 space-y-3">
      <h2 className="text-md font-semibold">{t("settings.backup")}</h2>
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted" />
          <span className="text-muted">{t("settings.dataFolder")}:</span>
          <code className="text-xs bg-stone-100 px-2 py-0.5 rounded">
            {config?.data_dir || "—"}
          </code>
          <span className="text-xs text-muted">
            (cấu hình trên máy chủ)
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary"
          onClick={() => backup.mutate()}
          disabled={backup.isPending}
        >
          <Download className="h-4 w-4" />
          {t("settings.createBackup")}
        </button>
        <button className="btn-ghost" onClick={() => prune.mutate()}>
          Dọn bản cũ (&gt;30 ngày)
        </button>
      </div>
      {backups.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">
            {backups.length} bản sao lưu
          </div>
          <ul className="max-h-40 overflow-auto text-sm space-y-0.5">
            {backups.slice(0, 15).map((b) => (
              <li
                key={b.path}
                className="flex justify-between py-1 border-b border-border"
              >
                <span>{b.filename}</span>
                <span className="text-muted">
                  {(b.size_bytes / 1024).toFixed(0)} KB · {b.created_at}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      {children}
    </label>
  );
}
