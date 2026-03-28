/* =========================================
   MAP UI CONTROLLER - WEB3 & GLOBAL WORLD BOSS ($EMRLD VIP GATE)
   ========================================= */
import { MAP_DATA } from '../data/monsters.js';
import { handleAttack } from './battleUI.js';
import { getState, updateState } from '../logic/state.js'; 
import { SHIPS } from '../data/ships.js'; 
import { playSFX } from '../logic/audio.js'; 

// [UPDATE] Import EMRLD balance checker function
import { checkEmrldBalance } from '../logic/crypto.js'; 

const SUPABASE_URL = 'https://ucoiceirejfvfshqcluq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2ljZWlyZWpmdmZzaHFjbHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDMwNjIsImV4cCI6MjA4OTIxOTA2Mn0.kgCDbH5e6dvZLWm2b9FPXa51_AQq7-ZiHaD7GgpeICc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSectorIndex = 0; 
let mapTickInterval = null; 

const formatTime = (t) => { if (t < 60) return `${t}s`; return `${Math.floor(t / 60)}m ${t % 60}s`; };

export const initMap = async () => {
    const container = document.getElementById('map-list');
    if (!container) return;
    if (mapTickInterval) clearInterval(mapTickInterval);
    
    const state = getState();
    const pLevel = state.profile.level || 1;

    container.innerHTML = `
        <div style="text-align:center; padding:60px 20px; animation: pulse 1.5s infinite;">
            <h3 style="color:var(--emerald); margin-bottom:10px; font-size:18px; letter-spacing:2px;">
                <img src="source/icon/sub/radar.png" style="width:22px; vertical-align:-3px; margin-right:8px;">SCANNING GALAXY...
            </h3>
            <p style="color:#8b949e; font-size:12px;">Syncing Radar & Solana Wallet Signals</p>
        </div>
    `;

    // [UPDATE]: Fetch $EMRLD Balance from Blockchain
    let emrldBalance = 0;
    try {
        if (typeof checkEmrldBalance === 'function') {
            emrldBalance = await checkEmrldBalance();
        }
    } catch (err) {
        console.error("Failed to read $EMRLD balance:", err);
    }

    let bossData = null;
    try {
        const { data, error } = await supabase.from('global_bosses').select('*').eq('id', 1).single();
        if (data && !error) bossData = data;
    } catch (e) { console.error("Boss Radar Error:", e); }

    container.innerHTML = ''; 

    if (bossData && bossData.hp > 0 && bossData.is_active) {
        const bossPanel = document.createElement('div');
        const hpPercent = Math.max(0, (bossData.hp / bossData.max_hp) * 100);
        
        bossPanel.style.cssText = "border: 1px solid #ff4444; border-radius: 8px; margin-bottom: 20px; background: #161b22; padding: 15px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(255, 68, 68, 0.2);";
        bossPanel.innerHTML = `
            <div style="color: #ff4444; font-weight: 900; letter-spacing: 2px; font-size: 14px; margin-bottom: 8px; text-transform: uppercase;">
                <img src="source/icon/sub/danger.png" style="width:16px; vertical-align:-2px; margin-right:6px;">
                GLOBAL MMO RAID
                <img src="source/icon/sub/danger.png" style="width:16px; vertical-align:-2px; margin-left:6px;">
            </div>
            <img src="source/monster/monster11.png" onerror="this.src='source/monster/monster11.png'" style="height: 120px; object-fit: contain; filter: drop-shadow(0 0 20px rgba(255, 68, 68, 0.6)); margin-bottom: 10px; animation: float 3s ease-in-out infinite;">
            <h3 style="color: #e6edf3; margin-bottom: 8px; font-size: 18px;">${bossData.name}</h3>
            <div style="font-size: 12px; color: #ffca28; margin-bottom: 5px; font-weight: bold;">SERVER HP: ${bossData.hp.toLocaleString()} / ${bossData.max_hp.toLocaleString()}</div>
            <div style="width: 100%; background: #0d1117; height: 8px; border-radius: 4px; margin-bottom: 15px; border: 1px solid #30363d; overflow:hidden;">
                <div style="width: ${hpPercent}%; background: #ff4444; height: 100%; box-shadow: 0 0 10px #ff4444;"></div>
            </div>
            <button id="btn-attack-boss" class="btn-action red mb-0" style="width: 100%; font-size:12px; padding:12px;">ENGAGE BOSS (-5 STAMINA)</button>
        `;
        container.appendChild(bossPanel);

        setTimeout(() => {
            const btnBoss = document.getElementById('btn-attack-boss');
            if (!btnBoss) return;

            btnBoss.onclick = async () => {
                const freshState = getState();
                const curS = freshState.profile.stamina !== undefined ? freshState.profile.stamina : 50;
                
                if (curS < 5) return showMapWarning("WARNING", "Stamina Depleted! Wait for recovery or refill in Shop.");

                btnBoss.disabled = true;
                btnBoss.innerText = 'FIRING MAIN CANNON...';
                btnBoss.style.opacity = '0.5';

                let totalAtk = 10; let maxHp = 100;
                const shipClass = freshState.profile.shipClass || 'INTERCEPTOR';
                if (typeof SHIPS !== 'undefined' && SHIPS[shipClass]) { totalAtk = SHIPS[shipClass].atk; maxHp = SHIPS[shipClass].hp; }
                totalAtk += ((freshState.profile.level || 1) - 1) * 2; maxHp += ((freshState.profile.level || 1) - 1) * 10;
                
                if (freshState.profile.equipped) {
                    Object.values(freshState.profile.equipped).forEach(item => { 
                        if (item && item.stats && item.stats.atk) totalAtk += Number(item.stats.atk); 
                        if (item && item.stats && item.stats.hp) maxHp += Number(item.stats.hp);
                    });
                }
                
                const dmg = totalAtk * 10; 
                const bossCounterDamage = Math.floor(10 + ((freshState.profile.level || 1) * 3)); 

                try {
                    const response = await supabase.rpc('attack_global_boss', {
                        p_wallet: freshState.profile.walletAddress || 'GUEST_' + Date.now(),
                        p_username: freshState.profile.username || 'ANONYMOUS',
                        p_damage: dmg
                    });

                    if (response.error) {
                        console.error("Supabase RPC Error:", response.error);
                        showMapWarning("SYSTEM ERROR", "Failed to contact central server!");
                        btnBoss.disabled = false; btnBoss.innerText = 'ENGAGE BOSS (-5 STAMINA)'; btnBoss.style.opacity = '1';
                        return;
                    }

                    let isSuccess = false;
                    if (response.data && response.data.length > 0) {
                        isSuccess = response.data[0].success;
                    }

                    if (!isSuccess) {
                        showMapWarning("RAID ENDED", "Leviathan has already been defeated by another fleet!");
                        initMap(); return;
                    }

                    const playerImage = SHIPS && SHIPS[shipClass] ? SHIPS[shipClass].image : 'source/ships/ship1.png';
                    const bossImage = 'monster11.png'; 

                    showBossAnimation(playerImage, bossImage, dmg, bossCounterDamage, () => {
                        const up = { ...freshState.profile };
                        const goldReward = Math.floor(Math.random() * 1000) + 500; 
                        up.gold += goldReward; up.stamina -= 5;
                        
                        if (up.currentHp === undefined) up.currentHp = maxHp;
                        up.currentHp -= bossCounterDamage;

                        if (up.currentHp <= 0) {
                            playSFX('shipBroke');
                            up.currentHp = Math.floor(maxHp * 0.1); 
                            up.gold = Math.max(0, Math.floor(up.gold * 0.9));
                            showMapWarning("SHIP DESTROYED!", `Leviathan dealt <strong style="color:#ff4444">${bossCounterDamage} DMG</strong> and destroyed your ship!<br>Lost 10% Gold.`);
                        } else {
                            showMapWarning("RAID SUCCESS!", `You dealt <strong style="color:#2ecc71">${dmg.toLocaleString()} DAMAGE</strong>!<br>Leviathan counter-attacked for <strong style="color:#ff4444">${bossCounterDamage} DMG</strong>.<br>Reward: <strong style="color:var(--gold)">+${goldReward} G</strong>`);
                        }

                        updateState({ profile: up });
                        const goldDisplay = document.getElementById('player-gold');
                        if(goldDisplay) goldDisplay.innerText = up.gold.toLocaleString();
                        initMap(); 
                    });

                } catch(e) {
                    console.error("Boss Raid Error:", e);
                    showMapWarning("CONNECTION LOST", "Failed to sync damage with server.");
                    btnBoss.disabled = false; btnBoss.innerText = 'ENGAGE BOSS (-5 STAMINA)'; btnBoss.style.opacity = '1';
                }
            };
        }, 100); 
    }

    const accordionContainer = document.createElement('div');
    accordionContainer.className = 'map-accordion-container';
    
    const PLANET_ICONS = [
        'galaxy-1.png', 'galaxy-2.png', 'galaxy-3.png', 
        'galaxy-4.png', 'galaxy-5.png', 'galaxy-6.png', 
        'galaxy-7.png', 'galaxy-8.png', 'galaxy-9.png'
    ];

    MAP_DATA.forEach((loc, index) => {
        const isVipMap = loc.reqToken ? true : false;
        
        // [UPDATE]: Token Gating Logic with $EMRLD
        const isLevelLocked = pLevel < loc.minLevel;
        const isEliteLocked = isVipMap && emrldBalance < 1000000; 
        
        const isLocked = isLevelLocked || isEliteLocked; 
        const isOpen = !isLocked && index === currentSectorIndex;
        
        const mapHeader = document.createElement('div');
        mapHeader.className = `map-header-bar ${isVipMap ? 'vip' : 'normal'} ${isOpen ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
        
        const galaxyFile = PLANET_ICONS[index % PLANET_ICONS.length];
        const planetIcon = `<img src="source/icon/sub/${galaxyFile}" style="width:18px; vertical-align:-3px; margin-right:6px; filter: drop-shadow(0 0 3px rgba(46, 204, 113, 0.5));">`;
        
        const titleText = isVipMap ? `<img src="source/icon/sub/vip.png" style="width:18px; vertical-align:-3px; margin-right:6px;"> ${loc.name} (ELITE SECTOR)` : `${planetIcon} ${loc.name}`;

        let reqText = '';
        if (isVipMap) {
            reqText = `<div class="map-req-text ${isLocked ? 'req-fail' : 'req-pass-vip'}">Req: Lv.${loc.minLevel} & 1M $EMRLD</div>`;
        } else {
            reqText = `<div class="map-req-text ${isLocked ? 'req-fail' : 'req-pass'}">Req: Lv.${loc.minLevel}</div>`;
        }

        let statusIcon = isLocked ? '<img src="source/icon/sub/lock.png" style="width:16px;">' : (isOpen ? '<img src="source/icon/sub/unlock.png" style="width:16px;">' : '');

        mapHeader.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:4px;">
                <span class="map-title-text">${titleText}</span> 
                ${reqText}
            </div>
            <span class="map-icon-text">${statusIcon}</span>
        `;
        
        mapHeader.onclick = () => { 
            if (isLocked) {
                if (isLevelLocked) {
                    showMapWarning("ACCESS DENIED", `This sector is too dangerous!<br><br>Required: <strong class="text-emerald">Level ${loc.minLevel}</strong><br>Your Level: <strong style="color:#ff4444;">${pLevel}</strong>`);
                } else if (isEliteLocked) {
                    // [UPDATE WARNING] Token Gating Message
                    showMapWarning("VIP ACCESS DENIED", `Exclusive access for Token Holders!<br><br>To enter this sector, your Solana wallet must hold at least <strong style="color:var(--emerald);">1,000,000 $EMRLD</strong>.`);
                }
                return; 
            }
            currentSectorIndex = isOpen ? -1 : index; 
            initMap(); 
        };
        
        accordionContainer.appendChild(mapHeader);

        if (isOpen) {
            const monsterList = document.createElement('div');
            monsterList.className = `map-monster-list ${isVipMap ? 'vip' : 'normal'}`;

            loc.monsters.forEach(enemy => {
                enemy.minLevel = loc.minLevel; 
                const card = document.createElement('div');
                card.className = `monster-card ${enemy.isVip ? 'vip' : ''}`;
                
                if (enemy.deadUntil && enemy.deadUntil <= Date.now()) { enemy.currentHp = enemy.hp; enemy.deadUntil = null; }
                const curHp = enemy.currentHp !== undefined ? enemy.currentHp : enemy.hp;
                const hpPercent = Math.max(0, (curHp / enemy.hp) * 100);
                
                let btnText = "BATTLE";
                let isDisabled = false;

                if (enemy.deadUntil && enemy.deadUntil > Date.now()) {
                    isDisabled = true;
                    btnText = `RESPAWN (${formatTime(Math.ceil((enemy.deadUntil - Date.now()) / 1000))})`;
                }

                let minGold = Math.floor((enemy.gold || 0) * 0.15);
                let maxGold = enemy.gold || 0;

                let dropRarityText = '<span style="color:#6e7681;">Common Only</span>';
                if (enemy.isVip) { dropRarityText = '<span style="color:#ff0055;">Unc - Mythic</span>'; } 
                else if (loc.minLevel >= 10) { dropRarityText = '<span style="color:#3498db;">Com - Rare</span>'; } 
                else if (loc.minLevel >= 5) { dropRarityText = '<span style="color:#2ecc71;">Com - Unc</span>'; }

                let vipBonusText = enemy.isVip ? '<span style="color:#2ecc71; font-size:9px; margin-left:5px;">(+Drop Bonus)</span>' : '';
                let imgClass = `monster-img ${isDisabled ? 'disabled' : (enemy.isVip ? 'vip' : '')}`;
                let imgContClass = `monster-img-container ${enemy.isVip ? 'vip' : ''}`;
                let btnClass = `btn-battle ${isDisabled ? 'disabled' : (enemy.isVip ? 'vip' : 'normal')}`;

                card.innerHTML = `
                    <div class="monster-info-wrapper">
                        <div id="monster-img-container-${enemy.id}" class="${imgContClass}"><img id="monster-img-${enemy.id}" src="${enemy.image}" class="${imgClass}"></div>
                        <div class="monster-details">
                            <div class="monster-name-map" style="${enemy.isVip ? 'color: var(--gold);' : ''}">${enemy.name}</div>
                            <div class="monster-meta-map">
                                <span class="hp-text" id="hp-text-${enemy.id}">HP: ${curHp}/${enemy.hp}</span>
                                <div class="hp-bar-bg" style="margin-top:5px;"><div id="hp-bar-${enemy.id}" class="hp-bar-fill" style="width:${hpPercent}%; ${enemy.isVip ? 'background: linear-gradient(90deg, #b28d1c, #ffca28); box-shadow: 0 0 8px #ffca28;' : ''}"></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="monster-loot-box ${enemy.isVip ? 'vip-loot' : ''}">
                        <div class="loot-title">Possible Rewards</div>
                        <div class="loot-grid">
                            <div class="loot-row"><span class="loot-label"><img src="source/item/gold.png" style="width:14px; vertical-align:-2px;"> Gold</span><span class="loot-value gold">${minGold.toLocaleString()} - ${maxGold.toLocaleString()} G ${vipBonusText}</span></div>
                            <div class="loot-row"><span class="loot-label"><img src="source/icon/sub/crate.png" style="width:14px; vertical-align:-2px;"> Equipment</span><span class="loot-value item">${dropRarityText}</span></div>
                            <div class="loot-row"><span class="loot-label"><img src="source/item/ore.png" style="width:14px; vertical-align:-2px;"> Material</span><span class="loot-value ore">Ore & Energy</span></div>
                        </div>
                    </div>
                    <button id="btn-battle-${enemy.id}" class="${btnClass}" data-id="${enemy.id}" ${isDisabled ? 'disabled' : ''}>${btnText}</button>
                `;
                monsterList.appendChild(card);
            });
            accordionContainer.appendChild(monsterList);
        }
    });

    container.appendChild(accordionContainer);

    mapTickInterval = setInterval(() => {
        if (currentSectorIndex === -1) return; 
        const location = MAP_DATA[currentSectorIndex];
        location.monsters.forEach(enemy => {
            if (enemy.deadUntil) {
                const now = Date.now();
                const btn = document.getElementById(`btn-battle-${enemy.id}`);
                const img = document.getElementById(`monster-img-${enemy.id}`);
                const hpText = document.getElementById(`hp-text-${enemy.id}`);
                const hpBar = document.getElementById(`hp-bar-${enemy.id}`);

                if (now >= enemy.deadUntil) {
                    enemy.currentHp = enemy.hp; enemy.deadUntil = null;
                    if (btn) { btn.disabled = false; btn.innerText = "BATTLE"; btn.className = `btn-battle ${enemy.isVip ? 'vip' : 'normal'}`; }
                    if (img) img.className = `monster-img ${enemy.isVip ? 'vip' : ''}`;
                    if (hpText) hpText.innerText = `HP: ${enemy.hp}/${enemy.hp}`;
                    if (hpBar) hpBar.style.width = `100%`;
                } else {
                    if (btn) btn.innerText = `RESPAWN (${formatTime(Math.ceil((enemy.deadUntil - now) / 1000))})`;
                }
            }
        });
    }, 1000);

    document.querySelectorAll('.btn-battle').forEach(btn => {
        btn.onclick = (event) => {
            if (btn.disabled) return;
            const enemyId = btn.getAttribute('data-id');
            const location = MAP_DATA[currentSectorIndex];
            const targetMonster = location.monsters.find(m => m.id === enemyId);
            const stateAfter = getState();
            const pLevelAfter = stateAfter.profile.level || 1;

            if (pLevelAfter < location.minLevel) return showMapWarning("ACCESS DENIED", `Required: <strong class="text-emerald">Level ${location.minLevel}</strong>`);

            let maxHp = 100;
            const shipClass = stateAfter.profile.shipClass || stateAfter.profile.currentShip || 'INTERCEPTOR';
            if (typeof SHIPS !== 'undefined' && SHIPS[shipClass]) maxHp = SHIPS[shipClass].hp;
            maxHp += (pLevelAfter - 1) * 10;
            if (stateAfter.equipped) {
                Object.values(stateAfter.equipped).forEach(item => { if (item && item.stats && item.stats.hp) maxHp += Number(item.stats.hp); });
            }
            let curHp = stateAfter.profile.currentHp !== undefined ? stateAfter.profile.currentHp : maxHp;
            const hpPercentage = (curHp / maxHp) * 100;

            const executeAttack = () => {
                if (targetMonster) {
                    handleAttack(targetMonster, event);
                    setTimeout(() => {
                        if (targetMonster.currentHp !== undefined && targetMonster.currentHp <= 0) {
                            targetMonster.deadUntil = Date.now() + ((targetMonster.respawn || 5) * 1000);
                            btn.disabled = true; btn.className = 'btn-battle disabled';
                            const img = document.getElementById(`monster-img-${enemyId}`); if (img) img.className = 'monster-img disabled';
                            btn.innerText = `RESPAWN (${formatTime(Math.ceil((targetMonster.deadUntil - Date.now()) / 1000))})`;
                        }
                    }, 1600); 
                }
            };

            if (hpPercentage < 15) {
                showMapConfirm(
                    "CRITICAL HULL WARNING", 
                    `Your ship's hull integrity is at <strong style="color:#ff4444; font-size:16px;">${Math.floor(hpPercentage)}%</strong>!<br><br>Engaging in battle now may result in destruction. Are you sure you want to attack?`,
                    executeAttack
                );
            } else { executeAttack(); }
        };
    });
};

function showMapWarning(title, message) {
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'modal-overlay z-alert'; 
    overlay.innerHTML = `<div class="modal-box danger-box" style="border-color: #ff4444; box-shadow: 0 0 20px #ff4444;"><img src="source/icon/warning.png" class="modal-icon"><h3 class="modal-title text-danger" style="color: #ff4444;">${title}</h3><p class="modal-text" style="color:#e6edf3;">${message}</p><button id="btn-map-ok" class="btn-action red">RETURN</button></div>`;
    document.body.appendChild(overlay); document.getElementById('btn-map-ok').onclick = () => overlay.remove();
}

function showMapConfirm(title, message, onConfirm) {
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'modal-overlay z-alert'; 
    overlay.innerHTML = `
        <div class="modal-box danger-box" style="border-color: #ffca28; box-shadow: 0 0 20px rgba(255, 202, 40, 0.4);">
            <img src="source/icon/warning.png" class="modal-icon">
            <h3 class="modal-title" style="color: #ffca28;">${title}</h3>
            <p class="modal-text" style="color:#e6edf3;">${message}</p>
            <div class="flex-row mt-20">
                <button id="btn-map-cancel" class="btn-half red-outline flex-1">CANCEL</button>
                <button id="btn-map-proceed" class="btn-action flex-1 mb-0 text-black" style="background:#ffca28;">PROCEED</button>
            </div>
        </div>`;
    document.body.appendChild(overlay); 
    document.getElementById('btn-map-cancel').onclick = () => overlay.remove();
    document.getElementById('btn-map-proceed').onclick = () => { overlay.remove(); if (onConfirm) onConfirm(); };
}

// ===============================================
// ANIMASI SINEMATIK WORLD BOSS!
// ===============================================
async function showBossAnimation(playerImgSrc, bossImgSrc, playerDmg, bossDmg, onComplete) {
    const overlay = document.createElement('div'); 
    overlay.className = 'cinematic-overlay';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `
        <div class="cinematic-box" style="border-color: #ff4444; box-shadow: 0 0 30px rgba(255,0,0,0.5);">
            <h3 class="cinematic-title" style="color: #ff4444;">ENGAGING LEVIATHAN...</h3>
            <div id="anim-stage" class="cinematic-stage" style="position: relative; height: 180px; display: flex; align-items: center; justify-content: space-between;">
                
                <img id="anim-player" src="${playerImgSrc}" class="cinematic-ship" style="transform: scaleX(-1); z-index: 2; width: 80px;">
                
                <div id="damage-center-zone" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; pointer-events: none; z-index: 10;">
                    <div id="dmg-player-text" style="position: absolute; top: 10%; left: 50%; transform: translateX(-50%); opacity: 0; font-weight: 900; font-size: 28px; color: #2ecc71; text-shadow: 0 0 10px #000; transition: 0.2s;"></div>
                    <div id="dmg-monster-text" style="position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); opacity: 0; font-weight: 900; font-size: 28px; color: #ff4444; text-shadow: 0 0 10px #000; transition: 0.2s;"></div>
                </div>
                
                <img id="anim-monster" src="${bossImgSrc}" onerror="this.src='source/monster/monster11.png'" class="cinematic-ship" style="z-index: 2; width: 120px; filter: drop-shadow(0 0 15px red);">
            </div>
            <div id="anim-log" class="cinematic-log">Target Locked...</div>
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

    await sleep(400);

    logEl.innerText = "Firing Main Cannon!"; logEl.style.color = "#2ecc71";
    playerEl.style.transform = 'scaleX(-1) translateX(-15px)'; 
    if(typeof playSFX === 'function') playSFX('laser');
    
    const pLaser = document.createElement('div');
    pLaser.style.cssText = 'position:absolute; top:50%; left:25%; height:5px; background:#2ecc71; box-shadow:0 0 15px #2ecc71; border-radius:3px; z-index:1; transform:translateY(-50%);';
    stageEl.appendChild(pLaser);
    
    pLaser.animate([ { width: '0px', left: '25%' }, { width: '50%', left: '25%', offset: 0.5 }, { width: '0px', left: '75%' } ], { duration: 300 });
    await sleep(250);

    dmgPlayerText.innerText = `-${playerDmg.toLocaleString()}`;
    dmgPlayerText.style.opacity = '1';
    dmgPlayerText.animate([{ transform: 'translateX(-50%) scale(0.5)' }, { transform: 'translateX(-50%) scale(1.2)' }], { duration: 150, fill: 'forwards' });

    monsterEl.style.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5) drop-shadow(0 0 20px red)';
    monsterEl.animate([ { transform: 'translateX(0)' }, { transform: 'translateX(15px)' }, { transform: 'translateX(-15px)' }, { transform: 'translateX(0)' } ], { duration: 250 });

    await sleep(500);
    pLaser.remove();
    playerEl.style.transform = 'scaleX(-1) translateX(0)';
    monsterEl.style.filter = 'drop-shadow(0 0 15px red)';
    dmgPlayerText.style.opacity = '0';

    logEl.innerText = "Leviathan Counter-Attacks!"; logEl.style.color = "#ff4444";
    await sleep(400);

    monsterEl.style.transform = 'translateX(20px)'; 
    if(typeof playSFX === 'function') playSFX('laser');
    
    const mLaser = document.createElement('div');
    mLaser.style.cssText = 'position:absolute; top:50%; right:25%; height:8px; background:#ff4444; box-shadow:0 0 20px #ff4444; border-radius:4px; z-index:1; transform:translateY(-50%);';
    stageEl.appendChild(mLaser);

    mLaser.animate([ { width: '0px', right: '25%' }, { width: '50%', right: '25%', offset: 0.5 }, { width: '0px', right: '75%' } ], { duration: 300 });
    await sleep(250);

    dmgMonsterText.innerText = `-${bossDmg.toLocaleString()}`;
    dmgMonsterText.style.opacity = '1';
    dmgMonsterText.animate([{ transform: 'translateX(-50%) scale(0.5)' }, { transform: 'translateX(-50%) scale(1.2)' }], { duration: 150, fill: 'forwards' });

    playerEl.style.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
    playerEl.animate([ { transform: 'scaleX(-1) translateX(0)' }, { transform: 'scaleX(-1) translateX(15px)' }, { transform: 'scaleX(-1) translateX(-15px)' }, { transform: 'scaleX(-1) translateX(0)' } ], { duration: 250 });

    await sleep(600);
    mLaser.remove();
    monsterEl.style.transform = 'translateX(0)';
    playerEl.style.filter = '';
    dmgMonsterText.style.opacity = '0';

    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
    await sleep(380);
    overlay.remove();
    onComplete();
}
