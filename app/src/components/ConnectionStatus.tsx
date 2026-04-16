import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Polls a cheap endpoint and shows a banner if the server is unreachable.
 * Sits at the top of the viewport, above all content. Auto-dismisses on recovery.
 */
export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/config", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!cancelled) setOffline(!res.ok && res.status === 0);
      } catch {
        if (!cancelled) setOffline(true);
      }
    };
    check();
    const id = setInterval(check, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm text-center py-1.5 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      Mất kết nối đến máy chủ. Kiểm tra wifi hoặc báo quản lý.
    </div>
  );
}
