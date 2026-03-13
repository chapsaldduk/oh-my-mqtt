import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { useConnection } from "@/hooks/useConnection.ts";
import { useUIStore } from "@/stores/uiStore.ts";
import { Trash2, Plus, Edit, MoreVertical, Download, Upload, X } from "lucide-react";
import type { ConnectionProfile, Subscription } from "@/types/mqtt.ts";
import { DropdownMenu } from "@/components/ui/DropdownMenu.tsx";
import { usePasswordPrompt } from "@/components/ui/PasswordPrompt.tsx";
import { encrypt, decrypt } from "@/lib/crypto.ts";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  DEFAULT_PORT_MQTT,
  DEFAULT_PORT_MQTTS,
  DEFAULT_PORT_WS,
  DEFAULT_PORT_WSS,
} from "@/constants/defaults.ts";

const isElectron =
  typeof window !== "undefined" && window.electronAPI !== undefined;

type Protocol = ConnectionProfile["protocol"];

const PORT_MAP: Record<Protocol, number> = {
  mqtt: DEFAULT_PORT_MQTT,
  mqtts: DEFAULT_PORT_MQTTS,
  ws: DEFAULT_PORT_WS,
  wss: DEFAULT_PORT_WSS,
};

const isTcpProtocol = (protocol: Protocol) =>
  protocol === "mqtt" || protocol === "mqtts";

export function ConnectionDialog() {
  const { showConnectionDialog, toggleConnectionDialog } = useUIStore();
  const {
    profiles,
    connect,
    addProfile,
    updateProfile,
    deleteProfile,
    status,
    createDefaultProfile,
  } = useConnection();

  const defaultProfile = createDefaultProfile();
  const [form, setForm] =
    useState<Omit<ConnectionProfile, "id" | "createdAt" | "updatedAt">>(
      defaultProfile,
    );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(profiles.length === 0);

  useEffect(() => {
    setShowForm(profiles.length === 0);
  }, [profiles.length]);

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleProtocolChange = (protocol: Protocol) => {
    setForm((prev) => ({
      ...prev,
      protocol,
      port: PORT_MAP[protocol],
      path: isTcpProtocol(protocol) ? "" : prev.path || "/mqtt",
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.host) return;
    if (editingId) {
      // Update existing profile
      await updateProfile(editingId, form);
      connect(editingId);
      setEditingId(null);
    } else {
      // Create new profile
      const id = await addProfile(form);
      connect(id);
    }
    setShowForm(false);
    toggleConnectionDialog();
  };

  const handleConnect = (id: string) => {
    connect(id);
    toggleConnectionDialog();
  };

  const passwordPrompt = usePasswordPrompt((s) => s.prompt);

  const handleExport = async (profile: ConnectionProfile) => {
    const password = await passwordPrompt("Export - Enter encryption password");
    if (!password) return;

    const { id, createdAt, updatedAt, ...data } = profile;
    const encrypted = await encrypt(JSON.stringify(data), password);
    const file = JSON.stringify(
      { version: 1, type: "oh-my-mqtt-connection", encrypted },
      null,
      2,
    );

    if (isElectron && window.electronAPI?.file.save) {
      await window.electronAPI.file.save(file, `${profile.name || "connection"}.ommqtt`, [
        { name: "Oh My MQTT Connection", extensions: ["ommqtt"] },
      ]);
    } else {
      const blob = new Blob([file], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile.name || "connection"}.ommqtt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    let content: string | null = null;

    if (isElectron && window.electronAPI?.file.open) {
      const result = await window.electronAPI.file.open([
        { name: "Oh My MQTT Connection", extensions: ["ommqtt"] },
        { name: "All Files", extensions: ["*"] },
      ]);
      if (!result) return;
      content = result.content;
    } else {
      content = await new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".ommqtt";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(file);
        };
        input.click();
      });
    }

    if (!content) return;

    let parsed: { version: number; type: string; encrypted: string };
    try {
      parsed = JSON.parse(content);
      if (parsed.type !== "oh-my-mqtt-connection" || !parsed.encrypted) {
        throw new Error("Invalid file format");
      }
    } catch {
      toast.error("Invalid connection file");
      return;
    }

    const password = await passwordPrompt("Import - Enter decryption password");
    if (!password) return;

    try {
      const decrypted = await decrypt(parsed.encrypted, password);
      const data = JSON.parse(decrypted);
      data.clientId = `oh-my-mqtt-${nanoid(8)}`;
      await addProfile(data);
      toast.success("Connection imported successfully");
    } catch {
      toast.error("Failed to decrypt. Wrong password?");
    }
  };

  return (
    <Dialog
      open={showConnectionDialog}
      onClose={toggleConnectionDialog}
      title="MQTT Connections"
      className="max-w-lg"
    >
      {!showForm ? (
        <div className="space-y-3">
          {profiles.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No connections yet. Create one to get started.
            </p>
          )}
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
              onClick={() => handleConnect(p.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {p.protocol}://{p.host}:{p.port}
                </p>
              </div>
              <div
                className="ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu
                  trigger={
                    <Button size="icon" variant="ghost" title="More actions">
                      <MoreVertical size={14} />
                    </Button>
                  }
                  items={[
                    {
                      label: "Edit",
                      icon: <Edit size={14} />,
                      onClick: () => {
                        setForm(p);
                        setEditingId(p.id);
                        setShowForm(true);
                      },
                    },
                    {
                      label: "Export",
                      icon: <Download size={14} />,
                      onClick: () => handleExport(p),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => deleteProfile(p.id),
                      variant: "destructive",
                    },
                  ]}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setForm(createDefaultProfile());
                setEditingId(null);
                setShowForm(true);
              }}
            >
              <Plus size={14} className="mr-1" /> New Connection
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <Upload size={14} className="mr-1" /> Import
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="My Broker"
            />
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Host
              </label>
              <Input
                value={form.host}
                onChange={(e) => updateField("host", e.target.value)}
                placeholder="broker.example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Port
              </label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => updateField("port", Number(e.target.value))}
              />
            </div>
          </div>
          <div
            className={`grid gap-2 ${isTcpProtocol(form.protocol) ? "grid-cols-1" : "grid-cols-2"}`}
          >
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Protocol
              </label>
              <Select
                value={form.protocol}
                onChange={(e) =>
                  handleProtocolChange(e.target.value as Protocol)
                }
              >
                {isElectron && <option value="mqtts">mqtts:// (TLS)</option>}
                {isElectron && <option value="mqtt">mqtt:// (TCP)</option>}
                <option value="wss">wss:// (WebSocket TLS)</option>
                <option value="ws">ws:// (WebSocket)</option>
              </Select>
            </div>
            {!isTcpProtocol(form.protocol) && (
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">
                  Path
                </label>
                <Input
                  value={form.path}
                  onChange={(e) => updateField("path", e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Username
              </label>
              <Input
                value={form.username ?? ""}
                onChange={(e) => updateField("username", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Password
              </label>
              <Input
                type="password"
                value={form.password ?? ""}
                onChange={(e) => updateField("password", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                MQTT Version
              </label>
              <Select
                value={form.mqttVersion}
                onChange={(e) =>
                  updateField(
                    "mqttVersion",
                    Number(e.target.value) as 3 | 4 | 5,
                  )
                }
              >
                <option value={4}>v3.1.1</option>
                <option value={5}>v5.0</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Client ID
              </label>
              <Input
                value={form.clientId}
                onChange={(e) => updateField("clientId", e.target.value)}
              />
            </div>
          </div>

          {/* Subscriptions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Subscriptions
              </label>
            </div>
            {(form.subscriptions ?? []).map((sub, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <Input
                  value={sub.topic}
                  onChange={(e) => {
                    const subs = [...(form.subscriptions ?? [])];
                    subs[idx] = { ...subs[idx], topic: e.target.value };
                    updateField("subscriptions", subs);
                  }}
                  placeholder="topic/path/#"
                  className="flex-1 h-8 text-xs"
                />
                <Select
                  value={sub.qos}
                  onChange={(e) => {
                    const subs = [...(form.subscriptions ?? [])];
                    subs[idx] = {
                      ...subs[idx],
                      qos: Number(e.target.value) as 0 | 1 | 2,
                    };
                    updateField("subscriptions", subs);
                  }}
                  className="w-20 h-8 text-xs"
                >
                  <option value={0}>QoS 0</option>
                  <option value={1}>QoS 1</option>
                  <option value={2}>QoS 2</option>
                </Select>
                <input
                  type="color"
                  value={sub.color || "#22c55e"}
                  onChange={(e) => {
                    const subs = [...(form.subscriptions ?? [])];
                    subs[idx] = { ...subs[idx], color: e.target.value };
                    updateField("subscriptions", subs);
                  }}
                  className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer p-0.5 bg-transparent"
                  title="Subscription color"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    const subs = (form.subscriptions ?? []).filter(
                      (_, i) => i !== idx,
                    );
                    updateField("subscriptions", subs);
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => {
                const subs = [
                  ...(form.subscriptions ?? []),
                  { topic: "", qos: 0 as const },
                ];
                updateField("subscriptions", subs);
              }}
            >
              <Plus size={12} className="mr-1" /> Add Subscription
            </Button>
          </div>

          {/* TLS/SSL Certificate fields for mqtts/wss */}
          {(form.protocol === "mqtts" || form.protocol === "wss") &&
            isElectron && (
              <div className="space-y-2 p-2 bg-[var(--accent)]/30 rounded border border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  TLS/SSL Certificates (Optional)
                </p>
                <CertificateField
                  label="CA Certificate (Server)"
                  value={form.caFile || ""}
                  onChange={(val) => updateField("caFile", val)}
                  placeholder="Select CA file (.pem, .crt)"
                />
                <CertificateField
                  label="Client Certificate"
                  value={form.certFile || ""}
                  onChange={(val) => updateField("certFile", val)}
                  placeholder="Select certificate (.crt, .pem)"
                />
                <CertificateField
                  label="Client Private Key"
                  value={form.keyFile || ""}
                  onChange={(val) => updateField("keyFile", val)}
                  placeholder="Select key file (.key, .pem)"
                />
              </div>
            )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Back
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {editingId ? "Update" : "Save"} & Connect
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function CertificateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const handleSelectFile = async () => {
    if (!isElectron || !window.electronAPI?.file.open) return;

    const result = await window.electronAPI.file.open([
      { name: "Certificate Files", extensions: ["pem", "crt", "cer", "key"] },
      { name: "All Files", extensions: ["*"] },
    ]);

    if (result) {
      onChange(result.filePath);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value}
        readOnly
        placeholder={placeholder}
        className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] flex-1"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleSelectFile}
        className="text-xs h-7"
      >
        Browse
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onChange("")}
          title="Clear"
        >
          <Trash2 size={12} />
        </Button>
      )}
    </div>
  );
}
