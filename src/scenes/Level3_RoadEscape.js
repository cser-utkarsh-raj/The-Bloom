/**
 * Level3_RoadEscape.js - The Highway to Safety
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Daughter from '../entities/Daughter.js';
import LevelManager from '../managers/LevelManager.js';
import BaseLevel from './BaseLevel.js';

export default class Level3_RoadEscape extends BaseLevel {
    constructor() {
        super("Level3_RoadEscape");
    }

    create() {
        const { width, height } = this.scale;
        const worldWidth = 2200;
        const worldHeight = 2200;
        
        // 1. Initialise State
        this.initBaseSystems();
        
        // 2. Setup systems specific to this level
        this.lightManager.setup(0xffbb66, 0.06); // Warm golden daytime sunlight
        this.weatherManager.setup('leaves'); // Wind-blown leaves
        
        // 1. Setup Camera and World Physics bounds
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        
        // Tile ground floor wood texture (representing asphalt streets/dirt)
        // Create Isometric Floor Grid for Level 3
        this.floorGroup = this.add.group();
        for (let x = 0; x < worldWidth; x += 64) {
            for (let y = 0; y < worldHeight; y += 64) {
                const iso = window.getIsoCoords(x, y);
                const tile = this.add.image(iso.x, iso.y, 'floorWood');
                tile.setOrigin(0.5);
                tile.setDepth(-10000 + (x + y) / 100);
                this.floorGroup.add(tile);
            }
        }
        
        // 2. Obstacles (Crashed cars, barriers, foliage)
        this.walls = this.physics.add.staticGroup();
        this.createStreetObstacles(worldWidth, worldHeight);

        // School Gate Checkpoint (Destination)
        this.checkpointX = 2050;
        this.checkpointY = 2050;
        const gateIso = window.getIsoCoords(this.checkpointX, this.checkpointY);
        this.checkpointZone = this.add.rectangle(gateIso.x, gateIso.y, 120, 120, 0xb89d68, 0.2);
        this.physics.add.existing(this.checkpointZone, true);
        this.add.text(this.checkpointX, this.checkpointY - 30, '🏫 SCHOOL GATES', {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            color: '#b89d68',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // 3. Characters
        this.playerSprite = new Player(this, 100, 100);
        this.daughterSprite = new Daughter(this, 70, 100);
        
        // Camera Follow visual representation instead of invisible physics sprite
        this.cameras.main.startFollow(this.playerSprite.visualSprite, true, 0.08, 0.08);
        this.cameras.main.setZoom(1);

        // 4. Salvageable Police / Army Bodies
        this.bodies = this.physics.add.staticGroup();
        this.createSalvageableBodies();

        // 5. Enemies (Patrolling Beings & Infected Animals)
        this.enemies = this.physics.add.group();
        this.spawnEnemiesAndAnimals(worldWidth, worldHeight);

        // 6. Navigation Arrow (Points to school gates)
        this.arrow = this.add.text(0, 0, '➔', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#b89d68'
        }).setOrigin(0.5).setDepth(100);

        // 7. Inputs
        this.setupInputs(this.playerSprite, this.enemies);
        this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Colliders
        this.physics.add.collider(this.playerSprite, this.walls);
        this.physics.add.collider(this.daughterSprite, this.walls);
        this.physics.add.collider(this.enemies, this.walls);

        this.physics.add.collider(this.playerSprite, this.enemies, (p, enemy) => {
            if (this.gameStarted && !this.dialogueActive) {
                p.takeDamage(enemy.isAnimal ? 8 : 12, enemy.x, enemy.y);
            }
        });

        // Salvage overlap trigger
        this.physics.add.overlap(this.playerSprite, this.bodies, (p, body) => {
            if (Phaser.Input.Keyboard.JustDown(this.keyShift)) {
                this.salvageBody(body);
            }
        });

        // Checkpoint reach trigger
        this.physics.add.overlap(this.playerSprite, this.checkpointZone, () => {
            this.completeLevel();
        });

        // Death trigger
        this.events.on('player-died', () => {
            this.gameOver("SAMAR AND NANCY DIED");
        });

        // Setup 2.5D Wall and Furniture Visuals in Isometric projection
        this.walls.getChildren().forEach(wall => {
            wall.setVisible(false);
            const iso = window.getIsoCoords(wall.x, wall.y);
            const vis = this.add.image(iso.x, iso.y, wall.texture.key);
            
            // Standardize scale to 1.0 based on procedural textures
            vis.setScale(wall.scaleX, wall.scaleY);
            if (wall.texture.key === 'wallTexture') {
                vis.setOrigin(0.5, 0.8);
            } else {
                vis.setOrigin(0.5, 0.7);
            }
            vis.setDepth(wall.x + wall.y);
            wall.visualSprite = vis;

            // Setup specific 2.5D physics boundaries in 2D space
            wall.body.setSize(wall.displayWidth, 20);
            wall.body.setOffset(0, wall.displayHeight - 20);
        });

        // UI
        this.finishBaseSetup(this.playerSprite);
        if (this.uiManager.objectiveText) {
            this.uiManager.objectiveText.setText("OBJECTIVE: ESCAPE ALONG THE MAIN ROAD");
        }

        // Salvage hint text
        this.hintText = this.add.text(width / 2, height - 160, "PRESS [SHIFT] TO SEARCH", {
            fontFamily: "Inter, sans-serif",
            fontSize: "12px",
            color: "#ffffff",
            fontWeight: "600",
            letterSpacing: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

        // Register shadow casters for sunlight depth sorting
        this.walls.getChildren().forEach(wall => this.lightManager.addShadowCaster(wall));
        this.lightManager.addShadowCaster(this.playerSprite);
        this.lightManager.addShadowCaster(this.daughterSprite);

        this.startIntroDialogue();
    }

    createStreetObstacles(w, h) {
        // Random barricades, abandoned cars
        const points = [
            { x: 400, y: 300, w: 150, h: 60, col: 0x222222 },
            { x: 300, y: 800, w: 60, h: 200, col: 0x333333 },
            { x: 800, y: 500, w: 200, h: 80, col: 0x424242 },
            { x: 1000, y: 1200, w: 80, h: 180, col: 0x222222 },
            { x: 1500, y: 600, w: 160, h: 60, col: 0x333333 },
            { x: 1300, y: 1600, w: 240, h: 80, col: 0x4a4a4a },
            { x: 700, y: 1700, w: 80, h: 200, col: 0x222222 },
            { x: 1800, y: 1200, w: 180, h: 80, col: 0x333333 }
        ];

        points.forEach(p => {
            const block = this.walls.create(p.x, p.y, 'wallTexture').setDisplaySize(p.w, p.h).refreshBody();
            const iso = window.getIsoCoords(p.x, p.y);
            this.add.image(iso.x, iso.y, 'carTexture').setOrigin(0.5, 0.85).setScale(0.45).setDepth(p.x + p.y + 1);
        });
        
        // Fungal spores hazards
        for (let i = 0; i < 6; i++) {
            const fx = Phaser.Math.Between(300, w - 300);
            const fy = Phaser.Math.Between(300, h - 300);
            const node = this.walls.create(fx, fy, 'fungusNode').setDisplaySize(32, 32).refreshBody();
        }
    }

    createSalvageableBodies() {
        const positions = [
            { x: 500, y: 400, weapon: 'pistol', ammo: 12, label: 'DEAD OFFICER' },
            { x: 1200, y: 900, weapon: 'pistol', ammo: 8, label: 'DEAD SOLDIER' },
            { x: 1700, y: 1500, weapon: 'rifle', ammo: 10, label: 'FALLEN ARMY COMMANDER' }
        ];

        positions.forEach(pos => {
            const body = this.bodies.create(pos.x, pos.y, 'medkit').setOrigin(0.5).refreshBody();
            body.setVisible(false);
            
            const iso = window.getIsoCoords(pos.x, pos.y);
            const vis = this.add.image(iso.x, iso.y, 'medkit').setOrigin(0.5, 0.7).setScale(1.2).setDepth(pos.x + pos.y);
            vis.setTint(0x555555);
            body.visualSprite = vis;

            body.weapon = pos.weapon;
            body.ammo = pos.ammo;
            body.label = pos.label;
            
            this.add.text(iso.x, iso.y - 18, '💀', { fontSize: '12px' }).setOrigin(0.5).setDepth(pos.x + pos.y + 1);
        });
    }

    spawnEnemiesAndAnimals(w, h) {
        // Patrolling Beings (green circles)
        for (let i = 0; i < 15; i++) {
            const ex = Phaser.Math.Between(400, w - 200);
            const ey = Phaser.Math.Between(400, h - 200);
            
            const enemy = this.enemies.create(ex, ey, 'enemyChar');
            enemy.health = 40;
            enemy.speed = 50 + Phaser.Math.Between(0, 20);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setSize(28, 28);
            enemy.isAnimal = false;
        }

        // Patrolling Dogs (faster, low health, red eyes, size 24x24)
        for (let i = 0; i < 8; i++) {
            const ex = Phaser.Math.Between(300, w - 300);
            const ey = Phaser.Math.Between(300, h - 300);
            
            const dog = this.enemies.create(ex, ey, 'enemyChar');
            dog.setScale(0.8); // smaller
            dog.setTint(0x8b4513); // brownish
            dog.health = 20;
            dog.speed = 120; // very fast
            dog.body.setCollideWorldBounds(true);
            dog.body.setSize(20, 20);
            dog.isAnimal = true;
            dog.isExplosive = true; // explodes spores when dead
        }
    }

    startIntroDialogue() {
        this.dialogueActive = true;
        
        const lines = [
            { speaker: 'Samar', text: 'Nancy, hold my hand tightly. The road to the school is covered in wrecked cars. Keep silent.' },
            { speaker: 'Nancy', text: 'Look at the stray dogs near the garbage, Daddy... why are their veins so big? They look bloated.' },
            { speaker: 'Samar', text: 'They are infected, Nancy. Don\'t get near them. Some might burst if they die.' },
            { speaker: 'Samar', text: 'Keep an eye out for fallen military or police officers. I need to salvage weapons to protect us.' },
            { speaker: 'Nancy', text: 'I\'m scared. Is mommy coming back?' },
            { speaker: 'Samar', text: 'No, sweetheart. We have to keep moving. The school is towards the south-east.' }
        ];

        this.dialogueManager.start(lines, () => {
            this.dialogueActive = false;
            this.gameStarted = true;
        });
    }

    update(time, delta) {
        if (this.updateBaseSystems(time, delta)) {
            // Sync entities for idle animations during dialogue
            if (this.playerSprite) this.playerSprite.update(this.cursors, null);
            if (this.daughterSprite) this.daughterSprite.update(this.playerSprite);
            return;
        }
        
        if (!this.gameStarted) return;

        const pointer = this.input.activePointer;
        this.playerSprite.update(this.cursors, pointer);
        this.daughterSprite.update(this.playerSprite);

        // Update Compass Arrow pointing to checkpoint
        const angle = Phaser.Math.Angle.Between(this.playerSprite.x, this.playerSprite.y, this.checkpointX, this.checkpointY);
        this.arrow.setPosition(this.playerSprite.visualSprite.x + Math.cos(angle) * 45, this.playerSprite.visualSprite.y + Math.sin(angle) * 45);
        this.arrow.setDepth(this.playerSprite.visualSprite.depth + 10);
        this.arrow.setRotation(angle);

        // Chase logic & Isometric sorting
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.playerSprite.x, this.playerSprite.y);
                if (dist < 350) {
                    const chaseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerSprite.x, this.playerSprite.y);
                    enemy.body.setVelocity(Math.cos(chaseAngle) * enemy.speed, Math.sin(chaseAngle) * enemy.speed);
                } else {
                    // Slow wander
                    if (Phaser.Math.Between(0, 100) < 1) {
                        const wanderAngle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
                        enemy.body.setVelocity(Math.cos(wanderAngle) * 30, Math.sin(wanderAngle) * 30);
                    }
                }
                
                // 2.5D updates
                enemy.body.setSize(24, 16);
                enemy.body.setOffset(4, 32);

                // Create visual representation if not initialized
                if (!enemy.visualSprite) {
                    enemy.setVisible(false);
                    enemy.visualSprite = this.add.sprite(enemy.x, enemy.y, 'enemyChar');
                    enemy.visualSprite.setOrigin(0.5, 0.9);
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

        // Prompt search overlap hint text
        let nearBody = false;
        this.bodies.getChildren().forEach(body => {
            if (body.active && Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, body.x, body.y) < 50) {
                nearBody = true;
                this.hintText.setText(`PRESS [SHIFT] TO SEARCH ${body.label}`);
                this.hintText.setVisible(true);
            }
        });
        
        if (!nearBody) {
            this.hintText.setVisible(false);
        }

        if (this.uiManager) {
            this.uiManager.update();
        }
    }

    salvageBody(body) {
        if (body.visualSprite) body.visualSprite.destroy();
        body.destroy();
        this.playerSprite.setWeapon(body.weapon, this.playerSprite.ammo + body.ammo);
        this.cameras.main.flash(300, 255, 215, 0, 0.3);
        
        // Show message at isometric coordinates
        const playerVis = this.playerSprite.visualSprite;
        this.showMessage(`ACQUIRED ${body.weapon.toUpperCase()} (${body.ammo} AMMO)`, playerVis.x, playerVis.y - 30);
        if (this.uiManager) this.uiManager.update();
    }

    handleEnemyDeath(enemy) {
        const ex = enemy.x;
        const ey = enemy.y;
        const isExplosive = enemy.isExplosive;
        if (enemy.visualSprite) enemy.visualSprite.destroy();
        if (enemy.visualShadow) enemy.visualShadow.destroy();
        enemy.destroy();

        if (isExplosive) {
            // Trigger fungal spore burst
            const iso = window.getIsoCoords(ex, ey);
            const circle = this.add.circle(iso.x, iso.y, 70, 0x8b6b4a, 0.4).setDepth(-4000);
            this.cameras.main.shake(100, 0.005);
            this.tweens.add({
                targets: circle,
                scale: 1.8,
                alpha: 0,
                duration: 400,
                onComplete: () => circle.destroy()
            });

            // Damage player if inside radius
            const d = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, ex, ey);
            if (d < 100) {
                this.playerSprite.takeDamage(15, ex, ey);
            }
        }
    }



    completeLevel() {
        this.gameStarted = false;
        this.playerSprite.body.setVelocity(0, 0);
        this.enemies.clear(true, true);

        // Play level complete sound
        try { this.sound.play('correct', { volume: 0.35 }); } catch (e) {}
        
        this.dialogueActive = true;
        const outroLines = [
            { speaker: 'Samar', text: 'We made it Nancy. Look at the gates... hundreds of students and parents are barricaded inside.' },
            { speaker: 'Nancy', text: 'Is mommy there, Daddy?' },
            { speaker: 'Samar', text: 'No, Nancy... but we will find a safe room here. Hold my hand.' }
        ];

        this.dialogueManager.start(outroLines, () => {
            this.dialogueActive = false;
            this.cameras.main.fadeOut(2000, 0, 0, 0);
            this.time.delayedCall(2000, () => {
                LevelManager.currentLevel = 4;
                localStorage.setItem("theBloom_level", "4");
                this.scene.start("Level4_SchoolShelter");
            });
        });
    }

    showMessage(text, x, y) {
        const msg = this.add.text(x, y, text, {
            fontFamily: "Cinzel",
            fontSize: "12px",
            color: "#b89d68"
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: msg,
            alpha: 0,
            y: y - 20,
            duration: 1500,
            onComplete: () => msg.destroy()
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
