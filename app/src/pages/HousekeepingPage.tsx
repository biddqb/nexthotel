import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Bed, CheckCheck, CircleDashed, History, Wrench, XCircle } from "lucide-react";
import { listHousekeepingEvents, listRoomStates, setRoomState } from "../lib/api";
import { ApiError } from "../lib/http";
import { cn } from "../lib/cn";
import { Modal } from "../components/Modal";
import type { RoomState, RoomStatusState } from "../lib/types";

const STATE_STYLE: Record<
  RoomStatusState,
  { label: string; bg: string; border: string; text: string }
> = {
  clean: {
    label: "Sạch",
    bg: "bg-emerald-600",
    border: "border-emerald-700",
    text: "text-white",
  },
  dirty: {
    label: "Bẩn",
    bg: "bg-amber-500",
    border: "border-amber-600",
    text: "text-white",
  },
  inspected: {
    label: "Đã kiểm tra",
    bg: "bg-sky-600",
    border: "border-sky-700",
    text: "text-white",
  },
  out_of_service: {
    label: "Ngưng",
    bg: "bg-stone-600",
    border: "border-stone-700",
    text: "text-white",
  },
  maintenance: {
    label: "Bảo trì",
    bg: "bg-red-600",
    border: "border-red-700",
    text: "text-white",
  },
};

export function HousekeepingPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["room-states"],
    queryFn: listRoomStates,
    refetchInterval: 30_000,
  });

  const [filter, setFilter] = useState<RoomStatusState | "all">("all");
  const [open, setOpen] = useState<RoomState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter((r) => r.state === filter);
  }, [rooms, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: rooms.length,
      clean: 0,
      dirty: 0,
      inspected: 0,
      out_of_service: 0,
      maintenance: 0,
    };
    for (const r of rooms) c[r.state] = (c[r.state] ?? 0) + 1;
    return c;
  }, [rooms]);

  const setState = useMutation({
    mutationFn: (args: {
      roomId: number;
      state: RoomStatusState;
      notes?: string;
    }) => setRoomState(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-states"] });
      setOpen(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("errors.UNKNOWN")),
  });

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 border-b border-border bg-surface flex items-center px-4 gap-2 overflow-x-auto">
        <h1 className="text-md font-semibold mr-2">{t("housekeeping.title")}</h1>
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Tất cả"
          count={counts.all}
        />
        {(["dirty", "clean", "inspected", "maintenance", "out_of_service"] as RoomStatusState[]).map(
          (s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={STATE_STYLE[s].label}
              count={counts[s] ?? 0}
              dotBg={STATE_STYLE[s].bg}
            />
          ),
        )}
        <div className="flex-1" />
        <button
          className="btn-ghost shrink-0"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="h-4 w-4" />
          Lịch sử
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="text-muted text-center py-10">{t("app.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted text-center py-10">
            Không có phòng nào trong mục này.
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
            {filtered.map((r) => {
              const s = STATE_STYLE[r.state];
              return (
                <button
                  key={r.room_id}
                  onClick={() => setOpen(r)}
                  className={cn(
                    "aspect-square rounded border-2 p-3 flex flex-col text-left",
                    s.bg,
                    s.border,
                    s.text,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl font-semibold">
                      {r.room_number}
                    </span>
                    <span className="text-xs">{s.label}</span>
                  </div>
                  <div className="text-xs opacity-70 mt-1">{r.room_type}</div>
                  {r.occupant_guest_name && (
                    <div className="mt-auto text-xs">
                      <Bed className="h-3 w-3 inline mr-1" />
                      {r.occupant_guest_name}
                    </div>
                  )}
                  {r.check_out && (
                    <div className="text-[11px] opacity-70">
                      Trả: {r.check_out}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <RoomActionSheet
          room={open}
          onClose={() => setOpen(null)}
          onSet={(state, notes) =>
            setState.mutate({ roomId: open.room_id, state, notes })
          }
          pending={setState.isPending}
        />
      )}

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Lịch sử hoạt động buồng phòng"
        size="lg"
      >
        <HousekeepingHistory />
      </Modal>
    </div>
  );
}

function HousekeepingHistory() {
  const { data: events = [] } = useQuery({
    queryKey: ["hk-events"],
    queryFn: listHousekeepingEvents,
  });
  if (events.length === 0) {
    return <div className="text-sm text-muted py-4">Chưa có hoạt động nào.</div>;
  }
  return (
    <div className="max-h-[60vh] overflow-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left sticky top-0 bg-surface">
          <tr>
            <th className="py-2 font-medium">Thời gian</th>
            <th className="py-2 font-medium">Phòng</th>
            <th className="py-2 font-medium">Trạng thái</th>
            <th className="py-2 font-medium">Nhân viên</th>
            <th className="py-2 font-medium">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-border">
              <td className="py-2 text-muted">{e.created_at}</td>
              <td className="py-2 font-medium">{e.room_number}</td>
              <td className="py-2">{e.state}</td>
              <td className="py-2">{e.user_name ?? "—"}</td>
              <td className="py-2 text-muted">{e.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dotBg,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotBg?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 h-9 rounded text-sm border",
        active
          ? "bg-accent text-white border-accent"
          : "bg-surface text-text border-border hover:bg-stone-50",
      )}
    >
      {dotBg && (
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotBg)} />
      )}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs",
          active ? "bg-white/20" : "bg-stone-100 text-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function RoomActionSheet({
  room,
  onClose,
  onSet,
  pending,
}: {
  room: RoomState;
  onClose: () => void;
  onSet: (state: RoomStatusState, notes: string) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");

  const actions: {
    state: RoomStatusState;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }[] = [
    {
      state: "clean",
      label: t("housekeeping.markClean"),
      icon: CheckCheck,
      className: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      state: "dirty",
      label: t("housekeeping.markDirty"),
      icon: CircleDashed,
      className: "bg-amber-600 hover:bg-amber-700",
    },
    {
      state: "inspected",
      label: t("housekeeping.markInspected"),
      icon: CheckCheck,
      className: "bg-teal-600 hover:bg-teal-700",
    },
    {
      state: "maintenance",
      label: t("housekeeping.markMaintenance"),
      icon: Wrench,
      className: "bg-red-600 hover:bg-red-700",
    },
    {
      state: "out_of_service",
      label: t("housekeeping.markOOS"),
      icon: XCircle,
      className: "bg-stone-600 hover:bg-stone-700",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <div className="text-2xl font-semibold">Phòng {room.room_number}</div>
          <div className="text-sm text-muted">{room.room_type}</div>
          <div className="text-xs text-muted mt-2">
            {t("housekeeping.lastUpdated")}: {room.updated_at}
            {room.updated_by_name ? ` · ${room.updated_by_name}` : ""}
          </div>
          {room.occupant_guest_name && (
            <div className="mt-2 p-2 rounded bg-stone-50 text-sm">
              <div className="text-xs text-muted">
                {t("housekeeping.occupant")}
              </div>
              <div>{room.occupant_guest_name}</div>
              {room.check_out && (
                <div className="text-xs text-muted">
                  {t("housekeeping.checkoutToday")}: {room.check_out}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-2">
          <textarea
            className="input !h-16 py-2"
            placeholder={t("housekeeping.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-2 mt-3">
            {actions.map((a) => (
              <button
                key={a.state}
                onClick={() => onSet(a.state, notes)}
                disabled={pending || a.state === room.state}
                className={cn(
                  "flex items-center justify-center gap-2 h-14 rounded text-white font-medium text-md",
                  a.className,
                  "disabled:opacity-40",
                )}
              >
                <a.icon className="h-5 w-5" />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-11 rounded bg-stone-100 text-text"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
