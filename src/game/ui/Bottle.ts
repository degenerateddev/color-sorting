import Phaser from 'phaser';
import type { Bottle as BottleData, Color } from '../logic/types';

export class BottleSprite extends Phaser.GameObjects.Container {
    private bottleGraphics: Phaser.GameObjects.Graphics;
    private liquidGraphics: Phaser.GameObjects.Graphics;
    private questionMarks: Phaser.GameObjects.Text[] = [];
    private bottleData: BottleData;
    private selected: boolean = false;
    private originalY: number = 0;
    private readonly isGlass: boolean;
    private hiddenColors: boolean = false;
    
    private readonly BOTTLE_WIDTH: number;
    private readonly BOTTLE_HEIGHT: number;
    private readonly NECK_WIDTH: number;
    private readonly NECK_HEIGHT: number;
    private readonly LIQUID_PADDING = 6;
    private readonly SLOT_HEIGHT: number;

    private static readonly GLASS_RIM_WIDTH = 56;
    private static readonly GLASS_BOWL_HEIGHT = 40;
    private static readonly GLASS_BOWL_BOTTOM_WIDTH = 24;
    private static readonly GLASS_STEM_WIDTH = 4;
    private static readonly GLASS_STEM_HEIGHT = 28;
    private static readonly GLASS_BASE_WIDTH = 44;
    private static readonly GLASS_BASE_HEIGHT = 6;
    private static readonly GLASS_TOTAL_HEIGHT = 80;

    private static readonly REF_SLOTS = 4;
    private static readonly REF_WIDTH = 60;
    private static readonly REF_HEIGHT = 160;
    private static readonly REF_NECK_WIDTH = 30;
    private static readonly REF_NECK_HEIGHT = 15;
    private static readonly MIN_SCALE = 0.45;

    constructor(scene: Phaser.Scene, x: number, y: number, bottleData: BottleData) {
        super(scene, x, y);
        
        this.bottleData = bottleData;
        this.originalY = y;
        this.isGlass = !!bottleData.isGlass;
        this.hiddenColors = !!bottleData.hiddenColors;

        if (this.isGlass) {
            this.BOTTLE_WIDTH = BottleSprite.GLASS_RIM_WIDTH;
            this.BOTTLE_HEIGHT = BottleSprite.GLASS_TOTAL_HEIGHT;
            this.NECK_WIDTH = 0;
            this.NECK_HEIGHT = 0;
            this.SLOT_HEIGHT = BottleSprite.GLASS_BOWL_HEIGHT - this.LIQUID_PADDING * 2;
        } else {
            const scale = Math.max(
                BottleSprite.MIN_SCALE,
                bottleData.slots / BottleSprite.REF_SLOTS
            );
            this.BOTTLE_WIDTH = Math.round(BottleSprite.REF_WIDTH * scale);
            this.BOTTLE_HEIGHT = Math.round(BottleSprite.REF_HEIGHT * scale);
            this.NECK_WIDTH = Math.round(BottleSprite.REF_NECK_WIDTH * scale);
            this.NECK_HEIGHT = Math.round(BottleSprite.REF_NECK_HEIGHT * scale);
            this.SLOT_HEIGHT = (this.BOTTLE_HEIGHT - this.NECK_HEIGHT - this.LIQUID_PADDING * 2) / bottleData.slots;
        }
        
        this.liquidGraphics = scene.add.graphics();
        this.bottleGraphics = scene.add.graphics();
        
        this.add(this.liquidGraphics);
        this.add(this.bottleGraphics);
        
        if (this.isGlass) {
            this.drawGlass();
        } else {
            this.drawBottle();
        }
        this.drawLiquids();
        
        this.setSize(this.BOTTLE_WIDTH, this.BOTTLE_HEIGHT);
        this.setInteractive({ useHandCursor: true });
        
        scene.add.existing(this);
    }

    private drawBottle(): void {
        this.bottleGraphics.clear();
        
        this.bottleGraphics.lineStyle(2, 0xcccccc, 1);
        
        const bodyX = -this.BOTTLE_WIDTH / 2;
        const bodyY = -this.BOTTLE_HEIGHT / 2 + this.NECK_HEIGHT;
        const bodyWidth = this.BOTTLE_WIDTH;
        const bodyHeight = this.BOTTLE_HEIGHT - this.NECK_HEIGHT;
        
        this.bottleGraphics.strokeRoundedRect(bodyX, bodyY, bodyWidth, bodyHeight, 7);
        
        const neckX = -this.NECK_WIDTH / 2;
        const neckY = -this.BOTTLE_HEIGHT / 1.78;
        
        this.bottleGraphics.strokeRoundedRect(neckX, neckY, this.NECK_WIDTH, this.NECK_HEIGHT + 10, { tl: 6, tr: 6, bl: 0, br: 0 });
        
        this.bottleGraphics.lineStyle(2, 0xffffff, .25);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(bodyX + 8, bodyY + 10);
        this.bottleGraphics.lineTo(bodyX + 8, bodyY + bodyHeight - 15);
        this.bottleGraphics.strokePath();
    }

    private drawGlass(): void {
        this.bottleGraphics.clear();

        const rimW = BottleSprite.GLASS_RIM_WIDTH;
        const bowlH = BottleSprite.GLASS_BOWL_HEIGHT;
        const botW = BottleSprite.GLASS_BOWL_BOTTOM_WIDTH;
        const stemW = BottleSprite.GLASS_STEM_WIDTH;
        const stemH = BottleSprite.GLASS_STEM_HEIGHT;
        const baseW = BottleSprite.GLASS_BASE_WIDTH;
        const baseH = BottleSprite.GLASS_BASE_HEIGHT;

        const topY = -this.BOTTLE_HEIGHT / 2;
        const bowlBottomY = topY + bowlH;
        const stemBottomY = bowlBottomY + stemH;

        // --- Glass-like translucent fill for the bowl ---
        this.bottleGraphics.fillStyle(0xffffff, 0.06);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(-rimW / 2, topY);
        this.bottleGraphics.lineTo(-botW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(botW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(rimW / 2, topY);
        this.bottleGraphics.closePath();
        this.bottleGraphics.fillPath();

        // --- Bowl outline (trapezoid) ---
        this.bottleGraphics.lineStyle(2, 0xcccccc, 0.9);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(-rimW / 2, topY);
        this.bottleGraphics.lineTo(-botW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(botW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(rimW / 2, topY);
        this.bottleGraphics.strokePath();

        // Rim highlight
        this.bottleGraphics.lineStyle(2, 0xffffff, 0.45);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(-rimW / 2 + 1, topY);
        this.bottleGraphics.lineTo(rimW / 2 - 1, topY);
        this.bottleGraphics.strokePath();

        // --- Stem ---
        this.bottleGraphics.lineStyle(2, 0xcccccc, 0.9);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(-stemW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(-stemW / 2, stemBottomY);
        this.bottleGraphics.strokePath();
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(stemW / 2, bowlBottomY);
        this.bottleGraphics.lineTo(stemW / 2, stemBottomY);
        this.bottleGraphics.strokePath();

        // Stem shine
        this.bottleGraphics.lineStyle(1, 0xffffff, 0.2);
        this.bottleGraphics.beginPath();
        this.bottleGraphics.moveTo(0, bowlBottomY + 2);
        this.bottleGraphics.lineTo(0, stemBottomY - 2);
        this.bottleGraphics.strokePath();

        // --- Base (ellipse-like rounded rect) ---
        this.bottleGraphics.lineStyle(2, 0xcccccc, 0.9);
        this.bottleGraphics.strokeRoundedRect(
            -baseW / 2, stemBottomY,
            baseW, baseH,
            baseH / 2
        );

        // Base fill (subtle)
        this.bottleGraphics.fillStyle(0xffffff, 0.08);
        this.bottleGraphics.fillRoundedRect(
            -baseW / 2, stemBottomY,
            baseW, baseH,
            baseH / 2
        );

        // --- Glass shine line on left side of bowl ---
        this.bottleGraphics.lineStyle(1.5, 0xffffff, 0.18);
        this.bottleGraphics.beginPath();
        // Inset shine along the left wall of the trapezoid
        const shineTopX = -rimW / 2 + 6;
        const shineBotX = -botW / 2 + 4;
        this.bottleGraphics.moveTo(shineTopX, topY + 6);
        this.bottleGraphics.lineTo(shineBotX, bowlBottomY - 4);
        this.bottleGraphics.strokePath();
    }

    drawLiquids(): void {
        this.liquidGraphics.clear();
        this.questionMarks.forEach(t => t.destroy());
        this.questionMarks = [];

        if (this.isGlass) {
            this.drawGlassLiquids();
            return;
        }
        
        const bodyX = -this.BOTTLE_WIDTH / 2 + this.LIQUID_PADDING;
        const bodyBottom = this.BOTTLE_HEIGHT / 2 - this.LIQUID_PADDING;
        const liquidWidth = this.BOTTLE_WIDTH - this.LIQUID_PADDING * 2;

        const revealedFromTop = this.hiddenColors ? this.getTopSegmentCount() : this.bottleData.colors.length;
        const firstHiddenIndex = this.bottleData.colors.length - revealedFromTop;
        
        this.bottleData.colors.forEach((color, index) => {
            const slotY = bodyBottom - (index + 1) * this.SLOT_HEIGHT;
            const isHidden = this.hiddenColors && index < firstHiddenIndex;
            
            const colorNum = isHidden
                ? 0x111111
                : Phaser.Display.Color.HexStringToColor(color.code).color;
            
            this.liquidGraphics.fillStyle(colorNum, 1);
            
            if (index === 0) {
                this.liquidGraphics.fillRoundedRect(bodyX, slotY, liquidWidth, this.SLOT_HEIGHT, { tl: 0, tr: 0, bl: 6, br: 6 });
            } else {
                this.liquidGraphics.fillRect(bodyX, slotY, liquidWidth, this.SLOT_HEIGHT);
            }

            if (isHidden) {
                const qm = this.scene.add.text(
                    0,
                    slotY + this.SLOT_HEIGHT / 2,
                    '?',
                    {
                        fontSize: `${Math.min(this.SLOT_HEIGHT - 2, 20)}px`,
                        color: '#666666',
                        fontStyle: 'bold',
                    }
                ).setOrigin(0.5);
                this.add(qm);
                this.questionMarks.push(qm);
            } else {
                this.liquidGraphics.fillStyle(0x000000, 0.1);
                this.liquidGraphics.fillRect(bodyX + liquidWidth - 10, slotY, 10, this.SLOT_HEIGHT);
            }
        });
    }

    private drawGlassLiquids(): void {
        if (this.bottleData.colors.length === 0) return;

        const rimW = BottleSprite.GLASS_RIM_WIDTH;
        const bowlH = BottleSprite.GLASS_BOWL_HEIGHT;
        const botW = BottleSprite.GLASS_BOWL_BOTTOM_WIDTH;
        const topY = -this.BOTTLE_HEIGHT / 2;
        const bowlBottomY = topY + bowlH;
        const pad = this.LIQUID_PADDING;

        const liquidH = bowlH * 0.50;
        const liquidTopY = bowlBottomY - liquidH;

        const widthAtY = (y: number) => {
            const t = (y - topY) / (bowlBottomY - topY);
            return rimW + (botW - rimW) * t;
        };

        const topW = widthAtY(liquidTopY) - pad * 2;
        const botLiqW = botW - pad * 1.2;

        const color = this.bottleData.colors[0];
        const colorNum = Phaser.Display.Color.HexStringToColor(color.code).color;

        // Draw liquid as a trapezoid matching the glass curvature
        this.liquidGraphics.fillStyle(colorNum, 0.9);
        this.liquidGraphics.beginPath();
        this.liquidGraphics.moveTo(-topW / 2, liquidTopY);
        this.liquidGraphics.lineTo(-botLiqW / 2, bowlBottomY - pad * 0.5);
        this.liquidGraphics.lineTo(botLiqW / 2, bowlBottomY - pad * 0.5);
        this.liquidGraphics.lineTo(topW / 2, liquidTopY);
        this.liquidGraphics.closePath();
        this.liquidGraphics.fillPath();

        // Highlight on the liquid surface
        this.liquidGraphics.fillStyle(0xffffff, 0.15);
        this.liquidGraphics.fillRect(-topW / 2 + 3, liquidTopY, topW - 6, 2);

        // Shadow on right side of liquid
        this.liquidGraphics.fillStyle(0x000000, 0.1);
        this.liquidGraphics.beginPath();
        this.liquidGraphics.moveTo(topW / 2 - 6, liquidTopY);
        this.liquidGraphics.lineTo(botLiqW / 2 - 3, bowlBottomY - pad * 0.5);
        this.liquidGraphics.lineTo(botLiqW / 2, bowlBottomY - pad * 0.5);
        this.liquidGraphics.lineTo(topW / 2, liquidTopY);
        this.liquidGraphics.closePath();
        this.liquidGraphics.fillPath();
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        this.scene.tweens.killTweensOf(this);
        
        if (selected) {
            this.scene.tweens.add({
                targets: this,
                y: this.originalY - 20,
                duration: 150,
                ease: 'Back.easeOut'
            });
        } else {
            this.scene.tweens.add({
                targets: this,
                y: this.originalY,
                duration: 150,
                ease: 'Back.easeIn'
            });
        }
    }

    isSelected(): boolean {
        return this.selected;
    }

    getOriginalY(): number {
        return this.originalY;
    }

    getBottleData(): BottleData {
        return this.bottleData;
    }

    getTopColor(): Color | null {
        if (this.bottleData.colors.length === 0) return null;
        return this.bottleData.colors[this.bottleData.colors.length - 1];
    }

    canReceive(color: Color): boolean {
        if (this.bottleData.colors.length >= this.bottleData.slots) return false;
        if (this.bottleData.colors.length === 0) return true;
        return this.getTopColor()?.code === color.code;
    }

    addColor(color: Color): void {
        if (this.canReceive(color)) {
            this.bottleData.colors.push(color);
            this.drawLiquids();
        }
    }

    removeTopColor(): Color | null {
        if (this.bottleData.colors.length === 0) return null;
        const color = this.bottleData.colors.pop()!;
        this.drawLiquids();
        return color;
    }

    isComplete(): boolean {
        if (this.bottleData.colors.length !== this.bottleData.slots) return false;
        const firstColor = this.bottleData.colors[0].code;
        return this.bottleData.colors.every(c => c.code === firstColor);
    }

    isEmpty(): boolean {
        return this.bottleData.colors.length === 0;
    }

    isFull(): boolean {
        return this.bottleData.colors.length >= this.bottleData.slots;
    }

    // get consecutive same-colored segments from top
    getTopSegmentCount(): number {
        if (this.bottleData.colors.length === 0) return 0;
        
        const topColor = this.getTopColor()!.code;
        let count = 0;
        
        for (let i = this.bottleData.colors.length - 1; i >= 0; i--) {
            if (this.bottleData.colors[i].code === topColor) {
                count++;
            } else {
                break;
            }
        }
        
        return count;
    }
}
