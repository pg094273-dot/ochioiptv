class IPTVPlayer {
    constructor(video) {
        this.video = video;
        this.hls = null;
        this.currentChannel = null;

        const vol = localStorage.getItem(CONFIG.STORAGE_KEYS.VOLUME);
        if (vol) this.video.volume = parseFloat(vol);

        this.video.addEventListener('volumechange', () => {
            localStorage.setItem(CONFIG.STORAGE_KEYS.VOLUME, this.video.volume);
        });

        this.video.addEventListener('playing', () => {
            console.log('▶️ Reproduciendo');
            document.getElementById('videoOverlay')?.classList.add('hidden');
        });

        this.video.addEventListener('error', () => this.handleError());

        console.log('✅ Player listo');
    }

    loadStream(url, channel) {
        console.log('🎬 Cargando:', channel.name);
        this.currentChannel = channel;
        this.cleanup();

        const isHLS = url.includes('.m3u8') || url.includes('/hls/');

        if (isHLS) {
            this.loadHLS(url);
        } else {
            this.loadDirect(url);
        }
    }

    loadHLS(url) {
        if (typeof Hls === 'undefined') {
            alert('Error: HLS.js no cargado. Recarga la página.');
            return;
        }

        if (Hls.isSupported()) {
            console.log('✅ Usando HLS.js');
            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                xhrSetup: (xhr) => { xhr.withCredentials = false; }
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ Manifest cargado');
                this.video.play().catch(e => {
                    console.log('⚠️ Autoplay bloqueado');
                    this.showPlayButton();
                });
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('❌ Error HLS:', data.details);
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        console.log('🔄 Reintentando...');
                        setTimeout(() => this.hls?.startLoad(), 1000);
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        console.log('🔄 Recuperando...');
                        this.hls?.recoverMediaError();
                    } else {
                        this.handleError('Canal no disponible');
                    }
                }
            });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('✅ HLS nativo (Safari)');
            this.video.src = url;
            this.video.load();
            this.video.play().catch(() => this.showPlayButton());
        } else {
            alert('Tu navegador no soporta HLS');
        }
    }

    loadDirect(url) {
        console.log('📹 Stream directo');
        this.video.src = url;
        this.video.load();
        this.video.play().catch(() => this.showPlayButton());
    }

    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<div class="welcome-message"><h2>▶️ Clic para reproducir</h2></div>';
        overlay.style.cursor = 'pointer';
        overlay.onclick = () => {
            this.video.play();
            overlay.classList.add('hidden');
        };
    }

    handleError(msg) {
        console.error('💥 Error de reproducción');
        alert(msg || 'No se pudo reproducir este canal. Prueba con otro.');
    }

    cleanup() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
    }
}