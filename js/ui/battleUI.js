/* =========================================
   BATTLE UI CONTROLLER - POLISHED (CINEMATIC V3)
   ========================================= */

import { attackMonster, checkLevelUp } from '../logic/battle.js'; 
import { getState, updateState } from '../logic/state.js';
import { SHIPS } from '../data/ships.js';
import { playSFX } from '../logic/audio.js';

let isProcessingAttack = false;

// === SISTEM NOTIFIKASI LOOT (HILANG OTOMATIS) ===
const showLootToast = (message) => {
    const exist = document.getElementById('sys-loot-toast'); if(exist) exist.remove();
    const toast = document.createElement('div');
    toast.id = 'sys-loot-toast';
    toast.style.cssText = `position:fixed; top:80px; left:50%; transform:translateX(-50%); background:rgba(13,17,23,0.95); border:1px solid var(--gold); color:#e6edf3; padding:15px 25px; border-radius:12px; font-weight:bold; font-size:12px; z-index:99999; box-shadow:0 10px 30px rgba(255,202,40,0.2), inset 0 0 15px rgba(255,202,40,0.05); text-align:center; line-height:1.6; backdrop-filter:blur(8px); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity:0; margin-top:-20px; width: 85%; max-width: 320px;`;
    
    toast.innerHTML = `<div style="margin-bottom:8px;"><img src="source/icon/sub/crate.png" style="width:24px; height:24px; filter:drop-shadow(0 0 5px var(--gold));"></div>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; toast.style.marginTop = '0px'; }, 50);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.marginTop = '-20px';
    }, 2500);
    setTimeout(() => toast.remove(), 3000);
};

// === [BARU] SISTEM REGEN STAMINA & HP (SETIAP 2 MENIT) ===
setInterval(() => {
    const state = getState();
    if (!state || !state.profile) return;

    let up = { ...state.profile };
    let modified = false;

    // --- KALKULASI MAX STAMINA ---
    let maxS = up.maxStamina || 50;
    let curS = up.stamina !== undefined ? up.stamina : maxS;

    // --- KALKULASI MAX HP (Kesehatan Kapal) ---
    let maxHp = 100;
    const shipClass = up.shipClass || up.currentShip || 'INTERCEPTOR';
    if (typeof SHIPS !== 'undefined' && SHIPS[shipClass]) maxHp = SHIPS[shipClass].hp;
    const pLevel = up.level || 1;
    maxHp += (pLevel - 1) * 10;
    
    if (state.equipped) {
        Object.values(state.equipped).forEach(item => { if (item && item.stats && item.stats.hp) maxHp += Number(item.stats.hp); });
    }
    let curHp = up.currentHp !== undefined ? up.currentHp : maxHp;

    // [UPDATE MAINNET] Dipercepat dari 5 menit ke 2 menit (120,000 ms)
    const REGEN_MS = 2 * 60 * 1000; 

    // Jika Stamina belum penuh ATAU HP belum penuh
    if (curS < maxS || curHp < maxHp) {
        if (!up.lastStaminaRegen) {
            up.lastStaminaRegen = Date.now();
            modified = true;
        } else {
            const elapsed = Date.now() - up.lastStaminaRegen;
            if (elapsed >= REGEN_MS) {
                const gain = Math.floor(elapsed / REGEN_MS);
                
                // 1. Pulihkan Stamina (+1 per 2 menit)
                curS = Math.min(maxS, curS + gain);
                up.stamina = curS;
                
                // 2. Pulihkan HP Kapal (+10% per 2 menit)
                const hpGain = Math.floor(maxHp * 0.1) * gain;
                curHp = Math.min(maxHp, curHp + Math.max(1, hpGain));
                up.currentHp = curHp;

                // Majukan timer sesuai jumlah siklus yang terlewati
                up.lastStaminaRegen += gain * REGEN_MS; 
                modified = true;
            }
        }
    } else if (up.lastStaminaRegen && curS >= maxS && curHp >= maxHp) {
        up.lastStaminaRegen = null; // Matikan timer jika semuanya sudah penuh
        modified = true;
    }

    // [OPTIMASI PERFORMA BATERAI]: Update State & TopBar HANYA jika terjadi penambahan point
    if (modified) {
        updateState({ profile: up });
        updateTopBar();
    } else {
        // Jika tidak ada point bertambah, update timer visual saja (sangat ringan di CPU)
        const hangarTimerEl = document.getElementById('hangar-recovery-timer');
        if (hangarTimerEl && up.lastStaminaRegen && (curS < maxS || curHp < maxHp)) {
            const elapsed = Date.now() - up.lastStaminaRegen;
            const timeToNext = Math.max(0, REGEN_MS - elapsed);
            const m = String(Math.floor((timeToNext % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const s = String(Math.floor((timeToNext % (1000 * 60)) / 1000)).padStart(2, '0');
            hangarTimerEl.innerHTML = `<div style="font-size:11px; color:#00eaff; font-weight:bold; letter-spacing:1px; background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; border:1px solid #00eaff44;">⏳ RECOVERY SYSTEM: ${m}:${s}</div>`;
        }
    }
}, 1000); 

export const handleAttack = async (monster, event) => {
    if (isProcessingAttack) return;
    
    const initialState = getState();
    const curStamina = initialState.profile.stamina !== undefined ? initialState.profile.stamina : 50;
    
    // [UPDATE MAINNET] Syarat Stamina diturunkan dari 5 ke 2
    if (curStamina < 2) return showStaminaWarning("WARNING", "Stamina Depleted! Wait for recovery or refill in Shop.");

    isProcessingAttack = true;
    let originalBtnText = "ATTACK";
    
    if (event && event.target) {
        originalBtnText = event.target.innerText;
        event.target.disabled = true; event.target.innerText = "LOCKING ON..."; event.target.classList.add('disabled');
    }

    const shipClass = initialState.profile.shipClass || initialState.profile.currentShip || 'INTERCEPTOR';
    const baseShip = (typeof SHIPS !== 'undefined' && SHIPS[shipClass]) ? SHIPS[shipClass] : { atk: 50, crit: 5, hp: 100, def: 5, speed: 50 };

    const pLevel = initialState.profile.level || 1;
    let totalAtk = baseShip.atk + ((pLevel - 1) * 2), 
        totalCrit = baseShip.crit, 
        totalDef = baseShip.def + ((pLevel - 1) * 1), 
        totalHpMax = baseShip.hp + ((pLevel - 1) * 10), 
        totalSpeed = baseShip.speed; 
    
    if (initialState.equipped) {
        Object.values(initialState.equipped).forEach(item => {
            if (item && item.stats) {
                totalAtk += Number(item.stats.atk) || 0; totalCrit += Number(item.stats.crit) || 0; totalDef += Number(item.stats.def) || 0;
                totalHpMax += Number(item.stats.hp) || 0; totalSpeed += Number(item.stats.speed) || 0; 
            }
        });
    }

    const realStats = { atk: totalAtk, crit: totalCrit, def: totalDef, hp: totalHpMax, speed: totalSpeed };
    const result = await attackMonster(realStats, monster);
    
    if (event && event.target) {
        event.target.disabled = false; event.target.innerText = originalBtnText; event.target.classList.remove('disabled');
    }

    if (result.alreadyDead) { isProcessingAttack = false; return; }

    const playerImage = baseShip.image || 'source/ship/interceptor.png'; 
    
    showBattleAnimationPopup(playerImage, monster.image, result, () => {
        const freshState = getState(); 
        const up = { ...freshState.profile };
        
        up.gold += result.goldGained; 
        // [UPDATE MAINNET] Pengurangan Stamina diturunkan dari 5 ke 2
        up.stamina = curStamina - 2;
        if (up.currentHp === undefined) up.currentHp = realStats.hp;
        if (result.monsterDamage > 0) up.currentHp -= result.monsterDamage;

        if (up.currentHp <= 0) {
            playSFX('shipBroke'); 
            showStatusPopup("SHIP DESTROYED!", "Your ship exploded! Lost 10% Gold for emergency repairs.", "source/icon/sub/danger.png", "#ff4444");
            up.currentHp = Math.floor(realStats.hp * 0.1); up.gold = Math.max(0, Math.floor(up.gold * 0.9));
            updateState({ profile: up }); updateTopBar(); isProcessingAttack = false; return; 
        }

        if (result.isKilled || result.goldGained > 0) {
            let lootMessage = result.isKilled ? `<span style="color:var(--gold); font-size:14px; text-transform:uppercase;">VICTORY!</span><br>` : `<span style="color:var(--emerald); font-size:14px; text-transform:uppercase;">HIT SUCCESS!</span><br>`;
            
            if (result.isKilled && !up.questClaimed) {
                up.questProgress = (up.questProgress || 0) + 1;
            }

            lootMessage += `<span style="color:var(--gold);"><img src="source/item/gold.png" style="width:12px; vertical-align:-1px; margin-right:4px;">+${result.goldGained} G</span>`;
            if (result.xpGained > 0) lootMessage += ` | <span style="color:#3498db;">+${result.xpGained} XP</span>`;

            const lvlResult = checkLevelUp(up, result.xpGained);
            up.xp = lvlResult.xp; up.level = lvlResult.level; up.maxXp = lvlResult.maxXp; up.maxStamina = lvlResult.maxStamina;

            if (lvlResult.leveledUp) lootMessage += `<br><span style="color:#00eaff; font-weight:900; font-size:14px; letter-spacing:1px; text-shadow:0 0 5px #00eaff;"><img src="source/icon/sub/vip.png" style="width:16px; vertical-align:-3px; margin-right:6px;">LEVEL UP! (Lv.${up.level})</span>`;
            
            if (result.lootItem) { 
                if ((freshState.inventory || []).length < 50) {
                    const newInv = [...(freshState.inventory || []), result.lootItem]; 
                    updateState({ inventory: newInv }); 
                    lootMessage += `<br><span style="color:var(--emerald);"><img src="source/icon/sub/crate.png" style="width:14px; vertical-align:-2px; margin-right:6px;">DROP: ${result.lootItem.name} [${result.lootItem.rarity}]</span>`; 
                } else {
                    const scrapValue = 1000;
                    up.gold += scrapValue;
                    lootMessage += `<br><span style="color:#ff4444;"><img src="source/icon/sub/danger.png" style="width:14px; vertical-align:-2px; margin-right:6px;">TAS PENUH!</span><br><span style="color:#8b949e;">Item diurai jadi +${scrapValue} G.</span>`;
                }
            }
            
            if (result.lootOre > 0) { up.iron_ore = (up.iron_ore || 0) + result.lootOre; lootMessage += `<br><span style="color:#8b949e;"><img src="source/item/ore.png" style="width:14px; vertical-align:-2px; margin-right:6px;">+${result.lootOre} ORE</span>`; }
            if (result.lootEnergy > 0) { up.dark_energy = (up.dark_energy || 0) + result.lootEnergy; lootMessage += `<br><span style="color:#9b59b6;"><img src="source/item/energy.png" style="width:14px; vertical-align:-2px; margin-right:6px;">+${result.lootEnergy} ENERGY</span>`; }
            
            setTimeout(() => showLootToast(lootMessage), 200);
        }

        updateState({ profile: up }); updateTopBar();
        const hpText = document.getElementById(`hp-text-${monster.id}`); const hpBar = document.getElementById(`hp-bar-${monster.id}`);
        const finalHp = Math.max(0, monster.currentHp);
        if (hpText) hpText.innerText = `HP: ${finalHp}/${monster.hp}`;
        if (hpBar) hpBar.style.width = `${(finalHp / monster.hp) * 100}%`;
        
        isProcessingAttack = false;
    });
};

async function showBattleAnimationPopup(playerImgSrc, monsterImgSrc, result, onComplete) {
    const overlay = document.createElement('div'); 
    overlay.className = 'cinematic-overlay';
    
    overlay.innerHTML = `
        <div class="cinematic-box">
            <h3 class="cinematic-title">ENGAGING TARGET...</h3>
            <div id="anim-stage" class="cinematic-stage" style="position: relative; height: 150px; display: flex; align-items: center; justify-content: space-between;">
                <img id="anim-player" src="${playerImgSrc}" class="cinematic-ship" style="transform: scaleX(-1); z-index: 2; width: 80px;">
                <div id="damage-center-zone" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; pointer-events: none; z-index: 10;">
                    <div id="dmg-player-text" style="position: absolute; top: 20%; left: 50%; transform: translateX(-50%); opacity: 0; font-weight: 900; font-size: 24px; color: #2ecc71; text-shadow: 0 0 10px #000; transition: 0.2s;"></div>
                    <div id="dmg-monster-text" style="position: absolute; bottom: 20%; left: 50%; transform: translateX(-50%); opacity: 0; font-weight: 900; font-size: 24px; color: #ff4444; text-shadow: 0 0 10px #000; transition: 0.2s;"></div>
                </div>
                <div id="anim-vs" class="cinematic-vs" style="position: relative; z-index: 3; font-size: 14px; color: #8b949e;">VS</div>
                <img id="anim-monster" src="${monsterImgSrc}" class="cinematic-ship" style="z-index: 2; width: 80px;">
            </div>
            <div id="anim-log" class="cinematic-log">Weapon Systems Online...</div>
        </div>
    `;
    document.body.appendChild(overlay);

    const playerEl = overlay.querySelector('#anim-player'); 
    const monsterEl = overlay.querySelector('#anim-monster'); 
    const logEl = overlay.querySelector('#anim-log');
    const stageEl = overlay.querySelector('#anim-stage');
    const dmgPlayerText = overlay.querySelector('#dmg-player-text');
    const dmgMonsterText = overlay.querySelector('#dmg-monster-text');

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await sleep(300);

    logEl.innerText = "Locking onto Target..."; logEl.style.color = "#00eaff";
    await sleep(400);

    logEl.innerText = "Firing Main Laser!"; logEl.style.color = "#2ecc71";
    playerEl.style.transform = 'scaleX(-1) translateX(-15px)'; 
    playSFX('laser'); 
    
    const pLaser = document.createElement('div');
    pLaser.style.cssText = 'position:absolute; top:50%; left:20%; height:3px; background:#2ecc71; box-shadow:0 0 12px #2ecc71; border-radius:2px; z-index:1; transform:translateY(-50%);';
    stageEl.appendChild(pLaser);
    
    pLaser.animate([ { width: '0px', left: '20%' }, { width: '60%', left: '20%', offset: 0.5 }, { width: '0px', left: '80%' } ], { duration: 250 });
    await sleep(200);

    dmgPlayerText.innerText = `-${result.damageDealt}`;
    dmgPlayerText.style.opacity = '1';
    dmgPlayerText.animate([{ transform: 'translateX(-50%) scale(0.5)' }, { transform: 'translateX(-50%) scale(1.2)' }], { duration: 150, fill: 'forwards' });

    monsterEl.style.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
    monsterEl.animate([ { transform: 'translateX(0)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' } ], { duration: 200 });

    await sleep(400);
    pLaser.remove();
    playerEl.style.transform = 'scaleX(-1) translateX(0)';
    monsterEl.style.filter = '';
    dmgPlayerText.style.opacity = '0';

    if (!result.isKilled && result.monsterDamage > 0) {
        logEl.innerText = "Warning! Enemy Counter-Attack!"; logEl.style.color = "#ff4444";
        await sleep(500);

        monsterEl.style.transform = 'translateX(15px)'; 
        playSFX('laser'); 
        
        const mLaser = document.createElement('div');
        mLaser.style.cssText = 'position:absolute; top:50%; right:20%; height:3px; background:#ff4444; box-shadow:0 0 12px #ff4444; border-radius:2px; z-index:1; transform:translateY(-50%);';
        stageEl.appendChild(mLaser);

        mLaser.animate([ { width: '0px', right: '20%' }, { width: '60%', right: '20%', offset: 0.5 }, { width: '0px', right: '80%' } ], { duration: 250 });
        await sleep(200);

        dmgMonsterText.innerText = `-${result.monsterDamage}`;
        dmgMonsterText.style.opacity = '1';
        dmgMonsterText.animate([{ transform: 'translateX(-50%) scale(0.5)' }, { transform: 'translateX(-50%) scale(1.2)' }], { duration: 150, fill: 'forwards' });

        playerEl.style.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
        playerEl.animate([ { transform: 'scaleX(-1) translateX(0)' }, { transform: 'scaleX(-1) translateX(10px)' }, { transform: 'scaleX(-1) translateX(-10px)' }, { transform: 'scaleX(-1) translateX(0)' } ], { duration: 200 });

        await sleep(500);
        mLaser.remove();
        monsterEl.style.transform = 'translateX(0)';
        playerEl.style.filter = '';
        dmgMonsterText.style.opacity = '0';

    } else if (result.isKilled) {
        logEl.innerText = "Target Destroyed!"; logEl.style.color = "#ffca28";
        playSFX('monsterDie'); 
        monsterEl.animate([ { transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 } ], { duration: 500, fill: 'forwards' });
        await sleep(500);
    }

    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    await sleep(280);
    overlay.remove();
    onComplete();
}

export const updateTopBar = () => {
    const state = getState(); 
    if (!state || !state.profile) return; // Pengaman

    const goldDisplay = document.getElementById('player-gold'); 
    const stamDisplay = document.getElementById('player-stamina');
    
    const lvlBadge = document.getElementById('player-level-badge'); 
    const xpDisplay = document.getElementById('player-xp-display');
    
    let maxHp = 100; const shipClass = state.profile.shipClass || state.profile.currentShip || 'INTERCEPTOR';
    if (typeof SHIPS !== 'undefined' && SHIPS[shipClass]) maxHp = SHIPS[shipClass].hp;
    const pLevel = state.profile.level || 1;
    maxHp += (pLevel - 1) * 10;
    if (state.equipped) { Object.values(state.equipped).forEach(item => { if (item && item.stats && item.stats.hp) maxHp += Number(item.stats.hp); }); }
    
    const maxS = state.profile.maxStamina || 50;
    const curS = state.profile.stamina !== undefined ? state.profile.stamina : maxS;
    const curHp = state.profile.currentHp !== undefined ? state.profile.currentHp : maxHp;

    const hangarTimerEl = document.getElementById('hangar-recovery-timer');
    if ((curS < maxS || curHp < maxHp) && state.profile.lastStaminaRegen) {
        const elapsed = Date.now() - state.profile.lastStaminaRegen;
        // [UPDATE MAINNET] Sync top bar timer to 2 minutes
        const timeToNext = Math.max(0, (2 * 60 * 1000) - elapsed);
        
        const m = String(Math.floor((timeToNext % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const s = String(Math.floor((timeToNext % (1000 * 60)) / 1000)).padStart(2, '0');
        
        if (hangarTimerEl) {
            hangarTimerEl.innerHTML = `<div style="font-size:11px; color:#00eaff; font-weight:bold; letter-spacing:1px; background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; border:1px solid #00eaff44;">⏳ RECOVERY SYSTEM: ${m}:${s}</div>`;
        }
    } else {
        if (hangarTimerEl) hangarTimerEl.innerHTML = '';
    }

    if (goldDisplay) goldDisplay.innerText = (state.profile.gold || 0).toLocaleString();
    if (stamDisplay) stamDisplay.innerHTML = `${curS}/${maxS}`;
    
    if (lvlBadge) {
        lvlBadge.innerText = `LV. ${state.profile.level || 1}`;
    }

    if (xpDisplay) {
        const curXp = state.profile.xp || 0;
        const maxXp = state.profile.maxXp || 100;
        xpDisplay.innerText = `XP: ${curXp}/${maxXp}`;
    }
};

function showStatusPopup(title, message, iconPath, color) {
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'battle-overlay';
    const box = document.createElement('div'); box.className = 'battle-box'; box.style.borderColor = color; box.style.boxShadow = `0 0 25px ${color}`;
    box.innerHTML = `<div class="battle-icon-container"><img src="${iconPath}" class="modal-icon-md"></div><h3 style="color:${color}; margin-bottom:10px;">${title}</h3><p class="battle-text">${message}</p><button id="btn-status-ok" class="btn-battle-modal mt-20 text-black" style="background:${color};">CONTINUE</button>`;
    overlay.appendChild(box); document.body.appendChild(overlay); document.getElementById('btn-status-ok').onclick = () => overlay.remove();
}

function showStaminaWarning(title, message) {
    const exist = document.getElementById('stamina-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'stamina-popup'; overlay.className = 'battle-overlay';
    const box = document.createElement('div'); box.className = 'battle-box battle-box-stamina';
    
    box.innerHTML = `<div class="battle-icon-container"><img src="source/icon/stamina.png" class="battle-icon-stamina" onerror="this.src='source/icon/sub/danger.png'"></div><h3 class="battle-title-stamina">${title}</h3><p class="battle-text">${message}</p><button id="btn-stamina-ok" class="btn-battle-modal btn-stamina">UNDERSTOOD</button>`;
    overlay.appendChild(box); document.body.appendChild(overlay); document.getElementById('btn-stamina-ok').onclick = () => overlay.remove();
}
