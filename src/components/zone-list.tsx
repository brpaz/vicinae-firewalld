import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from '@vicinae/api';
import { useCallback } from 'react';
import type { ZoneInfo } from '../types';
import { setDefaultZone } from '../utils/firewalld';
import { togglePanicMode } from '../utils/panic';
import AddRuleForm from './add-rule-form';
import InterfacePicker from './interface-picker';
import ZoneDetail from './zone-detail';

interface ZoneListProps {
  zones: ZoneInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  navigationTitle: string;
  emptyTitle: string;
  panicMode?: boolean | null;
}

function bulletList(items: string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join('\n')
    : '_none_';
}

function zoneMarkdown(zone: ZoneInfo): string {
  return `
# ${zone.name}${zone.isDefault ? ' (default)' : ''}${zone.isActive ? '' : ' (inactive)'}

**Target:** ${zone.target ?? 'default'} · **Masquerade:** ${zone.masquerade ? 'yes' : 'no'} · **Forward:** ${zone.forward ? 'yes' : 'no'}

## Interfaces
${bulletList(zone.interfaces)}

## Sources
${bulletList(zone.sources)}

## Services
${bulletList(zone.services)}

## Ports
${bulletList(zone.ports)}

## Protocols
${bulletList(zone.protocols)}

## Forward Ports
${bulletList(zone.forwardPorts)}

## Rich Rules
${zone.richRules.length > 0 ? `\`\`\`\n${zone.richRules.join('\n')}\n\`\`\`` : '_none_'}
`;
}

export default function ZoneList({
  zones,
  loading,
  error,
  refresh,
  navigationTitle,
  emptyTitle,
  panicMode,
}: ZoneListProps) {
  const { push } = useNavigation();

  const handleTogglePanic = useCallback(async () => {
    const newState = await togglePanicMode();
    if (newState !== null) await refresh();
  }, [refresh]);

  const makeDefault = useCallback(
    async (zone: ZoneInfo) => {
      const confirmed = await confirmAlert({
        title: `Set "${zone.name}" as the default zone?`,
        message:
          'New connections without an explicit zone binding will use this zone. Interfaces already bound to a specific zone are unaffected.',
        primaryAction: { title: 'Set as Default' },
      });
      if (!confirmed) return;

      try {
        await setDefaultZone(zone.name);
        showToast({
          style: Toast.Style.Success,
          title: 'Default zone updated',
          message: zone.name,
        });
        await refresh();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to set default zone',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [refresh]
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read firewalld"
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

  return (
    <List isLoading={loading} isShowingDetail navigationTitle={navigationTitle}>
      {panicMode !== undefined && panicMode !== null && (
        <List.Section title="System">
          <List.Item
            title="Panic Mode"
            subtitle={
              panicMode
                ? 'All traffic is currently blocked'
                : 'All traffic flows normally'
            }
            icon={panicMode ? Icon.Warning : Icon.Shield01}
            accessories={[
              {
                tag: {
                  value: panicMode ? 'ON' : 'OFF',
                  color: panicMode ? Color.Red : Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={panicMode ? 'Disable Panic Mode' : 'Enable Panic Mode'}
                  icon={Icon.Warning}
                  onAction={handleTogglePanic}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {zones.length === 0 && !loading && (
        <List.EmptyView icon={Icon.Shield01} title={emptyTitle} />
      )}
      {zones.map((zone) => (
        <List.Item
          key={zone.name}
          title={zone.name}
          subtitle={zone.interfaces.join(', ')}
          icon={Icon.Shield01}
          accessories={[
            ...(zone.isDefault
              ? [{ tag: { value: 'default', color: Color.Green } }]
              : []),
            ...(zone.isActive
              ? [{ tag: { value: 'active', color: Color.Blue } }]
              : []),
            { text: `${zone.services.length} svc` },
            { text: `${zone.ports.length} ports` },
            { text: `${zone.richRules.length} rules` },
          ]}
          detail={<List.Item.Detail markdown={zoneMarkdown(zone)} />}
          actions={
            <ActionPanel>
              <Action
                title="View Rules & Ports"
                icon={Icon.BulletPoints}
                onAction={() =>
                  push(<ZoneDetail zoneName={zone.name} onChanged={refresh} />)
                }
              />
              <Action
                title="Add Port"
                icon={Icon.Plus}
                shortcut={{ modifiers: ['cmd'], key: 'n' }}
                onAction={() =>
                  push(<AddRuleForm zoneName={zone.name} onAdded={refresh} />)
                }
              />
              <Action
                title="Move Interface Here"
                icon={Icon.Network}
                shortcut={{ modifiers: ['cmd'], key: 'i' }}
                onAction={() =>
                  push(
                    <InterfacePicker
                      targetZone={zone.name}
                      onChanged={refresh}
                    />
                  )
                }
              />
              {!zone.isDefault && (
                <Action
                  title="Set as Default Zone"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ['cmd'], key: 'd' }}
                  onAction={() => makeDefault(zone)}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Zone Name"
                content={zone.name}
              />
              <Action.CopyToClipboard
                title="Copy Zone Details"
                content={zoneMarkdown(zone)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
