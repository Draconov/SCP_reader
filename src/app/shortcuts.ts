export type GlobalShortcut = 'archive-search' | 'assignments' | 'mail' | 'notes' | 'terminal' | 'settings' | 'back';

export interface ShortcutInput {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  editable: boolean;
}

export function resolveShortcut(input: ShortcutInput): GlobalShortcut | null {
  if (input.editable) return null;
  const modifier = input.ctrlKey || input.metaKey;
  const key = input.key.toLowerCase();
  if (input.altKey && key === 'arrowleft') return 'back';
  if (!modifier) return null;
  if (key === 'k' && !input.shiftKey) return 'archive-search';
  if (key === 'p' && input.shiftKey) return 'terminal';
  if (key === 'a' && !input.shiftKey) return 'assignments';
  if (key === 'm' && !input.shiftKey) return 'mail';
  if (key === 'n' && !input.shiftKey) return 'notes';
  if (key === ',' && !input.shiftKey) return 'settings';
  return null;
}
