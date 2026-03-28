/* =========================================
   HANGAR LOGIC - EMERALD SPACE
   ========================================= */

import { SHIPS } from '../data/ships.js'; // REVISI: Mengubah SHIP_CLASSES menjadi SHIPS

/**
 * Menghitung total statistik pesawat berdasarkan item yang di-equip
 * @param {string} shipClass - Nama class (INTERCEPTOR, DREADNOUGHT, dll)
 * @param {Object} equippedItems - Object berisi 5 slot item { weapon, hull, shield, engine, cpu }
 */
export const calculateFinalStats = (shipClass, equippedItems) => {
    // 1. Ambil data dasar pesawat dari koleksi data
    const shipData = SHIPS[shipClass]; // REVISI: Menggunakan SHIPS
    
    // Pengamanan: Jika data kapal tidak ditemukan, berikan statistik nol agar game tidak crash
    if (!shipData) {
        return {
            displayStats: { hp: 0, atk: 0, def: 0, speed: 0, crit: 0 },
            powerScore: 0
        };
    }

    // REVISI: Data status langsung dari objek shipData, tidak menggunakan .baseStats
    const base = shipData; 
    
    // 2. Inisialisasi total dengan statistik dasar pesawat
    let total = {
        hp: base.hp || 0,
        atk: base.atk || 0,
        def: base.def || 0,
        speed: base.speed || 0, // Sudah disinkronkan dengan .speed
        crit: base.crit || 0 
    };

    // 3. Tambahkan bonus statistik dari setiap item yang terpasang (Equipped)
    if (equippedItems) {
        Object.values(equippedItems).forEach(item => {
            if (item && item.stats) {
                total.hp += item.stats.hp || 0;
                total.atk += item.stats.atk || 0;
                total.def += item.stats.def || 0;
                total.speed += item.stats.speed || 0;
                total.crit += item.stats.crit || 0;
            }
        });
    }

    // 4. Kalkulasi Overall Power Score
    const powerScore = Math.floor(
        (total.hp / 10) + 
        (total.atk * 2) + 
        (total.def * 1.5) + 
        (total.speed) + 
        (total.crit * 5)
    );

    return {
        displayStats: total,
        powerScore: powerScore
    };
};

/**
 * Logika Perbaikan Pesawat (Repair)
 */
export const getRepairCost = (currentHp, maxHp) => {
    const missingHp = maxHp - currentHp;
    if (missingHp <= 0) return 0;
    return Math.floor(missingHp * 10);
};
