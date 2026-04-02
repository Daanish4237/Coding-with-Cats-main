import { MainHub } from './scenes/MainHub.js';

const config = {
    type: Phaser.AUTO,
    title: 'Coding with Cats',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#667eea',
    pixelArt: false,
    scene: [
        MainHub
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
};

window.__phaserGame = new Phaser.Game(config);
