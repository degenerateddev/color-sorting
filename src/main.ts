import Phaser from 'phaser';
import { GameScene } from './scenes/Game';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1e1e1e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config as any);

/**
 * Dev-tools helper: reset the game to the given level with fresh random data.
 * Usage in browser console: setLevel(15)
 */
(window as any).setLevel = (level: number) => {
  const scene = game.scene.getScene('ColorSort') as GameScene;
  if (!scene) {
    console.error('ColorSort game scene not found');
    return;
  }
  scene.jumpToLevel(level);
};
