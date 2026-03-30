/* =========================================
   SHOP LOGIC (SOLANA NETWORK & GOLD)
   ========================================= */

import { getState, updateState } from './state.js';
import { generateItem } from './itemGenerator.js';

export const SHOP_ITEMS = {
    // === GOLD PURCHASE PACKAGES USING SOLANA ===
    // Ratio: 1 SOL = 50,000,000 Gold
    SOL_STARTER: { name: "STARTER PACK", price: 0.05, reward: 2500000, isSOL: true, image: "source/item/gold.png", description: "Get 2,500,000 Gold instantly for 0.05 SOL." },
    SOL_CAPTAIN: { name: "CAPTAIN PACK", price: 0.10, reward: 5000000, isSOL: true, image: "source/item/gold.png", description: "Get 5,000,000 Gold instantly for 0.10 SOL." },
    SOL_COMMANDER: { name: "COMMANDER PACK", price: 0.25, reward: 12500000, isSOL: true, image: "source/item/gold.png", description: "Get 12,500,000 Gold instantly for 0.25 SOL." },
    SOL_ADMIRAL: { name: "ADMIRAL PACK", price: 0.50, reward: 25000000, isSOL: true, image: "source/item/gold.png", description: "Get 25,000,000 Gold instantly for 0.50 SOL." },
    SOL_EMPEROR: { name: "EMPEROR PACK", price: 1.00, reward: 50000000, isSOL: true, image: "source/item/gold.png", description: "Massive wealth! Get 50,000,000 Gold for 1.00 SOL." },
    
    // === NORMAL ITEMS USING GOLD ===
    STAMINA_REFILL: { name: "Stamina Refill", price: 200, image: "source/icon/stamina.png", description: "Instantly restores stamina to maximum." },
    IRON_ORE: { name: "Iron Ore", price: 5000, image: "source/item/ore.png", description: "Basic crafting material." },
    DARK_ENERGY: { name: "Dark Energy", price: 25000, image: "source/item/energy.png", description: "Pure legendary energy." },
    LASER_WEAPON: { name: "Laser Cannon", price: 15000, image: "source/item/weapon.png", description: "Increases attack power (ATK)." },
    TITANIUM_HULL: { name: "Titanium Hull", price: 18000, image: "source/item/hull.png", description: "Armor plating to increase health (HP)." },
    ENERGY_SHIELD: { name: "Energy Shield", price: 12000, image: "source/item/shield.png", description: "Plasma shield dome (DEF)." },
    PLASMA_ENGINE: { name: "Plasma Engine", price: 16000, image: "source/item/engine.png", description: "Advanced rocket thrusters (SPD)." },
    QUANTUM_CPU: { name: "Quantum CPU", price: 20000, image: "source/item/cpu.png", description: "High-accuracy navigation system (CRIT)." }
};

export const buyMaterial = async (itemKey, quantity = 1) => {
    const state = getState();
    const item = SHOP_ITEMS[itemKey];

    if (!item) return { success: false, message: "Item not found!" };
    
    if (item.isSOL) return { success: false, message: "Crypto items are processed securely via Wallet Connection." }; 

    let totalCost = 0;

    if (itemKey === 'STAMINA_REFILL') {
        const maxS = state.profile.maxStamina || 50;
        const curS = state.profile.stamina !== undefined ? state.profile.stamina : maxS;
        const missing = maxS - curS;
        if (missing <= 0) return { success: false, message: "Stamina is already full!" };
        totalCost = missing * 200; 
    } else {
        totalCost = item.price * quantity;
    }

    if (state.profile.gold < totalCost) return { success: false, message: "Not enough Gold!" };

    // Server processing simulation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const updatedProfile = { ...state.profile };
    let newInventory = [...(state.inventory || [])];

    updatedProfile.gold -= totalCost;

    if (itemKey === 'STAMINA_REFILL') {
        updatedProfile.stamina = updatedProfile.maxStamina || 50; 
    } 
    else if (itemKey === 'IRON_ORE' || itemKey === 'DARK_ENERGY') {
        const materialKey = itemKey.toLowerCase();
        updatedProfile[materialKey] = (updatedProfile[materialKey] || 0) + quantity;
    } 
    else {
        if (newInventory.length + quantity > 50) return { success: false, message: `Inventory full! Cannot hold ${quantity} items. Slots left: ${50 - newInventory.length}` };
        
        let itemType = 'WEAPON';
        if (itemKey.includes('HULL')) itemType = 'HULL';
        if (itemKey.includes('SHIELD')) itemType = 'SHIELD';
        if (itemKey.includes('ENGINE')) itemType = 'ENGINE';
        if (itemKey.includes('CPU')) itemType = 'CPU';

        for(let i = 0; i < quantity; i++) {
            newInventory.push(generateItem('COMMON', itemType));
        }
    }

    updateState({ profile: updatedProfile, inventory: newInventory });
    return { success: true, message: `Successfully bought ${quantity}x ${item.name}!` };
};
