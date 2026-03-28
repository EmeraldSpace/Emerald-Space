/* =========================================
   GAME CONSTANTS - EMERALD SPACE
   ========================================= */

/**
 * Rewards obtained when dismantling items.
 * Rewards are scaled based on item rarity.
 */
export const DISMANTLE_REWARD = {
    COMMON:     { type: 'IRON_ORE',    min: 1,  max: 3 },
    UNCOMMON:   { type: 'IRON_ORE',    min: 4,  max: 8 },
    RARE:       { type: 'DARK_ENERGY', min: 1,  max: 2 },
    EPIC:       { type: 'DARK_ENERGY', min: 3,  max: 5 },
    MYTHIC:     { type: 'DARK_ENERGY', min: 10, max: 15 },
    LEGENDARY:  { type: 'DARK_ENERGY', min: 30, max: 50 }
};

/**
 * Crafting (Upgrade) Costs & Success Rates
 * goldFee: Cost in Gold
 * oreReq: Iron Ore required (Basic Material)
 * energyReq: Dark Energy required (Advanced Material)
 * chance: Success rate in % (High Risk, High Reward)
 */
export const CRAFTING_RULES = {
    UNCOMMON: { 
        goldFee: 1000, 
        oreReq: 5, 
        energyReq: 0, 
        chance: 85 
    },
    RARE: { 
        goldFee: 5000, 
        oreReq: 20, 
        energyReq: 0, 
        chance: 60 
    },
    EPIC: { 
        goldFee: 15000, 
        oreReq: 50, 
        energyReq: 5, 
        chance: 40 
    },
    MYTHIC: { 
        goldFee: 50000, 
        oreReq: 100, 
        energyReq: 20, 
        chance: 20 
    },
    LEGENDARY: { 
        goldFee: 200000, 
        oreReq: 500, 
        energyReq: 100, 
        chance: 5 // The hardest chance in the game
    }
};

/**
 * Leveling & XP Configuration
 */
export const LEVEL_CONFIG = {
    XP_PER_LEVEL: 1000,
    XP_MULTIPLIER: 1.2, // Required XP increases by 20% each level
    GOLD_PER_HIT_PERCENT: 0.05 // 5% of monster's gold per hit
};

export const GLOBAL_DROP_RATE = 3; // Base chance for Equipment drop (3%)
