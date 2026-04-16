import { useQuery } from "@tanstack/react-query";
import { listAuditLog } from "../lib/api";

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo",
  cancel: "Huỷ",
  check_in: "Nhận phòng",
  check_out: "Trả phòng",
};

const ENTITY_LABEL: Record<string, string> = {
  reservation: "Đặt phòng",
};

export function AuditLogSection() {
  const { data: entries = [] } = useQuery({
    queryKey: ["audit-log"],
    queryFn: listAuditLog,
  });

  return (
    <section className="card p-5">
      <h2 className="text-md font-semibold mb-3">Lịch sử hoạt động</h2>
      {entries.length === 0 ? (
        <div className="text-sm text-muted">Chưa có hoạt động nào.</div>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left sticky top-0 bg-surface">
              <tr>
                <th className="py-2 font-medium">Thời gian</th>
                <th className="py-2 font-medium">Đối tượng</th>
                <th className="py-2 font-medium">ID</th>
                <th className="py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border">
                  <td className="py-2 text-muted">{e.created_at}</td>
                  <td className="py-2">
                    {ENTITY_LABEL[e.entity] ?? e.entity}
                  </td>
                  <td className="py-2 text-muted">{e.entity_id ?? "—"}</td>
                  <td className="py-2 font-medium">
                    {ACTION_LABEL[e.action] ?? e.action}
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
