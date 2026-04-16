import { apiDelete, apiGet, apiPost, apiPut, qs } from "./http";
import type {
  AppConfig,
  BackupFile,
  DailyRevenue,
  DetectedCloudFolders,
  Expense,
  ExpenseSummary,
  Guest,
  Hotel,
  HousekeepingEvent,
  NightAudit,
  NightAuditPreview,
  OccupancyReport,
  Payment,
  RatePlan,
  Reservation,
  ReservationCharge,
  ReservationWithDetails,
  Role,
  Room,
  RoomState,
  RoomStatusState,
  Shift,
  User,
} from "./types";

// ---------- Auth ----------

export interface BootstrapStatus {
  needs_bootstrap: boolean;
  has_hotel: boolean;
  has_users: boolean;
  first_run_complete: boolean;
}

export const bootstrapStatus = () =>
  apiGet<BootstrapStatus>("/api/bootstrap/status");

export interface BootstrapInput {
  hotel: { name: string; address: string; tax_id: string; phone: string };
  rooms: {
    prefix: string;
    count: number;
    starting_number: number;
    base_rate: number;
    single_count?: number;
  };
  admin: { name: string; pin: string };
}

export const bootstrapSetup = (input: BootstrapInput) =>
  apiPost<User>("/api/bootstrap/setup", input);

export const login = (name: string, pin: string) =>
  apiPost<User>("/api/auth/login", { name, pin });
export const logout = () => apiPost<void>("/api/auth/logout");
export const me = () => apiGet<User>("/api/auth/me");

// ---------- Hotel ----------
export const getHotel = () => apiGet<Hotel | null>("/api/hotel");
export const upsertHotel = (args: {
  name: string;
  address: string;
  taxId: string;
  phone: string;
}) =>
  apiPut<Hotel>("/api/hotel", {
    name: args.name,
    address: args.address,
    tax_id: args.taxId,
    phone: args.phone,
  });

// ---------- Rooms ----------
export const listRooms = () => apiGet<Room[]>("/api/rooms");
export const listRoomTypes = () => apiGet<string[]>("/api/room-types");
export const createRoom = (args: {
  roomNumber: string;
  roomType: string;
  baseRate: number;
}) =>
  apiPost<Room>("/api/rooms", {
    room_number: args.roomNumber,
    room_type: args.roomType,
    base_rate: args.baseRate,
  });
export const updateRoom = (args: {
  id: number;
  roomNumber: string;
  roomType: string;
  baseRate: number;
  active: boolean;
}) =>
  apiPut<Room>(`/api/rooms/${args.id}`, {
    room_number: args.roomNumber,
    room_type: args.roomType,
    base_rate: args.baseRate,
    active: args.active,
  });
export const bulkCreateRooms = (args: {
  prefix: string;
  count: number;
  startingNumber: number;
  roomType: string;
  baseRate: number;
}) =>
  apiPost<Room[]>("/api/rooms/bulk", {
    prefix: args.prefix,
    count: args.count,
    starting_number: args.startingNumber,
    room_type: args.roomType,
    base_rate: args.baseRate,
  });

// ---------- Guests ----------
export const listGuests = (q?: string) =>
  apiGet<Guest[]>(`/api/guests${qs({ q })}`);
export const getGuest = (id: number) => apiGet<Guest>(`/api/guests/${id}`);
export const createGuest = (args: {
  name: string;
  phone: string;
  idNumber: string;
  nationality?: string;
  notes?: string;
}) =>
  apiPost<Guest>("/api/guests", {
    name: args.name,
    phone: args.phone,
    id_number: args.idNumber,
    nationality: args.nationality,
    notes: args.notes,
  });
export const updateGuest = (args: {
  id: number;
  name: string;
  phone: string;
  idNumber: string;
  nationality: string;
  notes: string;
}) =>
  apiPut<Guest>(`/api/guests/${args.id}`, {
    name: args.name,
    phone: args.phone,
    id_number: args.idNumber,
    nationality: args.nationality,
    notes: args.notes,
  });
export const setBlacklist = (args: {
  id: number;
  isBlacklisted: boolean;
  reason: string;
}) =>
  apiPut<Guest>(`/api/guests/${args.id}/blacklist`, {
    is_blacklisted: args.isBlacklisted,
    reason: args.reason,
  });

// ---------- Rate plans ----------
export const listRatePlans = () => apiGet<RatePlan[]>("/api/rate-plans");
export const createRatePlan = (args: {
  name: string;
  startsOn: string;
  endsOn: string;
  appliesToRoomType?: string | null;
  rate: number;
  priority?: number;
}) =>
  apiPost<RatePlan>("/api/rate-plans", {
    name: args.name,
    starts_on: args.startsOn,
    ends_on: args.endsOn,
    applies_to_room_type: args.appliesToRoomType ?? null,
    rate: args.rate,
    priority: args.priority ?? 0,
  });
export const deleteRatePlan = (id: number) =>
  apiDelete<void>(`/api/rate-plans/${id}`);
export const quoteRate = (args: {
  roomId: number;
  checkIn: string;
  checkOut: string;
}) =>
  apiPost<number>("/api/rate-plans/quote", {
    room_id: args.roomId,
    check_in: args.checkIn,
    check_out: args.checkOut,
  });

// ---------- Reservations ----------
export interface CreateReservationInput {
  room_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  rate?: number | null;
  deposit?: number | null;
  notes?: string | null;
}

export interface UpdateReservationInput {
  id: number;
  room_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  rate: number;
  deposit?: number | null;
  notes?: string | null;
}

export const createReservation = (input: CreateReservationInput) =>
  apiPost<ReservationWithDetails>("/api/reservations", input);
export const updateReservation = (input: UpdateReservationInput) =>
  apiPut<ReservationWithDetails>(`/api/reservations/${input.id}`, input);
export const cancelReservation = (id: number) =>
  apiPost<Reservation>(`/api/reservations/${id}/cancel`);
export const checkInReservation = (id: number) =>
  apiPost<Reservation>(`/api/reservations/${id}/check-in`);
export const checkOutReservation = (id: number) =>
  apiPost<Reservation>(`/api/reservations/${id}/check-out`);
export const getReservation = (id: number) =>
  apiGet<ReservationWithDetails>(`/api/reservations/${id}`);
export const listReservationsInRange = (from: string, to: string) =>
  apiGet<ReservationWithDetails[]>(`/api/reservations/range${qs({ from, to })}`);
export const listArrivalsForDate = (date: string) =>
  apiGet<ReservationWithDetails[]>(`/api/reservations/arrivals${qs({ date })}`);
export const listDeparturesForDate = (date: string) =>
  apiGet<ReservationWithDetails[]>(`/api/reservations/departures${qs({ date })}`);

// ---------- Payments ----------
export const listPaymentsForReservation = (reservationId: number) =>
  apiGet<Payment[]>(`/api/reservations/${reservationId}/payments`);
export const recordPayment = (args: {
  reservationId: number;
  amount: number;
  method: "cash" | "bank" | "card" | "other";
  notes?: string;
}) =>
  apiPost<Payment>(`/api/reservations/${args.reservationId}/payments`, {
    amount: args.amount,
    method: args.method,
    notes: args.notes,
  });
export const deletePayment = (id: number) => apiDelete<void>(`/api/payments/${id}`);

// ---------- Reports ----------
export const occupancyReport = (from: string, to: string) =>
  apiGet<OccupancyReport>(`/api/reports/occupancy${qs({ from, to })}`);
export const dailyRevenue = (from: string, to: string) =>
  apiGet<DailyRevenue[]>(`/api/reports/daily-revenue${qs({ from, to })}`);

// ---------- Backup ----------
export const createBackup = () => apiPost<BackupFile>("/api/backup");
export const listBackups = () => apiGet<BackupFile[]>("/api/backup");
export const pruneBackups = (keepDays?: number) =>
  apiPost<number>("/api/backup/prune", { keep_days: keepDays ?? 30 });

// ---------- Settings ----------
export const getConfig = () => apiGet<AppConfig>("/api/config");
export const detectCloudFolders = () =>
  apiGet<DetectedCloudFolders>("/api/detect-cloud-folders");
export const completeFirstRun = () =>
  apiPost<AppConfig>("/api/config/complete-first-run");

// ---------- Housekeeping ----------
export const listRoomStates = () =>
  apiGet<RoomState[]>("/api/housekeeping/rooms");
export const setRoomState = (args: {
  roomId: number;
  state: RoomStatusState;
  notes?: string;
}) =>
  apiPut<RoomState>(`/api/housekeeping/rooms/${args.roomId}/state`, {
    state: args.state,
    notes: args.notes ?? "",
  });
export const listHousekeepingEvents = () =>
  apiGet<HousekeepingEvent[]>("/api/housekeeping/events");

// ---------- Charges ----------
export const listChargesForReservation = (reservationId: number) =>
  apiGet<ReservationCharge[]>(`/api/reservations/${reservationId}/charges`);
export const createCharge = (args: {
  reservationId: number;
  category: "minibar" | "laundry" | "food" | "service" | "other";
  description: string;
  amount: number;
}) =>
  apiPost<ReservationCharge>(
    `/api/reservations/${args.reservationId}/charges`,
    {
      category: args.category,
      description: args.description,
      amount: args.amount,
    },
  );
export const deleteCharge = (id: number) =>
  apiDelete<void>(`/api/charges/${id}`);

// ---------- Expenses ----------
export const listExpenses = (from?: string, to?: string) =>
  apiGet<Expense[]>(`/api/expenses${qs({ from, to })}`);
export const createExpense = (args: {
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  expenseDate: string;
}) =>
  apiPost<Expense>("/api/expenses", {
    category: args.category,
    description: args.description,
    amount: args.amount,
    vendor: args.vendor,
    expense_date: args.expenseDate,
  });
export const deleteExpense = (id: number) =>
  apiDelete<void>(`/api/expenses/${id}`);
export const expenseSummary = (from: string, to: string) =>
  apiGet<ExpenseSummary>(`/api/expenses/summary${qs({ from, to })}`);

// ---------- Shifts ----------
export const activeShift = () =>
  apiGet<Shift | null>("/api/shifts/active");
export const clockIn = () => apiPost<Shift>("/api/shifts/clock-in");
export const clockOut = (handoverNotes: string) =>
  apiPost<Shift>("/api/shifts/clock-out", { handover_notes: handoverNotes });
export const listShifts = (from?: string, to?: string) =>
  apiGet<Shift[]>(`/api/shifts${qs({ from, to })}`);

// ---------- Night audit ----------
export const previewAudit = (date: string) =>
  apiGet<NightAuditPreview>(`/api/night-audit/preview${qs({ date })}`);
export const runAudit = (date: string, notes?: string) =>
  apiPost<NightAudit>("/api/night-audit", { date, notes });
export const listAudits = () => apiGet<NightAudit[]>("/api/night-audit");

// ---------- Audit log (director only) ----------
export interface AuditEntry {
  id: number;
  entity: string;
  entity_id: number | null;
  action: string;
  diff: string;
  created_at: string;
}
export const listAuditLog = () => apiGet<AuditEntry[]>("/api/audit-log");

// ---------- Updater ----------
export interface UpdateManifest {
  version: string;
  url: string;
  notes: string;
}
export interface UpdateCheckResult {
  current_version: string;
  update_available: boolean;
  manifest?: UpdateManifest;
}
export const getVersion = () => apiGet<{ version: string }>("/api/version");
export const checkUpdate = () => apiGet<UpdateCheckResult>("/api/update/check");
export const applyUpdate = (manifest: UpdateManifest) =>
  apiPost<{ ok: boolean }>("/api/update/apply", manifest);

// ---------- Users ----------
export const listUsers = () => apiGet<User[]>("/api/users");
export const createUser = (args: { name: string; pin: string; role: Role }) =>
  apiPost<User>("/api/users", args);
export const updateUser = (args: {
  id: number;
  name: string;
  role: Role;
  active: boolean;
  newPin?: string;
}) =>
  apiPut<User>(`/api/users/${args.id}`, {
    name: args.name,
    role: args.role,
    active: args.active,
    new_pin: args.newPin,
  });
