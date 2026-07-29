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
        this.retryCount = 0;
        this.maxRetries = 3;
        this.currentUrl = null;

        this._initListeners();
    }

    _initListeners() {
        this.audio.addEventListener('error', (e) => {
            console.error('Audio Error:', e);
            if (this.retryCount < this.maxRetries && this.currentUrl) {
                this.retryCount++;
                console.log(`Retrying connection... Attempt ${this.retryCount}`);
                if (this.onLoadStart) this.onLoadStart();
                setTimeout(() => {
                    this.play(this.currentUrl, true);
                }, 2500);
            } else {
                if (this.onError) this.onError(e);
                this.isPlaying = false;
            }
        });

        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
            if (this.onPlay) this.onPlay();
            if (this.canvas && !this.animationId) this._animateVisualizer();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPause) this.onPause();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        });

        this.audio.addEventListener('waiting', () => {
            if (this.onLoadStart) this.onLoadStart();
        });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.toggle());
            navigator.mediaSession.setActionHandler('pause', () => this.toggle());
            navigator.mediaSession.setActionHandler('stop', () => {
                this.audio.pause();
                this.audio.src = '';
            });
        }
    }

    setMetadata(station) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: station.name || 'Emisora Desconocida',
                artist: station.tags ? station.tags.split(',')[0] : 'GeoRadio',
                album: station.country || 'Global',
                artwork: [
                    { src: station.favicon || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(station.name || 'R') + '&background=00f3ff&color=000', sizes: '96x96', type: 'image/png' },
                    { src: station.favicon || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(station.name || 'R') + '&background=00f3ff&color=000', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    }

    play(url, isRetry = false) {
        if (!url) return;
        if (!isRetry) {
            this.retryCount = 0;
            this.currentUrl = url;
        }
        this.audio.src = url;
        this.audio.play().catch(e => {
            console.error("Play failed", e);
            // Don't auto-retry on play() catch, it's usually a user interaction requirement
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
            if (!this.isPlaying) {
                this.animationId = null;
                return;
            }

            this.animationId = requestAnimationFrame(draw);

            if (!this.ctx || !this.canvas) return;

            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            ctx.clearRect(0, 0, w, h);

            const time = Date.now() / 1000;
            const centerY = h / 2;
            const lines = 8;

            ctx.globalCompositeOperation = 'screen';

            const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00f3ff';
            const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#bc13fe';

            for (let j = 0; j < lines; j++) {
                ctx.beginPath();
                ctx.strokeStyle = j % 2 === 0 ? baseColor : secondaryColor;

                const alpha = 0.1 + (Math.sin((j / lines) * Math.PI) * 0.4);
                ctx.globalAlpha = alpha;
                ctx.lineWidth = 1.5;

                for (let x = 0; x < w; x += 5) {
                    const nx = x / w;
                    const wave1 = Math.sin(nx * 10 + time * 2 + j * 0.2);
                    const wave2 = Math.cos(nx * 20 - time * 3 + j * 0.3);
                    const wave3 = Math.sin(nx * 5 + time + j * 0.1);
                    const envelope = Math.pow(Math.sin(nx * Math.PI), 2);
                    const yOffset = (wave1 * 15 + wave2 * 10 + wave3 * 20) * envelope;

                    if (x === 0) ctx.moveTo(x, centerY + yOffset);
                    else ctx.lineTo(x, centerY + yOffset);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        };
        draw();
    }
}
