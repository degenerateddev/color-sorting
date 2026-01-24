import Phaser from 'phaser';
import type { Bottle as BottleData, Color } from '../logic/types';

export class BottleSprite extends Phaser.GameObjects.Container {
    private bottleGraphics: Phaser.GameObjects.Graphics;
    private liquidGraphics: Phaser.GameObjects.Graphics;
    private bottleData: BottleData;
    private selected: boolean = false;
    
    private readonly BOTTLE_WIDTH = 60;
    private readonly BOTTLE_HEIGHT = 160;
    private readonly NECK_WIDTH = 30;
    private readonly NECK_HEIGHT = 15;
    private readonly LIQUID_PADDING = 6;
    private readonly SLOT_HEIGHT: number;

    constructor(scene: Phaser.Scene, x: number, y: number, bottleData: BottleData) {
        super(scene, x, y);
        
        this.bottleData = bottleData;
        this.SLOT_HEIGHT = (this.BOTTLE_HEIGHT - this.NECK_HEIGHT - this.LIQUID_PADDING * 2) / bottleData.slots;
        
        this.liquidGraphics = scene.add.graphics();
        this.bottleGraphics = scene.add.graphics();
        
        this.add(this.liquidGraphics);
        this.add(this.bottleGraphics);
        
        this.drawBottle();
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

    drawLiquids(): void {
        this.liquidGraphics.clear();
        
        const bodyX = -this.BOTTLE_WIDTH / 2 + this.LIQUID_PADDING;
        const bodyBottom = this.BOTTLE_HEIGHT / 2 - this.LIQUID_PADDING;
        const liquidWidth = this.BOTTLE_WIDTH - this.LIQUID_PADDING * 2;
        
        this.bottleData.colors.forEach((color, index) => {
            const slotY = bodyBottom - (index + 1) * this.SLOT_HEIGHT;
            
            const colorNum = Phaser.Display.Color.HexStringToColor(color.code).color;
            
            this.liquidGraphics.fillStyle(colorNum, 1);
            
            if (index === 0) {
                this.liquidGraphics.fillRoundedRect(bodyX, slotY, liquidWidth, this.SLOT_HEIGHT, { tl: 0, tr: 0, bl: 6, br: 6 });
            } else {
                this.liquidGraphics.fillRect(bodyX, slotY, liquidWidth, this.SLOT_HEIGHT);
            }
			
            this.liquidGraphics.fillStyle(0x000000, 0.1);
            this.liquidGraphics.fillRect(bodyX + liquidWidth - 10, slotY, 10, this.SLOT_HEIGHT);
        });
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        if (selected) {
            this.scene.tweens.add({
                targets: this,
                y: this.y - 20,
                duration: 150,
                ease: 'Back.easeOut'
            });
        } else {
            this.scene.tweens.add({
                targets: this,
                y: this.y + 20,
                duration: 150,
                ease: 'Back.easeIn'
            });
        }
    }

    isSelected(): boolean {
        return this.selected;
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
