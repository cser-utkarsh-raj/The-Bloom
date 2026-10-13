import Phaser from 'phaser';

export class BaseEntity extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey) {
        super(scene, x, y, textureKey);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setVisible(false); // Hide the physics body

        this.scene = scene;
        this.baseScaleX = 1.0;
        this.baseScaleY = 1.0;

        // Visual Sprite Container
        this.visualSprite = scene.add.sprite(x, y, textureKey);
        this.visualSprite.setDepth(y);
        
        // Shadow Underneath
        this.shadow = scene.add.ellipse(x, y + 16, 24, 8, 0x000000, 0.4);
        this.shadow.setDepth(y - 1);
        
        // Name Label
        this.nameTag = scene.add.text(x, y - 40, '', {
            fontSize: '10px',
            fontFamily: 'Courier',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5).setDepth(y + 100);

        // Core Properties
        this.isMoving = false;
        this.isDead = false;
        this.timeOffset = Math.random() * 1000;
        
        // Animation scales
        this.squashX = 0;
        this.squashY = 0;
        this.tiltAngle = 0;
    }

    updateVisuals(time, x, y, flipX) {
        if (this.isDead) return;

        // Position Alignment
        this.visualSprite.x = x;
        this.visualSprite.y = y;
        this.shadow.x = x;
        this.shadow.y = y + 16;
        this.nameTag.x = x;
        this.nameTag.y = y - 40;
        
        // Depth Sorting
        this.visualSprite.setDepth(y);
        this.shadow.setDepth(y - 1);
        this.nameTag.setDepth(y + 100);

        // Directional Facing
        if (flipX !== undefined) {
            this.visualSprite.setFlipX(flipX);
        }

        // Breathing & Walking Bobs
        if (this.isMoving) {
            const walkSpeed = time * 0.015 + this.timeOffset;
            this.squashX = Math.cos(walkSpeed) * 0.05;
            this.squashY = Math.sin(walkSpeed * 2) * 0.05;
            this.tiltAngle = Math.cos(walkSpeed) * 0.1;
        } else {
            const breatheSpeed = time * 0.003 + this.timeOffset;
            this.squashX = Math.cos(breatheSpeed) * 0.02;
            this.squashY = Math.sin(breatheSpeed) * 0.02;
            this.tiltAngle = 0;
        }

        this.visualSprite.setScale(this.baseScaleX + this.squashX, this.baseScaleY + this.squashY);
        this.visualSprite.setRotation(this.tiltAngle);
    }
    
    destroy() {
        if (this.visualSprite) this.visualSprite.destroy();
        if (this.shadow) this.shadow.destroy();
        if (this.nameTag) this.nameTag.destroy();
    }
}
