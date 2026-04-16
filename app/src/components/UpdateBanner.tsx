import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, X } from "lucide-react";
import { checkUpdate, applyUpdate, type UpdateManifest } from "../lib/api";

export function UpdateBanner() {
  const { t } = useTranslation();
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await checkUpdate();
        if (!cancelled && res.update_available && res.manifest) {
          setManifest(res.manifest);
        }
      } catch {
        // silent — update check is best-effort
      }
    };
    const timeout = setTimeout(check, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (!manifest || dismissed) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyUpdate(manifest);
    } catch {
      setApplying(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-accent/30 bg-white shadow-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          <Download className="h-4 w-4" />
          {t("update.available", { version: manifest.version })}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted hover:text-text -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {manifest.notes && (
        <p className="text-xs text-muted">{manifest.notes}</p>
      )}
      <button
        onClick={handleApply}
        disabled={applying}
        className="btn-primary w-full justify-center text-sm !h-8"
      >
        {applying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("update.downloading")}
          </>
        ) : (
          t("update.install")
        )}
      </button>
    </div>
  );
}
