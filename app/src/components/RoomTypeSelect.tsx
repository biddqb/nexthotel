import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listRoomTypes } from "../lib/api";

const NEW = "__new__";
const ALL = "__all__";

/**
 * Dropdown of existing room types with a "Tạo loại mới..." option that
 * reveals a text input. The typed value is returned to the parent through
 * onChange as a plain string.
 *
 * Pass `allowAll` to include a "Tất cả loại phòng" option (for rate plans).
 * The `allValue` is emitted in that case (default null).
 */
export function RoomTypeSelect({
  value,
  onChange,
  allowAll = false,
  allLabel = "Tất cả loại phòng",
  allValue = null,
  className = "input",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string | null;
  className?: string;
}) {
  const { data: types = [] } = useQuery({
    queryKey: ["room-types"],
    queryFn: listRoomTypes,
  });

  const isAll = allowAll && value === allValue;
  const isExistingType = !!value && types.includes(value);
  const [typing, setTyping] = useState(false);

  if (typing) {
    return (
      <div className="flex gap-2">
        <input
          className={className}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập loại phòng mới (vd: vip, view-bien)"
          autoFocus
        />
        <button
          type="button"
          className="btn-ghost !h-9 text-xs shrink-0"
          onClick={() => {
            setTyping(false);
            onChange(types[0] ?? (allowAll ? allValue : ""));
          }}
        >
          Chọn có sẵn
        </button>
      </div>
    );
  }

  const selectValue = isAll ? ALL : value ?? "";

  return (
    <select
      className={className}
      value={selectValue}
      onChange={(e) => {
        const v = e.target.value;
        if (v === NEW) {
          setTyping(true);
          onChange("");
        } else if (v === ALL) {
          onChange(allValue);
        } else {
          onChange(v);
        }
      }}
    >
      {allowAll && <option value={ALL}>{allLabel}</option>}
      {types.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      {!isExistingType && !isAll && value && (
        <option value={value}>{value}</option>
      )}
      <option value={NEW}>+ Tạo loại mới...</option>
    </select>
  );
}
