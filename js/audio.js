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
                // Flat line when paused
                ctx.beginPath();
                ctx.moveTo(0, h / 2);
                ctx.lineTo(w, h / 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
                return;
            }

            // --- Futuristic Matrix Waveform ---
            ctx.beginPath();
            ctx.lineWidth = 2;
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00f3ff';
            ctx.strokeStyle = primaryColor;

            // Glow Effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = primaryColor;

            const time = Date.now() / 150; // Speed factor
            const centerY = h / 2;

            ctx.moveTo(0, centerY);

            for (let x = 0; x < w; x += 3) { // Step 3px for performance
                // Simulate waveform: Sum of Sine waves + Noise
                // Frequencies based on X, modulated by Time
                const freq1 = Math.sin(x * 0.02 + time);
                const freq2 = Math.sin(x * 0.05 - time * 1.5);
                const noise = (Math.random() - 0.5) * 0.1; // Jitter

                // Amplitude modulation (higher in center)
                const centerDist = Math.abs(x - w / 2) / (w / 2); // 0 at center, 1 at edges
                const envelope = 1 - Math.pow(centerDist, 2); // Parabolic envelope

                const yOffset = (freq1 * 10 + freq2 * 5 + noise * 10) * envelope;

                ctx.lineTo(x, centerY + yOffset * 2); // Scale amplitude
            }

            ctx.stroke();

            // Reset Shadow
            ctx.shadowBlur = 0;
        };
        draw();
    }
}
