/* =========================================
   BATTLE & LEVELING LOGIC (SERVER-AUTHORITATIVE)
   ========================================= */

import { supabase } from './state.js';

export const attackMonster = async (playerStats, monster) => {
    // 1. LOCAL SAFETY CHECK: Prevent API calls if the monster is already dead locally
    if (monster.currentHp !== undefined && monster.currentHp <= 0) {
        return { 
            damageDealt: 0, isCrit: false, monsterDamage: 0, 
            isKilled: false, goldGained: 0, xpGained: 0, 
            lootItem: null, lootOre: 0, lootEnergy: 0, alreadyDead: true 
        };
    }

    try {
        // 2. SERVER-SIDE EXECUTION (NO CLIENT-SIDE RNG)
        // The backend securely calculates dodge, crit, damage, and loot drops.
        const { data, error } = await supabase.rpc('attack_monster', { 
            p_monster_id: monster.id, 
            p_player_stats: playerStats 
        });

        if (error) throw new Error(error.message);

        // 3. RETURN SECURE SERVER RESULTS TO FRONTEND UI
        return {
            damageDealt: data.damage_dealt,
            isCrit: data.is_crit,
            monsterDamage: data.monster_damage,
            isKilled: data.is_killed,
            goldGained: data.gold_gained,
            xpGained: data.xp_gained,
            lootItem: data.loot_item, // Backend returns the generated item JSON if dropped
            lootOre: data.loot_ore,
            lootEnergy: data.loot_energy
        };

    } catch (err) {
        console.error("Battle Server Error:", err);
        // Fallback error handling to prevent UI crashes
        return { alreadyDead: true, error: true };
    }
};

export const checkLevelUp = (profile, xpGained) => {
    let xp = (profile.xp || 0) + xpGained;
    let level = profile.level || 1;
    let maxXp = profile.maxXp || 100;
    let maxStamina = profile.maxStamina || 50;
    let leveledUp = false;

    // Loop handles cases where a player gains enough XP to level up multiple times at once
    while (xp >= maxXp) {
        xp -= maxXp;
        level += 1;
        maxXp = Math.floor(maxXp * 1.5);
        maxStamina += 10;
        leveledUp = true;
    }

    return { xp, level, maxXp, maxStamina, leveledUp };
};
