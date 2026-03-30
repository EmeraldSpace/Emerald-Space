/* =========================================
   GLOBAL STATE MANAGEMENT - SOLANA NETWORK SYNC (V5.4)
   ========================================= */

export const SHIPS = {
    INTERCEPTOR: { hp: 200, atk: 50, def: 10, speed: 80, image: "source/ships/ship1.png" },
    DREADNOUGHT: { hp: 500, atk: 80, def: 40, speed: 30, image: "source/ships/ship2.png" },
    EXPLORER: { hp: 300, atk: 40, def: 20, speed: 60, image: "source/ships/ship3.png" }
};

const SUPABASE_URL = 'https://ucoiceirejfvfshqcluq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2ljZWlyZWpmdmZzaHFjbHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDMwNjIsImV4cCI6MjA4OTIxOTA2Mn0.kgCDbH5e6dvZLWm2b9FPXa51_AQq7-ZiHaD7GgpeICc';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const initialState = {
    profile: {
        level: 1, xp: 0, gold: 10000, iron_ore: 0, dark_energy: 0, 
        virtualSol: 0, virtualEmrld: 0, emrldBalance: 0, // [NEW] VIRTUAL WALLET & TOKEN HOLDINGS
        shipClass: 'INTERCEPTOR', isElite: false,
        stamina: 50, maxStamina: 50, currentHp: 200, walletAddress: null,
        telegram_id: null, 
        referred_by: null  
    },
    inventory: [],
    equipped: { weapon: null, hull: null, shield: null, engine: null, cpu: null },
    currentStats: { hp: 200, maxHp: 200, atk: 50, def: 10, speed: 80, powerScore: 0 },
    metadata: { lastLocationId: 1 }
};

let currentState = { ...initialState };
let currentUserAddress = null;

let isSyncingInventory = false;
let pendingInventorySync = false;

export const getState = () => currentState;

// --- 1. PULL DATA FROM SERVER ---
export const loadStateFromServer = async (walletAddress) => {
    currentUserAddress = walletAddress;
    try {
        const { data: profile, error: pError } = await supabase
            .from('players')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (pError && pError.code !== 'PGRST116') throw pError;

        if (profile) {
            currentState.profile = {
                ...currentState.profile,
                id: profile.id,
                username: profile.username,
                walletAddress: profile.solana_wallet || profile.wallet_address, 
                telegram_id: profile.telegram_id || null, 
                referred_by: profile.referred_by || null, 
                level: profile.level ?? 1,
                xp: profile.xp ?? 0,
                maxXp: profile.max_xp ?? 100,
                gold: profile.gold ?? 0,
                iron_ore: profile.iron_ore ?? 0,
                dark_energy: profile.dark_energy ?? 0,
                virtualSol: profile.virtual_sol ?? 0, // [NEW] PULL V-SOL
                virtualEmrld: profile.virtual_emrld ?? 0, // [NEW] PULL V-EMRLD
                emrldBalance: profile.emrld_balance ?? 0, // [NEW] PULL REAL TOKEN BALANCE
                stamina: profile.stamina ?? 50,
                maxStamina: profile.max_stamina ?? 50,
                currentHp: profile.current_hp ?? 200,
                shipClass: profile.ship_class ?? 'INTERCEPTOR',
                nextFullRegen: profile.next_full_regen ?? null,
                isElite: profile.is_elite ?? false
            };

            const { data: invItems, error: iError } = await supabase
                .from('inventory')
                .select('*')
                .eq('player_id', profile.id);

            if (!iError && invItems) {
                currentState.inventory = invItems
                    .filter(item => !item.is_equipped)
                    .map(item => ({
                        id: item.item_code, name: item.name, type: item.type,
                        rarity: item.rarity, image: item.image, stats: item.stats
                    }));

                currentState.equipped = { weapon: null, hull: null, shield: null, engine: null, cpu: null };
                invItems.filter(i => i.is_equipped).forEach(i => {
                    currentState.equipped[i.equipped_slot] = {
                        id: i.item_code, name: i.name, type: i.type,
                        rarity: i.rarity, image: i.image, stats: i.stats
                    };
                });
            }
        }
        return { success: true, data: currentState };
    } catch (error) {
        console.error("[SUPABASE] Load Error:", error);
        return { success: false, error: error.message };
    }
};

// --- 2. PUSH DATA TO SERVER ---
export const updateState = (newData) => {
    currentState = { ...currentState, ...newData };
    localStorage.setItem('EMERALD_SPACE_SAVE_V5', JSON.stringify(currentState));

    if (currentUserAddress) {
        if (newData.profile) syncProfile(newData.profile);
        if (newData.inventory || newData.equipped) safeSyncInventory();
    }
    return currentState;
};

const syncProfile = async (p) => {
    const username = p.username || currentState.profile.username;
    if (!supabase || !currentUserAddress || !username || username === 'ANONYMOUS') {
        return;
    }

    try {
        const payload = {
            wallet_address: currentUserAddress, 
            solana_wallet: p.walletAddress || currentState.profile.walletAddress || null, 
            telegram_id: p.telegram_id || currentState.profile.telegram_id || null, 
            referred_by: p.referred_by || currentState.profile.referred_by || null, 
            username: username,
            ship_class: p.shipClass || currentState.profile.shipClass,
            level: p.level ?? currentState.profile.level,
            xp: p.xp ?? currentState.profile.xp,
            max_xp: p.maxXp ?? currentState.profile.maxXp,
            gold: p.gold ?? currentState.profile.gold,
            iron_ore: p.iron_ore ?? currentState.profile.iron_ore,
            dark_energy: p.dark_energy ?? currentState.profile.dark_energy,
            virtual_sol: p.virtualSol ?? currentState.profile.virtualSol, // [NEW] PUSH V-SOL
            virtual_emrld: p.virtualEmrld ?? currentState.profile.virtualEmrld, // [NEW] PUSH V-EMRLD
            emrld_balance: p.emrldBalance ?? currentState.profile.emrldBalance, // [NEW] PUSH REAL TOKEN BALANCE
            current_hp: p.currentHp ?? currentState.profile.currentHp,
            stamina: p.stamina ?? currentState.profile.stamina,
            max_stamina: p.maxStamina ?? currentState.profile.maxStamina,
            next_full_regen: p.nextFullRegen ?? currentState.profile.nextFullRegen,
            is_elite: p.isElite ?? currentState.profile.isElite
        };
        const { data, error } = await supabase
            .from('players')
            .upsert(payload, { onConflict: 'wallet_address' })
            .select('id')
            .single();

        if (data && data.id) {
            currentState.profile.id = data.id;
            safeSyncInventory(); 
        }
    } catch (e) { console.error("Sync Profile Error:", e); }
};

const safeSyncInventory = async () => {
    if (isSyncingInventory) {
        pendingInventorySync = true;
        return;
    }
    isSyncingInventory = true;
    await syncInventory();
    isSyncingInventory = false;
    if (pendingInventorySync) {
        pendingInventorySync = false;
        safeSyncInventory();
    }
};

const syncInventory = async () => {
    if (!supabase || !currentState.profile.id) return;
    try {
        const playerId = currentState.profile.id;
        let payload = [];
        
        if (currentState.inventory) {
            currentState.inventory.forEach(item => {
                payload.push({
                    item_code: item.id, name: item.name, type: item.type,
                    rarity: item.rarity, image: item.image, stats: item.stats,
                    is_equipped: false, equipped_slot: null
                });
            });
        }
        
        if (currentState.equipped) {
            Object.keys(currentState.equipped).forEach(slot => {
                const item = currentState.equipped[slot];
                if (item) {
                    payload.push({
                        item_code: item.id, name: item.name, type: item.type,
                        rarity: item.rarity, image: item.image, stats: item.stats,
                        is_equipped: true, equipped_slot: slot
                    });
                }
            });
        }
        
        const { error } = await supabase.rpc('sync_player_inventory', { 
            p_player_id: playerId, 
            p_items: payload 
        });
        
        if (error) throw error;
    } catch (e) {
        console.error("[CRITICAL] Inventory Sync Failed:", e);
    }
};

// --- 3. UTILITIES ---
export const getTopPlayers = async () => {
    try {
        const { data, error } = await supabase
            .from('players')
            .select('username, level, gold, ship_class, is_elite')
            .order('level', { ascending: false })
            .order('gold', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        return [];
    }
};

export const checkAndRecoverWallet = async (solanaAddress) => {
    if (!supabase || !solanaAddress) return false;
    try {
        const { data, error } = await supabase
            .from('players')
            .select('wallet_address, username')
            .eq('solana_wallet', solanaAddress)
            .single();

        if (data && data.wallet_address) {
            if (localStorage.getItem('EMERALD_DEVICE_ID_V5') !== data.wallet_address) {
                localStorage.setItem('EMERALD_DEVICE_ID_V5', data.wallet_address);
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
};

export const resetState = () => {
    currentState = { ...initialState };
    localStorage.removeItem('EMERALD_SPACE_SAVE_V5');
    localStorage.removeItem('EMERALD_DEVICE_ID_V5');
    window.location.reload();
};

// ==========================================
// 4. REFERRAL SYSTEM LOGIC (DIRECT DB UPDATE)
// ==========================================
export const setReferrer = async (newPlayerWallet, inviterTelegramId) => {
    try {
        if (!supabase) return false;

        // 1. Cek apakah pemain baru ini (newPlayer) sudah punya catatan di Supabase
        const { data: newPlayer, error: fetchErr } = await supabase
            .from('players') 
            .select('referred_by')
            .eq('solana_wallet', newPlayerWallet) 
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error("[REFERRAL] Check error:", fetchErr);
            return false;
        }

        // 2. Jika pemain baru belum punya 'referred_by'
        if (!newPlayer || !newPlayer.referred_by) {
            
            console.log(`[REFERRAL] Memproses referral. Inviter ID: ${inviterTelegramId}`);

            // 3. Simpan ID Pengundang ke profil pemain baru
            await supabase
                .from('players')
                .update({ referred_by: inviterTelegramId })
                .eq('solana_wallet', newPlayerWallet); 

            // 4. Cari profil si Pengundang (Inviter) berdasarkan telegram_id mereka
            const { data: inviterData, error: inviterErr } = await supabase
                .from('players')
                .select('wallet_address, gold')
                .eq('telegram_id', inviterTelegramId.toString()) 
                .single();

            // 5. Jika Pengundang ditemukan, beri mereka 5,000 GOLD!
            if (inviterData && !inviterErr) {
                const updatedGold = (inviterData.gold || 0) + 5000;
                
                await supabase
                    .from('players')
                    .update({ gold: updatedGold })
                    .eq('wallet_address', inviterData.wallet_address);
                    
                console.log(`[REFERRAL SUCCESS] 5,000 Gold dikirim ke Inviter: ${inviterTelegramId}`);
                return true;
            } else {
                 console.log(`[REFERRAL FAILED] Pengundang dengan ID ${inviterTelegramId} tidak ditemukan di database.`);
            }
        } else {
            console.log("[REFERRAL] Pemain ini sudah direkrut sebelumnya.");
            return false;
        }
    } catch (err) {
        console.error("Critical Referral Error:", err);
        return false;
    }
};
