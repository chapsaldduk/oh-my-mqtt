import { ConnectionStatus } from "@/features/connection/components/ConnectionStatus.tsx";
import { RecentConnectionsTabs } from "@/features/connection/components/RecentConnectionsTabs.tsx";
import { useUIStore } from "@/stores/uiStore.ts";
import { useRecorder } from "@/hooks/useRecorder.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Circle, Search, Send, Moon, Sun, Zap, BarChart3 } from "lucide-react";

const isElectron =
  typeof window !== "undefined" && window.electronAPI !== undefined;
const noDrag = isElectron
  ? ({ WebkitAppRegion: "no-drag" } as React.CSSProperties)
  : undefined;

export function Header() {
  const {
    theme,
    setTheme,
    toggleConnectionDialog,
    toggleRecorderPanel,
    togglePublisherPanel,
    toggleSearchPanel,
    toggleStatsPanel,
    showStatsPanel,
  } = useUIStore();
  const { isRecording } = useRecorder();

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header
      className={`flex items-center gap-2 py-1.5 border-b border-[var(--border)] bg-[var(--card)] ${isElectron ? "pl-20 pr-3" : "px-3"}`}
      style={
        isElectron
          ? ({ WebkitAppRegion: "drag" } as React.CSSProperties)
          : undefined
      }
    >
      <button
        className="flex items-center gap-1.5 font-semibold text-sm cursor-pointer hover:opacity-80"
        onClick={toggleConnectionDialog}
        style={noDrag}
      >
        <Zap size={16} className="text-[var(--primary)]" />
        <span>Oh My MQTT</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5" style={noDrag}>
        <ConnectionStatus />

        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          onClick={toggleRecorderPanel}
          title="Recorder"
        >
          <Circle
            size={14}
            className={isRecording ? "fill-current animate-pulse" : ""}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={togglePublisherPanel}
          title="Publish message"
        >
          <Send size={14} />
        </Button>

        <Button
          variant={showStatsPanel ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleStatsPanel}
          title="Statistics"
        >
          <BarChart3 size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSearchPanel}
          title="Search"
        >
          <Search size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title="Toggle theme"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
      </div>
    </header>
  );
}
