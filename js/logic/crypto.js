/* =========================================
   CRYPTO LOGIC - DEVNET PURE SOL
   ========================================= */

import { playSFX } from './audio.js';

// === PURE SOL DEVNET SETTINGS ===
const NETWORK = 'https://api.devnet.solana.com';
const ADMIN_WALLET = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc'; // Your SOL receiving wallet

export const payWithSOL = async (solAmount) => {
    playSFX('click');
    
    try {
        let provider = null;
        if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
            provider = window.phantom.solana;
        } else if (window.solflare && window.solflare.isConnected) {
            provider = window.solflare;
        } else {
            provider = window.solana;
        }

        if (!provider || !provider.publicKey) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("ACCESS DENIED", "Please connect your Solana Wallet first!", "#ff4444");
            }
            return { success: false };
        }

        const solanaWeb3 = window.solanaWeb3;
        if (!solanaWeb3) throw new Error("Solana Web3 Library missing!");

        const connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
        const fromWallet = provider.publicKey;
        const toWallet = new solanaWeb3.PublicKey(ADMIN_WALLET);
        
        // Convert SOL amount to smallest unit (Lamports)
        // 1 SOL = 1,000,000,000 Lamports
        const lamports = Math.floor(solAmount * solanaWeb3.LAMPORTS_PER_SOL);

        // Native SOL transfer instruction (Very simple!)
        const transferInstruction = solanaWeb3.SystemProgram.transfer({
            fromPubkey: fromWallet,
            toPubkey: toWallet,
            lamports: lamports
        });

        const transaction = new solanaWeb3.Transaction().add(transferInstruction);
        transaction.feePayer = fromWallet;
        
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;

        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup(
                "SECURE TRANSACTION", 
                `Requesting Pilot's signature to transfer <strong class="text-gold">${solAmount} SOL (Devnet)</strong>...<br><span style="font-size:10px; color:#8b949e;">Awaiting wallet authorization.</span>`, 
                "var(--gold)"
            );
        }

        // Request wallet signature (Phantom popup appears here)
        const signedTransaction = await provider.signTransaction(transaction);
        
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("TRANSMITTING", "Verifying signal on the blockchain...", "#3498db");
        }

        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature, 'confirmed');

        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        
        // Return success status so Shop UI can process item/gacha
        return { success: true, signature };

    } catch (error) {
        console.error("SOL TX Error:", error);
        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        
        let msg = error.message;
        if(msg.includes("User rejected")) msg = "SOL transaction aborted by Pilot.";
        
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
        let provider = null;
        if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
            provider = window.phantom.solana;
        } else if (window.solflare && window.solflare.isConnected) {
            provider = window.solflare;
        } else {
            provider = window.solana;
        }

        if (!provider || !provider.publicKey) return 0;

        const solanaWeb3 = window.solanaWeb3;
        const connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
        
        // Read balance directly from the blockchain
        const balance = await connection.getBalance(provider.publicKey);
        
        // Convert smallest unit (Lamports) to SOL
        const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        return solBalance;
        
    } catch (error) {
        console.error("Failed to read SOL balance sensor:", error);
        return 0;
    }
};
