/* =========================================
   BATTLE & LEVELING LOGIC (SERVER-AUTHORITATIVE)
   ========================================= */

import { generateItem } from './itemGenerator.js';
import { GLOBAL_DROP_RATE } from '../data/constants.js';

export const attackMonster = async (playerStats, monster) => {
    // 1. KEAMANAN LOKAL: Cek apakah monster sudah mati sebelum mengirim API
    if (monster.currentHp !== undefined && monster.currentHp <= 0) {
        return { damageDealt: 0, isCrit: false, monsterDamage: 0, isKilled: false, goldGained: 0, xpGained: 0, lootItem: null, lootOre: 0, lootEnergy: 0, alreadyDead: true };
    }

    // ==========================================
    // TODO: INTEGRASI API SUPABASE
    // const response = await supabase.rpc('attack_monster', { monsterId: monster.id, playerStats });
    // if (response.error) throw new Error(response.error.message);
    // return response.data; // Server mengembalikan hasil damage & loot
    // ==========================================

    // --- SIMULASI SERVER (Akan dihapus setelah Supabase aktif) ---
    // Memberikan jeda waktu agar pemain tidak bisa memakai auto-clicker
    await new Promise(resolve => setTimeout(resolve, 300)); 

    // 2. KALKULASI SERVER: SERANGAN PEMAIN
    const isCrit = (Math.random() * 100) <= (playerStats.crit || 5);
    let baseDamage = playerStats.atk || 10;
    if (isCrit) baseDamage = Math.floor(baseDamage * 1.5);

    const monsterDef = monster.def || Math.floor((monster.hp || 100) * 0.015);
    const dmgDealt = Math.max(1, Math.floor(baseDamage - (monsterDef * 0.3)));

    // 3. SERVER: KURANGI HP MUSUH
    if (monster.currentHp === undefined) monster.currentHp = monster.hp;
    monster.currentHp -= dmgDealt;
    const isKilled = monster.currentHp <= 0;

    // 4. SERVER: MUSUH MENYERANG BALIK (DENGAN NERF 50%)
    let monsterDmg = 0;
    if (!isKilled) {
        const monsterAtk = monster.atk || (Math.floor((monster.hp || 100) * 0.015) + 5);
        const playerDef = playerStats.def || 5;
        let rawDamage = monsterAtk - (playerDef * 0.5);
        monsterDmg = Math.max(0, Math.floor(rawDamage * 0.5));

        // Fitur Dodge (Menghindar)
        const dodgeChance = Math.min((playerStats.speed || 0) * 0.1, 40);
        if ((Math.random() * 100) <= dodgeChance) {
            monsterDmg = 0; 
        }
    }

    // 5. SERVER: KALKULASI HADIAH (GOLD & EXP)
    let baseMonsterXp = monster.xp || Math.floor((monster.hp || 100) * 0.05); 
    let hitMultiplier = 0.15 + (Math.random() * 0.20); 
    
    let goldGained = Math.floor((monster.gold || 50) * hitMultiplier);
    let xpGained = Math.floor(baseMonsterXp * hitMultiplier) + 1;

    let lootItem = null;
    let lootOre = 0;
    let lootEnergy = 0;

    if (isKilled) {
        goldGained += (monster.gold || 50); 
        xpGained += baseMonsterXp;   
    }

    // 6. SERVER: HIERARKI DROP ITEM (RNG Aman dari Klien)
    if ((Math.random() * 100) <= 30) {
        lootOre = monster.oreDrop ? Math.floor(Math.random() * (monster.oreDrop / 2)) + 1 : Math.floor(Math.random() * 2) + 1;
    }

    if ((Math.random() * 100) <= 10) {
        lootEnergy = Math.floor(Math.random() * 2) + 1;
    }

    const dropChance = monster.dropChance || GLOBAL_DROP_RATE || 3; 
    if ((Math.random() * 100) <= dropChance) {
        const roll = Math.random() * 100;
        let rarity = 'COMMON';
        
        if (monster.isVip) {
            if (roll > 97) rarity = 'MYTHIC';
            else if (roll > 90) rarity = 'EPIC';
            else if (roll > 70) rarity = 'RARE';
            else rarity = 'UNCOMMON';
        } else if (monster.minLevel && monster.minLevel >= 10) {
            if (roll > 90) rarity = 'RARE';
            else if (roll > 60) rarity = 'UNCOMMON';
            else rarity = 'COMMON';
        } else if (monster.minLevel && monster.minLevel >= 5) {
            if (roll > 80) rarity = 'UNCOMMON';
            else rarity = 'COMMON';
        } else {
            rarity = 'COMMON';
        }
        lootItem = generateItem(rarity);
    }
    // -----------------------------------------------------------

    return { 
        damageDealt: dmgDealt, 
        isCrit, 
        monsterDamage: monsterDmg, 
        isKilled, 
        goldGained, 
        xpGained, 
        lootItem, 
        lootOre, 
        lootEnergy 
    };
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
