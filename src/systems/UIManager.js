import Phaser from 'phaser';

/**
 * UIManager.js - Sleek Minimalist Cinematic HUD Manager for all Levels
 */
export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        
        this.healthLabel = null;
        this.staminaLabel = null;
        this.batteryLabel = null;
        this.nancyLabel = null;
        
        this.hpTrack = null;
        this.stTrack = null;
        this.batTrack = null;
        
        this.hpFill = null;
        this.stFill = null;
        this.batFill = null;
        
        this.nancyStatusText = null;
        this.weaponText = null;
        this.uiText = null;
        this.objectiveText = null;
        
        // Level 2 boss widgets
        this.bossTrack = null;
        this.bossBar = null;
        this.bossText = null;
    }
    
    /**
     * Create HUD widgets
     */
    create() {
        const { width, height } = this.scene.scale;
        
        // Minimal dark background container for status bar (top-left)
        this.containerBg = this.scene.add.rectangle(15, 15, 260, 95, 0x0c0c0f, 0.75)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(99)
            .setStrokeStyle(1, 0xffffff, 0.1);

        // Labels
        this.healthLabel = this.scene.add.text(25, 22, "HP", { fontFamily: "Myolin, monospace", fontSize: "12px", color: "#8a8a8a", fontWeight: "600", letterSpacing: 1 }).setScrollFactor(0).setDepth(100);
        this.staminaLabel = this.scene.add.text(25, 42, "STAMINA", { fontFamily: "Myolin, monospace", fontSize: "12px", color: "#8a8a8a", fontWeight: "600", letterSpacing: 1 }).setScrollFactor(0).setDepth(100);
        this.batteryLabel = this.scene.add.text(25, 62, "BATTERY", { fontFamily: "Myolin, monospace", fontSize: "12px", color: "#8a8a8a", fontWeight: "600", letterSpacing: 1 }).setScrollFactor(0).setDepth(100);
        this.nancyLabel = this.scene.add.text(25, 82, "NANCY", { fontFamily: "Myolin, monospace", fontSize: "12px", color: "#8a8a8a", fontWeight: "600", letterSpacing: 1 }).setScrollFactor(0).setDepth(100);

        // Progress bar backgrounds (tracks)
        this.hpTrack = this.scene.add.rectangle(100, 27, 160, 3, 0x222222).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.stTrack = this.scene.add.rectangle(100, 47, 160, 3, 0x222222).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.batTrack = this.scene.add.rectangle(100, 67, 160, 3, 0x222222).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        // Progress bar fills (HP/Stamina/Battery)
        this.hpFill = this.scene.add.rectangle(100, 27, 160, 3, 0xd9534f).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.stFill = this.scene.add.rectangle(100, 47, 160, 3, 0x5cb85c).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.batFill = this.scene.add.rectangle(100, 67, 160, 3, 0xf0ad4e).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        // Nancy status text
        this.nancyStatusText = this.scene.add.text(100, 82, "SAFE", { fontFamily: "Myolin, monospace", fontSize: "12px", color: "#5cb85c", fontWeight: "700" }).setScrollFactor(0).setDepth(100);

        // Weapon Display (Bottom-Left)
        this.weaponText = this.scene.add.text(25, height - 30, "", { fontFamily: "Myolin, monospace", fontSize: "14px", color: "#ffffff", letterSpacing: 2, fontWeight: "600" }).setScrollFactor(0).setDepth(100);

        // Objective / Beings remaining (Top-Right)
        this.uiText = this.scene.add.text(width - 25, 20, "", {
            fontFamily: "Gothica, sans-serif",
            fontSize: "16px",
            color: "#d4b37a",
            letterSpacing: 2,
            fontWeight: "700",
            align: "right"
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
        
        // Objective Text (Bottom-Center)
        this.objectiveText = this.scene.add.text(width / 2, height - 30, "", {
            fontFamily: "Gothica, sans-serif",
            fontSize: "16px",
            color: "#f0ad4e",
            letterSpacing: 2,
            fontWeight: "600"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        // Boss Health Bar UI (Level 2 only)
        if (this.scene.scene.key === 'Level2_WifeBoss') {
            this.bossTrack = this.scene.add.rectangle(width / 2, 25, 300, 3, 0x222222).setScrollFactor(0).setDepth(99);
            this.bossBar = this.scene.add.rectangle(width / 2 - 150, 25, 300, 3, 0x9370db).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
            this.bossText = this.scene.add.text(width / 2, 38, "DAISY — INFECTION LEVEL: 90%", {
                fontFamily: "Gothica, sans-serif",
                fontSize: "14px",
                color: "#e5e5e8",
                letterSpacing: 2,
                fontWeight: "600"
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        }
        
        // ===========================================
        // PAUSE MENU (HTML/DOM OVERLAY)
        // ===========================================
        this.pauseMenu = document.createElement('div');
        this.pauseMenu.id = 'pause-menu';
        this.pauseMenu.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: none; flex-direction: column;
            justify-content: center; align-items: center; z-index: 100000;
            font-family: 'Gothica', sans-serif;
        `;
        
        const title = document.createElement('h1');
        title.innerText = 'PAUSED';
        title.style.cssText = 'color: #b89d68; font-size: 48px; letter-spacing: 12px; margin-bottom: 40px; text-shadow: 2px 2px 0px #000;';
        
        const btnStyle = 'background: rgba(184, 157, 104, 0.1); border: 1px solid #b89d68; color: #fff; font-family: Myolin, monospace; font-size: 24px; padding: 12px 40px; margin: 10px; cursor: pointer; transition: all 0.2s ease; min-width: 250px; text-align: center;';
        
        const btnResume = document.createElement('button');
        btnResume.innerText = 'RESUME';
        btnResume.style.cssText = btnStyle;
        btnResume.onmouseover = () => btnResume.style.background = 'rgba(184, 157, 104, 0.4)';
        btnResume.onmouseout = () => btnResume.style.background = 'rgba(184, 157, 104, 0.1)';
        btnResume.onclick = () => this.togglePause();
        
        const btnQuit = document.createElement('button');
        btnQuit.innerText = 'QUIT TO MENU';
        btnQuit.style.cssText = btnStyle;
        btnQuit.onmouseover = () => btnQuit.style.background = 'rgba(184, 157, 104, 0.4)';
        btnQuit.onmouseout = () => btnQuit.style.background = 'rgba(184, 157, 104, 0.1)';
        btnQuit.onclick = () => {
            this.togglePause();
            this.scene.scene.start('MenuScene');
        };
        
        this.pauseMenu.appendChild(title);
        this.pauseMenu.appendChild(btnResume);
        this.pauseMenu.appendChild(btnQuit);
        document.body.appendChild(this.pauseMenu);
        
        // Global ESC listener
        this.escListener = (e) => {
            if (e.key === 'Escape') this.togglePause();
        };
        document.addEventListener('keydown', this.escListener);

        // Cleanup on scene shutdown
        this.scene.events.once('shutdown', () => {
            document.removeEventListener('keydown', this.escListener);
            if (this.pauseMenu && this.pauseMenu.parentNode) {
                this.pauseMenu.parentNode.removeChild(this.pauseMenu);
            }
        });
    }

    togglePause() {
        if (this.scene.scene.isPaused(this.scene.scene.key)) {
            // Already paused natively? This is our toggle state
            this.scene.scene.resume();
            this.pauseMenu.style.display = 'none';
        } else if (this.pauseMenu.style.display === 'flex') {
            // Unpause
            this.scene.scene.resume();
            this.pauseMenu.style.display = 'none';
        } else {
            // Pause
            this.scene.scene.pause();
            this.pauseMenu.style.display = 'flex';
        }
    }
    
    /**
     * Refresh HUD values
     */
    update() {
        const player = this.scene.playerSprite;
        const daughter = this.scene.daughterSprite;
        if (!player || !this.hpFill) return;
        
        // Sync hp and stamina
        this.hpFill.width = 160 * Math.max(0, Math.min(100, player.health)) / 100;
        this.stFill.width = 160 * Math.max(0, Math.min(100, player.stamina)) / 100;
        
        // Flashlight battery
        if (player.hasFlashlight) {
            this.batTrack.setVisible(true);
            this.batFill.setVisible(true);
            this.batFill.width = 160 * Math.max(0, Math.min(100, player.flashlightBattery)) / 100;
            this.batteryLabel.setColor("#8a8a8a");
        } else {
            this.batTrack.setVisible(false);
            this.batFill.setVisible(false);
            this.batteryLabel.setColor("#444444");
        }
        
        // Nancy status
        if (daughter) {
            const dNancy = Phaser.Math.Distance.Between(player.x, player.y, daughter.x, daughter.y);
            if (dNancy < 70) {
                this.nancyStatusText.setText("SAFE").setColor("#5cb85c");
            } else if (dNancy < 140) {
                this.nancyStatusText.setText("FOLLOWING").setColor("#f0ad4e");
            } else {
                this.nancyStatusText.setText("PANICKED / DISTANT").setColor("#d9534f");
            }
        }
        
        // Weapon text
        if (player.weapon === 'plank') {
            this.weaponText.setText("WEAPON: WOOD PLANK");
        } else {
            this.weaponText.setText(`WEAPON: ${player.weapon.toUpperCase()} [AMMO: ${player.ammo}]`);
        }
        
        // Objective / Beings remaining texts
        if (this.scene.scene.key === 'Level1_HomeDefense') {
            this.uiText.setText(`BEINGS REMAINING: ${Math.max(0, this.scene.enemiesRemaining)}`);
        } else if (this.scene.scene.key === 'Level2_WifeBoss') {
            this.uiText.setText("");
            if (this.scene.boss && this.scene.boss.active) {
                this.bossBar.width = Math.max(0, 300 * (this.scene.boss.health / this.scene.boss.maxHealth));
                const infPercent = Math.floor(90 * (this.scene.boss.health / this.scene.boss.maxHealth));
                this.bossText.setText(`DAISY — INFECTION LEVEL: ${infPercent}%`);
            }
        } else {
            this.uiText.setText("");
        }
    }
}
