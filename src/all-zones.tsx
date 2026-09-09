import { showToast, Toast } from '@vicinae/api';
import { useCallback, useEffect, useState } from 'react';
import ZoneList from './components/zone-list';
import type { ZoneInfo } from './types';
import { getAllZones } from './utils/firewalld';

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setZones(await getAllZones());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to read firewalld state',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ZoneList
      zones={zones}
      loading={loading}
      error={error}
      refresh={refresh}
      navigationTitle="All Firewalld Zones"
      emptyTitle="No zones configured"
    />
  );
}
