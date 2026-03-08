import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
}

export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        el.style.top = `${rect.bottom + 4}px`;
        el.style.left = `${rect.right}px`;
        el.style.transform = "translateX(-100%)";
      }
      el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => setOpen(false);
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, []);

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen((v) => !v)}>
        {trigger}
      </div>
      <dialog
        ref={dialogRef}
        className="fixed m-0 min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg p-0 py-1 backdrop:bg-transparent"
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--accent)] transition-colors ${
              item.variant === "destructive"
                ? "text-red-500"
                : "text-[var(--foreground)]"
            }`}
            onClick={() => {
              item.onClick();
              setOpen(false);
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </dialog>
    </>
  );
}
