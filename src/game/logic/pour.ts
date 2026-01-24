import type { BottleSprite } from '../ui/Bottle';
import type { PourResult } from './types';

export function pourLiquid(source: BottleSprite, target: BottleSprite): PourResult {
    // can't pour into self
    if (source === target) {
        return { success: false, colorsPoured: 0 };
    }

    // can't pour from empty bottle
    if (source.isEmpty()) {
        return { success: false, colorsPoured: 0 };
    }

    // can't pour into full bottle
    if (target.isFull()) {
        return { success: false, colorsPoured: 0 };
    }

    const sourceTopColor = source.getTopColor();
    if (!sourceTopColor) {
        return { success: false, colorsPoured: 0 };
    }

    // check if target can receive this color
    if (!target.canReceive(sourceTopColor)) {
        return { success: false, colorsPoured: 0 };
    }

    // how many segments can be poured
    const sourceSegments = source.getTopSegmentCount();
    const targetSpace = target.getBottleData().slots - target.getBottleData().colors.length;
    const segmentsToPour = Math.min(sourceSegments, targetSpace);

    for (let i = 0; i < segmentsToPour; i++) {
        const color = source.removeTopColor();
        if (color) {
            target.addColor(color);
        }
    }

    return { success: true, colorsPoured: segmentsToPour };
}

export function canPour(source: BottleSprite, target: BottleSprite): boolean {
    if (source === target) return false;
    if (source.isEmpty()) return false;
    if (target.isFull()) return false;
    
    const sourceTopColor = source.getTopColor();
    if (!sourceTopColor) return false;
    
    return target.canReceive(sourceTopColor);
}
