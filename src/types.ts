/**
 * Types used in the extension.
 */

export interface ZoneInfo {
  name: string;
  isDefault: boolean;
  isActive: boolean;
  target?: string;
  icmpBlockInversion: boolean;
  interfaces: string[];
  sources: string[];
  services: string[];
  ports: string[];
  protocols: string[];
  forward: boolean;
  masquerade: boolean;
  forwardPorts: string[];
  sourcePorts: string[];
  icmpBlocks: string[];
  richRules: string[];
}
