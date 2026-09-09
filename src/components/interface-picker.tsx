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
import { useEffect, useState } from 'react';
import { changeInterfaceZone, getActiveZones } from '../utils/firewalld';

interface InterfacePickerProps {
  targetZone: string;
  onChanged: () => void;
}

export default function InterfacePicker({
  targetZone,
  onChanged,
}: InterfacePickerProps) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<
    { name: string; currentZone: string }[]
  >([]);

  useEffect(() => {
    getActiveZones()
      .then((zones) => {
        setCandidates(
          zones
            .flatMap((zone) =>
              zone.interfaces.map((name) => ({ name, currentZone: zone.name }))
            )
            .filter((entry) => entry.currentZone !== targetZone)
        );
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to list interfaces',
          message: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => setLoading(false));
  }, [targetZone]);

  const moveInterface = async (iface: string, currentZone: string) => {
    const confirmed = await confirmAlert({
      title: `Move ${iface} to "${targetZone}"?`,
      message: `${iface} is currently in "${currentZone}". This changes which firewall rules apply to its live traffic immediately.`,
      primaryAction: { title: 'Move' },
    });
    if (!confirmed) return;

    try {
      await changeInterfaceZone(targetZone, iface);
      showToast({
        style: Toast.Style.Success,
        title: `${iface} moved to ${targetZone}`,
      });
      onChanged();
      pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to change interface zone',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <List
      isLoading={loading}
      navigationTitle={`Move Interface to ${targetZone}`}
    >
      {candidates.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing to move"
          description="Every known interface is already in this zone."
        />
      )}
      {candidates.map(({ name, currentZone }) => (
        <List.Item
          key={name}
          title={name}
          subtitle={`currently: ${currentZone}`}
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action
                title={`Move to ${targetZone}`}
                icon={Icon.ArrowRight}
                onAction={() => moveInterface(name, currentZone)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
