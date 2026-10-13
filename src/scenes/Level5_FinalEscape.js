/**
 * Level5_FinalEscape.js - As The World Caves In
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Daughter from '../entities/Daughter.js';
import LevelManager from '../managers/LevelManager.js';
import BaseLevel from './BaseLevel.js';

export default class Level5_FinalEscape extends BaseLevel {
    constructor() {
        super("Level5_FinalEscape");
    }

    create() {
        const { width, height } = this.scale;
        const worldWidth = 1700;
        const worldHeight = 600;
        
        // 1. Initialise State
        this.initBaseSystems();
        
        // Resist mechanic state
        this.isDrifting = false;
        this.driftPresses = 0;
        this.nextDriftTime = 6000;
        
        // 2. Setup systems specific to this level
        this.lightManager.setup(0xffbb66, 0.08); // Warm golden sunlight
        this.weatherManager.setup('ash'); // Falling ash from military strike
        
        // 1. Setup Camera and Physics bounds
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        
        // Create Isometric Floor Grid for Level 5
        this.floorGroup = this.add.group();
        for (let x = 0; x < worldWidth; x += 64) {
            for (let y = 0; y < worldHeight; y += 64) {
                const iso = window.getIsoCoords(x, y);
                const tile = this.add.image(iso.x, iso.y, 'floorWood');
                tile.setOrigin(0.5);
                tile.setTint(0xaa4444); // Crimson tint for the nuclear sunset atmosphere
                tile.setDepth(-10000 + (x + y) / 100);
                this.floorGroup.add(tile);
            }
        }
        
        // Outer boundaries
        this.walls = this.physics.add.staticGroup();
        this.walls.create(worldWidth / 2, 10, 'wallTexture').setDisplaySize(worldWidth, 20).refreshBody();
        this.walls.create(worldWidth / 2, worldHeight - 10, 'wallTexture').setDisplaySize(worldWidth, 20).refreshBody();
        this.walls.create(10, worldHeight / 2, 'wallTexture').setDisplaySize(20, worldHeight).refreshBody();
        this.walls.create(worldWidth - 10, worldHeight / 2, 'wallTexture').setDisplaySize(20, worldHeight).refreshBody();

        // 2. Obstacles (Crashed military tanks, rubbles)
        this.walls.create(400, 150, 'wallTexture').setDisplaySize(120, 80).refreshBody();
        this.walls.create(800, 450, 'wallTexture').setDisplaySize(120, 80).refreshBody();
        this.walls.create(1200, 200, 'wallTexture').setDisplaySize(120, 80).refreshBody();

        // Safe Bunker Door Checkpoint at the end
        this.bunkerX = 1550;
        this.bunkerY = worldHeight / 2;
        const bunkerIso = window.getIsoCoords(this.bunkerX, this.bunkerY);
        this.bunkerZone = this.add.rectangle(bunkerIso.x, bunkerIso.y, 150, 150, 0xb89d68, 0.2);
        this.physics.add.existing(this.bunkerZone, true);
        this.add.text(bunkerIso.x, bunkerIso.y - 70, '🛡️ FALLOUT BUNKER', {
            fontFamily: 'Cinzel',
            fontSize: '11px',
            color: '#b89d68',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // 3. Characters
        this.playerSprite = new Player(this, 100, worldHeight / 2);
        this.playerSprite.setWeapon('rifle', 30); // Max loadout for final run
        
        this.daughterSprite = new Daughter(this, 60, worldHeight / 2);
        
        this.sikander = this.physics.add.sprite(100, worldHeight / 2 + 50, 'playerChar');
        this.sikander.setTint(0xb89d68);
        this.sikander.setCollideWorldBounds(true);
        this.sikander.body.setSize(24, 16);
        this.sikander.body.setOffset(4, 32); // feet level
        this.sikander.setVisible(false);

        this.sikanderVisualSprite = this.add.sprite(this.sikander.x, this.sikander.y, 'playerChar');
        this.sikanderVisualSprite.setTint(0xb89d68);
        this.sikanderVisualSprite.setOrigin(0.5, 0.9);

        this.sikanderShadow = this.add.ellipse(this.sikander.x, this.sikander.y + 22, 24, 8, 0x000000, 0.4);
        this.sikanderTag = this.add.text(this.sikander.x, this.sikander.y - 25, 'SIKANDER', {
            fontFamily: 'Cinzel',
            fontSize: '9px',
            color: '#b89d68',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.sikanderLastShot = 0;

        // Camera Follow visual representation instead of invisible physics sprite
        this.cameras.main.startFollow(this.playerSprite.visualSprite, true, 0.08, 0.08);

        // 4. Groups
        this.enemies = this.physics.add.group();
        this.fallingMeteors = this.physics.add.group();

        // Spawn some gatekeeper Beings
        const spawnX = [500, 700, 950, 1100, 1300];
        spawnX.forEach(x => {
            const e1 = this.enemies.create(x, 150 + Phaser.Math.Between(0, 300), 'enemyChar');
            e1.health = 45;
            e1.speed = 90;
            e1.body.setCollideWorldBounds(true);
            e1.body.setSize(28, 28);
        });

        // 5. Inputs
        this.setupInputs(this.playerSprite, this.enemies);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Colliders
        this.physics.add.collider(this.playerSprite, this.walls);
        this.physics.add.collider(this.daughterSprite, this.walls);
        this.physics.add.collider(this.sikander, this.walls);
        this.physics.add.collider(this.enemies, this.walls);

        this.physics.add.collider(this.playerSprite, this.enemies, (p, enemy) => {
            if (this.gameStarted && !this.dialogueActive) {
                p.takeDamage(12, enemy.x, enemy.y);
            }
        });

        // Meteor/Bomb overlap
        this.physics.add.overlap(this.playerSprite, this.fallingMeteors, (p, met) => {
            if (this.gameStarted && !this.dialogueActive) {
                met.destroy();
                p.takeDamage(35, met.x, met.y);
            }
        });

        // Reach bunker trigger
        this.physics.add.overlap(this.playerSprite, this.bunkerZone, () => {
            this.triggerBunkerEnding();
        });

        this.events.on('player-died', () => {
            this.gameOver("SAMAR AND NANCY DIED");
        });

        // UI
        this.finishBaseSetup(this.playerSprite);
        if (this.uiManager.objectiveText) {
            this.uiManager.objectiveText.setText("OBJECTIVE: RUN TO THE DOCK BOATS");
        }

        // Drift Warning UI Text
        this.driftWarningText = this.add.text(width / 2, 80, "⚠️ THE PARASITE SPREADS! MASH [SPACE] TO RESIST!", {
            fontFamily: "Inter, sans-serif",
            fontSize: "11px",
            color: "#ff3333",
            fontWeight: "700",
            letterSpacing: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

        // Register shadow casters for sunlight depth sorting
        if (this.walls) this.walls.getChildren().forEach(wall => this.lightManager.addShadowCaster(wall));
        this.lightManager.addShadowCaster(this.playerSprite);
        this.lightManager.addShadowCaster(this.daughterSprite);

        // Setup 2.5D Wall and Furniture Visuals in Isometric projection
        this.setupIsometricWalls();

        this.startIntroDialogue();
    }

    startIntroDialogue() {
        this.dialogueActive = true;
        
        const lines = [
            { speaker: 'Sikander', text: 'Listen to the skies... those aren\'t passenger planes. Those are containment bombers. Chennai is about to be wiped off the map.' },
            { speaker: 'Samar', text: 'My head... it hurts. Nancy, hold me. The whispers... they\'re telling me to stop running. They\'re telling me to sit in the sun.' },
            { speaker: 'Sikander', text: 'Fight it, Samar! If you give up now, she dies! The shelter bunker is just ahead!' },
            { speaker: 'Samar', text: 'I... I will fight. Let\'s run!' }
        ];

        this.dialogueManager.start(lines, () => {
            this.dialogueActive = false;
            this.gameStarted = true;
            this.nextDriftTime = this.time.now + 5000;
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

        // Apply drift modifier to controls if infected state active
        if (this.isDrifting) {
            // Force keyboard input override (drifts player upward/downward automatically)
            this.playerSprite.body.setVelocityY(80 * Math.sin(time / 200));
            this.playerSprite.body.setVelocityX(50);
            
            // Pulse red camera screen matrix
            this.cameras.main.setTint(0xff8888);
            
            // Check Space clicks to resist
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                this.driftPresses++;
                this.cameras.main.flash(200, 255, 255, 255, 0.3);
                if (this.driftPresses >= 3) {
                    this.clearDrift();
                }
            }
        } else {
            this.playerSprite.update(this.cursors, pointer);
            
            // Trigger new drift interval
            if (time > this.nextDriftTime) {
                this.triggerInfectionDrift(time);
            }
        }

        this.daughterSprite.update(this.playerSprite);
        this.updateSikander(time);

        // Chase logic & Isometric sorting
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
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
            }
        });

        // Project falling bomb visual representations
        this.fallingMeteors.getChildren().forEach(bomb => {
            if (bomb.active && bomb.visualSprite) {
                const iso = window.getIsoCoords(bomb.x, bomb.y);
                bomb.visualSprite.setPosition(iso.x, iso.y);
                bomb.visualSprite.setDepth(10000); // high above
            }
        });

        // Falling bombs logic
        if (Phaser.Math.Between(0, 100) < 3) {
            this.spawnFallingBomb();
        }


    }

    triggerInfectionDrift(time) {
        this.isDrifting = true;
        this.driftPresses = 0;
        this.driftWarningText.setVisible(true);
        this.cameras.main.shake(300, 0.005);
        this.nextDriftTime = time + Phaser.Math.Between(8000, 12000);
    }

    clearDrift() {
        this.isDrifting = false;
        this.driftWarningText.setVisible(false);
        this.cameras.main.clearTint();
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

        // Find nearest target
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

            // Shoot rifle
            if (time - this.sikanderLastShot > 900) {
                this.sikanderLastShot = time;
                target.health -= 25;
                const tracer = this.add.line(0, 0, this.sikander.x, this.sikander.y, target.x, target.y, 0xffaa00, 0.7);
                this.time.delayedCall(80, () => tracer.destroy());
                if (target.health <= 0) target.destroy();
            }
        }

        // Walk to follow Samar
        const dToPlayer = Phaser.Math.Distance.Between(this.sikander.x, this.sikander.y, this.playerSprite.x, this.playerSprite.y);
        if (dToPlayer > 85) {
            const anglePlayer = Phaser.Math.Angle.Between(this.sikander.x, this.sikander.y, this.playerSprite.x, this.playerSprite.y);
            this.sikander.body.setVelocity(Math.cos(anglePlayer) * 120, Math.sin(anglePlayer) * 120);
        } else {
            this.sikander.body.setVelocity(0, 0);
        }
    }

    spawnFallingBomb() {
        const targetX = this.playerSprite.x + Phaser.Math.Between(-300, 300);
        const targetY = this.playerSprite.y + Phaser.Math.Between(-300, 300);
        
        const startX = targetX - 200;
        const startY = targetY - 400; // falling from top-left in 2D space
        
        const bomb = this.fallingMeteors.create(startX, startY, 'blood');
        bomb.setTint(0xff5500);
        bomb.setScale(2.5);
        
        // Physics velocity in 2D
        bomb.body.setVelocity(150, 300);
        
        // We track this meteor visually
        bomb.setVisible(false);
        const bombVis = this.add.image(0, 0, 'blood').setScale(2.5).setTint(0xff5500);
        bomb.visualSprite = bombVis;
        
        const targetIso = window.getIsoCoords(targetX, targetY);
        const landingMarker = this.add.circle(targetIso.x, targetIso.y, 16, 0xff0000, 0.3).setDepth(-5000);
        
        this.time.delayedCall(2000, () => {
            landingMarker.destroy();
            if (bombVis) bombVis.destroy();
            if (bomb && bomb.active) {
                // explode at landing in isometric
                const exp = this.add.circle(targetIso.x, targetIso.y, 40, 0xffaa00, 0.5).setDepth(targetIso.y);
                this.tweens.add({
                    targets: exp,
                    scale: 2,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => exp.destroy()
                });
                bomb.destroy();
            }
        });
    }



    triggerBunkerEnding() {
        this.gameStarted = false;
        this.playerSprite.body.setVelocity(0, 0);
        this.sikander.body.setVelocity(0, 0);
        this.enemies.clear(true, true);
        this.fallingMeteors.clear(true, true);

        // Play final level complete victory sound
        try { this.sound.play('correct', { volume: 0.35 }); } catch (e) {}
        
        this.dialogueActive = true;
        const lines = [
            { speaker: 'Samar', text: 'The bunker... we made it. Open the hatch, Sikander! Hurry!' },
            { speaker: 'Nancy', text: 'Daddy, come inside! The sky is turning white!' },
            { speaker: 'Samar', text: 'I... I can\'t. Look at my skin, Nancy. The veins are already black. I can feel the Bloom controlling my thoughts.' },
            { speaker: 'Sikander', text: 'Samar... no. We can find a way.' },
            { speaker: 'Samar', text: 'There is no cure, Sikander. If I step inside, I will infect Nancy and you. I choose to die human.' },
            { speaker: 'Samar', text: 'Sikander... protect her. Teach her. Make sure she survives.' },
            { speaker: 'Sikander', text: 'I will. On my life. Thank you, Chaitanya.' },
            { speaker: 'Nancy', text: 'DADDY! NO! DON\'T CLOSE THE DOOR! DADDY!!!' },
            { speaker: 'Samar', text: 'Goodbye Nancy. Close your eyes, sweetheart.' },
            { speaker: 'System', text: '*CLANK* (Samar slides the heavy locking bolt shut from the outside. Blinding flash of light)' }
        ];

        this.dialogueManager.start(lines, () => {
            this.dialogueActive = false;
            this.cameras.main.fadeOut(3000, 255, 255, 255); // Blinding white fade out
            this.time.delayedCall(3000, () => {
                this.scene.start("EndingScene");
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
