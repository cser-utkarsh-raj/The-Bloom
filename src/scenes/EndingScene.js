/**
 * EndingScene.js - Epilogue of Samar's sacrifice
 */
import Phaser from 'phaser';

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super({ key: "EndingScene" });
    }
    
    create() {
        const { width, height } = this.scale;
        
        // Cinematic letterbox bars
        const barHeight = height * 0.15;
        this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0x000000, 1);
        this.add.rectangle(width / 2, height - barHeight / 2, width, barHeight, 0x000000, 1);
        
        // Fade in from white (matching Level 5 flash)
        this.cameras.main.fadeIn(3000, 255, 255, 255);
        
        // Final narrative epilogue
        const epilogue = [
            "Ash covers the ruined landscape of Chennai.",
            "",
            "Beneath the quiet morning sun,",
            "a single figure stands motionless in the ruins.",
            "",
            "Its skull has opened into a giant, glowing sunflower.",
            "A host of the Bloom... turning slowly towards the light.",
            "",
            "Deep beneath the charred earth, inside the steel bunker,",
            "Nancy listens to the silent world above.",
            "",
            "She survived.",
            "Saved by the final human choice of a father.",
            "",
            "✦ THE BLOOM ✦"
        ];
        
        let currentLine = 0;
        const textObject = this.add.text(width / 2, height / 2, "", {
            fontFamily: "Special Elite, monospace",
            fontSize: "16px",
            color: "#e8e2d2",
            align: "center",
            lineSpacing: 10,
            letterSpacing: 1
        }).setOrigin(0.5);
        
        // Typewriter lines effect
        const typewriter = this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (currentLine < epilogue.length) {
                    textObject.setText(textObject.text + (currentLine > 0 ? "\n" : "") + epilogue[currentLine]);
                    currentLine++;
                } else {
                    typewriter.remove();
                    
                    // Return to Menu
                    this.time.delayedCall(6000, () => {
                        this.cameras.main.fadeOut(3000, 0, 0, 0);
                        this.time.delayedCall(3000, () => {
                            this.scene.start("MenuScene");
                        });
                    });
                }
            },
            repeat: epilogue.length - 1
        });
        
        localStorage.setItem("theBloom_completed", "true");
    }
}