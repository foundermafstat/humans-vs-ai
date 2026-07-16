import { context, requestExpandedMode } from '@devvit/web/client';
import * as Phaser from 'phaser';
import { AUTO, Game as PhaserGame, Scene } from 'phaser';
import type {
  AiReportResponse,
  BootstrapResponse,
  DivisionCommentAnalysisResponse,
  DivisionTarget,
  GlobalMapResponse,
  GlobalMapTerritoryView,
} from '../shared/api';
import { getBattlefieldLocation, type BattlefieldLocation } from './battlefieldLocations';
import {
  BattlefieldNavigator,
  getNavigationPlanDelay,
  getRoundRobinIndex,
  prioritizeStalledNavigationPlan,
  projectNavigationObstacles,
  type NavigationPoint as ScreenPoint,
} from './battlefieldNavigation';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const testMessageButton = document.getElementById('test-message-button') as HTMLButtonElement;
const commentsGreenButton = document.getElementById('comments-green-button') as HTMLButtonElement;
const commentsBlueButton = document.getElementById('comments-blue-button') as HTMLButtonElement;
const dayLeaderboardButton = document.getElementById('day-leaderboard-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const stateDetailElement = document.getElementById('state-detail') as HTMLParagraphElement;
const gameLogoElement = document.getElementById('game-logo') as HTMLImageElement;
const awardsElement = document.querySelector('.splash-awards') as HTMLImageElement;
const tickerTrackElement = document.querySelector('.stats-ticker__track') as HTMLDivElement;
const summaryMapElement = document.getElementById('summary-map') as HTMLElement;
const summaryMapGridElement = document.getElementById('summary-map-grid') as HTMLDivElement;

const ARMY_VARIANTS = [
  'man_african',
  'man_asian',
  'man_european',
  'man_latino',
  'woman_african',
  'woman_asian',
  'woman_european',
  'woman_latino',
] as const;

type ArmyVariant = (typeof ARMY_VARIANTS)[number];
const AI_VARIANTS = ['variant_1', 'variant_2', 'variant_3'] as const;

type AiVariant = (typeof AI_VARIANTS)[number];
type SoldierVariant = ArmyVariant | AiVariant;
type ArmySource = 'blue' | 'green' | 'ai';
type ArmyTeam = ArmySource;
type SpawnEdge = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'top-center';
type SoldierState = 'march' | 'shoot' | 'dead';
type FxGroup = keyof typeof FX_SPRITES;
type FxOptions = {
  alpha?: number;
  depth?: number;
  driftX?: number;
  driftY?: number;
  duration?: number;
  grow?: number;
  rotation?: number;
  scale?: number;
};
type ArmyConfig = {
  team: ArmyTeam;
  source: ArmySource;
  spawnEdges: readonly SpawnEdge[];
  maxAlive: number;
  spawnEvery: number;
  firstDelay: number;
  bulletColor: number;
};

type BattleSoldier = {
  team: ArmyTeam;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  arms: Phaser.GameObjects.Image;
  state: SoldierState;
  hp: number;
  size: number;
  speed: number;
  range: number;
  nextShotAt: number;
  nextGrenadeAt: number;
  facing: 1 | -1;
  age: number;
  bodyBaseX: number;
  bodyBaseY: number;
  armsBaseX: number;
  armsBaseY: number;
  lockedTarget?: BattleSoldier;
  redirectToCenterUntil?: number;
  navigationPath: ScreenPoint[];
  navigationTarget?: ScreenPoint;
  nextPathfindAt: number;
  lastProgressPoint: ScreenPoint;
  lastProgressAt: number;
  stuckReplans: number;
  bulletColor: number;
};

const BATTLEFIELD_KEY = 'splash-battlefield';
const FX_ASSET_VERSION = '2026-06-29-fire-hotbase';
const FIELD_PARENT_ID = 'battlefield-scene';
const GAME_LOGO = '/assets/logo1.webp';
const SPLASH_LAUNCH_TARGET_KEY = 'humans-vs-ai:splash-launch-target';
const devToolsEnabled = new URLSearchParams(window.location.search).get('dev') === '1';
let countdownInterval: number | undefined;
let activeBattlefieldLocation: BattlefieldLocation = getBattlefieldLocation(undefined, null);

function formatDuration(totalMilliseconds: number) {
  const milliseconds = Math.max(0, Math.floor(totalMilliseconds));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const remainder = milliseconds % 1_000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(remainder).padStart(3, '0')}`;
}

function clearCountdown() {
  if (countdownInterval === undefined) return;

  window.clearInterval(countdownInterval);
  countdownInterval = undefined;
}

function setSplashLaunchTarget(target?: 'daily-leaderboard') {
  try {
    if (target) sessionStorage.setItem(SPLASH_LAUNCH_TARGET_KEY, target);
    else sessionStorage.removeItem(SPLASH_LAUNCH_TARGET_KEY);
  } catch {
    // Continue into expanded mode when storage is unavailable.
  }
}

function renderPromo() {
  clearCountdown();
  document.body.dataset.splashView = 'promo';
  awardsElement.hidden = false;
  dayLeaderboardButton.hidden = true;
  titleElement.textContent = `Join the ranks of humanity, ${context?.username ?? 'fighter'}`;
  stateDetailElement.hidden = false;
  stateDetailElement.textContent = 'A new 7-doctrine war starts inside this post.';
  startButton.textContent = 'Start';
}

function renderCountdown(bootstrap: BootstrapResponse) {
  clearCountdown();

  if (!bootstrap.battle) {
    renderPromo();
    return;
  }

  const serverNowMs = new Date(bootstrap.serverNow).getTime();
  const clientStartedAtMs = Date.now();
  const resolvesAtMs = new Date(bootstrap.battle.resolvesAt).getTime();
  const updateCountdown = () => {
    const estimatedServerNowMs = serverNowMs + Date.now() - clientStartedAtMs;
    titleElement.textContent = `Daily battle ends in ${formatDuration(resolvesAtMs - estimatedServerNowMs)}`;
  };

  document.body.dataset.splashView = 'countdown';
  awardsElement.hidden = true;
  dayLeaderboardButton.hidden = true;
  updateCountdown();
  stateDetailElement.hidden = false;
  countdownInterval = window.setInterval(updateCountdown, 31);
  stateDetailElement.textContent = bootstrap.battle.activeTerritory
    ? `${bootstrap.battle.activeTerritory.name} is active. Owner: ${bootstrap.battle.activeTerritory.owner}.`
    : 'AI result posts at 21:00 ET.';
  startButton.textContent = bootstrap.user.participating ? 'Open' : 'Open to join';
}

function renderSummary() {
  clearCountdown();
  document.body.dataset.splashView = 'summary';
  awardsElement.hidden = true;
  dayLeaderboardButton.hidden = false;
  titleElement.textContent = 'Battle report is ready';
  stateDetailElement.textContent = '';
  stateDetailElement.hidden = true;
  startButton.textContent = 'View report';
}

function renderTicker(bootstrap: BootstrapResponse, map: GlobalMapResponse | undefined) {
  const territories = map?.territories ?? [];
  const total = territories.length;
  const counts = { green: 0, blue: 0, ai: 0, contested: 0 };
  for (const territory of territories) counts[territory.owner] += 1;
  const percent = (count: number) => total === 0 ? '0.0' : ((count / total) * 100).toFixed(1);
  const message = [
    `REGISTERED PLAYERS: ${bootstrap.registeredPlayerCount}`,
    `MAP CONTROLLED: ${total - counts.contested}/${total}`,
    `GREEN: ${counts.green} (${percent(counts.green)}%)`,
    `BLUE: ${counts.blue} (${percent(counts.blue)}%)`,
    `AI: ${counts.ai} (${percent(counts.ai)}%)`,
    `CONTESTED: ${counts.contested} (${percent(counts.contested)}%)`,
  ].join('  |  ');
  tickerTrackElement.textContent = `${message}  |  ${message}  |  `;
}

function latestPost(territory: GlobalMapTerritoryView) {
  return territory.history.find((capture) => capture.postPermalink)?.postPermalink;
}

function renderSummaryMap(map: GlobalMapResponse, battleId: string | undefined) {
  summaryMapGridElement.replaceChildren();
  summaryMapGridElement.style.setProperty('--summary-columns', String(map.columns));
  summaryMapGridElement.style.setProperty('--summary-rows', String(map.rows));

  for (const territory of map.territories) {
    const postPermalink = latestPost(territory);
    const cell = document.createElement(postPermalink ? 'a' : 'span');
    cell.className = 'summary-map__cell';
    cell.style.gridColumn = String(territory.column);
    cell.style.gridRow = String(territory.row);
    cell.title = `${territory.name} — ${territory.owner}`;
    const changedThisCycle = territory.history.some((capture) => capture.battleId === battleId);
    cell.classList.toggle('summary-map__cell--latest', changedThisCycle);
    if (changedThisCycle) cell.classList.add(`summary-map__cell--${territory.owner}`);
    if (cell instanceof HTMLAnchorElement && postPermalink) {
      cell.href = postPermalink;
      cell.target = '_blank';
      cell.rel = 'noreferrer';
      cell.setAttribute('aria-label', `Open the latest battle post for ${territory.name}`);
    }
    summaryMapGridElement.append(cell);
  }
  summaryMapElement.hidden = false;
}

async function loadBattleState(): Promise<{ bootstrap?: BootstrapResponse; map?: GlobalMapResponse }> {
  try {
    const [response, mapResponse] = await Promise.all([fetch('/api/bootstrap'), fetch('/api/global-map')]);
    if (!response.ok) {
      renderPromo();
      return {};
    }

    const bootstrap: BootstrapResponse = await response.json();
    const map: GlobalMapResponse | undefined = mapResponse.ok ? await mapResponse.json() : undefined;
    renderTicker(bootstrap, map);

    if (bootstrap.view === 'summary') {
      renderSummary();
      if (map) renderSummaryMap(map, bootstrap.battle?.id);
      return map ? { bootstrap, map } : { bootstrap };
    }

    if (bootstrap.view === 'countdown') {
      renderCountdown(bootstrap);
      return map ? { bootstrap, map } : { bootstrap };
    }

    renderPromo();
    return map ? { bootstrap, map } : { bootstrap };
  } catch {
    renderPromo();
    return {};
  }
}

async function postTestMessage() {
  const originalLabel = testMessageButton.textContent ?? 'Test message';
  testMessageButton.disabled = true;
  testMessageButton.textContent = 'Posting...';

  try {
    const response = await fetch('/api/ai/test-message', {
      method: 'POST',
    });
    const body: AiReportResponse | { message?: string } = await response.json().catch(() => ({}));

    if (!response.ok) {
      stateDetailElement.textContent = body.message ?? 'AI test message failed.';
      return;
    }

    stateDetailElement.textContent = 'AI test report posted to the AI branch.';
  } catch {
    stateDetailElement.textContent = 'AI test message failed.';
  } finally {
    testMessageButton.disabled = false;
    testMessageButton.textContent = originalLabel;
  }
}

async function postCommentsAnalysis(target: DivisionTarget, button: HTMLButtonElement) {
  const originalLabel = button.textContent ?? 'Comments';
  const label = target === 'green' ? 'Green' : 'Blue';
  button.disabled = true;
  button.textContent = 'Analyzing...';

  try {
    const response = await fetch('/api/ai/comments-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target }),
    });
    const body: DivisionCommentAnalysisResponse | { message?: string } = await response.json().catch(() => ({}));

    if (!response.ok) {
      stateDetailElement.textContent = body.message ?? `${label} comments analysis failed.`;
      return;
    }

    stateDetailElement.textContent = `AI ${label} comments analysis posted to the AI branch.`;
  } catch {
    stateDetailElement.textContent = `${label} comments analysis failed.`;
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

const BODY_OFFSETS: Record<ArmySource, { x: number; y: number }> = {
  blue: { x: -18, y: 22 },
  green: { x: -18, y: 25 },
  ai: { x: -13, y: 24 },
};
const ARMS_OFFSETS: Record<ArmySource, { x: number; y: number }> = {
  blue: { x: -43, y: 31 },
  green: { x: -45, y: 34 },
  ai: { x: -32, y: 30 },
};
const MUZZLE_X = 80;
const MUZZLE_Y = 16;
const ARMS_ATTACHMENT_INSET = 4;
const AI_BODY_SCALE = 1.1;
const SOLDIER_VISUAL_SCALE = 0.2;
const SOLDIER_HP = 6;
const SPAWN_GUARD_RANGE_MULTIPLIER = 2;
const SPAWN_GUARD_REDIRECT_MS = 900;
const NAVIGATION_REPATH_MS = 3000;
const NAVIGATION_RETRY_MS = 140;
const NAVIGATION_TARGET_DRIFT = 112;
const NAVIGATION_WAYPOINT_REACHED = 14;
const NAVIGATION_STUCK_MS = 700;
const NAVIGATION_EDGE_EXTENSION = 120;
const NAVIGATION_RESIZE_DEBOUNCE_MS = 120;
const MAX_NAVIGATION_PLANS_PER_FRAME = 5;
const MAX_TARGET_SEARCHES_PER_FRAME = 32;
const SHOT_COOLDOWN = { min: 260, max: 520 };
const GRENADE_COOLDOWN = { min: 12600, max: 21600 };
const FX_SPRITES = {
  muzzle: ['muzzle_flash_01', 'muzzle_flash_02', 'muzzle_flash_03', 'muzzle_flash_04', 'muzzle_flash_05'],
  smoke: ['smoke_01', 'smoke_02', 'smoke_03'],
  explosion: ['explosion_01', 'explosion_02', 'explosion_03', 'explosion_04', 'explosion_05'],
  grenade: ['grenade_01', 'grenade_02', 'grenade_fire_01', 'grenade_fire_02'],
  fire: ['fire_01', 'fire_02', 'fire_03', 'fire_04', 'fire_05'],
  casing: ['casing_01', 'casing_02', 'casing_03', 'casing_04'],
  impact: ['impact_01', 'impact_02', 'impact_03', 'impact_04'],
  dust: ['dust_01', 'dust_02', 'dust_03', 'dust_04'],
  scorch: ['scorch_01', 'scorch_02', 'scorch_03', 'scorch_04'],
  burnFire: ['burn_fire_01', 'burn_fire_02', 'burn_fire_03', 'burn_fire_04'],
  burnSmoke: ['burn_smoke_01', 'burn_smoke_02', 'burn_smoke_03', 'burn_smoke_04'],
  burnCrater: ['burn_crater_01', 'burn_crater_02', 'burn_crater_03', 'burn_crater_04'],
} as const;
const SOURCE_ARMIES: ArmySource[] = ['blue', 'green', 'ai'];
const ARMY_CONFIGS: ArmyConfig[] = [
  {
    team: 'blue',
    source: 'blue',
    spawnEdges: ['bottom-right'],
    maxAlive: 144,
    spawnEvery: 317,
    firstDelay: 200,
    bulletColor: 0x65c7ff,
  },
  {
    team: 'green',
    source: 'green',
    spawnEdges: ['bottom-left'],
    maxAlive: 144,
    spawnEvery: 317,
    firstDelay: 450,
    bulletColor: 0x75d66b,
  },
  {
    team: 'ai',
    source: 'ai',
    spawnEdges: ['top-center', 'top-left', 'top-right'],
    maxAlive: 432,
    spawnEvery: 173,
    firstDelay: 800,
    bulletColor: 0xff4c4c,
  },
];

function assetKey(source: ArmySource, part: 'body' | 'arms', variant: SoldierVariant) {
  return `splash-${source}-${part}-${variant}`;
}

function assetPath(source: ArmySource, part: 'body' | 'arms', variant: SoldierVariant) {
  if (source === 'ai') {
    return `/assets/army/ai/${variant}/${part === 'body' ? 'body.webp' : 'arms_with_weapon.webp'}`;
  }

  const folder = part === 'body' ? 'bodies' : 'arms_with_rifle';
  return `/assets/army/players/${source}/${folder}/${variant}.webp`;
}

function variantsFor(source: ArmySource): readonly SoldierVariant[] {
  return source === 'ai' ? AI_VARIANTS : ARMY_VARIANTS;
}

function fxKey(name: string) {
  return `splash-fx-${name}`;
}

function pick<T>(items: readonly T[]) {
  const fallback = items[0];
  if (fallback === undefined) throw new Error('Empty collection');

  return items[Phaser.Math.Between(0, items.length - 1)] ?? fallback;
}

function setupGameLogo() {
  gameLogoElement.src = GAME_LOGO;
}

class SplashBattleScene extends Scene {
  private background?: Phaser.GameObjects.Image;
  private soldiers: BattleSoldier[] = [];
  private navigator: BattlefieldNavigator | undefined;
  private navigationPlansThisFrame = 0;
  private targetSearchesThisFrame = 0;
  private soldierUpdateCursor = 0;
  private navigationResizeTimer: Phaser.Time.TimerEvent | undefined;

  constructor() {
    super('SplashBattleScene');
  }

  preload() {
    this.load.image(BATTLEFIELD_KEY, activeBattlefieldLocation.image);

    for (const source of SOURCE_ARMIES) {
      for (const variant of variantsFor(source)) {
        this.load.image(assetKey(source, 'body', variant), assetPath(source, 'body', variant));
        this.load.image(assetKey(source, 'arms', variant), assetPath(source, 'arms', variant));
      }
    }

    for (const group of Object.values(FX_SPRITES)) {
      for (const name of group) {
        this.load.image(fxKey(name), `/assets/fx/sprites/${name}.webp?v=${FX_ASSET_VERSION}`);
      }
    }
  }

  create() {
    this.background = this.add.image(0, 0, BATTLEFIELD_KEY).setOrigin(0.5).setDepth(-1000);
    this.handleResize(this.scale.gameSize);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.navigationResizeTimer?.remove(false);
    });

    for (const config of ARMY_CONFIGS) {
      this.time.delayedCall(config.firstDelay, () => {
        this.spawnSoldier(config);
        this.time.addEvent({
          delay: config.spawnEvery,
          loop: true,
          callback: () => this.spawnSoldier(config),
        });
      });
    }
  }

  override update(time: number, delta: number) {
    const dt = delta / 1000;
    this.navigationPlansThisFrame = 0;
    this.targetSearchesThisFrame = 0;
    const soldierCount = this.soldiers.length;
    if (soldierCount === 0) return;

    const startIndex = this.soldierUpdateCursor % soldierCount;
    for (let offset = 0; offset < soldierCount; offset += 1) {
      const soldier = this.soldiers[getRoundRobinIndex(startIndex, offset, soldierCount)];
      if (!soldier) continue;
      if (soldier.state !== 'dead') {
        this.updateSoldier(soldier, time, dt);
      }
    }

    this.soldierUpdateCursor = getRoundRobinIndex(
      startIndex,
      MAX_TARGET_SEARCHES_PER_FRAME,
      soldierCount,
    );
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);

    if (this.background) {
      const scale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setPosition(width / 2, height / 2).setScale(scale);
      if (!this.navigator) {
        this.rebuildNavigation();
      } else {
        this.navigationResizeTimer?.remove(false);
        this.navigationResizeTimer = this.time.delayedCall(NAVIGATION_RESIZE_DEBOUNCE_MS, () => {
          this.navigationResizeTimer = undefined;
          this.rebuildNavigation();
        });
      }
    }
  }

  private spawnSoldier(config: ArmyConfig) {
    if (this.countAlive(config.team) >= config.maxAlive) return;

    const variants = variantsFor(config.source);
    const variant = variants[Phaser.Math.Between(0, variants.length - 1)];
    if (!variant) return;

    const requestedSpawn = this.getSpawnPoint(pick(config.spawnEdges));
    const spawnTarget = { x: this.scale.width / 2, y: this.scale.height / 2 };
    const spawn =
      this.navigator?.nearestReachablePerimeterPoint(requestedSpawn, spawnTarget) ??
      this.navigator?.nearestReachablePoint(requestedSpawn, spawnTarget) ??
      this.navigator?.nearestWalkablePoint(requestedSpawn) ??
      requestedSpawn;
    const bodyOffset = BODY_OFFSETS[config.source];
    const armsOffset = ARMS_OFFSETS[config.source];
    const size = Phaser.Math.FloatBetween(1.35, 1.7) * SOLDIER_VISUAL_SCALE;
    const body = this.add
      .image(bodyOffset.x, bodyOffset.y, assetKey(config.source, 'body', variant))
      .setOrigin(0.5, 0.5);
    body.setScale(config.source === 'ai' ? AI_BODY_SCALE : 1);
    const arms = this.add.image(armsOffset.x, armsOffset.y, assetKey(config.source, 'arms', variant));
    arms.setOrigin(ARMS_ATTACHMENT_INSET / arms.width, ARMS_ATTACHMENT_INSET / arms.height);
    const container = this.add.container(spawn.x, spawn.y, [body, arms]).setDepth(spawn.y);

    container.setScale(size);

    this.soldiers.push({
      team: config.team,
      container,
      body,
      arms,
      state: 'march',
      hp: SOLDIER_HP,
      size,
      speed: Phaser.Math.FloatBetween(34, 54),
      range: Phaser.Math.FloatBetween(123, 157),
      nextShotAt: this.time.now + Phaser.Math.Between(SHOT_COOLDOWN.min, SHOT_COOLDOWN.max),
      nextGrenadeAt: this.time.now + Phaser.Math.Between(GRENADE_COOLDOWN.min, GRENADE_COOLDOWN.max),
      facing: 1,
      age: Phaser.Math.FloatBetween(0, 10),
      bodyBaseX: bodyOffset.x,
      bodyBaseY: bodyOffset.y,
      armsBaseX: armsOffset.x,
      armsBaseY: armsOffset.y,
      navigationPath: [],
      nextPathfindAt: this.time.now + (this.soldiers.length % 11) * 29,
      lastProgressPoint: { ...spawn },
      lastProgressAt: this.time.now,
      stuckReplans: 0,
      bulletColor: config.bulletColor,
    });
  }

  private updateSoldier(soldier: BattleSoldier, time: number, dt: number) {
    soldier.age += dt;

    if (soldier.redirectToCenterUntil && time < soldier.redirectToCenterUntil) {
      soldier.state = 'march';
      delete soldier.lockedTarget;
      this.moveTowardMapCenter(soldier, dt);
      this.holdWeaponLevel(soldier, dt);
      this.playStep(soldier);
      return;
    }

    delete soldier.redirectToCenterUntil;

    const target = this.getLockedTarget(soldier);
    if (!target) {
      soldier.state = 'march';
      soldier.container.setDepth(soldier.container.y);
      this.moveTowardMapCenter(soldier, dt);
      this.holdWeaponLevel(soldier, dt);
      this.playStep(soldier);
      return;
    }

    const targetPoint = this.getBodyPoint(target);
    const dx = targetPoint.x - soldier.container.x;
    const dy = targetPoint.y - soldier.container.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    soldier.facing = dx >= 0 ? 1 : -1;
    soldier.container.setScale(soldier.facing * soldier.size, soldier.size);
    soldier.container.setDepth(soldier.container.y);

    if (distance > soldier.range) {
      soldier.state = 'march';
      if (!this.moveSoldierToward(soldier, targetPoint, dt, true)) {
        delete soldier.lockedTarget;
        this.clearNavigation(soldier);
        soldier.redirectToCenterUntil = time + SPAWN_GUARD_REDIRECT_MS;
        this.moveTowardMapCenter(soldier, dt);
      }
      this.holdWeaponLevel(soldier, dt);
      this.playStep(soldier);
      return;
    }

    soldier.state = 'shoot';
    soldier.body.setPosition(soldier.bodyBaseX, soldier.bodyBaseY);
    soldier.arms.setPosition(soldier.armsBaseX, soldier.armsBaseY + Math.sin(soldier.age * 5.2) * 2);
    soldier.arms.setRotation(this.rotateToward(soldier.arms.rotation, this.getAimRotation(soldier, targetPoint), dt * 7.5));

    if (time >= soldier.nextShotAt) {
      soldier.nextShotAt = time + Phaser.Math.Between(SHOT_COOLDOWN.min, SHOT_COOLDOWN.max);
      this.shoot(soldier, target);
    }

    if (time >= soldier.nextGrenadeAt) {
      soldier.nextGrenadeAt = time + Phaser.Math.Between(GRENADE_COOLDOWN.min, GRENADE_COOLDOWN.max);
      this.launchGrenade(soldier, target);
    }
  }

  private playStep(soldier: BattleSoldier) {
    const hop = Math.abs(Math.sin(soldier.age * 9.5));
    soldier.body.setPosition(soldier.bodyBaseX + Math.sin(soldier.age * 5) * 1.5, soldier.bodyBaseY - hop * 7);
  }

  private holdWeaponLevel(soldier: BattleSoldier, dt: number) {
    soldier.arms.setPosition(soldier.armsBaseX, soldier.armsBaseY);
    soldier.arms.setRotation(this.rotateToward(soldier.arms.rotation, 0, dt * 6));
  }

  private findTarget(soldier: BattleSoldier) {
    if (this.targetSearchesThisFrame >= MAX_TARGET_SEARCHES_PER_FRAME) return undefined;
    this.targetSearchesThisFrame += 1;
    let closest: BattleSoldier | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    const from = { x: soldier.container.x, y: soldier.container.y };

    for (const target of this.soldiers) {
      if (target.team === soldier.team || target.state === 'dead') continue;

      const point = this.getBodyPoint(target);
      const distance = Phaser.Math.Distance.Between(soldier.container.x, soldier.container.y, point.x, point.y);
      if (distance >= closestDistance) continue;
      if (this.navigator && !this.navigator.isReachable(from, point)) continue;
      closest = target;
      closestDistance = distance;
    }

    return closest;
  }

  private getLockedTarget(soldier: BattleSoldier) {
    const lockedTarget = soldier.lockedTarget;
    if (lockedTarget && lockedTarget.team !== soldier.team && lockedTarget.state !== 'dead') {
      return lockedTarget;
    }

    delete soldier.lockedTarget;
    const nextTarget = this.findTarget(soldier);
    if (nextTarget) {
      soldier.lockedTarget = nextTarget;
      this.clearNavigation(soldier);
    }

    return nextTarget;
  }

  private shoot(soldier: BattleSoldier, target: BattleSoldier) {
    if (target.state === 'dead') return;

    const muzzle = this.getMuzzlePoint(soldier);
    const targetPoint = this.getBodyPoint(target);
    const shotRotation = Math.atan2(targetPoint.y - muzzle.y, targetPoint.x - muzzle.x);
    this.playMuzzleFlash(muzzle.x, muzzle.y, shotRotation);
    this.spawnCasing(soldier, muzzle.x, muzzle.y);
    this.playImpact(targetPoint.x, targetPoint.y);

    this.damageSoldier(target, 1);
  }

  private damageSoldier(soldier: BattleSoldier, amount: number) {
    if (soldier.state === 'dead') return;

    soldier.hp -= amount;
    if (soldier.hp <= 0) {
      this.killSoldier(soldier);
    }
  }

  private killSoldier(soldier: BattleSoldier) {
    soldier.state = 'dead';
    soldier.arms.setRotation(0);
    soldier.arms.setPosition(soldier.armsBaseX, soldier.armsBaseY);
    soldier.body.setPosition(soldier.bodyBaseX, soldier.bodyBaseY);
    soldier.container.setDepth(soldier.container.y - 20);
    this.playExplosion(soldier.container.x, soldier.container.y);

    this.tweens.add({
      targets: soldier.container,
      rotation: soldier.facing === 1 ? Math.PI / 2 : -Math.PI / 2,
      y: soldier.container.y + 18,
      alpha: 0.76,
      duration: 360,
      ease: 'Quad.easeOut',
    });

    this.time.delayedCall(3200, () => {
      this.soldiers = this.soldiers.filter((item) => item !== soldier);
      soldier.container.destroy();
    });
  }

  private createFx(group: FxGroup, x: number, y: number, options: FxOptions = {}) {
    const scale = options.scale ?? 0.16;
    const fx = this.add
      .image(x, y, fxKey(pick(FX_SPRITES[group])))
      .setAlpha(options.alpha ?? 1)
      .setDepth(options.depth ?? 2100)
      .setRotation(options.rotation ?? 0)
      .setScale(scale);

    this.tweens.add({
      targets: fx,
      alpha: 0,
      x: x + (options.driftX ?? 0),
      y: y + (options.driftY ?? 0),
      scale: scale * (options.grow ?? 1.35),
      duration: options.duration ?? 260,
      ease: 'Quad.easeOut',
      onComplete: () => fx.destroy(),
    });

    return fx;
  }

  private playMuzzleFlash(x: number, y: number, rotation: number) {
    this.createFx('muzzle', x, y, {
      depth: 2300,
      duration: 95,
      grow: 1.55,
      rotation,
      scale: Phaser.Math.FloatBetween(0.08, 0.13),
    });
    this.createFx('smoke', x, y, {
      alpha: 0.7,
      depth: 2200,
      driftX: Phaser.Math.Between(-4, 4),
      driftY: Phaser.Math.Between(-8, 2),
      duration: 420,
      grow: 1.8,
      scale: Phaser.Math.FloatBetween(0.035, 0.055),
    });
  }

  private spawnCasing(soldier: BattleSoldier, x: number, y: number) {
    const casing = this.add
      .image(x - soldier.facing * soldier.size * 28, y + soldier.size * 4, fxKey(pick(FX_SPRITES.casing)))
      .setDepth(2301)
      .setRotation(Phaser.Math.FloatBetween(-0.7, 0.7))
      .setScale(Phaser.Math.FloatBetween(0.035, 0.055));

    this.tweens.add({
      targets: casing,
      x: casing.x - soldier.facing * Phaser.Math.Between(10, 18),
      y: casing.y + Phaser.Math.Between(8, 18),
      rotation: casing.rotation + Phaser.Math.FloatBetween(-3.2, 3.2),
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => casing.destroy(),
    });
  }

  private playImpact(x: number, y: number) {
    this.createFx('impact', x, y, {
      depth: 2250,
      duration: 140,
      grow: 1.2,
      rotation: Phaser.Math.FloatBetween(-0.4, 0.4),
      scale: Phaser.Math.FloatBetween(0.08, 0.13),
    });

    if (Phaser.Math.Between(1, 100) <= 45) {
      this.createFx('dust', x, y + Phaser.Math.Between(2, 8), {
        alpha: 0.75,
        depth: 2100,
        driftX: Phaser.Math.Between(-5, 5),
        driftY: Phaser.Math.Between(-2, 6),
        duration: 420,
        grow: 1.45,
        scale: Phaser.Math.FloatBetween(0.06, 0.11),
      });
    }
  }

  private playExplosion(x: number, y: number) {
    this.createFx('explosion', x, y, {
      depth: 2400,
      duration: 320,
      grow: 1.5,
      rotation: Phaser.Math.FloatBetween(-0.2, 0.2),
      scale: Phaser.Math.FloatBetween(0.16, 0.24),
    });
    this.createFx('fire', x + Phaser.Math.Between(-5, 5), y + Phaser.Math.Between(-3, 7), {
      depth: 2350,
      duration: 380,
      grow: 1.35,
      rotation: Phaser.Math.FloatBetween(-0.4, 0.4),
      scale: Phaser.Math.FloatBetween(0.09, 0.15),
    });
    this.createFx('dust', x, y + 8, {
      alpha: 0.8,
      depth: 2200,
      duration: 620,
      grow: 1.75,
      scale: Phaser.Math.FloatBetween(0.13, 0.19),
    });
    this.time.delayedCall(110, () => {
      this.createFx('smoke', x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-10, 4), {
        alpha: 0.78,
        depth: 2300,
        driftX: Phaser.Math.Between(-10, 10),
        driftY: Phaser.Math.Between(-18, -6),
        duration: 840,
        grow: 1.9,
        scale: Phaser.Math.FloatBetween(0.08, 0.14),
      });
    });
  }

  private launchGrenade(soldier: BattleSoldier, target: BattleSoldier) {
    if (target.state === 'dead') return;

    const from = this.getBodyPoint(soldier);
    const targetPoint = this.getBodyPoint(target);
    const to = {
      x: targetPoint.x + Phaser.Math.Between(-32, 32),
      y: targetPoint.y + Phaser.Math.Between(-24, 24),
    };
    const mid = {
      x: (from.x + to.x) / 2,
      y: Math.min(from.y, to.y) - Phaser.Math.Between(70, 120),
    };
    const grenade = this.add
      .image(from.x, from.y - 8, fxKey(pick(FX_SPRITES.grenade)))
      .setDepth(2450)
      .setScale(0.07);

    this.tweens.add({
      targets: grenade,
      x: mid.x,
      y: mid.y,
      rotation: Phaser.Math.FloatBetween(-3, 3),
      duration: 380,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: grenade,
      x: to.x,
      y: to.y,
      rotation: Phaser.Math.FloatBetween(-8, 8),
      duration: 430,
      delay: 380,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const x = grenade.x;
        const y = grenade.y;
        grenade.destroy();
        this.playExplosion(x, y);
        this.createGrenadeAftermath(x, y);
        this.killAreaByGrenade(x, y, 72, soldier.team);
      },
    });
  }

  private createGrenadeAftermath(x: number, y: number) {
    const scorch = this.add
      .image(x, y + 4, fxKey(pick(FX_SPRITES.scorch)))
      .setDepth(y - 30)
      .setAlpha(0.82)
      .setScale(Phaser.Math.FloatBetween(0.2, 0.26));

    this.tweens.add({
      targets: scorch,
      alpha: 0.38,
      duration: 28000,
      ease: 'Sine.easeOut',
      onComplete: () => scorch.destroy(),
    });

    this.createLoopingFx(FX_SPRITES.burnFire, x, y - 6, {
      depth: 2320,
      frameDelay: 130,
      lifetime: 12000,
      scale: Phaser.Math.FloatBetween(0.1, 0.14),
    });
    this.createLoopingFx(FX_SPRITES.burnSmoke, x + Phaser.Math.Between(-4, 4), y - 24, {
      alpha: 0.72,
      depth: 2330,
      driftX: Phaser.Math.Between(-10, 10),
      driftY: -26,
      frameDelay: 180,
      lifetime: 14000,
      scale: Phaser.Math.FloatBetween(0.08, 0.12),
    });
  }

  private createLoopingFx(
    frames: readonly string[],
    x: number,
    y: number,
    options: FxOptions & { frameDelay: number; lifetime: number },
  ) {
    let frame = 0;
    const sprite = this.add
      .image(x, y, fxKey(frames[0] ?? pick(frames)))
      .setAlpha(options.alpha ?? 1)
      .setDepth(options.depth ?? 2300)
      .setScale(options.scale ?? 0.12);
    const timer = this.time.addEvent({
      delay: options.frameDelay,
      loop: true,
      callback: () => {
        frame = (frame + 1) % frames.length;
        sprite.setTexture(fxKey(frames[frame] ?? pick(frames)));
      },
    });

    this.tweens.add({
      targets: sprite,
      alpha: 0,
      x: x + (options.driftX ?? 0),
      y: y + (options.driftY ?? 0),
      scale: (options.scale ?? 0.12) * 1.35,
      delay: options.lifetime * 0.62,
      duration: options.lifetime * 0.38,
      ease: 'Sine.easeOut',
      onComplete: () => {
        timer.remove(false);
        sprite.destroy();
      },
    });
  }

  private killAreaByGrenade(x: number, y: number, radius: number, sourceTeam: ArmyTeam) {
    for (const soldier of this.soldiers) {
      if (soldier.team === sourceTeam || soldier.state === 'dead') continue;

      const point = this.getBodyPoint(soldier);
      if (Phaser.Math.Distance.Between(x, y, point.x, point.y) <= radius) {
        this.throwDeadSoldierAway(soldier, x, y);
      }
    }
  }

  private throwDeadSoldierAway(soldier: BattleSoldier, explosionX: number, explosionY: number) {
    const dx = soldier.container.x - explosionX;
    const dy = soldier.container.y - explosionY;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const push = Phaser.Math.Between(36, 72);

    this.killSoldier(soldier);
    this.tweens.add({
      targets: soldier.container,
      x: soldier.container.x + (dx / distance) * push,
      y: soldier.container.y + (dy / distance) * push,
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  private getMuzzlePoint(soldier: BattleSoldier) {
    const rotation = soldier.arms.rotation;
    const muzzleX = MUZZLE_X - ARMS_ATTACHMENT_INSET;
    const muzzleY = MUZZLE_Y - ARMS_ATTACHMENT_INSET;
    const localX = soldier.arms.x + Math.cos(rotation) * muzzleX - Math.sin(rotation) * muzzleY;
    const localY = Math.sin(rotation) * muzzleX + Math.cos(rotation) * muzzleY + soldier.arms.y;

    return {
      x: soldier.container.x + soldier.facing * soldier.size * localX,
      y: soldier.container.y + soldier.size * localY,
    };
  }

  private getBodyPoint(soldier: BattleSoldier) {
    return {
      x: soldier.container.x + soldier.facing * soldier.size * soldier.bodyBaseX,
      y: soldier.container.y + soldier.size * soldier.bodyBaseY,
    };
  }

  private getAimRotation(soldier: BattleSoldier, targetPoint: { x: number; y: number }) {
    const shoulderX = soldier.container.x + soldier.facing * soldier.size * soldier.arms.x;
    const shoulderY = soldier.container.y + soldier.size * soldier.arms.y;
    const dx = Math.abs(targetPoint.x - shoulderX);
    const dy = targetPoint.y - shoulderY;

    return Math.atan2(dy, Math.max(dx, 1));
  }

  private rotateToward(current: number, target: number, maxStep: number) {
    const delta = Phaser.Math.Angle.Wrap(target - current);
    if (Math.abs(delta) <= maxStep) return target;

    return current + Math.sign(delta) * maxStep;
  }

  private getSpawnPoint(edge: SpawnEdge) {
    const width = this.scale.width;
    const height = this.scale.height;

    if (edge === 'bottom-left') {
      return { x: -50, y: height - Phaser.Math.Between(42, 128) };
    }

    if (edge === 'bottom-right') {
      return { x: width + 50, y: height - Phaser.Math.Between(42, 128) };
    }

    if (edge === 'top-left') {
      return { x: Phaser.Math.Between(42, 128), y: -50 };
    }

    if (edge === 'top-right') {
      return { x: width - Phaser.Math.Between(42, 128), y: -50 };
    }

    return {
      x: width / 2 + Phaser.Math.Between(-120, 120),
      y: -50,
    };
  }

  private moveTowardMapCenter(soldier: BattleSoldier, dt: number) {
    this.moveSoldierToward(
      soldier,
      {
        x: this.scale.width / 2,
        y: this.scale.height / 2,
      },
      dt,
      false,
    );
  }

  private moveSoldierToward(
    soldier: BattleSoldier,
    target: ScreenPoint,
    dt: number,
    enforceSpawnGuard: boolean,
  ) {
    const from = { x: soldier.container.x, y: soldier.container.y };
    const navigator = this.navigator;
    const now = this.time.now;
    const targetDrift = soldier.navigationTarget
      ? Phaser.Math.Distance.Between(
          target.x,
          target.y,
          soldier.navigationTarget.x,
          soldier.navigationTarget.y,
        )
      : Number.POSITIVE_INFINITY;
    const progressDistance = Phaser.Math.Distance.Between(
      from.x,
      from.y,
      soldier.lastProgressPoint.x,
      soldier.lastProgressPoint.y,
    );
    const stalled = now - soldier.lastProgressAt >= NAVIGATION_STUCK_MS && progressDistance < 4;
    soldier.nextPathfindAt = prioritizeStalledNavigationPlan(
      soldier.nextPathfindAt,
      now,
      stalled,
      NAVIGATION_RETRY_MS,
    );

    if (
      navigator &&
      this.navigationPlansThisFrame < MAX_NAVIGATION_PLANS_PER_FRAME &&
      (targetDrift >= NAVIGATION_TARGET_DRIFT || now >= soldier.nextPathfindAt)
    ) {
      this.navigationPlansThisFrame += 1;
      soldier.navigationPath = navigator.findPath(from, target);
      soldier.navigationTarget = { ...target };
      soldier.nextPathfindAt =
        now +
        getNavigationPlanDelay(stalled, NAVIGATION_REPATH_MS, NAVIGATION_RETRY_MS);
      soldier.stuckReplans = stalled ? soldier.stuckReplans + 1 : 0;

      if (soldier.navigationPath.length === 0 && soldier.stuckReplans >= 2) {
        const escapePoint = navigator.nearestWalkablePoint(from);
        if (escapePoint && Phaser.Math.Distance.Between(from.x, from.y, escapePoint.x, escapePoint.y) > 3) {
          soldier.navigationPath = [escapePoint];
        }
      }
    }

    while (soldier.navigationPath.length > 0) {
      const waypoint = soldier.navigationPath[0];
      if (!waypoint) break;
      if (Phaser.Math.Distance.Between(from.x, from.y, waypoint.x, waypoint.y) >= NAVIGATION_WAYPOINT_REACHED) {
        break;
      }
      soldier.navigationPath.shift();
    }

    let moveTarget = soldier.navigationPath[0];
    if (!moveTarget) {
      if (navigator && !navigator.isSegmentClear(from, target)) {
        soldier.nextPathfindAt = Math.min(soldier.nextPathfindAt, now + NAVIGATION_RETRY_MS);
        return true;
      }
      moveTarget = target;
    }

    const dx = moveTarget.x - from.x;
    const dy = moveTarget.y - from.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const step = Math.min(soldier.speed * dt, distance);
    const nextX = from.x + (dx / distance) * step;
    const nextY = from.y + (dy / distance) * step;

    if (enforceSpawnGuard && !this.canEnterOpponentSpawnGuard(soldier, nextX, nextY)) {
      return false;
    }

    if (navigator && !navigator.isBlocked(from) && navigator.isBlocked({ x: nextX, y: nextY })) {
      const escapePoint = soldier.stuckReplans >= 2 ? navigator.nearestWalkablePoint(from) : undefined;
      soldier.navigationPath =
        escapePoint &&
        Phaser.Math.Distance.Between(from.x, from.y, escapePoint.x, escapePoint.y) > 3 &&
        navigator.isSegmentClear(from, escapePoint)
          ? [escapePoint]
          : [];
      soldier.nextPathfindAt = Math.min(soldier.nextPathfindAt, now + NAVIGATION_RETRY_MS);
      return true;
    }

    soldier.facing = dx >= 0 ? 1 : -1;
    soldier.container.setScale(soldier.facing * soldier.size, soldier.size);
    soldier.container.setPosition(nextX, nextY).setDepth(nextY);
    if (
      Phaser.Math.Distance.Between(
        nextX,
        nextY,
        soldier.lastProgressPoint.x,
        soldier.lastProgressPoint.y,
      ) >= 4
    ) {
      soldier.lastProgressPoint = { x: nextX, y: nextY };
      soldier.lastProgressAt = now;
      soldier.stuckReplans = 0;
    }
    return true;
  }

  private clearNavigation(soldier: BattleSoldier) {
    soldier.navigationPath = [];
    delete soldier.navigationTarget;
    soldier.nextPathfindAt = 0;
    soldier.lastProgressPoint = { x: soldier.container.x, y: soldier.container.y };
    soldier.lastProgressAt = this.time.now;
    soldier.stuckReplans = 0;
  }

  private rebuildNavigation() {
    const background = this.background;
    if (!background) {
      this.navigator = undefined;
      return;
    }

    const obstacles = projectNavigationObstacles(activeBattlefieldLocation.obstacles, {
      sourceWidth: background.width,
      sourceHeight: background.height,
      width: this.scale.width,
      height: this.scale.height,
      edgeExtension: NAVIGATION_EDGE_EXTENSION,
    });

    this.navigator = new BattlefieldNavigator({
      width: this.scale.width,
      height: this.scale.height,
      obstacles,
    });

    for (const soldier of this.soldiers) {
      this.clearNavigation(soldier);
      const lockedTarget = soldier.lockedTarget;
      if (
        lockedTarget &&
        !this.navigator.isReachable(
          { x: soldier.container.x, y: soldier.container.y },
          this.getBodyPoint(lockedTarget),
        )
      ) {
        delete soldier.lockedTarget;
      }
    }
  }

  private getSpawnGuardPoint(edge: SpawnEdge) {
    const width = this.scale.width;
    const height = this.scale.height;

    if (edge === 'bottom-left') {
      return { x: -50, y: height - 85 };
    }

    if (edge === 'bottom-right') {
      return { x: width + 50, y: height - 85 };
    }

    if (edge === 'top-left') {
      return { x: 85, y: -50 };
    }

    if (edge === 'top-right') {
      return { x: width - 85, y: -50 };
    }

    return { x: width / 2, y: -50 };
  }

  private canEnterOpponentSpawnGuard(soldier: BattleSoldier, x: number, y: number) {
    const guardRadius = soldier.range * SPAWN_GUARD_RANGE_MULTIPLIER;

    for (const config of ARMY_CONFIGS) {
      if (config.team === soldier.team) continue;

      for (const edge of config.spawnEdges) {
        const guardPoint = this.getSpawnGuardPoint(edge);
        if (Phaser.Math.Distance.Between(x, y, guardPoint.x, guardPoint.y) < guardRadius) {
          return false;
        }
      }
    }

    return true;
  }

  private countAlive(team: ArmyTeam) {
    return this.soldiers.filter((soldier) => soldier.team === team && soldier.state !== 'dead').length;
  }
}

function startBattlefield() {
  return new PhaserGame({
    type: AUTO,
    parent: FIELD_PARENT_ID,
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [SplashBattleScene],
  });
}

async function initializeSplash() {
  const { bootstrap } = await loadBattleState();
  if (bootstrap?.view === 'summary') return;
  activeBattlefieldLocation = getBattlefieldLocation(bootstrap?.battle?.activeTerritory, null);
  startBattlefield();
}

startButton.addEventListener('click', (event) => {
  setSplashLaunchTarget();
  requestExpandedMode(event, 'game');
});

dayLeaderboardButton.addEventListener('click', (event) => {
  setSplashLaunchTarget('daily-leaderboard');
  requestExpandedMode(event, 'game');
});

testMessageButton.addEventListener('click', () => {
  void postTestMessage();
});

commentsGreenButton.addEventListener('click', () => {
  void postCommentsAnalysis('green', commentsGreenButton);
});

commentsBlueButton.addEventListener('click', () => {
  void postCommentsAnalysis('blue', commentsBlueButton);
});

testMessageButton.hidden = !devToolsEnabled;
commentsGreenButton.hidden = !devToolsEnabled;
commentsBlueButton.hidden = !devToolsEnabled;
setupGameLogo();
void initializeSplash();
