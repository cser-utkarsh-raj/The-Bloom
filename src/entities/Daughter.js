/**
 * Daughter.js - Nancy (The 5-Year-Old Daughter)
 */
import Phaser from 'phaser';
import { BaseEntity } from './BaseEntity.js';

export default class Daughter extends BaseEntity {
    constructor(scene, x, y) {
        // Nancy uses the procedurally generated 'daughterChar' texture
        super(scene, x, y, 'daughterChar');
        
        this.scene = scene;
        this.panic = 0;
        this.maxPanic = 100;
        this.followDistance = 45;
        this.speed = 150;
        
        this.setCollideWorldBounds(true);
        this.setSize(18, 12);
        this.setOffset(3, 24); // offset collision box to Nancy's feet
        
        // Setup base visual properties
        this.visualSprite.setOrigin(0.5, 0.9);
        
        // Nancy's floating emotion emojis
        this.emotionText = scene.add.text(x, y - 25, '😊', {
            fontSize: '16px'
        }).setOrigin(0.5);
        this.emotionText.setAlpha(0);

        // Name text style update (BaseEntity creates it)
        this.nameTag.setText('NANCY');
        this.nameTag.setStyle({
            fontFamily: 'Cinzel, serif',
            fontSize: '9px',
            color: '#ff69b4',
            fontWeight: 'bold'
        });
    }

    update(player) {
        if (!player || !player.active) return;

        // Follow distance logic
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist > this.followDistance) {
            // Chase target (player)
            const angle = Math.atan2(dy, dx);
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            this.setRotation(angle);
        } else {
            this.setVelocity(0, 0);
        }

        // Update indicators in isometric space
        const iso = window.getIsoCoords(this.x, this.y);
        
        // Procedural movement vertical bobbing
        this.isMoving = (this.body.velocity.x !== 0 || this.body.velocity.y !== 0);
        const time = this.scene.time.now;
        
        let bobY = 0;
        if (this.isMoving) {
            bobY = Math.sin(time * 0.012) * 1.5;
        } else {
            bobY = Math.sin(time * 0.002) * 0.4;
        }
        
        // Nancy face left or right depending on velocity
        const flipX = (this.body.velocity.x !== 0) ? (this.body.velocity.x < 0) : undefined;
        
        // Let BaseEntity handle the squash, tilt, shadow, and nametag alignment
        super.updateVisuals(time, iso.x, iso.y + bobY, flipX);
        
        const depthVal = this.x + this.y;
        this.emotionText.setPosition(this.visualSprite.x, this.visualSprite.y - 38);
        this.emotionText.setDepth(depthVal + 1);

        // Update panic based on nearby enemies
        this.updatePanic();
    }

    updatePanic() {
        let enemyNear = false;
        
        if (this.scene.enemies && this.scene.enemies.getChildren) {
            const list = this.scene.enemies.getChildren();
            for (let i = 0; i < list.length; i++) {
                const enemy = list[i];
                if (enemy.active) {
                    const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    if (d < 150) {
                        enemyNear = true;
                        break;
                    }
                }
            }
        }
        
        // Boss check (Daisy in Level 2)
        if (this.scene.boss && this.scene.boss.active) {
            const d = Phaser.Math.Distance.Between(this.x, this.y, this.scene.boss.x, this.scene.boss.y);
            if (d < 160) {
                enemyNear = true;
            }
        }

        if (enemyNear) {
            this.panic = Math.min(this.maxPanic, this.panic + 0.5);
        } else {
            this.panic = Math.max(0, this.panic - 0.2);
        }

        // Emotion feedback
        if (this.panic > 60) {
            this.emotionText.setText('😭');
            this.emotionText.setAlpha(1);
        } else if (this.panic > 20) {
            this.emotionText.setText('😨');
            this.emotionText.setAlpha(0.8);
        } else {
            this.emotionText.setText('😊');
            this.emotionText.setAlpha(0);
        }
    }

    destroy() {
        if (this.emotionText) this.emotionText.destroy();
        super.destroy();
    }
}