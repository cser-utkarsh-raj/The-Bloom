/**
 * MenuScene - THE BLOOM
 * Professional static background + animations + full menu system
 */
import Phaser from 'phaser';
import LevelManager from '../managers/LevelManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
        
        this.THEME = {
            gold: 0xb89d68,
            white: 0xf3efe4,
            gray: 0x8f8f8f,
            bgDark: 0x050505,
            accent: 0xd4b37a,
            fonts: {
                main: "Gothica",
                body: "Myolin"
            }
        };
        
        this.currentTheme = 'forest';
        this.soundEnabled = true;
        this.graphicQuality = 'high';
        this.difficulty = 'normal';
        this.menuItems = [];
    }

    preload() {
        // Ominous pixel art cover
        this.load.image("bg", "assets/menu_bg.png");
    }

    create() {
        const { width, height } = this.scale;

        // ===========================================
        // BACKGROUND (Static - like you loved)
        // ===========================================
        const bg = this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height);
        
        // Dark overlay for mood
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

        // ===========================================
        // ATMOSPHERIC EFFECTS (Just enough)
        // ===========================================
        
        // Floating spores (subtle, not overwhelming)
        const spores = this.add.particles(0, 0, 'fog', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            scale: { min: 0.02, max: 0.06 },
            alpha: { start: 0.15, end: 0 },
            lifespan: 10000,
            frequency: 300,
            tint: [0xb89d68, 0x8f8f8f]
        });
        
        // Fog layer (cinematic)
        const fog1 = this.add.image(width * 0.45, height * 0.45, "fog")
            .setScale(8).setAlpha(0.06).setTint(0xc9d7b8);
        
        const fog2 = this.add.image(width * 0.7, height * 0.6, "fog")
            .setScale(10).setAlpha(0.04);
        
        this.tweens.add({
            targets: fog1,
            x: `+=${width * 0.08}`,
            duration: 18000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.tweens.add({
            targets: fog2,
            x: `+=${width * 0.12}`,
            duration: 24000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ===========================================
        // BRANDING (Static but elegant)
        // ===========================================
        
        // Tagline
        this.add.text(width * 0.07, height * 0.16, "HUMANITY DROWNED IN SILENCE", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.007, 10)}px`,
            color: "#8f8f8f",
            letterSpacing: 6
        }).setAlpha(0.8);

        // Main Title (with subtle pulse animation)
        const title = this.add.text(width * 0.06, height * 0.22, "THE\nBLOOM", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${width * 0.07}px`,
            color: "#f3efe4",
            fontStyle: "900",
            lineSpacing: 2
        }).setShadow(0, 0, "#ffffff", 15, false, true);

        this.tweens.add({
            targets: title,
            alpha: 0.85,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Decorative gold line
        this.add.rectangle(width * 0.07, height * 0.62, width * 0.18, 1, this.THEME.gold).setOrigin(0, 0.5);

        // Story excerpt
        this.add.text(width * 0.07, height * 0.68, 
            "The sea began breathing again.\nEntire coastlines vanished\nbeneath fungal tides.\n\nFrom coastal ruins\nto mountain refuge...", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${width * 0.012}px`,
            color: "#bcbcbc",
            lineSpacing: 10,
            fontStyle: "300"
        });

        // ===========================================
        // MENU PANEL (Sleek, right-aligned)
        // ===========================================
        
        const menuX = width * 0.85;
        const startY = height * 0.28;
        const spacing = height * 0.09;

        const menuOptions = [
            { label: "NEW GAME", action: () => this.startNewGame() },
            { label: "CONTINUE", action: () => this.continueGame() },
            { label: "SETTINGS", action: () => this.openSettings() },
            { label: "ABOUT", action: () => this.openAbout() }
        ];

        // Panel background (subtle)
        this.add.rectangle(width * 0.86, height * 0.5, width * 0.22, height * 0.7, 0x000000, 0.35)
            .setStrokeStyle(1, 0xffffff, 0.08);

        menuOptions.forEach((opt, i) => {
            this.createMenuButton(menuX, startY + (i * spacing), opt.label, opt.action);
        });

        // Start ambient synthesizer drone on user click (required by browsers to play sound)
        this.input.on('pointerdown', () => {
            this.startAmbientDrone();
        });
    }

    createMenuButton(x, y, label, callback) {
        const { width } = this.scale;
        
        const container = this.add.container(x, y);

        // Button background
        const bg = this.add.rectangle(0, 0, width * 0.16, 45, 0x111111, 0.6)
            .setStrokeStyle(1, 0xffffff, 0.1)
            .setInteractive({ useHandCursor: true });

        // Button text
        const text = this.add.text(- (width * 0.07), 0, label, {
            fontFamily: this.THEME.fonts.main,
            fontSize: "16px",
            color: "#ffffff",
            letterSpacing: 3,
            fontWeight: "600"
        }).setOrigin(0, 0.5);

        // Selection indicator (subtle)
        const indicator = this.add.triangle(-(width * 0.09), 0, 0, -6, 12, 0, 0, 6, this.THEME.gold);
        indicator.setAlpha(0);

        container.add([bg, text, indicator]);

        // Hover Animation (the one you liked)
        bg.on("pointerover", () => {
            this.tweens.add({
                targets: container,
                x: x + 12,
                duration: 200,
                ease: 'Power2'
            });
            
            this.tweens.add({
                targets: indicator,
                alpha: 1,
                x: -(width * 0.12),
                duration: 150,
                ease: 'Back.out'
            });
            
            bg.setStrokeStyle(1, this.THEME.gold, 0.8);
            text.setColor("#d4b37a");

            // Play hover sound
            try { this.sound.play('blip', { volume: 0.15 }); } catch (e) {}
        });

        bg.on("pointerout", () => {
            this.tweens.add({
                targets: container,
                x: x,
                duration: 200,
                ease: 'Power2'
            });
            
            this.tweens.add({
                targets: indicator,
                alpha: 0,
                x: -(width * 0.09),
                duration: 150
            });
            
            bg.setStrokeStyle(1, 0xffffff, 0.1);
            text.setColor("#ffffff");
        });

        bg.on("pointerdown", () => {
            this.cameras.main.flash(300, this.THEME.gold, 0.25);
            
            // Play click sound
            try { this.sound.play('blip2', { volume: 0.25 }); } catch (e) {}
            
            callback();
        });
    }

    // ===========================================
    // SETTINGS MODAL (Complete)
    // ===========================================
    
    openSettings() {
        const { width, height } = this.scale;
        
        // Modal background
        const modalBg = this.add.rectangle(width / 2, height / 2, width * 0.5, height * 0.7, 0x050505, 0.98)
            .setStrokeStyle(2, this.THEME.gold, 0.6);
        
        // Title
        const title = this.add.text(width / 2, height * 0.25, "SETTINGS", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.02, 24)}px`,
            color: "#d4b37a",
            letterSpacing: 6
        }).setOrigin(0.5);
        
        let currentY = height * 0.35;
        const lineHeight = height * 0.08;
        
        // ===========================================
        // 1. DIFFICULTY SETTING
        // ===========================================
        
        this.add.text(width * 0.35, currentY, "DIFFICULTY", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#ffffff",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        
        const difficulties = ["NORMAL", "HARD", "NIGHTMARE"];
        const difficultyIndex = difficulties.indexOf(this.difficulty.toUpperCase());
        
        const difficultyBtn = this.add.text(width * 0.65, currentY, this.difficulty.toUpperCase(), {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#b89d68",
            letterSpacing: 2
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        
        difficultyBtn.on("pointerdown", () => {
            const currentIndex = difficulties.indexOf(this.difficulty.toUpperCase());
            const nextIndex = (currentIndex + 1) % difficulties.length;
            this.difficulty = difficulties[nextIndex].toLowerCase();
            difficultyBtn.setText(this.difficulty.toUpperCase());
            LevelManager.setDifficulty(this.difficulty);
        });
        
        // ===========================================
        // 2. THEME COLORS (4 types)
        // ===========================================
        
        currentY += lineHeight;
        
        this.add.text(width * 0.35, currentY, "VISUAL THEME", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#ffffff",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        
        const themes = [
            { name: "FOREST", color: 0x4a6b3a, textColor: "#4a6b3a" },
            { name: "OCEAN", color: 0x3a6b8a, textColor: "#3a6b8a" },
            { name: "BLOOD", color: 0x8b0000, textColor: "#8b0000" },
            { name: "MONOCHROME", color: 0x4a4a4a, textColor: "#8f8f8f" }
        ];
        
        const themeContainer = this.add.container(width * 0.65, currentY);
        
        themes.forEach((theme, idx) => {
            const themeBtn = this.add.rectangle(idx * 45, 0, 35, 35, theme.color, 0.8)
                .setStrokeStyle(1, 0xffffff, 0.3)
                .setInteractive({ useHandCursor: true });
            
            themeBtn.on("pointerover", () => themeBtn.setStrokeStyle(2, this.THEME.gold, 1));
            themeBtn.on("pointerout", () => themeBtn.setStrokeStyle(1, 0xffffff, 0.3));
            themeBtn.on("pointerdown", () => {
                this.currentTheme = theme.name.toLowerCase();
                this.applyTheme(theme.textColor);
            });
            
            themeContainer.add(themeBtn);
        });
        
        // ===========================================
        // 3. GRAPHIC QUALITY
        // ===========================================
        
        currentY += lineHeight;
        
        this.add.text(width * 0.35, currentY, "GRAPHICS", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#ffffff",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        
        const qualities = ["LOW", "MEDIUM", "HIGH"];
        const qualityIndex = qualities.indexOf(this.graphicQuality.toUpperCase());
        
        const qualityBtn = this.add.text(width * 0.65, currentY, this.graphicQuality.toUpperCase(), {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#b89d68",
            letterSpacing: 2
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        
        qualityBtn.on("pointerdown", () => {
            const currentIdx = qualities.indexOf(this.graphicQuality.toUpperCase());
            const nextIdx = (currentIdx + 1) % qualities.length;
            this.graphicQuality = qualities[nextIdx].toLowerCase();
            qualityBtn.setText(this.graphicQuality.toUpperCase());
            this.applyGraphicQuality();
        });
        
        // ===========================================
        // 4. SOUND ON/OFF
        // ===========================================
        
        currentY += lineHeight;
        
        this.add.text(width * 0.35, currentY, "SOUND", {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#ffffff",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        
        const soundBtn = this.add.text(width * 0.65, currentY, this.soundEnabled ? "ON" : "OFF", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.01, 14)}px`,
            color: "#b89d68",
            letterSpacing: 2
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
        
        soundBtn.on("pointerdown", () => {
            this.soundEnabled = !this.soundEnabled;
            soundBtn.setText(this.soundEnabled ? "ON" : "OFF");
            
            if (this.soundEnabled) {
                this.sound.volume = 1;
            } else {
                this.sound.volume = 0;
            }
        });
        
        // ===========================================
        // CLOSE BUTTON
        // ===========================================
        
        const closeBtn = this.add.text(width / 2, height * 0.8, "CLOSE", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.012, 16)}px`,
            color: "#8f8f8f",
            letterSpacing: 4
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on("pointerover", () => closeBtn.setColor("#d4b37a"));
        closeBtn.on("pointerout", () => closeBtn.setColor("#8f8f8f"));
        closeBtn.on("pointerdown", () => {
            modalBg.destroy();
            title.destroy();
            closeBtn.destroy();
            difficultyBtn.destroy();
            qualityBtn.destroy();
            soundBtn.destroy();
            themeContainer.destroy();
            // Clean up text labels
            this.children.list.forEach(child => {
                if (child.type === 'Text' && (child.text === "DIFFICULTY" || child.text === "VISUAL THEME" || child.text === "GRAPHICS" || child.text === "SOUND")) {
                    child.destroy();
                }
            });
        });
    }
    
    applyTheme(accentColor) {
        // Update menu button colors
        this.children.list.forEach(child => {
            if (child.type === 'Text' && child.style && child.style.color === "#d4b37a") {
                child.setColor(accentColor);
            }
            if (child.type === 'Rectangle' && child.strokeColor === 0xb89d68) {
                child.setStrokeStyle(1, parseInt(accentColor.replace('#', '0x')), 0.8);
            }
        });
    }
    
    applyGraphicQuality() {
        const { width, height } = this.scale;
        
        if (this.graphicQuality === 'low') {
            // Reduce particle count
            this.particles?.setFrequency(800);
            this.tweens.killAll();
        } else if (this.graphicQuality === 'medium') {
            this.particles?.setFrequency(400);
        }
        // High quality - leave as is
    }
    
    // ===========================================
    // ABOUT MODAL (Purpose of game)
    // ===========================================
    
    openAbout() {
        const { width, height } = this.scale;
        
        const modalBg = this.add.rectangle(width / 2, height / 2, width * 0.55, height * 0.65, 0x050505, 0.98)
            .setStrokeStyle(2, this.THEME.gold, 0.6);
        
        const title = this.add.text(width / 2, height * 0.22, "ABOUT THE BLOOM", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.02, 22)}px`,
            color: "#d4b37a",
            letterSpacing: 6
        }).setOrigin(0.5);
        
        const storyText = `A CINEMATIC SURVIVAL HORROR EXPERIENCE

A biological fungal infection, originating from mutated 
ocean organisms, spreads across coastal regions.

The sea began producing fungal spores and parasitic 
"Beings" that consume everything in their path.

You are a father. Your daughter is all that matters.

Through coastal ruins, burning forests, and mountain 
refuges, you must protect her from the infection, 
from the Beings, and from the darkness within.

THE BLOOM is a story about:
• Grief and sacrifice
• Parenthood in apocalypse
• Isolation and hope
• The cost of survival

"Those who survived feared becoming part of the Bloom."

CREATED BY
A small team dedicated to atmospheric storytelling

CONTROLS
WASD - Move | SHIFT - Sprint
F - Flashlight | LMB - Attack
E - Interact | H - Daughter commands

VERSION 2.0.0`;
        
        const story = this.add.text(width / 2, height * 0.45, storyText, {
            fontFamily: this.THEME.fonts.body,
            fontSize: `${Math.max(width * 0.009, 11)}px`,
            color: "#bcbcbc",
            align: "center",
            lineSpacing: 8
        }).setOrigin(0.5);
        
        const closeBtn = this.add.text(width / 2, height * 0.82, "RETURN", {
            fontFamily: this.THEME.fonts.main,
            fontSize: `${Math.max(width * 0.012, 16)}px`,
            color: "#8f8f8f",
            letterSpacing: 4
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on("pointerover", () => closeBtn.setColor("#d4b37a"));
        closeBtn.on("pointerout", () => closeBtn.setColor("#8f8f8f"));
        closeBtn.on("pointerdown", () => {
            modalBg.destroy();
            title.destroy();
            story.destroy();
            closeBtn.destroy();
        });
    }

    startNewGame() {
        LevelManager.reset();
        LevelManager.setDifficulty(this.difficulty);
        this.cameras.main.fadeOut(2000, 0, 0, 0);
        this.time.delayedCall(2000, () => {
            this.scene.start("IntroCutscene");
        });
    }

    continueGame() {
        const completedLevel = parseInt(localStorage.getItem("theBloom_level") || "1");
        LevelManager.currentLevel = completedLevel;
        this.cameras.main.fadeOut(2000, 0, 0, 0);
        this.time.delayedCall(2000, () => {
            if (completedLevel === 2) this.scene.start("Level2_WifeBoss");
            else if (completedLevel === 3) this.scene.start("Level3_RoadEscape");
            else if (completedLevel === 4) this.scene.start("Level4_SchoolShelter");
            else if (completedLevel === 5) this.scene.start("Level5_FinalEscape");
            else this.scene.start("Level1_HomeDefense");
        });
    }

    startAmbientDrone() {
        if (window.BloomAmbientDrone) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            
            // Deep base drone oscillator
            const osc1 = ctx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
            
            // Detuned oscillator for chorus/beating effect
            const osc2 = ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(55.8, ctx.currentTime); // slightly detuned
            
            // Filter to make it deep and muffled
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(140, ctx.currentTime);
            
            // Gain node for volume control
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.12, ctx.currentTime); 
            
            // Slow LFO to pulse the volume (breathing effect)
            const lfo = ctx.createOscillator();
            lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // very slow
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);
            
            // Connect LFO to filter frequency to pulse the filter
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            // Connections
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            // Start
            osc1.start();
            osc2.start();
            lfo.start();
            
            window.BloomAmbientDrone = { ctx, osc1, osc2, lfo, gain };
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }
}