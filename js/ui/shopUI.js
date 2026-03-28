/* =========================================
   SHOP UI CONTROLLER - PURE SOL (WEB3 GACHA & GOLD)
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

// FITUR BARU: Update UI Toko tanpa menghancurkan elemen DOM
const refreshShopUI = () => {
    const state = getState();
    
    // 1. Update teks Gold di atas layar
    const goldDisplay = document.getElementById('player-gold');
    if (goldDisplay) goldDisplay.innerText = state.profile.gold.toLocaleString();

    // 2. Cek ulang semua tombol item normal, matikan jika Gold tidak cukup atau Stamina Penuh
    document.querySelectorAll('.btn-buy').forEach(btn => {
        const itemKey = btn.dataset.item;
        const itemData = SHOP_ITEMS[itemKey];
        const currentPrice = parseInt(btn.dataset.price) || itemData.price;

        let canAfford = false;
        if (itemData.isSOL) {
            canAfford = true; // Web3 akan dicek oleh Phantom
        } else {
            canAfford = state.profile.gold >= currentPrice;
        }

        const maxS = state.profile.maxStamina || 50;
        const curS = state.profile.stamina !== undefined ? state.profile.stamina : maxS;
        const isStaminaFull = itemKey === 'STAMINA_REFILL' && curS >= maxS;

        btn.disabled = (!canAfford && !itemData.isSOL) || isStaminaFull;

        // [OPTIMASI UI]: Tombol Abu-abu (Disabled State) yang Dinamis
        if (isStaminaFull) {
            btn.innerText = 'MAXED';
            btn.style.background = '#30363d';
            btn.style.color = '#8b949e';
            btn.style.boxShadow = 'none';
            btn.style.cursor = 'not-allowed';
            btn.style.borderColor = '#30363d';
        } else if (!canAfford && !itemData.isSOL) {
            btn.innerText = 'BUY';
            btn.style.background = '#30363d';
            btn.style.color = '#8b949e';
            btn.style.boxShadow = 'none';
            btn.style.cursor = 'not-allowed';
            btn.style.borderColor = '#30363d';
        } else {
            btn.innerText = 'BUY';
            btn.style.cursor = 'pointer';
            if (itemData.isSOL) {
                btn.style.background = 'var(--gold)';
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 15px rgba(255,202,40,0.4)';
            } else {
                btn.style.background = 'var(--emerald)';
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.4)';
            }
        }

        // Perbarui nominal harga Stamina jika berubah
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
};

export const initShop = () => {
    const list = document.getElementById('shop-list');
    if (!list) return;

    const state = getState();
    list.innerHTML = ''; 

    const catBlackMarket = createShopCategory('shop-cat-bm', '<img src="source/icon/sub/dice.png" style="width:16px; vertical-align:-2px; margin-right:8px;">BLACK MARKET CRATES (WEB3)', '#ff0055', true);
    const catGold = createShopCategory('shop-cat-gold', '<img src="source/item/gold.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Buy Gold (SOL)', 'var(--gold)', true);
    const catItem = createShopCategory('shop-cat-item', '<img src="source/icon/sub/crate.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Items & Materials', '#3498db', true);
    const catEquip = createShopCategory('shop-cat-equip', '<img src="source/icon/sub/def.png" style="width:16px; vertical-align:-2px; margin-right:8px;">Ship Equipment', 'var(--emerald)', true);

    list.appendChild(catBlackMarket); 
    list.appendChild(catGold); 
    list.appendChild(catItem); 
    list.appendChild(catEquip);

    // === RENDER 4 TIER GACHA (HARGA DIUBAH KE SOL) ===
    const CRATES = [
        { id: 1, name: "BASIC CRATE", cost: 0.05, color: "#a0a0a0", desc: "Low chance for good items. Normal quantity." },
        { id: 2, name: "ADVANCED CRATE", cost: 0.1, color: "#3498db", desc: "Better odds. Higher material drops & stats." },
        { id: 3, name: "ELITE CRATE", cost: 0.2, color: "#9b59b6", desc: "Excellent chances for Epic & Mythic drops." },
        { id: 4, name: "SUPREME CRATE", cost: 0.5, color: "#ffca28", desc: "Top Tier! No Commons. High Legendary chance!" }
    ];

    CRATES.forEach(crate => {
        let btnStyle = `background:${crate.color}; color:#000; font-weight:900; letter-spacing:1px; box-shadow: 0 0 10px ${crate.color}; transition: all 0.3s;`;

        const bmItem = document.createElement('div');
        bmItem.className = 'shop-item';
        bmItem.style.cssText = `border: 2px dashed ${crate.color}; box-shadow: 0 0 15px ${crate.color}22; background: linear-gradient(45deg, #1a050f, #0d1117);`;
        
        bmItem.innerHTML = `
            <div class="shop-item-img-container" style="border-color:${crate.color}; background:#000; display:flex; justify-content:center; align-items:center;">
                <img src="source/icon/sub/crate.png" style="width:30px; height:30px; object-fit:contain; filter:drop-shadow(0 0 8px ${crate.color}); animation: pulse 1.5s infinite;">
            </div>
            <div class="shop-item-info">
                <div class="shop-item-title" style="color:${crate.color}; text-shadow: 0 0 5px ${crate.color}66;">${crate.name}</div>
                <div class="shop-item-desc" style="color:#e6edf3;">${crate.desc}</div>
                <div style="color:#8b949e; font-size:9px; margin-top:2px;">Drops: Material Bundle or Equipment</div>
            </div>
            <div class="shop-item-action">
                <div class="shop-item-price" style="color:var(--gold);">${crate.cost} SOL</div>
                <div class="shop-item-controls">
                    <button class="btn-buy-item btn-gacha-roll" data-crate="${crate.id}" data-cost="${crate.cost}" style="${btnStyle}">BUY</button>
                </div>
            </div>
        `;
        document.getElementById('shop-cat-bm').appendChild(bmItem);
    });

    setTimeout(() => {
        document.querySelectorAll('.btn-gacha-roll').forEach(btn => {
            btn.onclick = () => {
                if(typeof playSFX === 'function') playSFX('click');
                handleGachaRoll(parseInt(btn.dataset.crate), parseFloat(btn.dataset.cost));
            };
        });
    }, 50);

    // === RENDER TOKO NORMAL ===
    Object.keys(SHOP_ITEMS).forEach(key => {
        const item = SHOP_ITEMS[key];
        let isStamina = (key === 'STAMINA_REFILL');
        let isSOL = item.isSOL;
        
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
        if (isSOL) canAfford = true; 
        else canAfford = state.profile.gold >= displayPrice;

        const isMaterial = (key === 'IRON_ORE' || key === 'DARK_ENERGY' || isSOL);

        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        
        let currencyLabel = isSOL ? 'SOL' : 'G';

        if (isSOL) {
            itemEl.style.cssText = 'border: 2px solid var(--gold); box-shadow: 0 0 15px rgba(255,202,40,0.3);';
        }

        let qtyHTML = '';
        if (!isStamina && !isSOL) {
            qtyHTML = `
                <div class="qty-wrapper">
                    <button class="btn-qty minus" data-key="${key}">-</button>
                    <input type="number" id="qty-${key}" value="1" min="1" ${isMaterial ? '' : 'max="99"'} class="shop-qty-input">
                    <button class="btn-qty plus" data-key="${key}">+</button>
                </div>
            `;
        }
        
        let subtext = '';
        if (isStamina) subtext = `<div style="color:var(--emerald); font-size:9px; margin-top:2px;">Cost: 200 G / Point</div>`;
        if (isSOL) subtext = `<div style="color:var(--gold); font-size:9px; margin-top:2px;">Payment via Solana Network</div>`;

        let priceText = isStaminaFull ? 'FULL' : (isSOL ? displayPrice.toFixed(1) : displayPrice.toLocaleString()) + ' ' + currencyLabel;

        // [OPTIMASI UI]: Styling Dinamis Tombol Saat Render Pertama
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
            if (isSOL) {
                btnBg = 'var(--gold)';
                btnColor = '#000';
                btnShadow = '0 0 15px rgba(255,202,40,0.4)';
            } else {
                btnBg = 'var(--emerald)';
                btnColor = '#000';
                btnShadow = '0 0 15px rgba(46, 204, 113, 0.4)';
            }
        }

        itemEl.innerHTML = `
            <div class="shop-item-img-container" ${isSOL ? 'style="border-color:var(--gold);"' : ''}>
                <img src="${item.image}" alt="${item.name}" class="shop-item-img">
            </div>
            
            <div class="shop-item-info">
                <div class="shop-item-title" ${isSOL ? 'style="color:var(--gold);"' : ''}>${item.name}</div>
                <div class="shop-item-desc">${item.description}</div>
                ${subtext}
            </div>
            
            <div class="shop-item-action">
                <div class="shop-item-price" id="price-${key}">${priceText}</div>
                <div class="shop-item-controls">
                    ${qtyHTML}
                    <button class="btn-buy-item btn-buy" data-item="${key}" data-price="${displayPrice}" ${(!canAfford || isStaminaFull) ? 'disabled' : ''} style="background:${btnBg}; color:${btnColor}; box-shadow:${btnShadow}; cursor:${cursorStyle}; transition:all 0.3s; font-weight:900;">${btnText}</button>
                </div>
            </div>
        `;
        
        if (isSOL) document.getElementById('shop-cat-gold').appendChild(itemEl);
        else if (key === 'STAMINA_REFILL' || key === 'IRON_ORE' || key === 'DARK_ENERGY') document.getElementById('shop-cat-item').appendChild(itemEl);
        else document.getElementById('shop-cat-equip').appendChild(itemEl);
    });

    // Event Listener Input & Tombol Minus Plus
    document.querySelectorAll('.shop-qty-input').forEach(inputEl => {
        inputEl.oninput = (e) => {
            const itemKey = e.target.id.replace('qty-', '');
            const priceEl = document.getElementById(`price-${itemKey}`);
            const item = SHOP_ITEMS[itemKey];
            const isMaterial = (itemKey === 'IRON_ORE' || itemKey === 'DARK_ENERGY' || item.isSOL);
            let currency = item.isSOL ? 'SOL' : 'G';
            
            let currentVal = parseInt(e.target.value);
            if (!isMaterial && currentVal > 99) { e.target.value = 99; currentVal = 99; showToast("LIMIT: 99 ITEMS", "#ff4444"); }
            const calcVal = (isNaN(currentVal) || currentVal < 1) ? 1 : currentVal;
            if (priceEl) priceEl.innerText = (item.isSOL ? (item.price * calcVal).toFixed(1) : (item.price * calcVal).toLocaleString()) + ' ' + currency;
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
            const isMaterial = (itemKey === 'IRON_ORE' || itemKey === 'DARK_ENERGY' || item.isSOL);
            let currency = item.isSOL ? 'SOL' : 'G';
            
            if (!inputEl) return;
            let currentVal = parseInt(inputEl.value) || 1;
            
            if (btn.classList.contains('minus')) { currentVal = Math.max(1, currentVal - 1); } 
            else if (btn.classList.contains('plus')) {
                if (!isMaterial && currentVal >= 99) { showToast("LIMIT: 99 ITEMS", "#ff4444"); currentVal = 99; } 
                else currentVal += 1;
            }
            
            inputEl.value = currentVal;
            if (priceEl) priceEl.innerText = (item.isSOL ? (item.price * currentVal).toFixed(1) : (item.price * currentVal).toLocaleString()) + ' ' + currency;
        };
    });

    // Event Listener Pembelian
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.onclick = () => {
            if (isProcessingShop) return; 
            if(typeof playSFX === 'function') playSFX('click');

            const itemKey = btn.dataset.item;
            const qtyInput = document.getElementById(`qty-${itemKey}`);
            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            const itemData = SHOP_ITEMS[itemKey];
            
            let currency = itemData.isSOL ? 'SOL' : 'G';
            
            let totalCost;
            if (itemKey === 'STAMINA_REFILL') totalCost = parseInt(btn.getAttribute('data-price')) || 0;
            else if (itemData.isSOL) totalCost = itemData.price;
            else totalCost = itemData.price * qty;

            if (itemData.isSOL) {
                const goldAmount = itemData.reward; 
                if (!goldAmount) {
                    showShopPopup("SYSTEM ERROR", "Reward data is missing in server configuration. Transaction aborted.");
                    return;
                }

                showShopPopup(
                    "WEB3 SMART CONTRACT", 
                    `Initiate secure blockchain transfer for <br><strong class="text-emerald">${itemData.name}</strong><br>Cost: <strong class="text-gold">${totalCost} SOL (Devnet)</strong>? <br><br><span style="font-size:10px; color:#8b949e;">Requires Wallet Signature.</span>`, 
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
                    }
                );
                return; 
            }

            // Pembelian Item Biasa Pakai Gold
            showShopPopup(
                "CONFIRM PURCHASE", 
                `Purchase <strong class="text-emerald">${qty}x ${itemData.name}</strong> for <strong class="text-gold">${totalCost.toLocaleString()} ${currency}</strong>?`, 
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
                        
                        // [EFEK VISUAL: Animasi Sukses pada Tombol]
                        btn.innerText = 'DONE';
                        btn.style.background = '#2ecc71';
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

// ===============================================
// LOGIKA MESIN GACHA (LANGSUNG MEMOTONG SOL DARI DOMPET)
// ===============================================
const handleGachaRoll = (crateId, cost) => {
    const state = getState();

    if (state.inventory && state.inventory.length >= 50) {
        if(typeof playSFX === 'function') playSFX('craftFail');
        showShopPopup("INVENTORY FULL", `Your bag is full! Scrap or sell old items first.`, false);
        return;
    }

    const crateNames = ["BASIC CRATE", "ADVANCED CRATE", "ELITE CRATE", "SUPREME CRATE"];
    const crateName = crateNames[crateId - 1];

    showShopPopup(
        `CONFIRM GACHA (WEB3)`, 
        `Are you sure you want to buy <strong>${crateName}</strong> for <strong style="color:var(--gold);">${cost} SOL</strong>?<br><br><span style="font-size:10px; color:#ff4444;">WARNING: Requires Wallet Signature. Items are random.</span>`, 
        true, 
        async () => {
            const exist = document.getElementById('shop-popup'); if(exist) exist.remove();
            isProcessingShop = true;

            const tx = await payWithSOL(cost);

            if (tx && tx.success) {
                showUnboxingAnimation(async () => {
                    const upProfile = { ...state.profile };
                    
                    const roll = Math.random() * 100;
                    let rarity = 'COMMON'; let color = '#6e7681'; let rMult = 1;
                    
                    if (crateId === 1) { 
                        if(roll >= 99.9) { rarity='LEGENDARY'; color='#ffca28'; rMult=10; }
                        else if(roll >= 99.5) { rarity='MYTHIC'; color='#ff0055'; rMult=6; }
                        else if(roll >= 97.0) { rarity='EPIC'; color='#9b59b6'; rMult=3; }
                        else if(roll >= 88.0) { rarity='RARE'; color='#3498db'; rMult=2; }
                        else if(roll >= 60.0) { rarity='UNCOMMON'; color='#2ecc71'; rMult=1.5; }
                    } else if (crateId === 2) { 
                        if(roll >= 99.5) { rarity='LEGENDARY'; color='#ffca28'; rMult=10; }
                        else if(roll >= 97.0) { rarity='MYTHIC'; color='#ff0055'; rMult=6; }
                        else if(roll >= 90.0) { rarity='EPIC'; color='#9b59b6'; rMult=3; }
                        else if(roll >= 75.0) { rarity='RARE'; color='#3498db'; rMult=2; }
                        else if(roll >= 40.0) { rarity='UNCOMMON'; color='#2ecc71'; rMult=1.5; }
                    } else if (crateId === 3) { 
                        if(roll >= 98.0) { rarity='LEGENDARY'; color='#ffca28'; rMult=10; }
                        else if(roll >= 92.0) { rarity='MYTHIC'; color='#ff0055'; rMult=6; }
                        else if(roll >= 75.0) { rarity='EPIC'; color='#9b59b6'; rMult=3; }
                        else if(roll >= 45.0) { rarity='RARE'; color='#3498db'; rMult=2; }
                        else if(roll >= 15.0) { rarity='UNCOMMON'; color='#2ecc71'; rMult=1.5; }
                    } else if (crateId === 4) { 
                        if(roll >= 90.0) { rarity='LEGENDARY'; color='#ffca28'; rMult=10; } 
                        else if(roll >= 70.0) { rarity='MYTHIC'; color='#ff0055'; rMult=6; } 
                        else if(roll >= 40.0) { rarity='EPIC'; color='#9b59b6'; rMult=3; } 
                        else if(roll >= 10.0) { rarity='RARE'; color='#3498db'; rMult=2; } 
                        else { rarity='UNCOMMON'; color='#2ecc71'; rMult=1.5; } 
                    }

                    const validKeys = Object.keys(SHOP_ITEMS).filter(k => 
                        k !== 'STAMINA_REFILL' && !SHOP_ITEMS[k].isSOL
                    );
                    
                    const randomKey = validKeys.length > 0 ? validKeys[Math.floor(Math.random() * validKeys.length)] : null;
                    const baseItem = randomKey ? SHOP_ITEMS[randomKey] : { name: 'Mystery Item', type: 'item', image: 'source/icon/sub/crate.png' };
                    
                    const isMaterial = (randomKey === 'IRON_ORE' || randomKey === 'DARK_ENERGY');
                    
                    let popupMsg = '';
                    let finalStatsText = '';
                    let displayItemName = '';

                    if (isMaterial) {
                        const baseQty = randomKey === 'IRON_ORE' ? 10 : 5;
                        const crateMult = [1, 2, 4, 10][crateId - 1]; 
                        const finalQty = Math.floor(baseQty * rMult * crateMult);
                        
                        if (randomKey === 'IRON_ORE') upProfile.iron_ore = (upProfile.iron_ore || 0) + finalQty;
                        if (randomKey === 'DARK_ENERGY') upProfile.dark_energy = (upProfile.dark_energy || 0) + finalQty;
                        
                        updateState({ profile: upProfile });
                        
                        popupMsg = `Material added directly to Cargo.`;
                        finalStatsText = `QUANTITY: +${finalQty}`;
                        displayItemName = `[${rarity}] ${baseItem.name} Bundle`;

                    } else {
                        const n = baseItem.name.toLowerCase();
                        let detectedType = 'weapon';
                        
                        if (n.includes('cpu') || n.includes('core') || n.includes('processor') || n.includes('ai') || n.includes('link')) detectedType = 'cpu';
                        else if (n.includes('engine') || n.includes('drive') || n.includes('thruster') || n.includes('warp')) detectedType = 'engine';
                        else if (n.includes('shield') || n.includes('barrier') || n.includes('field') || n.includes('aegis')) detectedType = 'shield';
                        else if (n.includes('hull') || n.includes('armor') || n.includes('plating') || n.includes('mesh')) detectedType = 'hull';
                        else if (n.includes('laser') || n.includes('cannon') || n.includes('plasma') || n.includes('gun') || n.includes('blaster')) detectedType = 'weapon';
                        else detectedType = baseItem.type || 'weapon';

                        const crateStatBonus = [1, 1.2, 1.5, 2][crateId - 1]; 
                        const finalStats = {};
                        let hasStats = false;

                        if (baseItem.stats) {
                            for (let s in baseItem.stats) {
                                const key = s.toLowerCase(); 
                                const val = Math.floor(baseItem.stats[s] * rMult * crateStatBonus);
                                if (val > 0) {
                                    finalStats[key] = val;
                                    hasStats = true;
                                }
                            }
                        }

                        if (!hasStats) {
                            const baseVal = Math.floor(Math.random() * 5) + 10; 
                            const val = Math.floor(baseVal * rMult * crateStatBonus);
                            
                            if (detectedType === 'cpu') finalStats.crit = Math.max(1, Math.floor(val / 4)); 
                            else if (detectedType === 'engine') finalStats.speed = val;
                            else if (detectedType === 'shield') finalStats.def = val;
                            else if (detectedType === 'hull') finalStats.hp = val * 10;
                            else finalStats.atk = val;
                        }

                        displayItemName = `[${rarity}] ${baseItem.name}`;

                        const newItem = {
                            id: 'bm_' + Date.now() + Math.floor(Math.random()*1000),
                            name: displayItemName, 
                            type: detectedType, 
                            rarity: rarity,
                            image: baseItem.image || 'source/icon/sub/crate.png',
                            stats: finalStats
                        };

                        const newInv = [...(state.inventory || []), newItem];
                        updateState({ profile: upProfile, inventory: newInv });

                        popupMsg = `Equipment added to Bag.`;
                        for (let k in newItem.stats) finalStatsText += `${k.toUpperCase()}: +${newItem.stats[k]} `;
                    }

                    if(typeof playSFX === 'function') {
                        if (rarity === 'MYTHIC' || rarity === 'LEGENDARY') playSFX('craftSuccess');
                        else playSFX('sell');
                    }

                    const exist2 = document.getElementById('shop-popup'); if(exist2) exist2.remove();
                    const overlay = document.createElement('div'); overlay.id = 'shop-popup'; overlay.className = 'modal-overlay z-alert';
                    overlay.innerHTML = `
                        <div class="modal-box" style="border-color: ${color}; box-shadow: 0 0 30px ${color}66; background:#0d1117; text-align:center;">
                            <h3 style="color:${color}; text-shadow: 0 0 10px ${color}; margin-bottom:5px;">${rarity} DROP!</h3>
                            <div style="color:#8b949e; font-size:10px; margin-bottom:15px;">${popupMsg}</div>
                            
                            <div style="padding:15px; background:rgba(0,0,0,0.5); border:1px solid ${color}; border-radius:8px; margin-bottom:20px;">
                                <img src="${baseItem.image}" style="width:50px; height:50px; object-fit:contain; filter:drop-shadow(0 0 15px ${color}); margin-bottom:10px; animation: floatUpAnim 2s infinite ease-in-out alternate;">
                                <div style="color:#fff; font-weight:900; font-size:14px; margin-bottom:5px;">${displayItemName}</div>
                                <div style="color:${color}; font-weight:bold; font-size:12px;">${finalStatsText}</div>
                            </div>
                            
                            <button id="btn-gacha-ok" class="btn-action" style="background:${color}; color:#000; width:100%; font-weight:bold;">CONTINUE</button>
                        </div>`;
                    document.body.appendChild(overlay);
                    document.getElementById('btn-gacha-ok').onclick = () => { overlay.remove(); refreshShopUI(); }; 
                });
            }
            
            isProcessingShop = false;
        }
    );
};

// ===============================================
// [EFEK VISUAL] ANIMASI GACHA CYBERPUNK
// ===============================================
const showUnboxingAnimation = (onComplete) => {
    const exist = document.getElementById('shop-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'shop-popup'; overlay.className = 'modal-overlay z-alert';
    
    const flashId = 'flash-fx-' + Date.now();
    
    overlay.innerHTML = `
        <div id="${flashId}" style="position:absolute; top:0; left:0; width:100%; height:100%; background:#fff; opacity:0; z-index:9999; pointer-events:none; transition: opacity 0.2s ease-out;"></div>
        <div class="modal-box" style="border-color: #ff0055; background:#000; text-align:center; overflow:hidden; position:relative; box-shadow: 0 0 40px rgba(255,0,85,0.4);">
            
            <div style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:conic-gradient(from 0deg, transparent 0deg, rgba(255,0,85,0.2) 90deg, transparent 180deg); animation: spinRadar 2s linear infinite; pointer-events:none; z-index:1;"></div>
            
            <h3 id="decrypt-text" style="color:#ff0055; position:relative; z-index:2; text-shadow: 0 0 10px #ff0055; letter-spacing:3px; margin-bottom:15px;">DECRYPTING...</h3>
            
            <img id="crate-img" src="source/icon/sub/crate.png" style="width:70px; height:70px; object-fit:contain; margin: 15px 0 25px 0; filter:drop-shadow(0 0 15px #ff0055); position:relative; z-index:2; transition: transform 0.1s;">
            
            <div style="width:100%; background:#161b22; height:10px; border-radius:5px; overflow:hidden; border:1px solid #ff0055; position:relative; z-index:2; box-shadow: inset 0 0 10px #000;">
                <div id="unboxing-bar" style="height:100%; width:0%; background:linear-gradient(90deg, #ff0055, #ffca28); box-shadow:0 0 15px #ff0055; transition: width 0.1s linear;"></div>
            </div>
        </div>
        <style>
            @keyframes spinRadar { 100% { transform: rotate(360deg); } }
        </style>`;
        
    document.body.appendChild(overlay);
    
    if(typeof playSFX === 'function') playSFX('laser'); 

    const bar = document.getElementById('unboxing-bar');
    const crate = document.getElementById('crate-img');
    const decryptText = document.getElementById('decrypt-text');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 12 + 4; 
        if (progress > 100) progress = 100;
        bar.style.width = `${progress}%`;
        
        // Animasi Crate Bergetar Hebat
        crate.style.transform = `translate(${Math.random()*6-3}px, ${Math.random()*6-3}px) scale(${1 + progress/300})`;
        
        // Teks Glitch Hacker
        if(Math.random() > 0.6) decryptText.innerText = Math.random().toString(36).substring(2, 10).toUpperCase();
        else decryptText.innerText = "DECRYPTING...";

        if (progress === 100) {
            clearInterval(interval);
            decryptText.innerText = "ACCESS GRANTED!";
            decryptText.style.color = "#2ecc71";
            crate.style.transform = "scale(1.2)";
            
            const flash = document.getElementById(flashId);
            if(flash) {
                flash.style.opacity = '1';
                setTimeout(() => flash.style.opacity = '0', 150);
            }
            
            setTimeout(() => {
                overlay.remove();
                onComplete();
            }, 400);
        }
    }, 80);
};

const showShopPopup = (title, message, isConfirm = false, onYes = null) => {
    const exist = document.getElementById('shop-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'shop-popup'; overlay.className = 'modal-overlay z-alert';
    let btns = '';
    
    if (isConfirm) {
        btns = `<div class="flex-row mt-20"><button id="btn-shop-no" class="btn-half red-outline flex-1">CANCEL</button><button id="btn-shop-yes" class="btn-action green flex-1 mb-0 text-black">CONFIRM</button></div>`;
    } else if (onYes !== false) {
        btns = `<button id="btn-shop-ok" class="btn-action green mt-20 text-black">UNDERSTOOD</button>`;
    }
    
    let iconHTML = `<img src="source/icon/warning.png" class="modal-icon">`;
    if (isConfirm || onYes === false) iconHTML = ''; 
    else if (title === "TRANSACTION SUCCESSFUL") iconHTML = `<img src="source/icon/sub/crate.png" class="modal-icon">`; 

    overlay.innerHTML = `<div class="modal-box shop-box">${iconHTML}<h3 class="text-warning-shop">${title}</h3><p class="modal-text" style="margin-bottom:0;">${message}</p>${btns}</div>`;
    document.body.appendChild(overlay);

    if(isConfirm){
        document.getElementById('btn-shop-no').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); isProcessingShop = false; };
        document.getElementById('btn-shop-yes').onclick = async function() { 
            if(typeof playSFX === 'function') playSFX('click');
            this.disabled = true; this.innerText = "PROCESSING..."; this.style.background = "#6e7681"; this.style.color = "#fff";
            document.getElementById('btn-shop-no').style.display = 'none';
            
            if(onYes) await onYes(); 
        };
    } else if (onYes !== false) {
        document.getElementById('btn-shop-ok').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); };
    }
};
