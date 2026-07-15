import * as Phaser from 'phaser';
import type { PlayerJoinResponse } from '../../shared/api';

async function joinDailyBattle(): Promise<PlayerJoinResponse> {
  const response = await fetch('/api/player/join', { method: 'POST' });
  const body: PlayerJoinResponse | { message?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !('type' in body) || body.type !== 'event-participation') {
    throw new Error('message' in body && body.message
      ? body.message
      : 'Participation request failed');
  }

  return body;
}

export class Game extends Phaser.Scene {
  private floor: Phaser.GameObjects.TileSprite | null = null;
  private participationLayer: Phaser.GameObjects.Container | null = null;
  private isJoining = false;

  constructor() {
    super('Game');
  }

  init(): void {
    this.floor = null;
    this.participationLayer = null;
    this.isJoining = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x16110d);
    this.createFloor();
    this.showParticipationScene(true);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private createFloor(): void {
    const { width, height } = this.scale;
    this.floor = this.add.tileSprite(0, 0, width, height, 'floor-tree').setOrigin(0).setDepth(0);
    this.layoutFloor(width, height);
  }

  private layoutFloor(width: number, height: number): void {
    if (!this.floor) return;

    const tileScale = Phaser.Math.Clamp(Math.min(width, height) / 900, 0.55, 0.9);
    this.floor.setSize(width, height);
    this.floor.setTileScale(tileScale, tileScale);
  }

  private showParticipationScene(animated: boolean): void {
    const { width, height } = this.scale;
    const handScale = Phaser.Math.Clamp(width / 760, 0.72, 1.35);
    const handHeight = 308 * handScale;
    const finalY = Math.max(16, height * 0.05);
    const startY = animated ? -handHeight - 90 : finalY;

    this.cameras.resize(width, height);
    this.participationLayer?.destroy(true);
    this.participationLayer = this.add.container(0, 0).setDepth(10);

    const participationHand = this.createParticipationHand({
      x: width * 0.5,
      y: startY,
      handScale,
    });
    this.participationLayer.add(participationHand);

    if (animated) {
      this.tweens.add({
        targets: participationHand,
        y: finalY,
        duration: 760,
        ease: 'Back.easeOut',
      });
    }
  }

  private createParticipationHand(options: {
    x: number;
    y: number;
    handScale: number;
  }): Phaser.GameObjects.Container {
    const { width } = this.scale;
    const container = this.add.container(options.x, options.y);
    const hand = this.add
      .image(0, 0, 'hand-left')
      .setOrigin(0.5, 0)
      .setScale(options.handScale);
    const handHeight = hand.height * options.handScale;
    const pillSize = Math.min(48, Math.max(34, width * 0.052));
    const pill = this.add
      .image(0, handHeight - 52 * options.handScale, 'pill-green')
      .setDisplaySize(pillSize, pillSize)
      .setTint(0x8f969e);
    const wrapWidth = Phaser.Math.Clamp(width * 0.4, 190, 350);

    const title = this.add
      .text(0, handHeight + 16, 'JOIN DAILY EVENT', {
        fontFamily: 'VT323',
        fontSize: `${Math.round(28 * options.handScale)}px`,
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, handHeight + 50, 'Tap to join. Assignment is immediate.', {
        fontFamily: 'VT323',
        fontSize: `${Math.round(23 * options.handScale)}px`,
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 7,
        align: 'center',
        wordWrap: { width: wrapWidth, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);
    const subline = this.add
      .text(0, handHeight + 108, '*team flair is applied immediately', {
        fontFamily: 'VT323',
        fontSize: `${Math.round(17 * options.handScale)}px`,
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 6,
        align: 'center',
        wordWrap: { width: wrapWidth, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    hand.setInteractive({ useHandCursor: true });
    pill.setInteractive({ useHandCursor: true });
    hand.on('pointerdown', () => void this.joinEvent());
    pill.on('pointerdown', () => void this.joinEvent());

    this.tweens.add({
      targets: pill,
      y: pill.y - 16,
      duration: 1300,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    container.add([hand, pill, title, body, subline]);
    return container;
  }

  private async joinEvent(): Promise<void> {
    if (this.isJoining) return;

    this.isJoining = true;
    try {
      await joinDailyBattle();
      window.dispatchEvent(new CustomEvent('humans-vs-ai:player-joined'));
    } catch {
      this.isJoining = false;
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.layoutFloor(width, height);
    this.showParticipationScene(false);
  }
}
