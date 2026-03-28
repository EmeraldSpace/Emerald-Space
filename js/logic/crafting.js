/* =========================================
   CRAFTING, DISMANTLE & SMART FORGE LOGIC
   ========================================= */

import { getState, updateState } from './state.js';
import { CRAFTING_RULES, DISMANTLE_REWARD } from '../data/constants.js';

/**
 * Dismantle Logic: Breakdown items into base materials
 */
export const dismantleItem = async (item) => {
    const state = getState();
    const rewardRule = DISMANTLE_REWARD[item.rarity];
    
    if (!rewardRule) return { success: false, message: "Invalid rarity data." };

    const itemExists = (state.inventory || []).find(i => i.id === item.id);
    if (!itemExists) return { success: false, message: "Item not found in inventory!" };

    // Server simulation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const minAmount = rewardRule.min || 1;
    const maxAmount = rewardRule.max || 2;
    const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;

    const updatedProfile = { ...state.profile };
    const newInventory = state.inventory.filter(i => i.id !== item.id);

    let matName = "IRON ORE";
    if (rewardRule.type === 'DARK_ENERGY') {
        updatedProfile.dark_energy = (updatedProfile.dark_energy || 0) + randomAmount;
        matName = "DARK ENERGY";
    } else {
        updatedProfile.iron_ore = (updatedProfile.iron_ore || 0) + randomAmount;
    }

    updateState({ profile: updatedProfile, inventory: newInventory });

    return { 
        success: true, 
        message: `SUCCESS! Machine extracted ${randomAmount} ${matName}.` 
    };
};

/**
 * Crafting Logic: Forge item (Common) in Basic Factory
 */
export const craftItem = async (targetRarity, itemType = null) => {
    const state = getState();
    const rule = CRAFTING_RULES[targetRarity];

    if (!rule) return { success: false, message: "Recipe not found!" };

    const hasEnoughGold = state.profile.gold >= rule.goldFee;
    const hasEnoughOre = state.profile.iron_ore >= rule.oreReq;
    const hasEnoughEnergy = (state.profile.dark_energy || 0) >= rule.energyReq;

    if (!hasEnoughGold || !hasEnoughOre || !hasEnoughEnergy) {
        return { success: false, message: "Not enough Materials or Gold!" };
    }

    await new Promise(resolve => setTimeout(resolve, 1200)); 
    const roll = Math.random() * 100;
    const isSuccess = roll <= rule.chance;
    let newItem = null;

    if (isSuccess) {
        const { generateItem } = await import('./itemGenerator.js');
        newItem = generateItem(targetRarity, itemType);
    }

    const updatedProfile = { ...state.profile };
    updatedProfile.gold -= rule.goldFee;
    updatedProfile.iron_ore -= rule.oreReq;
    updatedProfile.dark_energy -= rule.energyReq;

    if (isSuccess) {
        const newInventory = [...(state.inventory || []), newItem];
        updateState({ profile: updatedProfile, inventory: newInventory });

        return { 
            success: true, 
            item: newItem, 
            message: `CRAFTING SUCCESS! Acquired ${newItem.name}.` 
        };
    } else {
        updateState({ profile: updatedProfile });
        return { 
            success: false, 
            message: "CRAFTING FAILED! Materials and Gold lost in space." 
        };
    }
};

export const UPGRADE_RULES = {
    COMMON: { next: 'UNCOMMON', ore: 10, energy: 0, chance: 100 }, 
    UNCOMMON: { next: 'RARE', ore: 20, energy: 10, chance: 100 },
    RARE: { next: 'EPIC', ore: 30, energy: 20, chance: 70 }, 
    EPIC: { next: 'MYTHIC', ore: 50, energy: 50, chance: 50 },
    MYTHIC: { next: 'LEGENDARY', ore: 100, energy: 100, chance: 25 }
};

/**
 * [FIX]: "SMART FORGE" Logic 
 * Retains item name & multiplies stats proportionally.
 */
export const upgradeItemLogic = async (item, duplicateItem) => {
    const state = getState();
    const rule = UPGRADE_RULES[item.rarity];

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const up = { ...state.profile };
    up.iron_ore -= rule.ore; 
    up.dark_energy -= rule.energy;
    
    const isSuccess = Math.random() * 100 <= rule.chance;
    let newInventory = [];

    if (isSuccess) {
        // 1. Determine stat multiplier based on old and new Rarity
        const STAT_MULT = { COMMON: 1, UNCOMMON: 1.5, RARE: 2, EPIC: 3, MYTHIC: 6, LEGENDARY: 10 };
        const oldMult = STAT_MULT[item.rarity] || 1;
        const newMult = STAT_MULT[rule.next] || 1.5;
        const boostRatio = newMult / oldMult; // Stat increase ratio

        // 2. Clone old stats and multiply by new ratio
        const newStats = {};
        if (item.stats) {
            for (let s in item.stats) {
                newStats[s] = Math.ceil(item.stats[s] * boostRatio);
            }
        }

        // 3. Modify name (Change rarity label in item name)
        let newName = item.name;
        if (newName.includes(`[${item.rarity}]`)) {
            // If tag exists, replace it
            newName = newName.replace(`[${item.rarity}]`, `[${rule.next}]`);
        } else {
            // Clear old tag (if format is weird) and set new tag in front
            newName = `[${rule.next}] ${newName.replace(/\[.*?\] /, '')}`;
        }

        // 4. Forge New Item from Old Item template
        const newItem = {
            id: 'forged_' + Date.now() + Math.floor(Math.random()*1000),
            name: newName,
            type: item.type,
            rarity: rule.next,
            image: item.image, // Retain original image
            stats: newStats
        };
        
        // Remove main item & sacrifice, insert new item
        newInventory = state.inventory.filter(i => i.id !== item.id && i.id !== duplicateItem.id);
        newInventory.push(newItem);
        
        updateState({ profile: up, inventory: newInventory });
        return { success: true, rule: rule };
    } else {
        // If failed, main item is safe, but sacrifice item is destroyed
        newInventory = state.inventory.filter(i => i.id !== duplicateItem.id);
        
        updateState({ profile: up, inventory: newInventory });
        return { success: false, rule: rule };
    }
};
