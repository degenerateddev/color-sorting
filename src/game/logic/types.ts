export interface Color {
	code: string;
}

export interface Bottle {
	colors: Color[];
	slots: number;			// number of color slots in the bottle
	hiddenColors?: boolean;	// if true, only first color is being shown
	isGlass?: boolean;		// if true, renders as a glass instead of a bottle
}

export interface GameState {
	bottles: Bottle[];
	additionalBottles: number;
	moveCount: number;
	isSpecial?: boolean;	// special level with effects
}

export interface SetupOptions {
    numColors: number;      // number of different colors (difficulty)
    slotsPerBottle: number; // default 4
    emptyBottles: number;   // default 2
}

export interface PourResult {
	success: boolean;
	colorsPoured: number;
}