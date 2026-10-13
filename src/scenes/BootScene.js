import Phaser from 'phaser';

/**
 * BootScene — Cinematic Asset Loading
 * Features: Video-like intro, animated logo, particle systems, glitch effects
 */

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        this.glitchIntensity = 0;
    }
    
    // Preload method defined at the bottom of class
    
    playOceanAmbience() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const bufferSize = this.audioCtx.sampleRate * 4;
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            this.oceanFilter = this.audioCtx.createBiquadFilter();
            this.oceanFilter.type = 'lowpass';
            this.oceanFilter.frequency.setValueAtTime(80, this.audioCtx.currentTime);
            
            const waveGain = this.audioCtx.createGain();
            waveGain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
            
            noise.connect(this.oceanFilter);
            this.oceanFilter.connect(waveGain);
            waveGain.connect(this.audioCtx.destination);
            
            noise.start();
            this.oceanSource = noise;
            
            // Slow wave modulation
            this.oceanTimer = this.time.addEvent({
                delay: 4000,
                callback: () => {
                    if (!this.audioCtx) return;
                    this.oceanFilter.frequency.exponentialRampToValueAtTime(140, this.audioCtx.currentTime + 2);
                    this.oceanFilter.frequency.exponentialRampToValueAtTime(60, this.audioCtx.currentTime + 4);
                },
                loop: true
            });
        } catch (e) {
            console.warn("Web Audio not supported", e);
        }
    }

    playSonarPing() {
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(620, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(70, this.audioCtx.currentTime + 2.2);
            
            gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 2.2);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start();
            osc.stop(this.audioCtx.currentTime + 2.2);
        } catch (e) {
            console.warn("Web Audio ping failed", e);
        }
    }

    createCinematicIntro() {
        const { width, height } = this.scale;
        
        // Setup background
        const bg = this.add.image(width / 2, height / 2, 'boot_bg').setDisplaySize(width, height);
        const darkOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
        
        // Initialize synthesized audio ambience
        this.playOceanAmbience();
        
        // Add click listener to resume audio context if blocked
        this.input.once('pointerdown', () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        });
        
        // Sonar ping circle graphic (starts invisible)
        const sonarCircle = this.add.circle(width / 2, height / 2, 10, 0xffffff, 0);
        sonarCircle.setStrokeStyle(1.5, 0xffffff, 0);
        
        // Studio Logo Container (starts invisible)
        const logoContainer = this.add.container(width / 2, height / 2);
        logoContainer.setAlpha(0);
        
        // Studio emblem (clean line art)
        const emblem = this.add.graphics();
        emblem.lineStyle(1.5, 0xb89d68, 0.8);
        emblem.strokeCircle(0, -30, 24);
        emblem.strokeCircle(0, -30, 14);
        
        const logoText = this.add.text(0, 15, 'ANTIGRAVITY STUDIOS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#b89d68',
            letterSpacing: 8
        }).setOrigin(0.5);
        
        logoContainer.add([emblem, logoText]);
        
        // Title Text
        const titleText = this.add.text(width / 2, height * 0.45, 'THE BLOOM', {
            fontFamily: 'Gothica',
            fontSize: '56px',
            color: '#ffffff',
            letterSpacing: 12
        }).setOrigin(0.5);
        
        // Subtitle Text
        const subtitleText = this.add.text(width / 2, height * 0.55, 'L O A D I N G . . .', {
            fontFamily: 'Myolin',
            fontSize: '24px',
            color: '#8a8a8a',
            letterSpacing: 10
        }).setOrigin(0.5);
        
        this.simulateLoading();
        
        // Simplified timeline
        this.time.delayedCall(500, () => {
            this.playSonarPing();
        });
    }
    

    simulateLoading() {
        let progress = 0;
        
        const loadInterval = this.time.addEvent({
            delay: 50,
            callback: () => {
                progress += 0.05;
                if (progress >= 1) {
                    loadInterval.remove();
                    this.completeLoading();
                }
            },
            loop: true
        });
    }
    
    completeLoading() {
        const { width, height } = this.scale;
        
        // Clean all redux textures of checkerboard backgrounds before switching to MenuScene
        const reduxKeys = [
            'playerChar', 'daughterChar', 'daisyChar', 'daisyInfectedChar', 'enemyChar',
            'sofa', 'table', 'bed', 'kitchenCounter', 'wallTexture', 'scooterTexture', 'carTexture'
        ];
        reduxKeys.forEach(k => {
            try {
                this.cleanCheckerboardTexture(k);
            } catch (e) {
                console.error("Checkerboard clean error on " + k, e);
            }
        });

        // Flash white
        this.cameras.main.flash(500, 255, 255, 255, 0.5);
        
        // Generate fallback procedural textures for all scenes
        this.generateProceduralTextures();

        // Create transition effect
        const transition = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1);
        
        this.tweens.add({
            targets: transition,
            alpha: 0,
            duration: 1000,
            delay: 500,
            onComplete: () => {
                transition.destroy();
                this.scene.start('MenuScene');
            }
        });
        
        // Cinematic sound effect (simulated with visual)
        this.cameras.main.shake(200, 0.01);
    }

    generateProceduralTextures() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        // 1. Player (Samar - Standing 2.5D figure)
        if (!this.textures.exists('playerChar')) {
            graphics.clear();
            // Legs / Pants (dark charcoal trousers)
            graphics.fillStyle(0x1f1f1f, 1);
            graphics.fillRect(8, 28, 16, 16);
            // Belt line
            graphics.fillStyle(0x3e2723, 1);
            graphics.fillRect(8, 27, 16, 2);
            graphics.fillStyle(0xd4b37a, 1); // Belt buckle
            graphics.fillRect(15, 27, 2, 2);
            // Boots (dark brown with steel laces dots)
            graphics.fillStyle(0x271510, 1);
            graphics.fillRect(8, 44, 6, 4);
            graphics.fillRect(18, 44, 6, 4);
            // Torso / Blue jacket with shading
            graphics.fillStyle(0x102230, 1); // darker base
            graphics.fillRect(6, 14, 20, 14);
            graphics.fillStyle(0x1a2e40, 1); // main color
            graphics.fillRect(8, 15, 16, 12);
            graphics.fillStyle(0x2b3e50, 1); // highlight shoulders
            graphics.fillRect(6, 14, 20, 2);
            graphics.fillRect(6, 16, 20, 2); // shadow collar
            graphics.fillRect(6, 16, 2, 10);
            graphics.fillRect(24, 16, 2, 10);
            // Shirt collar (crimson red undershirt peeking out)
            graphics.fillStyle(0x8b0000, 1);
            graphics.fillRect(14, 12, 4, 3);
            // Hands
            graphics.fillStyle(0xe2a870, 1);
            graphics.fillCircle(8, 26, 3);
            graphics.fillCircle(24, 26, 3);
            // Head / Skin
            graphics.fillStyle(0xe2a870, 1);
            graphics.fillCircle(16, 10, 6);
            // Hair (styled black/dark brown hair with side locks)
            graphics.fillStyle(0x0f0504, 1);
            graphics.fillRect(10, 4, 12, 4);
            graphics.fillRect(10, 8, 3, 3);
            graphics.fillRect(19, 8, 3, 3);
            // Face details: Eyes
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(13, 9, 2, 1);
            graphics.fillRect(17, 9, 2, 1);
            graphics.fillStyle(0x000000, 1);
            graphics.fillRect(14, 9, 1, 1);
            graphics.fillRect(17, 9, 1, 1);
            // Plank weapon (held diagonally across chest, with metal nail bolts drawn!)
            graphics.fillStyle(0x8b5a2b, 1);
            graphics.beginPath();
            graphics.moveTo(3, 30);
            graphics.lineTo(29, 14);
            graphics.lineTo(31, 16);
            graphics.lineTo(5, 32);
            graphics.closePath();
            graphics.fill();
            // Nails in plank
            graphics.fillStyle(0xc0c0c0, 1);
            graphics.fillCircle(6, 27, 1);
            graphics.fillCircle(26, 16, 1);
            graphics.generateTexture('playerChar', 32, 48);
        }

        // 2. Daughter (Nancy - Standing 2.5D child figure)
        if (!this.textures.exists('daughterChar')) {
            graphics.clear();
            // Frock skirt (pink with white dots)
            graphics.fillStyle(0xff5c8a, 1);
            graphics.fillRect(6, 18, 12, 12);
            graphics.fillStyle(0xffffff, 1); // white dots on frock
            graphics.fillRect(8, 20, 1, 1);
            graphics.fillRect(14, 21, 1, 1);
            graphics.fillRect(10, 24, 1, 1);
            graphics.fillRect(12, 27, 1, 1);
            // White socks / brown shoes
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(7, 30, 3, 3);
            graphics.fillRect(14, 30, 3, 3);
            graphics.fillStyle(0x4e3629, 1);
            graphics.fillRect(6, 33, 5, 3);
            graphics.fillRect(13, 33, 5, 3);
            // Head / Skin
            graphics.fillStyle(0xffe4e1, 1);
            graphics.fillCircle(12, 12, 5);
            // Face details: Eyes
            graphics.fillStyle(0x000000, 1);
            graphics.fillRect(10, 11, 1, 1);
            graphics.fillRect(13, 11, 1, 1);
            // Ribbons (red bows in hair)
            graphics.fillStyle(0xff0000, 1);
            graphics.fillRect(5, 8, 2, 2);
            graphics.fillRect(17, 8, 2, 2);
            // Dark brown hair with pigtails
            graphics.fillStyle(0x111111, 1);
            graphics.fillRect(7, 7, 10, 4);
            graphics.fillRect(4, 9, 3, 3); // left tail
            graphics.fillRect(17, 9, 3, 3); // right tail
            graphics.generateTexture('daughterChar', 24, 36);
        }

        // 3. Wife (Daisy - Standing 2.5D saree figure)
        if (!this.textures.exists('daisyChar')) {
            graphics.clear();
            // Saree bottom (maroon/crimson draping skirt)
            graphics.fillStyle(0x7a0000, 1);
            graphics.fillRect(8, 26, 16, 20);
            // Gold saree border details (detailed patterns)
            graphics.fillStyle(0xd4b37a, 1);
            graphics.fillRect(8, 42, 16, 2);
            graphics.fillRect(8, 26, 2, 16);
            graphics.fillRect(12, 32, 2, 12); // draping fold
            // Saree top (orange-gold draping with red trim)
            graphics.fillStyle(0xdeb887, 1);
            graphics.fillRect(6, 14, 20, 12);
            graphics.fillStyle(0xff8c00, 1); // blouse outline
            graphics.fillRect(6, 14, 20, 2);
            // Head / Skin
            graphics.fillStyle(0xe2a870, 1);
            graphics.fillCircle(16, 10, 6);
            // Face details: Eyes and Bindi (red dot on forehead)
            graphics.fillStyle(0x000000, 1);
            graphics.fillRect(14, 9, 1, 1);
            graphics.fillRect(17, 9, 1, 1);
            graphics.fillStyle(0xff0000, 1); // Bindi
            graphics.fillRect(15, 7, 2, 2);
            // Long black hair draping shoulders
            graphics.fillStyle(0x111111, 1);
            graphics.fillRect(10, 4, 12, 5);
            graphics.fillRect(9, 9, 3, 12);
            graphics.fillRect(20, 9, 3, 12);
            // Hands
            graphics.fillStyle(0xe2a870, 1);
            graphics.fillCircle(8, 23, 2.5);
            graphics.fillCircle(24, 23, 2.5);
            graphics.generateTexture('daisyChar', 32, 48);
        }

        // 4. Infected Wife (Daisy Boss - Standing 2.5D infected version)
        if (!this.textures.exists('daisyInfectedChar')) {
            graphics.clear();
            // Tattered saree bottom (dark decay brown with green moss spots)
            graphics.fillStyle(0x271810, 1);
            graphics.fillRect(8, 26, 16, 20);
            graphics.fillStyle(0x3d5236, 1); // moss spots
            graphics.fillRect(10, 30, 3, 4);
            graphics.fillRect(18, 38, 4, 3);
            // Decayed grey saree top
            graphics.fillStyle(0x404d3b, 1);
            graphics.fillRect(6, 14, 20, 12);
            // Shaded decaying head (grey-green skin)
            graphics.fillStyle(0x5a6955, 1);
            graphics.fillCircle(16, 10, 6);
            // Glowing red eyes
            graphics.fillStyle(0xff0000, 1);
            graphics.fillRect(13, 9, 2, 2);
            graphics.fillRect(17, 9, 2, 2);
            // Fungal growths (bright orange cluster on shoulder)
            graphics.fillStyle(0xff5500, 1);
            graphics.fillRect(3, 12, 5, 5);
            graphics.fillRect(24, 11, 5, 5);
            graphics.fillStyle(0xffcc00, 1); // yellow dots inside fungus
            graphics.fillRect(4, 13, 2, 2);
            graphics.fillRect(26, 12, 2, 2);
            // Hands holding a lighter
            graphics.fillStyle(0x5a6955, 1);
            graphics.fillCircle(8, 22, 2.5);
            graphics.fillCircle(24, 22, 2.5);
            // Flickering lighter flame (orange/yellow)
            graphics.fillStyle(0xffaa00, 1);
            graphics.fillCircle(24, 16, 3);
            graphics.fillStyle(0xffff33, 1);
            graphics.fillCircle(24, 16, 1.5);
            graphics.generateTexture('daisyInfectedChar', 32, 48);
        }

        // 5. Being (Infected zombie - Standing 2.5D zombie)
        // (Replaced by external PNG sprite)

        // 6. Barricade
        graphics.lineStyle(1, 0x3d2b1f, 1);
        graphics.strokeRect(0, 0, 64, 16);
        graphics.lineBetween(0, 8, 64, 8); 
        graphics.generateTexture('barricade', 64, 16);

        // 7. Scooter (isometric Vespa-style, 48x48)
        if (!this.textures.exists('scooterTexture')) {
            graphics.clear();
            // Wheels
            graphics.fillStyle(0x333333, 1);
            graphics.fillCircle(12, 38, 6);
            graphics.fillCircle(36, 38, 6);
            graphics.fillStyle(0xcccccc, 1); // hubs
            graphics.fillCircle(12, 38, 2);
            graphics.fillCircle(36, 38, 2);
            // Body (Vespa Mint Green)
            graphics.fillStyle(0xa3c1ad, 1);
            graphics.fillRect(8, 24, 32, 10);
            graphics.fillCircle(12, 28, 7);
            graphics.fillCircle(32, 26, 6);
            // Seat
            graphics.fillStyle(0x1a1a1a, 1);
            graphics.fillRect(16, 20, 16, 4);
            // Front shield & handlebars
            graphics.fillStyle(0xa3c1ad, 1);
            graphics.fillRect(8, 12, 4, 16); // shield
            graphics.fillStyle(0xcccccc, 1);
            graphics.fillRect(8, 8, 8, 4); // handlebars
            // Headlight
            graphics.fillStyle(0xffffcc, 1);
            graphics.fillCircle(6, 12, 3);
            graphics.generateTexture('scooterTexture', 48, 48);
        }

        // 8. Car (isometric sedan, 120x80)
        if (!this.textures.exists('carTexture')) {
            graphics.clear();
            // Wheels
            graphics.fillStyle(0x222222, 1);
            graphics.fillCircle(30, 65, 12);
            graphics.fillCircle(90, 65, 12);
            graphics.fillStyle(0x888888, 1);
            graphics.fillCircle(30, 65, 4);
            graphics.fillCircle(90, 65, 4);
            // Body (Crimson Sedan)
            graphics.fillStyle(0x8b0000, 1);
            graphics.fillRect(10, 35, 100, 25); // Lower body
            graphics.fillStyle(0xb22222, 1); // highlight
            graphics.fillRect(20, 20, 70, 20); // Cabin roof
            // Windows
            graphics.fillStyle(0x87ceeb, 0.7); // Windshield
            graphics.fillRect(25, 22, 18, 12);
            graphics.fillRect(48, 22, 20, 12);
            graphics.fillRect(72, 22, 14, 12);
            // Headlights & Tail lights
            graphics.fillStyle(0xffffaa, 1);
            graphics.fillRect(8, 40, 4, 8); // Front headlight
            graphics.fillStyle(0xff3333, 1);
            graphics.fillRect(108, 40, 4, 8); // Tail light
            graphics.generateTexture('carTexture', 120, 80);
        }

        // 7. Window
        graphics.clear();
        graphics.fillStyle(0x87ceeb, 0.4); // Blue glass tint
        graphics.fillRect(0, 0, 64, 32);
        graphics.lineStyle(2, 0x4682b4, 1); // Steel frame
        graphics.strokeRect(0, 0, 64, 32);
        graphics.generateTexture('window', 64, 32);

        // 8. Blood particles
        graphics.clear();
        graphics.fillStyle(0x8b0000, 1); // Crimson
        graphics.fillCircle(4, 4, 3);
        graphics.generateTexture('blood', 8, 8);

        // 9. Impact particles
        graphics.clear();
        graphics.fillStyle(0xffffff, 0.5); // White smoke
        graphics.fillCircle(8, 8, 7);
        graphics.generateTexture('impact', 16, 16);

        // 10. Flashlight Cone
        graphics.clear();
        graphics.fillStyle(0xffffee, 0.25);
        graphics.beginPath();
        graphics.moveTo(0, 32); 
        graphics.lineTo(128, 0); 
        graphics.lineTo(128, 64); 
        graphics.closePath();
        graphics.fill();
        graphics.generateTexture('flashlightCone', 128, 64);

        // 11. Bullet
        graphics.clear();
        graphics.fillStyle(0xffd700, 1); // Gold
        graphics.fillRect(0, 0, 8, 2);
        graphics.generateTexture('bullet', 8, 2);

        // 12. Medkit
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 24, 24);
        graphics.lineStyle(1, 0x000000, 1);
        graphics.strokeRect(0, 0, 24, 24);
        graphics.fillStyle(0xff0000, 1); // Red cross
        graphics.fillRect(10, 4, 4, 16);
        graphics.fillRect(4, 10, 16, 4);
        graphics.generateTexture('medkit', 24, 24);

        // 13. Ammo Pack
        graphics.clear();
        graphics.fillStyle(0xb89d68, 1);
        graphics.fillRect(0, 0, 24, 24);
        graphics.lineStyle(1, 0x000000, 1);
        graphics.strokeRect(0, 0, 24, 24);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(6, 6, 12, 12);
        graphics.generateTexture('ammo', 24, 24);

        // 14. Floor Wood Texture (High detailing with staggered panels and nail heads)
        graphics.clear();
        graphics.fillStyle(0x2b1e19, 1); // Deep warm brown base
        graphics.fillRect(0, 0, 64, 64);
        // Draw wood planks with shade variation
        graphics.fillStyle(0x3e2723, 1);
        graphics.fillRect(0, 0, 64, 15);
        graphics.fillStyle(0x35211b, 1);
        graphics.fillRect(0, 16, 64, 15);
        graphics.fillStyle(0x4e342e, 1);
        graphics.fillRect(0, 32, 64, 15);
        graphics.fillStyle(0x3c241d, 1);
        graphics.fillRect(0, 48, 64, 15);
        // Join lines
        graphics.lineStyle(1.5, 0x150b07, 1);
        for (let i = 0; i < 64; i += 16) {
            graphics.lineBetween(0, i, 64, i);
            // Staggered vertical seams
            if (i === 0) graphics.lineBetween(16, 0, 16, 16);
            if (i === 16) graphics.lineBetween(48, 16, 48, 32);
            if (i === 32) graphics.lineBetween(32, 32, 32, 48);
            if (i === 48) graphics.lineBetween(16, 48, 16, 64);
        }
        // Small nail holes in corners of planks
        graphics.fillStyle(0x150b07, 1);
        graphics.fillRect(1, 1, 1.5, 1.5);
        graphics.fillRect(61, 1, 1.5, 1.5);
        graphics.fillRect(1, 17, 1.5, 1.5);
        graphics.fillRect(61, 17, 1.5, 1.5);
        graphics.fillRect(1, 33, 1.5, 1.5);
        graphics.fillRect(61, 33, 1.5, 1.5);
        graphics.fillRect(1, 49, 1.5, 1.5);
        graphics.fillRect(61, 49, 1.5, 1.5);
        graphics.generateTexture('floorWood', 64, 64);
        // 15. Wall Brick Texture (vertical 2.5D wall face)
        if (!this.textures.exists('wallTexture')) {
            graphics.clear();
            // Base dark concrete block
            graphics.fillStyle(0x1c1c1c, 1);
            graphics.fillRect(0, 0, 64, 64);
            // Slate brick pattern on front face (y=12 to 64)
            graphics.fillStyle(0x282828, 1);
            graphics.fillRect(0, 12, 64, 52);
            // Mortar lines (brick seams)
            graphics.lineStyle(1.5, 0x0f0f0f, 1);
            graphics.lineBetween(0, 12, 64, 12);
            graphics.lineBetween(0, 28, 64, 28);
            graphics.lineBetween(0, 44, 64, 44);
            graphics.lineBetween(0, 60, 64, 60);
            graphics.lineBetween(16, 12, 16, 28);
            graphics.lineBetween(48, 12, 48, 28);
            graphics.lineBetween(32, 28, 32, 44);
            graphics.lineBetween(16, 44, 16, 60);
            graphics.lineBetween(48, 44, 48, 60);
            // Top bevel highlight (for 2.5D depth edge)
            graphics.fillStyle(0x404040, 1);
            graphics.fillRect(0, 0, 64, 2);
            graphics.fillRect(0, 12, 64, 2);
            graphics.generateTexture('wallTexture', 64, 64);
        }
 
        // 16. Fallback background image for Menu
        graphics.clear();
        graphics.fillStyle(0x07070d, 1); // Midnight blue
        graphics.fillRect(0, 0, 128, 128);
        graphics.generateTexture('bg', 128, 128);
 
        // 17. Fog particle
        graphics.clear();
        graphics.fillStyle(0xffffff, 0.05);
        graphics.fillCircle(16, 16, 14);
        graphics.generateTexture('fog', 32, 32);
 
        // 18. Fungal node
        graphics.clear();
        graphics.fillStyle(0x8b0000, 1);
        graphics.fillCircle(8, 8, 6);
        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(8, 8, 3);
        graphics.generateTexture('fungusNode', 16, 16);
 
        // 19. Carpet (flat rug, visual only)
        graphics.clear();
        graphics.fillStyle(0x7f0000, 1); // Shaded crimson base
        graphics.fillRect(0, 0, 96, 64);
        graphics.lineStyle(2, 0xb89d68, 1); // Gold trim border
        graphics.strokeRect(4, 4, 88, 56);
        graphics.fillStyle(0x5f0000, 1); // Internal pattern
        graphics.fillRect(16, 12, 64, 40);
        graphics.generateTexture('carpet', 96, 64);
 
        // 20. Sofa (3/4 perspective Couch, 64x48)
        if (!this.textures.exists('sofa')) {
            graphics.clear();
            // Dark underside shadow
            graphics.fillStyle(0x0a140d, 0.4);
            graphics.fillRect(0, 42, 64, 6);
            // Green base frame
            graphics.fillStyle(0x1e4620, 1);
            graphics.fillRect(0, 36, 64, 8);
            // Seat cushions
            graphics.fillStyle(0x2e6b30, 1);
            graphics.fillRect(4, 24, 56, 12);
            // Backrest (high cushions, extending up to y=4)
            graphics.fillStyle(0x3e8c41, 1);
            graphics.fillRect(4, 4, 56, 20);
            // Armrests (tilted sides)
            graphics.fillStyle(0x1e4620, 1);
            graphics.fillRect(0, 16, 8, 28);
            graphics.fillRect(56, 16, 8, 28);
            // Cushion dividing lines
            graphics.lineStyle(1.5, 0x143016, 0.8);
            graphics.lineBetween(32, 4, 32, 36);
            graphics.generateTexture('sofa', 64, 48);
        }
 
        // 21. Bed (3/4 perspective Bed, 48x80)
        if (!this.textures.exists('bed')) {
            graphics.clear();
            // Wooden headboard (extending up to y=0)
            graphics.fillStyle(0x3e2723, 1);
            graphics.fillRect(0, 0, 48, 22);
            graphics.fillStyle(0x5d4037, 1); // highlight
            graphics.fillRect(2, 2, 44, 2);
            // Bed base frame (wood)
            graphics.fillStyle(0x3e2723, 1);
            graphics.fillRect(0, 22, 48, 58);
            // Mattress with white sheet
            graphics.fillStyle(0xf5f5f5, 1);
            graphics.fillRect(2, 22, 44, 54);
            // Folded blue blanket (covering y=42 to 76)
            graphics.fillStyle(0x203a54, 1);
            graphics.fillRect(2, 42, 44, 34);
            graphics.fillStyle(0x2e547a, 1); // trim
            graphics.fillRect(2, 42, 44, 3);
            // Pillow
            graphics.fillStyle(0x757575, 1);
            graphics.fillRect(6, 26, 36, 12);
            graphics.generateTexture('bed', 48, 80);
        }
 
        // 22. Table (3/4 perspective Coffee Table, 48x36)
        if (!this.textures.exists('table')) {
            graphics.clear();
            // Table legs (extending from y=12 to 36)
            graphics.fillStyle(0x2b1e19, 1);
            graphics.fillRect(2, 12, 3, 24); // top-left
            graphics.fillRect(43, 12, 3, 24); // top-right
            graphics.fillRect(5, 18, 3, 18); // front-left
            graphics.fillRect(40, 18, 3, 18); // front-right
            // Tabletop slab (wood finish)
            graphics.fillStyle(0x5c4033, 1);
            graphics.fillRect(0, 4, 48, 14);
            // Bevel highlight
            graphics.fillStyle(0x8b5a2b, 1);
            graphics.fillRect(0, 4, 48, 2);
            graphics.generateTexture('table', 48, 36);
        }
 
        // 23. Kitchen Counter (3/4 Kitchen Slab, 64x48)
        if (!this.textures.exists('kitchenCounter')) {
            graphics.clear();
            // Bottom wooden cupboards (brown base)
            graphics.fillStyle(0x4e3629, 1);
            graphics.fillRect(0, 18, 64, 30);
            // Cabinet doors lines
            graphics.lineStyle(1.5, 0x271b14, 1);
            graphics.strokeRect(2, 22, 28, 22);
            graphics.strokeRect(34, 22, 28, 22);
            graphics.fillStyle(0xd4b37a, 1); // gold knobs
            graphics.fillRect(26, 32, 2, 2);
            graphics.fillRect(36, 32, 2, 2);
            // Grey marble top slab (y=0 to 18)
            graphics.fillStyle(0x616161, 1);
            graphics.fillRect(0, 0, 64, 18);
            graphics.fillStyle(0x757575, 1); // highlight edge
            graphics.fillRect(0, 16, 64, 2);
            // Sink cutout
            graphics.fillStyle(0x212121, 1);
            graphics.fillRect(10, 4, 20, 10);
            graphics.fillStyle(0x9e9e9e, 1); // metal faucet
            graphics.fillRect(19, 2, 2, 4);
            graphics.generateTexture('kitchenCounter', 64, 48);
        }
    }
    
    preload() {
        // Load custom sprites
        this.load.image('enemyChar', 'assets/sprites/Zombie/Zombie_idle/Zombie_idle1.png');
        
        // Load ominous background image
        this.load.image('boot_bg', 'assets/menu_bg.png');
        
        // Load slideshow snapshots
        this.load.image('slide_spores', 'assets/slide_spores.png');
        this.load.image('slide_hosts', 'assets/slide_hosts.png');
        this.load.image('slide_bloom', 'assets/slide_bloom.png');
        
        // Removed redux gameplay assets to fall back to procedural graphics
        
        // Load local sound effects
        this.load.audio('blip', 'assets/blip.wav');
        this.load.audio('blip2', 'assets/blip2.wav');
        this.load.audio('correct', 'assets/correct.wav');
        this.load.audio('correct2', 'assets/correct2.wav');
    }
    
    create() {
        // Create cinematic loading sequence
        this.createCinematicIntro();
        
        // Simulate loading (no external assets needed)
        this.simulateLoading();
    }

    cleanCheckerboardTexture(key) {
        if (!this.textures.exists(key)) return;
        const texture = this.textures.get(key);
        const source = texture.getSourceImage();
        if (!source || !source.width || !source.height) return;

        // Create temporary canvas
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        // Detector: returns true if pixel color matches the checkerboard grid shades
        // Typical checkerboard patterns: (255, 255, 255) and (204, 204, 204) or similar light gray
        function isCheckerboardColor(r, g, b) {
            // White checkerboard square
            if (r > 238 && g > 238 && b > 238) return true;
            // Grey checkerboard square (r, g, b are very close and between 180 and 230)
            const diff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
            if (diff < 8 && r > 180 && r < 232) return true;
            return false;
        }

        // We run a flood fill starting from all 4 boundaries of the image.
        // This ensures we ONLY erase the background and preserve any similar colors in the main sprite (e.g. Samar's white shirt or a white pillow on the bed).
        const queue = [];
        const visited = new Uint8Array(w * h);

        // Push border coordinates
        for (let x = 0; x < w; x++) {
            queue.push({ x, y: 0 });
            queue.push({ x, y: h - 1 });
            visited[x] = 1;
            visited[x + (h - 1) * w] = 1;
        }
        for (let y = 1; y < h - 1; y++) {
            queue.push({ x: 0, y });
            queue.push({ x: w - 1, y });
            visited[y * w] = 1;
            visited[w - 1 + y * w] = 1;
        }

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const idx = (x + y * w) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 0 && isCheckerboardColor(r, g, b)) {
                data[idx + 3] = 0; // Make transparent

                // Add 4-way neighbors
                const dirs = [
                    { x: x + 1, y }, { x: x - 1, y },
                    { x, y: y + 1 }, { x, y: y - 1 }
                ];
                for (const d of dirs) {
                    if (d.x >= 0 && d.x < w && d.y >= 0 && d.y < h) {
                        const nIdx = d.x + d.y * w;
                        if (!visited[nIdx]) {
                            visited[nIdx] = 1;
                            queue.push(d);
                        }
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Replace texture image in Phaser cache
        texture.setImage(canvas);
    }
}