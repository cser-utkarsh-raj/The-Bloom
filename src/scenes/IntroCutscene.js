import Phaser from 'phaser';
import LevelManager from '../managers/LevelManager.js';

export default class IntroCutscene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroCutscene' });
    }

    preload() {
        // Preload the beach sunflower background image
        this.load.image('intro_bg', 'assets/menu_bg_tlou.png');
    }

    create() {
        const { width, height } = this.scale;

        // Ominous synthesized background drone and heartbeat using Web Audio
        this.startEerieAudio();

        // Initialize background state
        this.currentBgKey = '';
        this.bg = null;

        // Slides data
        this.slides = [
            "Chennai. Summer of 2026.",
            "It didn't arrive with a scream or a crash. It came in the warm coastal winds.",
            "Microscopic fungal spores, floating silently from the dark ocean depths.",
            "At first, doctors dismissed it as a simple seasonal fever.",
            "Then, the patients stopped blinking. They stopped speaking. They just stood... watching the sun.",
            "The parasite hijacked their brains, turning loved ones into unblinking hosts.",
            "And when the host's body can no longer support the density...",
            "The skull splits. The fungal petals unfold. The Bloom begins.",
            "Samar, a high school teacher, barricades his doors. His wife Daisy is already quiet. Nancy, his 5-year-old daughter, holds his hand."
        ];

        this.currentSlide = 0;
        this.slideText = this.add.text(width / 2, height / 2, "", {
            fontFamily: "Playfair Display, serif",
            fontSize: "20px",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: width * 0.75 },
            lineSpacing: 10,
            fontWeight: "400"
        }).setOrigin(0.5);

        this.hintText = this.add.text(width / 2, height * 0.85, "PRESS [SPACE] TO CONTINUE", {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#8f8f8f",
            letterSpacing: 2,
            fontWeight: "600"
        }).setOrigin(0.5).setAlpha(0.6);

        // Animate hint text
        this.tweens.add({
            targets: this.hintText,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.typeSlide();

        // Skip prompt at top-right
        this.add.text(width - 30, 25, "PRESS [ESC] TO SKIP", {
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            color: "#8f8f8f",
            letterSpacing: 2,
            fontWeight: "600"
        }).setOrigin(1, 0).setAlpha(0.6);

        // Inputs
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.input.on('pointerdown', () => this.nextSlide());
    }

    getBgKeyForSlide(index) {
        if (index <= 2) return 'slide_spores';
        if (index <= 5) return 'slide_hosts';
        return 'slide_bloom';
    }

    typeSlide() {
        this.isTyping = true;
        this.slideText.setText("");
        
        // Switch slides with crossfade
        const nextBgKey = this.getBgKeyForSlide(this.currentSlide);
        if (this.currentBgKey !== nextBgKey) {
            this.currentBgKey = nextBgKey;
            
            if (this.bg) {
                const oldBg = this.bg;
                this.tweens.add({
                    targets: oldBg,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => oldBg.destroy()
                });
            }

            const { width, height } = this.scale;
            this.bg = this.add.image(width / 2, height / 2, nextBgKey).setDisplaySize(width, height).setAlpha(0);
            this.bg.setDepth(-2);

            this.tweens.add({
                targets: this.bg,
                alpha: 0.35,
                duration: 1200
            });

            this.tweens.add({
                targets: this.bg,
                scaleX: this.bg.scaleX * 1.15,
                scaleY: this.bg.scaleY * 1.15,
                duration: 22000,
                ease: 'Linear'
            });
        }
        
        const fullText = this.slides[this.currentSlide];
        let index = 0;

        if (this.typeTimer) this.typeTimer.remove();

        this.typeTimer = this.time.addEvent({
            delay: 40,
            callback: () => {
                this.slideText.setText(fullText.slice(0, index + 1));
                
                // Play subtle tick
                try {
                    this.sound.play('blip2', { volume: 0.08 });
                } catch (e) {}

                index++;
                if (index >= fullText.length) {
                    this.isTyping = false;
                }
            },
            repeat: fullText.length - 1
        });
    }

    nextSlide() {
        if (this.isTyping) {
            // Instant finish typing
            this.typeTimer.remove();
            this.slideText.setText(this.slides[this.currentSlide]);
            this.isTyping = false;
            return;
        }

        this.currentSlide++;
        if (this.currentSlide >= this.slides.length) {
            this.endCutscene();
        } else {
            this.typeSlide();
        }
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.nextSlide();
        }
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.endCutscene();
        }
    }

    startEerieAudio() {
        // Stop any old menu drones
        if (window.BloomAmbientDrone) {
            try {
                window.BloomAmbientDrone.osc1.stop();
                window.BloomAmbientDrone.osc2.stop();
                window.BloomAmbientDrone.lfo.stop();
            } catch(e) {}
            window.BloomAmbientDrone = null;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();

            // High tension pitch oscillator (uneasy ringing)
            const tensionOsc = ctx.createOscillator();
            tensionOsc.type = 'sine';
            tensionOsc.frequency.setValueAtTime(880, ctx.currentTime);
            
            const tensionGain = ctx.createGain();
            tensionGain.gain.setValueAtTime(0.015, ctx.currentTime); // very quiet high pitch

            // Low heartbeat sound maker
            const heartbeatTimer = setInterval(() => {
                if (ctx.state === 'closed') return;
                
                // First beat
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(60, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.35, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);

                // Second beat (delayed by 180ms)
                setTimeout(() => {
                    if (ctx.state === 'closed') return;
                    const osc2 = ctx.createOscillator();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(55, ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                    
                    const gain2 = ctx.createGain();
                    gain2.gain.setValueAtTime(0.25, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.2);
                }, 180);

            }, 1200);

            tensionOsc.connect(tensionGain);
            tensionGain.connect(ctx.destination);
            tensionOsc.start();

            this.audioCtx = ctx;
            this.tensionOsc = tensionOsc;
            this.heartbeatTimer = heartbeatTimer;
        } catch(e) {
            console.error(e);
        }
    }

    endCutscene() {
        // Clean audio context
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.tensionOsc) {
            try { this.tensionOsc.stop(); } catch(e) {}
        }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch(e) {}
        }

        this.cameras.main.fadeOut(1500, 0, 0, 0);
        this.time.delayedCall(1500, () => {
            this.scene.start('Level1_HomeDefense');
        });
    }
}
