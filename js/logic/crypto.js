/* =========================================
   CRYPTO LOGIC - MAINNET SOLANA & PRIVY INTEGRATION
   ========================================= */

import { playSFX } from './audio.js';

// === MAINNET SETTINGS ===
// Highly recommended to change this NETWORK to a paid RPC (Helius/Quicknode) for official release
const NETWORK = 'https://api.mainnet-beta.solana.com'; 
const ADMIN_WALLET = 'ExNJ84TBmLsy7FB4duYteK5bWXEEuofSStPHCcA7TeQc'; // REPLACE WITH YOUR SOLANA WALLET!
const PRIVY_APP_ID = 'YOUR_PRIVY_APP_ID_HERE'; // Get from dashboard.privy.io

let privyClient = null;

export const initPrivy = async () => {
    if (!window.Privy) {
        console.error("Privy SDK not loaded in HTML!");
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
                    logo: 'https://i.imgur.com/your-logo.png' // Replace with your game's logo URL
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                    noPromptOnSignature: true // Keeps in-game transactions smooth
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
            
            // 1. Triggers Privy popup (allows direct Telegram/Email login)
            await privyClient.login();
            
            // 2. Fetch user data directly from Privy memory after popup closes
            const user = privyClient.user;

            if (user) {
                // (OPTIONAL) The actual Privy Account ID (format: did:privy:...)
                const privyUserId = user.id; 
                console.log("🚀 Privy User ID:", privyUserId);

                // 3. Find the Solana wallet automatically created by Privy (Embedded Wallet)
                const solanaAccount = user.linkedAccounts.find(acc => acc.type === 'wallet' && acc.chainType === 'solana');
                
                if (solanaAccount) {
                    console.log("🌌 Privy Solana Wallet:", solanaAccount.address);
                    return solanaAccount.address; 
                } else {
                    throw new Error("Privy failed to create an embedded Solana wallet.");
                }
            } else {
                throw new Error("Login process cancelled or failed.");
            }
            
        } else if (walletType === 'phantom') {
            if (window.phantom && window.phantom.solana) {
                const resp = await window.phantom.solana.connect();
                return resp.publicKey.toString();
            } else {
                window.open('https://phantom.app/', '_blank');
                throw new Error("Phantom wallet not detected!");
            }
        } else if (walletType === 'solflare') {
            if (window.solflare) {
                await window.solflare.connect();
                return window.solflare.publicKey.toString();
            } else {
                window.open('https://solflare.com/', '_blank');
                throw new Error("Solflare wallet not detected!");
            }
        }
        return null;
    } catch (err) {
        console.error("Connection Error:", err);
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

        // If player logged in using Privy (Telegram/Email)
        if (privyClient && privyClient.authenticated) {
            if (typeof window.showSimplePopup === 'function') {
                window.showSimplePopup("SMART CONTRACT", `Processing payment of <strong>${solAmount} SOL</strong>...`, "var(--gold)");
            }
            
            const fromWallet = new solanaWeb3.PublicKey(privyClient.user.wallet.address);
            const tx = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({ fromPubkey: fromWallet, toPubkey: toWallet, lamports })
            );
            
            // Execute transaction directly via Privy embedded wallet
            const provider = await privyClient.getSolanaProvider();
            const signature = await provider.sendTransaction(tx, connection);
            
            const exist = document.getElementById('scifi-popup'); if(exist) exist.remove();
            return { success: true, signature };

        } else {
            // If player logged in using Extension (Phantom / Solflare)
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
        // <-- REPLACE WITH YOUR $EMRLD MINT ADDRESS! -->
        const EMRLD_MINT_ADDRESS = 'YOUR_EMRLD_MINT_ADDRESS_HERE'; 
        
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
        
        // Fetch token accounts owned by the wallet for the specific Mint Address
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
            mint: new solanaWeb3.PublicKey(EMRLD_MINT_ADDRESS)
        });

        if (tokenAccounts.value.length === 0) return 0; // Does not hold the token

        // Get the parsed UI amount (actual token amount, decimals adjusted)
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return balance;
        
    } catch (error) {
        console.error("Failed to detect $EMRLD balance:", error);
        return 0; 
    }
};
