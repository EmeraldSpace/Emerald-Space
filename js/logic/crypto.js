/* =========================================
   CRYPTO LOGIC - SOLANA NETWORK (MULTI-WALLET READY)
   ========================================= */

import { playSFX } from './audio.js';

const ADMIN_WALLET = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc'; 
const NETWORK = 'https://mainnet.helius-rpc.com/?api-key=79850b9a-0b16-45cc-9ff8-b38375ea7d14';

export let solanaConnection = null;
export let connectedWalletAddress = null;
export let activeProvider = null; // Menyimpan dompet mana yang aktif (Phantom/Solflare)

// Initialize Web3 Connection
if (window.solanaWeb3) {
    solanaConnection = new window.solanaWeb3.Connection(NETWORK, 'confirmed');
}

/**
 * FUNCTION: CONNECT SOLANA WALLET
 */
export const connectSolanaWallet = async (walletType) => {
    playSFX('click');
    
    try {
        let provider = null;
        
        // Deteksi Phantom
        if (walletType === 'phantom') {
            provider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
            if (!provider) {
                if (typeof window.showSimplePopup === 'function') {
                    window.showSimplePopup("WALLET NOT FOUND", "Please install Phantom wallet or open the game inside Phantom App Browser!", "#ab9ff2");
                }
                return { success: false };
            }
        } 
        // Deteksi Solflare
        else if (walletType === 'solflare') {
            provider = window.solflare || (window.solana?.isSolflare ? window.solana : null);
            if (!provider) {
                if (typeof window.showSimplePopup === 'function') {
                    window.showSimplePopup("WALLET NOT FOUND", "Please install Solflare wallet or open the game inside Solflare App Browser!", "#ff7b00");
                }
                return { success: false };
            }
        }

        const resp = await provider.connect();
        connectedWalletAddress = resp.publicKey.toString();
        activeProvider = provider; // Simpan provider agar dipakai saat bayar
        
        return { success: true, address: connectedWalletAddress };
    } catch (error) {
        console.error("Wallet connection failed:", error);
        let msg = error.message || "Connection aborted.";
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("CONNECTION FAILED", msg, "#ff4444");
        }
        return { success: false, message: msg };
    }
};

/**
 * FUNCTION: PAY WITH SOLANA
 */
export const payWithSOL = async (solAmount) => {
    playSFX('click');
    
    try {
        if (!activeProvider || !connectedWalletAddress) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("ACCESS DENIED", "Please connect your Solana Wallet first!", "#ff4444");
            }
            return { success: false };
        }

        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup(
                "SECURE TRANSACTION", 
                `Requesting Pilot's signature to transfer <strong style="color:#14F195;">${solAmount} SOL</strong>...<br><span style="font-size:10px; color:#8b949e;">Awaiting wallet authorization.</span>`, 
                "#14F195"
            );
        }

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }

        const fromPubkey = new window.solanaWeb3.PublicKey(connectedWalletAddress);
        const toPubkey = new window.solanaWeb3.PublicKey(ADMIN_WALLET);
        const lamports = Math.floor(solAmount * window.solanaWeb3.LAMPORTS_PER_SOL);

        const transaction = new window.solanaWeb3.Transaction().add(
            window.solanaWeb3.SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports
            })
        );

        const { blockhash } = await solanaConnection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const { signature } = await activeProvider.signAndSendTransaction(transaction);
        await solanaConnection.confirmTransaction(signature, 'confirmed');

        const exist = document.getElementById('scifi-popup'); 
        if(exist) exist.remove();
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        return { success: true, signature: signature };

    } catch (error) {
        console.error("Solana TX Error:", error);
        const exist = document.getElementById('scifi-popup'); 
        if(exist) exist.remove();
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }

        let msg = error.message || "Transaction aborted by Pilot.";
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("TRANSACTION FAILED", msg, "#ff4444");
        }
        return { success: false, message: msg };
    }
};

/**
 * FUNCTION: CHECK SOL BALANCE (FOR VIP MAP ACCESS)
 */
export const checkSolBalance = async () => {
    try {
        if (!connectedWalletAddress || !solanaConnection) return 0;

        const pubKey = new window.solanaWeb3.PublicKey(connectedWalletAddress);
        const balance = await solanaConnection.getBalance(pubKey);
        
        return balance / window.solanaWeb3.LAMPORTS_PER_SOL;
        
    } catch (error) {
        console.error("Failed to read SOL balance sensor:", error);
        return 0;
    }
};
