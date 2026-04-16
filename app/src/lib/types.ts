export interface Hotel {
  id: number;
  name: string;
  address: string;
  tax_id: string;
  phone: string;
}

export interface Room {
  id: number;
  hotel_id: number;
  room_number: string;
  room_type: string;
  base_rate: number;
  active: boolean;
}

export interface Guest {
  id: number;
  hotel_id: number;
  name: string;
  phone: string;
  id_number: string;
  nationality: string;
  notes: string;
  is_blacklisted: boolean;
  blacklist_reason: string;
  created_at: string;
}

export type ReservationStatus =
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "refunded";

export interface Reservation {
  id: number;
  hotel_id: number;
  room_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  rate: number;
  total: number;
  deposit: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithDetails extends Reservation {
  guest_name: string;
  guest_phone: string;
  room_number: string;
  room_type: string;
  paid_amount: number;
  nights: number;
}

export interface Payment {
  id: number;
  hotel_id: number;
  reservation_id: number;
  amount: number;
  method: "cash" | "bank" | "card" | "other";
  paid_at: string;
  notes: string;
}

export interface RatePlan {
  id: number;
  hotel_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  applies_to_room_type: string | null;
  rate: number;
  priority: number;
}

export interface AppConfig {
  data_dir: string;
  first_run_complete: boolean;
  locale: string;
}

export interface OccupancyReport {
  from: string;
  to: string;
  room_count: number;
  total_room_nights: number;
  sold_room_nights: number;
  occupancy_pct: number;
  revenue: number;
  adr: number;
  revpar: number;
  bookings: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

export interface BackupFile {
  path: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface DetectedCloudFolders {
  onedrive: string | null;
  google_drive: string | null;
  dropbox: string | null;
}

export type Role = "staff" | "manager" | "director";

export interface User {
  id: number;
  name: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
}

// ---------- Housekeeping ----------
export type RoomStatusState =
  | "clean"
  | "dirty"
  | "inspected"
  | "out_of_service"
  | "maintenance";

export interface RoomState {
  room_id: number;
  room_number: string;
  room_type: string;
  state: RoomStatusState;
  notes: string;
  updated_at: string;
  updated_by: number | null;
  updated_by_name: string | null;
  occupant_guest_name: string | null;
  reservation_id: number | null;
  check_out: string | null;
}

export interface HousekeepingEvent {
  id: number;
  room_id: number;
  room_number: string;
  state: string;
  user_name: string | null;
  notes: string;
  created_at: string;
}

// ---------- Charges ----------
export type ChargeCategory = "minibar" | "laundry" | "food" | "service" | "other";

export interface ReservationCharge {
  id: number;
  reservation_id: number;
  category: ChargeCategory;
  description: string;
  amount: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

// ---------- Expenses ----------
export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  expense_date: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface ExpenseSummary {
  from: string;
  to: string;
  total: number;
  by_category: [string, number][];
}

// ---------- Shifts ----------
export interface Shift {
  id: number;
  user_id: number;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  handover_notes: string;
}

// ---------- Night audit ----------
export interface NightAudit {
  audit_date: string;
  locked_at: string;
  locked_by: number | null;
  locked_by_name: string | null;
  revenue: number;
  occupancy_pct: number;
  adr: number;
  notes: string;
}

export interface NightAuditPreview {
  date: string;
  already_locked: boolean;
  revenue: number;
  occupancy_pct: number;
  adr: number;
  unpaid_reservations: number;
  dirty_rooms: number;
  open_shifts: number;
}
