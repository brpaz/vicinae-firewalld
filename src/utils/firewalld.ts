import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ZoneInfo } from '../types';

const execFileAsync = promisify(execFile);

async function runFirewallCmd(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('firewall-cmd', args);
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error('firewall-cmd not found. Is firewalld installed?');
    }
    throw new Error(`firewall-cmd ${args.join(' ')} failed: ${err.message}`);
  }
}

export async function assertFirewalldRunning(): Promise<void> {
  const state = (await runFirewallCmd(['--state'])).trim();
  if (state !== 'running') {
    throw new Error(`firewalld is not running (state: ${state})`);
  }
}

function parseZoneInfo(raw: string): ZoneInfo {
  const lines = raw.split('\n');
  const headerMatch = lines[0]?.match(/^(\S+)\s*(?:\((.*)\))?\s*$/);
  const name = headerMatch?.[1] ?? lines[0]?.trim() ?? '';
  const flags = headerMatch?.[2] ?? '';
  const isDefault = flags.includes('default');
  const isActive = flags.includes('active');

  const fields: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const kvMatch = line.match(/^ {2}([a-zA-Z][\w-]*(?: [\w-]+)?):\s?(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      fields[currentKey] = value ? [value] : [];
    } else if (currentKey) {
      fields[currentKey].push(line.trim());
    }
  }

  const words = (key: string) =>
    (fields[key] ?? []).flatMap((v) => v.split(/\s+/)).filter(Boolean);

  const entries = (key: string) => (fields[key] ?? []).filter(Boolean);

  return {
    name,
    isDefault,
    isActive,
    target: fields.target?.[0],
    icmpBlockInversion: fields['icmp-block-inversion']?.[0] === 'yes',
    interfaces: words('interfaces'),
    sources: words('sources'),
    services: words('services'),
    ports: words('ports'),
    protocols: words('protocols'),
    forward: fields.forward?.[0] === 'yes',
    masquerade: fields.masquerade?.[0] === 'yes',
    forwardPorts: entries('forward-ports'),
    sourcePorts: words('source-ports'),
    icmpBlocks: words('icmp-blocks'),
    richRules: entries('rich rules'),
  };
}

async function listActiveZoneNames(): Promise<string[]> {
  const raw = await runFirewallCmd(['--get-active-zones']);
  return raw
    .split('\n')
    .filter((line) => /^\S/.test(line))
    .map((line) => line.match(/^(\S+)/)?.[1])
    .filter((name): name is string => Boolean(name));
}

async function listAllZoneNames(): Promise<string[]> {
  const raw = await runFirewallCmd(['--get-zones']);
  return raw.trim().split(/\s+/).filter(Boolean);
}

export async function getZoneInfo(zone: string): Promise<ZoneInfo> {
  const raw = await runFirewallCmd(['--zone', zone, '--list-all']);
  return parseZoneInfo(raw);
}

export async function getActiveZones(): Promise<ZoneInfo[]> {
  await assertFirewalldRunning();
  const names = await listActiveZoneNames();
  return Promise.all(names.map(getZoneInfo));
}

export async function getAllZones(): Promise<ZoneInfo[]> {
  await assertFirewalldRunning();
  const names = await listAllZoneNames();
  return Promise.all(names.map(getZoneInfo));
}

export async function setDefaultZone(zone: string): Promise<void> {
  await runFirewallCmd(['--set-default-zone', zone]);
}

export async function changeInterfaceZone(
  zone: string,
  iface: string
): Promise<void> {
  await runFirewallCmd(['--zone', zone, '--change-interface', iface]);
}

export type LogDenied = 'off' | 'all' | 'unicast' | 'broadcast' | 'multicast';

export async function getLogDenied(): Promise<LogDenied> {
  return (await runFirewallCmd(['--get-log-denied'])).trim() as LogDenied;
}

export async function setLogDenied(value: LogDenied): Promise<void> {
  await runFirewallCmd(['--set-log-denied', value]);
}

export async function getAllServices(): Promise<string[]> {
  const raw = await runFirewallCmd(['--get-services']);
  return raw.trim().split(/\s+/).filter(Boolean).sort();
}

// firewalld keeps runtime and permanent (survives reload/reboot) configuration
// separate. Applying both, in this order, makes a rule take effect immediately
// while also persisting it, without needing a disruptive full --reload.
async function addRuntimeAndOptionallyPermanent(
  args: string[],
  permanent: boolean
): Promise<void> {
  await runFirewallCmd(args);
  if (permanent) {
    await runFirewallCmd(['--permanent', ...args]);
  }
}

// A rule may only exist at runtime, only permanently, or both — we don't know
// which when the user asks to remove it, so runtime removal must succeed
// (it's visibly there) while a permanent removal failure just means it was
// never persisted and there's nothing to clean up on that side.
async function removeRuntimeAndPermanent(args: string[]): Promise<void> {
  await runFirewallCmd(args);
  try {
    await runFirewallCmd(['--permanent', ...args]);
  } catch {
    // not persisted permanently, nothing to remove there
  }
}

export async function addPort(
  zone: string,
  port: string,
  permanent: boolean
): Promise<void> {
  await addRuntimeAndOptionallyPermanent(
    ['--zone', zone, '--add-port', port],
    permanent
  );
}

export async function removePort(zone: string, port: string): Promise<void> {
  await removeRuntimeAndPermanent(['--zone', zone, '--remove-port', port]);
}

export async function addService(
  zone: string,
  service: string,
  permanent: boolean
): Promise<void> {
  await addRuntimeAndOptionallyPermanent(
    ['--zone', zone, '--add-service', service],
    permanent
  );
}

export async function removeService(
  zone: string,
  service: string
): Promise<void> {
  await removeRuntimeAndPermanent([
    '--zone',
    zone,
    '--remove-service',
    service,
  ]);
}

export async function getPanicMode(): Promise<boolean> {
  try {
    await execFileAsync('firewall-cmd', ['--query-panic']);
    return true;
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 1) return false;
    throw new Error(`firewall-cmd --query-panic failed: ${err.message}`);
  }
}

export async function setPanicMode(enabled: boolean): Promise<void> {
  await runFirewallCmd([enabled ? '--panic-on' : '--panic-off']);
}
