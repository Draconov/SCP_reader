import { loadArchiveDocument, loadArchiveIndex } from '../archive/api.js';
import { searchArchive } from '../archive/search.js';
import { ORIENTATION_ASSIGNMENT } from '../assignments/catalog.js';
import { completeObjective, createAssignmentState, isAssignmentComplete } from '../assignments/runtime.js';
import { downloadProfile, readProfileFile } from '../researcher/export.js';
import { addHistory, issueProfile } from '../researcher/profile.js';
import { createProfileStore, type ProfileStore } from '../researcher/store.js';
import { applySettingsToDocument, normalizeSettings } from '../settings/settings.js';
import { executeCommand } from '../terminal/commands.js';
import { parseCommand } from '../terminal/parser.js';
import type { ArchiveDocument, ArchiveIndexEntry, AssignmentState, ResearchNote, ResearcherProfile } from '../shared/types.js';
import { button, clear, el, formatTime } from './dom.js';

export type ViewName = 'archive' | 'assignments' | 'mail' | 'notes' | 'terminal' | 'profile' | 'settings';

export class App {
  private root: HTMLElement;
  private store: ProfileStore;
  private profile: ResearcherProfile | null = null;
  private archive: ArchiveIndexEntry[] = [];
  private currentDocument: ArchiveDocument | null = null;
  private currentView: ViewName = 'archive';
  private searchQuery = '';
  private terminalLines: string[] = ['FOUNDATION COMMAND INTERFACE READY. TYPE HELP.'];
  private status = 'ARCHIVE NODE: INITIALIZING';

  constructor(root: HTMLElement, store = createProfileStore()) {
    this.root = root;
    this.store = store;
  }

  async start(): Promise<void> {
    this.archive = await loadArchiveIndex();
    this.status = `ARCHIVE NODE: ONLINE / ${this.archive.length} INDEXED RECORDS`;
    this.renderGate(await this.store.list());
  }

  private async persist(): Promise<void> {
    if (!this.profile) return;
    this.profile.researcher.lastActiveAt = new Date().toISOString();
    await this.store.save(this.profile);
  }

  private applyProfileAppearance(): void {
    if (this.profile) applySettingsToDocument(this.profile.settings);
  }

  private ensureOrientation(profile: ResearcherProfile): ResearcherProfile {
    if (profile.assignments[ORIENTATION_ASSIGNMENT.id]) return profile;
    return {
      ...profile,
      assignments: { ...profile.assignments, [ORIENTATION_ASSIGNMENT.id]: createAssignmentState(ORIENTATION_ASSIGNMENT) }
    };
  }

  private completeOrientationObjective(objectiveId: string): void {
    if (!this.profile) return;
    const state = this.profile.assignments[ORIENTATION_ASSIGNMENT.id] ?? createAssignmentState(ORIENTATION_ASSIGNMENT);
    let next = completeObjective(state, objectiveId);
    if (isAssignmentComplete(ORIENTATION_ASSIGNMENT, next) && !next.completedAt) {
      next = { ...next, completedAt: new Date().toISOString() };
      this.profile.progression.researchScore += 10;
      this.profile.progression.promotionReadiness = Math.max(this.profile.progression.promotionReadiness, 0.1);
      this.profile.messages.push({
        id: `mail-orientation-${Date.now()}`,
        from: 'RESEARCH ADMINISTRATION',
        subject: 'Orientation completed',
        body: 'Orientation R-0001 is complete. Your personnel file has been updated. Additional research cases will be introduced in later archive releases.',
        receivedAt: new Date().toISOString(),
        read: false,
        simulation: true
      });
    }
    this.profile.assignments[ORIENTATION_ASSIGNMENT.id] = next;
    void this.persist();
  }

  private renderGate(profiles: ResearcherProfile[], message = ''): void {
    clear(this.root);
    document.documentElement.removeAttribute('data-interface-mode');
    const gate = el('main', 'id-gate');
    const terminal = el('section', 'credential-terminal panel');
    terminal.append(el('div', 'foundation-mark', 'SCP'), el('h1', '', 'SCP FOUNDATION'), el('p', 'eyebrow', 'SECURE RESEARCH NETWORK / PERSONNEL TERMINAL'));
    terminal.append(el('div', 'terminal-rule'));
    terminal.append(el('h2', '', 'INSERT FOUNDATION ID'));
    terminal.append(el('p', 'muted', 'No personnel credential is currently inserted. Credentials remain on this device unless exported manually.'));
    if (message) terminal.append(el('div', 'system-message', message));

    const known = el('div', 'known-profiles');
    if (profiles.length) {
      known.append(el('h3', '', 'KNOWN PERSONNEL'));
      for (const profile of profiles.sort((a, b) => b.researcher.lastActiveAt.localeCompare(a.researcher.lastActiveAt))) {
        const row = button(`${profile.researcher.personnelId}  ${profile.researcher.displayName}  /  L${profile.researcher.clearance}`, 'profile-row');
        row.addEventListener('click', () => void this.insertProfile(profile));
        known.append(row);
      }
    } else {
      known.append(el('p', 'muted', 'NO LOCAL PERSONNEL RECORDS FOUND'));
    }
    terminal.append(known);

    const actions = el('div', 'gate-actions');
    const issue = button('ISSUE NEW PERSONNEL ID');
    const load = button('LOAD ID FILE', 'button secondary');
    actions.append(issue, load);
    terminal.append(actions);

    issue.addEventListener('click', () => this.renderIssueForm(profiles));
    load.addEventListener('click', () => this.chooseProfileFile(profiles));
    gate.append(terminal);
    this.root.append(gate);
  }

  private renderIssueForm(profiles: ResearcherProfile[]): void {
    const terminal = this.root.querySelector('.credential-terminal');
    if (!(terminal instanceof HTMLElement)) return;
    const existing = terminal.querySelector('.issue-form');
    existing?.remove();
    const form = el('form', 'issue-form panel inset');
    form.append(el('h3', '', 'ISSUE NEW PERSONNEL CREDENTIAL'));
    const label = el('label', 'field-label', 'RESEARCHER NAME / CODENAME');
    const input = el('input', 'text-input');
    input.name = 'researcher-name';
    input.autocomplete = 'off';
    input.maxLength = 48;
    label.append(input);
    form.append(label);
    const row = el('div', 'button-row');
    const submit = button('ISSUE CREDENTIAL');
    const cancel = button('CANCEL', 'button secondary');
    row.append(submit, cancel);
    form.append(row);
    submit.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        const profile = this.ensureOrientation(issueProfile(input.value));
        void this.store.save(profile).then(() => this.insertProfile(profile));
      } catch (error) {
        this.renderGate(profiles, error instanceof Error ? error.message : 'Unable to issue credential.');
      }
    });
    cancel.addEventListener('click', (event) => { event.preventDefault(); form.remove(); });
    terminal.append(form);
    input.focus();
  }

  private chooseProfileFile(profiles: ResearcherProfile[]): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.scp-id,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = this.ensureOrientation(await readProfileFile(file));
        const summary = `${imported.researcher.personnelId} / ${imported.researcher.displayName} / ${imported.researcher.rank} / L${imported.researcher.clearance}`;
        if (!window.confirm(`INSERT PERSONNEL CREDENTIAL?\n\n${summary}`)) return;
        await this.store.save(imported);
        await this.insertProfile(imported);
      } catch (error) {
        this.renderGate(profiles, error instanceof Error ? error.message : 'Credential import failed.');
      }
    });
    input.click();
  }

  private async insertProfile(profile: ResearcherProfile): Promise<void> {
    this.profile = this.ensureOrientation(profile);
    this.profile.settings = normalizeSettings(this.profile.settings);
    await this.store.setActiveId(this.profile.researcher.personnelId);
    await this.persist();
    this.applyProfileAppearance();
    this.currentView = 'archive';
    this.currentDocument = null;
    this.renderWorkstation();
  }

  private renderWorkstation(): void {
    if (!this.profile) return;
    clear(this.root);
    this.applyProfileAppearance();
    const shell = el('div', 'workstation-shell');
    const top = el('header', 'topbar');
    const titleWrap = el('div', 'topbar-title');
    titleWrap.append(el('span', 'desktop-title', 'FOUNDATION RESEARCH NETWORK'), el('span', 'mobile-title', 'FOUNDATION FIELD TERMINAL'));
    top.append(titleWrap);
    top.append(el('div', 'topbar-meta', `${this.profile.researcher.personnelId} · ${this.profile.researcher.rank} · L${this.profile.researcher.clearance}`));
    shell.append(top);

    const workspace = el('div', 'workspace');
    const sidebar = el('nav', 'sidebar');
    const navItems: Array<[ViewName, string]> = [['archive', 'ARCHIVE'], ['assignments', 'ASSIGNMENTS'], ['mail', 'MAIL'], ['notes', 'NOTES'], ['terminal', 'TERMINAL'], ['profile', 'PERSONNEL'], ['settings', 'SYSTEM']];
    for (const [view, label] of navItems) {
      const nav = button(label, `nav-button ${this.currentView === view ? 'active' : ''}`);
      nav.addEventListener('click', () => this.openView(view));
      sidebar.append(nav);
    }
    const logout = button('REMOVE ID', 'nav-button danger');
    logout.addEventListener('click', () => void this.logout());
    sidebar.append(el('div', 'sidebar-spacer'), logout);
    workspace.append(sidebar);

    const main = el('main', 'main-window panel');
    this.renderCurrentView(main);
    workspace.append(main);
    shell.append(workspace);

    const mobileNav = el('nav', 'mobile-nav');
    for (const [view, label] of navItems.slice(0, 5)) {
      const nav = button(label, `mobile-nav-button ${this.currentView === view ? 'active' : ''}`);
      nav.addEventListener('click', () => this.openView(view));
      mobileNav.append(nav);
    }
    shell.append(mobileNav);
    shell.append(el('footer', 'statusbar', `${this.status}  ·  ${new Date().toLocaleTimeString()}  ·  LOCAL PROFILE AUTOSAVE`));
    this.root.append(shell);
  }

  private openView(view: ViewName): void {
    this.currentView = view;
    if (view !== 'archive') this.currentDocument = null;
    if (view === 'terminal') this.completeOrientationObjective('open-terminal');
    if (view === 'mail') {
      this.completeOrientationObjective('open-mail');
      if (this.profile) this.profile.messages = this.profile.messages.map((message) => ({ ...message, read: true }));
      void this.persist();
    }
    this.renderWorkstation();
  }

  private renderCurrentView(container: HTMLElement): void {
    switch (this.currentView) {
      case 'assignments': this.renderAssignments(container); break;
      case 'mail': this.renderMail(container); break;
      case 'notes': this.renderNotes(container); break;
      case 'terminal': this.renderTerminal(container); break;
      case 'profile': this.renderProfile(container); break;
      case 'settings': this.renderSettings(container); break;
      default: this.renderArchive(container);
    }
  }

  private renderArchive(container: HTMLElement): void {
    if (this.currentDocument) { this.renderDocument(container, this.currentDocument); return; }
    container.append(this.windowHeader('ARCHIVE BROWSER', 'EN BRANCH / STATIC CACHE'));
    const search = el('input', 'archive-search');
    search.placeholder = 'SEARCH RECORDS — try 049, biological, tag:euclid, clearance:<=1';
    search.value = this.searchQuery;
    const results = el('div', 'archive-results');
    const drawResults = () => {
      this.searchQuery = search.value;
      clear(results);
      const matches = searchArchive(this.archive, this.searchQuery).slice(0, 100);
      for (const entry of matches) {
        const row = el('button', 'archive-row');
        row.type = 'button';
        row.innerHTML = `<span class="record-id">${this.escape(entry.title)}</span><span class="record-type">${entry.type.toUpperCase()}</span><span class="record-class">${this.escape(entry.objectClass ?? 'UNCLASSIFIED')}</span><span class="record-clearance">L${entry.clearance}</span><span class="record-summary">${this.escape(entry.summary)}</span>`;
        row.addEventListener('click', () => void this.openDocument(entry.id));
        results.append(row);
      }
      if (!matches.length) results.append(el('p', 'empty-state', 'NO MATCHING FOUNDATION RECORDS'));
    };
    search.addEventListener('input', drawResults);
    container.append(search, results);
    drawResults();
  }

  private async openDocument(id: string): Promise<void> {
    if (!this.profile) return;
    this.status = `ACCESSING ${id.toUpperCase()}...`;
    this.renderWorkstation();
    try {
      const doc = await loadArchiveDocument(id, this.archive);
      this.currentDocument = doc;
      this.profile = addHistory(this.profile, { type: 'open', documentId: id, detail: `OPENED ${doc.title}` });
      this.completeOrientationObjective('open-record');
      await this.persist();
      this.status = doc.synchronized ? `RECORD ${doc.title}: LOCAL ARCHIVE COPY AVAILABLE` : `RECORD ${doc.title}: INDEX ONLY / SYNC REQUIRED`;
    } catch (error) {
      this.status = error instanceof Error ? error.message : 'ARCHIVE ACCESS FAILED';
    }
    this.renderWorkstation();
  }

  private renderDocument(container: HTMLElement, doc: ArchiveDocument): void {
    if (!this.profile) return;
    const header = this.windowHeader(doc.title, `${doc.type.toUpperCase()} / CLEARANCE ${doc.clearance}`);
    const back = button('← ARCHIVE', 'button secondary compact');
    back.addEventListener('click', () => { this.currentDocument = null; this.renderWorkstation(); });
    header.prepend(back);
    container.append(header);

    if (this.profile.researcher.clearance < doc.clearance && !this.profile.temporaryAccess.includes(doc.id)) {
      const denied = el('section', 'access-denied');
      denied.append(el('div', 'stamp danger-stamp', 'ACCESS DENIED'), el('h2', '', `LEVEL ${doc.clearance} AUTHORIZATION REQUIRED`), el('p', '', `CURRENT CREDENTIAL: LEVEL ${this.profile.researcher.clearance}`), el('p', 'muted', 'This simulated clearance requirement is generated by SCP Research Terminal and is not canonical SCP Wiki metadata.'));
      container.append(denied);
      return;
    }

    const toolbar = el('div', 'document-toolbar');
    const bookmark = button(this.profile.bookmarks.includes(doc.id) ? 'BOOKMARKED' : 'BOOKMARK', 'button compact');
    bookmark.addEventListener('click', () => this.toggleBookmark(doc));
    const source = button('SOURCE / ATTRIBUTION', 'button secondary compact');
    source.addEventListener('click', () => this.showAttribution(doc));
    toolbar.append(bookmark, source, el('span', 'toolbar-spacer'), el('span', 'local-copy', doc.synchronized ? 'LOCAL ARCHIVE COPY' : 'INDEX ONLY'));
    container.append(toolbar);

    if (doc.renderer === 'specialized') {
      container.append(el('div', 'specialized-warning', 'SPECIALIZED ARCHIVE MODULE — unsafe scripts, embeds, and unverified media are omitted in this Phase-1 renderer.'));
    }
    const body = el('article', 'document-body canonical-content');
    body.innerHTML = doc.html;
    container.append(body);

    const related = doc.links.map((slug) => this.archive.find((entry) => entry.slug === slug)).filter((entry): entry is ArchiveIndexEntry => Boolean(entry)).slice(0, 12);
    if (related.length) {
      const relatedPanel = el('section', 'related-records panel inset');
      relatedPanel.append(el('h3', '', 'RELATED FOUNDATION RECORDS'));
      const relatedList = el('div', 'button-row');
      for (const entry of related) {
        const relatedButton = button(`${entry.title} / L${entry.clearance}`, 'button secondary compact');
        relatedButton.addEventListener('click', () => void this.openDocument(entry.id));
        relatedList.append(relatedButton);
      }
      relatedPanel.append(relatedList);
      container.append(relatedPanel);
    }

    const notes = el('section', 'notes-editor panel inset');
    notes.append(el('h3', '', 'PRIVATE RESEARCH NOTE'));
    const textarea = el('textarea', 'note-input');
    textarea.placeholder = 'Notes are stored only inside your local researcher profile.';
    notes.append(textarea);
    const save = button('ADD NOTE', 'button compact');
    save.addEventListener('click', () => this.addNote(doc.id, textarea.value));
    notes.append(save);
    container.append(notes);
  }

  private showAttribution(doc: ArchiveDocument): void {
    const overlay = el('div', 'modal-backdrop');
    const modal = el('section', 'modal panel');
    modal.append(el('h2', '', 'SOURCE / ATTRIBUTION'));
    const lines = [
      `Original record: ${doc.title}`,
      `Authors: ${doc.attribution.authors.join(', ')}`,
      doc.attribution.citation ? `Citation: ${doc.attribution.citation}` : '',
      `Source: ${doc.attribution.sourceUrl}`,
      `License: CC BY-SA 3.0`,
      doc.attribution.revision ? `Revision: ${doc.attribution.revision}` : '',
      `Synchronized: ${formatTime(doc.attribution.fetchedAt)}`
    ].filter(Boolean);
    for (const line of lines) modal.append(el('p', '', line));
    const link = el('a', 'button secondary', 'OPEN ORIGINAL SOURCE');
    link.href = doc.attribution.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const close = button('CLOSE');
    close.addEventListener('click', () => overlay.remove());
    const modalButtons = el('div', 'button-row');
    modalButtons.append(link, close);
    modal.append(modalButtons);
    overlay.append(modal);
    this.root.append(overlay);
  }

  private toggleBookmark(doc: ArchiveDocument): void {
    if (!this.profile) return;
    const exists = this.profile.bookmarks.includes(doc.id);
    this.profile.bookmarks = exists ? this.profile.bookmarks.filter((id) => id !== doc.id) : [...this.profile.bookmarks, doc.id];
    this.profile = addHistory(this.profile, { type: 'bookmark', documentId: doc.id, detail: `${exists ? 'REMOVED BOOKMARK' : 'BOOKMARKED'} ${doc.title}` });
    if (!exists) this.completeOrientationObjective('bookmark');
    void this.persist();
    this.renderWorkstation();
  }

  private addNote(documentId: string, text: string): void {
    if (!this.profile || !text.trim()) return;
    const timestamp = new Date().toISOString();
    const note: ResearchNote = { id: `note-${Date.now()}`, documentId, text: text.trim(), createdAt: timestamp, updatedAt: timestamp };
    this.profile.notes[documentId] = [...(this.profile.notes[documentId] ?? []), note];
    this.profile = addHistory(this.profile, { type: 'note', documentId, detail: `ADDED RESEARCH NOTE TO ${documentId.toUpperCase()}` });
    this.completeOrientationObjective('add-note');
    void this.persist();
    this.status = 'RESEARCH NOTE SAVED TO LOCAL PERSONNEL RECORD';
    this.renderWorkstation();
  }

  private renderAssignments(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('ASSIGNMENT CONTROL', 'RESEARCH ADMINISTRATION'));
    const state = this.profile.assignments[ORIENTATION_ASSIGNMENT.id] as AssignmentState;
    const card = el('section', 'assignment-card panel inset');
    card.append(el('div', 'eyebrow', state.completedAt ? 'CASE CLOSED' : 'ACTIVE ASSIGNMENT'), el('h2', '', ORIENTATION_ASSIGNMENT.title), el('p', '', ORIENTATION_ASSIGNMENT.briefing ?? ''));
    const list = el('div', 'objective-list');
    for (const objective of ORIENTATION_ASSIGNMENT.objectives) {
      const complete = state.completedObjectiveIds.includes(objective.id);
      list.append(el('div', `objective ${complete ? 'complete' : ''}`, `${complete ? '[✓]' : '[ ]'} ${objective.label}`));
    }
    card.append(list);
    if (state.completedAt) card.append(el('div', 'system-message', `COMPLETED ${formatTime(state.completedAt)}`));
    container.append(card);
  }

  private renderMail(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('FOUNDATION MAIL', `${this.profile.messages.length} MESSAGE(S)`));
    const list = el('div', 'mail-list');
    for (const message of [...this.profile.messages].reverse()) {
      const item = el('article', 'mail-message panel inset');
      item.append(el('div', 'mail-meta', `FROM: ${message.from}  /  ${formatTime(message.receivedAt)}`), el('h3', '', message.subject), el('p', '', message.body), el('div', 'simulation-label', 'SIMULATION-LAYER MESSAGE'));
      list.append(item);
    }
    container.append(list);
  }

  private renderNotes(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('RESEARCH NOTEBOOK', 'LOCAL PERSONNEL DATA'));
    const notes = Object.values(this.profile.notes).flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!notes.length) { container.append(el('p', 'empty-state', 'NO RESEARCH NOTES RECORDED')); return; }
    for (const note of notes) {
      const card = el('article', 'note-card panel inset');
      card.append(el('div', 'eyebrow', `${note.documentId.toUpperCase()} / ${formatTime(note.updatedAt)}`), el('p', '', note.text));
      const open = button('OPEN RECORD', 'button secondary compact');
      open.addEventListener('click', () => { this.currentView = 'archive'; void this.openDocument(note.documentId); });
      card.append(open);
      container.append(card);
    }
  }

  private renderTerminal(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('COMMAND TERMINAL', 'RNET SHELL 0.1'));
    const terminal = el('section', 'terminal-console');
    for (const line of this.terminalLines.slice(-60)) terminal.append(el('div', 'terminal-line', line));
    const prompt = el('form', 'terminal-prompt');
    prompt.append(el('span', 'prompt-symbol', `${this.profile.researcher.personnelId}>`));
    const input = el('input', 'terminal-input');
    input.autocomplete = 'off';
    input.spellcheck = false;
    prompt.append(input);
    prompt.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      this.terminalLines.push(`${this.profile?.researcher.personnelId}> ${value}`);
      const result = executeCommand(parseCommand(value), this.profile!, this.archive);
      this.terminalLines.push(...result.output);
      if (result.action?.type === 'open-record') { this.currentView = 'archive'; void this.openDocument(result.action.id); return; }
      if (result.action?.type === 'show-view') { this.openView(result.action.view as ViewName); return; }
      if (result.action?.type === 'logout') { void this.logout(); return; }
      this.renderWorkstation();
      requestAnimationFrame(() => (document.querySelector('.terminal-input') as HTMLInputElement | null)?.focus());
    });
    terminal.append(prompt);
    container.append(terminal);
    requestAnimationFrame(() => input.focus());
  }

  private renderProfile(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('PERSONNEL RECORD', this.profile.researcher.personnelId));
    const dossier = el('section', 'dossier panel inset');
    const facts = [
      ['NAME / CODENAME', this.profile.researcher.displayName],
      ['PERSONNEL ID', this.profile.researcher.personnelId],
      ['RANK', this.profile.researcher.rank],
      ['CLEARANCE', `LEVEL ${this.profile.researcher.clearance}`],
      ['ISSUED', formatTime(this.profile.researcher.issuedAt)],
      ['LAST ACTIVE', formatTime(this.profile.researcher.lastActiveAt)],
      ['BOOKMARKS', String(this.profile.bookmarks.length)],
      ['NOTES', String(Object.values(this.profile.notes).flat().length)]
    ];
    for (const [label, value] of facts) {
      const row = el('div', 'dossier-row');
      row.append(el('span', 'dossier-label', label), el('span', 'dossier-value', value));
      dossier.append(row);
    }
    const exportButton = button('EXPORT .SCP-ID');
    exportButton.addEventListener('click', () => downloadProfile(this.profile!));
    const importButton = button('IMPORT .SCP-ID', 'button secondary');
    importButton.addEventListener('click', () => void this.store.list().then((profiles) => this.chooseProfileFile(profiles)));
    const dossierButtons = el('div', 'button-row');
    dossierButtons.append(exportButton, importButton);
    dossier.append(dossierButtons);
    container.append(dossier);

    const history = el('section', 'panel inset history-panel');
    history.append(el('h3', '', 'RECENT ACCESS AUDIT'));
    for (const entry of [...this.profile.history].reverse().slice(0, 20)) history.append(el('div', 'history-row', `${entry.at.slice(0, 19)}  ${entry.detail}`));
    container.append(history);
  }

  private renderSettings(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('SYSTEM CONFIGURATION', 'LOCAL PROFILE SETTINGS'));
    const form = el('section', 'settings-grid');
    const addSelect = (labelText: string, key: 'interfaceMode' | 'immersion' | 'palette', options: string[]) => {
      const label = el('label', 'setting-row');
      label.append(el('span', '', labelText));
      const select = el('select', 'select-input');
      for (const option of options) {
        const node = el('option', '', option.toUpperCase());
        node.value = option;
        node.selected = this.profile!.settings[key] === option;
        select.append(node);
      }
      select.addEventListener('change', () => { this.profile!.settings = normalizeSettings({ ...this.profile!.settings, [key]: select.value }); this.applyProfileAppearance(); void this.persist(); });
      label.append(select);
      form.append(label);
    };
    addSelect('INTERFACE STYLE', 'interfaceMode', ['modern', 'hybrid', 'legacy', 'archive']);
    addSelect('IMMERSION LEVEL', 'immersion', ['low', 'standard', 'full']);
    addSelect('PHOSPHOR / PALETTE', 'palette', ['green', 'amber', 'cold', 'blue', 'high-contrast']);
    for (const [labelText, key] of [['SCANLINES', 'scanlines'], ['PHOSPHOR GLOW', 'glow'], ['CRT CURVATURE', 'curvature'], ['FLICKER', 'flicker'], ['REDUCE MOTION', 'reduceMotion'], ['SYSTEM SOUND', 'sound']] as const) {
      const label = el('label', 'setting-row toggle-row');
      label.append(el('span', '', labelText));
      const input = el('input');
      input.type = 'checkbox';
      input.checked = this.profile.settings[key];
      input.addEventListener('change', () => { this.profile!.settings = normalizeSettings({ ...this.profile!.settings, [key]: input.checked }); this.applyProfileAppearance(); void this.persist(); });
      label.append(input);
      form.append(label);
    }
    const font = el('label', 'setting-row');
    font.append(el('span', '', 'DOCUMENT/UI SCALE'));
    const range = el('input');
    range.type = 'range'; range.min = '0.8'; range.max = '1.5'; range.step = '0.05'; range.value = String(this.profile.settings.fontScale);
    const value = el('span', 'range-value', `${Math.round(this.profile.settings.fontScale * 100)}%`);
    range.addEventListener('input', () => { const fontScale = Number(range.value); value.textContent = `${Math.round(fontScale * 100)}%`; this.profile!.settings = normalizeSettings({ ...this.profile!.settings, fontScale }); this.applyProfileAppearance(); void this.persist(); });
    font.append(range, value); form.append(font);
    container.append(form);
    container.append(el('p', 'muted settings-note', 'Accessibility settings override conflicting immersion effects. Researcher career data is unaffected by interface style.'));
  }

  private windowHeader(title: string, meta: string): HTMLElement {
    const header = el('header', 'window-header');
    header.append(el('h1', '', title), el('span', 'window-meta', meta));
    return header;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
  }

  private async logout(): Promise<void> {
    await this.persist();
    await this.store.setActiveId(null);
    this.profile = null;
    this.currentDocument = null;
    this.terminalLines = ['FOUNDATION COMMAND INTERFACE READY. TYPE HELP.'];
    this.renderGate(await this.store.list(), 'PERSONNEL CREDENTIAL REMOVED');
  }
}
