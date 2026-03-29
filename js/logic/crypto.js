/* =========================================
   CRYPTO LOGIC - MAINNET SOLANA & PRIVY INTEGRATION
   ========================================= */

import { playSFX } from './audio.js';

// === MAINNET SETTINGS ===
// Using Helius RPC path with Domain Whitelist secured via Helius Dashboard
const NETWORK = 'https://mainnet.helius-rpc.com/?api-key=79850b9a-0b16-45cc-9ff8-b38375ea7d14';
const ADMIN_WALLET = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc'; 
const PRIVY_APP_ID = 'cmnam2ras00gj0cl22pik3xih'; 

let privyClient = null;

export const initPrivy = async () => {
    if (!window.Privy) {
        console.error("Privy SDK not loaded in HTML!");
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("SYSTEM ERROR", "Web3 Library failed to load. Please refresh.", "#ff4444");
        }
        return false;
    }
    if (!privyClient) {
        privyClient = new window.Privy.PrivyClient({
            appId: PRIVY_APP_ID,
            config: {
                loginMethods: ['telegram', 'email', 'wallet'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#14F195',
                    logo: 'https://i.imgur.com/your-logo.png' 
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                    noPromptOnSignature: true 
                }
            }
        });
    }
    return true;
};

// Multi-Provider Connect Wallet (Telegram/Privy, Phantom, Solflare)
export const connectWallet = async (walletType) => {
    if (typeof playSFX === 'function') playSFX('click');
    
    // Detect if the user is on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
        if (walletType === 'privy' || walletType === 'telegram') {
            await initPrivy();
            await privyClient.login();
            
            const user = privyClient.user;
            if (user) {
                const solanaAccount = user.linkedAccounts.find(acc => acc.type === 'wallet' && acc.chainType === 'solana');
                if (solanaAccount) {
                    return solanaAccount.address; 
                } else {
                    throw new Error("Embedded wallet creation failed. Please try again.");
                }
            } else {
                throw new Error("Login cancelled by Pilot.");
            }
            
        } else if (walletType === 'phantom') {
            // FORCE DEEP LINK: If mobile and NOT inside Phantom's in-app browser
            if (isMobile && (!window.phantom || !window.phantom.solana || !window.phantom.solana.isPhantom)) {
                const currentUrl = encodeURIComponent(window.location.href);
                window.location.href = `https://phantom.app/ul/browse/${currentUrl}?ref=${currentUrl}`;
                return new Promise(() => {}); // Pause execution while redirecting
            }

            // Normal connection for PC or inside Phantom App
            if (window.phantom && window.phantom.solana) {
                const resp = await window.phantom.solana.connect();
                return resp.publicKey.toString();
            } else {
                throw new Error("Phantom extension not found! Please install it.");
            }
            
        } else if (walletType === 'solflare') {
            // FORCE DEEP LINK: If mobile and NOT inside Solflare's in-app browser
            if (isMobile && (!window.solflare || !window.solflare.isSolflare)) {
                const currentUrl = encodeURIComponent(window.location.href);
                window.location.href = `https://solflare.com/ul/v1/browse/${currentUrl}?ref=${currentUrl}`;
                return new Promise(() => {}); // Pause execution
            }

            // Normal connection for PC or inside Solflare App
            if (window.solflare) {
                await window.solflare.connect();
                return window.solflare.publicKey.toString();
            } else {
                throw new Error("Solflare extension not found! Please install it.");
            }
        }
        return null;

    } catch (err) {
        console.error("Connection Error:", err);
        if (typeof window.showSimplePopup === 'function') {
            let errorMsg = err.message || "Unknown error occurred.";
            
            // Translate generic Web3 rejection errors into readable game lore
            if (errorMsg.includes("User rejected") || errorMsg.includes("canceled") || errorMsg.includes("not been authorized")) {
                errorMsg = "Connection request was cancelled by the Pilot.";
            }
            
            window.showSimplePopup("WALLET CONNECTION", errorMsg, "#ff4444");
        }
        return null;
    }
};

export const disconnectWallet = async () => {
    try {
        if (privyClient && privyClient.authenticated) {
            await privyClient.logout();
        }
        if (window.phantom && window.phantom.solana) {
            await window.phantom.solana.disconnect();
        }
        if (window.solflare) {
            await window.solflare.disconnect();
        }
        return true;
    } catch (err) {
        console.error("Disconnect Error:", err);
        return false;
    }
};

export const payWithSOL = async (solAmount) => {
    if (typeof playSFX === 'function') playSFX('click');
    try {
        const solanaWeb3 = window.solanaWeb3;
        if (!solanaWeb3) throw new Error("Solana Web3 Library missing!");
        
        const connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
        const toWallet = new solanaWeb3.PublicKey(ADMIN_WALLET);
        const lamports = Math.floor(solAmount * solanaWeb3.LAMPORTS_PER_SOL);

        if (privyClient && privyClient.authenticated) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("SMART CONTRACT", `Processing payment of <strong>${solAmount} SOL</strong>...`, "var(--gold)");
            }
            
            const fromWallet = new solanaWeb3.PublicKey(privyClient.user.wallet.address);
            const tx = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({ fromPubkey: fromWallet, toPubkey: toWallet, lamports })
            );
            
            const provider = await privyClient.getSolanaProvider();
            const signature = await provider.sendTransaction(tx, connection);
            
            const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
            return { success: true, signature };

        } else {
            let provider = null;
            if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) provider = window.phantom.solana;
            else if (window.solflare && window.solflare.isConnected) provider = window.solflare;

            if (!provider) throw new Error("Wallet not connected!");

            const fromWallet = provider.publicKey;
            const tx = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({ fromPubkey: fromWallet, toPubkey: toWallet, lamports })
            );
            
            tx.feePayer = fromWallet;
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            tx.recentBlockhash = blockhash;

            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("SECURE TRANSACTION", `Awaiting wallet signature for <strong>${solAmount} SOL</strong>...`, "var(--gold)");
            }

            const signedTransaction = await provider.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
            return { success: true, signature };
        }
    } catch (error) {
        console.error("SOL TX Error:", error);
        const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
        let msg = error.message;
        if(msg.includes("User rejected") || msg.includes("canceled") || msg.includes("not been authorized")) {
            msg = "Transaction aborted by Pilot.";
        }
        if (typeof window.showSimplePopup === 'function') window.showSimplePopup("TRANSACTION FAILED", msg, "#ff4444");
        return { success: false, message: msg };
    }
};

export const checkSolBalance = async () => {
    try {
        const solanaWeb3 = window.solanaWeb3;
        const connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
        let pubKey = null;

        if (privyClient && privyClient.authenticated && privyClient.user.wallet) {
            pubKey = new solanaWeb3.PublicKey(privyClient.user.wallet.address);
        } else if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
            pubKey = window.phantom.solana.publicKey;
        } else if (window.solflare && window.solflare.isConnected) {
            pubKey = window.solflare.publicKey;
        }

        if (!pubKey) return 0;
        const balance = await connection.getBalance(pubKey);
        return balance / solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
        console.error("Failed to read SOL balance:", error);
        return 0;
    }
};

/**
 * FUNCTION: CHECK SPL TOKEN BALANCE ($EMRLD)
 */
export const checkEmrldBalance = async () => {
    try {
        // TBA: Token not yet officially launched. Kept empty to disable VIP gates safely.
        const EMRLD_MINT_ADDRESS = ''; 
        
        if (!EMRLD_MINT_ADDRESS) {
            console.warn("System Notice: $EMRLD token contract is currently empty (TBA). Returning 0 balance.");
            return 0; 
        }

        const solanaWeb3 = window.solanaWeb3;
        let pubKey = null;
        
        if (privyClient && privyClient.authenticated && privyClient.user.wallet) {
            pubKey = new solanaWeb3.PublicKey(privyClient.user.wallet.address);
        } else if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
            pubKey = window.phantom.solana.publicKey;
        } else if (window.solflare && window.solflare.isConnected) {
            pubKey = window.solflare.publicKey;
        }

        if (!pubKey) return 0;

        const connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
        
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
            mint: new solanaWeb3.PublicKey(EMRLD_MINT_ADDRESS)
        });

        if (tokenAccounts.value.length === 0) return 0; 

        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return balance;
        
    } catch (error) {
        console.error("Failed to detect $EMRLD balance:", error);
        return 0; 
    }
};
