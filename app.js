/* =========================================
   CORE APP - EMERALD SPACE (SOLANA NETWORK READY)
   ========================================= */

import { getState, updateState, loadStateFromServer, getTopPlayers, checkAndRecoverWallet, setReferrer } from './js/logic/state.js';
import { SHIPS } from './js/data/ships.js';
import { initHangar } from './js/ui/hangarUI.js';
import { initMap } from './js/ui/mapUI.js';
import { initInventory } from './js/ui/inventoryUI.js';
import { initShop } from './js/ui/shopUI.js';
import { updateTopBar as battleUpdateTopBar } from './js/ui/battleUI.js';
import { playSFX, playBGM, toggleBGM, toggleSFX } from './js/logic/audio.js';
import { initStarfield } from './js/ui/starfield.js'; 
import { connectSolanaWallet, payWithSOL, payWithEMRLD } from './js/logic/crypto.js'; 

export let connectedWalletAddress = null;

window.showSimplePopup = (title, message, color = "var(--emerald)") => {
    const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
    const overlay = document.createElement('div'); overlay.id = 'scifi-popup'; overlay.className = 'modal-overlay z-alert';
    overlay.innerHTML = `<div class="modal-box" style="border-color: ${color}; box-shadow: 0 0 20px ${color}44;"><h3 class="modal-title" style="color:${color};">${title}</h3><p class="modal-text" style="margin-bottom:0;">${message}</p><button id="btn-pop-ok" class="btn-action mt-20 text-black" style="background:${color};">UNDERSTOOD</button></div>`;
    document.body.appendChild(overlay); 
    document.getElementById('btn-pop-ok').onclick = () => { if(typeof playSFX === 'function') playSFX('click'); overlay.remove(); };
};

window.copyAddress = (targetId) => {
    if(typeof playSFX === 'function') playSFX('click');
    const addr = document.getElementById(targetId).innerText;
    navigator.clipboard.writeText(addr);
    
    const exist = document.getElementById('sys-toast'); if(exist) exist.remove();
    const toast = document.createElement('div');
    toast.id = 'sys-toast';
    toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#14F195; color:#000; padding:10px 20px; border-radius:6px; font-weight:900; font-size:12px; z-index:99999; box-shadow:0 0 15px #14F195; transition: opacity 0.5s ease-in-out; text-transform:uppercase; letter-spacing:1px;';
    toast.innerHTML = '📋 COPIED!';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '0', 2000);
    setTimeout(() => toast.remove(), 2500);
};

const switchScreen = (targetId) => {
    document.querySelectorAll('.screen').forEach(screen => { screen.style.display = 'none'; });
    const targetScreen = document.getElementById(`screen-${targetId}`);
    if (targetScreen) {
        if (targetId === 'setup') targetScreen.style.display = 'flex';
        else targetScreen.style.display = 'block';
    }

    if (targetId !== 'setup' && targetId !== 'loading') {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.target === targetId) btn.classList.add('active');
        });
        refreshUI(targetId);
    }
};

const refreshUI = (screenId) => {
    try {
        updateTopBar();
        switch (screenId) {
            case 'hangar': initHangar(); break;
            case 'map': initMap(); break;
            case 'inventory': initInventory(); break;
            case 'shop': initShop(); break;
            case 'about': initAbout(); break;
        }
    } catch (err) { console.error("Error refresh UI:", err); }
};

const updateTopBar = () => {
    const state = getState();
    const userDisplay = document.getElementById('player-username');
    if (userDisplay) userDisplay.innerText = state.profile.username || "PILOT";
    
    const vipBadge = document.getElementById('player-vip-badge');
    if (vipBadge && userDisplay) {
        if (state.profile.isElite) {
            vipBadge.style.display = 'flex'; 
            userDisplay.style.color = 'var(--gold)'; 
            userDisplay.style.textShadow = '0 0 8px rgba(255, 202, 40, 0.6)';
        } else {
            vipBadge.style.display = 'none'; 
            userDisplay.style.color = 'var(--emerald)'; 
            userDisplay.style.textShadow = '0 0 8px rgba(46, 204, 113, 0.4)';
        }
    }

    if (typeof battleUpdateTopBar === 'function') battleUpdateTopBar();
};

const checkDailyReward = () => {
    const state = getState();
    const today = new Date().toDateString();
    
    const localRewardCheck = localStorage.getItem('EMERALD_LAST_REWARD');
    if (state.profile.lastRewardDate === today || localRewardCheck === today) return;

    let streak = state.profile.loginStreak || parseInt(localStorage.getItem('EMERALD_LOGIN_STREAK') || '0');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (state.profile.lastRewardDate === yesterday.toDateString() || localRewardCheck === yesterday.toDateString()) {
        streak++;
        if (streak > 7) streak = 1; 
    } else {
        streak = 1; 
    }

    let rewardGold = streak * 1500;
    let rewardEnergy = streak === 7 ? 50 : 0; 
    
    let rewardText = `<strong style="color:var(--gold); font-size:16px;">+${rewardGold.toLocaleString()} GOLD</strong>`;
    if (rewardEnergy > 0) rewardText += `<br><strong style="color:#9b59b6; font-size:14px;">+${rewardEnergy} DARK ENERGY</strong>`;

    const overlay = document.createElement('div'); 
    overlay.id = 'daily-reward-popup'; 
    overlay.className = 'modal-overlay z-alert';
    overlay.style.zIndex = "99999";
    overlay.innerHTML = `
        <div class="modal-box" style="border-color: #3498db; box-shadow: 0 0 30px rgba(52, 152, 219, 0.4); background: #0d1117; text-align:center;">
            <h3 style="color:#3498db; margin-bottom:5px; font-size:18px; letter-spacing:1px; text-shadow: 0 0 10px #3498db;">📦 ¦ DAILY SUPPLY DROP</h3>
            <div style="color:#8b949e; font-size:12px; margin-bottom:15px; font-weight:bold;">LOGIN STREAK: DAY ${streak}/7</div>
            
            <img src="source/icon/loot.png" style="width:70px; height:70px; margin-bottom:15px; filter:drop-shadow(0 0 15px #3498db); animation: float 3s ease-in-out infinite;">
            
            <p style="color:#e6edf3; font-size:12px; line-height:1.6; margin-bottom:20px;">
                Welcome back to the command center, Pilot!<br>
                Here are your daily rations:<br><br>
                ${rewardText}
            </p>
            
            <button id="btn-claim-daily" class="btn-action" style="width:100%; background:#3498db; color:#000; font-weight:900; box-shadow: 0 0 15px #3498db;">CLAIM REWARD</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-claim-daily').onclick = () => {
        if(typeof playSFX === 'function') playSFX('craftSuccess'); 
        overlay.remove();
        
        const up = { ...state.profile };
        up.gold = (up.gold || 0) + rewardGold;
        up.dark_energy = (up.dark_energy || 0) + rewardEnergy;
        up.lastRewardDate = today;
        up.loginStreak = streak;
        
        updateState({ profile: up });
        
        localStorage.setItem('EMERALD_LAST_REWARD', today);
        localStorage.setItem('EMERALD_LOGIN_STREAK', streak.toString());
        
        updateTopBar();
        window.showSimplePopup("SUPPLY CLAIMED", "Rewards have been transferred to your cargo.", "#3498db");
    };
};

const checkAccountSetup = () => {
    const state = getState();
    
    if (!state.profile.username || state.profile.username === 'ANONYMOUS' || state.profile.username.trim() === '') {
        document.getElementById('main-top-bar').style.setProperty('display', 'none', 'important');
        document.getElementById('main-bottom-nav').style.setProperty('display', 'none', 'important');
        document.getElementById('nav-toggle').style.setProperty('display', 'none', 'important');

        switchScreen('setup');
        
        let selectedShip = 'INTERCEPTOR';
        const shipBtns = document.querySelectorAll('.btn-ship-select');
        const shipImgEl = document.getElementById('setup-ship-img');
        
        let statsContainer = document.getElementById('setup-ship-stats');
        if (!statsContainer && shipImgEl) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'setup-ship-stats';
            statsContainer.style.cssText = "display:flex; justify-content:center; gap:6px; margin-bottom:20px; font-size:10px; font-weight:bold;";
            shipImgEl.parentElement.after(statsContainer); 
        }

        const updateSetupStats = (shipKey) => {
            const s = SHIPS && SHIPS[shipKey] ? SHIPS[shipKey] : { atk: 10, def: 5, hp: 100, speed: 50, image: "source/ships/ship1.png" };
            if(statsContainer) {
                statsContainer.innerHTML = `
                    <div style="background:#161b22; padding:6px 8px; border-radius:4px; border:1px solid #ff444455;"><span style="color:#ff4444;">ATK</span> ${s.atk}</div>
                    <div style="background:#161b22; padding:6px 8px; border-radius:4px; border:1px solid #44ff4455;"><span style="color:#44ff44;">DEF</span> ${s.def}</div>
                    <div style="background:#161b22; padding:6px 8px; border-radius:4px; border:1px solid #4444ff55;"><span style="color:#4444ff;">HP</span> ${s.hp}</div>
                    <div style="background:#161b22; padding:6px 8px; border-radius:4px; border:1px solid #ffff4455;"><span style="color:#ffff44;">SPD</span> ${s.speed}</div>
                `;
            }
            if (shipImgEl && s.image) {
                shipImgEl.style.transform = 'scale(0.8)';
                shipImgEl.style.filter = 'drop-shadow(0 0 5px rgba(46, 204, 113, 0.2))';
                setTimeout(() => {
                    shipImgEl.src = s.image;
                    shipImgEl.style.transform = 'scale(1)';
                    shipImgEl.style.filter = 'drop-shadow(0 0 15px rgba(46, 204, 113, 0.5))';
                }, 150);
            }
        };
        
        updateSetupStats(selectedShip); 

        shipBtns.forEach(btn => {
            btn.onclick = () => {
                playSFX('click'); 
                shipBtns.forEach(b => b.style.border = '2px solid transparent');
                btn.style.border = '2px solid var(--emerald)';
                selectedShip = btn.dataset.ship;
                updateSetupStats(selectedShip); 
            };
        });

        const btnStartGame = document.getElementById('btn-start-game');
        if (btnStartGame) {
            btnStartGame.onclick = () => {
                playSFX('click');
                const inputEl = document.getElementById('input-username');
                const usernameInput = inputEl ? inputEl.value.trim().toUpperCase() : '';

                if (!usernameInput || usernameInput === 'ANONYMOUS') { window.showSimplePopup("INVALID IDENTITY", "Please enter a valid Pilot Name!", "#ff4444"); return; }
                
                if (!connectedWalletAddress) { window.showSimplePopup("ACCESS DENIED", "Please connect your Solana Wallet to play.", "#ff4444"); return; }

                updateState({ 
                    profile: { 
                        ...state.profile, 
                        username: usernameInput,             
                        walletAddress: connectedWalletAddress,
                        shipClass: selectedShip,
                        currentShip: selectedShip,
                        currentHp: SHIPS[selectedShip].hp
                    } 
                });
                
                document.getElementById('main-top-bar').style.setProperty('display', 'flex', 'important');
                document.getElementById('main-bottom-nav').style.setProperty('display', 'flex', 'important');
                document.getElementById('nav-toggle').style.setProperty('display', 'flex', 'important');
                
                updateTopBar(); 
                initHangar();
                switchScreen('hangar');
                setTimeout(checkDailyReward, 1000); 
            };
        }
    } else {
        document.getElementById('main-top-bar').style.setProperty('display', 'flex', 'important');
        document.getElementById('main-bottom-nav').style.setProperty('display', 'flex', 'important');
        document.getElementById('nav-toggle').style.setProperty('display', 'flex', 'important');
        switchScreen('hangar');
        setTimeout(checkDailyReward, 1000); 
    }
};

// ==========================================
// SOLANA CONNECT LISTENER 
// ==========================================
const btnOpenPopup = document.getElementById('btn-open-wallet-popup');
const walletStatusDiv = document.getElementById('wallet-status');
const walletAddressDisplay = document.getElementById('wallet-address-display');
const walletOverlay = document.getElementById('wallet-select-overlay');

if (btnOpenPopup) {
    btnOpenPopup.innerText = "CONNECT SOLANA WALLET";
    btnOpenPopup.style.color = "#14F195"; 
    btnOpenPopup.style.borderColor = "#14F195";
    btnOpenPopup.style.background = "rgba(20, 241, 149, 0.1)";

    btnOpenPopup.onclick = () => {
        if(typeof playSFX === 'function') playSFX('click');
        
        if (walletOverlay) {
            const modalBox = walletOverlay.querySelector('.modal-box');
            if (modalBox) modalBox.style.borderColor = "#14F195";
            
            const title = walletOverlay.querySelector('.modal-title');
            if (title) {
                title.innerText = "SELECT WALLET";
                title.style.color = "#14F195";
                title.style.textShadow = "0 0 10px rgba(20, 241, 149, 0.5)";
            }

            const wrapper = document.getElementById('ton-connect-wrapper');
            if (wrapper) {
                wrapper.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:12px; width:100%; margin-bottom:10px;">
                        <button id="btn-phantom" style="width:100%; padding:14px; background:#17161a; color:#fff; border:1px solid #ab9ff2; border-radius:8px; font-weight:900; letter-spacing:1px; cursor:pointer; box-shadow:0 0 10px rgba(171, 159, 242, 0.2);">
                            CONNECT PHANTOM
                        </button>
                        <button id="btn-solflare" style="width:100%; padding:14px; background:#1c170d; color:#fff; border:1px solid #ff7b00; border-radius:8px; font-weight:900; letter-spacing:1px; cursor:pointer; box-shadow:0 0 10px rgba(255, 123, 0, 0.2);">
                            CONNECT SOLFLARE
                        </button>
                    </div>
                `;
                
                document.getElementById('btn-phantom').onclick = () => handleWalletSelection('phantom');
                document.getElementById('btn-solflare').onclick = () => handleWalletSelection('solflare');
            }

            walletOverlay.style.display = 'flex';
        }
    };
}

const cancelSelectBtn = document.getElementById('btn-cancel-select');
if (cancelSelectBtn) {
    cancelSelectBtn.onclick = () => {
        if(typeof playSFX === 'function') playSFX('click');
        if (walletOverlay) walletOverlay.style.display = 'none';
    };
}

async function handleWalletSelection(walletType) {
    if(typeof playSFX === 'function') playSFX('click');
    if (walletOverlay) walletOverlay.style.display = 'none';
    
    const result = await connectSolanaWallet(walletType);
    
    if (result.success) {
        let currentWalletAddr = result.address;
        
        connectedWalletAddress = currentWalletAddr; 
        
        const isRecovered = await checkAndRecoverWallet(currentWalletAddr);
        if (isRecovered) {
            window.showSimplePopup("ACCOUNT RECOVERED", "Old save data found! Restoring your fleet...", "#14F195");
            setTimeout(() => window.location.reload(), 2000);
            return; 
        }

        let inviterWallet = null;
        
        // Cek Referral dari URL Parameter Website Murni
        const urlParams = new URLSearchParams(window.location.search);
        const webRef = urlParams.get('ref');
        if (webRef && webRef !== currentWalletAddr) {
            inviterWallet = webRef;
        }

        if (inviterWallet) {
            await setReferrer(currentWalletAddr, inviterWallet);
        }
        
        // Simpan User (Tidak butuh Telegram ID lagi untuk web version, kosongkan saja)
        const state = getState();
        updateState({ 
            profile: { 
                ...state.profile, 
                walletAddress: currentWalletAddr
            } 
        });

        if (btnOpenPopup) btnOpenPopup.style.display = 'none';
        if (walletStatusDiv) {
            walletStatusDiv.style.display = 'block';
            walletStatusDiv.style.borderColor = '#14F195';
            walletStatusDiv.style.background = 'rgba(20, 241, 149, 0.1)';
            walletStatusDiv.querySelector('p').style.color = '#14F195';
        }

        const shortAddress = currentWalletAddr.slice(0, 4) + '...' + currentWalletAddr.slice(-4);
        
        if (walletAddressDisplay) {
            walletAddressDisplay.innerText = shortAddress;
        }

        window.showSimplePopup("SIGNAL SECURED", `Mainframe synced to Solana Wallet:<br><strong style="color:#14F195; word-break:break-all;">${shortAddress}</strong>`, "#14F195");
    }
}

const initGame = async () => {
    try {
        initStarfield();

        let deviceWallet = localStorage.getItem('EMERALD_DEVICE_ID_V5');
        if (!deviceWallet) {
            deviceWallet = '0x' + Math.random().toString(16).slice(2, 10) + Date.now().toString(16);
            localStorage.setItem('EMERALD_DEVICE_ID_V5', deviceWallet);
        }

        const appContent = document.getElementById('app-content');
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'screen-loading';
        loadingDiv.className = 'screen';
        loadingDiv.innerHTML = `<h2 style="color:#14F195; text-align:center; margin-top:50vh; transform:translateY(-50%); animation: pulse 1.5s infinite;">ESTABLISHING CONNECTION...</h2>`;
        appContent.appendChild(loadingDiv);
        switchScreen('loading');

        const response = await loadStateFromServer(deviceWallet);
        loadingDiv.remove();

        if (response.success) {
            const state = getState();
            const todayDate = new Date().toDateString();
            if (state.profile.lastLoginDate !== todayDate) {
                updateState({ profile: { ...state.profile, lastLoginDate: todayDate, questProgress: 0, questClaimed: false } });
            }
            checkAccountSetup();
        } else {
            alert("Failed to connect to the server. Ensure API key and Supabase URL are correct.");
        }
    } catch (err) { alert("Game initialization error."); }
};

// ==========================================
// MENU ABOUT / INFO 
// ==========================================
const initAbout = async () => {

    const aboutContainer = document.querySelector('#screen-about > div');
    if (aboutContainer && !document.getElementById('btn-referral-system')) {
        const refBtn = document.createElement('button');
        refBtn.id = 'btn-referral-system';
        refBtn.style.cssText = "width: 100%; padding: 12px; background: rgba(46, 204, 113, 0.1); border: 1px dashed var(--emerald); color: var(--emerald); font-weight: 900; border-radius: 4px; cursor: pointer; transition: 0.2s; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 10px rgba(46, 204, 113, 0.2);";
        refBtn.innerHTML = "🤝 RECRUIT CREW (GET 5,000 GOLD)";

        const tokenomicsBtn = document.getElementById('btn-show-tokenomics');
        if(tokenomicsBtn) {
            aboutContainer.insertBefore(refBtn, tokenomicsBtn);
        }

        refBtn.onclick = () => {
            if(typeof playSFX === 'function') playSFX('click');
            const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();

            const state = getState();
            let playerId = state.profile.walletAddress || "PLEASE_CONNECT_WALLET_FIRST";

            const refLink = `https://emerald-space.site/?ref=${playerId}`;

            const overlay = document.createElement('div');
            overlay.id = 'scifi-popup';
            overlay.className = 'modal-overlay z-alert';
            overlay.innerHTML = `
                <div class="modal-box" style="border-color: var(--emerald); box-shadow: 0 0 30px rgba(46, 204, 113, 0.3); background: #0d1117; width: 90%; max-width: 350px;">
                    <h3 class="modal-title" style="color:var(--emerald); text-shadow: 0 0 10px rgba(46,204,113,0.5);"><img src="source/icon/about.png" style="width:20px; vertical-align:-3px; filter: drop-shadow(0 0 5px var(--emerald));"> FLEET RECRUITMENT</h3>
                    
                    <p style="color:#e6edf3; font-size:12px; line-height:1.5; margin-bottom:15px;">
                        Recruit new pilots to the Emerald Space fleet and earn <strong style="color:var(--gold);">5,000 GOLD</strong> for every successful registration & reach lev.6!
                    </p>
                    
                    <div style="background:#161b22; border:1px solid #30363d; padding:12px; border-radius:6px; margin-bottom:15px; word-break:break-all;">
                        <span style="font-size: 10px; color: #8b949e; letter-spacing: 1px; display:block; margin-bottom:5px;">YOUR SHORT LINK:</span>
                        <span id="ref-link-text" style="color:#14F195; font-size:12px; font-weight:bold;">${refLink}</span>
                    </div>
                    
                    <div style="display:flex; gap:10px;">
                        <button id="btn-close-ref" style="flex:1; background:transparent; border:1px solid #ff4444; color:#ff4444; padding:12px; border-radius:4px; font-weight:bold; cursor:pointer;">CLOSE</button>
                        <button id="btn-copy-ref" style="flex:2; background:var(--emerald); border:none; color:#000; padding:12px; border-radius:4px; font-weight:900; box-shadow: 0 0 15px rgba(46, 204, 113, 0.4); cursor:pointer;">COPY LINK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('btn-close-ref').onclick = () => overlay.remove();
            document.getElementById('btn-copy-ref').onclick = () => {
                if(typeof playSFX === 'function') playSFX('click');
                navigator.clipboard.writeText(refLink);
                window.showSimplePopup("LINK COPIED!", "Share this link with your friends to expand your fleet.", "var(--emerald)");
                overlay.remove();
            };
        };
    }

    const btnTokenomics = document.getElementById('btn-show-tokenomics');
    if (btnTokenomics) {
        btnTokenomics.onclick = () => {
            if(typeof playSFX === 'function') playSFX('click');
            const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
            
            const overlay = document.createElement('div');
            overlay.id = 'scifi-popup';
            overlay.className = 'modal-overlay z-menu';
            
            overlay.innerHTML = `
                <div class="modal-box" style="border-color: #14F195; box-shadow: 0 0 30px rgba(20, 241, 149, 0.2); background: #0d1117; width: 90%; max-width: 480px; max-height: 85vh; overflow-y: auto; text-align: left; padding: 25px;">
                    
                    <h2 style="color: #14F195; text-align: center; margin-bottom: 15px; letter-spacing: 2px; font-size: 18px; text-shadow: 0 0 10px #14F195;">
                        <img src="source/icon/about.png" style="width:24px; vertical-align:-5px; filter: drop-shadow(0 0 5px #14F195); margin-right: 5px;"> 
                        PROJECT DOSSIER
                    </h2>

                    <div style="background: linear-gradient(180deg, #161b22, #0d1117); border: 1px solid var(--gold); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; box-shadow: 0 0 20px rgba(255, 202, 40, 0.15); position: relative; overflow: hidden;">
                        <div style="position:absolute; top:-50px; left:50%; transform:translateX(-50%); width:150px; height:100px; background:var(--gold); filter:blur(60px); opacity:0.2; pointer-events:none;"></div>
                        
                        <h3 style="color: var(--gold); font-size: 14px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 5px var(--gold);">🏆 GLOBAL PRIZE POOL</h3>
                        <p style="color: #8b949e; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Awaiting Seasonal Distribution</p>
                        
                        <div id="live-prize-pool-ton" style="color: #14F195; font-size: 26px; font-weight: 900; text-shadow: 0 0 15px rgba(20, 241, 149, 0.6); margin-bottom: 2px; letter-spacing: 1px;">CALCULATING...</div>
                        <div style="color: #8b949e; font-size: 10px; font-weight: bold; margin-bottom: 10px;">Distribution: <span style="color:var(--gold);">Elite 80%</span> | <span style="color:#e6edf3;">Reg 20%</span></div>
                        
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 5px;">
                            <span style="color:#8b949e; font-size:16px;">+</span>
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <div style="color: #3498db; font-size: 22px; font-weight: 900; text-shadow: 0 0 15px rgba(52, 152, 219, 0.6); animation: pulse 2s infinite;">1,000 USDC</div>
                                <div style="color: #8b949e; font-size: 10px; font-weight: bold; margin-top: 2px;">Distribution: <span style="color:var(--gold);">Top Pilots & Boss Raiders</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(46, 204, 113, 0.05); border-left: 3px solid var(--emerald); padding: 12px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
                        <strong style="color: var(--emerald); font-size: 13px; display: block; margin-bottom: 4px; text-transform: uppercase;">100% LAUNCH ON BAGS APP</strong>
                        <p style="color: #c9d1d9; font-size: 11px; line-height: 1.6; margin: 0; text-align: justify;">
                            Emerald Space is officially launching 100% on the <strong>Bags App</strong> ecosystem! No VCs, no presales—just pure, community-driven space exploration on the Solana Network. Get your ship, forge your weapons, and earn real yield!
                        </p>
                    </div>
                    
                    <h3 style="color: var(--gold); font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #30363d; padding-bottom: 5px; text-transform: uppercase; display: flex; align-items: center; gap: 8px;">
                        🚀 CORE GAME FEATURES
                    </h3>
                    
                    <div style="background: #161b22; border: 1px solid #30363d; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                        <div style="margin-bottom:8px; border-bottom: 1px dashed #30363d; padding-bottom: 8px;">
                            <span style="color:#2ecc71; font-size:11px; font-weight: bold;">⚔️ MMO Global Boss Raids</span>
                            <div style="color:#8b949e; font-size:10px; line-height:1.4; margin-top:3px;">Unite with the entire server to defeat the Leviathan. Deal damage, survive, and secure massive SOL & USDC payouts!</div>
                        </div>
                        <div style="margin-bottom:8px; border-bottom: 1px dashed #30363d; padding-bottom: 8px;">
                            <span style="color:#14F195; font-size:11px; font-weight: bold;">🎲 Web3 Black Market Gacha</span>
                            <div style="color:#8b949e; font-size:10px; line-height:1.4; margin-top:3px;">Roll secure on-chain crates using SOL to unlock Mythic and Legendary ship equipment directly to your inventory.</div>
                        </div>
                        <div style="margin-bottom:8px; border-bottom: 1px dashed #30363d; padding-bottom: 8px;">
                            <span style="color:var(--gold); font-size:11px; font-weight: bold;">🛠️ Smart Forge & Crafting</span>
                            <div style="color:#8b949e; font-size:10px; line-height:1.4; margin-top:3px;">Dismantle weak items into Iron Ore & Dark Energy. Combine duplicates to evolve your gear to the highest rarity!</div>
                        </div>
                        <div>
                            <span style="color:#e6edf3; font-size:11px; font-weight: bold;">🔒 Elite VIP Sectors</span>
                            <div style="color:#8b949e; font-size:10px; line-height:1.4; margin-top:3px;">Hold 0.5 SOL or an Elite License to access high-risk, high-reward galaxies with exclusive material drops.</div>
                        </div>
                    </div>

                    <h3 style="color: var(--emerald); font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #30363d; padding-bottom: 5px; text-transform: uppercase;">
                        ⚙️ The Deflationary Engine
                    </h3>
                    <p style="color: #8b949e; font-size: 11px; line-height: 1.6; margin-bottom: 12px; text-align: justify;">
                        Our economy relies on an aggressive, self-sustaining flywheel. Every time a pilot spends SOL in-game, the system automatically triggers a market intervention:
                    </p>
                    
                    <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="background: rgba(20, 241, 149, 0.05); padding: 10px; border-radius: 6px; border-left: 2px solid #14F195;">
                            <strong style="color:#14F195; font-size:12px; display:block; margin-bottom:2px;">1. Auto-Buyback (60%)</strong>
                            <span style="color:#e6edf3; font-size:10px; line-height:1.4;">60% of all in-game SOL revenue is injected straight into the liquidity pool to support the ecosystem.</span>
                        </div>
                        
                        <div style="background: rgba(255, 68, 68, 0.05); padding: 10px; border-radius: 6px; border-left: 2px solid #ff4444;">
                            <strong style="color:#ff4444; font-size:12px; display:block; margin-bottom:2px;">2. Hyper-Deflation (Burn)</strong>
                            <span style="color:#e6edf3; font-size:10px; line-height:1.4;">50% of those bought-back tokens are instantly sent to a dead address (<strong style="color:#ff4444;">BURNED</strong>). Driving extreme scarcity over time.</span>
                        </div>

                        <div style="background: rgba(255, 202, 40, 0.05); padding: 10px; border-radius: 6px; border-left: 2px solid var(--gold);">
                            <strong style="color:var(--gold); font-size:12px; display:block; margin-bottom:2px;">3. Real Yield Reward</strong>
                            <span style="color:#e6edf3; font-size:10px; line-height:1.4;">The remaining 50% flows directly into the Global Prize Pool. Real revenue sharing via USDC and SOL!</span>
                        </div>
                    </div>
                    
                    <button id="btn-close-tokenomics" style="width: 100%; padding: 14px; background: transparent; border: 1px solid #14F195; color: #14F195; font-weight: 900; border-radius: 6px; cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; box-shadow: inset 0 0 10px rgba(20,241,149,0.1);">
                        ACKNOWLEDGE & CLOSE
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
            
            const closeBtn = document.getElementById('btn-close-tokenomics');
            closeBtn.onmouseover = () => { closeBtn.style.background = '#14F195'; closeBtn.style.color = '#000'; };
            closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#14F195'; };
            closeBtn.onclick = () => {
                if(typeof playSFX === 'function') playSFX('click'); 
                overlay.remove();
            };
        };
    }

    const btnElite = document.getElementById('btn-upgrade-license'); 
    if (btnElite) {
        const state = getState();
        if (state.profile.isElite) {
            btnElite.innerHTML = '<img src="source/icon/sub/vip.png" style="width:16px; vertical-align:-2px; margin-right:6px;"> ELITE LICENSE ACQUIRED';
            btnElite.style.background = 'rgba(46, 204, 113, 0.1)';
            btnElite.style.borderColor = 'var(--emerald)';
            btnElite.style.color = 'var(--emerald)';
            btnElite.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.3)';
            btnElite.style.cursor = 'default';
            btnElite.disabled = true;
        } else {
            btnElite.onclick = () => {
                if(typeof playSFX === 'function') playSFX('click');
                const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
                
                const upgradeCost = 25000000; 
                
                const overlay = document.createElement('div'); 
                overlay.id = 'scifi-popup'; 
                overlay.className = 'modal-overlay z-alert';
                overlay.innerHTML = `
                    <div class="modal-box" style="border-color: var(--gold); box-shadow: 0 0 30px rgba(255, 202, 40, 0.4); background: #1a1608; position: relative; overflow: hidden; width: 90%; max-width: 350px;">
                        <div style="position:absolute; top:-50px; left:50%; transform:translateX(-50%); width:100px; height:100px; background:var(--gold); filter:blur(50px); opacity:0.3; pointer-events:none;"></div>
                        
                        <img src="source/icon/warning.png" class="modal-icon" style="filter: drop-shadow(0 0 10px var(--gold));">
                        <h3 class="modal-title" style="color:var(--gold); text-shadow: 0 0 10px var(--gold); font-size: 20px; letter-spacing: 2px;"> 🎫 ELITE LICENSE</h3>
                        
                        <p class="modal-text" style="color: #e6edf3; font-size: 13px; line-height: 1.6; margin-bottom: 15px;">
                            Upgrade your pilot clearance to <strong style="color:var(--gold)">ELITE TIER</strong>.<br>
                            Unlock VIP sectors and exclusive features.
                        </p>
                        
                        <div style="margin: 15px 0; padding: 12px; background: rgba(0,0,0,0.6); border: 1px dashed var(--gold); border-radius: 8px;">
                            <span style="font-size: 10px; color: #8b949e; letter-spacing: 1px;">UPGRADE COST</span><br>
                            <strong style="color: var(--gold); font-size: 20px; text-shadow: 0 0 10px var(--gold);">${upgradeCost.toLocaleString()} G</strong>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button id="btn-pop-no" style="flex: 1; padding: 12px; background: transparent; border: 1px solid #ff4444; color: #ff4444; font-weight: bold; border-radius: 6px; cursor: pointer;">ABORT</button>
                            <button id="btn-pop-yes" style="flex: 1; padding: 12px; background: var(--gold); color: #000; border: none; font-weight: 900; border-radius: 6px; box-shadow: 0 0 15px var(--gold); cursor: pointer;">AUTHORIZE</button>
                        </div>
                    </div>`;
                document.body.appendChild(overlay);

                document.getElementById('btn-pop-no').onclick = () => overlay.remove();
                document.getElementById('btn-pop-yes').onclick = () => {
                    overlay.remove();
                    const freshState = getState();
                    const freshGold = freshState.profile.gold || 0;

                    if (freshState.profile.isElite) {
                         window.showSimplePopup("SYSTEM ERROR", "You already own the Elite License!", "#ff4444");
                         return;
                    }

                    if (freshGold >= upgradeCost) {
                        const updatedGold = freshGold - upgradeCost;
                        updateState({ profile: { ...freshState.profile, gold: updatedGold, isElite: true } });
                        
                        const goldDisplay = document.getElementById('player-gold');
                        if (goldDisplay) goldDisplay.innerText = updatedGold.toLocaleString();
                        
                        window.showSimplePopup("UPGRADE SUCCESS", "Welcome to the Elite Tier, Captain!<br>Your VIP status is now active.", "var(--gold)");
                        initAbout(); 
                    } else {
                        const shortfall = upgradeCost - freshGold;
                        window.showSimplePopup("INSUFFICIENT FUNDS", `Transaction failed.<br>You need <strong style="color:#ff4444">${shortfall.toLocaleString()} G</strong> more to purchase this license.`, "#ff4444");
                    }
                };
            };
        }
    }

    const fetchPrizePool = async () => {
        const oldPrizePoolEl = document.getElementById('live-prize-pool');
        const popupPrizePoolEl = document.getElementById('live-prize-pool-ton');
        
        if (oldPrizePoolEl) oldPrizePoolEl.innerHTML = '<span style="color:#8b949e;">CALCULATING...</span>';
        if (popupPrizePoolEl) popupPrizePoolEl.innerText = "CALCULATING...";

        try {
            const adminWallet = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc';
            const req = await fetch('https://mainnet.helius-rpc.com/?api-key=79850b9a-0b16-45cc-9ff8-b38375ea7d14', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1,
                    method: 'getBalance',
                    params: [adminWallet]
                })
            });
            const data = await req.json();
            
            let realSol = 0;
            if (data && data.result && data.result.value) {
                realSol = data.result.value / 1000000000;
            }
            
            const finalSolText = `${realSol.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SOL`;

            if (oldPrizePoolEl) {
                oldPrizePoolEl.innerHTML = `
                    <div style="color: #14F195; font-size: 22px; font-weight: 900; text-shadow: 0 0 10px rgba(20, 241, 149, 0.6);">${finalSolText}</div>
                    <div style="color: #8b949e; font-size: 9px; font-weight: bold; margin-bottom: 8px; letter-spacing: 0.5px;">(Elite 80% | Reg 20%)</div>
                    <div style="color: #8b949e; font-size: 14px; margin: 4px 0;">+</div>
                    <div style="color: #3498db; font-size: 18px; font-weight: 900; text-shadow: 0 0 10px rgba(52, 152, 219, 0.6); animation: pulse 2s infinite;">1,000 USDC</div>
                    <div style="color: #8b949e; font-size: 9px; font-weight: bold; margin-top: 4px; letter-spacing: 0.5px;">(Top Pilots Reward)</div>
                `;
            }

            if (popupPrizePoolEl) {
                popupPrizePoolEl.innerText = finalSolText;
            }

        } catch (err) {
            if (oldPrizePoolEl) {
                oldPrizePoolEl.innerHTML = `
                    <div style="color: #14F195; font-size: 22px; font-weight: 900;">0.00 SOL</div>
                    <div style="color: #8b949e; font-size: 9px; font-weight: bold; margin-bottom: 8px; letter-spacing: 0.5px;">(Elite 80% | Reg 20%)</div>
                    <div style="color: #8b949e; font-size: 14px; margin: 4px 0;">+</div>
                    <div style="color: #3498db; font-size: 18px; font-weight: 900;">1,000 USDC</div>
                    <div style="color: #8b949e; font-size: 9px; font-weight: bold; margin-top: 4px; letter-spacing: 0.5px;">(Top Pilots Reward)</div>
                `;
            }
            if (popupPrizePoolEl) popupPrizePoolEl.innerText = "0.00 SOL"; 
        }
    };

    fetchPrizePool();

    const fetchLeaderboard = async () => {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        list.innerHTML = '<p style="color:#8b949e; font-size:12px; text-align:center;">Loading galaxy radar...</p>';
        const players = await getTopPlayers();

        if (players.length === 0) {
            list.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">No pilot data available.</p>';
        } else {
            list.innerHTML = '';
            players.forEach((p, index) => {
                const rankColor = index === 0 ? '#ffca28' : (index === 1 ? '#c0c0c0' : (index === 2 ? '#cd7f32' : '#8b949e'));
                const item = document.createElement('div');
                item.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#0d1117; border-radius:6px; border: 1px solid ${index < 3 ? rankColor : '#30363d'}; margin-bottom:8px;`;

                const isEliteBadge = (p.isElite || p.is_elite) ? `<img src="source/icon/sub/vip.png" style="width:12px; vertical-align:-1px; margin-right:4px;" title="Elite Pilot">` : '';

                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="color:${rankColor}; font-weight:900; font-size:16px;">#${index + 1}</span>
                        <div style="display:flex; flex-direction:column;">
                            <span style="color:#e6edf3; font-weight:bold; font-size:12px; text-transform:uppercase;">${isEliteBadge}${p.username || 'ANONYMOUS'}</span>
                            <span style="color:var(--emerald); font-size:10px;">Lv. ${p.level} | ${p.ship_class || 'INTERCEPTOR'}</span>
                        </div>
                    </div>
                    <div style="color:var(--gold); font-size:12px; font-weight:900;">${(p.gold || 0).toLocaleString()} G</div>
                `;
                list.appendChild(item);
            });
        }
    };
    fetchLeaderboard();
};

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => { playBGM(); playSFX('click'); switchScreen(btn.dataset.target); };
});

const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
if (btnDisconnectWallet) {
    btnDisconnectWallet.onclick = () => {
        if(typeof playSFX === 'function') playSFX('click');
        
        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        
        const overlay = document.createElement('div'); 
        overlay.id = 'scifi-popup'; 
        overlay.className = 'modal-overlay z-alert';
        overlay.innerHTML = `
            <div class="modal-box danger-box" style="border-color: #ff4444; box-shadow: 0 0 30px rgba(255, 68, 68, 0.4); background: #1a0808; position: relative; overflow: hidden; width: 90%; max-width: 350px;">
                <img src="source/icon/warning.png" class="modal-icon" style="filter: drop-shadow(0 0 10px #ff4444);">
                <h3 class="modal-title" style="color:#ff4444; text-shadow: 0 0 10px #ff4444; font-size: 20px; letter-spacing: 2px;">SYSTEM LOGOUT</h3>
                
                <p class="modal-text" style="color: #e6edf3; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
                    Are you sure you want to disconnect your wallet? <br><br>
                    <span style="color:#8b949e; font-size:11px;">Your current fleet data will remain safely stored in the server.</span>
                </p>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btn-cancel-disconnect" style="flex: 1; padding: 12px; background: transparent; border: 1px solid #8b949e; color: #8b949e; font-weight: bold; border-radius: 6px; cursor: pointer;">STAY</button>
                    <button id="btn-confirm-disconnect" style="flex: 1; padding: 12px; background: #ff4444; color: #fff; border: none; font-weight: 900; border-radius: 6px; box-shadow: 0 0 15px #ff4444; cursor: pointer;">DISCONNECT</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById('btn-cancel-disconnect').onclick = () => {
            if(typeof playSFX === 'function') playSFX('click');
            overlay.remove(); 
        };

        document.getElementById('btn-confirm-disconnect').onclick = async () => {
            if(typeof playSFX === 'function') playSFX('click');
            overlay.remove(); 
            
            try {
                const provider = window.solana || (window.phantom && window.phantom.solana);
                if (provider) {
                    await provider.disconnect();
                }
                
                localStorage.removeItem('EMERALD_DEVICE_ID_V5');
                localStorage.removeItem('EMERALD_SPACE_SAVE_V5');
                
                window.showSimplePopup("LINK SEVERED", "Wallet disconnected safely. Neural link terminated.", "#14F195");
                setTimeout(() => { window.location.reload(); }, 2000);
                
            } catch (err) { 
                console.error("Disconnect Error:", err); 
                localStorage.removeItem('EMERALD_DEVICE_ID_V5');
                localStorage.removeItem('EMERALD_SPACE_SAVE_V5');
                setTimeout(() => { window.location.reload(); }, 1000);
            }
        };
    };
}

const navToggle = document.getElementById('nav-toggle');
const bottomNav = document.getElementById('main-bottom-nav');
const navToggleIcon = document.getElementById('nav-toggle-icon');

if (navToggle && bottomNav) {
    navToggle.onclick = () => {
        playSFX('click');
        bottomNav.classList.toggle('collapsed');
        navToggle.classList.toggle('collapsed');
        
        if (bottomNav.classList.contains('collapsed')) {
            navToggleIcon.innerHTML = '<img src="source/icon/sub/up.png" style="width:16px; height:auto; display:block; margin:auto; filter:drop-shadow(0 0 5px var(--emerald));">';
        } else {
            navToggleIcon.innerHTML = '<img src="source/icon/sub/down.png" style="width:16px; height:auto; display:block; margin:auto; filter:drop-shadow(0 0 5px var(--emerald));">';
        }
    };
}

const btnBgm = document.getElementById('btn-toggle-bgm');
if (btnBgm) {
    btnBgm.innerHTML = '<img src="source/icon/sub/bgm.png" style="width:20px; vertical-align:middle; filter: drop-shadow(0 0 5px var(--emerald));">';
    
    btnBgm.onclick = () => {
        const isMuted = toggleBGM();
        if (isMuted) {
            btnBgm.innerHTML = '<img src="source/icon/sub/bgm.png" style="width:20px; vertical-align:middle; filter: grayscale(1) opacity(0.4);">';
            btnBgm.style.borderColor = '#ff4444'; 
            btnBgm.style.background = 'rgba(255, 68, 68, 0.1)';
        } else {
            playSFX('click');
            btnBgm.innerHTML = '<img src="source/icon/sub/bgm.png" style="width:20px; vertical-align:middle; filter: drop-shadow(0 0 5px var(--emerald));">';
            btnBgm.style.borderColor = 'var(--emerald)'; 
            btnBgm.style.background = 'transparent';
        }
    };
}

const btnSfx = document.getElementById('btn-toggle-sfx');
if (btnSfx) {
    btnSfx.innerHTML = '<img src="source/icon/sub/sfx.png" style="width:20px; vertical-align:middle; filter: drop-shadow(0 0 5px var(--cyan));">';
    
    btnSfx.onclick = () => {
        const isMuted = toggleSFX();
        if (isMuted) {
            btnSfx.innerHTML = '<img src="source/icon/sub/sfx.png" style="width:20px; vertical-align:middle; filter: grayscale(1) opacity(0.4);">';
            btnSfx.style.borderColor = '#ff4444'; 
            btnSfx.style.background = 'rgba(255, 68, 68, 0.1)';
        } else {
            playSFX('click');
            btnSfx.innerHTML = '<img src="source/icon/sub/sfx.png" style="width:20px; vertical-align:middle; filter: drop-shadow(0 0 5px var(--cyan));">';
            btnSfx.style.borderColor = 'var(--cyan)'; 
            btnSfx.style.background = 'transparent';
        }
    };
}

// ==========================================
// REAL-TIME BROADCAST SYSTEM
// ==========================================
window.showRealTimeBroadcast = (playerName, actionText, highlightColor = "var(--gold)") => {
    const exist = document.getElementById('global-toast'); if(exist) exist.remove();
    
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = `position:fixed; top:65px; left:50%; transform:translateX(-50%); background:rgba(13,17,23,0.9); border:1px solid #30363d; color:#e6edf3; padding:8px 15px; border-radius:20px; font-size:10px; z-index:99998; box-shadow:0 5px 15px rgba(0,0,0,0.5); backdrop-filter:blur(5px); white-space:nowrap; transition:all 0.5s ease; opacity:0; pointer-events:none;`;
    
    toast.innerHTML = `📡 <b>GLOBAL:</b> Pilot <b style="color:var(--emerald);">${playerName}</b> ${actionText}`;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; toast.style.top = '75px'; }, 100);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.top = '65px'; }, 3500);
    setTimeout(() => toast.remove(), 4000);
};

/* =====================================================================
   NEBULA BAZAAR - GACHA SYSTEM INTEGRATION
   Wrapped in a self-executing function to prevent variable collisions.
===================================================================== */
(() => {
    const ballContainer = document.getElementById('ballContainer');
    // Guard clause: If the gacha machine isn't on this page, do nothing.
    if (!ballContainer) return;

    const knob = document.getElementById('gachaKnob');
    const coinSlot = document.getElementById('coinSlot');
    const statusText = document.getElementById('statusText');
    const gachaModal = document.getElementById('gacha-modal'); 
    const rewardText = document.getElementById('rewardText');
    const rewardImage = document.getElementById('rewardImage'); 
    const prizeBall = document.getElementById('prizeBall');
    const machineBody = document.querySelector('.machine-body');
    const doorFlap = document.getElementById('doorFlap');
    const modalContent = document.getElementById('modalContent');
    const particleCanvas = document.getElementById('particleCanvas');
    const tierBtns = document.querySelectorAll('.tier-btn');
    const btnClaimGacha = document.getElementById('btn-claim-gacha');

    // [NEW] Selectors for the Virtual Wallet Display
    const shopVSolDisplay = document.getElementById('shop-vsol');

    let isReadyToSpin = false;
    let isProcessing = false;

    // --- WEB3 & TOKENOMICS CONFIGURATION ---
    const EMRLD_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; 
    const SOL_MINT = "So11111111111111111111111111111111111111112";

    let currentSpinCostUsd = 1.00; 
    let currentEmrldPrice = 0.05; 
    let currentSolPrice = 145.00; 
    let costInEmrld = 20; 

    // [NEW] Virtual Balances (Initialized from State later)
    let virtualSolBalance = 0;

    let systemProfitPoolUsd = 0; 

    // [UPDATED] Prizes now represent pure SOL drops. Image paths updated.
    const prizes = [
        { name: "MICRO YIELD", color: "#a8b5c2", rarity: "COMMON", img: "source/icon/ball/ball1.png", weight: 20, payoutUsd: 0.25 },
        { name: "MINOR SOL DROP", color: "#a8b5c2", rarity: "COMMON", img: "source/icon/ball/ball2.png", weight: 20, payoutUsd: 0.25 },
        { name: "BASIC DIVIDEND", color: "#a8b5c2", rarity: "COMMON", img: "source/icon/ball/ball3.png", weight: 20, payoutUsd: 0.25 },
        { name: "NEBULA YIELD", color: "#ffd700", rarity: "UNCOMMON", img: "source/icon/ball/ball4.png", weight: 15, payoutUsd: 0.50 },
        { name: "PLASMA REWARD", color: "#ff00ea", rarity: "UNCOMMON", img: "source/icon/ball/ball5.png", weight: 10, payoutUsd: 0.50 },
        { name: "QUANTUM PAYOUT", color: "#ff3300", rarity: "RARE", img: "source/icon/ball/ball6.png", weight: 6, payoutUsd: 1.50 },
        { name: "CYBER BOUNTY", color: "#00f3ff", rarity: "RARE", img: "source/icon/ball/ball7.png", weight: 4, payoutUsd: 1.50 },
        { name: "VOID TREASURE", color: "#9b59b6", rarity: "EPIC", img: "source/icon/ball/ball8.png", weight: 4, payoutUsd: 3.00 },
        { name: "GALACTIC JACKPOT", color: "#ffffff", rarity: "MYTHIC", img: "source/icon/ball/ball9.png", weight: 1, payoutUsd: 5.00 }
    ];

    // [NEW] Function to update the virtual wallet UI in the Shop
    function updateVirtualWalletUI() {
        if (shopVSolDisplay) shopVSolDisplay.innerText = virtualSolBalance.toFixed(4);
    }

    // [NEW] Sync virtual balances with the central game state
    function syncVirtualBalancesWithState() {
        const state = getState();
        virtualSolBalance = state.profile.virtualSol || 0;
        updateVirtualWalletUI();
    }

    function initBalls() {
        ballContainer.innerHTML = '';
        const totalBalls = 14; 
        for (let i = 0; i < totalBalls; i++) {
            const ball = document.createElement('div');
            ball.className = 'ball';
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
            ball.style.backgroundImage = `url('${randomPrize.img}')`;
            ball.style.transform = `translateX(${Math.random() * 30 - 15}px) rotate(${Math.random() * 360}deg)`;
            ballContainer.appendChild(ball);
        }
    }

    function updateCostUI() {
        costInEmrld = (currentSpinCostUsd / currentEmrldPrice).toFixed(2);
        const payLabel = document.querySelector('.pay-label');
        if (payLabel) payLabel.innerText = `${costInEmrld} EMRLD`;
    }

    tierBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (isProcessing || isReadyToSpin) return;
            
            tierBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentSpinCostUsd = parseFloat(e.target.getAttribute('data-cost'));
            updateCostUI();
        });
    });

    async function fetchRealTimePrices() {
        try {
            const response = await fetch(`https://price.jup.ag/v6/price?ids=${SOL_MINT},${EMRLD_MINT}`);
            const data = await response.json();
            if(data.data[SOL_MINT]) currentSolPrice = data.data[SOL_MINT].price;
            if(data.data[EMRLD_MINT]) currentEmrldPrice = data.data[EMRLD_MINT].price;
        } catch (error) {
            console.log("Using simulated API prices.");
        }
        updateCostUI();
        syncVirtualBalancesWithState(); // Sync initially
    }
    fetchRealTimePrices();

    // [ON-CHAIN] TRIGGER MAINNET PAYMENT VIA PHANTOM (MENGGUNAKAN EMRLD)
    async function simulateTransaction() {
        if (isReadyToSpin || isProcessing) return;

        isProcessing = true;
        tierBtns.forEach(b => b.disabled = true);
        
        coinSlot.classList.remove('pulse-glow');
        coinSlot.style.borderColor = "#14F195";
        coinSlot.querySelector('.pay-label').style.color = "#14F195";
        
        statusText.innerText = `AWAITING SIGNATURE... (${costInEmrld} EMRLD)`;
        statusText.style.color = "#14F195";
        statusText.style.textShadow = "0 0 10px #14F195";

        if(typeof playSFX === 'function') playSFX('click');

        // WEB3 TRANSACTION CALL (Memotong EMRLD token)
        const tx = await payWithEMRLD(parseFloat(costInEmrld));

        if (!tx || !tx.success) {
            statusText.innerText = "TRANSACTION REJECTED OR FAILED";
            statusText.style.color = "#ff4444";
            statusText.style.textShadow = "none";
            coinSlot.style.borderColor = "#fff";
            coinSlot.querySelector('.pay-label').style.color = "#fff";
            isProcessing = false;
            tierBtns.forEach(b => b.disabled = false);
            return;
        }

        // IF TRANSACTION SUCCESS, UNLOCK THE GACHA KNOB
        systemProfitPoolUsd += currentSpinCostUsd; 

        isProcessing = false;
        isReadyToSpin = true;
        
        coinSlot.style.borderColor = "#333";
        coinSlot.querySelector('.pay-label').style.color = "#555";
        
        statusText.innerText = "PAYMENT VERIFIED. PULL LEVER.";
        statusText.style.color = "#00f3ff";
        statusText.style.textShadow = "0 0 10px #00f3ff";
        
        knob.classList.remove('disabled-knob');
        knob.style.borderColor = "#00f3ff";
        knob.style.boxShadow = "0 0 20px rgba(0, 243, 255, 0.4)";
    }

    if (coinSlot) coinSlot.addEventListener('click', simulateTransaction);

    function getDynamicPrize() {
        let availablePool = prizes.filter(p => p.rarity === "COMMON" || p.rarity === "UNCOMMON");
        
        if (systemProfitPoolUsd >= 10.00 * currentSpinCostUsd) { 
            availablePool = availablePool.concat(prizes.filter(p => p.rarity === "RARE"));
        }
        if (systemProfitPoolUsd >= 30.00 * currentSpinCostUsd) { 
            availablePool = availablePool.concat(prizes.filter(p => p.rarity === "EPIC"));
        }
        if (systemProfitPoolUsd >= 50.00 * currentSpinCostUsd) { 
            availablePool = availablePool.concat(prizes.filter(p => p.rarity === "MYTHIC"));
        }

        const totalWeight = availablePool.reduce((sum, prize) => sum + prize.weight, 0);
        let randomNum = Math.random() * totalWeight;
        
        let basePrize;
        for (let i = 0; i < availablePool.length; i++) {
            if (randomNum < availablePool[i].weight) {
                basePrize = availablePool[i];
                break;
            }
            randomNum -= availablePool[i].weight;
        }

        let finalPrize = { ...basePrize };
        finalPrize.actualPayoutUsd = finalPrize.payoutUsd * currentSpinCostUsd;
        systemProfitPoolUsd -= finalPrize.actualPayoutUsd;
        
        return finalPrize;
    }

    if (knob) {
        knob.addEventListener('click', () => {
            if (!isReadyToSpin || isProcessing) return;

            isProcessing = true;
            isReadyToSpin = false;
            
            knob.style.borderColor = "#444";
            knob.style.boxShadow = "0 10px 20px rgba(0,0,0,0.8)";
            knob.classList.add('disabled-knob');
            machineBody.classList.add('shake-animation');
            knob.classList.add('rotate-knob');
            
            statusText.innerText = "EXTRACTING YIELD...";
            statusText.style.color = "#ff00ea";
            statusText.style.textShadow = "0 0 10px #ff00ea";

            const balls = document.querySelectorAll('.ball');
            balls.forEach((ball) => {
                const jumpHeight = Math.random() * 140 + 60;
                const sideMove = Math.random() * 80 - 40;
                ball.style.transition = `transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
                ball.style.transform = `translate(${sideMove}px, -${jumpHeight}px) rotate(${Math.random()*1080}deg)`;
            });

            setTimeout(() => {
                balls.forEach((ball) => {
                    const randomX = Math.random() * 30 - 15;
                    ball.style.transition = `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`;
                    ball.style.transform = `translate(${randomX}px, 0px) rotate(${Math.random()*360}deg)`;
                });
            }, 450);

            setTimeout(() => {
                machineBody.classList.remove('shake-animation');
                knob.classList.remove('rotate-knob');
                statusText.innerText = "YIELD READY FOR RETRIEVAL";
                
                const winPrize = getDynamicPrize();
                
                prizeBall.style.backgroundImage = `url('${winPrize.img}')`;
                if (ballContainer.children.length > 0) ballContainer.removeChild(ballContainer.lastChild);

                prizeBall.classList.add('drop-animation');
                setTimeout(() => { doorFlap.style.transform = "rotateX(75deg)"; }, 400); 
                setTimeout(() => { doorFlap.style.transform = "rotateX(30deg)"; }, 900);
                setTimeout(() => showPrize(winPrize), 1400);

            }, 1500);
        });
    }

    function createExplosion(color) {
        particleCanvas.innerHTML = '';
        const particleCount = 30;
        for(let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.width = '6px'; p.style.height = '6px';
            p.style.background = color; p.style.borderRadius = '50%';
            p.style.top = '50%'; p.style.left = '50%';
            p.style.boxShadow = `0 0 10px ${color}`;
            p.style.pointerEvents = 'none';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            p.style.transition = `all ${Math.random() * 0.5 + 0.5}s cubic-bezier(0.1, 0.8, 0.3, 1)`;
            particleCanvas.appendChild(p);
            
            setTimeout(() => {
                p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
                p.style.opacity = '0';
            }, 10);
        }
    }

    // [UPDATED] showPrize now updates the Virtual SOL balance
    let currentWonSolAmount = 0;
    
    function showPrize(win) {
        rewardImage.src = win.img;
        rewardImage.style.filter = `drop-shadow(0 0 20px ${win.color})`;

        currentWonSolAmount = parseFloat((win.actualPayoutUsd / currentSolPrice).toFixed(4)); 
        
        let prizeColor = win.actualPayoutUsd < currentSpinCostUsd ? "#f1c40f" : "#4ade80"; 
        let prizeMessage = `+ ${currentWonSolAmount} SOL ($${win.actualPayoutUsd.toFixed(2)})`;

        rewardText.innerHTML = `<span style="font-size: 0.8rem; color: #888; font-family: 'Orbitron', sans-serif;">[CLASS: ${win.rarity}]</span><br>
        <b style="color:${win.color}; font-size:1.8rem; text-shadow: 0 0 20px ${win.color}; text-transform: uppercase;">${win.name}</b><br>
        <div style="background: rgba(0,0,0,0.5); border: 1px solid ${prizeColor}; border-radius: 8px; padding: 5px 10px; margin-top: 15px; display: inline-block;">
            <span style="color:${prizeColor}; font-weight:bold; font-size:1.1rem; letter-spacing: 1px;">${prizeMessage}</span>
        </div>`;
        
        modalContent.style.borderColor = win.color;
        modalContent.style.boxShadow = `0 0 40px rgba(0,0,0,0.9), inset 0 0 20px ${win.color}`;
        modalContent.querySelector('.hologram-title').style.color = win.color;
        modalContent.querySelector('.hologram-title').style.textShadow = `0 0 15px ${win.color}`;
        
        // Change button text to reflect adding to virtual balance
        btnClaimGacha.innerText = "ADD TO V-SOL BALANCE";

        gachaModal.style.display = 'flex';
        createExplosion(win.color);
    }

    // [UPDATED] closeModal handles adding the won SOL to the virtual balance
    function closeModal() {
        if(typeof playSFX === 'function') playSFX('craftSuccess');

        // Add the won amount to Virtual SOL
        virtualSolBalance += currentWonSolAmount;
        
        // Update State and UI
        const currentState = getState();
        updateState({ profile: { ...currentState.profile, virtualSol: virtualSolBalance } });
        updateVirtualWalletUI();
        
        window.showSimplePopup("YIELD SECURED", `${currentWonSolAmount} V-SOL has been added to your secure wallet.`, "#14F195");
        currentWonSolAmount = 0; // Reset

        gachaModal.style.display = 'none';
        isProcessing = false;
        
        tierBtns.forEach(b => b.disabled = false);
        
        coinSlot.classList.add('pulse-glow');
        coinSlot.style.borderColor = "";
        coinSlot.querySelector('.pay-label').style.color = "var(--neon-gold)";
        
        statusText.innerText = "AWAITING TRANSACTION...";
        statusText.style.color = "#888";
        statusText.style.textShadow = "none";
        
        doorFlap.style.transform = "rotateX(0deg)";
        prizeBall.classList.remove('drop-animation');
        prizeBall.style.opacity = '0'; 

        if (ballContainer.children.length < 4) initBalls();
    }

    // Attach event listener to the claim button
    if (btnClaimGacha) {
        btnClaimGacha.addEventListener('click', closeModal);
    }

    // [NEW] Event Listener for Withdraw Button
    const btnWithdrawVsol = document.getElementById('btn-withdraw-vsol');
    if (btnWithdrawVsol) {
        btnWithdrawVsol.addEventListener('click', () => {
            if(typeof playSFX === 'function') playSFX('click');
            if(virtualSolBalance <= 0) {
                 window.showSimplePopup("NO YIELD", "Your V-SOL balance is empty.", "#ff4444");
                 return;
            }
            window.showSimplePopup("WITHDRAWAL REQUEST", `A request to withdraw ${virtualSolBalance.toFixed(4)} SOL has been sent to the network. Processing may take up to 24 hours.`, "#3498db");
            // In a real app, this would trigger an API call to log the withdrawal request
            // For now, we simulate clearing the balance after a request
            virtualSolBalance = 0;
            const currentState = getState();
            updateState({ profile: { ...currentState.profile, virtualSol: virtualSolBalance } });
            updateVirtualWalletUI();
        });
    }

    // Initialize the gacha balls
    initBalls();
})();


document.addEventListener("DOMContentLoaded", initGame);
