/* =========================================
   GALAXY NAVIGATION LOGIC - EMERALD SPACE
   ========================================= */

import { MAP_DATA } from '../data/monsters.js';

/**
 * Location Transition Logic (Warp Drive)
 */
export const travelToLocation = (locationId, player, currentSolBalance = 0) => {
    const targetMap = MAP_DATA.find(m => m.id === locationId) || MAP_DATA[locationId];

    // Failsafe if coordinates are not found
    if (!targetMap) {
        return { 
            success: false, 
            message: "⚠️ Galaxy coordinates not found! Signal lost." 
        };
    }

    // 1. Minimum Level Requirement Validation
    if (player.level < targetMap.minLevel) {
        return { 
            success: false, 
            message: `❌ Access Denied! Level ${targetMap.minLevel} required to breach the ${targetMap.name} asteroid belt.` 
        };
    }

    // 2. Special Map Requirement Validation (Web3 Token)
    const isVipMap = targetMap.reqToken ? true : false;
    const reqAmount = 1; // Standard 1 SOL Devnet from mapUI.js

    if (isVipMap && currentSolBalance < reqAmount) {
        return { 
            success: false, 
            message: "🔒 Restricted Area! Sensors detect insufficient Web3 (SOL) balance." 
        };
    }

    return {
        success: true,
        locationData: targetMap,
        message: `🚀 Warp successful! Welcome to the ${targetMap.name} sector.`
    };
};

/**
 * Get monster list in a specific location
 */
export const getMapMonsters = (locationId) => {
    const map = MAP_DATA.find(m => m.id === locationId) || MAP_DATA[locationId];
    return map ? map.monsters : [];
};

/**
 * Check if a location is locked (SYNCED WITH mapUI.js)
 */
export const checkMapAccess = (map, player, currentSolBalance = 0) => {
    const levelLocked = player.level < map.minLevel;
    
    // VIP Requirement: If there is reqToken in monster data
    const isVipMap = map.reqToken ? true : false;
    const reqAmount = 1; // Standard 1 SOL Devnet from mapUI.js
    
    const tokenLocked = isVipMap && currentSolBalance < reqAmount;
    
    return {
        isLocked: levelLocked || tokenLocked,
        // UI Text updated for smaller screen fitting
        reason: levelLocked ? `Lv. ${map.minLevel} Req.` : (tokenLocked ? "1 SOL Req." : "")
    };
};
