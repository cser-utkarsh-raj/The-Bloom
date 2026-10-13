/**
 * LevelManager.js - Central State Manager for THE BLOOM
 */
class LevelManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.difficulty = 'normal'; // 'easy', 'normal' (medium), 'hard'
        this.currentLevel = 1;
        
        // Player persistent stats
        this.player = {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            weapon: 'unarmed', // 'unarmed', 'plank', 'pistol', 'rifle'
            ammo: 0,
            inventory: []
        };
        
        // Settings
        this.soundEnabled = true;
        this.graphicsQuality = 'high';
    }

    getWaveSize() {
        switch (this.difficulty) {
            case 'easy': return 15;
            case 'hard': return 30;
            case 'normal':
            default:
                return 20;
        }
    }

    setDifficulty(diff) {
        if (['easy', 'normal', 'hard'].includes(diff)) {
            this.difficulty = diff;
        }
    }

    // Set stats upon level transition
    savePlayerStats(playerObj) {
        if (playerObj) {
            this.player.health = playerObj.health || this.player.health;
            this.player.weapon = playerObj.weapon || this.player.weapon;
            this.player.ammo = playerObj.ammo !== undefined ? playerObj.ammo : this.player.ammo;
        }
    }

    loadPlayerStats(playerObj) {
        if (playerObj) {
            playerObj.health = this.player.health;
            playerObj.weapon = this.player.weapon;
            playerObj.ammo = this.player.ammo;
        }
    }
}

// Singleton pattern
const instance = new LevelManager();
export default instance;
