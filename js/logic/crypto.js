/* =========================================
   CRYPTO LOGIC - SOLANA NETWORK (MULTI-WALLET & AUTO-RECOVER)
   ========================================= */

import { playSFX } from './audio.js';
import { getState, updateState } from './state.js';

const ADMIN_WALLET = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc'; 
const NETWORK = 'https://mainnet.helius-rpc.com/?api-key=79850b9a-0b16-45cc-9ff8-b38375ea7d14';
const EMRLD_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Kontrak SPL Token ($EMRLD/USDC)

export let solanaConnection = null;
export let connectedWalletAddress = null;
export let activeProvider = null; 

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
        activeProvider = provider; 
        
        // Saat terkoneksi, langsung baca saldo EMRLD untuk akses VIP Map
        checkEmrldBalance();

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
 * FUNCTION: PAY WITH SOLANA COIN (NATIVE SOL)
 */
export const payWithSOL = async (solAmount) => {
    playSFX('click');
    
    try {
        let provider = activeProvider;
        if (!provider) {
            if (window.phantom && window.phantom.solana) provider = window.phantom.solana;
            else if (window.solflare) provider = window.solflare;
            else if (window.solana) provider = window.solana;
        }

        let currentWallet = connectedWalletAddress;
        if (!currentWallet) {
            const state = getState();
            currentWallet = state.profile.walletAddress || state.profile.solana_wallet;
        }

        if (!provider || !currentWallet) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("SESSION EXPIRED", "For your security, please tap <b>DISCONNECT WALLET</b> in the INFO menu and reconnect your wallet to authorize this purchase.", "#ff4444");
            }
            return { success: false };
        }
        
        try {
            if (!provider.isConnected) await provider.connect({ onlyIfTrusted: true });
        } catch(e) {}

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

        const fromPubkey = new window.solanaWeb3.PublicKey(currentWallet);
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

        const { signature } = await provider.signAndSendTransaction(transaction);
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
 * FUNCTION: PAY WITH $EMRLD SPL TOKEN (GACHA MACHINE)
 */
export const payWithEMRLD = async (emrldAmount) => {
    playSFX('click');
    
    try {
        let provider = activeProvider;
        if (!provider) {
            if (window.phantom && window.phantom.solana) provider = window.phantom.solana;
            else if (window.solflare) provider = window.solflare;
            else if (window.solana) provider = window.solana;
        }

        let currentWallet = connectedWalletAddress;
        if (!currentWallet) {
            const state = getState();
            currentWallet = state.profile.walletAddress || state.profile.solana_wallet;
        }

        if (!provider || !currentWallet || !window.Buffer) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("SESSION EXPIRED", "Wallet not connected or system library missing.", "#ff4444");
            }
            return { success: false };
        }

        try { if (!provider.isConnected) await provider.connect({ onlyIfTrusted: true }); } catch(e) {}

        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup(
                "TOKEN TRANSFER", 
                `Requesting Pilot's signature to inject <strong style="color:#14F195;">${emrldAmount} EMRLD</strong> into the Bazaar Machine...<br><span style="font-size:10px; color:#8b949e;">Awaiting wallet authorization.</span>`, 
                "#14F195"
            );
        }

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }

        // Web3 SPL Token Variables
        const walletPubkey = new window.solanaWeb3.PublicKey(currentWallet);
        const adminPubkey = new window.solanaWeb3.PublicKey(ADMIN_WALLET);
        const mintPubkey = new window.solanaWeb3.PublicKey(EMRLD_MINT_ADDRESS);
        const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new window.solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

        // Helper to derive Associated Token Account (ATA)
        const getATA = (wallet, mint) => {
            return window.solanaWeb3.PublicKey.findProgramAddressSync(
                [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
                SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
            )[0];
        };

        const sourceATA = getATA(walletPubkey, mintPubkey);
        const destATA = getATA(adminPubkey, mintPubkey);

        // Convert amount based on Token Decimals (Assumed 6 for USDC/EMRLD standard)
        const decimals = 6;
        const rawAmount = Math.floor(emrldAmount * Math.pow(10, decimals));
        const amountBigInt = BigInt(rawAmount);

        // Construct Raw Instruction Buffer for SPL Transfer (Instruction index 3)
        const dataBuffer = window.Buffer.alloc(9);
        dataBuffer.writeUInt8(3, 0); 
        dataBuffer.writeBigUInt64LE(amountBigInt, 1);

        const transferInstruction = new window.solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: sourceATA, isSigner: false, isWritable: true },
                { pubkey: destATA, isSigner: false, isWritable: true },
                { pubkey: walletPubkey, isSigner: true, isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: dataBuffer
        });

        const transaction = new window.solanaWeb3.Transaction().add(transferInstruction);

        const { blockhash } = await solanaConnection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletPubkey;

        const { signature } = await provider.signAndSendTransaction(transaction);
        await solanaConnection.confirmTransaction(signature, 'confirmed');

        const exist = document.getElementById('scifi-popup'); 
        if(exist) exist.remove();
        
        // Update local balance immediately after successful transfer
        checkEmrldBalance();

        return { success: true, signature: signature };

    } catch (error) {
        console.error("EMRLD SPL TX Error:", error);
        const exist = document.getElementById('scifi-popup'); 
        if(exist) exist.remove();
        
        let msg = error.message || "Transaction aborted by Pilot or ATA missing.";
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("TRANSACTION FAILED", msg, "#ff4444");
        }
        return { success: false, message: msg };
    }
};

/**
 * FUNCTION: CHECK SOL BALANCE
 */
export const checkSolBalance = async () => {
    try {
        let currentWallet = connectedWalletAddress;
        if (!currentWallet) {
            const state = getState();
            currentWallet = state.profile.walletAddress || state.profile.solana_wallet;
        }

        if (!currentWallet || !solanaConnection) return 0;

        const pubKey = new window.solanaWeb3.PublicKey(currentWallet);
        const balance = await solanaConnection.getBalance(pubKey);
        
        return balance / window.solanaWeb3.LAMPORTS_PER_SOL;
        
    } catch (error) {
        console.error("Failed to read SOL balance sensor:", error);
        return 0;
    }
};

/**
 * FUNCTION: CHECK EMRLD BALANCE (VIP ACCESS SENSOR)
 */
export const checkEmrldBalance = async () => {
    try {
        let currentWallet = connectedWalletAddress;
        if (!currentWallet) {
            const state = getState();
            currentWallet = state.profile.walletAddress || state.profile.solana_wallet;
        }
        if (!currentWallet) return 0;

        const req = await fetch(NETWORK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 1,
                method: 'getTokenAccountsByOwner',
                params: [
                    currentWallet,
                    { mint: EMRLD_MINT_ADDRESS },
                    { encoding: 'jsonParsed' }
                ]
            })
        });
        
        const data = await req.json();
        let balance = 0;
        
        if (data && data.result && data.result.value && data.result.value.length > 0) {
            balance = parseFloat(data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount) || 0;
        }
        
        // Sinkronisasi saldo EMRLD ke sistem state lokal dan server
        const state = getState();
        updateState({ profile: { ...state.profile, emrldBalance: balance } });
        
        return balance;
    } catch (error) {
        console.error("Failed to read EMRLD balance sensor:", error);
        return 0;
    }
};
