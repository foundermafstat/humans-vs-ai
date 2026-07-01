import { context, requestExpandedMode } from '@devvit/web/client';
import * as Phaser from 'phaser';
import { AUTO, Game as PhaserGame, Scene } from 'phaser';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const gameLogoElement = document.getElementById('game-logo') as HTMLImageElement;

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
  bulletColor: number;
};

const BATTLEFIELD_KEY = 'splash-battlefield';
const FX_ASSET_VERSION = '2026-06-29-fire-hotbase';
const FIELD_PARENT_ID = 'battlefield-scene';
const GAME_LOGOS = [
  '/assets/logo1.webp',
  '/assets/logo2.webp',
  '/assets/logo3.webp',
] as const;
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
  gameLogoElement.src = pick(GAME_LOGOS);
}

class SplashBattleScene extends Scene {
  private background?: Phaser.GameObjects.Image;
  private soldiers: BattleSoldier[] = [];

  constructor() {
    super('SplashBattleScene');
  }

  preload() {
    this.load.image(BATTLEFIELD_KEY, '/assets/battlefield.webp');

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

    for (const soldier of this.soldiers) {
      if (soldier.state !== 'dead') {
        this.updateSoldier(soldier, time, dt);
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);

    if (this.background) {
      const scale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setPosition(width / 2, height / 2).setScale(scale);
    }
  }

  private spawnSoldier(config: ArmyConfig) {
    if (this.countAlive(config.team) >= config.maxAlive) return;

    const variants = variantsFor(config.source);
    const variant = variants[Phaser.Math.Between(0, variants.length - 1)];
    if (!variant) return;

    const spawn = this.getSpawnPoint(pick(config.spawnEdges));
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
      const nextX = soldier.container.x + (dx / distance) * soldier.speed * dt;
      const nextY = soldier.container.y + (dy / distance) * soldier.speed * dt;
      if (this.canEnterOpponentSpawnGuard(soldier, nextX, nextY)) {
        soldier.container.x = nextX;
        soldier.container.y = nextY;
      } else {
        delete soldier.lockedTarget;
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
    let closest: BattleSoldier | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.soldiers) {
      if (target.team === soldier.team || target.state === 'dead') continue;

      const point = this.getBodyPoint(target);
      const distance = Phaser.Math.Distance.Between(soldier.container.x, soldier.container.y, point.x, point.y);
      if (distance < closestDistance) {
        closest = target;
        closestDistance = distance;
      }
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
    const dx = this.scale.width / 2 - soldier.container.x;
    const dy = this.scale.height / 2 - soldier.container.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);

    soldier.facing = dx >= 0 ? 1 : -1;
    soldier.container.setScale(soldier.facing * soldier.size, soldier.size);
    soldier.container.x += (dx / distance) * soldier.speed * dt;
    soldier.container.y += (dy / distance) * soldier.speed * dt;
    soldier.container.setDepth(soldier.container.y);
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

startButton.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

titleElement.textContent = `Join the ranks of humanity, ${context?.username ?? 'fighter'}`;
setupGameLogo();
startBattlefield();
