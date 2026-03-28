/* =========================================
   HANGAR UI CONTROLLER - POLISHED (BOUNTY BOARD)
   ========================================= */
import { getState, updateState } from '../logic/state.js';
import { SHIPS } from '../data/ships.js';
import { calculateFinalStats } from '../logic/hangar.js';
import { playSFX } from '../logic/audio.js'; // Tambahkan ini agar efek suara jalan!

export const initHangar = () => {
    const state = getState();
    const shipClass = state.profile.shipClass || state.profile.currentShip || 'INTERCEPTOR';
    const shipData = SHIPS ? (SHIPS[shipClass] || SHIPS.INTERCEPTOR) : { name: "INTERCEPTOR", image: "source/ships/ship1.png", atk: 10, def: 5, hp: 100, speed: 50, crit: 0 };

    const hangarScreen = document.getElementById('screen-hangar');
    hangarScreen.innerHTML = '';

    const dashBoard = document.createElement('div');
    dashBoard.className = 'hangar-dashboard';
    dashBoard.innerHTML += `<div class="hangar-header"><h2 class="hangar-title">${shipData.name}</h2><span class="hangar-subtitle">TACTICAL STRIKE FIGHTER</span></div>`;

    const centerStage = document.createElement('div');
    centerStage.className = 'hangar-center-stage';

    const leftGear = document.createElement('div');
    leftGear.className = 'hangar-gear-col';
    leftGear.appendChild(createGearSlot(state.equipped, 'weapon'));
    leftGear.appendChild(createGearSlot(state.equipped, 'hull'));

    const shipImg = document.createElement('img');
    shipImg.src = shipData.image || 'source/ships/ship1.png';
    shipImg.className = 'hangar-ship-img';

    const rightGear = document.createElement('div');
    rightGear.className = 'hangar-gear-col';
    rightGear.appendChild(createGearSlot(state.equipped, 'shield'));
    rightGear.appendChild(createGearSlot(state.equipped, 'engine'));
    rightGear.appendChild(createGearSlot(state.equipped, 'cpu'));

    centerStage.appendChild(leftGear);
    centerStage.appendChild(shipImg);
    centerStage.appendChild(rightGear);
    dashBoard.appendChild(centerStage);

    const { displayStats } = calculateFinalStats(shipClass, state.equipped);

    const baseAtk = shipData.atk ?? 10;
    const baseDef = shipData.def ?? 5;
    const baseHp = shipData.hp ?? 100;
    const baseSpeed = shipData.speed ?? 50;
    const baseCrit = shipData.crit ?? 0; 

    let bonus = { 
        atk: displayStats.atk - baseAtk, 
        def: displayStats.def - baseDef, 
        hp: displayStats.hp - baseHp, 
        speed: displayStats.speed - baseSpeed, 
        crit: displayStats.crit - baseCrit 
    };

    const pLevel = state.profile.level || 1;
    const lvlBonusAtk = (pLevel - 1) * 2;   
    const lvlBonusDef = (pLevel - 1) * 1;   
    const lvlBonusHp = (pLevel - 1) * 10;   

    const maxHp = baseHp + lvlBonusHp + bonus.hp;
    const currentHp = state.profile.currentHp !== undefined ? state.profile.currentHp : maxHp;

    const statsGrid = document.createElement('div');
    statsGrid.className = 'hangar-stats-grid';

    // DIKEMBALIKAN KE IKON ASLI DAN WARNA ASLI
    const stats = [
        { label: 'ATTACK', base: baseAtk, lvl: lvlBonusAtk, eq: bonus.atk, maxVis: 300, color: '#ff4444', icon: 'source/icon/attack.png' },
        { label: 'DEFENSE', base: baseDef, lvl: lvlBonusDef, eq: bonus.def, maxVis: 150, color: '#44ff44', icon: 'source/icon/defense.png' },
        { label: 'H.P', base: baseHp, lvl: lvlBonusHp, eq: bonus.hp, current: currentHp, maxVis: 3000, color: '#4444ff', icon: 'source/icon/hp.png' }, 
        { label: 'SPEED', base: baseSpeed, lvl: 0, eq: bonus.speed, maxVis: 200, color: '#ffff44', icon: 'source/icon/speed.png' },
        { label: 'CRITICAL', base: baseCrit, lvl: 0, eq: bonus.crit, maxVis: 100, color: '#ffca28', icon: 'source/icon/crit.png' }
    ];

    stats.forEach(st => {
        const total = st.base + st.lvl + st.eq;
        const box = document.createElement('div');
        box.className = 'sci-fi-panel stat-box stat-box-col';
        
        box.style.borderLeft = `3px solid ${st.color}`; 
        box.style.padding = '8px'; 
        box.style.gap = '6px';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';

        let topRow = '';
        if (st.label === 'H.P') {
            topRow = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <img src="${st.icon}" style="width:14px; height:14px; filter:drop-shadow(0 0 5px ${st.color});">
                        <span style="font-size:11px; font-weight:900; color:#e6edf3; letter-spacing:0.5px;">${st.label}</span>
                    </div>
                    <div style="font-size:13px; font-weight:900; color:${st.color}; text-shadow: 0 0 8px ${st.color}88;">${st.current}/${total}</div>
                </div>
            `;
        } else {
            topRow = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <img src="${st.icon}" style="width:14px; height:14px; filter:drop-shadow(0 0 5px ${st.color});">
                        <span style="font-size:11px; font-weight:900; color:#e6edf3; letter-spacing:0.5px;">${st.label}</span>
                    </div>
                    <div style="font-size:16px; font-weight:900; color:${st.color}; text-shadow: 0 0 8px ${st.color}88;">${total}</div>
                </div>
            `;
        }

        let basePct = Math.min((st.base + st.lvl) / st.maxVis * 100, 100);
        let bonusPct = Math.min((st.eq / st.maxVis) * 100, 100 - basePct); 

        const badgeCSS = "font-size:8px; font-weight:bold; padding:3px 1px; border-radius:3px; letter-spacing:0px; border:1px solid; flex:1; text-align:center; white-space:nowrap; overflow:hidden;";
        
        const baseBadge = `<span style="${badgeCSS} background:#161b22; color:#8b949e; border-color:#30363d;">BAS:${st.base}</span>`;
        const lvlBadge = st.lvl > 0 ? `<span style="${badgeCSS} background:rgba(52, 152, 219, 0.1); color:#3498db; border-color:rgba(52, 152, 219, 0.3);">LVL:+${st.lvl}</span>` : `<span style="${badgeCSS} background:#161b22; color:#5c636a; border-color:#30363d;">LVL:0</span>`;
        const eqBadge = st.eq > 0 ? `<span style="${badgeCSS} background:rgba(46, 204, 113, 0.1); color:#2ecc71; border-color:rgba(46, 204, 113, 0.3);">EQP:+${st.eq}</span>` : `<span style="${badgeCSS} background:#161b22; color:#5c636a; border-color:#30363d;">EQP:0</span>`;

        box.innerHTML = `
            ${topRow}
            <div class="stat-bar-container" style="margin:0; background:#0d1117; height:4px; border-radius:2px; overflow:hidden; display:flex;">
                <div class="stat-bar-base" style="width: ${basePct}%; background:${st.color}aa; height:100%;"></div>
                <div class="stat-bar-bonus" style="width: ${bonusPct}%; background:${st.color}; height:100%; box-shadow: 0 0 8px ${st.color};"></div>
            </div>
            <div style="display:flex; gap:4px; justify-content:space-between; margin-top:2px; width:100%;">
                ${baseBadge}
                ${lvlBadge}
                ${eqBadge}
            </div>
        `;
        statsGrid.appendChild(box);
    });

    statsGrid.lastChild.style.gridColumn = "1 / -1";
    dashBoard.appendChild(statsGrid);

    const timerContainer = document.createElement('div');
    timerContainer.id = 'hangar-recovery-timer';
    timerContainer.style.width = '100%';
    timerContainer.style.textAlign = 'center';
    timerContainer.style.marginTop = '15px';
    timerContainer.style.marginBottom = '5px';
    dashBoard.appendChild(timerContainer);

    const missingHp = maxHp - currentHp;
    if (missingHp > 0) {
        const repairCost = missingHp * 10; 
        const repairBtn = document.createElement('button');
        repairBtn.className = 'btn-repair-hangar'; 
        // [TETAP PAKAI IKON BARU] Ikon Tombol Repair
        repairBtn.innerHTML = `<img src="source/icon/sub/repair.png" style="width:14px; vertical-align:-2px; margin-right:6px;">REPAIR HP (${repairCost} G)`;
        
        repairBtn.onclick = () => {
            const s = getState();
            if ((s.profile.gold || 0) >= repairCost) {
                if(typeof playSFX === 'function') playSFX('click');
                const exist = document.getElementById('repair-confirm-popup');
                if(exist) exist.remove();
                
                const overlay = document.createElement('div');
                overlay.id = 'repair-confirm-popup';
                overlay.className = 'repair-overlay';
                
                overlay.innerHTML = `
                    <div class="repair-box">
                        <h3 class="repair-title">Repair Confirmation</h3>
                        <p class="repair-desc">Ship hull repair cost:<br><span class="repair-cost">${repairCost} G</span></p>
                        <div class="repair-btn-group">
                            <button id="btn-rep-no" class="btn-rep-cancel">CANCEL</button>
                            <button id="btn-rep-yes" class="btn-rep-confirm">REPAIR</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                document.getElementById('btn-rep-no').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); };
                document.getElementById('btn-rep-yes').onclick = () => {
                    if(typeof playSFX === 'function') playSFX('craftSuccess');
                    overlay.remove(); 
                    const up = { ...s.profile };
                    up.gold -= repairCost;
                    up.currentHp = maxHp;
                    updateState({ profile: up });
                    initHangar(); 
                    const goldDisplay = document.getElementById('player-gold');
                    if(goldDisplay) goldDisplay.innerText = up.gold.toLocaleString();
                };
            } else {
                if(typeof playSFX === 'function') playSFX('craftFail');
                alert("Not enough Gold to perform Repair!");
            }
        };
        dashBoard.appendChild(repairBtn);
    }

    // ============================================
    // NEW: CYBERPUNK BOUNTY BOARD (DAILY QUEST)
    // ============================================
    const qProgress = state.profile.questProgress || 0;
    const qClaimed = state.profile.questClaimed || false;
    const qTarget = 5;
    let pct = Math.min((qProgress / qTarget) * 100, 100);

    const questPanel = document.createElement('div');
    questPanel.className = 'sci-fi-panel';
    
    // Styling Dasar Panel Bounty
    let panelStyle = 'margin-top: 15px; padding: 15px; border-radius: 8px; text-align: left; position: relative; overflow: hidden;';

    let questContent = '';

    if (qClaimed) {
        // STATE 1: MISI SUDAH DIAMBIL (SELESAI HARI INI)
        questPanel.style.cssText = panelStyle + 'background: #0d1117; border: 1px solid #30363d; opacity: 0.6;';
        // [TETAP PAKAI IKON BARU] Checkmark Selesai
        questContent = `
            <div style="display:flex; justify-content:space-between; align-items:center; filter: grayscale(1);">
                <div>
                    <div style="color:#8b949e; font-size:14px; font-weight:900; letter-spacing:1px; margin-bottom:2px;">
                        <img src="source/icon/sub/check.png" style="width:14px; vertical-align:-2px; margin-right:4px;">BOUNTY CLEARED
                    </div>
                    <div style="font-size:10px; color:#5c636a;">Radar is clear. New targets will be assigned tomorrow.</div>
                </div>
                <div style="font-size:24px;">
                    <img src="source/icon/sub/check.png" style="width:24px;">
                </div>
            </div>
        `;
        questPanel.innerHTML = questContent;

    } else if (qProgress >= qTarget) {
        // STATE 2: MISI SELESAI & SIAP KLAIM (HIJAU MENYALA)
        questPanel.style.cssText = panelStyle + 'background: rgba(46, 204, 113, 0.1); border: 1px solid var(--emerald); box-shadow: 0 0 20px rgba(46, 204, 113, 0.2);';
        // [TETAP PAKAI IKON BARU] Target Danger Selesai
        questContent = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="color:var(--emerald); font-size:14px; font-weight:900; letter-spacing:1px; text-shadow: 0 0 10px var(--emerald);">
                    <img src="source/icon/sub/danger.png" style="width:14px; vertical-align:-2px; margin-right:4px; filter: hue-rotate(120deg);">TARGETS ELIMINATED
                </div>
                <div style="background:var(--emerald); color:#000; font-size:9px; font-weight:900; padding:3px 8px; border-radius:4px; box-shadow: 0 0 10px var(--emerald);">READY</div>
            </div>
            <button id="btn-claim-quest" class="btn-action green mb-0" style="padding:12px; font-size:14px; width:100%; font-weight:900; animation: pulse 1.5s infinite; letter-spacing: 1px; color:#000;">CLAIM BOUNTY REWARD</button>
        `;
        questPanel.innerHTML = questContent;
        
        // Logika Tombol Klaim
        setTimeout(() => {
            const btnClaim = document.getElementById('btn-claim-quest');
            if (btnClaim) {
                btnClaim.onclick = () => {
                    if(typeof playSFX === 'function') playSFX('craftSuccess');
                    const s = getState();
                    const up = { ...s.profile };
                    up.gold = (up.gold || 0) + 15000;
                    up.iron_ore = (up.iron_ore || 0) + 15;
                    up.questClaimed = true;
                    updateState({ profile: up });
                    initHangar();
                    
                    const goldDisplay = document.getElementById('player-gold');
                    if(goldDisplay) goldDisplay.innerText = up.gold.toLocaleString();

                    // Pop Up Kemenangan Keren
                    const exist = document.getElementById('quest-popup'); if(exist) exist.remove();
                    const overlay = document.createElement('div'); overlay.id = 'quest-popup'; overlay.className = 'modal-overlay z-alert';
                    overlay.innerHTML = `
                        <div class="modal-box" style="border-color: var(--emerald); box-shadow: 0 0 30px rgba(46, 204, 113, 0.4); background:#0d1117; text-align:center;">
                            <h3 class="modal-title" style="color:var(--emerald); text-shadow: 0 0 10px var(--emerald);">BOUNTY SECURED!</h3>
                            <img src="source/icon/loot.png" style="width:60px; height:60px; margin: 10px 0; filter: drop-shadow(0 0 10px var(--emerald));">
                            <p class="modal-text" style="color:#e6edf3; font-size:13px;">Funds transferred to your account:<br><br><strong style="color:var(--gold); font-size:16px;">+15,000 G</strong><br><strong style="color:#8b949e; font-size:14px;">+15 Iron Ore</strong></p>
                            <button id="btn-q-ok" class="btn-action green mb-0 text-black" style="width:100%;">EXCELLENT</button>
                        </div>`;
                    document.body.appendChild(overlay);
                    document.getElementById('btn-q-ok').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); };
                };
            }
        }, 50);

    } else {
        // STATE 3: MISI SEDANG BERJALAN (KUNING / ORANYE)
        questPanel.style.cssText = panelStyle + 'background: rgba(255, 202, 40, 0.05); border: 1px dashed var(--gold);';
        // [TETAP PAKAI IKON BARU] Quest Scroll
        questContent = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="color:var(--gold); font-size:13px; font-weight:900; letter-spacing:1px; display:flex; align-items:center; gap:5px;">
                    <img src="source/icon/sub/quest.png" style="width:18px;"> DAILY BOUNTY
                </div>
                <div style="border:1px solid var(--gold); color:var(--gold); font-size:9px; font-weight:bold; padding:2px 6px; border-radius:3px; background:rgba(255,202,40,0.1);">ACTIVE</div>
            </div>
            
            <div style="text-align:left; font-size:11px; color:#e6edf3; margin-bottom:10px;">
                <strong>Mission:</strong> Eliminate any 5 Hostile Entities in the Galaxy Map sector.
            </div>
            
            <div style="background:#0d1117; border-radius:6px; height:16px; width:100%; border:1px solid #30363d; position:relative; overflow:hidden; box-shadow: inset 0 0 10px #000;">
                <div style="background:linear-gradient(90deg, #b28d1c, var(--gold)); width:${pct}%; height:100%; box-shadow:0 0 10px var(--gold); transition: width 0.5s ease-out;"></div>
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; text-align:center; font-size:10px; font-weight:900; color:#fff; line-height:16px; text-shadow:0 0 4px #000;">
                    ${qProgress} / ${qTarget} KILLS
                </div>
            </div>
            
            <div style="text-align:left; font-size:10px; color:#8b949e; margin-top:8px; display:flex; justify-content:space-between;">
                <span>REWARD:</span>
                <span style="font-weight:bold;"><span style="color:var(--gold);">15,000 G</span> & <span style="color:#8b949e;">15 ORE</span></span>
            </div>
        `;
        questPanel.innerHTML = questContent;
    }
    
    dashBoard.appendChild(questPanel);
    hangarScreen.appendChild(dashBoard);
};

const createGearSlot = (equipped, slotName) => {
    const item = equipped ? equipped[slotName] : null;
    const div = document.createElement('div');
    const RARITY_COLORS = { COMMON: '#6e7681', UNCOMMON: '#2ecc71', RARE: '#3498db', EPIC: '#9b59b6', MYTHIC: '#ff0055', LEGENDARY: '#ffca28' };
    const borderColor = item ? (RARITY_COLORS[item.rarity] || 'var(--emerald)') : '#30363d';
    
    div.className = 'gear-slot-hangar';
    div.style.border = `1px solid ${borderColor}`;
    div.style.boxShadow = `0 0 10px ${item ? borderColor + '60' : 'transparent'}`;

    if (item) {
        div.innerHTML = `<img src="${item.image}" class="gear-img-hangar"><div class="gear-label-equip" style="color:${borderColor};">${slotName}</div>`;
    } else {
        div.innerHTML = `<span class="gear-label-empty">${slotName}</span>`;
    }
    return div;
};
