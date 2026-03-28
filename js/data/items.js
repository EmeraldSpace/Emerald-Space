/* =========================================
   ITEM DATABASE - EMERALD SPACE
   ========================================= */
export const ITEM_DB = [
    // ==========================================
    // 1. WEAPON (Fokus Penambahan ATK & CRIT)
    // ==========================================
    { name: "Basic Laser", type: "WEAPON", rarity: "COMMON", image: "source/item/weapon.png", stats: { atk: 15 } },
    { name: "Plasma Cannon", type: "WEAPON", rarity: "UNCOMMON", image: "source/item/weapon.png", stats: { atk: 35 } },
    { name: "Void Repeater", type: "WEAPON", rarity: "RARE", image: "source/item/weapon.png", stats: { atk: 80, crit: 2 } },
    { name: "Nova Blaster", type: "WEAPON", rarity: "EPIC", image: "source/item/weapon.png", stats: { atk: 150, crit: 5 } },
    { name: "Antimatter Ray", type: "WEAPON", rarity: "MYTHIC", image: "source/item/weapon.png", stats: { atk: 300, crit: 10 } },
    { name: "Omega Destroyer", type: "WEAPON", rarity: "LEGENDARY", image: "source/item/weapon.png", stats: { atk: 600, crit: 20 } },

    // ==========================================
    // 2. HULL (Fokus Penambahan HP)
    // ==========================================
    { name: "Carbon Plate", type: "HULL", rarity: "COMMON", image: "source/item/hull.png", stats: { hp: 100 } },
    { name: "Titanium Shell", type: "HULL", rarity: "UNCOMMON", image: "source/item/hull.png", stats: { hp: 250 } },
    { name: "Diamond Hull", type: "HULL", rarity: "RARE", image: "source/item/hull.png", stats: { hp: 600 } },
    { name: "Neutron Skin", type: "HULL", rarity: "EPIC", image: "source/item/hull.png", stats: { hp: 1200 } },
    { name: "Dark Matter Armor", type: "HULL", rarity: "MYTHIC", image: "source/item/hull.png", stats: { hp: 2500 } },
    { name: "Invincible Aegis", type: "HULL", rarity: "LEGENDARY", image: "source/item/hull.png", stats: { hp: 5000 } },

    // ==========================================
    // 3. SHIELD (Fokus Penambahan DEF)
    // ==========================================
    { name: "Energy Shield", type: "SHIELD", rarity: "COMMON", image: "source/item/shield.png", stats: { def: 10 } },
    { name: "Ionic Barrier", type: "SHIELD", rarity: "UNCOMMON", image: "source/item/shield.png", stats: { def: 25 } },
    { name: "Force Field", type: "SHIELD", rarity: "RARE", image: "source/item/shield.png", stats: { def: 60 } },
    { name: "Nebula Aegis", type: "SHIELD", rarity: "EPIC", image: "source/item/shield.png", stats: { def: 150 } },
    { name: "Quantum Dome", type: "SHIELD", rarity: "MYTHIC", image: "source/item/shield.png", stats: { def: 300 } },
    { name: "Celestial Ward", type: "SHIELD", rarity: "LEGENDARY", image: "source/item/shield.png", stats: { def: 600 } },

    // ==========================================
    // 4. ENGINE (Fokus Penambahan SPEED)
    // ==========================================
    { name: "Ion Thruster", type: "ENGINE", rarity: "COMMON", image: "source/item/engine.png", stats: { speed: 20 } },
    { name: "Plasma Core", type: "ENGINE", rarity: "UNCOMMON", image: "source/item/engine.png", stats: { speed: 45 } },
    { name: "Warp Drive", type: "ENGINE", rarity: "RARE", image: "source/item/engine.png", stats: { speed: 80 } },
    { name: "Hyper Drive", type: "ENGINE", rarity: "EPIC", image: "source/item/engine.png", stats: { speed: 150 } },
    { name: "Tachyon Engine", type: "ENGINE", rarity: "MYTHIC", image: "source/item/engine.png", stats: { speed: 300 } },
    { name: "Infinity Drive", type: "ENGINE", rarity: "LEGENDARY", image: "source/item/engine.png", stats: { speed: 600 } },

    // ==========================================
    // 5. CPU (Fokus Penambahan CRIT Murni)
    // ==========================================
    { name: "Logic Processor", type: "CPU", rarity: "COMMON", image: "source/item/cpu.png", stats: { crit: 2 } },
    { name: "AI Core", type: "CPU", rarity: "UNCOMMON", image: "source/item/cpu.png", stats: { crit: 5 } },
    { name: "Quantum Chip", type: "CPU", rarity: "RARE", image: "source/item/cpu.png", stats: { crit: 10 } },
    { name: "Neural Link", type: "CPU", rarity: "EPIC", image: "source/item/cpu.png", stats: { crit: 18 } },
    { name: "Cyber Brain", type: "CPU", rarity: "MYTHIC", image: "source/item/cpu.png", stats: { crit: 30 } },
    { name: "Sentient Matrix", type: "CPU", rarity: "LEGENDARY", image: "source/item/cpu.png", stats: { crit: 50 } }
];
