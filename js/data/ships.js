/* =========================================
   SHIPS DATA - EMERALD SPACE (REBALANCED V2)
   ========================================= */

export const SHIPS = {
    INTERCEPTOR: {
        id: "INTERCEPTOR",
        name: "INTERCEPTOR",
        description: "An agile fighter with lethal attack power and critical strikes. (Playstyle: Glass Cannon / DPS)",
        atk: 80,    // [HIGHEST] Extremely powerful laser damage
        def: 10,    // [LOWEST] Thin armor plating
        hp: 200,    // [LOWEST] Vulnerable to continuous attacks
        speed: 80,  // [HIGHEST] Extremely agile
        crit: 10,   // [BONUS] 10% Chance for Double Damage!
        image: "source/ships/ship1.png"
    },
    DREADNOUGHT: {
        id: "DREADNOUGHT",
        name: "DREADNOUGHT",
        description: "A space fortress with massive HP and extreme defense, but slow mobility. (Playstyle: Tank / Survival)",
        atk: 40,    // [LOWEST] Standard laser damage
        def: 50,    // [HIGHEST] Absorbs monster counter-attacks very well
        hp: 600,    // [HIGHEST] Very hard to destroy
        speed: 30,  // [LOWEST] Heavy machinery
        crit: 2,    // [STANDARD] Rarely lands critical hits
        image: "source/ships/ship2.png"
    },
    EXPLORER: {
        id: "EXPLORER",
        name: "EXPLORER",
        description: "A versatile cruiser with perfect balance across all combat environments. (Playstyle: Balanced / All-Rounder)",
        atk: 60,    // [MEDIUM] Stable damage output
        def: 25,    // [MEDIUM] Decent defense capability
        hp: 400,    // [MEDIUM] Standard durability
        speed: 60,  // [MEDIUM] Stable maneuverability
        crit: 5,    // [STANDARD] Fair critical hit chance
        image: "source/ships/ship3.png"
    }
};

/**
 * Helper function to get ship data by ID
 */
export const getShipData = (shipId) => {
    return SHIPS[shipId] || SHIPS.INTERCEPTOR;
};
