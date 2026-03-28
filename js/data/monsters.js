/* =========================================
   MONSTER DATABASE - EMERALD SPACE (EXPANDED)
   ========================================= */

export const MAP_DATA = [
    {
        name: "Alpha Centauri", minLevel: 1,
        monsters: [
            { id: "m1", name: "Drone Scavenger", hp: 1200, gold: 50, respawn: 10, image: "source/monster/monster1.png" },
            { id: "m2", name: "Pirate Fighter", hp: 3500, gold: 120, respawn: 15, image: "source/monster/monster1.png" },
            { id: "m3", name: "Rogue Commander", hp: 7500, gold: 300, respawn: 20, image: "source/monster/monster1.png" }
        ]
    },
    {
        name: "Nebula Sector", minLevel: 5,
        monsters: [
            { id: "m4", name: "Alien Cruiser", hp: 12000, gold: 450, respawn: 20, image: "source/monster/monster2.png" },
            { id: "m5", name: "Void Behemoth", hp: 25000, gold: 800, respawn: 25, image: "source/monster/monster2.png" },
            { id: "m6", name: "Nebula Dragon", hp: 45000, gold: 1800, respawn: 30, image: "source/monster/monster2.png" }
        ]
    },
    {
        name: "Dark Zone", minLevel: 10,
        monsters: [
            { id: "m7", name: "Shadow Drone", hp: 60000, gold: 2500, respawn: 30, image: "source/monster/monster3.png" },
            { id: "m8", name: "Abyssal Leviathan", hp: 100000, gold: 5000, respawn: 40, image: "source/monster/monster3.png" },
            { id: "m9", name: "Galactic Devourer", hp: 250000, gold: 15000, respawn: 60, image: "source/monster/monster3.png" }
        ]
    },
    {
        name: "Cosmic Vault", minLevel: 15, reqToken: 500000, tokenName: "EMRLD",
        monsters: [
            { id: "v1", name: "Gold Sentinel", hp: 350000, gold: 40000, dropChance: 25, oreDrop: 8, respawn: 30, isVip: true, image: "source/monster/monster1.png" },
            { id: "v2", name: "Treasure Golem", hp: 800000, gold: 100000, dropChance: 50, oreDrop: 15, respawn: 45, isVip: true, image: "source/monster/monster2.png" },
            { id: "v3", name: "Aurelian Dragon", hp: 2000000, gold: 350000, dropChance: 85, oreDrop: 40, respawn: 60, isVip: true, image: "source/monster/monster3.png" }
        ]
    },
    // ===================================
    // 5 MAP TAMBAHAN (END-GAME CONTENT)
    // ===================================
    {
        name: "Orion's Belt", minLevel: 20,
        monsters: [
            { id: "n1", name: "Orion Scout", hp: 600000, gold: 30000, dropChance: 40, oreDrop: 20, respawn: 30, image: "source/monster/monster1.png" },
            { id: "n2", name: "Star Destroyer", hp: 1500000, gold: 80000, dropChance: 60, oreDrop: 45, respawn: 45, image: "source/monster/monster2.png" },
            { id: "n3", name: "Cosmic Lord", hp: 3500000, gold: 200000, dropChance: 80, oreDrop: 75, respawn: 60, image: "source/monster/monster3.png" }
        ]
    },
    {
        name: "Crimson Galaxy", minLevel: 30,
        monsters: [
            { id: "n4", name: "Crimson Drone", hp: 5000000, gold: 300000, dropChance: 50, oreDrop: 50, respawn: 30, image: "source/monster/monster1.png" },
            { id: "n5", name: "Blood Cruiser", hp: 12000000, gold: 800000, dropChance: 70, oreDrop: 85, respawn: 45, image: "source/monster/monster2.png" },
            { id: "n6", name: "Galaxy Tyrant", hp: 25000000, gold: 1800000, dropChance: 90, oreDrop: 120, respawn: 60, image: "source/monster/monster3.png" }
        ]
    },
    {
        name: "Obsidian Cluster", minLevel: 40,
        monsters: [
            { id: "n7", name: "Obsidian Fighter", hp: 35000000, gold: 2500000, dropChance: 60, oreDrop: 80, respawn: 30, image: "source/monster/monster1.png" },
            { id: "n8", name: "Dark Matter Golem", hp: 75000000, gold: 6000000, dropChance: 80, oreDrop: 130, respawn: 45, image: "source/monster/monster2.png" },
            { id: "n9", name: "Singularity Boss", hp: 150000000, gold: 12000000, dropChance: 100, oreDrop: 200, respawn: 60, image: "source/monster/monster3.png" }
        ]
    },
    {
        name: "Quantum Rift", minLevel: 50,
        monsters: [
            { id: "n10", name: "Quantum Phantom", hp: 250000000, gold: 20000000, dropChance: 70, oreDrop: 150, respawn: 40, image: "source/monster/monster1.png" },
            { id: "n11", name: "Rift Walker", hp: 500000000, gold: 45000000, dropChance: 90, oreDrop: 250, respawn: 50, image: "source/monster/monster2.png" },
            { id: "n12", name: "Dimension Eater", hp: 1000000000, gold: 90000000, dropChance: 100, oreDrop: 400, respawn: 75, image: "source/monster/monster3.png" }
        ]
    },
    {
        name: "Supernova Core", minLevel: 60,
        monsters: [
            { id: "n13", name: "Plasma Wisp", hp: 2000000000, gold: 150000000, dropChance: 80, oreDrop: 300, respawn: 45, image: "source/monster/monster1.png" },
            { id: "n14", name: "Solar Flare Ship", hp: 5000000000, gold: 400000000, dropChance: 95, oreDrop: 500, respawn: 60, image: "source/monster/monster2.png" },
            { id: "n15", name: "The Sun God", hp: 10000000000, gold: 999000000, dropChance: 100, oreDrop: 1000, respawn: 90, image: "source/monster/monster3.png" }
        ]
    }
];
