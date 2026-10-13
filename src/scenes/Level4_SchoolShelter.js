/**
 * Level4_SchoolShelter.js - The Collapse of Hope
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Daughter from '../entities/Daughter.js';
import LevelManager from '../managers/LevelManager.js';
import BaseLevel from './BaseLevel.js';

export default class Level4_SchoolShelter extends BaseLevel {
    constructor() {
        super("Level4_SchoolShelter");
    }

    create() {
        const { width, height } = this.scale;
        
        // 1. Initialise State
        this.initBaseSystems();
        this.bloomTransformed = false;
        
        // 2. Setup systems specific to this level
        this.lightManager.setup(0xffbb66, 0.08); // Warm golden sunlight
        this.weatherManager.setup('spores'); // Fungal spores drifting through school corridors
        
        // Inside School tiles (using gray bricks)
        // Create Isometric Floor Grid for Level 4
        this.createFloorGrid();
        
        // Inner corridor boundaries
        this.walls = this.physics.add.staticGroup();
        this.walls.create(width / 2, 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(width / 2, height - 10, 'wallTexture').setDisplaySize(width, 20).refreshBody();
        this.walls.create(10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();
        this.walls.create(width - 10, height / 2, 'wallTexture').setDisplaySize(20, height).refreshBody();

        // Classroom partitions
        this.walls.create(width * 0.3, height * 0.35, 'wallTexture').setDisplaySize(20, height * 0.5).refreshBody();
        this.walls.create(width * 0.7, height * 0.65, 'wallTexture').setDisplaySize(20, height * 0.5).refreshBody();

        // Samar & Nancy
        this.playerSprite = new Player(this, width * 0.2, height * 0.5);
        
        // Keep weapon from Level 3 if possible
        if (this.playerSprite.weapon === 'unarmed') {
            this.playerSprite.setWeapon('pistol', 24); // Fallback starter weapon
        }
        
        this.daughterSprite = new Daughter(this, width * 0.15, height * 0.5);

        // Inspector Sikander (Helper NPC)
        this.sikander = this.physics.add.sprite(width * 0.3, height * 0.5, 'playerChar');
        this.sikander.setTint(0xb89d68); // Gold tint/badge
        this.sikander.setCollideWorldBounds(true);
        this.sikander.body.setSize(24, 16);
        this.sikander.body.setOffset(4, 32); // feet level
        this.sikander.setVisible(false);

        this.sikanderVisualSprite = this.add.sprite(this.sikander.x, this.sikander.y, 'playerChar');
        this.sikanderVisualSprite.setTint(0xb89d68);
        this.sikanderVisualSprite.setOrigin(0.5, 0.9);

        this.sikanderShadow = this.add.ellipse(this.sikander.x, this.sikander.y + 22, 24, 8, 0x000000, 0.4);
        this.sikanderTag = this.add.text(this.sikander.x, this.sikander.y - 25, 'INSP. SIKANDER', {
            fontFamily: 'Cinzel',
            fontSize: '9px',
            color: '#b89d68',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.sikanderLastShot = 0;

        // Victim about to transform
        this.victim = this.physics.add.sprite(width * 0.6, height * 0.5, 'daisyChar');
        this.victim.setTint(0x555555);
        this.victim.body.setSize(24, 16);
        this.victim.body.setOffset(4, 32);
        this.victim.setVisible(false);

        this.victimVisualSprite = this.add.sprite(this.victim.x, this.victim.y, 'daisyChar');
        this.victimVisualSprite.setTint(0x555555);
        this.victimVisualSprite.setOrigin(0.5, 0.9);

        // Groups
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();

        // Colliders
        this.physics.add.collider(this.playerSprite, this.walls);
        this.physics.add.collider(this.daughterSprite, this.walls);
        this.physics.add.collider(this.sikander, this.walls);
        this.physics.add.collider(this.enemies, this.walls);

        // Combat triggers
        this.setupInputs(this.playerSprite, this.enemies);

        // Samar hit by enemies
        this.physics.add.collider(this.playerSprite, this.enemies, (p, enemy) => {
            if (this.gameStarted && !this.dialogueActive) {
                p.takeDamage(enemy.isBloom ? 20 : 10, enemy.x, enemy.y);
            }
        });

        // Samar hit by spore projectiles
        this.physics.add.overlap(this.playerSprite, this.projectiles, (p, proj) => {
            if (this.gameStarted && !this.dialogueActive) {
                proj.destroy();
                p.takeDamage(15, proj.x, proj.y);
            }
        });

        this.events.on('player-died', () => {
            this.gameOver("SAMAR AND NANCY DIED");
        });

        // Setup 2.5D Wall and Furniture Visuals in Isometric projection
        this.setupIsometricWalls();

        // UI and Camera
        this.finishBaseSetup(this.playerSprite);
        if (this.uiManager.objectiveText) {
            this.uiManager.objectiveText.setText("OBJECTIVE: DEFEAT THE BLOOM HOST");
        }

        // Register shadow casters for sunlight depth sorting
        if (this.walls) this.walls.getChildren().forEach(wall => this.lightManager.addShadowCaster(wall));
        this.lightManager.addShadowCaster(this.playerSprite);
        this.lightManager.addShadowCaster(this.daughterSprite);

        this.startIntroDialogue();
    }

    startIntroDialogue() {
        this.dialogueActive = true;
        
        const lines = [
            { speaker: 'Samar', text: 'Sikander! The gates are holding, but there are infected inside the hallways!' },
            { speaker: 'Sikander', text: 'I\'ve been clearing them out. Anyone who shows symptoms gets executed immediately. It\'s the only way.' },
            { speaker: 'Nancy', text: 'Daddy... that man on the floor. He is coughing up green water.' },
            { speaker: 'Victim', text: 'Please... help me... I can feel my skull splitting... the warm light is inside my brain...' },
            { speaker: 'Sikander', text: 'Get back! He is turning right now!' }
        ];

        this.dialogueManager.start(lines, () => {
            this.triggerTransformation();
        });
    }

    triggerTransformation() {
        this.cameras.main.flash(1000, 139, 0, 0, 0.4);
        
        // Spawn Bloom Host at victim's coordinates
        const vx = this.victim.x;
        const vy = this.victim.y;
        if (this.victimVisualSprite) this.victimVisualSprite.destroy();
        this.victim.destroy();

        this.bloomHost = this.enemies.create(vx, vy, 'enemyChar');
        this.bloomHost.setTint(0xff8c00); // Orange/Yellow flower tint
        this.bloomHost.setScale(0.8);
        this.bloomHost.body.setImmovable(true);
        this.bloomHost.health = 250;
        this.bloomHost.isBloom = true;
        this.bloomHost.lastShot = 0;

        // Spawn a couple of regular Beings alongside
        for (let i = 0; i < 3; i++) {
            const minion = this.enemies.create(vx + Phaser.Math.Between(-80, 80), vy + Phaser.Math.Between(-80, 80), 'enemyChar');
            minion.health = 40;
            minion.speed = 80;
            minion.body.setCollideWorldBounds(true);
            minion.body.setSize(28, 28);
        }

        this.dialogueActive = true;
        const dialogue = [
            { speaker: 'Sikander', text: 'My god... his head split into a giant sunflower... it\'s release spores! OPEN FIRE!' }
        ];

        this.dialogueManager.start(dialogue, () => {
            this.dialogueActive = false;
            this.gameStarted = true;
        });
    }

    update(time, delta) {
        if (this.updateBaseSystems(time, delta)) {
            // Sync entities for idle animations during dialogue
            if (this.playerSprite) this.playerSprite.update(this.cursors, null);
            if (this.daughterSprite) this.daughterSprite.update(this.playerSprite);
            if (this.sikander) this.updateSikander(time);
            return;
        }
        if (!this.gameStarted) return;

        const pointer = this.input.activePointer;
        this.playerSprite.update(this.cursors, pointer);
        this.daughterSprite.update(this.playerSprite);
        
        // Update victim position in isometric space
        if (this.victim && this.victim.active) {
            const vIso = window.getIsoCoords(this.victim.x, this.victim.y);
            this.victimVisualSprite.setPosition(vIso.x, vIso.y);
            this.victimVisualSprite.setDepth(this.victim.x + this.victim.y);
        }

        // Update Sikander
        this.updateSikander(time);

        // Update Bloom Host (Shoots spore projectiles at Samar)
        if (this.bloomHost && this.bloomHost.active) {
            if (time - this.bloomHost.lastShot > 1500) {
                this.bloomHost.lastShot = time;
                this.shootSpore(this.bloomHost.x, this.bloomHost.y);
            }
        }

        // Being chase logic & Isometric sorting
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && !enemy.isBloom) {
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerSprite.x, this.playerSprite.y);
                enemy.body.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
                
                // 2.5D updates
                enemy.body.setSize(24, 16);
                enemy.body.setOffset(4, 32);

                // Create visual representation if not initialized
                if (!enemy.visualSprite) {
                    enemy.setVisible(false);
                    enemy.visualSprite = this.add.sprite(enemy.x, enemy.y, 'enemyChar');
                    enemy.visualSprite.setOrigin(0.5, 0.9);
                    enemy.visualSprite.setScale(0.15); // Match human proportion
                    enemy.visualShadow = this.add.ellipse(0, 0, 24, 8, 0x000000, 0.4);
                }

                // Project positions
                const iso = window.getIsoCoords(enemy.x, enemy.y);
                enemy.visualSprite.setPosition(iso.x, iso.y);
                enemy.visualSprite.setDepth(enemy.x + enemy.y);
                enemy.visualSprite.flipX = (enemy.body.velocity.x < 0);

                enemy.visualShadow.setPosition(iso.x, iso.y);
                enemy.visualShadow.setDepth(enemy.visualSprite.depth - 1);
            } else if (enemy.active && enemy.isBloom) {
                // Bloom Host boss coordinates projection
                if (!enemy.visualSprite) {
                    enemy.setVisible(false);
                    enemy.visualSprite = this.add.sprite(enemy.x, enemy.y, 'enemyChar');
                    enemy.visualSprite.setOrigin(0.5, 0.9);
                    enemy.visualSprite.setScale(0.25); // Bloom Host is larger
                    enemy.visualSprite.setTint(0xff8c00);
                    enemy.visualShadow = this.add.ellipse(0, 0, 36, 12, 0x000000, 0.4);
                }
                const iso = window.getIsoCoords(enemy.x, enemy.y);
                enemy.visualSprite.setPosition(iso.x, iso.y);
                enemy.visualSprite.setDepth(enemy.x + enemy.y);
                enemy.visualShadow.setPosition(iso.x, iso.y);
                enemy.visualShadow.setDepth(enemy.visualSprite.depth - 1);
            }
        });

        // Check level complete
        if (this.bloomHost && !this.bloomHost.active && this.enemies.getLength() === 0) {
            this.completeLevel();
        }
    }

    updateSikander(time) {
        const sIso = window.getIsoCoords(this.sikander.x, this.sikander.y);
        
        // Procedural walking/breathing for Sikander NPC helper
        const isMoving = (this.sikander.body.velocity.x !== 0 || this.sikander.body.velocity.y !== 0);
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
        
        this.sikanderVisualSprite.setPosition(sIso.x, sIso.y + bobY);
        this.sikanderVisualSprite.setRotation(tiltRot);
        this.sikanderVisualSprite.setScale(0.5 * (1.0 + squashX), 0.5 * (1.0 + squashY));
        
        const depthVal = this.sikander.x + this.sikander.y;
        this.sikanderVisualSprite.setDepth(depthVal);
        
        if (this.sikander.body.velocity.x !== 0) {
            this.sikanderVisualSprite.flipX = (this.sikander.body.velocity.x < 0);
        }

        this.sikanderShadow.setPosition(this.sikanderVisualSprite.x, this.sikanderVisualSprite.y);
        this.sikanderTag.setPosition(this.sikanderVisualSprite.x, this.sikanderVisualSprite.y - 25);
        this.sikanderShadow.setDepth(depthVal - 1);
        this.sikanderTag.setDepth(depthVal + 1);

        // Find nearest target for Sikander
        let target = null;
        let closest = Infinity;

        this.enemies.getChildren().forEach(enemy => {
            const d = Phaser.Math.Distance.Between(this.sikander.x, this.sikander.y, enemy.x, enemy.y);
            if (d < closest) {
                closest = d;
                target = enemy;
            }
        });

        if (target) {
            const angle = Phaser.Math.Angle.Between(this.sikander.x, this.sikander.y, target.x, target.y);
            this.sikander.setRotation(angle);

            // Follow player but shoot targets from distance
            const dToPlayer = Phaser.Math.Distance.Between(this.sikander.x, this.sikander.y, this.playerSprite.x, this.playerSprite.y);
            if (dToPlayer > 80) {
                const anglePlayer = Phaser.Math.Angle.Between(this.sikander.x, this.sikander.y, this.playerSprite.x, this.playerSprite.y);
                this.sikander.body.setVelocity(Math.cos(anglePlayer) * 110, Math.sin(anglePlayer) * 110);
            } else {
                this.sikander.body.setVelocity(0, 0);
            }

            // Shoot rifle every 800ms
            if (time - this.sikanderLastShot > 800) {
                this.sikanderLastShot = time;
                target.health -= 20;

                // Draw rifle tracer line
                const tracer = this.add.line(0, 0, this.sikander.x, this.sikander.y, target.x, target.y, 0xffaa00, 0.7);
                tracer.setLineWidth(2);
                this.time.delayedCall(80, () => tracer.destroy());

                if (target.health <= 0) {
                    target.destroy();
                    if (this.uiManager) this.uiManager.update();
                }
            }
        } else {
            this.sikander.body.setVelocity(0, 0);
        }
    }

    shootSpore(sx, sy) {
        const angle = Phaser.Math.Angle.Between(sx, sy, this.playerSprite.x, this.playerSprite.y);
        const spore = this.projectiles.create(sx, sy, 'blood');
        spore.setTint(0xffa500); // orange projectile
        spore.body.setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180);
        
        // Destroy spore after 3 seconds
        this.time.delayedCall(3000, () => {
            if (spore && spore.active) spore.destroy();
        });
    }



    completeLevel() {
        this.gameStarted = false;
        this.playerSprite.body.setVelocity(0, 0);
        this.sikander.body.setVelocity(0, 0);
        this.enemies.clear(true, true);
        this.projectiles.clear(true, true);

        // Play level victory sound
        try { this.sound.play('correct2', { volume: 0.35 }); } catch (e) {}
        
        this.dialogueActive = true;
        const outroLines = [
            { speaker: 'Sikander', text: 'The school shelter is compromised. The entire district is being overrun.' },
            { speaker: 'Samar', text: 'Where do we go? The streets are blocked.' },
            { speaker: 'Sikander', text: 'The harbor. The military is evacuating survivors by sea. But we must hurry—I heard reports of containment strikes.' },
            { speaker: 'Samar', text: 'Hold on Nancy. We\'re going to the docks.' }
        ];

        this.dialogueManager.start(outroLines, () => {
            this.dialogueActive = false;
            this.cameras.main.fadeOut(2000, 0, 0, 0);
            this.time.delayedCall(2000, () => {
                LevelManager.currentLevel = 5;
                localStorage.setItem("theBloom_level", "5");
                this.scene.start("Level5_FinalEscape");
            });
        });
    }

    gameOver(reason) {
        this.gameStarted = false;
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        
        this.time.delayedCall(1500, () => {
            this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, "GAME OVER", {
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
