import Phaser from 'phaser';
import { BottleSprite } from '../game/ui/Bottle';
import { PourAnimation } from '../game/ui/Pour';
import { setupGame, PRESET_COLORS } from '../game/logic/setup';
import { getPourInfo } from '../game/logic/pour';
import { checkWin, isGameStuck } from '../game/logic/win';
import type { GameState, SetupOptions } from '../game/logic/types';

interface SaveData {
    currentLevel: number;
    gameState: GameState;
    extraGlassesUsed: number;
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
    private extraGlassesUsed: number = 0;
    private newBottleLevelThreshold: number = 20;
    private newGlassLevelThreshold: number = 20;
    private addGlassBtn!: Phaser.GameObjects.Text;
    private specialText!: Phaser.GameObjects.Text;
    private resetBtn!: Phaser.GameObjects.Text;

	private globalHeight: number = 0;
	private globalWidth: number = 0;

    private glassSprites: BottleSprite[] = [];
    private scrollOffset: number = 0;
    private maxScrollOffset: number = 0;
    private bottleBasePositions: { x: number; y: number }[] = [];
    private bottleMaskShape!: Phaser.GameObjects.Graphics;
    private bottleAreaTopY: number = 0;
    private bottleAreaBotY: number = 0;
    private glassAreaTopY: number = 0;
    private pointerStartY: number = 0;
    private pointerStartScrollOffset: number = 0;
    private isScrollDrag: boolean = false;

    constructor() {
        super({ key: 'ColorSort' });
    }

    preload() {
        this.load.svg('restart-icon', 'ui/restart-square.svg', { width: 256, height: 256 });
        this.load.svg('add-icon', 'ui/add-square.svg', { width: 256, height: 256 });
    }

    create() {
        this.globalWidth = this.cameras.main.width;
        this.globalHeight = this.cameras.main.height;

        this.bottleAreaTopY = this.globalHeight * 0.15;
        this.bottleAreaBotY = this.globalHeight * 0.85;
        this.glassAreaTopY = this.globalHeight * 0.95;

        this.pourAnimation = new PourAnimation(this);

        if (!this.loadGame()) {
            this.startNewGame();
        }

        const fs = this.responsiveFontSizes();

        /* UI Elements */
        this.levelText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.06, `${this.currentLevel}`, {
            fontSize: `${fs.level}px`,
            color: "#FFFFFF",
            fontStyle: "bold",
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.moveCountText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.1, `Moves: 0`, {
            fontSize: `${fs.body}px`,
            color: "#ffffff",
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const iconSize = 64;
        const restartBtn = this.add.image(100, this.globalHeight * 0.075, 'restart-icon')
            .setDisplaySize(iconSize, iconSize)
            .setTint(0xffffff)
            .setInteractive({ useHandCursor: true });

        restartBtn.on('pointerdown', () => this.startNewGame());

        const addGlassBtn = this.add.image(this.globalWidth * 0.8, this.globalHeight * 0.075, 'add-icon')
            .setDisplaySize(iconSize, iconSize)
            .setTint(0xffffff)
            .setInteractive({ useHandCursor: true });
        
        addGlassBtn.on('pointerdown', () => this.addExtraGlass());

        this.specialText = this.add.text(this.globalWidth / 2, this.globalHeight * 0.115, '', {
            fontSize: `${fs.small}px`,
            color: '#ff44ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.resetBtn = this.add.text(this.globalWidth / 2, this.globalHeight * 0.78, '⚠ Reset Level', {
            fontSize: `${fs.body}px`,
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

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _go: any[], _dx: number, dy: number) => {
            this.scrollBottles(dy * 0.5);
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.pointerStartY = pointer.y;
            this.pointerStartScrollOffset = this.scrollOffset;
            this.isScrollDrag = pointer.y >= this.bottleAreaTopY && pointer.y <= this.bottleAreaBotY;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && this.isScrollDrag && this.maxScrollOffset > 0) {
                const dy = this.pointerStartY - pointer.y;
                this.setScrollOffset(this.pointerStartScrollOffset + dy);
            }
        });

        this.updateUI();
    }

    private updateUI(): void {
        if (this.moveCountText) {
            this.moveCountText.setText(`Moves: ${this.gameState.moveCount}`);
        }
        if (this.levelText) {
            this.levelText.setText(`${this.currentLevel}`);
        }
        if (this.specialText) {
            this.specialText.setText(this.gameState.isSpecial ? '\u2726 Mystery Level \u2726' : '');
        }
        this.updateAddGlassBtn();
    }

    private scrollBottles(delta: number): void {
        this.setScrollOffset(this.scrollOffset + delta);
    }

    private setScrollOffset(offset: number): void {
        if (this.maxScrollOffset <= 0) return;

        this.scrollOffset = Phaser.Math.Clamp(offset, 0, this.maxScrollOffset);

        this.bottles.forEach((bottle, i) => {
            const basePos = this.bottleBasePositions[i];
            const newY = basePos.y - this.scrollOffset;
            this.tweens.killTweensOf(bottle);
            bottle.setOriginalY(newY);
            bottle.y = bottle.isSelected() ? newY - 20 : newY;
        });
    }

    private getAllSprites(): BottleSprite[] {
        return [...this.bottles, ...this.glassSprites];
    }

    private isBottleVisible(bottle: BottleSprite): boolean {
        const halfH = (bottle.height * bottle.scaleY) / 2;
        return bottle.y + halfH > this.bottleAreaTopY && bottle.y - halfH < this.bottleAreaBotY;
    }

    private startNewGame(): void {
        this.bottles.forEach(bottle => bottle.destroy());
        this.bottles = [];
        this.glassSprites.forEach(glass => glass.destroy());
        this.glassSprites = [];
        this.selectedBottle = null;
        this.extraGlassesUsed = 0;
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.bottleBasePositions = [];
        
        if (this.resetBtn) this.resetBtn.setVisible(false);
        this.updateAddGlassBtn();

        const bonusEmptyBottles = Math.floor(this.currentLevel / this.newBottleLevelThreshold);
        const bonusGlasses = Math.floor(this.currentLevel / this.newGlassLevelThreshold);
        const baseColors = Math.min(4 + Math.floor(this.currentLevel / 6), 10);
        const numColors = Math.min(baseColors + bonusEmptyBottles + bonusGlasses, PRESET_COLORS.length);

        const options: SetupOptions = {
            numColors,
            slotsPerBottle: Math.min(3 + Math.floor(this.currentLevel / 10), 10),
            emptyBottles: 2 + bonusEmptyBottles
        };

        this.gameState = setupGame(options);

        const isSpecial = this.currentLevel % 5 === 0;
        this.gameState.isSpecial = isSpecial;
        if (isSpecial) {
            this.gameState.bottles.forEach(b => b.hiddenColors = true);
        }

        this.createBottleSprites();
        this.createGlassSprites();

        this.updateUI();

        this.saveGame();
    }

    private createBottleSprites(): void {
        const w = this.globalWidth;
        const h = this.globalHeight;
        const regularBottles = this.gameState.bottles.filter(b => !b.isGlass);
        const numBottles = regularBottles.length;
        if (numBottles === 0) return;

        // available bottle grid area
        const areaTopY = this.bottleAreaTopY;
        const areaH = this.bottleAreaBotY - areaTopY;
        const sidePadding = 0;
        const usableWidth = w - sidePadding * 2;

        const refBottleW = 60;
        const refBottleH = 160;

        const gapX = 28;
        const gapY = 45;

        const maxPerRow = 4;

        const bottlesPerRow = Math.min(numBottles, maxPerRow);
        const rows = Math.ceil(numBottles / bottlesPerRow);

        // --- Compute scale: horizontal + mobile constraints, allow vertical overflow ---
        const maxScaleX = bottlesPerRow > 1
            ? (usableWidth - (bottlesPerRow - 1) * gapX) / (bottlesPerRow * refBottleW)
            : usableWidth / refBottleW;

        const mobileScale = Math.min(1, w / 500, h / 700);

        const bottleScale = Math.max(0.5, Math.min(mobileScale, maxScaleX, 1));

        const scaledBottleH = refBottleH * bottleScale;

        const spacingX = bottlesPerRow > 1
            ? Math.min(
                (usableWidth) / (bottlesPerRow - 1),
                refBottleW * bottleScale + gapX
              )
            : 0;

        const spacingY = scaledBottleH + gapY * bottleScale;

        const totalGridH = (rows - 1) * spacingY;
        const visualGridH = totalGridH + scaledBottleH;

        // scroll bounds (account for full bottle height)
        this.maxScrollOffset = Math.max(0, visualGridH - areaH);
        this.scrollOffset = Math.min(this.scrollOffset, this.maxScrollOffset);

        // center vertically if it fits, otherwise offset so first row isnt clipped
        const startY = visualGridH <= areaH
            ? areaTopY + (areaH - totalGridH) / 2
            : areaTopY + scaledBottleH / 2;

        // bottle area mask
        const maskPad = scaledBottleH * 0.20;
        if (this.bottleMaskShape) this.bottleMaskShape.destroy();
        this.bottleMaskShape = this.make.graphics({}, false);
        this.bottleMaskShape.fillStyle(0xffffff);
        this.bottleMaskShape.fillRect(0, this.bottleAreaTopY - maskPad, w, areaH + maskPad * 2);
        const mask = this.bottleMaskShape.createGeometryMask();

        this.bottleBasePositions = [];

        regularBottles.forEach((bottleData, index) => {
            const row = Math.floor(index / bottlesPerRow);
            const col = index % bottlesPerRow;

            const bottlesInThisRow = (row < rows - 1)
                ? bottlesPerRow
                : numBottles - row * bottlesPerRow;

            const rowWidth = (bottlesInThisRow - 1) * spacingX;
            const startX = (w - rowWidth) / 2;

            const x = startX + col * spacingX;
            const baseY = startY + row * spacingY;
            const y = baseY - this.scrollOffset;

            this.bottleBasePositions.push({ x, y: baseY });

            const bottle = new BottleSprite(this, x, y, bottleData);
            bottle.setScale(bottleScale);
            bottle.setMask(mask);

            bottle.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                const dist = Math.abs(pointer.y - this.pointerStartY);
                if (dist < 10 && this.isBottleVisible(bottle)) {
                    this.onBottleClick(bottle);
                }
            });

            this.bottles.push(bottle);
        });
    }

    private createGlassSprites(): void {
        this.glassSprites.forEach(g => g.destroy());
        this.glassSprites = [];

        const glasses = this.gameState.bottles.filter(b => b.isGlass);
        if (glasses.length === 0) return;

        const w = this.globalWidth;
        const glassScale = Math.min(1, w / 500);
        const gapX = 20;
        const glassRefW = 56;
        const scaledGlassW = glassRefW * glassScale;
        const totalW = glasses.length * scaledGlassW + (glasses.length - 1) * gapX;
        const startX = (w - totalW) / 2 + scaledGlassW / 2;
        const y = this.glassAreaTopY;

        glasses.forEach((glassData, index) => {
            const x = startX + index * (scaledGlassW + gapX);
            const glass = new BottleSprite(this, x, y, glassData);
            glass.setScale(glassScale);

            glass.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                const dist = Math.abs(pointer.y - this.pointerStartY);
                if (dist < 10) {
                    this.onBottleClick(glass);
                }
            });

            this.glassSprites.push(glass);
        });
    }

    private onBottleClick(bottle: BottleSprite): void {
        if (this.pourAnimation.isPlaying()) return;

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
                        
                        this.getAllSprites().forEach(b => b.drawLiquids());

                        this.saveGame();

                        this.getAllSprites().forEach(b => b.setInteractive({ useHandCursor: true }));
                        
                        const allSprites = this.getAllSprites();
                        if (checkWin(allSprites)) {
                            this.showWinMessage();
                        } else if (isGameStuck(allSprites)) {
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

    private maxGlasses(): number {
        return 2 + Math.floor(this.currentLevel / this.newGlassLevelThreshold);
    }

    private addExtraGlass(): void {
        if (this.extraGlassesUsed >= this.maxGlasses()) return;
        if (this.pourAnimation.isPlaying()) return;

        if (this.selectedBottle) {
            this.selectedBottle.setSelected(false);
            this.selectedBottle = null;
        }

        this.extraGlassesUsed++;

        const newGlassData = { colors: [], slots: 1, isGlass: true };
        this.gameState.bottles.push(newGlassData);

        this.createGlassSprites();

        this.updateAddGlassBtn();
        this.saveGame();
    }

    private updateAddGlassBtn(): void {
        if (!this.addGlassBtn) return;
        const remaining = this.maxGlasses() - this.extraGlassesUsed;
        if (remaining <= 0) {
            this.addGlassBtn.setText("+ Glass (0)");
            this.addGlassBtn.setStyle({ backgroundColor: '#555555', color: '#888888' });
            this.addGlassBtn.disableInteractive();
        } else {
            this.addGlassBtn.setText(`+ Glass (${remaining})`);
            this.addGlassBtn.setStyle({ backgroundColor: '#2a6e2a', color: '#ffffff' });
            this.addGlassBtn.setInteractive({ useHandCursor: true });
        }
    }

    private showWinMessage(): void {
        const w = this.globalWidth;
        const h = this.globalHeight;
        const fs = this.responsiveFontSizes();
        const overlay = this.add.rectangle(0, 0, w * 2, h * 2, 0x000000, 0.8);

        this.getAllSprites().forEach(bottle => bottle.disableInteractive());

        const winText = this.add.text(w / 2, h * 0.32, "🎉 You Win! 🎉", {
            fontSize: `${fs.body + 8}px`,
            color: "#FFD700",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const movesText = this.add.text(w / 2, h * 0.40, `Completed in ${this.gameState.moveCount} moves`, {
            fontSize: `${fs.body}px`,
            color: "#ffffff"
        }).setOrigin(0.5);

        const nextBtn = this.add.text(w / 2, h * 0.48, "Next Level →", {
            fontSize: `${fs.body}px`,
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
        const w = this.globalWidth;
        const h = this.globalHeight;
        const fs = this.responsiveFontSizes();
        const overlay = this.add.rectangle(0, 0, w * 2, h * 2, 0x000000, 0.8);

        this.getAllSprites().forEach(bottle => bottle.disableInteractive());

        const stuckText = this.add.text(w / 2, h * 0.32, 'No Moves Left!', {
            fontSize: `${fs.body + 4}px`,
            color: '#FF6B6B',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hintText = this.add.text(w / 2, h * 0.40, 'You can reset the level or keep looking.', {
            fontSize: `${fs.body}px`,
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const resetBtn = this.add.text(w / 2, h * 0.48, '🔄 Reset Level', {
            fontSize: `${fs.body}px`,
            color: '#ffffff',
            backgroundColor: '#aa3333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const closeBtn = this.add.text(w / 2, h * 0.55, 'Close', {
            fontSize: `${fs.body}px`,
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
            this.bottles.forEach(b => b.setInteractive({ useHandCursor: true }));
            this.glassSprites.forEach(b => b.setInteractive({ useHandCursor: true }));
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
                extraGlassesUsed: this.extraGlassesUsed,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch {
            // localStorage may be unavailable
        }
    }

    public jumpToLevel(level: number): void {
        this.currentLevel = Math.max(1, Math.round(level));
        this.startNewGame();
        console.log(`Game reset to level ${this.currentLevel}`);
    }

    private loadGame(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;

            const data: SaveData = JSON.parse(raw);
            if (!data.gameState || !Array.isArray(data.gameState.bottles)) return false;

            this.currentLevel = data.currentLevel ?? 1;
            this.extraGlassesUsed = data.extraGlassesUsed ?? 0;
            this.gameState = data.gameState;

            this.bottles.forEach(b => b.destroy());
            this.bottles = [];
            this.glassSprites.forEach(g => g.destroy());
            this.glassSprites = [];
            this.selectedBottle = null;
            this.scrollOffset = 0;
            this.maxScrollOffset = 0;
            this.bottleBasePositions = [];
            this.createBottleSprites();
            this.createGlassSprites();
            this.updateAddGlassBtn();

            return true;
        } catch {
            return false;
        }
    }

    private responsiveFontSizes() {
        const w = this.globalWidth;
        const base = Math.min(w, 600);
        return {
            level: Math.round(Math.max(42, base * 0.055)),
            body:     Math.round(Math.max(14, base * 0.032)),
            small:    Math.round(Math.max(12, base * 0.028)),
        };
    }
}