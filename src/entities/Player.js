/**
 * Player.js - Samar (The Father)
 */
import Phaser from 'phaser';
import LevelManager from '../managers/LevelManager.js';
import { BaseEntity } from './BaseEntity.js';

export default class Player extends BaseEntity {
    constructor(scene, x, y) {
        // Use the procedurally generated 'playerChar' texture
        super(scene, x, y, 'playerChar');
        
        // Load persistent stats from LevelManager
        LevelManager.loadPlayerStats(this);
        
        this.maxHealth = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.infection = 0;
        this.maxInfection = 100;
        
        // Equipment (Defaults overridden by LevelManager)
        if (scene.scene.key === 'Level2_WifeBoss') {
            this.hasFlashlight = false;
            this.flashlightOn = false;
        } else {
            this.hasFlashlight = true;
            this.flashlightOn = false; // off by default during the day
        }
        this.flashlightBattery = 100;
        
        // States
        this.isSprinting = false;
        this.isAttacking = false;
        this.isHurt = false;
        this.lastAttackTime = 0;
        
        // Movement speeds
        this.speed = 180;
        this.sprintSpeed = 280;
        
        this.setCollideWorldBounds(true);
        this.setSize(24, 16);
        this.setOffset(4, 32); // offset collision box to player's feet
        
        // Visual flashlight overlay (yellow cone)
        this.flashlightCone = scene.add.image(x, y, 'flashlightCone')
            .setOrigin(0, 0.5)
            .setAlpha(0.25)
            .setBlendMode('ADD')
            .setVisible(true);
            
        // Setup base visual properties
        this.visualSprite.setOrigin(0.5, 0.9);
        this.nameTag.setText(''); // Player has no name tag floating

        // Weapon range & damage configuration
        this.updateWeaponDamage();

        // Custom keyboard bindings
        this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.fKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.isDefending = false;
    }
    
    updateWeaponDamage() {
        switch (this.weapon) {
            case 'pistol':
                this.weaponDamage = 35;
                this.attackRange = 400; // Ranged
                break;
            case 'rifle':
                this.weaponDamage = 60;
                this.attackRange = 600; // Ranged
                break;
            case 'plank':
                this.weaponDamage = 25;
                this.attackRange = 60; // Melee
                break;
            case 'unarmed':
            default:
                this.weaponDamage = 12;
                this.attackRange = 45; // Fists
                break;
        }
    }

    update(cursors, pointer) {
        if (this.isHurt) return;
        
        // 1. Movement logic
        let mx = 0;
        let my = 0;
        
        if (cursors.left.isDown || cursors.A?.isDown) mx = -1;
        else if (cursors.right.isDown || cursors.D?.isDown) mx = 1;
        
        if (cursors.up.isDown || cursors.W?.isDown) my = -1;
        else if (cursors.down.isDown || cursors.S?.isDown) my = 1;

        let velX = 0;
        let velY = 0;
        const len = Math.hypot(mx, my);
        if (len > 0) {
            const nX = mx / len;
            const nY = my / len;
            // Rotate screen movement coordinates 45 degrees clockwise into 2D physics space
            velX = nX * 0.707 + nY * 0.707;
            velY = -nX * 0.707 + nY * 0.707;
        }
        
        // Defend check (holding Space)
        this.isDefending = this.spaceKey.isDown;

        // Sprint checks (only if not defending)
        const isShiftDown = cursors.shift?.isDown;
        this.isSprinting = !this.isDefending && isShiftDown && this.stamina > 10 && (velX !== 0 || velY !== 0);
        
        let currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
        if (this.isDefending) {
            currentSpeed = this.speed * 0.35; // slow crawl when defending
        }
        
        this.setVelocity(velX * currentSpeed, velY * currentSpeed);
        
        // Stamina drain/recovery
        if (this.isSprinting) {
            this.stamina = Math.max(0, this.stamina - 0.4);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + 0.25);
        }

        // Manage visual shield aura
        if (this.isDefending) {
            if (!this.shieldAura) {
                this.shieldAura = this.scene.add.circle(this.visualSprite.x, this.visualSprite.y - 24, 22, 0x8fbc8f, 0.25);
                this.shieldAura.setStrokeStyle(1.5, 0xffffff, 0.6);
            }
            this.shieldAura.setPosition(this.visualSprite.x, this.visualSprite.y - 24);
            this.shieldAura.setVisible(true);
        } else {
            if (this.shieldAura) {
                this.shieldAura.setVisible(false);
            }
        }

        // Keyboard Attack (pressing Enter)
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) && this.scene.gameStarted && !this.scene.dialogueActive) {
            const targets = this.scene.enemies ? this.scene.enemies.getChildren() : [];
            this.attack(null, targets, (target, dmg) => {
                target.health -= dmg;
                this.scene.cameras.main.shake(80, 0.003);
                const targetVis = target.visualSprite || target;
                const b = this.scene.add.image(targetVis.x, targetVis.y - 12, 'blood');
                this.scene.time.delayedCall(400, () => b.destroy());
                if (target.health <= 0) {
                    if (this.scene.handleEnemyDeath) {
                        this.scene.handleEnemyDeath(target);
                    } else {
                        target.destroy();
                        if (this.scene.enemiesRemaining !== undefined) {
                            this.scene.enemiesRemaining--;
                        }
                    }
                    if (this.scene.uiManager) this.scene.uiManager.update();
                }
            });
        }
        
        // 2. Rotate player and flashlight toward pointer
        const iso = window.getIsoCoords(this.x, this.y);
        
        // Procedural movement tilting and vertical bobbing
        this.isMoving = (this.body.velocity.x !== 0 || this.body.velocity.y !== 0);
        const time = this.scene.time.now;
        
        let bobY = 0;
        if (this.isMoving && !this.isHurt) {
            const freq = this.isSprinting ? 0.016 : 0.010;
            const amp = this.isSprinting ? 3.5 : 1.8;
            bobY = Math.sin(time * freq) * amp;
        } else if (!this.isHurt) {
            bobY = Math.sin(time * 0.002) * 0.5;
        }
        
        // Let BaseEntity handle the squash, tilt, and shadow alignment
        const flipX = pointer ? (pointer.x < this.scene.scale.width / 2) : undefined;
        super.updateVisuals(time, iso.x, iso.y + bobY, flipX);
        
        // Dynamic depth sorting based on simulated Y coord in iso projection
        const depthVal = this.x + this.y;

        // Toggle flashlight on F press
        if (Phaser.Input.Keyboard.JustDown(this.fKey) && this.hasFlashlight) {
            this.flashlightOn = !this.flashlightOn;
        }

        // Sync flashlight positions
        if (pointer) {
            const angle = Phaser.Math.Angle.Between(this.visualSprite.x, this.visualSprite.y - 24, pointer.worldX, pointer.worldY);
            this.flashlightCone.setPosition(this.visualSprite.x, this.visualSprite.y - 24);
            this.flashlightCone.setRotation(angle);
            this.flashlightCone.setVisible(this.hasFlashlight && this.flashlightOn && this.flashlightBattery > 0);
            this.flashlightCone.setDepth(depthVal + 1);
            
            if (this.hasFlashlight && this.flashlightOn && this.flashlightBattery > 0) {
                this.flashlightBattery = Math.max(0, this.flashlightBattery - 0.02);
            }
        }
        
        if (this.shieldAura) {
            this.shieldAura.setDepth(depthVal + 2);
        }
    }
    
    attack(pointer, targets, onHitCallback) {
        const now = this.scene.time.now;
        
        // Attack rate limiting
        const attackCooldown = this.weapon.includes('pistol') || this.weapon.includes('rifle') ? 400 : 300;
        if (now - this.lastAttackTime < attackCooldown) return false;
        
        this.lastAttackTime = now;
        
        // Ranged check
        const isRanged = this.weapon === 'pistol' || this.weapon === 'rifle';
        
        if (isRanged) {
            if (this.ammo <= 0) {
                // Click noise (no ammo)
                this.scene.showMessage("OUT OF AMMO!", this.visualSprite.x, this.visualSprite.y - 30);
                return false;
            }
            this.ammo--;
            LevelManager.savePlayerStats(this);
            
            // Draw bullet tracer line
            const angle = (pointer && pointer.worldX !== undefined) ? 
                Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY) : 
                this.rotation;
            const endX = this.x + Math.cos(angle) * this.attackRange;
            const endY = this.y + Math.sin(angle) * this.attackRange;
            
            const startIso = window.getIsoCoords(this.x, this.y);
            const endIso = window.getIsoCoords(endX, endY);
            const tracer = this.scene.add.line(0, 0, startIso.x, startIso.y - 24, endIso.x, endIso.y - 24, 0xffd700, 0.8);
            tracer.setLineWidth(2);
            this.scene.tweens.add({
                targets: tracer,
                alpha: 0,
                duration: 100,
                onComplete: () => tracer.destroy()
            });
            
            // Hit check along the ray
            let hitTarget = null;
            let closestDist = this.attackRange;
            
            targets.forEach(target => {
                if (!target.active || !target.health) return;
                
                // Simple distance check to see if target lies inside weapon range and angle
                const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                if (dist <= this.attackRange) {
                    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                    const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - targetAngle));
                    
                    // Tolerance for hit check angle
                    if (diff < 0.2 && dist < closestDist) {
                        closestDist = dist;
                        hitTarget = target;
                    }
                }
            });
            
            if (hitTarget) {
                onHitCallback(hitTarget, this.weaponDamage);
            }
        } else {
            // Melee check
            const angle = this.rotation;
            const reachX = this.x + Math.cos(angle) * (this.attackRange - 10);
            const reachY = this.y + Math.sin(angle) * (this.attackRange - 10);
            
            // Show sweep arc graphics projected to Isometric space
            const reachIso = window.getIsoCoords(reachX, reachY);
            const swing = this.scene.add.circle(reachIso.x, reachIso.y, 15, 0xffaa44, 0.4);
            this.scene.tweens.add({
                targets: swing,
                scale: 1.8,
                alpha: 0,
                duration: 150,
                onComplete: () => swing.destroy()
            });
            
            targets.forEach(target => {
                if (!target.active || !target.health) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                if (dist <= this.attackRange) {
                    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                    const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - targetAngle));
                    
                    if (diff < 0.8) {
                        onHitCallback(target, this.weaponDamage);
                    }
                }
            });
        }
        
        return true;
    }
    
    takeDamage(amount, sourceX, sourceY) {
        if (this.isHurt) return;

        // Apply 75% block reduction if defending
        if (this.isDefending) {
            amount = Math.floor(amount * 0.25);
            const shieldFlash = this.scene.add.circle(this.visualSprite.x, this.visualSprite.y - 24, 24, 0xffffff, 0.4);
            this.scene.tweens.add({
                targets: shieldFlash,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => shieldFlash.destroy()
            });
        }
        
        this.health = Math.max(0, this.health - amount);
        LevelManager.savePlayerStats(this);
        
        this.isHurt = true;
        
        // Pushback vector
        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.x, this.y);
        this.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        
        // Red flash visual on the visible isometric sprite (not the invisible physics body)
        if (this.visualSprite) this.visualSprite.setTint(0xff0000);
        this.scene.cameras.main.shake(100, 0.008);
        
        this.scene.time.delayedCall(200, () => {
            if (this.visualSprite) this.visualSprite.clearTint();
            this.isHurt = false;
            this.setVelocity(0, 0);
        });
        
        // Float damage number text
        this.showDamageNumber(amount);
        
        // Level gameover trigger
        if (this.health <= 0) {
            this.scene.events.emit('player-died');
        }
    }
    
    showDamageNumber(amount) {
        const startX = this.visualSprite ? this.visualSprite.x : this.x;
        const startY = this.visualSprite ? this.visualSprite.y - 25 : this.y - 25;
        const text = this.scene.add.text(startX, startY, `-${Math.floor(amount)}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#ff3333',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: text,
            y: startY - 25,
            alpha: 0,
            duration: 600,
            onComplete: () => text.destroy()
        });
    }

    setWeapon(weaponName, ammoCount = 0) {
        this.weapon = weaponName;
        this.ammo = ammoCount;
        this.updateWeaponDamage();
        LevelManager.savePlayerStats(this);
    }
    
    destroy() {
        if (this.flashlightCone) this.flashlightCone.destroy();
        super.destroy();
    }
}