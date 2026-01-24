import type { BottleSprite } from '../ui/Bottle';

export function checkWin(bottles: BottleSprite[]): boolean {
    for (const bottle of bottles) {
		// bottles can be empty in winning state
        if (bottle.isEmpty()) continue;
        
		// if bottle isn't empty but not complete either, no win 
        if (!bottle.isComplete()) {
            return false;
        }
    }
    
    return true;
}

export function isGameStuck(bottles: BottleSprite[]): boolean {
    // check if any pour is possible
    for (let i = 0; i < bottles.length; i++) {
        for (let j = 0; j < bottles.length; j++) {
            if (i === j) continue;
            
            const source = bottles[i];
            const target = bottles[j];
            
            if (source.isEmpty()) continue;
            
            if (target.isFull()) continue;
            
            const sourceTop = source.getTopColor();
            if (sourceTop && target.canReceive(sourceTop)) {
                // at least one valid move
                return false;
            }
        }
    }
    
    // no valid moves found
    return true;
}