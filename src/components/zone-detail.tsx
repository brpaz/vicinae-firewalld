import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from '@vicinae/api';
import { useCallback, useEffect, useState } from 'react';
import type { ZoneInfo } from '../types';
import { getZoneInfo, removePort, removeService } from '../utils/firewalld';
import AddRuleForm from './add-rule-form';

interface ZoneDetailProps {
  zoneName: string;
  onChanged?: () => void;
}

function CopyableItem({
  title,
  icon,
  onRemove,
}: {
  title: string;
  icon: Icon;
  onRemove?: () => void;
}) {
  return (
    <List.Item
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy" content={title} />
          {onRemove && (
            <Action
              title="Remove"
              icon={Icon.Trash}
              style="destructive"
              onAction={onRemove}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function ZoneDetail({ zoneName, onChanged }: ZoneDetailProps) {
  const { push } = useNavigation();
  const [zone, setZone] = useState<ZoneInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setZone(await getZoneInfo(zoneName));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [zoneName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removePortEntry = useCallback(
    async (port: string) => {
      const confirmed = await confirmAlert({
        title: `Remove port ${port}?`,
        message: `Blocks new connections to ${port} on "${zoneName}" immediately.`,
        primaryAction: { title: 'Remove' },
      });
      if (!confirmed) return;
      try {
        await removePort(zoneName, port);
        showToast({ style: Toast.Style.Success, title: `Removed ${port}` });
        await refresh();
        onChanged?.();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to remove port',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [zoneName, refresh, onChanged]
  );

  const removeServiceEntry = useCallback(
    async (service: string) => {
      const confirmed = await confirmAlert({
        title: `Remove service "${service}"?`,
        message: `Blocks new connections matching ${service} on "${zoneName}" immediately.`,
        primaryAction: { title: 'Remove' },
      });
      if (!confirmed) return;
      try {
        await removeService(zoneName, service);
        showToast({ style: Toast.Style.Success, title: `Removed ${service}` });
        await refresh();
        onChanged?.();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to remove service',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [zoneName, refresh, onChanged]
  );

  const addActions = (
    <>
      <Action
        title="Add Port"
        icon={Icon.Plus}
        shortcut={{ modifiers: ['cmd'], key: 'n' }}
        onAction={() =>
          push(
            <AddRuleForm
              zoneName={zoneName}
              onAdded={() => {
                refresh();
                onChanged?.();
              }}
            />
          )
        }
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ['cmd'], key: 'r' }}
        onAction={refresh}
      />
    </>
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read zone"
          description={error}
          actions={<ActionPanel>{addActions}</ActionPanel>}
        />
      </List>
    );
  }

  const hasNothing =
    !!zone &&
    zone.services.length === 0 &&
    zone.ports.length === 0 &&
    zone.protocols.length === 0 &&
    zone.forwardPorts.length === 0 &&
    zone.richRules.length === 0;

  return (
    <List isLoading={loading} navigationTitle={`${zoneName} — Rules`}>
      {hasNothing && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No open ports or rules"
          description={`Zone "${zoneName}" allows nothing beyond its target policy.`}
          actions={<ActionPanel>{addActions}</ActionPanel>}
        />
      )}
      {zone && zone.services.length > 0 && (
        <List.Section title="Services" subtitle={String(zone.services.length)}>
          {zone.services.map((service) => (
            <List.Item
              key={service}
              title={service}
              icon={Icon.Bolt}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy" content={service} />
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    style="destructive"
                    onAction={() => removeServiceEntry(service)}
                  />
                  {addActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {zone && zone.ports.length > 0 && (
        <List.Section title="Ports" subtitle={String(zone.ports.length)}>
          {zone.ports.map((port) => (
            <List.Item
              key={port}
              title={port}
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy" content={port} />
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    style="destructive"
                    onAction={() => removePortEntry(port)}
                  />
                  {addActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {zone && zone.protocols.length > 0 && (
        <List.Section
          title="Protocols"
          subtitle={String(zone.protocols.length)}
        >
          {zone.protocols.map((protocol) => (
            <CopyableItem key={protocol} title={protocol} icon={Icon.Network} />
          ))}
        </List.Section>
      )}
      {zone && zone.forwardPorts.length > 0 && (
        <List.Section
          title="Forward Ports"
          subtitle={String(zone.forwardPorts.length)}
        >
          {zone.forwardPorts.map((entry) => (
            <CopyableItem key={entry} title={entry} icon={Icon.ArrowRight} />
          ))}
        </List.Section>
      )}
      {zone && zone.richRules.length > 0 && (
        <List.Section
          title="Rich Rules"
          subtitle={String(zone.richRules.length)}
        >
          {zone.richRules.map((rule) => (
            <CopyableItem key={rule} title={rule} icon={Icon.Text} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
