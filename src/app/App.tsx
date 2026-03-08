import { useEffect } from "react";
import { Header } from "./Header.tsx";
import { Layout } from "./Layout.tsx";
import { ConnectionDialog } from "@/features/connection/components/ConnectionDialog.tsx";
import { PublisherPanel } from "@/features/publisher/components/PublisherPanel.tsx";
import { RecorderPanel } from "@/features/recorder/components/RecorderPanel.tsx";
import { useConnection } from "@/hooks/useConnection.ts";
import { useRecorder } from "@/hooks/useRecorder.ts";
import { useUIStore } from "@/stores/uiStore.ts";
import { Toaster } from "sonner";
import { PasswordPrompt } from "@/components/ui/PasswordPrompt.tsx";
import { UpdateNotification } from "@/components/UpdateNotification.tsx";

export function App() {
  const { loadProfiles } = useConnection();
  const { loadSessions } = useRecorder();
  const { openConnectionDialog } = useUIStore();

  useEffect(() => {
    loadProfiles();
    loadSessions();
    openConnectionDialog();
  }, [loadProfiles, loadSessions]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <Layout />
      <ConnectionDialog />
      <PublisherPanel />
      <RecorderPanel />
      <PasswordPrompt />
      <UpdateNotification />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}
