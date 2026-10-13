import Phaser from 'phaser';

/**
 * LightManager.js - Dynamic 2D Light & Raycasted Shadow Occlusion System
 */
export default class LightManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = []; // registered light emitters
        this.shadowCasters = []; // registered shadow casting obstacles
        
        this.darknessLayer = null;
        this.maskGraphics = null;
    }
    
    /**
     * Initialize ambient darkness overlay
     * @param {number} ambientColor Hex color of the ambient shadow overlay
     * @param {number} ambientAlpha Opacity of the shadow overlay
     */
    setup(ambientColor = 0x020210, ambientAlpha = 0.95) {
        const { width, height } = this.scene.scale;
        
        // 1. Create the dark overlay rectangle covering the screen space
        this.darknessLayer = this.scene.add.rectangle(width / 2, height / 2, width, height, ambientColor, ambientAlpha);
        this.darknessLayer.setScrollFactor(0);
        this.darknessLayer.setDepth(30); // Render above environment layer, below UI
        
        // 2. Create the graphics layer for mask cutouts
        this.maskGraphics = this.scene.add.graphics();
        this.maskGraphics.setScrollFactor(0);
        this.maskGraphics.setDepth(0);
        
        // 3. Setup inverted alpha geometry mask
        const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
        mask.setInvertAlpha(true);
        this.darknessLayer.setMask(mask);
    }
    
    /**
     * Register a new light source emitter
     */
    addLight(source, radius, type = 'point', color = 0xffffff, intensity = 1.0) {
        const light = { source, radius, type, color, intensity, active: true };
        this.lights.push(light);
        return light;
    }
    
    /**
     * Register a shadow caster block
     */
    addShadowCaster(sprite) {
        if (sprite && !this.shadowCasters.includes(sprite)) {
            this.shadowCasters.push(sprite);
        }
    }
    
    /**
     * Clear all light states (for scene shutdown)
     */
    clear() {
        this.lights = [];
        this.shadowCasters = [];
        if (this.darknessLayer) this.darknessLayer.destroy();
        if (this.maskGraphics) this.maskGraphics.destroy();
    }
    
    /**
     * Perform real-time raycasting and shadow projections
     */
    update() {
        if (!this.maskGraphics || !this.scene.cameras.main) return;
        this.maskGraphics.clear();
        
        const cam = this.scene.cameras.main;
        
        // Render light cutouts
        this.lights.forEach(light => {
            if (!light.active || !light.source || !light.source.active) return;
            
            // Project 2D coordinates of light source relative to camera view
            let lx = light.source.x - cam.worldView.x;
            let ly = light.source.y - cam.worldView.y;
            
            // Adjust height if source is player or boss
            if (light.source.visualSprite) {
                lx = light.source.visualSprite.x - cam.worldView.x;
                ly = (light.source.visualSprite.y - 24) - cam.worldView.y; // hands height
            }
            
            // Draw light cutout footprint
            this.maskGraphics.fillStyle(0xffffff, light.intensity);
            
            if (light.type === 'cone') {
                const angle = light.source.rotation || 0;
                this.maskGraphics.beginPath();
                this.maskGraphics.moveTo(lx, ly);
                this.maskGraphics.lineTo(lx + Math.cos(angle - 0.45) * light.radius, ly + Math.sin(angle - 0.45) * light.radius);
                this.maskGraphics.lineTo(lx + Math.cos(angle + 0.45) * light.radius, ly + Math.sin(angle + 0.45) * light.radius);
                this.maskGraphics.closePath();
                this.maskGraphics.fill();
            } else {
                this.maskGraphics.fillCircle(lx, ly, light.radius);
            }
            
            // Project shadow volumes away from light source
            this.shadowCasters.forEach(caster => {
                if (!caster || !caster.active) return;
                
                const vis = caster.visualSprite || caster;
                if (!vis.visible) return;
                
                // Get caster center relative to camera view
                const cx = vis.x - cam.worldView.x;
                const cy = vis.y - cam.worldView.y;
                
                // Caster bounding footprint width & vertical shadow profile
                const w = (vis.displayWidth || 32) * 0.48;
                const h = (vis.displayHeight || 32) * 0.20;
                
                // Corners of shadow caster footprint
                const corners = [
                    { x: cx - w, y: cy - h },
                    { x: cx + w, y: cy - h },
                    { x: cx + w, y: cy + h },
                    { x: cx - w, y: cy + h }
                ];
                
                // Face edges and project away
                for (let i = 0; i < 4; i++) {
                    const p1 = corners[i];
                    const p2 = corners[(i + 1) % 4];
                    
                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    
                    const nx = mx - cx;
                    const ny = my - cy;
                    
                    const ldx = mx - lx;
                    const ldy = my - ly;
                    
                    const dot = nx * ldx + ny * ldy;
                    
                    if (dot > 0) { // Edge faces away from light source
                        const r1x = p1.x - lx;
                        const r1y = p1.y - ly;
                        const d1 = Math.hypot(r1x, r1y);
                        
                        const r2x = p2.x - lx;
                        const r2y = p2.y - ly;
                        const d2 = Math.hypot(r2x, r2y);
                        
                        if (d1 > 0 && d2 > 0) {
                            const p1Proj = {
                                x: p1.x + (r1x / d1) * 1200,
                                y: p1.y + (r1y / d1) * 1200
                            };
                            const p2Proj = {
                                x: p2.x + (r2x / d2) * 1200,
                                y: p2.y + (r2y / d2) * 1200
                            };
                            
                            // Render dark shadow occlusion mask
                            this.maskGraphics.fillStyle(0x000000, 1.0);
                            this.maskGraphics.beginPath();
                            this.maskGraphics.moveTo(p1.x, p1.y);
                            this.maskGraphics.lineTo(p2.x, p2.y);
                            this.maskGraphics.lineTo(p2Proj.x, p2Proj.y);
                            this.maskGraphics.lineTo(p1Proj.x, p1Proj.y);
                            this.maskGraphics.closePath();
                            this.maskGraphics.fill();
                        }
                    }
                }
            });
        });
    }
}
