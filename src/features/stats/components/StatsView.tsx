import { useStats } from '@/hooks/useStats.ts';
import { formatBytes } from '@/lib/payload-parser.ts';

export function StatsView() {
  const stats = useStats();

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Statistics
        </h2>
      </div>

      <div className="p-3 space-y-4">
        {/* Overview */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Messages" value={stats.totalMessages.toLocaleString()} />
          <StatCard label="Rate" value={`${stats.messageRate}/s`} />
          <StatCard label="Topics" value={String(stats.uniqueTopics)} />
          <StatCard label="Total Size" value={formatBytes(stats.totalSize)} />
          <StatCard label="Max Depth" value={String(stats.maxDepth)} />
          <StatCard label="Retained" value={String(stats.retainedCount)} />
        </div>

        {/* QoS Distribution */}
        <div>
          <h3 className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase mb-1.5">
            QoS Distribution
          </h3>
          <div className="flex gap-1 h-5">
            {stats.qosDist.map((count, qos) => {
              const pct = stats.totalMessages > 0 ? (count / stats.totalMessages) * 100 : 0;
              if (pct === 0) return null;
              const colors = [
                'bg-blue-500/70',
                'bg-amber-500/70',
                'bg-red-500/70',
              ];
              return (
                <div
                  key={qos}
                  className={`${colors[qos]} rounded text-[9px] text-white flex items-center justify-center min-w-[24px]`}
                  style={{ width: `${Math.max(pct, 10)}%` }}
                  title={`QoS ${qos}: ${count} (${pct.toFixed(1)}%)`}
                >
                  Q{qos}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Topics */}
        {stats.topTopics.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase mb-1.5">
              Top Topics
            </h3>
            <div className="space-y-1">
              {stats.topTopics.map((t) => {
                const pct =
                  stats.totalMessages > 0
                    ? (t.messageCount / stats.totalMessages) * 100
                    : 0;
                return (
                  <div key={t.topic} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono truncate text-[var(--primary)] max-w-[180px]">
                        {t.topic}
                      </span>
                      <span className="text-[var(--muted-foreground)] tabular-nums shrink-0 ml-2">
                        {t.messageCount}
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--accent)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary)] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.totalMessages === 0 && (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
            No messages yet. Connect to a broker to see statistics.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md border border-[var(--border)] bg-[var(--accent)]/30">
      <div className="text-[10px] text-[var(--muted-foreground)]">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
