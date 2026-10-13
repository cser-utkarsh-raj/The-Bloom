import Phaser from 'phaser';

/**
 * DialogueManager.js - Classic Java-game style dialogue system for THE BLOOM
 */
export default class DialogueManager {
    constructor(scene) {
        this.scene = scene;
        this.dialogueQueue = [];
        this.currentLine = null;
        this.isTyping = false;
        this.typeTimer = null;
        this.onCompleteCallback = null;
        
        // UI elements container
        this.container = null;
        this.box = null;
        this.nameText = null;
        this.dialogueText = null;
        this.nextIndicator = null;
    }

    start(lines, onComplete = null) {
        this.dialogueQueue = [...lines];
        this.onCompleteCallback = onComplete;
        
        // Pause physics if active
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.pause();
        }
        
        // Set player state flags if they exist
        if (this.scene.playerSprite) {
            this.scene.playerSprite.setVelocity(0, 0);
            if (this.scene.playerSprite.anims) {
                this.scene.playerSprite.anims.stop();
            }
        }
        
        this.createUI();
        this.showNextLine();
    }

    createUI() {
        const { width, height } = this.scene.scale;
        
        if (this.container) {
            this.container.destroy();
        }

        this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(9999);

        // Click-blocking overlay background
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        overlay.setInteractive(); 
        
        // Box coordinates at the bottom 25% of screen
        const boxHeight = 130;
        const boxY = height - boxHeight - 25;
        const boxWidth = Math.min(width * 0.9, 750);
        const boxX = (width - boxWidth) / 2;

        // Sleek translucent dialogue box
        this.box = this.scene.add.rectangle(boxX + boxWidth / 2, boxY + boxHeight / 2, boxWidth, boxHeight, 0x0c0c0f, 0.90); // Charcoal grey
        this.box.setStrokeStyle(1.5, 0xb89d68, 0.45); // Thin gold border

        // Name Header
        this.nameText = this.scene.add.text(boxX + 25, boxY + 18, "", {
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "15px",
            color: "#d4b37a",
            fontWeight: "700",
            letterSpacing: 3
        });

        // Typing Dialogue text
        this.dialogueText = this.scene.add.text(boxX + 25, boxY + 46, "", {
            fontFamily: "Special Elite, monospace",
            fontSize: "13px",
            color: "#e5e5e8",
            wordWrap: { width: boxWidth - 50 },
            lineSpacing: 5,
            fontWeight: "400"
        });

        // Blinking indicator "▼"
        this.nextIndicator = this.scene.add.text(boxX + boxWidth - 30, boxY + boxHeight - 25, "▼", {
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "11px",
            color: "#d4b37a"
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: this.nextIndicator,
            alpha: 0,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.container.add([overlay, this.box, this.nameText, this.dialogueText, this.nextIndicator]);

        // Advance line on click or space press
        overlay.on('pointerdown', () => {
            this.handleInput();
        });

        // Space key listener just in case
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    showNextLine() {
        if (this.dialogueQueue.length === 0) {
            this.end();
            return;
        }

        this.currentLine = this.dialogueQueue.shift();
        this.nameText.setText(this.currentLine.speaker.toUpperCase());
        this.dialogueText.setText("");
        this.nextIndicator.setVisible(false);

        // Typer effect
        this.isTyping = true;
        let charIndex = 0;
        const text = this.currentLine.text;

        if (this.typeTimer) {
            this.typeTimer.remove();
        }

        this.typeTimer = this.scene.time.addEvent({
            delay: 25, 
            callback: () => {
                this.dialogueText.setText(text.slice(0, charIndex + 1));
                
                // Play typewriter sound
                if (this.scene.sound) {
                    try {
                        this.scene.sound.play('blip2', { volume: 0.1 });
                    } catch (e) {}
                }

                charIndex++;
                if (charIndex >= text.length) {
                    this.finishTyping();
                }
            },
            repeat: text.length - 1
        });
    }

    finishTyping() {
        if (this.typeTimer) {
            this.typeTimer.remove();
        }
        this.dialogueText.setText(this.currentLine.text);
        this.isTyping = false;
        this.nextIndicator.setVisible(true);
    }

    handleInput() {
        if (this.isTyping) {
            this.finishTyping();
        } else {
            this.showNextLine();
        }
    }

    update() {
        // Space advances dialogue as well
        if (this.container && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.handleInput();
        }
    }

    end() {
        if (this.typeTimer) {
            this.typeTimer.remove();
        }
        
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        // Resume physics
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.resume();
        }

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }
}
