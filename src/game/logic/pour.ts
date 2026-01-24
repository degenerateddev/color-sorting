import type { BottleSprite } from '../ui/Bottle';
import type { Color, PourResult } from './types';

export interface PourInfo {
    canPour: boolean;
    color: Color | null;
    segmentsToPour: number;
}

/**
 * Check if pouring is possible and get pour info without actually performing the pour
 */
export function getPourInfo(source: BottleSprite, target: BottleSprite): PourInfo {
    // can't pour into self
    if (source === target) {
        return { canPour: false, color: null, segmentsToPour: 0 };
    }

    // can't pour from empty bottle
    if (source.isEmpty()) {
        return { canPour: false, color: null, segmentsToPour: 0 };
    }

    // can't pour into full bottle
    if (target.isFull()) {
        return { canPour: false, color: null, segmentsToPour: 0 };
    }

    const sourceTopColor = source.getTopColor();
    if (!sourceTopColor) {
        return { canPour: false, color: null, segmentsToPour: 0 };
    }

    // check if target can receive this color
    if (!target.canReceive(sourceTopColor)) {
        return { canPour: false, color: null, segmentsToPour: 0 };
    }

    // how many segments can be poured
    const sourceSegments = source.getTopSegmentCount();
    const targetSpace = target.getBottleData().slots - target.getBottleData().colors.length;
    const segmentsToPour = Math.min(sourceSegments, targetSpace);

    return { canPour: true, color: sourceTopColor, segmentsToPour };
}

/**
 * Perform the pour immediately (without animation)
 */
export function pourLiquid(source: BottleSprite, target: BottleSprite): PourResult {
    const pourInfo = getPourInfo(source, target);
    
    if (!pourInfo.canPour) {
        return { success: false, colorsPoured: 0 };
    }

    for (let i = 0; i < pourInfo.segmentsToPour; i++) {
        const color = source.removeTopColor();
        if (color) {
            target.addColor(color);
        }
    }

    return { success: true, colorsPoured: pourInfo.segmentsToPour };
}

export function canPour(source: BottleSprite, target: BottleSprite): boolean {
    if (source === target) return false;
    if (source.isEmpty()) return false;
    if (target.isFull()) return false;
    
    const sourceTopColor = source.getTopColor();
    if (!sourceTopColor) return false;
    
    return target.canReceive(sourceTopColor);
}
