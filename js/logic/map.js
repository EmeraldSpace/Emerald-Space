/* =========================================
   GALAXY NAVIGATION LOGIC - EMERALD SPACE
   ========================================= */

import { MAP_DATA } from '../data/monsters.js';

/**
 * Location Transition Logic (Warp Drive)
 */
export const travelToLocation = (locationId, player, currentEmrldBalance = 0) => {
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

    // 2. Special Map Requirement Validation (Web3 Token & Elite Status)
    const isVipMap = targetMap.reqToken ? true : false;
    const reqAmount = 100000; // Synced to 100,000 EMRLD

    // Check if player lacks both Elite License AND sufficient EMRLD
    const isEliteLocked = isVipMap && !player.isElite && currentEmrldBalance < reqAmount;

    if (isEliteLocked) {
        return { 
            success: false, 
            message: `🔒 Restricted Area! Sensors detect insufficient clearance. Requires Elite License or at least ${reqAmount.toLocaleString()} EMRLD.` 
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
export const checkMapAccess = (map, player, currentEmrldBalance = 0) => {
    const levelLocked = player.level < map.minLevel;
    
    // VIP Requirement: Elite License OR 100k EMRLD
    const isVipMap = map.reqToken ? true : false;
    const reqAmount = 100000; 
    
    const isEliteLocked = isVipMap && !player.isElite && currentEmrldBalance < reqAmount;
    
    return {
        isLocked: levelLocked || isEliteLocked,
        // UI Text updated for smaller screen fitting
        reason: levelLocked ? `Lv. ${map.minLevel} Req.` : (isEliteLocked ? `100k EMRLD Req.` : "")
    };
};
