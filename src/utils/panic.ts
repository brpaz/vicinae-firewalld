import { Alert, confirmAlert, showToast, Toast } from '@vicinae/api';
import { getPanicMode, setPanicMode } from './firewalld';

/**
 * Toggles firewalld panic mode, confirming before turning it on since it
 * blocks all traffic immediately. Returns the new state, or null if the
 * user cancelled or the toggle failed.
 */
export async function togglePanicMode(): Promise<boolean | null> {
  try {
    const isOn = await getPanicMode();

    if (!isOn) {
      const confirmed = await confirmAlert({
        title: 'Enable panic mode?',
        message:
          'Blocks ALL network traffic immediately, including your own connections. Toggle again to turn it back off.',
        primaryAction: {
          title: 'Enable Panic Mode',
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return null;
    }

    await setPanicMode(!isOn);
    await showToast({
      style: Toast.Style.Success,
      title: isOn
        ? 'Panic mode disabled'
        : 'Panic mode enabled — all traffic blocked',
    });
    return !isOn;
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to toggle panic mode',
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
