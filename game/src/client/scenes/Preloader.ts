import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath('../assets');

    this.load.image('logo', 'logo.png');
    this.load.image('floor-tree', 'props/tree.webp');
    this.load.image('table', 'props/table.webp');
    this.load.image('paper-blank-1', 'paper/blank01.webp');
    this.load.image('paper-blank-2', 'paper/blank02.webp');
    this.load.image('hand-left', 'hands/hands01_top_center.webp');
    this.load.image('hand-right', 'hands/hands01_top_center_mirror.webp');
    this.load.image('pill-green', 'pills/green.webp');
    this.load.image('pill-blue', 'pills/blue.webp');

    const characterIds = [
      'man_african',
      'man_asian',
      'man_european',
      'man_latino',
      'woman_african',
      'woman_asian',
      'woman_european',
      'woman_latino',
    ];

    for (const color of ['green', 'blue']) {
      for (const characterId of characterIds) {
        this.load.image(
          `player-${color}-${characterId}`,
          `army/players/${color}/${characterId}.webp`,
        );
      }
    }
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    this.scene.start('Game');
  }
}
