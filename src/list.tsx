import { showToast, Toast } from '@vicinae/api';
import { useCallback, useEffect, useState } from 'react';
import ZoneList from './components/zone-list';
import type { ZoneInfo } from './types';
import { getActiveZones, getPanicMode } from './utils/firewalld';

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [panicMode, setPanicModeState] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, panic] = await Promise.all([
        getActiveZones(),
        getPanicMode(),
      ]);
      setZones(active);
      setPanicModeState(panic);
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
      navigationTitle="Firewalld Zones"
      emptyTitle="No active zones"
      panicMode={panicMode}
    />
  );
}
