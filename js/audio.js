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
}
