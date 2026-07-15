import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { getBattlefieldLocation } from './battlefieldLocations';
import {
  DOCTRINE_IDS,
  MEDAL_CATALOG,
  type BootstrapResponse,
  type DoctrineId,
  type DailyLeaderboardEntry,
  type DailyLeaderboardResponse,
  type EligibleCommentsResponse,
  type GlobalLeaderboardEntry,
  type GlobalLeaderboardResponse,
  type GlobalMapResponse,
  type GlobalMapTerritoryView,
  type OrderResponse,
  type PlayerJoinResponse,
  type PublicPlayerProfileResponse,
  type PublicBattleResultResponse,
  type SpySuspicionResponse,
  type TerritoryCaptureRecord,
  type TerritoryOwner,
} from '../shared/api';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scale: {
    // Keep a fixed game resolution but automatically scale it to fit within the available
    // web-view / device while maintaining aspect ratio.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [Boot, Preloader, MainMenu, MainGame, GameOver],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

let activeGame: Game | undefined;
let stateScreenElement: HTMLElement | undefined;
let globalMapElements: GlobalMapElements | undefined;
type GlobalMapSnapshot = GlobalMapResponse & {
  nextTargetId?: string;
  campaign?: unknown;
};

type CampaignMapStatus = {
  complete: boolean;
  winner?: string;
  reportPermalink?: string;
};

let globalMapSnapshot: GlobalMapSnapshot | undefined;
let selectedGlobalMapTerritoryId: string | undefined;
let globalMapReturnFocus: HTMLElement | undefined;
let globalMapLoadVersion = 0;
let pausedGlobalMapScenes: Phaser.Scene[] = [];

type GlobalMapElements = {
  toggle: HTMLButtonElement;
  dialog: HTMLDialogElement;
  close: HTMLButtonElement;
  status: HTMLElement;
  grid: HTMLElement;
  historyTitle: HTMLElement;
  historyMeta: HTMLElement;
  historyList: HTMLOListElement;
};

const TERRITORY_OWNER_LABELS: Record<TerritoryOwner, string> = {
  green: 'Green Army',
  blue: 'Blue Army',
  ai: 'AI',
  contested: 'Contested',
};

const TERRITORY_OWNER_MARKERS: Record<TerritoryOwner, string> = {
  green: 'G',
  blue: 'B',
  ai: 'AI',
  contested: '?',
};

const DOCTRINE_CARD_TEXT: Record<DoctrineId, string> = {
  STRIKE: 'Assault. Breaks Hack, Virus, Phantom.',
  HACK: 'Exploit. Breaks Virus, Phantom, Shield.',
  VIRUS: 'Corruption. Breaks Phantom, Shield, Overload.',
  PHANTOM: 'Stealth. Breaks Shield, Overload, Trap.',
  SHIELD: 'Defense. Breaks Overload, Trap, Strike.',
  OVERLOAD: 'Swarm. Breaks Trap, Strike, Hack.',
  TRAP: 'Ambush. Breaks Strike, Hack, Virus.',
};

function findGlobalMapElements(): GlobalMapElements | undefined {
  const toggle = document.getElementById('global-map-toggle');
  const dialog = document.getElementById('global-map-dialog');
  const close = document.getElementById('global-map-close');
  const status = document.getElementById('global-map-status');
  const grid = document.getElementById('global-map-grid');
  const historyTitle = document.getElementById('global-map-history-title');
  const historyMeta = document.getElementById('global-map-history-meta');
  const historyList = document.getElementById('global-map-history-list');

  if (
    !(toggle instanceof HTMLButtonElement) ||
    !(dialog instanceof HTMLDialogElement) ||
    !(close instanceof HTMLButtonElement) ||
    !status ||
    !grid ||
    !historyTitle ||
    !historyMeta ||
    !(historyList instanceof HTMLOListElement)
  ) {
    return undefined;
  }

  return {
    toggle,
    dialog,
    close,
    status,
    grid,
    historyTitle,
    historyMeta,
    historyList,
  };
}

function isGlobalMapResponse(value: unknown): value is GlobalMapSnapshot {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<GlobalMapResponse>;
  return (
    candidate.type === 'global-map' &&
    typeof candidate.columns === 'number' &&
    typeof candidate.rows === 'number' &&
    typeof candidate.generatedAt === 'string' &&
    Array.isArray(candidate.territories)
  );
}

function getObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getCampaignMapStatus(value: unknown): CampaignMapStatus | undefined {
  const campaign = getObject(value);
  if (!campaign) return undefined;

  const completion = getObject(campaign.completion) ?? campaign;
  const status = getString(campaign.status) ?? getString(completion.status);
  const complete = status === 'complete' || status === 'completed' ||
    typeof completion.completedAt === 'string';
  if (!complete) return { complete: false };

  const report = getObject(completion.report) ?? getObject(campaign.report);
  const reportStatus = getString(report?.status);
  const reportPublished = reportStatus === 'published' ||
    typeof report?.publishedAt === 'string';
  const reportPermalink = getString(report?.permalink) ??
    getString(report?.postPermalink) ??
    getString(completion.reportPermalink) ??
    getString(campaign.reportPermalink);
  const winner = getString(completion.winner) ?? getString(campaign.winner);
  return {
    complete: true,
    ...(winner ? { winner } : {}),
    ...(reportPublished && reportPermalink ? { reportPermalink } : {}),
  };
}

function formatGlobalMapTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatBattleWinner(winner: TerritoryCaptureRecord['winner']) {
  return winner === 'humanity' ? 'Humanity' : TERRITORY_OWNER_LABELS[winner];
}

function formatCampaignWinner(winner: string | undefined) {
  if (!winner) return undefined;
  if (winner === 'humanity') return 'Humanity';
  if (winner === 'green' || winner === 'blue' || winner === 'ai' || winner === 'contested') {
    return TERRITORY_OWNER_LABELS[winner];
  }

  return winner;
}

function getTerritoryRecordSummary(record: TerritoryCaptureRecord) {
  if (record.ownershipChanged) {
    return `${TERRITORY_OWNER_LABELS[record.previousOwner]} → ${TERRITORY_OWNER_LABELS[record.newOwner]}`;
  }
  if (record.newOwner === 'contested') return 'Sector remained contested';

  return `${TERRITORY_OWNER_LABELS[record.newOwner]} retained control`;
}

function getRedditPostUrl(permalink: string) {
  if (permalink.startsWith('http')) return permalink;

  return `https://www.reddit.com${permalink}`;
}

function renderGlobalMapHistory(territory: GlobalMapTerritoryView) {
  const elements = globalMapElements;
  if (!elements) return;

  elements.historyTitle.textContent = territory.name;
  elements.historyMeta.textContent = [
    territory.id.toUpperCase(),
    `Current owner: ${TERRITORY_OWNER_LABELS[territory.owner]}`,
    `${territory.history.length} daily record${territory.history.length === 1 ? '' : 's'}`,
  ].join(' · ');
  elements.historyList.replaceChildren();

  if (territory.history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'global-map-history__empty';
    empty.textContent = 'No completed daily battles have been recorded for this sector yet.';
    elements.historyList.append(empty);
    return;
  }

  for (const record of territory.history) {
    const item = document.createElement('li');
    item.className = 'global-map-history__item';

    const header = document.createElement('div');
    header.className = 'global-map-history__item-header';

    const date = document.createElement('time');
    date.dateTime = record.battleDate;
    date.textContent = record.battleDate;
    header.append(date);

    const state = document.createElement('span');
    state.className = record.ownershipChanged
      ? 'global-map-history__change global-map-history__change--captured'
      : 'global-map-history__change';
    state.textContent = record.ownershipChanged ? 'Control changed' : 'Held';
    header.append(state);
    item.append(header);

    const summary = document.createElement('p');
    summary.className = 'global-map-history__outcome';
    summary.textContent = getTerritoryRecordSummary(record);
    item.append(summary);

    const winner = document.createElement('p');
    winner.className = 'global-map-history__winner';
    winner.textContent = `Battle result: ${formatBattleWinner(record.winner)}`;
    item.append(winner);

    if (record.postPermalink) {
      const link = document.createElement('a');
      link.className = 'global-map-history__link';
      link.href = getRedditPostUrl(record.postPermalink);
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open daily battle post';
      item.append(link);
    }
    const detailUrl = new URL(window.location.href);
    detailUrl.searchParams.delete('profile');
    detailUrl.searchParams.set('battle', record.battleId);
    const detailLink = document.createElement('a');
    detailLink.className = 'global-map-history__link';
    detailLink.href = detailUrl.toString();
    detailLink.textContent = 'View battle details';
    item.append(detailLink);

    elements.historyList.append(item);
  }
}

function selectGlobalMapTerritory(territoryId: string) {
  const elements = globalMapElements;
  const snapshot = globalMapSnapshot;
  if (!elements || !snapshot) return;

  const territory = snapshot.territories.find((entry) => entry.id === territoryId);
  if (!territory) return;

  selectedGlobalMapTerritoryId = territoryId;
  for (const cell of elements.grid.querySelectorAll<HTMLButtonElement>('.global-map-cell')) {
    const selected = cell.dataset.territoryId === territoryId;
    cell.classList.toggle('global-map-cell--selected', selected);
    cell.setAttribute('aria-pressed', String(selected));
  }
  renderGlobalMapHistory(territory);
}

function createGlobalMapCell(
  territory: GlobalMapTerritoryView,
  activeTerritoryId: string | undefined,
  nextTargetId: string | undefined,
) {
  const cell = document.createElement('button');
  const isActive = territory.id === activeTerritoryId;
  const isNext = territory.id === nextTargetId;
  cell.className = [
    'global-map-cell',
    `global-map-cell--${territory.owner}`,
    isNext ? 'global-map-cell--next' : '',
  ].filter(Boolean).join(' ');
  cell.type = 'button';
  cell.dataset.territoryId = territory.id;
  cell.style.gridColumn = String(territory.column);
  cell.style.gridRow = String(territory.row);
  cell.setAttribute('aria-pressed', 'false');
  cell.setAttribute('aria-controls', 'global-map-history');
  cell.setAttribute(
    'aria-label',
    [
      territory.name,
      TERRITORY_OWNER_LABELS[territory.owner],
      `${territory.history.length} daily record${territory.history.length === 1 ? '' : 's'}`,
      isActive ? 'current daily battlefield' : '',
      isNext ? 'next daily objective' : '',
    ].filter(Boolean).join(', '),
  );
  cell.title = [
    `${territory.name} — ${TERRITORY_OWNER_LABELS[territory.owner]}`,
    isActive ? 'Today' : '',
    isNext ? 'Next objective' : '',
  ].filter(Boolean).join(' · ');
  if (isActive) cell.setAttribute('aria-current', 'location');

  const coordinate = document.createElement('span');
  coordinate.className = 'global-map-cell__coordinate';
  coordinate.textContent = `C${territory.column}/R${territory.row}`;
  cell.append(coordinate);

  const marker = document.createElement('strong');
  marker.className = 'global-map-cell__owner';
  marker.textContent = TERRITORY_OWNER_MARKERS[territory.owner];
  cell.append(marker);

  if (isActive) {
    const active = document.createElement('span');
    active.className = 'global-map-cell__active';
    active.textContent = 'Today';
    cell.append(active);
  }

  if (isNext) {
    const next = document.createElement('span');
    next.className = 'global-map-cell__next';
    next.textContent = 'Next';
    cell.append(next);
  }

  if (!isActive && !isNext && territory.history.length > 0) {
    const historyCount = document.createElement('span');
    historyCount.className = 'global-map-cell__history-count';
    historyCount.textContent = `LOG ${territory.history.length}`;
    cell.append(historyCount);
  }

  cell.addEventListener('click', () => selectGlobalMapTerritory(territory.id));
  return cell;
}

function renderGlobalMapStatus(snapshot: GlobalMapSnapshot) {
  const elements = globalMapElements;
  if (!elements) return;

  const controlledCount = snapshot.territories.filter(
    (territory) => territory.owner !== 'contested',
  ).length;
  const campaign = getCampaignMapStatus(snapshot.campaign);
  const winner = formatCampaignWinner(campaign?.winner);
  const summary = campaign?.complete
    ? [
      'Campaign complete',
      winner ? `winner: ${winner}` : '',
      `${controlledCount}/${snapshot.territories.length} controlled`,
    ]
    : [
      `${snapshot.territories.length} sectors`,
      `${controlledCount} controlled`,
      snapshot.nextTargetId ? 'next objective selected' : '',
    ];
  summary.push(`updated ${formatGlobalMapTimestamp(snapshot.generatedAt)}`);

  elements.status.replaceChildren(document.createTextNode(summary.filter(Boolean).join(' · ')));
  if (campaign?.reportPermalink) {
    elements.status.append(document.createTextNode(' · '));
    const link = document.createElement('a');
    link.className = 'global-map-dialog__report-link';
    link.href = getRedditPostUrl(campaign.reportPermalink);
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Open final campaign report';
    elements.status.append(link);
  }
}

function renderGlobalMap(snapshot: GlobalMapSnapshot) {
  const elements = globalMapElements;
  if (!elements) return;

  globalMapSnapshot = snapshot;
  elements.grid.replaceChildren();
  elements.grid.style.setProperty('--global-map-columns', String(snapshot.columns));
  elements.grid.style.setProperty('--global-map-rows', String(snapshot.rows));
  elements.grid.setAttribute('aria-busy', 'false');
  const campaignComplete = getCampaignMapStatus(snapshot.campaign)?.complete === true;

  for (const territory of snapshot.territories) {
    elements.grid.append(createGlobalMapCell(
      territory,
      campaignComplete ? undefined : snapshot.activeTerritoryId,
      campaignComplete ? undefined : snapshot.nextTargetId,
    ));
  }

  elements.status.classList.remove('global-map-dialog__status--error');
  renderGlobalMapStatus(snapshot);

  const retainedSelection = selectedGlobalMapTerritoryId && snapshot.territories.some(
    (territory) => territory.id === selectedGlobalMapTerritoryId,
  )
    ? selectedGlobalMapTerritoryId
    : undefined;
  const initialTerritoryId = retainedSelection ??
    snapshot.activeTerritoryId ??
    snapshot.nextTargetId ??
    snapshot.territories[0]?.id;
  if (initialTerritoryId) selectGlobalMapTerritory(initialTerritoryId);
}

async function loadGlobalMap() {
  const elements = globalMapElements;
  if (!elements) return;

  const loadVersion = ++globalMapLoadVersion;
  elements.status.classList.remove('global-map-dialog__status--error');
  elements.status.textContent = 'Loading current territory control and daily history…';
  elements.grid.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch('/api/global-map');
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok || !isGlobalMapResponse(body)) {
      throw new Error('Invalid global map response');
    }
    if (loadVersion !== globalMapLoadVersion) return;

    renderGlobalMap(body);
  } catch {
    if (loadVersion !== globalMapLoadVersion) return;

    elements.grid.setAttribute('aria-busy', 'false');
    elements.status.classList.add('global-map-dialog__status--error');
    elements.status.textContent = 'Global map data is temporarily unavailable.';
  }
}

function pauseGameForGlobalMap() {
  pausedGlobalMapScenes = activeGame?.scene.getScenes(true) ?? [];
  for (const scene of pausedGlobalMapScenes) scene.scene.pause();
}

function resumeGameAfterGlobalMap() {
  for (const scene of pausedGlobalMapScenes) scene.scene.resume();
  pausedGlobalMapScenes = [];
}

function setupGlobalMap() {
  globalMapElements = findGlobalMapElements();
  const elements = globalMapElements;
  if (!elements) return;

  elements.toggle.addEventListener('click', () => {
    globalMapReturnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : elements.toggle;
    if (!elements.dialog.open) {
      pauseGameForGlobalMap();
      elements.dialog.showModal();
    }
    void loadGlobalMap();
  });
  elements.close.addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('close', () => {
    resumeGameAfterGlobalMap();
    if (globalMapReturnFocus?.isConnected) globalMapReturnFocus.focus();
    globalMapReturnFocus = undefined;
  });
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function clearStateScreen() {
  stateScreenElement?.remove();
  stateScreenElement = undefined;
}

function startPhaserGame() {
  if (activeGame) return;

  clearStateScreen();
  activeGame = StartGame('game-container');
}

function stopPhaserGame() {
  activeGame?.destroy(true);
  activeGame = undefined;
  pausedGlobalMapScenes = [];
}

function appendText(parent: HTMLElement, tagName: 'h1' | 'h2' | 'p', className: string, text: string) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.append(element);

  return element;
}

function createActionButton(label: string, onClick: () => void) {
  const button = document.createElement('button');
  button.className = 'game-state-screen__button';
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);

  return button;
}

function openDoctrineCodex() {
  const existing = document.getElementById('doctrine-codex-dialog');
  if (existing instanceof HTMLDialogElement) {
    existing.showModal();
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.id = 'doctrine-codex-dialog';
  dialog.className = 'doctrine-codex';
  dialog.setAttribute('aria-labelledby', 'doctrine-codex-title');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'doctrine-codex-title';
  title.textContent = 'Seven Doctrine Codex';
  const close = createActionButton('Close', () => dialog.close());
  header.append(title, close);
  const image = document.createElement('img');
  image.src = '/assets/doctrine-counters-pixel.png';
  image.alt = 'Seven doctrine matchup matrix: every doctrine has three wins and three losses';
  dialog.append(header, image);
  document.body.append(dialog);
  dialog.showModal();
}

async function joinDailyEvent(panel: HTMLElement, button: HTMLButtonElement) {
  button.disabled = true;

  try {
    const response = await fetch('/api/player/join', { method: 'POST' });
    const body: PlayerJoinResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        'message' in body && body.message
          ? body.message
          : 'Could not join today\'s event.',
      );
      return;
    }

    await loadExpandedState();
  } catch {
    appendText(panel, 'p', 'game-state-screen__body', 'Could not join today\'s event.');
  } finally {
    button.disabled = false;
  }
}

function createDoctrineButton(doctrineId: DoctrineId, onSubmit: (doctrineId: DoctrineId) => void) {
  const button = document.createElement('button');
  button.className = 'game-state-screen__doctrine';
  button.type = 'button';
  button.innerHTML = `<strong>${doctrineId}</strong><span>${DOCTRINE_CARD_TEXT[doctrineId]}</span>`;
  button.addEventListener('click', () => onSubmit(doctrineId));

  return button;
}

async function submitDoctrineOrder(
  doctrineId: DoctrineId,
  sourceCommentId: string,
  panel: HTMLElement,
) {
  const buttons = panel.querySelectorAll<HTMLButtonElement>('button');
  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ doctrineId, sourceCommentId }),
    });
    const body: OrderResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        'message' in body && body.message ? body.message : 'Doctrine order failed.',
      );
      return;
    }

    await loadExpandedState();
  } catch {
    appendText(panel, 'p', 'game-state-screen__body', 'Doctrine order failed.');
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

async function renderOrderComposer(panel: HTMLElement) {
  appendText(
    panel,
    'p',
    'game-state-screen__body',
    'Choose a teammate comment, then choose one hidden doctrine. Your order cannot be changed.',
  );
  const codexButton = createActionButton('Open Doctrine Codex', openDoctrineCodex);
  panel.append(codexButton);
  const status = appendText(panel, 'p', 'game-state-screen__meta', 'Loading teammate comments…');

  try {
    const response = await fetch('/api/eligible-comments');
    const body: EligibleCommentsResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'eligible-comments') {
      throw new Error('message' in body && body.message ? body.message : 'Comments unavailable.');
    }
    status.remove();

    const warRoomLink = document.createElement('a');
    warRoomLink.className = 'game-state-screen__war-room-link';
    warRoomLink.href = body.warRoomPermalink;
    warRoomLink.target = '_blank';
    warRoomLink.rel = 'noreferrer';
    warRoomLink.textContent = `Open ${body.army.toUpperCase()} War Room`;
    panel.append(warRoomLink);

    if (body.comments.length === 0) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        'No eligible teammate comments are available yet. Open your team War Room and return after a teammate comments.',
      );
      return;
    }

    const label = document.createElement('label');
    label.className = 'game-state-screen__comment-label';
    label.textContent = 'Teammate comment';
    const select = document.createElement('select');
    select.className = 'game-state-screen__comment-select';
    select.setAttribute('aria-label', 'Choose a teammate comment');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a comment…';
    select.append(placeholder);
    const comments = [...body.comments];
    let nextCursor = body.nextCursor;
    const renderCommentOptions = (query = '') => {
      const selectedValue = select.value;
      select.replaceChildren(placeholder);
      const normalizedQuery = query.trim().toLowerCase();
      for (const comment of comments) {
        const searchable = `${comment.authorUsername} ${comment.excerpt}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) continue;
        const option = document.createElement('option');
        option.value = comment.id;
        option.textContent = `u/${comment.authorUsername}: ${comment.excerpt}`;
        select.append(option);
      }
      if ([...select.options].some((option) => option.value === selectedValue)) {
        select.value = selectedValue;
      }
    };
    renderCommentOptions();
    label.append(select);
    panel.append(label);

    const commentTools = document.createElement('div');
    commentTools.className = 'game-state-screen__comment-tools';
    const search = document.createElement('input');
    search.className = 'game-state-screen__comment-search';
    search.type = 'search';
    search.placeholder = 'Search loaded comments';
    search.setAttribute('aria-label', 'Search loaded teammate comments');
    search.addEventListener('input', () => renderCommentOptions(search.value));
    commentTools.append(search);

    if (nextCursor) {
      const loadMore = createActionButton('Load more comments', () => {
        if (!nextCursor) return;
        loadMore.disabled = true;
        void fetch(`/api/eligible-comments?cursor=${encodeURIComponent(nextCursor)}`)
          .then(async (pageResponse) => {
            const page: EligibleCommentsResponse = await pageResponse.json();
            if (!pageResponse.ok || page.type !== 'eligible-comments') {
              throw new Error('Could not load more comments.');
            }
            comments.push(...page.comments.filter(
              (comment) => !comments.some((existing) => existing.id === comment.id),
            ));
            nextCursor = page.nextCursor;
            renderCommentOptions(search.value);
            if (!nextCursor) loadMore.remove();
          })
          .catch(() => {
            loadMore.textContent = 'Try loading comments again';
          })
          .finally(() => {
            loadMore.disabled = false;
          });
      });
      commentTools.append(loadMore);
    }
    panel.append(commentTools);

    const doctrineGrid = document.createElement('div');
    doctrineGrid.className = 'game-state-screen__doctrines';
    for (const doctrineId of DOCTRINE_IDS) {
      const button = createDoctrineButton(doctrineId, (selectedDoctrineId) => {
        const sourceCommentId = select.value;
        if (!sourceCommentId) return;
        const sourceComment = comments.find((comment) => comment.id === sourceCommentId);
        if (!sourceComment) return;

        doctrineGrid.replaceChildren();
        appendText(
          doctrineGrid,
          'p',
          'game-state-screen__body',
          `Lock ${selectedDoctrineId} using u/${sourceComment.authorUsername}'s comment? This cannot be changed.`,
        );
        doctrineGrid.append(
          createActionButton('Lock order', () => {
            void submitDoctrineOrder(selectedDoctrineId, sourceCommentId, panel);
          }),
          createActionButton('Back', () => void loadExpandedState()),
        );
      });
      button.disabled = true;
      doctrineGrid.append(button);
    }
    select.addEventListener('change', () => {
      doctrineGrid.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        button.disabled = select.value.length === 0;
      });
    });
    panel.append(doctrineGrid);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Comments unavailable.';
  }
}

function createLeaderboardRow(entry: DailyLeaderboardEntry) {
  const row = document.createElement('tr');
  if (entry.isCurrentUser) row.className = 'daily-leaderboard__row--current';
  const values = [
    `#${entry.position}`,
    entry.army.toUpperCase(),
    entry.rank,
    `+${entry.xpAwarded}`,
    entry.newMedals.join(', ') || '—',
  ];
  const position = document.createElement('td');
  position.textContent = values[0] ?? '';
  const player = document.createElement('td');
  const profileLink = document.createElement('a');
  const profileUrl = new URL(window.location.href);
  profileUrl.searchParams.set('profile', entry.username);
  profileLink.href = profileUrl.toString();
  profileLink.textContent = `u/${entry.username}`;
  player.append(profileLink);
  row.append(position, player);
  for (const value of values.slice(1)) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  return row;
}

function createMedalCard(medalTitle: string) {
  const definition = MEDAL_CATALOG[medalTitle as keyof typeof MEDAL_CATALOG];
  const item = document.createElement('li');
  item.className = 'player-profile__medal';
  if (definition) {
    const image = document.createElement('img');
    image.src = definition.assetPath;
    image.alt = '';
    image.loading = 'lazy';
    const copy = document.createElement('span');
    copy.innerHTML = `<strong>${definition.title}</strong><small>${definition.description}</small>`;
    item.dataset.rarity = definition.rarity;
    item.append(image, copy);
  } else {
    item.textContent = medalTitle;
  }
  return item;
}

async function renderDailyLeaderboard(panel: HTMLElement, battleId: string) {
  const section = document.createElement('section');
  section.className = 'daily-leaderboard';
  const title = appendText(section, 'h2', 'daily-leaderboard__title', 'Daily leaderboard');
  const status = appendText(section, 'p', 'game-state-screen__meta', 'Loading participants…');
  panel.append(section);

  try {
    const response = await fetch(`/api/battles/${encodeURIComponent(battleId)}/leaderboard`);
    const body: DailyLeaderboardResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'daily-leaderboard') {
      throw new Error('message' in body && body.message ? body.message : 'Leaderboard unavailable.');
    }
    status.remove();
    title.textContent = `Daily leaderboard · ${body.entries.length}${body.nextCursor ? '+' : ''} players`;

    const viewport = document.createElement('div');
    viewport.className = 'daily-leaderboard__viewport';
    const table = document.createElement('table');
    table.className = 'daily-leaderboard__table';
    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of ['Place', 'Player', 'Army', 'Rank', 'XP', 'New medals']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headerRow.append(cell);
    }
    header.append(headerRow);
    const rows = document.createElement('tbody');
    rows.append(...body.entries.map(createLeaderboardRow));
    table.append(header, rows);
    viewport.append(table);
    section.append(viewport);

    if (body.currentUserEntry && !body.entries.some((entry) => entry.isCurrentUser)) {
      appendText(
        section,
        'p',
        'daily-leaderboard__current-summary',
        `Your result: #${body.currentUserEntry.position} · +${body.currentUserEntry.xpAwarded} XP`,
      );
    }
    let nextCursor = body.nextCursor;
    if (nextCursor) {
      const loadMore = createActionButton('Load more players', () => {
        if (!nextCursor) return;
        loadMore.disabled = true;
        void fetch(`/api/battles/${encodeURIComponent(battleId)}/leaderboard?cursor=${encodeURIComponent(nextCursor)}`)
          .then(async (pageResponse) => {
            const page: DailyLeaderboardResponse = await pageResponse.json();
            if (!pageResponse.ok || page.type !== 'daily-leaderboard') throw new Error();
            rows.append(...page.entries.map(createLeaderboardRow));
            nextCursor = page.nextCursor;
            if (!nextCursor) loadMore.remove();
          })
          .catch(() => {
            loadMore.textContent = 'Try loading players again';
          })
          .finally(() => {
            loadMore.disabled = false;
          });
      });
      section.append(loadMore);
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Leaderboard unavailable.';
  }
}

function createGlobalLeaderboardRow(entry: GlobalLeaderboardEntry) {
  const row = document.createElement('tr');
  if (entry.isCurrentUser) row.className = 'daily-leaderboard__row--current';
  const position = document.createElement('td');
  position.textContent = `#${entry.position}`;
  const player = document.createElement('td');
  const profileLink = document.createElement('a');
  const profileUrl = new URL(window.location.href);
  profileUrl.searchParams.delete('leaderboard');
  profileUrl.searchParams.set('profile', entry.username);
  profileLink.href = profileUrl.toString();
  profileLink.textContent = `u/${entry.username}`;
  player.append(profileLink);
  row.append(position, player);
  for (const value of [entry.rank, entry.xp, entry.victories, entry.participatedEvents, entry.medals]) {
    const cell = document.createElement('td');
    cell.textContent = String(value);
    row.append(cell);
  }
  return row;
}

async function renderGlobalLeaderboard() {
  const app = document.getElementById('app');
  if (!app) return;
  stopPhaserGame();
  clearStateScreen();
  const screen = document.createElement('section');
  screen.className = 'game-state-screen';
  const panel = document.createElement('div');
  panel.className = 'game-state-screen__panel global-leaderboard';
  appendText(panel, 'h1', 'game-state-screen__title', 'Global leaderboard');
  const status = appendText(panel, 'p', 'game-state-screen__meta', 'Loading commanders…');
  screen.append(panel);
  app.append(screen);
  stateScreenElement = screen;
  try {
    const response = await fetch('/api/leaderboard/global');
    const body: GlobalLeaderboardResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'global-leaderboard') {
      throw new Error('message' in body && body.message ? body.message : 'Leaderboard unavailable.');
    }
    status.textContent = 'Career standings · XP, victories, deployments and earned medals';
    const viewport = document.createElement('div');
    viewport.className = 'daily-leaderboard__viewport';
    const table = document.createElement('table');
    table.className = 'daily-leaderboard__table';
    const head = document.createElement('thead');
    const header = document.createElement('tr');
    for (const label of ['Place', 'Player', 'Rank', 'XP', 'Victories', 'Battles', 'Medals']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      header.append(cell);
    }
    head.append(header);
    const rows = document.createElement('tbody');
    rows.append(...body.entries.map(createGlobalLeaderboardRow));
    table.append(head, rows);
    viewport.append(table);
    panel.append(viewport);
    if (body.currentUserEntry && !body.entries.some((entry) => entry.isCurrentUser)) {
      appendText(panel, 'p', 'daily-leaderboard__current-summary', `Your standing: #${body.currentUserEntry.position} · ${body.currentUserEntry.xp} XP`);
    }
    let nextCursor = body.nextCursor;
    if (nextCursor) {
      const loadMore = createActionButton('Load more commanders', () => {
        if (!nextCursor) return;
        loadMore.disabled = true;
        void fetch(`/api/leaderboard/global?cursor=${encodeURIComponent(nextCursor)}`)
          .then(async (pageResponse) => {
            const page: GlobalLeaderboardResponse = await pageResponse.json();
            if (!pageResponse.ok || page.type !== 'global-leaderboard') throw new Error();
            rows.append(...page.entries.map(createGlobalLeaderboardRow));
            nextCursor = page.nextCursor;
            if (!nextCursor) loadMore.remove();
          })
          .catch(() => { loadMore.textContent = 'Try loading commanders again'; })
          .finally(() => { loadMore.disabled = false; });
      });
      panel.append(loadMore);
    }
    const back = createActionButton('Back to battle', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('leaderboard');
      window.history.replaceState({}, '', url);
      void loadExpandedState();
    });
    panel.append(back);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Leaderboard unavailable.';
  }
}

async function renderPlayerProfile(username?: string) {
  const app = document.getElementById('app');
  if (!app) return;
  stopPhaserGame();
  clearStateScreen();
  const screen = document.createElement('section');
  screen.className = 'game-state-screen';
  const panel = document.createElement('div');
  panel.className = 'game-state-screen__panel player-profile';
  const status = appendText(panel, 'p', 'game-state-screen__meta', 'Loading player profile…');
  screen.append(panel);
  app.append(screen);
  stateScreenElement = screen;

  try {
    const endpoint = username
      ? `/api/profiles/${encodeURIComponent(username)}`
      : '/api/profiles/me';
    const response = await fetch(endpoint);
    const body: PublicPlayerProfileResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'public-profile') {
      throw new Error('message' in body && body.message ? body.message : 'Profile unavailable.');
    }
    panel.replaceChildren();

    const rankIcon = document.createElement('img');
    rankIcon.className = 'player-profile__rank';
    rankIcon.src = `/assets/ranks/reddit-emoji-upload/hva_rank_${String(body.rankLevel).padStart(2, '0')}.png`;
    rankIcon.alt = `${body.rank} rank insignia`;
    panel.append(rankIcon);
    appendText(panel, 'h1', 'game-state-screen__title', `u/${body.username}`);
    appendText(panel, 'p', 'player-profile__rank-title', `Rank ${body.rankLevel} · ${body.rank}`);
    appendText(panel, 'p', 'game-state-screen__meta', `${body.xp} XP · ${Math.round(body.rankProgress * 100)}% to next rank · ${body.streak} day streak`);
    appendText(panel, 'p', 'game-state-screen__meta', `${body.totalParticipatedEvents} battles · ${body.totalVictories} victories`);

    const medalsTitle = appendText(panel, 'h2', 'player-profile__section-title', `Medals · ${body.medals.length}`);
    medalsTitle.id = 'profile-medals-title';
    const medals = document.createElement('ul');
    medals.className = 'player-profile__medals';
    for (const medal of body.medals) medals.append(createMedalCard(medal));
    if (body.medals.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No medals earned yet';
      medals.append(item);
    }
    panel.append(medals);

    appendText(panel, 'h2', 'player-profile__section-title', 'Recent battles');
    const battles = document.createElement('ol');
    battles.className = 'player-profile__battles';
    for (const battle of body.recentBattles) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = battle.postPermalink;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `${battle.battleDate} · ${battle.army.toUpperCase()} · ${battle.territoryName} · ${battle.winner}`;
      item.append(link);
      battles.append(item);
    }
    if (body.recentBattles.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No resolved battles yet';
      battles.append(item);
    }
    panel.append(battles);

    const actions = document.createElement('div');
    actions.className = 'player-profile__actions';
    const share = createActionButton('Copy profile link', () => {
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('profile', body.shareSlug);
      void navigator.clipboard.writeText(shareUrl.toString()).then(() => {
        share.textContent = 'Profile link copied';
      }).catch(() => {
        share.textContent = shareUrl.toString();
      });
    });
    const back = createActionButton('Back to battle', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('profile');
      window.history.replaceState({}, '', url);
      void loadExpandedState();
    });
    const leaderboard = createActionButton('Global leaderboard', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('profile');
      url.searchParams.set('leaderboard', 'global');
      window.history.replaceState({}, '', url);
      void renderGlobalLeaderboard();
    });
    actions.append(share, leaderboard, back);
    panel.append(actions);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Profile unavailable.';
  }
}

function appendScoreTable(parent: HTMLElement, result: PublicBattleResultResponse['result']) {
  const table = document.createElement('table');
  table.className = 'battle-detail__scores';
  const header = document.createElement('tr');
  for (const label of ['Side', 'Doctrine', 'Doctrine score', 'Orders', 'Signals', 'AI modifier', 'Spy', 'Total']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  }
  const head = document.createElement('thead');
  head.append(header);
  const body = document.createElement('tbody');
  for (const side of ['green', 'blue', 'ai'] as const) {
    const score = result.scores[side];
    const row = document.createElement('tr');
    for (const value of [
      side.toUpperCase(),
      result.doctrines[side],
      score.doctrineScore,
      score.orderParticipationScore,
      score.commentSignalScore,
      score.aiAwarenessModifier,
      score.spyScore,
      score.total,
    ]) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  parent.append(table);
}

async function renderPublicBattleResult(battleId: string) {
  const app = document.getElementById('app');
  if (!app) return;
  stopPhaserGame();
  clearStateScreen();
  const screen = document.createElement('section');
  screen.className = 'game-state-screen';
  const panel = document.createElement('div');
  panel.className = 'game-state-screen__panel battle-detail';
  const status = appendText(panel, 'p', 'game-state-screen__meta', 'Loading battle record…');
  screen.append(panel);
  app.append(screen);
  stateScreenElement = screen;
  try {
    const response = await fetch(`/api/battles/${encodeURIComponent(battleId)}/result`);
    const body: PublicBattleResultResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'public-battle-result') {
      throw new Error('message' in body && body.message ? body.message : 'Battle record unavailable.');
    }
    panel.replaceChildren();
    appendText(panel, 'h1', 'game-state-screen__title', `Battle report · ${body.battleDate}`);
    appendText(panel, 'p', 'battle-detail__winner', `Winner: ${body.result.winner.toUpperCase()}`);
    appendText(
      panel,
      'p',
      'game-state-screen__meta',
      `${body.result.activeTerritoryBefore.name}: ${body.result.activeTerritoryBefore.owner} → ${body.result.activeTerritoryAfter.owner}`,
    );
    const viewport = document.createElement('div');
    viewport.className = 'battle-detail__viewport';
    appendScoreTable(viewport, body.result);
    panel.append(viewport);
    appendText(
      panel,
      'p',
      'game-state-screen__body',
      `Public signals: Green ${body.result.commentSignals.green.topDoctrineId ?? 'none'} · Blue ${body.result.commentSignals.blue.topDoctrineId ?? 'none'}`,
    );
    appendText(
      panel,
      'p',
      'game-state-screen__meta',
      `AI awareness: Green ${body.result.aiAwareness.green} · Blue ${body.result.aiAwareness.blue} · Spy influence: Green ${body.result.spyInfluence.green} · Blue ${body.result.spyInfluence.blue}`,
    );
    appendText(panel, 'p', 'battle-detail__report', body.result.reportText);
    const actions = document.createElement('div');
    actions.className = 'player-profile__actions';
    const post = document.createElement('a');
    post.className = 'game-state-screen__button';
    post.href = body.postPermalink;
    post.target = '_blank';
    post.rel = 'noreferrer';
    post.textContent = 'Open Reddit report';
    const back = createActionButton('Back to battle', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('battle');
      window.history.replaceState({}, '', url);
      void loadExpandedState();
    });
    actions.append(post, back);
    panel.append(actions);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Battle record unavailable.';
  }
}

async function renderCounterintelligence(panel: HTMLElement) {
  const section = document.createElement('section');
  section.className = 'counterintelligence';
  appendText(section, 'h2', 'counterintelligence__title', 'Counterintelligence');
  const status = appendText(section, 'p', 'game-state-screen__meta', 'Loading candidates…');
  panel.append(section);
  try {
    const response = await fetch('/api/eligible-comments');
    const body: EligibleCommentsResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !('type' in body) || body.type !== 'eligible-comments') throw new Error();
    status.textContent = 'Optional: select one public teammate comment whose author may be an infiltrated spy. This is a private game action, not a public accusation.';
    if (body.comments.length === 0) return;
    const select = document.createElement('select');
    select.className = 'game-state-screen__comment-select';
    select.setAttribute('aria-label', 'Choose suspected spy comment');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a suspicious comment…';
    select.append(placeholder);
    for (const comment of body.comments) {
      const option = document.createElement('option');
      option.value = comment.id;
      option.textContent = `u/${comment.authorUsername}: ${comment.excerpt}`;
      select.append(option);
    }
    const submit = createActionButton('Lock suspicion', () => {
      if (!select.value) return;
      submit.disabled = true;
      void fetch('/api/spy/suspicions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: select.value }),
      }).then(async (submitResponse) => {
        const result: SpySuspicionResponse | { message?: string } = await submitResponse.json().catch(() => ({}));
        if (!submitResponse.ok || !('type' in result) || result.type !== 'spy-suspicion') {
          throw new Error('message' in result && result.message ? result.message : 'Submission failed.');
        }
        section.replaceChildren();
        appendText(section, 'h2', 'counterintelligence__title', 'Counterintelligence locked');
        appendText(section, 'p', 'game-state-screen__body', `Suspected infiltrator: u/${result.suspicion.suspectedUsername}`);
      }).catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : 'Submission failed.';
        submit.disabled = false;
      });
    });
    select.addEventListener('change', () => {
      submit.disabled = !select.value;
    });
    submit.disabled = true;
    section.append(select, submit);
  } catch {
    status.textContent = 'Counterintelligence candidates are temporarily unavailable.';
  }
}

function appendBattleMeta(panel: HTMLElement, bootstrap: BootstrapResponse) {
  const territory = bootstrap.battle?.activeTerritory;
  if (!territory) return;

  appendText(
    panel,
    'p',
    'game-state-screen__meta',
    `Active territory: ${territory.name} / owner: ${territory.owner}`,
  );
}

function renderBattleBriefing(panel: HTMLElement, bootstrap: BootstrapResponse) {
  const battle = bootstrap.battle;
  const territory = battle?.activeTerritory;
  if (!battle || !territory) return;
  const briefing = document.createElement('section');
  briefing.className = 'command-briefing';
  const image = document.createElement('img');
  image.className = 'command-briefing__image';
  image.src = getBattlefieldLocation(territory, null).image;
  image.alt = `${territory.name} battlefield`;
  const copy = document.createElement('div');
  appendText(copy, 'p', 'command-briefing__eyebrow', `TODAY'S FRONT · ${territory.id.toUpperCase()}`);
  appendText(copy, 'h2', 'command-briefing__title', territory.name);
  appendText(copy, 'p', 'game-state-screen__meta', `Current control: ${territory.owner.toUpperCase()} · Battle date: ${battle.battleDate}`);
  const actions = document.createElement('div');
  actions.className = 'command-briefing__actions';
  const army = bootstrap.user.spyAssignment?.coverArmy ?? bootstrap.user.army;
  const warRoomPermalink = army ? battle.warRoomPermalinks?.[army] : undefined;
  if (warRoomPermalink) {
    const warRoom = document.createElement('a');
    warRoom.className = 'game-state-screen__button';
    warRoom.href = warRoomPermalink;
    warRoom.target = '_blank';
    warRoom.rel = 'noreferrer';
    warRoom.textContent = 'Open War Room';
    actions.append(warRoom);
  }
  const map = createActionButton('Open global map', () => {
    document.getElementById('global-map-toggle')?.click();
  });
  const codex = createActionButton('Doctrine Codex', openDoctrineCodex);
  actions.append(map, codex);
  copy.append(actions);
  briefing.append(image, copy);
  panel.append(briefing);
}

function renderCountdownTimer(target: HTMLElement, bootstrap: BootstrapResponse) {
  if (!bootstrap.battle) return;

  const serverNowMs = new Date(bootstrap.serverNow).getTime();
  const clientStartedAtMs = Date.now();
  const resolvesAtMs = new Date(bootstrap.battle.resolvesAt).getTime();
  const updateCountdown = () => {
    const estimatedServerNowMs = serverNowMs + Date.now() - clientStartedAtMs;
    const secondsLeft = Math.ceil((resolvesAtMs - estimatedServerNowMs) / 1_000);

    target.textContent = formatDuration(secondsLeft);
  };

  updateCountdown();
  window.setInterval(updateCountdown, 1_000);
}

function renderStateScreen(bootstrap: BootstrapResponse) {
  const app = document.getElementById('app');
  if (!app) {
    startPhaserGame();
    return;
  }

  clearStateScreen();

  const screen = document.createElement('section');
  screen.className = 'game-state-screen';
  screen.setAttribute('aria-label', 'Daily battle state');

  const panel = document.createElement('div');
  panel.className = 'game-state-screen__panel';
  screen.append(panel);

  if (bootstrap.user.exists) {
    const profileButton = createActionButton(
      'My profile',
      () => void renderPlayerProfile(bootstrap.user.username),
    );
    profileButton.classList.add('game-state-screen__profile-button');
    panel.append(profileButton);
    const leaderboardButton = createActionButton('Leaderboard', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('leaderboard', 'global');
      window.history.replaceState({}, '', url);
      void renderGlobalLeaderboard();
    });
    leaderboardButton.classList.add('game-state-screen__profile-button');
    panel.append(leaderboardButton);
  }

  if (bootstrap.view === 'summary') {
    appendText(panel, 'h1', 'game-state-screen__title', 'Battle report');
    appendText(
      panel,
      'p',
      'game-state-screen__body',
      bootstrap.battle?.resultSummary ?? 'The AI has posted the result of the daily battle.',
    );
    if (bootstrap.battle?.result) {
      const result = bootstrap.battle.result;
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Green ${result.doctrines.green} / Blue ${result.doctrines.blue} / AI ${result.doctrines.ai}`,
      );
      const dailyReward = bootstrap.user.dailyReward;
      if (dailyReward) {
        const rewardPanel = document.createElement('section');
        rewardPanel.className = 'daily-reward';
        rewardPanel.setAttribute('aria-labelledby', 'daily-reward-title');

        const rankIcon = document.createElement('img');
        rankIcon.className = 'daily-reward__rank';
        rankIcon.src = `/assets/ranks/reddit-emoji-upload/hva_rank_${String(dailyReward.rankAfterLevel).padStart(2, '0')}.png`;
        rankIcon.alt = '';
        rewardPanel.append(rankIcon);

        const rewardCopy = document.createElement('div');
        appendText(rewardCopy, 'h2', 'daily-reward__title', 'Your battle rewards').id = 'daily-reward-title';
        appendText(
          rewardCopy,
          'p',
          'daily-reward__total',
          `+${dailyReward.xpAwarded} XP · ${dailyReward.xpBefore} → ${dailyReward.xpAfter}`,
        );
        appendText(
          rewardCopy,
          'p',
          'daily-reward__rank-copy',
          dailyReward.rankUp
            ? `RANK UP: ${dailyReward.rankBefore} → ${dailyReward.rankAfter}`
            : dailyReward.rankAfter,
        );

        const breakdown = document.createElement('dl');
        breakdown.className = 'daily-reward__breakdown';
        const rows: Array<[string, string]> = [
          ['Participation', `+${dailyReward.breakdown.participationXp}`],
          ['Activity', `+${dailyReward.breakdown.activityXp}`],
          ['Battle result', `+${dailyReward.breakdown.resultXp}`],
          ['Mission', `+${dailyReward.breakdown.missionXp}`],
          ['Streak multiplier', `×${dailyReward.breakdown.streakMultiplier.toFixed(2)}`],
          ['Comeback', `+${dailyReward.breakdown.comebackXp}`],
        ];
        for (const [label, value] of rows) {
          const term = document.createElement('dt');
          term.textContent = label;
          const description = document.createElement('dd');
          description.textContent = value;
          breakdown.append(term, description);
        }
        rewardCopy.append(breakdown);

        if (dailyReward.newMedals.length > 0) {
          appendText(
            rewardCopy,
            'p',
            'daily-reward__medals',
            `New medals: ${dailyReward.newMedals.join(' · ')}`,
          );
        }
        rewardPanel.append(rewardCopy);
        panel.append(rewardPanel);
      } else if (bootstrap.user.rewards) {
        appendText(panel, 'p', 'game-state-screen__meta', `Total XP: ${bootstrap.user.rewards.xp} · ${bootstrap.user.rewards.rank}`);
      }
    }

    if (bootstrap.battle) {
      const link = document.createElement('a');
      link.className = 'game-state-screen__button';
      link.href = bootstrap.battle.postPermalink;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open post';
      panel.append(link);
      void renderDailyLeaderboard(panel, bootstrap.battle.id);
    }
  } else if (bootstrap.view === 'countdown') {
    panel.classList.add('game-state-screen__panel--command');
    appendText(panel, 'h1', 'game-state-screen__title', 'Daily battle is live');
    const timer = appendText(panel, 'p', 'game-state-screen__timer', '');
    renderBattleBriefing(panel, bootstrap);
    appendBattleMeta(panel, bootstrap);
    if (bootstrap.user.participant) {
      const participant = bootstrap.user.participant;
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Assigned army: ${participant.assignedArmy.toUpperCase()} / power ${participant.powerSnapshot.total} / ${participant.powerSnapshot.rank}`,
      );
    }
    if (bootstrap.user.spyAssignment) {
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Spy assignment: your public flair is ${bootstrap.user.spyAssignment.coverArmy.toUpperCase()}, but your order counts for your assigned army. Objective: ${bootstrap.user.spyAssignment.objective}`,
      );
    }
    if (bootstrap.battle) {
      const balance = bootstrap.battle.armyBalance;
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Army power: Green ${balance.green.totalPower} (${balance.green.participantCount}) / Blue ${balance.blue.totalPower} (${balance.blue.participantCount})`,
      );
    }
    if (bootstrap.user.order) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        `Order locked: ${bootstrap.user.order.army.toUpperCase()} / ${bootstrap.user.order.doctrineId}. AI result posts at 21:00 ET.`,
      );
    } else {
      void renderOrderComposer(panel);
    }
    if (bootstrap.user.spySuspicion) {
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Counterintelligence locked: u/${bootstrap.user.spySuspicion.suspectedUsername}`,
      );
    } else if (bootstrap.user.participating) {
      void renderCounterintelligence(panel);
    }
    renderCountdownTimer(timer, bootstrap);
  } else {
    appendText(panel, 'h1', 'game-state-screen__title', 'Join humanity');
    appendText(
      panel,
      'p',
      'game-state-screen__body',
      'Join today\'s event. The system immediately assigns you to the weaker army and applies your temporary team flair.',
    );
    const button = createActionButton('Join today\'s event', () => {
      void joinDailyEvent(panel, button);
    });
    panel.append(button);
  }

  app.append(screen);
  stateScreenElement = screen;
}

async function loadExpandedState() {
  try {
    const response = await fetch('/api/bootstrap');
    if (!response.ok) {
      startPhaserGame();
      return;
    }

    const bootstrap: BootstrapResponse = await response.json();
    renderStateScreen(bootstrap);
  } catch {
    startPhaserGame();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupGlobalMap();

  try {
    await document.fonts.load('16px "VT323"');
    await document.fonts.ready;
  } catch {
    // Start with the CSS fallback if the Google Fonts request is unavailable.
  }

  const sharedProfile = new URL(window.location.href).searchParams.get('profile');
  const sharedBattle = new URL(window.location.href).searchParams.get('battle');
  const sharedLeaderboard = new URL(window.location.href).searchParams.get('leaderboard');
  if (sharedProfile) await renderPlayerProfile(sharedProfile);
  else if (sharedBattle) await renderPublicBattleResult(sharedBattle);
  else if (sharedLeaderboard === 'global') await renderGlobalLeaderboard();
  else await loadExpandedState();
});

window.addEventListener('humans-vs-ai:player-joined', () => {
  stopPhaserGame();
  void loadExpandedState();
});
