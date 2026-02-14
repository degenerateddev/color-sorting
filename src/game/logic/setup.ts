import type { Bottle, Color, GameState, SetupOptions } from "./types";

const PRESET_COLORS: string[] = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFEAA7',
    '#DDA0DD',
	'#6A0DAD',
    '#98D8C8',
    '#85C1E9',
    '#F8B500',
    '#58D68D',
	'#D35400'
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