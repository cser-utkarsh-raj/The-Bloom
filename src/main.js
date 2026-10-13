/**
 * THE BLOOM — Main Game Entry
 * @description Cinematic survival horror game
 * @version 2.0.0
 */

import Phaser from 'phaser';
window.Phaser = Phaser;

// Import all scenes
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import IntroCutscene from './scenes/IntroCutscene.js';
import Level1_HomeDefense from './scenes/Level1_HomeDefense.js';
import Level2_WifeBoss from './scenes/Level2_WifeBoss.js';
import Level3_RoadEscape from './scenes/Level3_RoadEscape.js';
import Level4_SchoolShelter from './scenes/Level4_SchoolShelter.js';
import Level5_FinalEscape from './scenes/Level5_FinalEscape.js';
import EndingScene from './scenes/EndingScene.js';

// Global Isometric Projection Helper
window.getIsoCoords = function(x, y) {
    const scale = 0.8;
    const isoX = (x - y) * 0.866 * scale;
    const isoY = (x + y) * 0.5 * scale;
    return { x: isoX, y: isoY };
};

// Game Configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    
    // FULLSCREEN DYNAMIC CONFIGURATION
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    },
    
    // Render Settings - Cinematic Quality
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        powerPreference: "high-performance"
    },
    
    // Physics System
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
            fps: 60,
            fixedStep: true
        }
    },
    
    // Camera Settings - Cinematic Feel
    camera: {
        zoom: 1,
        roundPixels: false,
        backgroundColor: '#050505'
    },
    
    // Input Settings
    input: {
        keyboard: true,
        mouse: true,
        touch: true,
        activePointers: 2
    },
    
    // Scene Registration
    scene: [
        BootScene,
        MenuScene,
        IntroCutscene,
        Level1_HomeDefense,
        Level2_WifeBoss,
        Level3_RoadEscape,
        Level4_SchoolShelter,
        Level5_FinalEscape,
        EndingScene
    ],
    
    // Callbacks for resize events
    callbacks: {
        postBoot: (game) => {
            // Remove loading screen with fade
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.opacity = '0';
                setTimeout(() => {
                    loadingEl.style.display = 'none';
                }, 1000);
            }
        }
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Export for debugging (optional)
window.TheBloom = { game, version: '2.0.0' };

console.log('THE BLOOM — Initialized');