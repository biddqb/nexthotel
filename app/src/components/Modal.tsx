import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-surface rounded shadow-2xl w-full max-h-[90vh] overflow-auto",
          widthClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 h-12 border-b border-border">
            <h2 className="text-md font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-stone-100 text-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-surface shadow-drawer h-full flex flex-col"
        style={{ width: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
            <h2 className="text-md font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-stone-100 text-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}
