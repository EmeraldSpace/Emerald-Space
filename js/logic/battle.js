/* =========================================
   BATTLE & LEVELING LOGIC (SECURE MAINNET VERSION)
   ========================================= */

import { supabase } from './state.js';
import { generateItem } from './itemGenerator.js';

export const attackMonster = async (playerStats, monster) => {
    // 1. Local check to prevent sending ghost attacks to server
    if (monster.currentHp !== undefined && monster.currentHp <= 0) {
        return { 
            damageDealt: 0, isCrit: false, monsterDamage: 0, 
            isKilled: false, goldGained: 0, xpGained: 0, 
            lootItem: null, lootOre: 0, lootEnergy: 0, alreadyDead: true 
        };
    }

    try {
        // 2. CALL REAL SUPABASE BACKEND (Tamper-proof execution)
        const { data, error } = await supabase.rpc('secure_battle_calc', { 
            p_stats: playerStats, 
            p_monster: monster 
        });

        if (error) throw new Error(error.message);

        // 3. Deduct HP locally so the UI updates smoothly
        if (monster.currentHp === undefined) monster.currentHp = monster.hp;
        monster.currentHp -= data.damage_dealt;

        // 4. Secure Item Drop Generation
        // The server dictates IF an item dropped and its rarity. 
        // The client simply builds the item data based on that strict server rule.
        let finalLootItem = null;
        if (data.dropped_rarity) {
            finalLootItem = generateItem(data.dropped_rarity);
        }

        return {
            damageDealt: data.damage_dealt,
            isCrit: data.is_crit,
            monsterDamage: data.monster_damage,
            isKilled: data.is_killed,
            goldGained: data.gold_gained,
            xpGained: data.xp_gained,
            lootItem: finalLootItem,
            lootOre: data.loot_ore,
            lootEnergy: data.loot_energy
        };

    } catch (err) {
        console.error("Mainnet Battle Error:", err);
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("SERVER ERROR", "Failed to connect to battle server.", "#ff4444");
        }
        return { alreadyDead: true, error: true };
    }
};

export const checkLevelUp = (profile, xpGained) => {
    let xp = (profile.xp || 0) + xpGained;
    let level = profile.level || 1;
    let maxXp = profile.maxXp || 100;
    let maxStamina = profile.maxStamina || 50;
    let leveledUp = false;

    while (xp >= maxXp) {
        xp -= maxXp;
        level += 1;
        maxXp = Math.floor(maxXp * 1.5);
        maxStamina += 10;
        leveledUp = true;
    }

    return { xp, level, maxXp, maxStamina, leveledUp };
};
