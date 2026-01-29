export class RadioPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;

        // Hooks for UI updates (to be set by app)
        this.onPlay = null;
        this.onPause = null;
        this.onError = null;
        this.onLoadStart = null;
        this.onTimerEnd = null; // New hook

        this.sleepTimerId = null;

        this._initListeners();
    }

    _initListeners() {
        this.audio.addEventListener('error', (e) => {
            console.error('Audio Error:', e);
            if (this.onError) this.onError(e);
            this.isPlaying = false;
        });

        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
            if (this.onPlay) this.onPlay();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPause) this.onPause();
        });

        this.audio.addEventListener('waiting', () => {
            if (this.onLoadStart) this.onLoadStart();
        });
    }

    play(url) {
        if (!url) return;
        this.audio.src = url;
        this.audio.play().catch(e => {
            console.error("Play failed", e);
            if (this.onError) this.onError(e);
        });
    }

    toggle() {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }

    setVolume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value));
    }

    /**
     * Start sleep timer
     * @param {number} minutes 
     */
    startSleepTimer(minutes) {
        this.cancelSleepTimer(); // Clear existing
        if (minutes <= 0) return;

        console.log(`Sleep timer set for ${minutes} minutes`);
        this.sleepTimerId = setTimeout(() => {
            this.audio.pause();
            if (this.onTimerEnd) this.onTimerEnd();
        }, minutes * 60 * 1000);
    }

    cancelSleepTimer() {
        if (this.sleepTimerId) {
            clearTimeout(this.sleepTimerId);
            this.sleepTimerId = null;
        }
    }

    // --- Visualizer (Simulation) ---
    startVisualizer(canvas) {
        if (!canvas) return;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bars = 30; // Number of bars
        this._animateVisualizer();
    }

    _animateVisualizer() {
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            if (!this.ctx || !this.canvas) return;

            const w = this.canvas.width = this.canvas.offsetWidth;
            const h = this.canvas.height = this.canvas.offsetHeight;
            const ctx = this.ctx;

            ctx.clearRect(0, 0, w, h);

            if (!this.isPlaying) {
                // Flat quiet line
                ctx.beginPath();
                ctx.moveTo(0, h / 2);
                ctx.lineTo(w, h / 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
                return;
            }

            // --- Premium Sound Mesh / Ribbon Visualizer ---
            const time = Date.now() / 1000;
            const centerY = h / 2;
            const lines = 12; // Number of lines in the ribbon

            ctx.globalCompositeOperation = 'screen'; // Additive blending for glow look

            // Use App Theme Colors
            const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00f3ff';
            const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#bc13fe';

            for (let j = 0; j < lines; j++) {
                ctx.beginPath();

                // Interleaved colors
                ctx.strokeStyle = j % 2 === 0 ? baseColor : secondaryColor;

                // Fade out edges of the ribbon
                const alpha = 0.1 + (Math.sin((j / lines) * Math.PI) * 0.4);
                ctx.globalAlpha = alpha;
                ctx.lineWidth = 1.5;

                for (let x = 0; x < w; x += 5) {
                    // Normalized X (0 to 1)
                    const nx = x / w;

                    // Wave calculation
                    // Combine low frequency (shape) and high frequency (detail)
                    const wave1 = Math.sin(nx * 10 + time * 2 + j * 0.2);
                    const wave2 = Math.cos(nx * 20 - time * 3 + j * 0.3);
                    const wave3 = Math.sin(nx * 5 + time + j * 0.1); // Slow carrier

                    // Amplitude peaks in middle, tapers at ends
                    const envelope = Math.pow(Math.sin(nx * Math.PI), 2);

                    // Check for Immersive Mode
                    const isImmersive = document.body.classList.contains('immersive-mode');
                    const ampMultiplier = isImmersive ? 4.5 : 1.0; // HUGE amplitude

                    const yOffset = (wave1 * 15 + wave2 * 10 + wave3 * 20) * envelope * ampMultiplier;

                    // If Immersive, center might need offset if logo pushes distinct
                    // But standard centerY is fine since logo is centered.

                    if (x === 0) ctx.moveTo(x, centerY + yOffset);
                    else ctx.lineTo(x, centerY + yOffset);
                }
                ctx.stroke();
            }

            // Reset context
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        };
        draw();
    }
}
