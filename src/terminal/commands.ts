import type { ArchiveIndexEntry, ResearcherProfile, TerminalCommand } from '../shared/types.js';
import { searchArchive } from '../archive/search.js';

export type TerminalAction =
  | { type: 'open-record'; id: string }
  | { type: 'show-view'; view: string }
  | { type: 'related-records'; id: string }
  | { type: 'logout' };

export interface TerminalResult {
  output: string[];
  action?: TerminalAction;
}

function findRecord(archive: ArchiveIndexEntry[], text: string): ArchiveIndexEntry | undefined {
  const needle = text.toLowerCase();
  return archive.find((entry) => entry.slug.toLowerCase() === needle || entry.id.toLowerCase() === needle || entry.title.toLowerCase() === needle);
}

export function executeCommand(command: TerminalCommand, profile: ResearcherProfile, archive: ArchiveIndexEntry[]): TerminalResult {
  const argText = command.args.join(' ').trim();
  switch (command.name) {
    case 'HELP': return { output: ['AVAILABLE: HELP, OPEN <record>, FIND <query>, SOURCE <record>, RELATED <record>, LIST ASSIGNMENTS|MAIL, PROFILE, CLEARANCE, HISTORY, NOTES, BOOKMARKS, LOGOUT'] };
    case 'OPEN': {
      if (!argText) return { output: ['OPEN requires a record identifier.'] };
      const match = findRecord(archive, argText);
      return match ? { output: [`OPENING ${match.title}...`], action: { type: 'open-record', id: match.id } } : { output: [`RECORD NOT FOUND: ${argText}`] };
    }
    case 'SOURCE': {
      if (!argText) return { output: ['SOURCE requires a record identifier.'] };
      const match = findRecord(archive, argText);
      return match ? { output: [`SOURCE: https://scp-wiki.wikidot.com/${match.slug}`] } : { output: [`RECORD NOT FOUND: ${argText}`] };
    }
    case 'RELATED': {
      if (!argText) return { output: ['RELATED requires a record identifier.'] };
      const match = findRecord(archive, argText);
      return match ? { output: [`LOADING RELATIONSHIPS FOR ${match.title}...`], action: { type: 'related-records', id: match.id } } : { output: [`RECORD NOT FOUND: ${argText}`] };
    }
    case 'FIND': {
      const matches = searchArchive(archive, argText).slice(0, 8);
      return { output: matches.length ? matches.map((entry) => `${entry.title.padEnd(12)}  L${entry.clearance}  ${entry.summary.slice(0, 60)}`) : ['NO MATCHING RECORDS.'] };
    }
    case 'LIST': {
      const subject = (command.args[0] ?? '').toUpperCase();
      if (subject === 'ASSIGNMENTS') return { output: Object.keys(profile.assignments).length ? Object.keys(profile.assignments) : ['NO ASSIGNMENTS REGISTERED.'], action: { type: 'show-view', view: 'assignments' } };
      if (subject === 'MAIL') return { output: [`${profile.messages.filter((m) => !m.read).length} UNREAD MESSAGE(S).`], action: { type: 'show-view', view: 'mail' } };
      return { output: ['LIST supports ASSIGNMENTS or MAIL.'] };
    }
    case 'PROFILE': return { output: [`${profile.researcher.personnelId}  ${profile.researcher.displayName}`, `${profile.researcher.rank} / CLEARANCE ${profile.researcher.clearance}`], action: { type: 'show-view', view: 'profile' } };
    case 'CLEARANCE': return { output: [`CURRENT SECURITY CLEARANCE: LEVEL ${profile.researcher.clearance}`] };
    case 'HISTORY': return { output: profile.history.length ? profile.history.slice(-8).map((entry) => `${entry.at.slice(0, 19)} ${entry.detail}`) : ['NO ACCESS HISTORY.'] };
    case 'NOTES': return { output: [`${Object.values(profile.notes).flat().length} RESEARCH NOTE(S).`], action: { type: 'show-view', view: 'notes' } };
    case 'BOOKMARKS': return { output: profile.bookmarks.length ? profile.bookmarks : ['NO BOOKMARKS.'], action: profile.bookmarks.length ? { type: 'show-view', view: 'bookmarks' } : undefined };
    case 'LOGOUT': return { output: ['CREDENTIAL REMOVED.'], action: { type: 'logout' } };
    default: return { output: [`UNKNOWN COMMAND: ${command.name}. TYPE HELP.`] };
  }
}
