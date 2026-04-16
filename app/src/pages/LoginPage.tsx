import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/http";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(name.trim(), pin);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("errors.UNKNOWN");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-bg p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm card p-6 space-y-4"
        autoComplete="off"
      >
        <div className="text-center mb-2">
          <div className="text-xl font-semibold text-accent">nextHotel</div>
          <div className="text-sm text-muted mt-1">{t("auth.loginTitle")}</div>
        </div>
        <label className="block">
          <div className="label mb-1">{t("auth.username")}</div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="block">
          <div className="label mb-1">{t("auth.pin")}</div>
          <input
            type="password"
            inputMode="numeric"
            className="input tracking-[0.3em] text-center text-lg"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={12}
          />
        </label>
        <button
          type="submit"
          className="btn-primary w-full justify-center"
          disabled={!name.trim() || pin.length < 4 || submitting}
        >
          {t("auth.signIn")}
        </button>
      </form>
    </div>
  );
}
