/* =========================================
   DYNAMIC STARFIELD BACKGROUND
   ========================================= */

export const initStarfield = () => {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    // Fungsi untuk menyesuaikan ukuran layar (HP/PC)
    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        createStars();
    };

    // Membuat 150 bintang dengan ukuran & kecepatan acak
    const createStars = () => {
        stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5, // Ukuran bintang
                speed: Math.random() * 0.5 + 0.1, // Kecepatan gerak
                opacity: Math.random()
            });
        }
    };

    // Animasi bintang bergerak ke bawah
    const animate = () => {
        // Hapus frame sebelumnya (membuat efek jejak bersih)
        ctx.clearRect(0, 0, width, height);
        
        stars.forEach(star => {
            ctx.beginPath();
            // Efek bintang berkelip transparan
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Gerakkan bintang ke bawah
            star.y += star.speed;
            
            // Jika bintang melewati layar bawah, kembalikan ke atas
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
        });
        
        // Looping animasi
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();
};
