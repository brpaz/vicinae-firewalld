import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TrafficLogEntry {
  timestamp: string;
  prefix: string;
  raw: string;
  proto?: string;
  inInterface?: string;
  outInterface?: string;
  src?: string;
  spt?: string;
  dst?: string;
  dpt?: string;
}

// firewalld's nftables backend tags dropped/rejected packets with a "PREFIX: " log
// line, always followed by netfilter's own IN=/OUT=/SRC=/DST= packet dump.
const NETFILTER_LINE = /\bIN=\S*.*\bSRC=\S+/;
const LOG_LINE = /^(\S+)\s+\S+\s+kernel:\s*(.*)$/;

function field(message: string, key: string): string | undefined {
  return message.match(new RegExp(`(?:^|\\s)${key}=(\\S*)`))?.[1] || undefined;
}

function parseNetfilterMessage(message: string): TrafficLogEntry {
  const prefixMatch = message.match(/^(.*?):\s*IN=/);
  return {
    timestamp: '',
    raw: message,
    prefix: prefixMatch?.[1]?.trim() ?? '',
    proto: field(message, 'PROTO'),
    inInterface: field(message, 'IN'),
    outInterface: field(message, 'OUT'),
    src: field(message, 'SRC'),
    spt: field(message, 'SPT'),
    dst: field(message, 'DST'),
    dpt: field(message, 'DPT'),
  };
}

export async function getFirewallTrafficLog(
  limit = 200
): Promise<TrafficLogEntry[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      'journalctl',
      ['-k', '-n', String(limit), '--no-pager', '-o', 'short-iso'],
      { maxBuffer: 10 * 1024 * 1024 }
    ));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error('journalctl not found.');
    }
    throw new Error(
      `Reading the kernel log failed (${err.message}). Your user may need to belong to the "systemd-journal" group.`
    );
  }

  const entries: TrafficLogEntry[] = [];
  for (const line of stdout.split('\n')) {
    if (!NETFILTER_LINE.test(line)) continue;
    const match = line.match(LOG_LINE);
    if (!match) continue;
    const [, timestamp, message] = match;
    entries.push({ ...parseNetfilterMessage(message), timestamp });
  }
  return entries.reverse();
}
