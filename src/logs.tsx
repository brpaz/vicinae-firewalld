import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from '@vicinae/api';
import { useCallback, useEffect, useState } from 'react';
import { getLogDenied, type LogDenied, setLogDenied } from './utils/firewalld';
import { getFirewallTrafficLog, type TrafficLogEntry } from './utils/journal';

const POLL_INTERVAL_MS = 5000;

function entryTitle(entry: TrafficLogEntry): string {
  const src = entry.src
    ? `${entry.src}${entry.spt ? `:${entry.spt}` : ''}`
    : 'unknown';
  const dst = entry.dst
    ? `${entry.dst}${entry.dpt ? `:${entry.dpt}` : ''}`
    : 'unknown';
  return `${src} → ${dst}`;
}

function actionColor(prefix: string): Color {
  if (/reject/i.test(prefix)) return Color.Orange;
  return Color.Red;
}

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [logDenied, setLogDeniedState] = useState<LogDenied | null>(null);
  const [entries, setEntries] = useState<TrafficLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const denied = await getLogDenied();
      setLogDeniedState(denied);
      setEntries(denied === 'off' ? [] : await getFirewallTrafficLog());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const enableLogging = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: 'Enable firewalld traffic logging?',
      message:
        'Logs every packet firewalld drops or rejects to the kernel log. Noisy under scans or heavy blocked traffic; disable again from this view any time.',
      primaryAction: { title: 'Enable' },
    });
    if (!confirmed) return;
    try {
      await setLogDenied('all');
      showToast({
        style: Toast.Style.Success,
        title: 'Traffic logging enabled',
      });
      await refresh();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to enable logging',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [refresh]);

  const disableLogging = useCallback(async () => {
    try {
      await setLogDenied('off');
      showToast({
        style: Toast.Style.Success,
        title: 'Traffic logging disabled',
      });
      await refresh();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to disable logging',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [refresh]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read firewall traffic log"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!loading && logDenied === 'off') {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Text}
          title="Traffic logging is off"
          description='firewalld only logs dropped or rejected packets when "log denied" is enabled.'
          actions={
            <ActionPanel>
              <Action
                title="Enable Logging"
                icon={Icon.Checkmark}
                onAction={enableLogging}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle="Firewall Traffic Log"
    >
      {entries.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No denied traffic recently"
        />
      )}
      {entries.map((entry, index) => (
        <List.Item
          key={`${entry.timestamp}-${index}`}
          title={entryTitle(entry)}
          subtitle={entry.proto}
          icon={{
            source: Icon.CircleFilled,
            tintColor: actionColor(entry.prefix),
          }}
          accessories={[
            { text: entry.prefix || 'DENY' },
            { text: entry.inInterface ?? '' },
            { text: new Date(entry.timestamp) },
          ]}
          detail={
            <List.Item.Detail markdown={`\`\`\`\n${entry.raw}\n\`\`\``} />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Log Line"
                content={entry.raw}
              />
              {entry.src && (
                <Action.CopyToClipboard
                  title="Copy Source IP"
                  content={entry.src}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={refresh}
              />
              <Action
                title="Disable Logging"
                icon={Icon.XMarkCircle}
                onAction={disableLogging}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
