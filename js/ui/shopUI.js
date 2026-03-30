/* =========================================
   SHOP UI CONTROLLER - SOLANA NETWORK (WEB3 GACHA & GOLD)
   ========================================= */

import { buyMaterial, SHOP_ITEMS } from '../logic/shop.js';
import { getState, updateState } from '../logic/state.js';
import { payWithSOL } from '../logic/crypto.js'; 
import { playSFX } from '../logic/audio.js'; 

let isProcessingShop = false;

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

const createShopCategory = (id, title, color, isOpen = true) => {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '15px';

    const header = document.createElement('div');
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 2px solid ${color}; padding-bottom: 8px; margin-top: 15px; margin-bottom: 10px; transition: opacity 0.2s;`;
    header.onmouseenter = () => header.style.opacity = '0.7';
    header.onmouseleave = () => header.style.opacity = '1';

    header.innerHTML = `
        <h3 style="color:${color}; margin: 0; font-size: 14px; text-transform:uppercase; letter-spacing:1px; font-weight:900; display:flex; align-items:center;">${title}</h3>
        <span id="icon-${id}" style="color:${color}; font-size:12px; transition: transform 0.3s;">${isOpen ? '▼' : '▶'}</span>
    `;

    const content = document.createElement('div');
    content.id = id;
    content.style.cssText = `display: ${isOpen ? 'flex' : 'none'}; flex-direction: column; gap: 12px; animation: fadeIn 0.3s ease-in-out;`;

    header.onclick = () => {
        if(typeof playSFX === 'function') playSFX('click');
        const isCurrentlyOpen = content.style.display !== 'none';
        content.style.display = isCurrentlyOpen ? 'none' : 'flex';
        document.getElementById(`icon-${id}`).innerText = isCurrentlyOpen ? '▶' : '▼';
    };

    wrapper.appendChild(header); wrapper.appendChild(content);
    return wrapper;
};

const refreshShopUI = () => {
    const state = getState();
    
    // Refresh Gold
    const goldDisplay = document.getElementById('player-gold');
    if (goldDisplay) goldDisplay.innerText = state.profile.gold.toLocaleString();

    // Refresh Virtual Balances (Hanya V-SOL yang tersisa)
    const shopVSolDisplay = document.getElementById('shop-vsol');
    if (shopVSolDisplay) shopVSolDisplay.innerText = (state.profile.virtualSol || 0).toFixed(4);

    // Update Normal Items
    document.querySelectorAll('.btn-buy').forEach(btn => {
        const itemKey = btn.dataset.item;
        const itemData = SHOP_ITEMS[itemKey];
        const currentPrice = parseInt(btn.dataset.price) || itemData.price;
        
        const isCrypto = itemData.isSOL === true;

        let canAfford = false;
        if (isCrypto) canAfford = true; 
        else canAfford = state.profile.gold >= currentPrice;

        const maxS = state.profile.maxStamina || 50;
        const curS = state.profile.stamina !== undefined ? state.profile.stamina : maxS;
        const isStaminaFull = itemKey === 'STAMINA_REFILL' && curS >= maxS;

        btn.disabled = (!canAfford && !isCrypto) || isStaminaFull;

        if (isStaminaFull) {
            btn.innerText = 'MAXED';
            btn.style.background = '#30363d';
            btn.style.color = '#8b949e';
            btn.style.boxShadow = 'none';
            btn.style.cursor = 'not-allowed';
            btn.style.borderColor = '#30363d';
        } else if (!canAfford && !isCrypto) {
            btn.innerText = 'BUY';
            btn.style.background = '#30363d';
            btn.style.color = '#8b949e';
            btn.style.boxShadow = 'none';
            btn.style.cursor = 'not-allowed';
            btn.style.borderColor = '#30363d';
        } else {
            btn.innerText = 'BUY';
            btn.style.cursor = 'pointer';
            if (isCrypto) {
                btn.style.background = '#14F195'; 
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 15px rgba(20, 241, 149, 0.4)';
                btn.style.border = 'none';
            } else {
                btn.style.background = 'var(--emerald)';
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.4)';
            }
        }

        if (itemKey === 'STAMINA_REFILL') {
            const priceEl = document.getElementById(`price-${itemKey}`);
            if (priceEl) {
                if (isStaminaFull) {
                    priceEl.innerText = 'FULL';
                } else {
                    const missing = maxS - curS;
                    priceEl.innerText = (missing * 200).toLocaleString() + ' G';
                    btn.dataset.price = missing * 200;
                }
            }
        }
    });

    // Update Exchange Items
    document.querySelectorAll('.btn-exchange').forEach(btn => {
        const cost = parseFloat(btn.dataset.cost);
        const vSol = state.profile.virtualSol || 0;
        const btnColor = btn.dataset.color;

        if (vSol < cost) {
            btn.disabled = true;
            btn.style.background = '#30363d';
            btn.style.color = '#8b949e';
            btn.style.boxShadow = 'none';
            btn.style.cursor = 'not-allowed';
            btn.innerText = 'NOT ENOUGH V-SOL';
        } else {
            btn.disabled = false;
            btn.style.background = btnColor;
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 10px ${btnColor}`;
            btn.style.cursor = 'pointer';
            btn.innerText = 'EXCHANGE';
        }
    });
};

export const initShop = () => {
    const list = document.getElementById('shop-list');
    if (!list) return;

    const state = getState();
    list.innerHTML = ''; 

    const catExchange = createShopCategory('shop-cat-exchange', '<img src="source/icon/sub/dice.png" style="width:16px; vertical-align:-2px; margin-right:8px;">V-SOL EXCHANGE', '#ffca28', true);
    const catGold = createShopCategory('shop-cat-gold', '<img src="source/item/gold.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Buy Gold (SOL)', '#14F195', true);
    const catItem = createShopCategory('shop-cat-item', '<img src="source/icon/sub/crate.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Items & Materials', '#3498db', true);
    const catEquip = createShopCategory('shop-cat-equip', '<img src="source/icon/sub/def.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Ship Equipment', 'var(--emerald)', true);

    list.appendChild(catExchange); 
    list.appendChild(catGold); 
    list.appendChild(catItem); 
    list.appendChild(catEquip);

    // === RENDER LOKET PENUKARAN (EXCHANGE V-SOL) PURE GOLD ===
    const EXCHANGES = [
        { id: 1, name: "500,000 GOLD", cost: 0.01, type: "GOLD", amount: 500000, color: "var(--gold)", desc: "Instant funding for your fleet upgrades." },
        { id: 2, name: "5,000,000 GOLD", cost: 0.1, type: "GOLD", amount: 5000000, color: "var(--gold)", desc: "Massive wealth accumulation." }
    ];

    EXCHANGES.forEach(ex => {
        const vSolBal = state.profile.virtualSol || 0;
        const canAfford = vSolBal >= ex.cost;
        
        let btnStyle = canAfford ? 
            `background:${ex.color}; color:#000; font-weight:900; letter-spacing:1px; box-shadow: 0 0 10px ${ex.color}; transition: all 0.3s; border:none; border-radius:4px; padding: 6px 12px; cursor:pointer;` :
            `background:#30363d; color:#8b949e; font-weight:900; letter-spacing:1px; transition: all 0.3s; border:none; border-radius:4px; padding: 6px 12px; cursor:not-allowed;`;

        const exItem = document.createElement('div');
        exItem.className = 'shop-item';
        exItem.style.cssText = `border: 1px dashed ${ex.color}; box-shadow: 0 0 15px ${ex.color}22; background: linear-gradient(45deg, #161b22, #0d1117); display:flex; align-items:center; padding:10px; margin-bottom:10px; border-radius:8px; gap:10px;`;
        
        let iconImg = "source/item/gold.png";

        exItem.innerHTML = `
            <div class="shop-item-img-container" style="border:1px solid ${ex.color}; background:#000; border-radius:6px; padding:5px; flex-shrink:0;">
                <img src="${iconImg}" style="width:35px; height:35px; object-fit:contain; filter:drop-shadow(0 0 5px ${ex.color}); animation: pulse 1.5s infinite;">
            </div>
            <div class="shop-item-info" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
                <div class="shop-item-title" style="color:${ex.color}; font-weight:bold; font-size:13px; text-shadow: 0 0 5px ${ex.color}66; margin-bottom:2px;">GET ${ex.name}</div>
                <div class="shop-item-desc" style="color:#e6edf3; font-size:10px; line-height:1.2; opacity:0.8;">${ex.desc}</div>
                <div style="color:#8b949e; font-size:9px; margin-top:4px; text-transform:uppercase;">Pay With: Virtual SOL</div>
            </div>
            <div class="shop-item-action" style="display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0;">
                <div class="shop-item-price" style="color:#14F195; font-weight:900; font-size:12px;">${ex.cost} V-SOL</div>
                <button class="btn-exchange" data-type="${ex.type}" data-amount="${ex.amount}" data-cost="${ex.cost}" data-color="${ex.color}" data-name="${ex.name}" style="${btnStyle}" ${canAfford ? '' : 'disabled'}>${canAfford ? 'EXCHANGE' : 'NOT ENOUGH V-SOL'}</button>
            </div>
        `;
        document.getElementById('shop-cat-exchange').appendChild(exItem);
    });

    setTimeout(() => {
        document.querySelectorAll('.btn-exchange').forEach(btn => {
            btn.onclick = () => {
                if (isProcessingShop || btn.disabled) return;
                if(typeof playSFX === 'function') playSFX('click');
                
                const cost = parseFloat(btn.dataset.cost);
                const type = btn.dataset.type;
                const amount = parseFloat(btn.dataset.amount);
                const name = btn.dataset.name;

                showShopPopup(
                    "CONFIRM EXCHANGE", 
                    `Swap <strong style="color:#14F195;">${cost} V-SOL</strong> to get <strong style="color:${btn.dataset.color};">${name}</strong>?`, 
                    true, 
                    async () => {
                        isProcessingShop = true;
                        const state = getState();
                        let upProfile = { ...state.profile };
                        
                        upProfile.virtualSol = (upProfile.virtualSol || 0) - cost;
                        
                        if (type === 'GOLD') {
                            upProfile.gold = (upProfile.gold || 0) + amount;
                            if(typeof playSFX === 'function') playSFX('sell');
                            showToast(`+${amount.toLocaleString()} GOLD`, 'var(--gold)');
                        }

                        updateState({ profile: upProfile });
                        refreshShopUI();

                        const popup = document.getElementById('shop-popup');
                        if(popup) popup.remove();
                        isProcessingShop = false;
                    },
                    btn.dataset.color
                );
            };
        });
    }, 50);

    // === NORMAL SHOP RENDERING ===
    Object.keys(SHOP_ITEMS).forEach(key => {
        const item = SHOP_ITEMS[key];
        let isStamina = (key === 'STAMINA_REFILL');
        
        let isCrypto = item.isSOL === true;
        
        let displayPrice = item.price;
        let isStaminaFull = false;
        
        if (isStamina) {
            const maxS = state.profile.maxStamina || 50;
            const curS = state.profile.stamina !== undefined ? state.profile.stamina : maxS;
            const missing = maxS - curS;
            displayPrice = missing * 200; 
            if (missing <= 0) { isStaminaFull = true; displayPrice = 0; }
        }

        let canAfford = false;
        if (isCrypto) canAfford = true; 
        else canAfford = state.profile.gold >= displayPrice;

        const isMaterial = (key === 'IRON_ORE' || key === 'DARK_ENERGY' || isCrypto);

        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        
        let currencyLabel = isCrypto ? 'SOL' : 'G';

        if (isCrypto) {
            itemEl.style.cssText = 'border: 1px solid #14F195; box-shadow: 0 0 15px rgba(20, 241, 149, 0.1); background:#0d1117;';
        }

        let qtyHTML = '';
        if (!isStamina && !isCrypto) {
            qtyHTML = `
                <div class="qty-wrapper" style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                    <button class="btn-qty minus" data-key="${key}" style="background:#30363d; border:none; color:#fff; width:20px; height:20px; border-radius:4px; cursor:pointer;">-</button>
                    <input type="number" id="qty-${key}" value="1" min="1" ${isMaterial ? '' : 'max="99"'} class="shop-qty-input" style="width:30px; text-align:center; background:#161b22; color:#fff; border:1px solid #30363d; border-radius:4px; font-size:10px; height:20px; outline:none;">
                    <button class="btn-qty plus" data-key="${key}" style="background:#30363d; border:none; color:#fff; width:20px; height:20px; border-radius:4px; cursor:pointer;">+</button>
                </div>
            `;
        }
        
        let subtext = '';
        if (isStamina) subtext = `<div style="color:var(--emerald); font-size:9px; margin-top:4px;">Cost: 200 G / Point</div>`;
        if (isCrypto) subtext = `<div style="color:#14F195; font-size:9px; margin-top:4px; display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:4px; height:4px; background:#14F195; border-radius:50%; box-shadow:0 0 5px #14F195;"></span> Secure SOL Transfer</div>`;

        let priceText = isStaminaFull ? 'FULL' : (isCrypto ? displayPrice.toFixed(2) : displayPrice.toLocaleString()) + ' ' + currencyLabel;

        let btnText = isStaminaFull ? 'MAXED' : 'BUY';
        let btnBg = '';
        let btnColor = '';
        let btnShadow = '';
        let cursorStyle = 'pointer';

        if (!canAfford || isStaminaFull) {
            btnBg = '#30363d';
            btnColor = '#8b949e';
            btnShadow = 'none';
            cursorStyle = 'not-allowed';
            if (!isStaminaFull) btnText = 'BUY'; 
        } else {
            if (isCrypto) {
                btnBg = '#14F195';
                btnColor = '#000';
                btnShadow = '0 0 10px rgba(20, 241, 149, 0.4)';
            } else {
                btnBg = 'var(--emerald)';
                btnColor = '#000';
                btnShadow = '0 0 10px rgba(46, 204, 113, 0.4)';
            }
        }

        itemEl.innerHTML = `
            <div class="shop-item-img-container" style="background:#0d1117; border:1px solid ${isCrypto ? '#14F195' : '#30363d'}; border-radius:6px; padding:5px;">
                <img src="${item.image}" alt="${item.name}" class="shop-item-img" style="width:35px; height:35px; object-fit:contain;">
            </div>
            
            <div class="shop-item-info" style="flex:1;">
                <div class="shop-item-title" style="color:${isCrypto ? '#14F195' : '#e6edf3'}; font-weight:bold; font-size:12px; margin-bottom:2px;">${item.name}</div>
                <div class="shop-item-desc" style="color:#8b949e; font-size:10px; line-height:1.2;">${item.description}</div>
                ${subtext}
            </div>
            
            <div class="shop-item-action" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <div class="shop-item-price" id="price-${key}" style="color:${isCrypto ? '#14F195' : 'var(--gold)'}; font-weight:900; font-size:11px;">${priceText}</div>
                <div class="shop-item-controls" style="display:flex; flex-direction:column; align-items:flex-end;">
                    ${qtyHTML}
                    <button class="btn-buy-item btn-buy" data-item="${key}" data-price="${displayPrice}" ${(!canAfford || isStaminaFull) ? 'disabled' : ''} style="background:${btnBg}; color:${btnColor}; border:none; border-radius:4px; padding:6px 16px; box-shadow:${btnShadow}; cursor:${cursorStyle}; transition:all 0.2s; font-weight:bold; font-size:10px; width:100%;">${btnText}</button>
                </div>
            </div>
        `;
        
        if (isCrypto) document.getElementById('shop-cat-gold').appendChild(itemEl);
        else if (key === 'STAMINA_REFILL' || key === 'IRON_ORE' || key === 'DARK_ENERGY') document.getElementById('shop-cat-item').appendChild(itemEl);
        else document.getElementById('shop-cat-equip').appendChild(itemEl);
    });

    document.querySelectorAll('.shop-qty-input').forEach(inputEl => {
        inputEl.oninput = (e) => {
            const itemKey = e.target.id.replace('qty-', '');
            const priceEl = document.getElementById(`price-${itemKey}`);
            const item = SHOP_ITEMS[itemKey];
            const isCrypto = item.isSOL === true;
            const isMaterial = (itemKey === 'IRON_ORE' || itemKey === 'DARK_ENERGY' || isCrypto);
            let currency = isCrypto ? 'SOL' : 'G';
            
            let currentVal = parseInt(e.target.value);
            if (!isMaterial && currentVal > 99) { e.target.value = 99; currentVal = 99; showToast("LIMIT: 99 ITEMS", "#ff4444"); }
            const calcVal = (isNaN(currentVal) || currentVal < 1) ? 1 : currentVal;
            if (priceEl) priceEl.innerText = (isCrypto ? (item.price * calcVal).toFixed(2) : (item.price * calcVal).toLocaleString()) + ' ' + currency;
        };
        inputEl.onchange = (e) => { let currentVal = parseInt(e.target.value); if (isNaN(currentVal) || currentVal < 1) e.target.value = 1; };
    });

    document.querySelectorAll('.btn-qty').forEach(btn => {
        btn.onclick = () => {
            if(typeof playSFX === 'function') playSFX('click');
            const itemKey = btn.dataset.key;
            const inputEl = document.getElementById(`qty-${itemKey}`);
            const priceEl = document.getElementById(`price-${itemKey}`);
            const item = SHOP_ITEMS[itemKey];
            const isCrypto = item.isSOL === true;
            const isMaterial = (itemKey === 'IRON_ORE' || itemKey === 'DARK_ENERGY' || isCrypto);
            let currency = isCrypto ? 'SOL' : 'G';
            
            if (!inputEl) return;
            let currentVal = parseInt(inputEl.value) || 1;
            
            if (btn.classList.contains('minus')) { currentVal = Math.max(1, currentVal - 1); } 
            else if (btn.classList.contains('plus')) {
                if (!isMaterial && currentVal >= 99) { showToast("LIMIT: 99 ITEMS", "#ff4444"); currentVal = 99; } 
                else currentVal += 1;
            }
            
            inputEl.value = currentVal;
            if (priceEl) priceEl.innerText = (isCrypto ? (item.price * currentVal).toFixed(2) : (item.price * currentVal).toLocaleString()) + ' ' + currency;
        };
    });

    // PURCHASE EVENT LISTENER
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.onclick = () => {
            if (isProcessingShop) return; 
            if(typeof playSFX === 'function') playSFX('click');

            const itemKey = btn.dataset.item;
            const qtyInput = document.getElementById(`qty-${itemKey}`);
            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const itemData = SHOP_ITEMS[itemKey];
            
            const isCrypto = itemData.isSOL === true;
            let currency = isCrypto ? 'SOL' : 'G';
            
            let totalCost;
            if (itemKey === 'STAMINA_REFILL') totalCost = parseInt(btn.getAttribute('data-price')) || 0;
            else if (isCrypto) totalCost = itemData.price;
            else totalCost = itemData.price * qty;

            if (isCrypto) {
                const goldAmount = itemData.reward; 
                if (!goldAmount) {
                    showToast("SYSTEM ERROR: REWARD DATA MISSING", "#ff4444");
                    return;
                }

                showShopPopup(
                    "WEB3 SMART CONTRACT", 
                    `Initiate secure blockchain transfer for <br><strong class="text-emerald" style="font-size:14px;">${itemData.name}</strong><br>Cost: <strong style="color:#14F195; font-size:16px;">${totalCost} SOL</strong>? <br><br><span style="font-size:10px; color:#8b949e; border-top:1px solid #30363d; padding-top:8px; display:block;">Requires Wallet Signature via Phantom/Solflare.</span>`, 
                    true, 
                    async () => {
                        isProcessingShop = true;
                        const exist = document.getElementById('shop-popup'); if(exist) exist.remove();
                        
                        const tx = await payWithSOL(totalCost);
                        
                        if (tx && tx.success) {
                            const state = getState();
                            updateState({ profile: { ...state.profile, gold: state.profile.gold + goldAmount } });
                            if(typeof playSFX === 'function') playSFX('sell');
                            showToast(`+${goldAmount.toLocaleString()} GOLD`, 'var(--gold)'); 
                            refreshShopUI(); 
                        }
                        isProcessingShop = false;
                    },
                    '#14F195' 
                );
                return; 
            }

            // Normal Purchase
            showShopPopup(
                "CONFIRM PURCHASE", 
                `Purchase <strong class="text-emerald">${qty}x ${itemData.name}</strong> for <strong style="color:var(--gold);">${totalCost.toLocaleString()} ${currency}</strong>?`, 
                true, 
                async () => {
                    isProcessingShop = true;
                    const originalText = btn.innerText;
                    btn.innerText = 'WAIT...'; 
                    btn.style.opacity = '0.5';
                    
                    const result = await buyMaterial(itemKey, qty);
                    
                    isProcessingShop = false;
                    btn.innerText = originalText; 
                    btn.style.opacity = '1';
                    
                    const popup = document.getElementById('shop-popup');
                    if (popup) popup.remove();
                    
                    if (result.success) {
                        if(typeof playSFX === 'function') playSFX('sell');
                        btn.innerText = 'DONE';
                        btn.style.background = '#2ecc71';
                        btn.style.color = '#000';
                        setTimeout(() => { refreshShopUI(); }, 500);
                        showToast(result.message, 'var(--emerald)'); 
                    } else {
                        if(typeof playSFX === 'function') playSFX('craftFail');
                        showToast(result.message, '#ff4444'); 
                    }
                }
            );
        };
    });
};

const showShopPopup = (title, message, isConfirm = false, onYes = null, customColor = 'var(--emerald)') => {
    const exist = document.getElementById('shop-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'shop-popup'; overlay.className = 'modal-overlay z-alert';
    let btns = '';
    
    if (isConfirm) {
        btns = `<div class="flex-row mt-20" style="gap:10px; display:flex;">
            <button id="btn-shop-no" class="btn-half" style="flex:1; border:1px solid #ff4444; color:#ff4444; background:transparent; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold;">CANCEL</button>
            <button id="btn-shop-yes" class="btn-action" style="flex:1; background:${customColor}; color:#000; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:900; box-shadow:0 0 15px ${customColor}66;">CONFIRM</button>
        </div>`;
    } else if (onYes !== false) {
        btns = `<button id="btn-shop-ok" class="btn-action mt-20" style="width:100%; background:${customColor}; color:#000; font-weight:900; padding:12px; border-radius:6px;">UNDERSTOOD</button>`;
    }
    
    let iconHTML = `<img src="source/icon/warning.png" class="modal-icon" style="filter:drop-shadow(0 0 5px ${customColor});">`;
    if (title.includes("SUCCESSFUL") || title.includes("DROP")) iconHTML = `<img src="source/icon/sub/crate.png" class="modal-icon" style="filter:drop-shadow(0 0 5px ${customColor});">`; 
    if (title.includes("WEB3")) iconHTML = `<img src="source/item/gold.png" class="modal-icon" style="filter:drop-shadow(0 0 10px #14F195); animation: pulse 2s infinite;">`;

    overlay.innerHTML = `
        <div class="modal-box shop-box" style="border-color:${customColor}; box-shadow:0 0 30px ${customColor}44; text-align:center;">
            ${iconHTML}
            <h3 style="color:${customColor}; margin-bottom:15px; font-size:18px; letter-spacing:1px; text-shadow:0 0 10px ${customColor}88;">${title}</h3>
            <p class="modal-text" style="color:#e6edf3; font-size:12px; line-height:1.6; margin-bottom:0;">${message}</p>
            ${btns}
        </div>`;
    
    document.body.appendChild(overlay);

    if(isConfirm){
        document.getElementById('btn-shop-no').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); isProcessingShop = false; };
        document.getElementById('btn-shop-yes').onclick = async function() { 
            if(typeof playSFX === 'function') playSFX('click');
            this.disabled = true; this.innerText = "PROCESSING..."; this.style.background = "#30363d"; this.style.color = "#8b949e"; this.style.boxShadow = "none";
            document.getElementById('btn-shop-no').style.display = 'none';
            
            if(onYes) await onYes(); 
        };
    } else if (onYes !== false) {
        document.getElementById('btn-shop-ok').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); };
    }
};
