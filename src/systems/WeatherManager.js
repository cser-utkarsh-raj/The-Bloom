import Phaser from 'phaser';

/**
 * WeatherManager.js - Volumetric Fog and Layered Particle Weather Engine
 */
export default class WeatherManager {
    constructor(scene) {
        this.scene = scene;
        this.weatherType = 'none'; // 'fog', 'leaves', 'ash', 'spores'
        this.particles = null;
        this.fogBands = [];
    }
    
    /**
     * Set up weather effects for the current scene
     * @param {string} type Weather system type ('fog', 'leaves', 'ash', 'spores')
     */
    setup(type = 'fog') {
        this.weatherType = type;
        const { width, height } = this.scene.scale;
        
        // 1. Spores/Leaves/Ash particles using Phaser's Particle system
        if (type === 'leaves') {
            this.particles = this.scene.add.particles(0, 0, 'fog', {
                x: { min: -100, max: width + 100 },
                y: { min: -100, max: height + 100 },
                scale: { min: 0.12, max: 0.28 },
                alpha: { start: 0.25, end: 0 },
                speedX: { min: 40, max: 120 },
                speedY: { min: 20, max: 60 },
                lifespan: 8000,
                frequency: 200,
                tint: [0x556b2f, 0x8b4513, 0xcd853f] // green/orange/brown painterly leaves
            });
            this.particles.setDepth(29);
        } else if (type === 'spores') {
            this.particles = this.scene.add.particles(0, 0, 'fog', {
                x: { min: 0, max: width },
                y: { min: 0, max: height },
                scale: { min: 0.06, max: 0.18 },
                alpha: { start: 0.5, end: 0 },
                speedX: { min: -25, max: 25 },
                speedY: { min: -12, max: -45 }, // float upwards
                lifespan: 5000,
                frequency: 120,
                tint: [0xffaa00, 0xff5500] // glowing orange spores
            });
            this.particles.setDepth(29);
        } else if (type === 'ash') {
            this.particles = this.scene.add.particles(0, 0, 'fog', {
                x: { min: -100, max: width + 100 },
                y: { min: -100, max: height + 100 },
                scale: { min: 0.05, max: 0.20 },
                alpha: { start: 0.6, end: 0 },
                speedX: { min: -40, max: -90 }, // drift leftwards
                speedY: { min: 70, max: 140 }, // fall downwards representing ash
                lifespan: 6000,
                frequency: 90,
                tint: [0x7f7f7f, 0xa9a9a9, 0xd3d3d3] // grey ash
            });
            this.particles.setDepth(29);
        }
        
        // 2. Volumetric fog clouds (floating translucent layers)
        if (type === 'fog' || type === 'ash' || type === 'leaves') {
            const count = type === 'fog' ? 8 : 4;
            for (let i = 0; i < count; i++) {
                const fx = Phaser.Math.Between(0, width);
                const fy = Phaser.Math.Between(0, height);
                const fog = this.scene.add.image(fx, fy, 'fog')
                    .setScale(Phaser.Math.FloatBetween(7.0, 14.0))
                    .setAlpha(Phaser.Math.FloatBetween(0.04, 0.10))
                    .setScrollFactor(0.1 + i * 0.1) // parallax depth scrolling
                    .setDepth(28);
                
                // Slow drift tween
                this.scene.tweens.add({
                    targets: fog,
                    x: `+=${Phaser.Math.Between(150, 300)}`,
                    y: `+=${Phaser.Math.Between(-40, 40)}`,
                    duration: Phaser.Math.Between(18000, 30000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                this.fogBands.push(fog);
            }
        }
    }
    
    /**
     * Clean up weather manager assets (for scene shutdown)
     */
    clear() {
        if (this.particles) this.particles.destroy();
        this.fogBands.forEach(fog => fog.destroy());
        this.fogBands = [];
    }
}
