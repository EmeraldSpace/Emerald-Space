/* =========================================
   ITEM GENERATOR - MENGGUNAKAN ITEM_DB KAPTEN
   ========================================= */

import { ITEM_DB } from '../data/items.js';

export const generateItem = (rarity, type = null) => {
    // 1. Saring database berdasarkan tingkat kelangkaan (Rarity)
    let pool = ITEM_DB.filter(item => item.rarity === rarity);
    
    // Jika tipe (Weapon/Hull/dll) ditentukan, saring lagi
    if (type) {
        pool = pool.filter(item => item.type === type);
    }
    
    // Jika kosong (mencegah error), kembalikan ke Common Acak
    if (pool.length === 0) pool = ITEM_DB.filter(item => item.rarity === 'COMMON'); 

    // 2. Pilih satu barang secara acak dari hasil saringan
    const baseItem = pool[Math.floor(Math.random() * pool.length)];

    // 3. Cetak barang baru dengan ID unik agar bisa masuk tas
    return {
        id: `itm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: baseItem.name,
        type: baseItem.type,
        rarity: baseItem.rarity,
        image: baseItem.image,
        stats: { ...baseItem.stats } // Kloning stat dari database
    };
};
