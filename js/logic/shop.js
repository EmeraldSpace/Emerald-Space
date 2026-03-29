/* =========================================
   SHOP LOGIC (SOLANA NETWORK & GOLD)
   ========================================= */

import { getState, updateState } from './state.js';
import { generateItem } from './itemGenerator.js';

export const SHOP_ITEMS = {
    // === GOLD PURCHASE PACKAGES USING SOLANA ===
    SOL_1: { name: "100,000 Gold", price: 0.05, reward: 100000, isSOL: true, image: "source/item/gold.png", description: "Buy 100,000 Gold for 0.05 SOL." },
    SOL_5: { name: "550,000 Gold", price: 0.25, reward: 550000, isSOL: true, image: "source/item/gold.png", description: "Buy 550,000 Gold for 0.25 SOL. (10% Bonus)" },
    SOL_10: { name: "1,200,000 Gold", price: 0.5, reward: 1200000, isSOL: true, image: "source/item/gold.png", description: "Buy 1.2M Gold for 0.5 SOL. (20% Bonus)" },
    SOL_25: { name: "3,250,000 Gold", price: 1.25, reward: 3250000, isSOL: true, image: "source/item/gold.png", description: "Buy 3.25M Gold for 1.25 SOL. (30% Bonus)" },
    SOL_100: { name: "15,000,000 Gold", price: 5.0, reward: 15000000, isSOL: true, image: "source/item/gold.png", description: "Buy 15M Gold for 5.0 SOL. (50% Bonus)" },
    SOL_1000: { name: "200,000,000 Gold", price: 50.0, reward: 200000000, isSOL: true, image: "source/item/gold.png", description: "Buy 200M Gold for 50.0 SOL. (100% Bonus)" },
    
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
