/* =========================================
   INVENTORY LOGIC - EMERALD SPACE (POLISHED)
   ========================================= */

import { getState, updateState } from './state.js';

export const equipItem = (item) => {
    const state = getState();
    const slot = item.type.toLowerCase();

    let newInventory = [...(state.inventory || [])];
    let newEquipped = { ...(state.equipped || {}) };

    newInventory = newInventory.filter(i => i.id !== item.id);

    if (newEquipped[slot]) {
        newInventory.push(newEquipped[slot]);
    }

    newEquipped[slot] = item;
    updateState({ inventory: newInventory, equipped: newEquipped });
    
    return { success: true }; // Tambahkan return status
};

export const unequipItem = (slot) => {
    const state = getState();
    let newInventory = [...(state.inventory || [])];
    let newEquipped = { ...(state.equipped || {}) };

    if (newEquipped[slot]) {
        if (newInventory.length >= 50) {
            // [UX POLISH]: Jangan gunakan alert(), kembalikan pesan error untuk ditampilkan UI
            return { success: false, message: "Inventory full! Dismantle or sell items first." };
        }
        
        newInventory.push(newEquipped[slot]);
        newEquipped[slot] = null;
    }

    updateState({ inventory: newInventory, equipped: newEquipped });
    return { success: true }; // Tambahkan return status
};
