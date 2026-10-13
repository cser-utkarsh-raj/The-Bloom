import Phaser from 'phaser';
import LevelManager from '../managers/LevelManager.js';
import DialogueManager from '../systems/DialogueManager.js';
import LightManager from '../systems/LightManager.js';
import WeatherManager from '../systems/WeatherManager.js';
import UIManager from '../systems/UIManager.js';

export default class BaseLevel extends Phaser.Scene {
    constructor(key) {
        super(key);
    }
    
    initBaseSystems() {
        this.gameStarted = false;
        this.dialogueActive = false;
        
        this.dialogueManager = new DialogueManager(this);
        this.lightManager = new LightManager(this);
        this.weatherManager = new WeatherManager(this);
        this.uiManager = new UIManager(this);
    }

    createFloorGrid() {
        this.floorGroup = this.add.group();
        for (let x = -400; x < 1600; x += 64) {
            for (let y = -400; y < 1600; y += 64) {
                const iso = window.getIsoCoords(x, y);
                const tile = this.add.image(iso.x, iso.y, 'floorWood');
                tile.setOrigin(0.5);
                tile.setDepth(-10000 + (x + y) / 100);
                this.floorGroup.add(tile);
            }
        }
    }

    setupIsometricWalls() {
        if (!this.walls) return;
        this.walls.getChildren().forEach(wall => {
            wall.setVisible(false);
            const iso = window.getIsoCoords(wall.x, wall.y);
            const vis = this.add.image(iso.x, iso.y, wall.texture.key);
            
            // Standard scale restored to 1.0 (or original procedural scale)
            vis.setScale(wall.scaleX, wall.scaleY);
            
            if (wall.texture.key === 'sofa') {
                wall.body.setSize(64, 18);
                wall.body.setOffset(0, 30);
                vis.setOrigin(0.5, 0.7);
            } else if (wall.texture.key === 'kitchenCounter') {
                wall.body.setSize(120, 18);
                wall.body.setOffset(0, 22);
                vis.setOrigin(0.5, 0.7);
            } else if (wall.texture.key === 'table') {
                wall.body.setSize(48, 16);
                wall.body.setOffset(0, 20);
                vis.setOrigin(0.5, 0.65);
            } else if (wall.texture.key === 'bed') {
                wall.body.setSize(48, 40);
                wall.body.setOffset(0, 40);
                vis.setOrigin(0.5, 0.75);
            } else if (wall.texture.key === 'wallTexture' || wall.texture.key === 'barricade') {
                wall.body.setSize(wall.displayWidth, 24);
                wall.body.setOffset(0, wall.displayHeight - 24);
                vis.setOrigin(0.5, 0.8);
            }
            
            vis.setDepth(wall.x + wall.y);
            wall.visualSprite = vis; // Keep reference for modifications
        });
    }

    setupInputs(player, enemiesGroup) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.cursors.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.cursors.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.cursors.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.input.on('pointerdown', (pointer) => {
            if (this.gameStarted && !this.dialogueActive && player && enemiesGroup) {
                player.attack(pointer, enemiesGroup.getChildren(), (target, dmg) => {
                    target.health -= dmg;
                    this.cameras.main.shake(80, 0.003);
                    
                    const targetVis = target.visualSprite || target;
                    const b = this.add.image(targetVis.x, targetVis.y - 12, 'blood');
                    this.time.delayedCall(400, () => b.destroy());
                    
                    if (target.visualSprite) {
                        target.visualSprite.setTint(0xff0000);
                        this.time.delayedCall(150, () => {
                            if (target.active && target.visualSprite) target.visualSprite.clearTint();
                        });
                    }
                    
                    if (target.health <= 0) {
                        if (this.handleEnemyDeath) {
                            this.handleEnemyDeath(target);
                        } else {
                            if (target.visualSprite) target.visualSprite.destroy();
                            if (target.visualShadow) target.visualShadow.destroy();
                            target.destroy();
                            if (this.enemiesRemaining !== undefined) this.enemiesRemaining--;
                            if (this.uiManager) this.uiManager.update();
                        }
                    }
                });
            }
        });
    }

    setupPlayerCollisions(player, enemiesGroup) {
        if (!player) return;
        if (this.walls) this.physics.add.collider(player, this.walls);
        if (enemiesGroup) {
            this.physics.add.collider(player, enemiesGroup, (p, enemy) => {
                if (this.gameStarted && !this.dialogueActive) {
                    p.takeDamage(10, enemy.x, enemy.y);
                }
            });
        }
    }
    
    finishBaseSetup(player) {
        this.uiManager.create();
        this.uiManager.update();
        
        const { width, height } = this.scale;
        this.cameras.main.setBounds(0, 0, width, height);
        if (player) {
            this.cameras.main.startFollow(player.visualSprite || player, false, 0.05, 0.05);
        }
    }
    
    updateBaseSystems(time, delta) {
        this.cameras.main.scrollY += Math.sin(time * 0.0015) * 0.03;
        
        if (this.lightManager) this.lightManager.update();
        if (this.uiManager) this.uiManager.update();
        
        if (this.dialogueActive && this.dialogueManager) {
            this.dialogueManager.update();
            return true; // True indicates that normal game logic should pause
        }
        return false;
    }
    
    gameOver(reason) {
        this.gameStarted = false;
        LevelManager.handleGameOver(this, reason);
    }
    
    showMessage(text, x, y) {
        const msg = this.add.text(x, y, text, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            color: '#ff4444',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.tweens.add({
            targets: msg,
            y: y - 40,
            alpha: 0,
            duration: 1500,
            onComplete: () => msg.destroy()
        });
    }
}
