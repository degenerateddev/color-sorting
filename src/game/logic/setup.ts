import type { Bottle, Color, GameState, SetupOptions } from "./types";

export const PRESET_COLORS: string[] = [
    '#FF6B6B',   // Coral
    '#4ECDC4',   // Teal
    '#45B7D1',   // Sky Blue
    '#FFEAA7',   // Light Yellow
    '#DDA0DD',   // Plum
    '#6A0DAD',   // Dark Purple
    '#98D8C8',   // Mint
    '#85C1E9',   // Light Blue
    '#F8B500',   // Gold
    '#58D68D',   // Green
    '#D35400',   // Burnt Orange
    '#E91E63',   // Hot Pink
    '#795548',   // Brown
    '#8BC34A',   // Lime Green
    '#3F51B5',   // Indigo
    '#CDDC39',   // Chartreuse
    '#00BCD4',   // Cyan
    '#C62828',   // Crimson
    '#1B5E20',   // Forest Green
    '#FF9800',   // Amber
    '#607D8B',   // Steel Blue
    '#E040FB',   // Magenta
    '#827717',   // Olive
    '#F48FB1',   // Pink
    '#00838F',   // Dark Cyan
];

export function setupGame(options: SetupOptions = { numColors: 4, slotsPerBottle: 4, emptyBottles: 2 }): GameState {
    const { numColors, slotsPerBottle, emptyBottles } = options;
    
    const gameColors: Color[] = PRESET_COLORS
        .slice(0, numColors)
        .map(code => ({ code }));
    
    const colorPool: Color[] = [];
    gameColors.forEach(color => {
        for (let i = 0; i < slotsPerBottle; i++) {
            colorPool.push({ ...color });
        }
    });
    
    shuffleArray(colorPool);
    
    const bottles: Bottle[] = [];
    for (let i = 0; i < numColors; i++) {
        const bottleColors: Color[] = [];
        for (let j = 0; j < slotsPerBottle; j++) {
            bottleColors.push(colorPool.pop()!);
        }
        bottles.push({
            colors: bottleColors,
            slots: slotsPerBottle
        });
    }
    
    for (let i = 0; i < emptyBottles; i++) {
        bottles.push({
            colors: [],
            slots: slotsPerBottle
        });
    }
    
    return {
        bottles,
        additionalBottles: 0,
        moveCount: 0
    };
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}