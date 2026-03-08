import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Button } from "./Button.tsx";
import { Input } from "./Input.tsx";
import { cn } from "@/lib/cn.ts";
import { X } from "lucide-react";

interface PasswordPromptState {
  open: boolean;
  title: string;
  resolve: ((value: string | null) => void) | null;
  prompt: (title: string) => Promise<string | null>;
  close: (value: string | null) => void;
}

export const usePasswordPrompt = create<PasswordPromptState>((set, get) => ({
  open: false,
  title: "",
  resolve: null,

  prompt: (title: string) =>
    new Promise<string | null>((resolve) => {
      set({ open: true, title, resolve });
    }),

  close: (value: string | null) => {
    const { resolve } = get();
    resolve?.(value);
    set({ open: false, title: "", resolve: null });
  },
}));

export function PasswordPrompt() {
  const { open, title, close } = usePasswordPrompt();
  const [password, setPassword] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      setPassword("");
      el.showModal();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => close(null);
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [close]);

  const handleSubmit = () => {
    if (!password) return;
    close(password);
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 m-auto",
        "backdrop:bg-black/50 bg-[var(--card)] text-[var(--card-foreground)]",
        "rounded-lg border border-[var(--border)] shadow-lg p-0 max-w-sm w-full",
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) close(null);
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={() => close(null)}>
          <X size={16} />
        </Button>
      </div>
      <div className="p-4 space-y-3">
        <Input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!password}>
            Confirm
          </Button>
        </div>
      </div>
    </dialog>
  );
}
