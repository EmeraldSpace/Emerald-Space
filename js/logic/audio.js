/* =========================================
   AUDIO CONTROLLER (SEPARATE BGM & SFX TOGGLE)
   ========================================= */

const SFX = {
    click: new Audio('source/audio/click.ogg'),
    equip: new Audio('source/audio/select-equip.ogg'),
    sell: new Audio('source/audio/sell-item.ogg'),
    craftFail: new Audio('source/audio/crafting-failed.ogg'),
    monsterDie: new Audio('source/audio/monster-die.ogg'),
    shipBroke: new Audio('source/audio/ship-broke.ogg'),
    laser: new Audio('source/audio/laser.ogg'),
    craftSuccess: new Audio('source/audio/crafting-succes.ogg')
};

export const BGM = new Audio('source/audio/bgm.mp3');
BGM.loop = true;     
BGM.volume = 0.8;    // Volume Musik Latar (Lebih Keras)

// Variabel Mute Dipisah!
let isBgmMuted = false;
let isSfxMuted = false;
let isBgmPlaying = false; 

const unlockAudio = () => {
    if (!isBgmPlaying && !isBgmMuted) {
        BGM.play().then(() => {
            isBgmPlaying = true;
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        }).catch(() => {});
    }
};

document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

export const playSFX = (soundName) => {
    if (isSfxMuted || !SFX[soundName]) return; 
    const sound = SFX[soundName].cloneNode();
    sound.volume = 0.3; // Volume Efek Suara (Lebih Pelan)
    sound.play().catch(e => console.warn("SFX blocked:", e));
};

export const playBGM = () => {
    if (isBgmMuted || isBgmPlaying) return; 
    BGM.play().then(() => isBgmPlaying = true).catch(e => console.warn("BGM blocked:", e));
};

// === FUNGSI BARU: TOGGLE BGM & SFX TERPISAH ===
export const toggleBGM = () => {
    isBgmMuted = !isBgmMuted;
    if (isBgmMuted) {
        BGM.pause();
        isBgmPlaying = false;
    } else {
        playBGM();
    }
    return isBgmMuted;
};

export const toggleSFX = () => {
    isSfxMuted = !isSfxMuted;
    return isSfxMuted;
};
