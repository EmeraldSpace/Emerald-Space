/* =========================================
   INVENTORY UI CONTROLLER - POLISHED (BALANCED ECONOMY - TON READY)
   ========================================= */

import { getState, updateState } from '../logic/state.js';
import { equipItem, unequipItem } from '../logic/inventory.js';
import { dismantleItem } from '../logic/crafting.js';
import { generateItem } from '../logic/itemGenerator.js';
import { playSFX } from '../logic/audio.js'; 
import { upgradeItemLogic, UPGRADE_RULES } from '../logic/crafting.js';

let isProcessing = false;

const RARITY_COLORS = { COMMON: '#6e7681', UNCOMMON: '#2ecc71', RARE: '#3498db', EPIC: '#9b59b6', MYTHIC: '#ff0055', LEGENDARY: '#ffca28' };

// ==========================================
// [ECONOMY REBALANCE]: NEW SELL & DISMANTLE VALUES
// ==========================================
const RARITY_VALUES = { 
    COMMON: { gold: 5000, ore: 5 },          // Common drop, low value
    UNCOMMON: { gold: 15000, ore: 15 },      // Uncommon, slight profit
    RARE: { gold: 40000, ore: 30 },          // Rare, break even
    EPIC: { gold: 150000, ore: 80 },         // Epic, good profit!
    MYTHIC: { gold: 400000, ore: 200 },      // Mythic, Jackpot!
    LEGENDARY: { gold: 1500000, ore: 500 }   // Legendary, MEGA JACKPOT!
};
// ==========================================

// === TOAST NOTIFICATION SYSTEM (AUTO HIDE) ===
const showToast = (message, color = 'var(--emerald)') => {
    const exist = document.getElementById('sys-toast-ui'); if(exist) exist.remove();
    const toast = document.createElement('div');
    toast.id = 'sys-toast-ui';
    toast.style.cssText = `position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(13,17,23,0.95); border:1px solid ${color}; color:${color}; padding:10px 20px; border-radius:8px; font-weight:900; font-size:12px; z-index:99999; box-shadow:0 0 15px ${color}44; text-transform:uppercase; letter-spacing:1px; transition: opacity 0.3s; backdrop-filter:blur(5px);`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '0', 1500);
    setTimeout(() => toast.remove(), 1800);
};

export const initInventory = () => {
    const state = getState();
    const oreEl = document.getElementById('ore-count'); 
    const energyEl = document.getElementById('energy-count');
    
    if (oreEl) {
        oreEl.innerHTML = `<div class="material-btn ore-style" title="Sell Iron Ore"><img src="source/item/ore.png" class="icon-mini"> <span class="mat-label">ORE</span><span class="mat-count">${state.profile.iron_ore || 0}</span><span class="material-sell-tag">SELL</span></div>`;
        oreEl.onclick = () => showSellMaterialPopup('iron_ore', state.profile.iron_ore || 0, 2500, 'IRON ORE', 'source/item/ore.png');
    }

    if (energyEl) {
        energyEl.innerHTML = `<div class="material-btn energy-style" title="Sell Dark Energy"><img src="source/item/energy.png" class="icon-mini"> <span class="mat-label">ENERGY</span><span class="mat-count">${state.profile.dark_energy || 0}</span><span class="material-sell-tag">SELL</span></div>`;
        energyEl.onclick = () => showSellMaterialPopup('dark_energy', state.profile.dark_energy || 0, 12500, 'DARK ENERGY', 'source/item/energy.png');
    }

    const equippedContainer = document.getElementById('equipped-slots');
    if (equippedContainer) {
        equippedContainer.innerHTML = '';
        const slots = ['weapon', 'hull', 'shield', 'engine', 'cpu'];
        slots.forEach(slot => {
            const item = state.equipped ? state.equipped[slot] : null;
            const slotDiv = document.createElement('div');
            const borderColor = item ? (RARITY_COLORS[item.rarity] || 'var(--emerald)') : '#30363d';
            
            slotDiv.className = 'equip-slot'; slotDiv.style.borderColor = borderColor;
            if (item && item.rarity === 'MYTHIC') slotDiv.classList.add('glow-mythic');
            if (item && item.rarity === 'LEGENDARY') slotDiv.classList.add('glow-mythic'); 

            if (item) {
                slotDiv.innerHTML = `<img src="${item.image}" class="equip-img"><div class="equip-label" style="color:${borderColor};">${slot.toUpperCase()}</div>`;
                slotDiv.onclick = () => showActionMenu(item, true, slot);
            } else slotDiv.innerHTML = `<span class="equip-empty">${slot.toUpperCase()}</span>`;
            equippedContainer.appendChild(slotDiv);
        });
    }

    const gridContainer = document.getElementById('inventory-grid');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        const inventoryArray = state.inventory || [];
        for (let i = 0; i < 50; i++) {
            const item = inventoryArray[i];
            const box = document.createElement('div');
            const borderColor = item ? (RARITY_COLORS[item.rarity] || '#30363d') : '#30363d';
            box.className = 'inv-box'; box.style.borderColor = borderColor;

            if (item) {
                const isEquipped = Object.values(state.equipped || {}).some(eq => eq && eq.id === item.id);
                const dotColor = isEquipped ? '#2ecc71' : '#ff4444';
                if (item.rarity === 'MYTHIC' || item.rarity === 'LEGENDARY') box.classList.add('glow-mythic');
                box.innerHTML = `<img src="${item.image}" class="inv-img"><div class="inv-rarity" style="color:${borderColor};">${item.rarity.charAt(0)}</div><div class="inv-dot" style="background:${dotColor};"></div>`;
                box.onclick = () => showActionMenu(item, isEquipped, item.type.toLowerCase());
            }
            gridContainer.appendChild(box);
        }
    }

    const craftArea = document.getElementById('crafting-area');
    if (craftArea && craftArea.innerHTML.trim() === '') {
        craftArea.innerHTML = `
            <div class="craft-header"><span class="craft-title">BASIC FACTORY</span><span class="craft-cost">Cost: 2500 G + 5 ORE</span></div>
            <div class="craft-grid">
                <button class="btn-craft small" data-type="WEAPON">WEAPON</button>
                <button class="btn-craft small" data-type="HULL">HULL</button>
                <button class="btn-craft small" data-type="SHIELD">SHIELD</button>
                <button class="btn-craft large" data-type="ENGINE">ENGINE</button>
                <button class="btn-craft large" data-type="CPU">CPU</button>
            </div>`;
    }

    document.querySelectorAll('.btn-craft').forEach(btn => {
        btn.onclick = () => {
            if (isProcessing) return; 
            const targetType = btn.dataset.type;
            const s = getState();

            if (s.profile.gold < 2500 || (s.profile.iron_ore || 0) < 5) {
                return showCustomPopup("FAILED", "Not enough Gold or ORE!", "source/icon/sub/danger.png", false, null, "#ff4444");
            }
            if ((s.inventory || []).length >= 50) {
                return showCustomPopup("INVENTORY FULL", "Discard items first to make space.", "source/icon/sub/danger.png", false, null, "#ff4444");
            }

            showCustomPopup("FACTORY CONFIRMATION", `Assemble 1x <span class="text-emerald">${targetType} (COMMON)</span>?<br>Cost: <span class="text-gold">2500 G</span> + <span style="color:#3498db">5 ORE</span>`, "source/icon/warning.png", true, async () => {
                isProcessing = true;
                showCustomPopup("PROCESSING...", "Contacting factory server...", "source/icon/sub/crate.png", false, false, "var(--emerald)"); 
                await new Promise(r => setTimeout(r, 800));

                const currentS = getState();
                const updatedProfile = { ...currentS.profile };
                updatedProfile.gold -= 2500; updatedProfile.iron_ore -= 5;
                const newItem = generateItem('COMMON', targetType);
                const newInventory = [...(currentS.inventory || []), newItem];

                updateState({ profile: updatedProfile, inventory: newInventory });
                isProcessing = false; initInventory(); 
                
                const goldDisplay = document.getElementById('player-gold');
                if (goldDisplay) goldDisplay.innerText = updatedProfile.gold.toLocaleString();
                
                playSFX('craftSuccess'); 
                showCustomPopup("CRAFTING SUCCESS!", `You successfully forged:<br><br><b style="color:var(--emerald); font-size:16px;">${newItem.name}</b>`, newItem.image, false, null, "#2ecc71"); 
            }, "var(--emerald)");
        };
    });
};

function showActionMenu(item, isEquipped, slotId) {
    if (isProcessing) return;
    const oldMenu = document.getElementById('item-action-modal'); if (oldMenu) oldMenu.remove();
    
    const menu = document.createElement('div'); menu.id = 'item-action-modal'; menu.className = 'modal-overlay z-menu';
    const borderColor = RARITY_COLORS[item.rarity] || 'var(--emerald)';
    const itemValue = RARITY_VALUES[item.rarity] || RARITY_VALUES.COMMON;
    const upgradeRule = UPGRADE_RULES[item.rarity];

    let statsHTML = '<div class="item-stats-box">';
    if (item.stats) {
        if (item.stats.atk) statsHTML += `<span class="stat-badge atk"><img src="source/icon/sub/atk.png" style="width:12px; vertical-align:-2px; margin-right:3px;">ATK +${item.stats.atk}</span>`;
        if (item.stats.hp) statsHTML += `<span class="stat-badge hp"><img src="source/icon/sub/hp.png" style="width:12px; vertical-align:-2px; margin-right:3px;">HP +${item.stats.hp}</span>`;
        if (item.stats.def) statsHTML += `<span class="stat-badge def"><img src="source/icon/sub/def.png" style="width:12px; vertical-align:-2px; margin-right:3px;">DEF +${item.stats.def}</span>`;
        if (item.stats.speed) statsHTML += `<span class="stat-badge speed"><img src="source/icon/sub/speed.png" style="width:12px; vertical-align:-2px; margin-right:3px;">SPD +${item.stats.speed}</span>`;
        if (item.stats.crit) statsHTML += `<span class="stat-badge crit"><img src="source/icon/sub/crit.png" style="width:12px; vertical-align:-2px; margin-right:3px;">CRIT +${item.stats.crit}%</span>`;
    }
    statsHTML += '</div>';

    let buttonsHTML = isEquipped ? `<button id="btn-unequip" class="btn-action red">UNEQUIP</button>` : `<button id="btn-equip" class="btn-action green">EQUIP</button>`;
    if (!isEquipped) {
        if (upgradeRule) buttonsHTML += `<button id="btn-upgrade" class="btn-action outline">UPGRADE TO ${upgradeRule.next}<br><span style="font-size:9px; font-weight:normal;">Req: 1 Dup, ${upgradeRule.ore} ORE, ${upgradeRule.energy} NRG | Chance: ${upgradeRule.chance}%</span></button>`;
        buttonsHTML += `<div class="flex-row"><button id="btn-sell" class="btn-half yellow flex-1">SELL<br>(${itemValue.gold.toLocaleString()} G)</button><button id="btn-dismantle" class="btn-half blue flex-1">DISMANTLE</button></div>`;
    }

    menu.innerHTML = `<div class="modal-box action-menu" style="border-color: ${borderColor}; box-shadow: 0 0 30px ${borderColor}55;"><h3 class="modal-title" style="color:${borderColor}; margin-bottom:5px;">${item.name}</h3><p class="modal-subtext" style="margin-bottom:10px;">Type: ${item.type} | Rarity: <span style="color:${borderColor}">${item.rarity}</span></p>${statsHTML} ${buttonsHTML}<button id="btn-cancel" class="btn-action outline-gray">CANCEL</button></div>`;
    document.body.appendChild(menu); document.getElementById('btn-cancel').onclick = () => menu.remove();

    if (isEquipped) {
        document.getElementById('btn-unequip').onclick = () => { 
            const result = unequipItem(slotId); 
            menu.remove(); 
            if(result && !result.success) { showCustomPopup("FAILED", result.message, "source/icon/sub/danger.png", false, null, "#ff4444"); } 
            else { playSFX('click'); initInventory(); showToast('ITEM UNEQUIPPED', '#8b949e'); }
        };
    } else {
        document.getElementById('btn-equip').onclick = () => { 
            equipItem(item); playSFX('equip'); menu.remove(); initInventory(); 
            showToast(`EQUIPPED: ${item.name}`, '#2ecc71'); 
        };
           
        document.getElementById('btn-sell').onclick = () => {
            menu.remove();
            showCustomPopup("SELL CONFIRMATION", `Sell <strong>${item.name}</strong> for <span class="text-gold">${itemValue.gold.toLocaleString()} G</span>?`, "source/item/gold.png", true, async () => {
                isProcessing = true;
                const s = getState(); const up = { ...s.profile }; 
                up.gold += itemValue.gold; 
                const inv = s.inventory.filter(i => i.id !== item.id);
                updateState({ profile: up, inventory: inv }); 
                isProcessing = false; initInventory(); 
                const goldDisplay = document.getElementById('player-gold'); if (goldDisplay) goldDisplay.innerText = up.gold.toLocaleString();
                
                playSFX('sell'); 
                const popup = document.getElementById('scifi-popup'); if(popup) popup.remove();
                showToast(`+${itemValue.gold.toLocaleString()} GOLD`, 'var(--gold)'); 
            }, "var(--gold)");
        };

        document.getElementById('btn-dismantle').onclick = () => {
            menu.remove();
            showCustomPopup(
                "DISMANTLE ITEM", 
                `Are you sure you want to dismantle <b style="color:var(--emerald);">${item.name}</b>?<br><br><span style="color:#8b949e; font-size:11px;">This process will extract random crafting materials (Iron Ore / Dark Energy) based on the item's rarity.</span>`, 
                "source/icon/warning.png", 
                true, 
                async () => {
                    isProcessing = true;
                    showCustomPopup("DISMANTLING...", "Breaking down materials...", "source/icon/sub/crate.png", false, false, "#3498db");
                    const result = await dismantleItem(item);
                    isProcessing = false; initInventory(); 
                    
                    if(result.success) { 
                        playSFX('sell'); 
                        let iconPath = "source/item/ore.png";
                        let color = "#8b949e";
                        if (result.message && result.message.toUpperCase().includes("ENERGY")) {
                            iconPath = "source/item/energy.png";
                            color = "#9b59b6";
                        }
                        showCustomPopup("DISMANTLE SUCCESS", `<span style="color:${color}; font-weight:bold; font-size:14px;">${result.message}</span>`, iconPath, false, null, color);
                    } 
                    else showCustomPopup("FAILED", result.message, "source/icon/sub/danger.png", false, null, "#ff4444");
                }, 
                "#3498db"
            );
        };

        const btnUp = document.getElementById('btn-upgrade');
        if (btnUp) {
            btnUp.onclick = () => {
                const s = getState();
                // [UPDATE]: Penghapusan Filter isSOL / isTON agar upgrade bekerja untuk semua tipe item yang sama
                const duplicateItem = s.inventory.find(i => i.id !== item.id && i.type === item.type && i.rarity === item.rarity);
                const rule = UPGRADE_RULES[item.rarity];

                if (!duplicateItem) return showCustomPopup("FAILED", `Requires 1 duplicate item of ${item.type} (${item.rarity})!`, "source/icon/sub/danger.png", false, null, "#ff4444");
                if ((s.profile.iron_ore || 0) < rule.ore || (s.profile.dark_energy || 0) < rule.energy) return showCustomPopup("FAILED", `Not enough materials!`, "source/icon/sub/danger.png", false, null, "#ff4444");

                menu.remove();
                showCustomPopup("UPGRADE CONFIRMATION", `Forge this item?<br>Success Chance: <span class="text-emerald">${rule.chance}%</span>`, "source/icon/warning.png", true, async () => {
                    isProcessing = true;
                    showCustomPopup("FORGING...", "Applying extreme heat and pressure...", "source/icon/sub/crate.png", false, false, "#e67e22");
                    
                    const result = await upgradeItemLogic(item, duplicateItem);
                    
                    if (result.success) { 
                        playSFX('craftSuccess'); 
                        showCustomPopup("EVOLUTION SUCCESS!", `Item evolved to <b style="color:var(--emerald);">${result.rule.next}</b> rarity!`, "source/icon/sub/success.png", false, null, "#2ecc71"); 
                    } 
                    else { 
                        playSFX('craftFail'); 
                        showCustomPopup("UPGRADE FAILED!", "The forging process failed. Your duplicate item and materials were destroyed.", "source/icon/sub/failed.png", false, null, "#ff4444"); 
                    }
                    isProcessing = false; initInventory(); 
                }, "var(--emerald)");
            };
        }
    }
}

function showSellMaterialPopup(matKey, maxQty, pricePerUnit, matName, iconPath) {
    if (isProcessing) return;
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    if (maxQty <= 0) return showToast(`YOU HAVE NO ${matName}`, '#ff4444'); 

    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'modal-overlay z-alert';
    overlay.innerHTML = `<div class="modal-box" style="border-color: var(--gold); box-shadow: 0 0 30px rgba(255,202,40,0.3); background:#0d1117;"><h3 class="modal-title" style="color:var(--gold); text-shadow: 0 0 10px var(--gold);">SELL ${matName}</h3><img src="${iconPath}" class="modal-icon" style="filter:drop-shadow(0 0 10px var(--gold));"><div style="margin-bottom: 15px; display: flex; justify-content: center; align-items: center; gap: 10px;"><button id="btn-sell-min" style="width: 30px; height: 30px; background: #161b22; color: #fff; border: 1px solid #30363d; font-weight:bold;">-</button><input type="number" id="sell-input-qty" value="1" min="1" max="${maxQty}" style="width: 60px; text-align: center; padding: 5px; background: #0d1117; color: #fff; border: 1px solid var(--gold); font-weight: bold;"><button id="btn-sell-plus" style="width: 30px; height: 30px; background: #161b22; color: #fff; border: 1px solid #30363d; font-weight:bold;">+</button></div><div style="margin-bottom:10px; color:#8b949e; font-size:12px;">Max: ${maxQty}</div><div style="margin-bottom:20px; font-size:14px;">Revenue: <br><strong id="sell-total-price" style="color:var(--gold); font-size:18px;">${pricePerUnit.toLocaleString()} G</strong></div><div class="flex-row"><button id="btn-sell-cancel" class="btn-half red-outline flex-1">CANCEL</button><button id="btn-sell-confirm" class="btn-action green flex-1 mb-0 text-black" style="background:var(--gold); box-shadow:0 0 15px rgba(255,202,40,0.5);">SELL</button></div></div>`;
    document.body.appendChild(overlay);

    const inputEl = document.getElementById('sell-input-qty');
    const totalEl = document.getElementById('sell-total-price');
    const updatePrice = () => { let val = parseInt(inputEl.value) || 1; if (val > maxQty) val = maxQty; if (val < 1) val = 1; inputEl.value = val; totalEl.innerText = (val * pricePerUnit).toLocaleString() + ' G'; };

    document.getElementById('btn-sell-min').onclick = () => { inputEl.value = Math.max(1, (parseInt(inputEl.value) || 1) - 1); updatePrice(); };
    document.getElementById('btn-sell-plus').onclick = () => { inputEl.value = Math.min(maxQty, (parseInt(inputEl.value) || 1) + 1); updatePrice(); };
    inputEl.oninput = updatePrice; inputEl.onchange = updatePrice;

    document.getElementById('btn-sell-cancel').onclick = () => overlay.remove();
    document.getElementById('btn-sell-confirm').onclick = async () => {
        let sellQty = parseInt(inputEl.value) || 1; if (sellQty > maxQty) sellQty = maxQty;
        overlay.remove(); isProcessing = true;
        const s = getState(); const up = { ...s.profile };
        up[matKey] -= sellQty; up.gold += (sellQty * pricePerUnit);
        updateState({ profile: up }); 
        
        isProcessing = false; 
        
        const goldDisplay = document.getElementById('player-gold'); 
        if (goldDisplay) goldDisplay.innerText = up.gold.toLocaleString();

        const oreDisplay = document.querySelector('.ore-style .mat-count');
        if (oreDisplay && matKey === 'iron_ore') oreDisplay.innerText = up.iron_ore;

        const energyDisplay = document.querySelector('.energy-style .mat-count');
        if (energyDisplay && matKey === 'dark_energy') energyDisplay.innerText = up.dark_energy;
        
        playSFX('sell'); 
        showToast(`+${(sellQty * pricePerUnit).toLocaleString()} GOLD`, 'var(--gold)'); 
    };
}

// === FUNGSI UTAMA UNTUK POPUP BERIKON ===
function showCustomPopup(title, message, iconPath = null, isConfirm = false, onYes = null, themeColor = "var(--emerald)") {
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'modal-overlay z-alert';
    
    let btns = '';
    if (isConfirm) {
        btns = `<div class="flex-row mt-20"><button id="btn-pop-no" class="btn-half red-outline flex-1">CANCEL</button><button id="btn-pop-yes" class="btn-action green flex-1 mb-0 text-black" style="background:${themeColor}; box-shadow: 0 0 15px ${themeColor}44;">CONTINUE</button></div>`;
    } else if (onYes !== false) {
        btns = `<button id="btn-pop-ok" class="btn-action green mt-20 text-black" style="background:${themeColor}; box-shadow: 0 0 15px ${themeColor}44;">UNDERSTOOD</button>`;
    }
    
    let iconHTML = iconPath ? `<div style="display:flex; justify-content:center; margin-bottom:15px;"><img src="${iconPath}" style="width:60px; height:60px; object-fit:contain; filter:drop-shadow(0 0 15px ${themeColor}88);"></div>` : '';

    overlay.innerHTML = `<div class="modal-box" style="border-color: ${themeColor}; box-shadow: 0 0 30px ${themeColor}44; background:#0d1117;">
        ${iconHTML}
        <h3 class="modal-title" style="color:${themeColor}; text-shadow: 0 0 10px ${themeColor}66;">${title}</h3>
        <p class="modal-text" style="margin-bottom:0; color:#e6edf3;">${message}</p>
        ${btns}
    </div>`;
    
    document.body.appendChild(overlay);
    
    if(isConfirm){ 
        document.getElementById('btn-pop-no').onclick = () => overlay.remove(); 
        document.getElementById('btn-pop-yes').onclick = () => { overlay.remove(); if(onYes) onYes(); }; 
    } else if(onYes !== false) { 
        document.getElementById('btn-pop-ok').onclick = () => { overlay.remove(); if(typeof onYes === 'function') onYes(); }; 
    }
}
