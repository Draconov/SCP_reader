import { loadArchiveDocument, loadArchiveIndex } from '../archive/api.js';
import { authStepDelay, buildAuthSequence } from './immersion.js';
import { resolveShortcut } from './shortcuts.js';
import { searchArchive } from '../archive/search.js';
import { ORIENTATION_ASSIGNMENT } from '../assignments/catalog.js';
import { completeObjective, createAssignmentState, isAssignmentComplete } from '../assignments/runtime.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { downloadProfile, readProfileFile } from '../researcher/export.js';
import { addHistory, issueProfile } from '../researcher/profile.js';
import { createProfileStore, type ProfileStore } from '../researcher/store.js';
import { applySettingsToDocument, getStyleEffects, normalizeSettings } from '../settings/settings.js';
import { clearReaderCaches, networkStatusLabel } from '../offline/status.js';
import { executeCommand } from '../terminal/commands.js';
import { parseCommand } from '../terminal/parser.js';
import type { ArchiveDocument, ArchiveIndexEntry, AssignmentState, InterfaceMode, ResearchNote, ResearcherProfile, StyleEffectSettings } from '../shared/types.js';
import { button, clear, el, formatTime } from './dom.js';

export type ViewName = 'archive' | 'assignments' | 'mail' | 'bookmarks' | 'notes' | 'terminal' | 'profile' | 'settings';

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
  private online = typeof navigator === 'undefined' ? true : navigator.onLine;
  private styleCustomizationMode: InterfaceMode | null = null;
  private flickerTimer = 0;
  private flickerPulseTimer = 0;
  private scanlineTimer = 0;
  private scanlinePulseTimer = 0;

  constructor(root: HTMLElement, store = createProfileStore()) {
    this.root = root;
    this.store = store;
  }

  async start(): Promise<void> {
    this.archive = await loadArchiveIndex();
    this.status = `ARCHIVE NODE: ONLINE / ${this.archive.length} INDEXED RECORDS`;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('keydown', (event) => this.handleGlobalShortcut(event));
    }
    this.renderGate(await this.store.list());
  }

  private async persist(): Promise<void> {
    if (!this.profile) return;
    this.profile.researcher.lastActiveAt = new Date().toISOString();
    await this.store.save(this.profile);
  }

  private applyProfileAppearance(): void {
    if (!this.profile) return;
    applySettingsToDocument(this.profile.settings);
    this.refreshDynamicStyleEffects();
  }

  private clearDynamicStyleEffects(): void {
    const root = document.documentElement;
    for (const timer of [this.flickerTimer, this.flickerPulseTimer, this.scanlineTimer, this.scanlinePulseTimer]) {
      if (timer) window.clearTimeout(timer);
    }
    this.flickerTimer = 0;
    this.flickerPulseTimer = 0;
    this.scanlineTimer = 0;
    this.scanlinePulseTimer = 0;
    root.dataset.randomFlickerActive = 'false';
    root.dataset.scanlineSweepActive = 'false';
  }

  private refreshDynamicStyleEffects(): void {
    this.clearDynamicStyleEffects();
    if (!this.profile) return;
    const root = document.documentElement;
    const settings = this.profile.settings;
    const effects = getStyleEffects(settings);
    if (settings.interfaceMode !== 'simulated' || settings.reduceMotion) return;
    if (effects.flicker > 0 && effects.randomEventFrequency > 0) this.scheduleRandomFlicker(effects);
    if (effects.runningScanline > 0 && effects.randomEventFrequency > 0) this.scheduleRunningScanline(effects);
    root.dataset.randomFlickerActive = 'false';
    root.dataset.scanlineSweepActive = 'false';
  }

  private scheduleRandomFlicker(effects: StyleEffectSettings): void {
    const frequency = effects.randomEventFrequency / 100;
    const delay = 2400 + (1 - frequency) * 3600 + Math.random() * 2600;
    this.flickerTimer = window.setTimeout(() => {
      document.documentElement.dataset.randomFlickerActive = 'true';
      const duration = 70 + Math.round(180 * Math.max(0.18, effects.flicker / 100));
      this.flickerPulseTimer = window.setTimeout(() => {
        document.documentElement.dataset.randomFlickerActive = 'false';
        if (this.profile) this.scheduleRandomFlicker(getStyleEffects(this.profile.settings, 'simulated'));
      }, duration);
    }, delay);
  }

  private scheduleRunningScanline(effects: StyleEffectSettings): void {
    const frequency = effects.randomEventFrequency / 100;
    const delay = 3600 + (1 - frequency) * 5200 + Math.random() * 3200;
    this.scanlineTimer = window.setTimeout(() => {
      document.documentElement.dataset.scanlineSweepActive = 'true';
      const duration = Math.round(8000 - (effects.runningScanlineSpeed / 100) * 6000);
      this.scanlinePulseTimer = window.setTimeout(() => {
        document.documentElement.dataset.scanlineSweepActive = 'false';
        if (this.profile) this.scheduleRunningScanline(getStyleEffects(this.profile.settings, 'simulated'));
      }, Math.max(1500, duration));
    }, delay);
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
    const sequence = buildAuthSequence(this.profile, this.profile.settings.immersion);
    if (sequence.length) await this.renderAuthentication(sequence, authStepDelay(this.profile.settings.immersion));
    this.currentView = 'archive';
    this.currentDocument = null;
    this.renderWorkstation();
  }

  private renderAuthentication(lines: string[], delay: number): Promise<void> {
    return new Promise((resolve) => {
      clear(this.root);
      const gate = el('main', 'id-gate auth-gate');
      const terminal = el('section', 'credential-terminal panel auth-terminal');
      terminal.append(el('div', 'foundation-mark', 'SCP'), el('h1', '', 'CREDENTIAL AUTHENTICATION'), el('p', 'eyebrow', 'FOUNDATION SECURE RESEARCH NETWORK'));
      const output = el('div', 'auth-output terminal-console');
      terminal.append(output);
      const skip = button('SKIP AUTHENTICATION', 'button secondary compact');
      terminal.append(skip);
      gate.append(terminal);
      this.root.append(gate);

      let index = 0;
      let finished = false;
      let timer = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (timer) window.clearTimeout(timer);
        resolve();
      };
      const step = () => {
        if (finished) return;
        if (index >= lines.length) {
          timer = window.setTimeout(finish, Math.max(80, delay));
          return;
        }
        output.append(el('div', `terminal-line ${index === lines.length - 1 ? 'auth-granted' : ''}`, lines[index]));
        output.scrollTop = output.scrollHeight;
        index += 1;
        timer = window.setTimeout(step, delay);
      };
      skip.addEventListener('click', finish);
      step();
    });
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
    const navItems: Array<[ViewName, string]> = [['archive', 'ARCHIVE'], ['assignments', 'ASSIGNMENTS'], ['mail', 'MAIL'], ['bookmarks', 'BOOKMARKS'], ['notes', 'NOTES'], ['terminal', 'TERMINAL'], ['profile', 'PERSONNEL'], ['settings', 'SYSTEM']];
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
    const mobileNavItems: Array<[ViewName, string]> = [
      ['archive', 'FILES'], ['assignments', 'TASKS'], ['mail', 'MAIL'], ['bookmarks', 'SAVED'],
      ['notes', 'NOTES'], ['terminal', 'TERM'], ['profile', 'ID'], ['settings', 'SYSTEM']
    ];
    for (const [view, label] of mobileNavItems) {
      const nav = button(label, `mobile-nav-button ${this.currentView === view ? 'active' : ''}`);
      nav.addEventListener('click', () => this.openView(view));
      mobileNav.append(nav);
    }
    shell.append(mobileNav);
    shell.append(el('footer', 'statusbar', `${this.status}  ·  ${networkStatusLabel(this.online)}  ·  ${new Date().toLocaleTimeString()}  ·  LOCAL PROFILE AUTOSAVE`));
    this.root.append(shell);
    if (this.styleCustomizationMode) this.root.append(this.renderStyleCustomizationModal(this.styleCustomizationMode));
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
      case 'bookmarks': this.renderBookmarks(container); break;
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

  private renderBookmarks(container: HTMLElement): void {
    if (!this.profile) return;
    container.append(this.windowHeader('BOOKMARKED RECORDS', `${this.profile.bookmarks.length} SAVED`));
    const entries = this.profile.bookmarks
      .map((id) => this.archive.find((entry) => entry.id === id))
      .filter((entry): entry is ArchiveIndexEntry => Boolean(entry));
    if (!entries.length) {
      container.append(el('p', 'empty-state', 'NO BOOKMARKED FOUNDATION RECORDS'));
      return;
    }
    const list = el('div', 'archive-results');
    for (const entry of entries) {
      const row = el('button', 'archive-row bookmark-row');
      row.type = 'button';
      row.innerHTML = `<span class="record-id">${this.escape(entry.title)}</span><span class="record-type">${entry.type.toUpperCase()}</span><span class="record-class">${this.escape(entry.objectClass ?? 'UNCLASSIFIED')}</span><span class="record-clearance">L${entry.clearance}</span><span class="record-summary">${this.escape(entry.summary)}</span>`;
      row.addEventListener('click', () => { this.currentView = 'archive'; void this.openDocument(entry.id); });
      list.append(row);
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
      if (result.action?.type === 'related-records') { void this.showRelatedInTerminal(result.action.id); return; }
      if (result.action?.type === 'logout') { void this.logout(); return; }
      this.renderWorkstation();
      requestAnimationFrame(() => (document.querySelector('.terminal-input') as HTMLInputElement | null)?.focus());
    });
    terminal.append(prompt);
    container.append(terminal);
    requestAnimationFrame(() => input.focus());
  }

  private async showRelatedInTerminal(id: string): Promise<void> {
    try {
      const doc = await loadArchiveDocument(id, this.archive);
      const related = doc.links
        .map((slug) => this.archive.find((entry) => entry.slug === slug))
        .filter((entry): entry is ArchiveIndexEntry => Boolean(entry))
        .slice(0, 20);
      this.terminalLines.push(...(related.length
        ? related.map((entry) => `${entry.title.padEnd(14)} L${entry.clearance} ${entry.summary.slice(0, 52)}`)
        : ['NO INDEXED RELATED RECORDS.']));
    } catch {
      this.terminalLines.push('RELATIONSHIP LOOKUP FAILED.');
    }
    this.renderWorkstation();
    requestAnimationFrame(() => (document.querySelector('.terminal-input') as HTMLInputElement | null)?.focus());
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
    const addSelect = (labelText: string, key: 'immersion' | 'palette', options: string[]) => {
      const label = el('label', 'setting-row');
      label.append(el('span', '', labelText));
      const select = el('select', 'select-input');
      for (const option of options) {
        const node = el('option', '', option.replace(/-/g, ' ').toUpperCase());
        node.value = option;
        node.selected = this.profile!.settings[key] === option;
        select.append(node);
      }
      select.addEventListener('change', () => { this.profile!.settings = normalizeSettings({ ...this.profile!.settings, [key]: select.value }); this.applyProfileAppearance(); void this.persist(); });
      label.append(select);
      form.append(label);
    };

    const styleRow = el('label', 'setting-row style-row');
    styleRow.append(el('span', '', 'INTERFACE STYLE'));
    const styleControls = el('div', 'setting-controls');
    const styleSelect = el('select', 'select-input');
    for (const option of ['normal', 'simulated'] as const) {
      const node = el('option', '', option === 'normal' ? 'NORMAL' : 'SIMULATED');
      node.value = option;
      node.selected = this.profile.settings.interfaceMode === option;
      styleSelect.append(node);
    }
    styleSelect.addEventListener('change', () => {
      this.profile!.settings = normalizeSettings({ ...this.profile!.settings, interfaceMode: styleSelect.value as InterfaceMode });
      this.applyProfileAppearance();
      void this.persist();
      this.renderWorkstation();
    });
    const customizeButton = button('CUSTOMIZE STYLE', 'button secondary compact');
    customizeButton.addEventListener('click', () => {
      this.styleCustomizationMode = this.profile!.settings.interfaceMode;
      this.renderWorkstation();
    });
    styleControls.append(styleSelect, customizeButton);
    styleRow.append(styleControls);
    form.append(styleRow);

    addSelect('IMMERSION LEVEL', 'immersion', ['low', 'standard', 'full']);
    addSelect('PHOSPHOR / PALETTE', 'palette', ['green', 'amber', 'cold', 'blue', 'high-contrast']);
    for (const [labelText, key] of [['REDUCE MOTION', 'reduceMotion'], ['SYSTEM SOUND', 'sound']] as const) {
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
    container.append(el('p', 'muted', 'Palettes apply to every interface style. Each style keeps its own effect preset, and CUSTOMIZE STYLE opens a dedicated popup for the currently selected style.'));

    const maintenance = el('section', 'panel inset settings-maintenance');
    maintenance.append(el('h3', '', 'LOCAL TERMINAL MAINTENANCE'));
    const maintenanceButtons = el('div', 'button-row');
    const clearCache = button('CLEAR DOCUMENT CACHE', 'button secondary');
    clearCache.addEventListener('click', () => {
      void clearReaderCaches().then((count) => {
        this.status = `LOCAL ARCHIVE CACHE CLEARED / ${count} CACHE(S) REMOVED`;
        this.renderWorkstation();
      });
    });
    const deleteProfile = button('DELETE LOCAL PERSONNEL ID', 'button danger');
    deleteProfile.addEventListener('click', () => void this.deleteCurrentProfile());
    maintenanceButtons.append(clearCache, deleteProfile);
    maintenance.append(maintenanceButtons, el('p', 'muted', 'Clearing the document cache does not delete your researcher profile. Deleting the local ID is permanent unless you exported a .scp-id backup.'));
    container.append(maintenance);
    container.append(el('p', 'muted settings-note', 'Keyboard: Ctrl+K search · Ctrl+A assignments · Ctrl+M mail · Ctrl+N notes · Ctrl+Shift+P terminal · Ctrl+, settings · Alt+Left back. Accessibility settings override conflicting immersion effects.'));
  }

  private renderStyleCustomizationModal(mode: InterfaceMode): HTMLElement {
    const backdrop = el('div', 'modal-backdrop');
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        this.styleCustomizationMode = null;
        this.renderWorkstation();
      }
    });
    const modal = el('section', 'modal panel style-customizer');
    modal.append(this.windowHeader(`${mode === 'normal' ? 'NORMAL' : 'SIMULATED'} STYLE CALIBRATION`, 'LOCAL VISUAL PROFILE'));
    modal.append(el('p', 'muted', mode === 'simulated'
      ? 'These controls affect the entire Simulated interface, including login, archive, reader, terminal, and system windows.'
      : 'These controls affect the entire Normal interface while leaving palette selection separate.'));
    const body = el('div', 'settings-grid style-customizer-grid');
    const controls: Array<{ key: keyof StyleEffectSettings; label: string }> = mode === 'simulated'
      ? [
          { key: 'glow', label: 'PHOSPHOR GLOW' },
          { key: 'scanlines', label: 'SCANLINE INTENSITY' },
          { key: 'curvature', label: 'CRT CURVATURE' },
          { key: 'vignette', label: 'EDGE VIGNETTE' },
          { key: 'noise', label: 'STATIC / NOISE' },
          { key: 'reflection', label: 'GLASS REFLECTION' },
          { key: 'bezel', label: 'PHYSICAL BEZEL' },
          { key: 'flicker', label: 'FLICKER INTENSITY' },
          { key: 'runningScanline', label: 'RUNNING SCANLINE' },
          { key: 'runningScanlineSpeed', label: 'RUNNING SCANLINE SPEED' },
          { key: 'randomEventFrequency', label: 'RANDOM EVENT FREQUENCY' },
          { key: 'density', label: 'TERMINAL DENSITY' }
        ]
      : [
          { key: 'glow', label: 'UI GLOW' },
          { key: 'scanlines', label: 'SCANLINE INTENSITY' },
          { key: 'curvature', label: 'SCREEN CURVATURE' },
          { key: 'flicker', label: 'FLICKER INTENSITY' },
          { key: 'vignette', label: 'EDGE SHADING' },
          { key: 'density', label: 'UI DENSITY' }
        ];
    const current = getStyleEffects(this.profile!.settings, mode);
    for (const control of controls) {
      const row = el('label', 'setting-row range-setting-row');
      row.append(el('span', '', control.label));
      const controlWrap = el('div', 'setting-controls');
      const range = el('input');
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.step = '1';
      range.value = String(current[control.key]);
      const value = el('span', 'range-value', `${current[control.key]}%`);
      range.addEventListener('input', () => {
        const styleEffects = {
          ...this.profile!.settings.styleEffects,
          [mode]: {
            ...this.profile!.settings.styleEffects[mode],
            [control.key]: Number(range.value)
          }
        };
        value.textContent = `${range.value}%`;
        this.profile!.settings = normalizeSettings({ ...this.profile!.settings, styleEffects });
        this.applyProfileAppearance();
        void this.persist();
      });
      controlWrap.append(range, value);
      row.append(controlWrap);
      body.append(row);
    }
    modal.append(body);
    const buttons = el('div', 'button-row');
    const reset = button('RESET CURRENT STYLE', 'button secondary');
    reset.addEventListener('click', () => {
      this.profile!.settings = normalizeSettings({
        ...this.profile!.settings,
        styleEffects: {
          ...this.profile!.settings.styleEffects,
          [mode]: { ...DEFAULT_SETTINGS.styleEffects[mode] }
        }
      });
      this.applyProfileAppearance();
      void this.persist();
      this.renderWorkstation();
    });
    const close = button('CLOSE');
    close.addEventListener('click', () => {
      this.styleCustomizationMode = null;
      this.renderWorkstation();
    });
    buttons.append(reset, close);
    modal.append(buttons);
    backdrop.append(modal);
    return backdrop;
  }

  private handleNetworkChange(online: boolean): void {
    this.online = online;
    if (!online) this.status = 'FOUNDATION NETWORK UNAVAILABLE / USING LOCAL ARCHIVE CACHE';
    else if (this.profile) this.status = `ARCHIVE NODE: ONLINE / ${this.archive.length} INDEXED RECORDS`;
    if (this.profile) this.renderWorkstation();
  }

  private handleGlobalShortcut(event: KeyboardEvent): void {
    if (!this.profile) return;
    const target = event.target;
    const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
    const shortcut = resolveShortcut({
      key: event.key,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      editable
    });
    if (!shortcut) return;
    event.preventDefault();
    if (shortcut === 'back') {
      if (this.currentDocument) {
        this.currentDocument = null;
        this.currentView = 'archive';
        this.renderWorkstation();
      }
      return;
    }
    if (shortcut === 'archive-search') {
      this.currentView = 'archive';
      this.currentDocument = null;
      this.renderWorkstation();
      requestAnimationFrame(() => (document.querySelector('.archive-search') as HTMLInputElement | null)?.focus());
      return;
    }
    this.openView(shortcut);
  }

  private async deleteCurrentProfile(): Promise<void> {
    if (!this.profile) return;
    const id = this.profile.researcher.personnelId;
    if (!window.confirm(`DELETE LOCAL PERSONNEL ID ${id}?\n\nThis cannot be undone unless you exported a .scp-id backup.`)) return;
    await this.store.remove(id);
    await this.store.setActiveId(null);
    this.clearDynamicStyleEffects();
    this.profile = null;
    this.currentDocument = null;
    this.renderGate(await this.store.list(), `LOCAL PERSONNEL RECORD ${id} DELETED`);
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
    this.clearDynamicStyleEffects();
    this.profile = null;
    this.currentDocument = null;
    this.styleCustomizationMode = null;
    this.terminalLines = ['FOUNDATION COMMAND INTERFACE READY. TYPE HELP.'];
    this.renderGate(await this.store.list(), 'PERSONNEL CREDENTIAL REMOVED');
  }
}
