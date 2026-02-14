import Phaser from 'phaser';
import { BottleSprite } from '../game/ui/Bottle';
import { PourAnimation } from '../game/ui/Pour';
import { setupGame } from '../game/logic/setup';
import { getPourInfo } from '../game/logic/pour';
import { checkWin, isGameStuck } from '../game/logic/win';
import type { GameState, SetupOptions } from '../game/logic/types';

interface SaveData {
    currentLevel: number;
    gameState: GameState;
    extraBottlesUsed: number;
}

const SAVE_KEY = 'color-sort-save';

export class GameScene extends Phaser.Scene {
    private bottles: BottleSprite[] = [];
    private selectedBottle: BottleSprite | null = null;
    private gameState!: GameState;
    private moveCountText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private currentLevel: number = 1;
    private pourAnimation!: PourAnimation;
    private extraBottlesUsed: number = 0;
    private addBottleBtn!: Phaser.GameObjects.Text;
    private specialText!: Phaser.GameObjects.Text;
    private resetBtn!: Phaser.GameObjects.Text;

	private globalHeight: number = 0;
	private globalWidth: number = 0;

    constructor() {
        super({ key: 'GameScene' });

		this.globalHeight = window.innerHeight; // this.cameras.main.height;
		this.globalWidth = window.innerWidth; 	// this.cameras.main.width;
    }

    create() {
        this.pourAnimation = new PourAnimation(this);

        if (!this.loadGame()) {
            this.startNewGame();
        }

        /* UI Elements */
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

        this.addBottleBtn = this.add.text(this.globalWidth / 2, this.globalHeight * 0.85, "+ Glass (2)", {
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#2a6e2a",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.addBottleBtn.on('pointerdown', () => this.addExtraBottle());
        this.addBottleBtn.on('pointerover', () => {
            if (this.extraBottlesUsed < 2) this.addBottleBtn.setStyle({ backgroundColor: '#3a8e3a' });
        });
        this.addBottleBtn.on('pointerout', () => {
            if (this.extraBottlesUsed < 2) this.addBottleBtn.setStyle({ backgroundColor: '#2a6e2a' });
        });

        this.specialText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.19, '', {
            fontSize: '16px',
            color: '#ff44ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.resetBtn = this.add.text(this.globalWidth / 2, this.globalHeight * 0.80, '⚠ Reset Level', {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#aa3333',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.resetBtn.on('pointerdown', () => {
            this.resetBtn.setVisible(false);
            this.startNewGame();
        });
        this.resetBtn.on('pointerover', () => this.resetBtn.setStyle({ backgroundColor: '#cc4444' }));
        this.resetBtn.on('pointerout', () => this.resetBtn.setStyle({ backgroundColor: '#aa3333' }));

        this.updateUI();
    }

    private updateUI(): void {
        if (this.moveCountText) {
            this.moveCountText.setText(`Moves: ${this.gameState.moveCount}`);
        }
        if (this.levelText) {
            this.levelText.setText(`Level ${this.currentLevel}`);
        }
        if (this.specialText) {
            this.specialText.setText(this.gameState.isSpecial ? '\u2726 Mystery Level \u2726' : '');
        }
        this.updateAddBottleBtn();
    }

    private startNewGame(): void {
        this.bottles.forEach(bottle => bottle.destroy());
        this.bottles = [];
        this.selectedBottle = null;
        this.extraBottlesUsed = 0;
        if (this.resetBtn) this.resetBtn.setVisible(false);
        this.updateAddBottleBtn();

        const options: SetupOptions = {
            numColors: Math.min(4 + Math.floor(this.currentLevel / 3), 10),
            slotsPerBottle: Math.min(4 + Math.floor(this.currentLevel / 5), 10),
            emptyBottles: 2
        };

        this.gameState = setupGame(options);

        const isSpecial = this.currentLevel % 5 === 0;
        this.gameState.isSpecial = isSpecial;
        if (isSpecial) {
            this.gameState.bottles.forEach(b => b.hiddenColors = true);
        }

        this.createBottleSprites();

        this.updateUI();

        this.saveGame();
    }

    private createBottleSprites(): void {
        const numBottles = this.gameState.bottles.length;
        const bottlesPerRow = Math.min(numBottles, 4);
        const rows = Math.ceil(numBottles / bottlesPerRow);
        
        const startY = 500;
        const spacingX = 100;
        const spacingY = 250;

        this.gameState.bottles.forEach((bottleData, index) => {
            const row = Math.floor(index / bottlesPerRow);
            const col = index % bottlesPerRow;

            const bottlesInThisRow = (row < rows - 1)
                ? bottlesPerRow
                : numBottles - row * bottlesPerRow;

            const rowWidth = (bottlesInThisRow - 1) * spacingX;
            const startX = (this.globalWidth - rowWidth) / 2;

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
            const pourInfo = getPourInfo(this.selectedBottle, bottle);
            
            if (pourInfo.canPour && pourInfo.color) {
                this.selectedBottle.setSelected(false);
                
                const sourceBottle = this.selectedBottle;
                this.selectedBottle = null;
                
                this.pourAnimation.playPourAnimation({
                    source: sourceBottle,
                    target: bottle,
                    color: pourInfo.color,
                    segmentsToPour: pourInfo.segmentsToPour,
                    onComplete: () => {
                        this.gameState.moveCount++;
                        this.moveCountText.setText(`Moves: ${this.gameState.moveCount}`);
                        
                        this.bottles.forEach(b => b.drawLiquids());

                        this.saveGame();

                        this.bottles.forEach(b => b.setInteractive({ useHandCursor: true }));
                        
                        if (checkWin(this.bottles)) {
                            this.showWinMessage();
                        } else if (isGameStuck(this.bottles)) {
                            this.showStuckMessage();
                        }
                    }
                });
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

    private addExtraBottle(): void {
        if (this.extraBottlesUsed >= 2) return;
        if (this.pourAnimation.isPlaying()) return;

        if (this.selectedBottle) {
            this.selectedBottle.setSelected(false);
            this.selectedBottle = null;
        }

        this.extraBottlesUsed++;

        const newBottleData = { colors: [], slots: 1, isGlass: true };
        this.gameState.bottles.push(newBottleData);

        // Recreate all bottle sprites with updated layout
        this.bottles.forEach(bottle => bottle.destroy());
        this.bottles = [];
        this.createBottleSprites();

        this.updateAddBottleBtn();
        this.saveGame();
    }

    private updateAddBottleBtn(): void {
        if (!this.addBottleBtn) return;
        const remaining = 2 - this.extraBottlesUsed;
        if (remaining <= 0) {
            this.addBottleBtn.setText("+ Glass (0)");
            this.addBottleBtn.setStyle({ backgroundColor: '#555555', color: '#888888' });
            this.addBottleBtn.disableInteractive();
        } else {
            this.addBottleBtn.setText(`+ Glass (${remaining})`);
            this.addBottleBtn.setStyle({ backgroundColor: '#2a6e2a', color: '#ffffff' });
            this.addBottleBtn.setInteractive({ useHandCursor: true });
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

    private showStuckMessage(): void {
        const overlay = this.add.rectangle(0, 0, this.globalWidth * 2, this.globalHeight * 2, 0x000000, 0.8);

        this.bottles.forEach(bottle => bottle.disableInteractive());

        const stuckText = this.add.text(this.globalWidth / 2, 250, 'No Moves Left!', {
            fontSize: '42px',
            color: '#FF6B6B',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hintText = this.add.text(this.globalWidth / 2, 310, 'You can reset the level or keep looking.', {
            fontSize: '18px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const resetBtn = this.add.text(this.globalWidth / 2, 380, '🔄 Reset Level', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#aa3333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const closeBtn = this.add.text(this.globalWidth / 2, 440, 'Close', {
            fontSize: '20px',
            color: '#cccccc',
            backgroundColor: '#444444',
            padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const destroyOverlay = () => {
            overlay.destroy();
            stuckText.destroy();
            hintText.destroy();
            resetBtn.destroy();
            closeBtn.destroy();
        };

        resetBtn.on('pointerdown', () => {
            destroyOverlay();
            this.startNewGame();
        });
        resetBtn.on('pointerover', () => resetBtn.setStyle({ backgroundColor: '#cc4444' }));
        resetBtn.on('pointerout', () => resetBtn.setStyle({ backgroundColor: '#aa3333' }));

        closeBtn.on('pointerdown', () => {
            destroyOverlay();
            // Re-enable bottles and show persistent reset button
            this.bottles.forEach(b => b.setInteractive({ useHandCursor: true }));
            this.resetBtn.setVisible(true);
        });
        closeBtn.on('pointerover', () => closeBtn.setStyle({ backgroundColor: '#666666' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ backgroundColor: '#444444' }));
    }

    private saveGame(): void {
        try {
            const data: SaveData = {
                currentLevel: this.currentLevel,
                gameState: this.gameState,
                extraBottlesUsed: this.extraBottlesUsed,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch {
            // localStorage may be unavailable; silently ignore
        }
    }

    private loadGame(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;

            const data: SaveData = JSON.parse(raw);
            if (!data.gameState || !Array.isArray(data.gameState.bottles)) return false;

            this.currentLevel = data.currentLevel ?? 1;
            this.extraBottlesUsed = data.extraBottlesUsed ?? 0;
            this.gameState = data.gameState;

            // Rebuild sprites from restored state
            this.bottles.forEach(b => b.destroy());
            this.bottles = [];
            this.selectedBottle = null;
            this.createBottleSprites();
            this.updateAddBottleBtn();

            return true;
        } catch {
            return false;
        }
    }
}