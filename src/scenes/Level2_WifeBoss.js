/**
 * Level2_WifeBoss.js - The Infected Wife Boss Fight
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Daughter from '../entities/Daughter.js';
import LevelManager from '../managers/LevelManager.js';
import BaseLevel from './BaseLevel.js';

export default class Level2_WifeBoss extends BaseLevel {
    constructor() {
        super("Level2_WifeBoss");
    }

    create() {
        const { width, height } = this.scale;
        // 1. Initialise State
        this.initBaseSystems();
        
        // 2. Setup systems specific to this level
        this.lightManager.setup(0x07070b, 0.94); // Dark night ambient shadow
        this.weatherManager.setup('rain'); // Atmospheric storm rain
        
        // Create Isometric Floor Grid
        this.createFloorGrid();
        
        // Arena walls (kitchen/living area layout)
        this.walls = this.physics.add.staticGroup();
        this.walls.create(width / 2, 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(width / 2, height - 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();
        this.walls.create(width - 10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();

        // Kitchen counter blocks in the center (collidable kitchen slab)
        this.walls.create(width * 0.5, height * 0.4, 'kitchenCounter').setDisplaySize(120, 40).refreshBody();
        
        this.walls.create(width * 0.15, height * 0.3, 'table').setScale(1.1).refreshBody();

        // Setup 2.5D Wall and Furniture Visuals in Isometric projection
        this.setupIsometricWalls();

        // Safe spots for Nancy to retreat
        this.safeSpots = [
            { x: 50, y: 50 },
            { x: width - 50, y: 50 },
            { x: 50, y: height - 50 },
            { x: width - 50, y: height - 50 }
        ];

        // Samar & Nancy
        this.playerSprite = new Player(this, width * 0.3, height * 0.6);
        this.playerSprite.setWeapon('plank'); // Persistent plank
        
        this.daughterSprite = new Daughter(this, width * 0.25, height * 0.6);
        
        // Boss Daisy (Infected)
        // Boss Daisy (Infected)
        this.boss = this.physics.add.sprite(width * 0.5, height * 0.3, 'daisyInfectedChar');
        this.boss.setCollideWorldBounds(true);
        this.boss.body.setSize(24, 16);
        this.boss.body.setOffset(4, 32); // feet level
        this.boss.setVisible(false);

        this.bossVisualSprite = this.add.sprite(this.boss.x, this.boss.y, 'daisyInfectedChar');
        this.bossVisualSprite.setOrigin(0.5, 0.9);

        this.boss.health = 220; // Balanced health (not overpowered)
        this.boss.maxHealth = 220;
        this.boss.speed = 75; // Balanced speed (not overpowered)
        this.bossShadow = this.add.ellipse(this.boss.x, this.boss.y + 22, 24, 8, 0x000000, 0.4);

        // Spawn Flashlight Pick-up item on the floor in Level 2
        this.flashlightItem = this.physics.add.sprite(width * 0.5, height * 0.7, 'flashlightCone');
        this.flashlightItem.setTint(0xffff00);
        this.flashlightItem.setScale(0.3);
        this.flashlightItem.setVisible(false);

        const flIso = window.getIsoCoords(width * 0.5, height * 0.7);
        this.flashlightItemVisual = this.add.image(flIso.x, flIso.y, 'flashlightCone')
            .setScale(0.3)
            .setTint(0xffff00)
            .setDepth(flIso.y + 1);

        this.tweens.add({
            targets: this.flashlightItemVisual,
            alpha: 0.3,
            scale: 0.35,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.physics.add.overlap(this.playerSprite, this.flashlightItem, () => {
            this.playerSprite.hasFlashlight = true;
            this.playerSprite.flashlightOn = true;
            this.flashlightItem.destroy();
            this.flashlightItemVisual.destroy();
            
            // Switch light source from playerGlow to cone!
            if (this.playerGlow) this.playerGlow.active = false;
            this.flashlightLight = this.lightManager.addLight(this.playerSprite, 380, 'cone', 0xffffff, 0.95);
            
            if (this.uiManager && this.uiManager.objectiveText) {
                this.uiManager.objectiveText.setText("OBJECTIVE: SURVIVE & DEFEAT DAISY").setColor("#ff3333");
            }
            this.showMessage("FOUND FLASHLIGHT!", this.playerSprite.visualSprite.x, this.playerSprite.visualSprite.y - 30);
            try { this.sound.play('correct', { volume: 0.35 }); } catch (e) {}
        });
        
        // Colliders
        this.physics.add.collider(this.playerSprite, this.walls);
        this.physics.add.collider(this.daughterSprite, this.walls);
        this.physics.add.collider(this.boss, this.walls);

        // Player attacks boss
        this.input.on('pointerdown', (pointer) => {
            if (this.gameStarted && !this.dialogueActive && this.boss.active) {
                // Tactical proximity check
                const distToNancy = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.daughterSprite.x, this.daughterSprite.y);
                
                this.playerSprite.attack(pointer, [this.boss], (target, dmg) => {
                    if (distToNancy < 70) {
                        this.showMessage("NANCY IS TOO CLOSE! LURE DAISY AWAY!", this.scale.width / 2, this.scale.height / 2);
                        return;
                    }
                    
                    target.health -= dmg;
                    this.cameras.main.shake(100, 0.005);
                    
                    const b = this.add.image(this.bossVisualSprite.x, this.bossVisualSprite.y - 12, 'blood');
                    this.time.delayedCall(300, () => b.destroy());

                    // Red flash for boss sprite
                    if (this.bossVisualSprite) {
                        this.bossVisualSprite.setTint(0xff0000);
                        this.time.delayedCall(150, () => {
                            if (this.bossVisualSprite) this.bossVisualSprite.clearTint();
                        });
                    }
                    
                    if (this.uiManager) this.uiManager.update();

                    if (target.health <= 0) {
                        this.defeatBoss();
                    }
                });
            }
        });

        // Player takes damage from Boss
        this.physics.add.collider(this.playerSprite, this.boss, (p, b) => {
            if (this.gameStarted && !this.dialogueActive) {
                p.takeDamage(15, b.x, b.y);
            }
        });

        // Nancy takes damage from Boss (Panic increases and triggers gameover if too close)
        this.physics.add.collider(this.daughterSprite, this.boss, () => {
            if (this.gameStarted && !this.dialogueActive) {
                this.cameras.main.shake(150, 0.01);
                this.gameOver("DAISY TOOK NANCY!");
            }
        });

        // Setup Movement Inputs (without default attack handler since we have custom boss attack)
        this.setupInputs(this.playerSprite, null);

        // Finalize UI and Camera
        this.finishBaseSetup(this.playerSprite);
        if (this.uiManager.objectiveText) {
            this.uiManager.objectiveText.setText("OBJECTIVE: FIND FLASHLIGHT ON THE FLOOR");
        }

        // Setup starting light sources (nighttime matches/lighter level)
        this.playerGlow = this.lightManager.addLight(this.playerSprite, 45, 'point', 0xffffff, 0.4);
        this.daisyLight = this.lightManager.addLight(this.boss, 75, 'point', 0xffa500, 0.85);

        // Register shadow casters
        if (this.walls) this.walls.getChildren().forEach(wall => this.lightManager.addShadowCaster(wall));
        this.lightManager.addShadowCaster(this.playerSprite);
        this.lightManager.addShadowCaster(this.daughterSprite);
        this.lightManager.addShadowCaster(this.boss);

        // Death event
        this.events.on('player-died', () => {
            this.gameOver("SAMAR AND NANCY DIED");
        });

        this.startIntroDialogue();
    }

    startIntroDialogue() {
        this.dialogueActive = true;
        
        const lines = [
            { speaker: 'System', text: 'Two days later. Chennai is collapsing. The air smells of decay...' },
            { speaker: 'Samar', text: 'Daisy? What are you doing sitting on the kitchen counter in the dark? What is that smell...' },
            { speaker: 'Daisy', text: 'It\'s so warm, Samar... can you hear the whispers? We need to bring Nancy into the light.' },
            { speaker: 'Samar', text: 'Daisy... drop the lighter. Your eyes... they\'re dead. You were scratched in the doorway, weren\'t you?' },
            { speaker: 'Daisy', text: 'She must join us. We must bloom together.' },
            { speaker: 'Samar', text: 'No! Nancy, run to the corner! Stay away from her!' }
        ];

        this.dialogueManager.start(lines, () => {
            this.dialogueActive = false;
            this.gameStarted = true;
            this.boss.setVisible(true);
        });
    }

    update(time, delta) {
        if (this.updateBaseSystems(time, delta)) {
            // Sync entities for idle animations during dialogue
            if (this.playerSprite) this.playerSprite.update(this.cursors, null);
            if (this.daughterSprite) this.daughterSprite.update(this.playerSprite);
            if (this.boss && this.boss.active) {
                const bossIso = window.getIsoCoords(this.boss.x, this.boss.y);
                const bobY = Math.sin(time * 0.002) * 0.5;
                const squashY = Math.sin(time * 0.002) * 0.012;
                const squashX = -squashY;
                this.bossVisualSprite.setPosition(bossIso.x, bossIso.y + bobY);
                this.bossVisualSprite.setScale(1.0 + squashX, 1.0 + squashY);
                this.bossVisualSprite.setDepth(this.boss.x + this.boss.y);
                if (this.bossShadow) {
                    this.bossShadow.setPosition(this.bossVisualSprite.x, this.bossVisualSprite.y);
                    this.bossShadow.setDepth(this.bossVisualSprite.depth - 1);
                }
            }
            return;
        }
        if (!this.gameStarted) return;

        const pointer = this.input.activePointer;
        this.playerSprite.update(this.cursors, pointer);
        this.daughterSprite.update(this.playerSprite);

        // Update boss shadow, depth sorting & procedural animations in Isometric space
        if (this.boss && this.boss.active) {
            const bossIso = window.getIsoCoords(this.boss.x, this.boss.y);
            const isMoving = (this.boss.body.velocity.x !== 0 || this.boss.body.velocity.y !== 0);
            let bobY = 0;
            let tiltRot = 0;
            let squashX = 0;
            let squashY = 0;
            
            if (isMoving) {
                bobY = Math.sin(time * 0.010) * 1.5;
                tiltRot = Math.cos(time * 0.010) * 0.04;
                squashY = Math.sin(time * 0.020) * 0.025;
                squashX = -squashY;
            } else {
                bobY = Math.sin(time * 0.002) * 0.5;
                squashY = Math.sin(time * 0.002) * 0.012;
                squashX = -squashY;
            }
            
            this.bossVisualSprite.setPosition(bossIso.x, bossIso.y + bobY);
            this.bossVisualSprite.setRotation(tiltRot);
            this.bossVisualSprite.setScale(1.0 + squashX, 1.0 + squashY);
            
            const depthVal = this.boss.x + this.boss.y;
            this.bossVisualSprite.setDepth(depthVal);
            this.bossVisualSprite.flipX = (this.boss.body.velocity.x < 0);
            
            if (this.bossShadow) {
                this.bossShadow.setPosition(this.bossVisualSprite.x, this.bossVisualSprite.y);
                this.bossShadow.setDepth(depthVal - 1);
            }
            
            // Boss AI: Charge toward Nancy, but if Samar blocks, hit Samar
            const distToNancy = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.daughterSprite.x, this.daughterSprite.y);
            const distToSamar = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.playerSprite.x, this.playerSprite.y);
            
            let targetX = this.daughterSprite.x;
            let targetY = this.daughterSprite.y;
            
            // If Samar is very close and blocking, target Samar instead
            if (distToSamar < 70) {
                targetX = this.playerSprite.x;
                targetY = this.playerSprite.y;
            }

            const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, targetX, targetY);
            this.boss.body.setVelocity(Math.cos(angle) * this.boss.speed, Math.sin(angle) * this.boss.speed);
            this.boss.setRotation(angle);
        }
    }



    defeatBoss() {
        this.gameStarted = false;
        this.boss.body.setVelocity(0, 0);
        this.playerSprite.body.setVelocity(0, 0);
        if (this.bossVisualSprite) this.bossVisualSprite.destroy();
        this.boss.destroy();
        this.bossShadow.destroy();
        
        // Play boss defeat sound
        try { this.sound.play('correct2', { volume: 0.35 }); } catch (e) {}
        
        // Show watery liquid visual in isometric coords
        const puddleIso = window.getIsoCoords(this.playerSprite.x + 40, this.playerSprite.y);
        const puddle = this.add.ellipse(puddleIso.x, puddleIso.y, 60, 30, 0x8b5a2b, 0.6).setDepth(-4000);

        this.dialogueActive = true;
        const outroLines = [
            { speaker: 'Samar', text: 'Daisy... I\'m sorry. I had to...' },
            { speaker: 'Nancy', text: 'Mommy? Why isn\'t she moving? Daddy, she isn\'t breathing...' },
            { speaker: 'Samar', text: 'Look at the floor... that wound. It isn\'t bleeding red. It\'s... brown watery sap.' },
            { speaker: 'System', text: '*BEEP* *BEEP* (Samar\'s phone vibrates. A broadcast text alerts the area...)' },
            { speaker: 'Phone Text', text: 'CRITICAL WARNING: CHENNAI NEIGHBORHOODS FULLY COMPROMISED. MILITARY EVAC CHECKPOINT ESTABLISHED AT GOVERNMENT METRIC SCHOOL. SEEK SHELTER IMMEDIATELY.' },
            { speaker: 'Samar', text: 'The school... where I teach. We have to go, Nancy. We can\'t stay here anymore.' }
        ];

        this.dialogueManager.start(outroLines, () => {
            this.dialogueActive = false;
            this.cameras.main.fadeOut(2000, 0, 0, 0);
            this.time.delayedCall(2000, () => {
                LevelManager.currentLevel = 3;
                localStorage.setItem("theBloom_level", "3");
                this.scene.start("Level3_RoadEscape");
            });
        });
    }

    showMessage(text, x, y) {
        const msg = this.add.text(x, y, text, {
            fontFamily: "Cinzel",
            fontSize: "14px",
            color: "#ff3333",
            align: "center"
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: msg,
            alpha: 1,
            y: y - 15,
            duration: 500,
            yoyo: true,
            hold: 1000,
            onComplete: () => msg.destroy()
        });
    }

    gameOver(reason) {
        this.gameStarted = false;
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        
        this.time.delayedCall(1500, () => {
            this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, "YOU FAILED", {
                fontFamily: "Cinzel",
                fontSize: "40px",
                color: "#ff0000",
                letterSpacing: 6
            }).setOrigin(0.5);

            this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, reason, {
                fontFamily: "Inter",
                fontSize: "12px",
                color: "#ffffff"
            }).setOrigin(0.5);

            this.time.delayedCall(2500, () => {
                this.scene.restart();
            });
        });
    }
}