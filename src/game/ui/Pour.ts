import Phaser from 'phaser';
import type { BottleSprite } from './Bottle';
import type { Color } from '../logic/types';

export interface PourAnimationConfig {
    source: BottleSprite;
    target: BottleSprite;
    color: Color;
    segmentsToPour: number;
    onComplete?: () => void;
}

export class PourAnimation {
    private scene: Phaser.Scene;
    private streamGraphics: Phaser.GameObjects.Graphics;
    private isAnimating: boolean = false;

    private readonly TILT_ANGLE = 45;
    private readonly TILT_DURATION = 200;
    private readonly POUR_DURATION = 150;
    private readonly RETURN_DURATION = 200;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.streamGraphics = scene.add.graphics();
        this.streamGraphics.setDepth(100);
    }

    isPlaying(): boolean {
        return this.isAnimating;
    }

    async playPourAnimation(config: PourAnimationConfig): Promise<void> {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const { source, target, color, segmentsToPour, onComplete } = config;

        const originalX = source.x;
        const originalY = source.y;

        // calculate direction according to position
        const pourLeft = source.x > target.x;
        const tiltAngle = pourLeft ? -this.TILT_ANGLE : this.TILT_ANGLE;

        const offsetX = pourLeft ? -30 : 30;
        const offsetY = -40;

        source.disableInteractive();
        target.disableInteractive();

        try {
            await this.tiltBottle(source, tiltAngle, offsetX, offsetY);

            for (let i = 0; i < segmentsToPour; i++) {
                source.removeTopColor();
                
                await this.animateStream(source, target, color, pourLeft);
                
                target.addColor(color);
            }

            await this.returnBottle(source, originalX, originalY);

        } finally {
            source.setInteractive({ useHandCursor: true });
            target.setInteractive({ useHandCursor: true });
            
            this.isAnimating = false;
            this.streamGraphics.clear();
            
            if (onComplete) {
                onComplete();
            }
        }
    }

    private tiltBottle(bottle: BottleSprite, angle: number, offsetX: number, offsetY: number): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: bottle,
                angle: angle,
                x: bottle.x + offsetX,
                y: bottle.y + offsetY,
                duration: this.TILT_DURATION,
                ease: 'Quad.easeOut',
                onComplete: () => resolve()
            });
        });
    }

    private returnBottle(bottle: BottleSprite, originalX: number, originalY: number): Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: bottle,
                angle: 0,
                x: originalX,
                y: originalY,
                duration: this.RETURN_DURATION,
                ease: 'Quad.easeInOut',
                onComplete: () => resolve()
            });
        });
    }

    private animateStream(source: BottleSprite, target: BottleSprite, color: Color, pourLeft: boolean): Promise<void> {
        return new Promise((resolve) => {
            const colorNum = Phaser.Display.Color.HexStringToColor(color.code).color;
            
            const neckOffsetX = pourLeft ? -25 : 25;
            const neckOffsetY = -60;
            const startX = source.x + neckOffsetX;
            const startY = source.y + neckOffsetY;
            
            const endX = target.x;
            const endY = target.y - 70;
            
            const controlX = (startX + endX) / 2;
            const controlY = Math.min(startY, endY) - 30;

            let progress = 0;
            const streamWidth = 8;

            this.scene.tweens.addCounter({
                from: 0,
                to: 1,
                duration: this.POUR_DURATION,
                ease: 'Linear',
                onUpdate: (tween) => {
                    progress = tween.getValue() ?? 0;
                    this.drawStream(startX, startY, endX, endY, controlX, controlY, progress, colorNum, streamWidth);
                },
                onComplete: () => {
                    this.playSplashEffect(endX, endY, colorNum);
                    this.streamGraphics.clear();
                    resolve();
                }
            });
        });
    }

    private drawStream(
        startX: number, startY: number,
        endX: number, endY: number,
        controlX: number, controlY: number,
        progress: number,
        color: number,
        width: number
    ): void {
        this.streamGraphics.clear();
        
        if (progress <= 0) return;

        this.streamGraphics.lineStyle(width, color, 1);
        this.streamGraphics.beginPath();
        
        // draw bezier curve
        const steps = 20;
        const drawSteps = Math.floor(steps * progress);
        
        for (let i = 0; i <= drawSteps; i++) {
            const t = i / steps;
            
            // quadratic bezier formula
            const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
            const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
            
            if (i === 0) {
                this.streamGraphics.moveTo(x, y);
            } else {
                this.streamGraphics.lineTo(x, y);
            }
        }
        
        this.streamGraphics.strokePath();

        // drip effect
        const endT = progress;
        const dripX = Math.pow(1 - endT, 2) * startX + 2 * (1 - endT) * endT * controlX + Math.pow(endT, 2) * endX;
        const dripY = Math.pow(1 - endT, 2) * startY + 2 * (1 - endT) * endT * controlY + Math.pow(endT, 2) * endY;
        
        this.streamGraphics.fillStyle(color, 1);
        this.streamGraphics.fillCircle(dripX, dripY, width / 2 + 2);
    }

    private playSplashEffect(x: number, y: number, color: number): void {
        // splash particles
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(x, y, 3, color);
            const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); // Spread upward
            const speed = 30 + Math.random() * 30;
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                y: y - Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.5,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    destroy(): void {
        this.streamGraphics.destroy();
    }
}
