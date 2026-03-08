import { useEffect, useState } from "react";
import { Download, X, RefreshCw, CheckCircle } from "lucide-react";

type UpdateState =
  | { status: "idle" }
  | { status: "available"; version: string }
  | { status: "downloading"; percent: number }
  | { status: "ready" }
  | { status: "dismissed" };

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const isElectron = !!window.electronAPI?.updater;

  useEffect(() => {
    if (!isElectron) return;

    const updater = window.electronAPI!.updater;

    const unsubs = [
      updater.onUpdateAvailable((info) => {
        setState({ status: "available", version: info.version });
      }),
      updater.onDownloadProgress((progress) => {
        setState({ status: "downloading", percent: progress.percent });
      }),
      updater.onUpdateDownloaded(() => {
        setState({ status: "ready" });
      }),
      updater.onError(() => {
        setState({ status: "idle" });
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [isElectron]);

  if (!isElectron || state.status === "idle" || state.status === "dismissed") {
    return null;
  }

  const isWindows = navigator.userAgent.includes("Windows");

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
      <button
        className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
        onClick={() => setState({ status: "dismissed" })}
      >
        <X size={14} />
      </button>

      {state.status === "available" && (
        <div className="flex items-start gap-3">
          <RefreshCw size={20} className="mt-0.5 shrink-0 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-100">
              v{state.version} available
            </p>
            {isWindows ? (
              <button
                className="mt-2 flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                onClick={() => window.electronAPI!.updater.download()}
              >
                <Download size={12} />
                Download
              </button>
            ) : (
              <a
                className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300 underline"
                href="https://github.com/chapsaldduk/oh-my-mqtt/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download from GitHub
              </a>
            )}
          </div>
        </div>
      )}

      {state.status === "downloading" && (
        <div className="flex items-start gap-3">
          <Download size={20} className="mt-0.5 shrink-0 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-100">Downloading...</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-700">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {state.percent.toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex items-start gap-3">
          <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-100">Ready to install</p>
            <button
              className="mt-2 flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
              onClick={() => window.electronAPI!.updater.install()}
            >
              Restart & Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
