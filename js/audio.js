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

            if (!this.isPlaying) return;

            // Draw Bars
            const barW = w / this.bars;
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00f3ff';

            for (let i = 0; i < this.bars; i++) {
                // Simulated frequency data
                // Combine sine waves and random noise for "organic" look
                const time = Date.now() / 200;
                const hScale = Math.sin(i * 0.2 + time) * 0.5 + 0.5; // 0 to 1
                const noise = Math.random() * 0.5;
                const magnitude = (hScale * 0.7 + noise * 0.3) * h * 0.8; // Peak at 80% height

                const x = i * barW;
                const y = h - magnitude;

                // Gradient opacity
                ctx.globalAlpha = 0.3 + (magnitude / h) * 0.7;
                ctx.fillRect(x, y, barW - 2, magnitude);
            }
        };
        draw();
    }
}
