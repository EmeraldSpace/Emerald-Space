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
    playSFX('click');
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
                    throw new Error("Embedded wallet creation failed.");
                }
            } else {
                throw new Error("Login cancelled.");
            }
            
        } else if (walletType === 'phantom') {
            if (window.phantom && window.phantom.solana) {
                const resp = await window.phantom.solana.connect();
                return resp.publicKey.toString();
            } else {
                throw new Error("Phantom not found! If on mobile, open this game inside the Phantom App browser.");
            }
        } else if (walletType === 'solflare') {
            if (window.solflare) {
                await window.solflare.connect();
                return window.solflare.publicKey.toString();
            } else {
                throw new Error("Solflare not found! If on mobile, open this game inside the Solflare App browser.");
            }
        }
        return null;
    } catch (err) {
        console.error("Connection Error:", err);
        if (typeof window.showSimplePopup === 'function') {
            window.showSimplePopup("WALLET CONNECTION", err.message, "#ff4444");
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
    playSFX('click');
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
        if(msg.includes("User rejected")) msg = "Transaction aborted by Pilot.";
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
