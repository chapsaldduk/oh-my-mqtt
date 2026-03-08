import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/cn.ts";
import { X } from "lucide-react";
import { Button } from "./Button.tsx";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleClose = () => onClose();
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 m-auto",
        "backdrop:bg-black/50 bg-[var(--card)] text-[var(--card-foreground)]",
        "rounded-lg border border-[var(--border)] shadow-lg p-0 max-w-lg w-full",
        className,
      )}
      onCancel={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
