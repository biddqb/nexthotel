import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { bootstrapSetup } from "../lib/api";
import { formatVND, parseVND } from "../lib/money";
import { cn } from "../lib/cn";
import { ApiError } from "../lib/http";

export function BootstrapWizard({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  // Hotel
  const [hotelName, setHotelName] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");

  // Rooms
  const [singleCount, setSingleCount] = useState(23);
  const [doubleCount, setDoubleCount] = useState(8);
  const [startingNumber, setStartingNumber] = useState(101);
  const [baseRate, setBaseRate] = useState(500_000);
  const [prefix, setPrefix] = useState("");

  // Admin
  const [adminName, setAdminName] = useState("admin");
  const [adminPin, setAdminPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const totalRooms = singleCount + doubleCount;

  const setupMut = useMutation({
    mutationFn: () =>
      bootstrapSetup({
        hotel: { name: hotelName, address, tax_id: taxId, phone },
        rooms: {
          prefix,
          count: totalRooms,
          starting_number: startingNumber,
          base_rate: baseRate,
          single_count: singleCount,
        },
        admin: { name: adminName.trim(), pin: adminPin },
      }),
    onSuccess: () => {
      toast.success(t("firstRun.done"));
      onComplete();
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : t("errors.UNKNOWN");
      toast.error(msg);
    },
  });

  return (
    <div className="h-full flex items-center justify-center bg-bg p-6 overflow-auto">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-accent">
            {t("firstRun.welcomeTitle")}
          </h1>
          <p className="text-sm text-muted mt-1">{t("firstRun.welcomeSubtitle")}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 w-12 rounded",
                n <= step ? "bg-accent" : "bg-stone-200",
              )}
            />
          ))}
        </div>

        <div className="card p-6">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-md font-semibold">{t("firstRun.step1Title")}</h2>
                <p className="text-sm text-muted">{t("firstRun.step1Desc")}</p>
              </div>
              <Field label={`${t("settings.hotelName")} *`}>
                <input
                  className="input"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label={t("settings.address")}>
                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("settings.taxId")}>
                  <input
                    className="input"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </Field>
                <Field label={t("settings.phone")}>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  onClick={() => setStep(2)}
                  disabled={!hotelName.trim()}
                >
                  {t("common.next")} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-md font-semibold">{t("firstRun.step2Title")}</h2>
                <p className="text-sm text-muted">{t("firstRun.step2Desc")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("firstRun.singleCount")}>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={singleCount}
                    onChange={(e) => setSingleCount(parseInt(e.target.value) || 0)}
                  />
                </Field>
                <Field label={t("firstRun.doubleCount")}>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={doubleCount}
                    onChange={(e) => setDoubleCount(parseInt(e.target.value) || 0)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("firstRun.step2Prefix")}>
                  <input
                    className="input"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="(để trống nếu không có)"
                  />
                </Field>
                <Field label={t("firstRun.step2Start")}>
                  <input
                    type="number"
                    className="input"
                    value={startingNumber}
                    onChange={(e) => setStartingNumber(parseInt(e.target.value) || 0)}
                  />
                </Field>
              </div>
              <Field label={t("settings.baseRate")}>
                <input
                  className="input"
                  value={formatVND(baseRate)}
                  onChange={(e) => setBaseRate(parseVND(e.target.value))}
                />
              </Field>
              <div className="text-xs text-muted">
                Sẽ tạo {totalRooms} phòng: {prefix}
                {startingNumber} → {prefix}
                {startingNumber + totalRooms - 1}
              </div>
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setStep(1)}>
                  {t("common.back")}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setStep(3)}
                  disabled={totalRooms <= 0 || baseRate <= 0}
                >
                  {t("common.next")} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-md font-semibold">{t("firstRun.adminTitle")}</h2>
                <p className="text-sm text-muted">{t("firstRun.adminDesc")}</p>
              </div>
              <Field label={t("auth.username")}>
                <input
                  className="input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("auth.pin")}>
                  <input
                    type="password"
                    inputMode="numeric"
                    className="input"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    maxLength={12}
                  />
                </Field>
                <Field label={t("auth.confirmPin")}>
                  <input
                    type="password"
                    inputMode="numeric"
                    className="input"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={12}
                  />
                </Field>
              </div>
              {adminPin && confirmPin && adminPin !== confirmPin && (
                <div className="text-xs text-red-600">
                  {t("auth.pinMismatch")}
                </div>
              )}
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setStep(2)}>
                  {t("common.back")}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setupMut.mutate()}
                  disabled={
                    !adminName.trim() ||
                    adminPin.length < 4 ||
                    adminPin !== confirmPin ||
                    setupMut.isPending
                  }
                >
                  {t("common.finish")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
