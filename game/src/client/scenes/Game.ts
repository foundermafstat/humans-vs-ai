import * as Phaser from 'phaser';

type ArmyColor = 'green' | 'blue';
type GameStage = 'identification' | 'paperwork';

const CHARACTER_IDS = [
  'man_african',
  'man_asian',
  'man_european',
  'man_latino',
  'woman_african',
  'woman_asian',
  'woman_european',
  'woman_latino',
] as const;

type CharacterId = (typeof CHARACTER_IDS)[number];

export class Game extends Phaser.Scene {
  private floor: Phaser.GameObjects.TileSprite | null = null;
  private identificationLayer: Phaser.GameObjects.Container | null = null;
  private deskLayer: Phaser.GameObjects.Container | null = null;
  private selectedArmy: ArmyColor = 'green';
  private selectedCharacterIndex = 0;
  private stage: GameStage = 'identification';
  private isTransitioning = false;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private selectedNameText: Phaser.GameObjects.Text | null = null;
  private paperFocus = { x: 0, y: 0, zoom: 1 };

  constructor() {
    super('Game');
  }

  init(): void {
    this.floor = null;
    this.identificationLayer = null;
    this.deskLayer = null;
    this.selectedArmy = 'green';
    this.selectedCharacterIndex = 0;
    this.stage = 'identification';
    this.isTransitioning = false;
    this.portraitImage = null;
    this.selectedNameText = null;
    this.paperFocus = { x: 0, y: 0, zoom: 1 };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x16110d);
    this.createFloor();
    this.showIdentificationScene(true);

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

  private showIdentificationScene(animated: boolean): void {
    const { width, height } = this.scale;
    const handScale = Phaser.Math.Clamp(width / 760, 0.72, 1.35);
    const handHeight = 308 * handScale;
    const finalY = Math.max(16, height * 0.05);
    const startY = animated ? -handHeight - 90 : finalY;

    this.stage = 'identification';
    this.resetCamera(width, height);
    this.identificationLayer?.destroy(true);
    this.identificationLayer = this.add.container(0, 0).setDepth(10);

    const leftX = width * 0.29;
    const rightX = width * 0.71;

    const leftHand = this.createChoiceHand({
      color: 'green',
      handKey: 'hand-left',
      pillKey: 'pill-green',
      x: leftX,
      y: startY,
      handScale,
      title: 'COOL ARMY',
      body: 'strong, brave,\nsure to beat AI',
      subline: '',
    });

    const rightHand = this.createChoiceHand({
      color: 'blue',
      handKey: 'hand-right',
      pillKey: 'pill-blue',
      x: rightX,
      y: startY,
      handScale,
      title: 'REGULAR ARMY',
      body: '',
      subline: '*description imbalance due to army oversaturation',
    });

    this.identificationLayer.add([leftHand, rightHand]);

    if (animated) {
      this.tweens.add({
        targets: [leftHand, rightHand],
        y: finalY,
        duration: 760,
        ease: 'Back.easeOut',
      });
    }
  }

  private createChoiceHand(options: {
    color: ArmyColor;
    handKey: string;
    pillKey: string;
    x: number;
    y: number;
    handScale: number;
    title: string;
    body: string;
    subline: string;
  }): Phaser.GameObjects.Container {
    const { width } = this.scale;
    const container = this.add.container(options.x, options.y);
    const hand = this.add.image(0, 0, options.handKey).setOrigin(0.5, 0).setScale(options.handScale);
    const handHeight = hand.height * options.handScale;
    const pillSize = Math.min(48, Math.max(34, width * 0.052));
    const pill = this.add
      .image(0, handHeight - 52 * options.handScale, options.pillKey)
      .setDisplaySize(pillSize, pillSize);
    const wrapWidth = Phaser.Math.Clamp(width * 0.33, 150, 320);

    const title = this.add
      .text(0, handHeight + 16, options.title, {
        fontFamily: 'VT323',
        fontSize: `${Math.round(28 * options.handScale)}px`,
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    const body = this.add
      .text(0, handHeight + 48, options.body, {
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
      .text(0, handHeight + 52, options.subline, {
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
    hand.on('pointerdown', () => this.selectArmy(options.color));
    pill.on('pointerdown', () => this.selectArmy(options.color));

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

  private selectArmy(color: ArmyColor): void {
    if (this.isTransitioning || !this.identificationLayer) return;

    const { height } = this.scale;
    const layer = this.identificationLayer;
    this.selectedArmy = color;
    this.isTransitioning = true;
    this.tweens.killTweensOf(layer);

    this.tweens.add({
      targets: layer,
      y: -height * 0.95,
      duration: 620,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        layer.destroy(true);
        this.identificationLayer = null;
        this.showPaperworkScene(true);
      },
    });
  }

  private showPaperworkScene(animated: boolean): void {
    const { width, height } = this.scale;

    this.stage = 'paperwork';
    this.isTransitioning = false;
    this.portraitImage = null;
    this.selectedNameText = null;
    this.resetCamera(width, height);
    this.deskLayer?.destroy(true);
    this.deskLayer = this.add.container(0, animated ? -height * 0.9 : 0).setDepth(20);

    const table = this.add.image(width / 2, height * 0.5, 'table');
    const tableScale = Math.max(width / table.width, height / table.height) * 1.18;
    table.setScale(tableScale);

    const paperHeight = Math.min(height * 0.66, width * 0.78);
    const paperScale = paperHeight / 1491;
    const paperX = width / 2;
    const paperY = height * 0.52;
    const backPaper = this.add
      .image(paperX + 34 * paperScale, paperY + 30 * paperScale, 'paper-blank-2')
      .setScale(paperScale)
      .setAngle(4);
    const frontPaper = this.add.image(paperX, paperY, 'paper-blank-1').setScale(paperScale);
    const formLayer = this.add.container(paperX, paperY).setScale(paperScale);

    this.drawForm(formLayer);
    this.deskLayer.add([table, backPaper, frontPaper, formLayer]);

    const targetZoom = Phaser.Math.Clamp((height * 0.94) / paperHeight, 1.15, 1.58);
    this.paperFocus = { x: paperX, y: paperY, zoom: targetZoom };

    if (animated) {
      this.tweens.add({
        targets: this.floor,
        tilePositionY: (this.floor?.tilePositionY ?? 0) + 170,
        duration: 950,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: this.deskLayer,
        y: 0,
        duration: 880,
        ease: 'Cubic.easeOut',
        onComplete: () => this.focusPaper(true),
      });
    } else {
      this.focusPaper(false);
    }
  }

  private drawForm(formLayer: Phaser.GameObjects.Container): void {
    const colorMark = this.add.graphics();
    this.drawArmySelectionMark(colorMark);

    this.portraitImage = this.add.image(292, -342, this.getCurrentCharacterKey());
    this.applyPortraitCrop();

    const leftButton = this.createPixelButton(158, -86, '<', () => this.shiftCharacter(-1));
    const rightButton = this.createPixelButton(426, -86, '>', () => this.shiftCharacter(1));
    this.selectedNameText = this.add
      .text(292, -84, this.getCharacterLabel(), {
        fontFamily: 'VT323',
        fontSize: '32px',
        color: '#26221c',
        align: 'center',
      })
      .setOrigin(0.5);

    formLayer.add([colorMark, this.portraitImage, leftButton, rightButton, this.selectedNameText]);
  }

  private drawArmySelectionMark(graphics: Phaser.GameObjects.Graphics): void {
    const origin = this.selectedArmy === 'green' ? { x: -402, y: -626 } : { x: -275, y: -626 };

    graphics.fillStyle(0x29231d, 1);
    graphics.fillRect(origin.x + 5, origin.y + 26, 9, 9);
    graphics.fillRect(origin.x + 14, origin.y + 35, 9, 9);
    graphics.fillRect(origin.x + 23, origin.y + 26, 9, 9);
    graphics.fillRect(origin.x + 32, origin.y + 17, 9, 9);
  }

  private createPixelButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const back = this.add.graphics();
    const drawBack = (fillColor: number) => {
      back.clear();
      back.fillStyle(fillColor, 1);
      back.fillRect(-27, -24, 54, 48);
      back.lineStyle(5, 0x655642, 1);
      back.strokeRect(-27, -24, 54, 48);
    };

    drawBack(0x2b251f);

    const text = this.add
      .text(0, -2, label, {
        fontFamily: 'VT323',
        fontSize: '44px',
        color: '#f5ead5',
      })
      .setOrigin(0.5);

    button.add([back, text]);
    button.setSize(54, 48);
    button.setInteractive(new Phaser.Geom.Rectangle(-27, -24, 54, 48), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', onClick);
    button.on('pointerover', () => {
      this.game.canvas.style.cursor = 'pointer';
      drawBack(0x3a3128);
    });
    button.on('pointerout', () => {
      this.game.canvas.style.cursor = 'default';
      drawBack(0x2b251f);
    });

    return button;
  }

  private shiftCharacter(direction: number): void {
    this.selectedCharacterIndex =
      (this.selectedCharacterIndex + direction + CHARACTER_IDS.length) % CHARACTER_IDS.length;
    this.portraitImage?.setTexture(this.getCurrentCharacterKey());
    this.applyPortraitCrop();
    this.selectedNameText?.setText(this.getCharacterLabel());
  }

  private applyPortraitCrop(): void {
    if (!this.portraitImage) return;

    this.portraitImage
      .setCrop(250, 0, 586, 690)
      .setDisplaySize(218, 256)
      .setOrigin(0.5);
  }

  private getCurrentCharacterKey(): string {
    return `player-${this.selectedArmy}-${this.getCurrentCharacterId()}`;
  }

  private getCurrentCharacterId(): CharacterId {
    return CHARACTER_IDS[this.selectedCharacterIndex] ?? 'man_african';
  }

  private getCharacterLabel(): string {
    return this.getCurrentCharacterId().replace('_', ' ').toUpperCase();
  }

  private focusPaper(animated: boolean): void {
    const camera = this.cameras.main;
    if (animated) {
      camera.pan(this.paperFocus.x, this.paperFocus.y, 780, 'Sine.easeInOut');
      camera.zoomTo(this.paperFocus.zoom, 780, 'Sine.easeInOut');
      return;
    }

    camera.setZoom(this.paperFocus.zoom);
    camera.centerOn(this.paperFocus.x, this.paperFocus.y);
  }

  private resetCamera(width: number, height: number): void {
    const camera = this.cameras.main;
    this.cameras.resize(width, height);
    camera.setZoom(1);
    camera.setScroll(0, 0);
    camera.centerOn(width / 2, height / 2);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.layoutFloor(width, height);

    if (this.stage === 'identification') {
      this.showIdentificationScene(false);
      return;
    }

    this.showPaperworkScene(false);
  }
}
