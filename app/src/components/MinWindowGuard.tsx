import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function MinWindowGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => {
      setTooSmall(window.innerWidth < 1280 || window.innerHeight < 800);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg mb-2">{t("app.minWindow")}</p>
          <p className="text-sm text-muted">
            {window.innerWidth} × {window.innerHeight}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
