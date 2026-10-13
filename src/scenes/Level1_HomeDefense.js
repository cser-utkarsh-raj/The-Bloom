/**
 * Level1_HomeDefense.js - Chennai House Defence
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Daughter from '../entities/Daughter.js';
import LevelManager from '../managers/LevelManager.js';
import BaseLevel from './BaseLevel.js';

export default class Level1_HomeDefense extends BaseLevel {
    constructor() {
        super("Level1_HomeDefense");
    }

    create() {
        const { width, height } = this.scale;
        
        // 1. Initialise State
        this.initBaseSystems();
        
        this.enemiesRemaining = LevelManager.getWaveSize();
        this.spawnedCount = 0;
        this.maxOnScreen = 5;
        
        // 2. Setup systems specific to this level
        this.lightManager.setup(0xffbb66, 0.08); // Warm golden daytime sunlight overlay
        this.weatherManager.setup('leaves'); // Volumetric fog + wind-blown leaves
        
        // Create Isometric Floor Grid
        this.createFloorGrid();
        
        // 3. Create Walls and Obstacles
        this.walls = this.physics.add.staticGroup();
        
        // Outer boundaries
        this.walls.create(width / 2, 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(width / 2, height - 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();
        this.walls.create(width - 10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();
        
        // Inside room dividers (living room, bedroom)
        this.walls.create(width * 0.35, height / 2, 'wallTexture').setDisplaySize(20, height * 0.7).refreshBody();
        this.walls.create(width * 0.7, height * 0.35, 'wallTexture').setDisplaySize(20, height * 0.5).refreshBody();
        
        // --- HOUSEHOLD FURNITURE (Tactical Obstacles) ---
        // Living room rug (visual only)
        const carpetIso = window.getIsoCoords(width * 0.52, height * 0.52);
        this.add.image(carpetIso.x, carpetIso.y, 'carpet').setScale(1.4).setAlpha(0.8).setDepth(-5000);
        
        // Living room sofa (collidable)
        this.walls.create(width * 0.52, height * 0.46, 'sofa').setScale(1.2).refreshBody();
        
        // Living room coffee table (collidable)
        this.walls.create(width * 0.52, height * 0.62, 'table').setScale(1.1).refreshBody();
        
        // Bedroom Bed (collidable, right room)
        this.walls.create(width * 0.85, height * 0.3, 'bed').setScale(1.2).refreshBody();

        // Setup 2.5D Wall and Furniture Visuals in Isometric projection
        this.setupIsometricWalls();
        
        // 4. Create Entrances (Spawners)
        this.entrances = [
            { x: 30, y: height * 0.2 },
            { x: width - 30, y: height * 0.8 },
            { x: width * 0.5, y: 30 },
            { x: width * 0.5, y: height - 30 }
        ];

        // Draw spawner indicators in isometric projection
        this.entrances.forEach(ent => {
            const iso = window.getIsoCoords(ent.x, ent.y);
            const ind = this.add.rectangle(iso.x, iso.y, 40, 40, 0x8b0000, 0.4);
            const txt = this.add.text(iso.x, iso.y, '🚪', { fontSize: '16px' }).setOrigin(0.5);
            ind.setDepth(-4000);
            txt.setDepth(-3999);
        });

        // 5. Entities
        this.playerSprite = new Player(this, width * 0.5, height * 0.5);
        this.playerSprite.setWeapon('plank'); // starting weapon
        
        this.daughterSprite = new Daughter(this, width * 0.5 - 40, height * 0.5);
        
        // Daisy (Wife - Helper NPC)
        this.daisySprite = this.physics.add.sprite(width * 0.2, height * 0.6, 'daisyChar');
        this.daisySprite.setCollideWorldBounds(true);
        this.daisySprite.body.setSize(24, 16);
        this.daisySprite.body.setOffset(4, 32); // feet level
        this.daisySprite.setVisible(false);

        this.daisyVisualSprite = this.add.sprite(this.daisySprite.x, this.daisySprite.y, 'daisyChar');
        this.daisyVisualSprite.setOrigin(0.5, 0.9);

        this.daisyShadow = this.add.ellipse(this.daisySprite.x, this.daisySprite.y + 22, 24, 8, 0x000000, 0.4);
        this.daisyTag = this.add.text(this.daisySprite.x, this.daisySprite.y - 25, 'DAISY', {
            fontFamily: 'Cinzel, serif',
            fontSize: '9px',
            color: '#9370db',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.daisyLastAttack = 0;
        
        // 6. Physics Collisions & Inputs
        this.enemies = this.physics.add.group();
        this.setupPlayerCollisions(this.playerSprite, this.enemies);
        this.physics.add.collider(this.daughterSprite, this.walls);
        this.physics.add.collider(this.daisySprite, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        
        this.setupInputs(this.playerSprite, this.enemies);

        // 8. Finalize UI and Camera
        this.finishBaseSetup(this.playerSprite);

        // 8c. Environmental details (Chennai garden yard scooter)
        const scooterIso = window.getIsoCoords(width * 0.15, height * 0.75);
        this.add.image(scooterIso.x, scooterIso.y, 'scooterTexture').setOrigin(0.5, 0.8).setDepth(scooterIso.x + scooterIso.y);

        // 9. Death Event
        this.events.on('player-died', () => {
            this.gameOver("SAMAR AND NANCY DIED");
        });

        // 10. Start Dialogue sequence
        this.startIntroDialogue();
    }

    startIntroDialogue() {
        this.dialogueActive = true;
        
        const introLines = [
            { speaker: 'Broadcaster', text: '...Local authorities urge all citizens of Chennai to remain indoors. Avoid crowds. Report any individuals exhibiting rigid postures or unblinking stares...' },
            { speaker: 'Nancy', text: 'Daddy... why is everyone standing outside in the street? They aren\'t moving at all.' },
            { speaker: 'Samar', text: 'They are just staring at our windows, Nancy. Keep away from the glass. Daisy, did you lock the front gate?' },
            { speaker: 'Daisy', text: 'Yes, but it won\'t hold them. Look at their eyes... they don\'t look human anymore. They\'re trying to push their way in!' },
            { speaker: 'Samar', text: 'I\'ll hold them off with this wooden plank. Nancy, stay right behind me!' }
        ];

        this.dialogueManager.start(introLines, () => {
            this.dialogueActive = false;
            this.gameStarted = true;
            this.showMessage("DEFEND THE DOORS!", this.scale.width / 2, this.scale.height / 2);
        });
    }

    spawnBeing() {
        if (this.spawnedCount >= LevelManager.getWaveSize()) return;
        if (this.enemies.getLength() >= this.maxOnScreen) return;

        const ent = this.entrances[Phaser.Math.Between(0, this.entrances.length - 1)];
        const enemy = this.enemies.create(ent.x, ent.y, 'enemyChar');
        enemy.health = 30 + (LevelManager.difficulty === 'hard' ? 15 : 0);
        enemy.speed = 60 + (LevelManager.difficulty === 'hard' ? 20 : 0);
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setSize(28, 28);
        this.spawnedCount++;
    }

    update(time, delta) {
        if (this.updateBaseSystems(time, delta)) {
            // Sync entities for idle animations during dialogue
            if (this.playerSprite) this.playerSprite.update(this.cursors, null);
            if (this.daughterSprite) this.daughterSprite.update(this.playerSprite);
            if (this.daisySprite) this.updateDaisyAI(time);
            return;
        }
        
        if (!this.gameStarted) return;

        // Player updates
        const pointer = this.input.activePointer;
        this.playerSprite.update(this.cursors, pointer);
        this.daughterSprite.update(this.playerSprite);

        // Helper Daisy AI logic
        this.updateDaisyAI(time);

        // Enemy AI chase logic & Isometric projection
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerSprite.x, this.playerSprite.y);
                enemy.body.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
                
                // 2.5D Physics adjustments
                enemy.body.setSize(24, 16);
                enemy.body.setOffset(4, 32);

                // Create visual representation if not initialized
                if (!enemy.visualSprite) {
                    enemy.setVisible(false);
                    enemy.visualSprite = this.add.sprite(enemy.x, enemy.y, 'enemyChar');
                    enemy.visualSprite.setOrigin(0.5, 0.9);
                    // Match human scale proportions
                    enemy.visualSprite.setScale(0.15);
                    enemy.visualShadow = this.add.ellipse(0, 0, 24, 8, 0x000000, 0.4);
                }

                // Project positions
                const iso = window.getIsoCoords(enemy.x, enemy.y);
                enemy.visualSprite.setPosition(iso.x, iso.y);
                enemy.visualSprite.setDepth(enemy.x + enemy.y);
                enemy.visualSprite.flipX = (enemy.body.velocity.x < 0);

                enemy.visualShadow.setPosition(iso.x, iso.y);
                enemy.visualShadow.setDepth(enemy.visualSprite.depth - 1);
            }
        });

        // Spawn timer logic
        if (Phaser.Math.Between(0, 100) < 2) {
            this.spawnBeing();
        }

        // Check level completion
        if (this.enemiesRemaining <= 0) {
            this.completeLevel();
        }
    }

    updateDaisyAI(time) {
        const daisyIso = window.getIsoCoords(this.daisySprite.x, this.daisySprite.y);
        
        // Procedural walking/breathing for Daisy NPC helper
        const isMoving = (this.daisySprite.body.velocity.x !== 0 || this.daisySprite.body.velocity.y !== 0);
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
        
        this.daisyVisualSprite.setPosition(daisyIso.x, daisyIso.y + bobY);
        this.daisyVisualSprite.setRotation(tiltRot);
        this.daisyVisualSprite.setScale(1.0 + squashX, 1.0 + squashY);
        
        const depthVal = this.daisySprite.x + this.daisySprite.y;
        this.daisyVisualSprite.setDepth(depthVal);
        
        if (this.daisySprite.body.velocity.x !== 0) {
            this.daisyVisualSprite.flipX = (this.daisySprite.body.velocity.x < 0);
        }

        this.daisyShadow.setPosition(this.daisyVisualSprite.x, this.daisyVisualSprite.y);
        this.daisyTag.setPosition(this.daisyVisualSprite.x, this.daisyVisualSprite.y - 25);
        this.daisyShadow.setDepth(depthVal - 1);
        this.daisyTag.setDepth(depthVal + 1);

        // Simple helper logic: Find nearest enemy, move and strike
        let target = null;
        let closest = Infinity;

        this.enemies.getChildren().forEach(enemy => {
            const d = Phaser.Math.Distance.Between(this.daisySprite.x, this.daisySprite.y, enemy.x, enemy.y);
            if (d < closest) {
                closest = d;
                target = enemy;
            }
        });

        if (target) {
            const angle = Phaser.Math.Angle.Between(this.daisySprite.x, this.daisySprite.y, target.x, target.y);
            this.daisySprite.setRotation(angle);

            if (closest > 40) {
                // Walk toward target
                this.daisySprite.body.setVelocity(Math.cos(angle) * 110, Math.sin(angle) * 110);
            } else {
                this.daisySprite.body.setVelocity(0, 0);
                
                // Strike every 1 second
                if (time - this.daisyLastAttack > 1000) {
                    this.daisyLastAttack = time;
                    target.health -= 15;
                    
                    // Show strike flash
                    const flash = this.add.circle(target.x, target.y, 10, 0x9370db, 0.5);
                    this.time.delayedCall(100, () => flash.destroy());

                    if (target.health <= 0) {
                        if (target.visualSprite) target.visualSprite.destroy();
                        if (target.visualShadow) target.visualShadow.destroy();
                        target.destroy();
                        this.enemiesRemaining--;
                        if (this.uiManager) this.uiManager.update();
                    }
                }
            }
        } else {
            // Idle state: follow Nancy slightly
            const dNancy = Phaser.Math.Distance.Between(this.daisySprite.x, this.daisySprite.y, this.daughterSprite.x, this.daughterSprite.y);
            if (dNancy > 60) {
                const angle = Phaser.Math.Angle.Between(this.daisySprite.x, this.daisySprite.y, this.daughterSprite.x, this.daughterSprite.y);
                this.daisySprite.body.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
            } else {
                this.daisySprite.body.setVelocity(0, 0);
            }
        }
    }



    completeLevel() {
        this.gameStarted = false;
        this.playerSprite.body.setVelocity(0, 0);
        this.daisySprite.body.setVelocity(0, 0);
        this.enemies.clear(true, true);

        // Play victory/level complete sound
        try { this.sound.play('correct', { volume: 0.35 }); } catch (e) {}
        
        this.dialogueActive = true;
        const outroLines = [
            { speaker: 'Samar', text: 'They... they\'re stopping. They are all walking away back into the fog...' },
            { speaker: 'Nancy', text: 'Daddy... is it over? Can we go out now?' },
            { speaker: 'Samar', text: 'Not yet, Nancy. Daisy, we need to gather all the food and water we can. Daisy?' },
            { speaker: 'Samar', text: 'Daisy! Why are you just staring out the window like that? Why won\'t you answer me...' },
            { speaker: 'Samar', text: '(She doesn\'t answer. She isn\'t even blinking. What is happening to her?)' }
        ];

        this.dialogueManager.start(outroLines, () => {
            this.dialogueActive = false;
            this.cameras.main.fadeOut(2000, 0, 0, 0);
            this.time.delayedCall(2000, () => {
                LevelManager.currentLevel = 2;
                localStorage.setItem("theBloom_level", "2");
                this.scene.start("Level2_WifeBoss");
            });
        });
    }

    showMessage(text, x, y) {
        const msg = this.add.text(x, y, text, {
            fontFamily: "Cinzel",
            fontSize: "20px",
            color: "#b89d68",
            letterSpacing: 3
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: msg,
            alpha: 1,
            y: y - 20,
            duration: 800,
            yoyo: true,
            hold: 1200,
            onComplete: () => msg.destroy()
        });
    }

    gameOver(reason) {
        this.gameStarted = false;
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        
        this.time.delayedCall(1500, () => {
            this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, "YOU DIED", {
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