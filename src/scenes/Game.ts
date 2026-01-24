import Phaser from 'phaser';
import { BottleSprite } from '../game/ui/Bottle';
import { setupGame } from '../game/logic/setup';
import { pourLiquid } from '../game/logic/pour';
import { checkWin } from '../game/logic/win';
import type { GameState, SetupOptions } from '../game/logic/types';

export class GameScene extends Phaser.Scene {
    private bottles: BottleSprite[] = [];
    private selectedBottle: BottleSprite | null = null;
    private gameState!: GameState;
    private moveCountText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private currentLevel: number = 1;

	private globalHeight: number = 0;
	private globalWidth: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.startNewGame();

		this.globalHeight = this.cameras.main.height;
		this.globalWidth = this.cameras.main.width;

        this.add.text(this.globalWidth / 2, this.globalHeight * 0.1, "Liquid Sort", {
            fontSize: "32px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.levelText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.15, `Level ${this.currentLevel}`, {
            fontSize: "20px",
            color: "#aaaaaa"
        }).setOrigin(0.5);

        this.moveCountText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.9, `Moves: 0`, {
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);

        const restartBtn = this.add.text(this.globalWidth / 2, this.globalHeight * 0.95, "🔄 Restart", {
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#333333",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        restartBtn.on('pointerdown', () => this.startNewGame());
        restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#555555' }));
        restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#333333' }));
    }

    private startNewGame(): void {
        this.bottles.forEach(bottle => bottle.destroy());
        this.bottles = [];
        this.selectedBottle = null;

        const options: SetupOptions = {
            numColors: Math.min(4 + Math.floor(this.currentLevel / 3), 10),
            slotsPerBottle: Math.min(4 + Math.floor(this.currentLevel / 5), 10),
            emptyBottles: 2
        };

        this.gameState = setupGame(options);

        this.createBottleSprites();

        if (this.moveCountText) {
            this.moveCountText.setText(`Moves: ${this.gameState.moveCount}`);
        }
        if (this.levelText) {
            this.levelText.setText(`Level ${this.currentLevel}`);
        }
    }

    private createBottleSprites(): void {
        const numBottles = this.gameState.bottles.length;
        const bottlesPerRow = Math.min(numBottles, 5);
        const rows = Math.ceil(numBottles / bottlesPerRow);
        
        const startY = rows > 1 ? 300 : 380;
		const startX = 100;
        const spacingX = 100;
        const spacingY = 200;

        this.gameState.bottles.forEach((bottleData, index) => {
            const row = Math.floor(index / bottlesPerRow);
            const col = index % bottlesPerRow;
            
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const bottle = new BottleSprite(this, x, y, bottleData);
            
            bottle.on('pointerdown', () => this.onBottleClick(bottle));
            
            this.bottles.push(bottle);
        });
    }

    private onBottleClick(bottle: BottleSprite): void {
        if (this.selectedBottle === null) {
            if (!bottle.isEmpty()) {
                this.selectedBottle = bottle;
                bottle.setSelected(true);
            }

        } else if (this.selectedBottle === bottle) {
            bottle.setSelected(false);
            this.selectedBottle = null;

        } else {
            const result = pourLiquid(this.selectedBottle, bottle);
            
            if (result.success) {
                this.gameState.moveCount++;
                this.moveCountText.setText(`Moves: ${this.gameState.moveCount}`);
                
                this.selectedBottle.setSelected(false);
                this.selectedBottle = null;
                
                if (checkWin(this.bottles)) {
                    this.showWinMessage();
                }
            } else {
                // pour failed
                this.selectedBottle.setSelected(false);
                
                if (!bottle.isEmpty()) {
                    this.selectedBottle = bottle;
                    bottle.setSelected(true);
                } else {
                    this.selectedBottle = null;
                }
            }
        }
    }

    private showWinMessage(): void {
        const overlay = this.add.rectangle(0, 0, this.globalWidth * 2, this.globalHeight * 2, 0x000000, 0.8);

		this.bottles.forEach(bottle => bottle.disableInteractive());
        
        const winText = this.add.text(this.globalWidth / 2, 250, "🎉 You Win! 🎉", {
            fontSize: "48px",
            color: "#FFD700",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const movesText = this.add.text(this.globalWidth / 2, 310, `Completed in ${this.gameState.moveCount} moves`, {
            fontSize: "24px",
            color: "#ffffff"
        }).setOrigin(0.5);

        const nextBtn = this.add.text(this.globalWidth / 2, 380, "Next Level →", {
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#4CAF50",
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        nextBtn.on('pointerdown', () => {
            overlay.destroy();
            winText.destroy();
            movesText.destroy();
            nextBtn.destroy();
            this.currentLevel++;
            this.startNewGame();
        });

        nextBtn.on('pointerover', () => nextBtn.setStyle({ backgroundColor: '#66BB6A' }));
        nextBtn.on('pointerout', () => nextBtn.setStyle({ backgroundColor: '#4CAF50' }));
    }
}