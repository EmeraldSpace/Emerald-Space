/* =========================================
   CRYPTO LOGIC - TON NETWORK (TMA OPTIMIZED)
   ========================================= */

import { playSFX } from './audio.js';

// === TON NETWORK SETTINGS ===
// GANTI dengan alamat dompet TON Anda (Wallet penerima dana transaksi)
const ADMIN_WALLET = 'UQCFs06is4MTGh_lOS7KsCkqvuR24bl5ypaWr6rampOM6B89'; 

// Inisialisasi TON Connect UI
export const tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://emerald-space.vercel.app/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-wrapper', // Menyuntikkan tombol ke HTML
    uiPreferences: {
        theme: 'DARK',      // Mengatur tema modal dompet agar gelap
        zIndex: 999999      // [PERBAIKAN] Memaksa pop-up dompet tampil di layer PALING DEPAN
    }
});

export const payWithTON = async (tonAmount) => {
    playSFX('click');
    
    try {
        if (!tonConnectUI.connected) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("ACCESS DENIED", "Please connect your TON Wallet first!", "#ff4444");
            }
            return { success: false };
        }

        // Konversi TON ke NanoTON (1 TON = 1,000,000,000 nanoTON)
        const nanoTon = Math.floor(tonAmount * 1000000000).toString();

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300, // Valid untuk 5 menit
            messages: [
                {
                    address: ADMIN_WALLET,
                    amount: nanoTon
                }
            ]
        };

        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup(
                "SECURE TRANSACTION", 
                `Requesting Pilot's signature to transfer <strong style="color:#0098EA;">${tonAmount} TON</strong>...<br><span style="font-size:10px; color:#8b949e;">Awaiting wallet authorization via Telegram/Tonkeeper.</span>`, 
                "#0098EA"
            );
        }

        // [FITUR BARU] Getaran Halus saat memanggil dompet (Khusus Telegram Web App)
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }

        // Kirim transaksi ke dompet pemain
        const result = await tonConnectUI.sendTransaction(transaction);
        
        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        
        // [FITUR BARU] Getaran Sukses
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        // Return success status so Shop UI can process item/gacha
        return { success: true, signature: result.boc };

    } catch (error) {
        console.error("TON TX Error:", error);
        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        
        // [FITUR BARU] Getaran Error/Batal
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }

        let msg = error.message || "Transaction aborted by Pilot.";
        if (msg.includes("User rejects") || msg.includes("reject")) msg = "TON transaction aborted by Pilot.";
        
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("TRANSACTION FAILED", msg, "#ff4444");
        }
        return { success: false, message: msg };
    }
};

/**
 * FUNCTION: CHECK TON BALANCE (FOR VIP MAP ACCESS)
 */
export const checkTonBalance = async () => {
    try {
        if (!tonConnectUI.connected || !tonConnectUI.account) return 0;

        const userAddress = tonConnectUI.account.address;

        // Membaca saldo dari public API Toncenter
        // Catatan Kapten: Jika game meledak ramai, kita mungkin perlu API Key dari @toncenter_bot
        const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${userAddress}`);
        const data = await response.json();

        if (data && data.ok) {
            // Konversi NanoTON kembali ke TON
            const tonBalance = parseInt(data.result) / 1000000000;
            return tonBalance;
        }
        return 0;
        
    } catch (error) {
        console.error("Failed to read TON balance sensor:", error);
        return 0;
    }
};
