import Phaser from "phaser";

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameOverScene" });
    }
    
    create() {
        const { width, height } = this.scale;
        
        // Dark background
        this.add.rectangle(0, 0, width, height, 0x000000);
        
        // "THE BLOOM" faded text
        const title = this.add.text(width / 2, height * 0.2, "THE BLOOM", {
            fontFamily: "Cinzel",
            fontSize: `${Math.max(24, width * 0.05)}px`,
            color: "#8f8f8f",
            letterSpacing: 8
        }).setOrigin(0.5);
        
        // GAME OVER text
        const gameOver = this.add.text(width / 2, height * 0.4, "GAME OVER", {
            fontFamily: "Cinzel",
            fontSize: `${Math.max(36, width * 0.06)}px`,
            color: "#8b0000",
            letterSpacing: 6,
            fontStyle: "900"
        }).setOrigin(0.5);
        
        // Message
        const message = this.add.text(width / 2, height * 0.55, 
            "The Bloom claimed another soul.\n\nYour daughter waits in the darkness.", {
            fontFamily: "Inter",
            fontSize: `${Math.max(12, width * 0.015)}px`,
            color: "#bcbcbc",
            align: "center",
            lineSpacing: 8
        }).setOrigin(0.5);
        
        // Options
        const retry = this.add.text(width / 2, height * 0.75, "⟳  TRY AGAIN", {
            fontFamily: "Cinzel",
            fontSize: `${Math.max(14, width * 0.018)}px`,
            color: "#c9a03d",
            letterSpacing: 4
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        const menu = this.add.text(width / 2, height * 0.82, "✖  MAIN MENU", {
            fontFamily: "Cinzel",
            fontSize: `${Math.max(12, width * 0.015)}px`,
            color: "#8f8f8f",
            letterSpacing: 4
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        // Hover effects
        retry.on("pointerover", () => retry.setColor("#ffcc44"));
        retry.on("pointerout", () => retry.setColor("#c9a03d"));
        retry.on("pointerdown", () => {
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.time.delayedCall(1000, () => {
                this.scene.start("Level1_HomeDefense");
            });
        });
        
        menu.on("pointerover", () => menu.setColor("#c9a03d"));
        menu.on("pointerout", () => menu.setColor("#8f8f8f"));
        menu.on("pointerdown", () => {
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.time.delayedCall(1000, () => {
                this.scene.start("MenuScene");
            });
        });
        
        // Animate text
        this.tweens.add({
            targets: gameOver,
            scale: 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }
}