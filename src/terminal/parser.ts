import type { TerminalCommand } from '../shared/types.js';

export function parseCommand(input: string): TerminalCommand {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { name: 'UNKNOWN', args: [] };
  return { name: tokens[0].toUpperCase(), args: tokens.slice(1) };
}
