// Clase para manejar el reproductor de video
class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentChannel = null;

        // Restaurar volumen guardado
        const savedVolume = localStorage.getItem(CONFIG.STORAGE_KEYS.VOLUME);
        if (savedVolume) {
            this.video.volume = parseFloat(savedVolume);
        }

        // Guardar volumen cuando cambie
        this.video.addEventListener('volumechange', () => {
            localStorage.setItem(CONFIG.STORAGE_KEYS.VOLUME, this.video.volume);
        });

        // Eventos del reproductor
        this.setupEvents();
    }

    // Configurar eventos del reproductor
    setupEvents() {
        this.video.addEventListener('loadstart', () => {
            console.log('Cargando stream...');
        });

        this.video.addEventListener('playing', () => {
            console.log('Reproduciendo...');
            document.getElementById('videoOverlay').classList.add('hidden');
        });

        this.video.addEventListener('error', (e) => {
            console.error('Error en el reproductor:', e);
            this.handleError();
        });

        this.video.addEventListener('waiting', () => {
            console.log('Buffering...');
        });
    }

    // Cargar y reproducir un stream
    loadStream(url, channel) {
        this.currentChannel = channel;

        // Limpiar reproductor anterior
        this.cleanup();

        // Detectar tipo de stream
        if (url.includes('.m3u8') || url.includes('m3u8')) {
            this.loadHLSStream(url);
        } else {
            this.loadDirectStream(url);
        }

        // Guardar último canal reproducido
        if (channel) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_CHANNEL, JSON.stringify(channel));
        }
    }

    // Cargar stream HLS (m3u8)
    loadHLSStream(url) {
        if (Hls.isSupported()) {
            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('Manifest HLS cargado');
                this.video.play().catch(e => {
                    console.log('Autoplay bloqueado:', e);
                });
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('Error HLS:', data);
                if (data.fatal) {
                    this.handleHLSError(data);
                }
            });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari nativo
            this.video.src = url;
            this.video.addEventListener('loadedmetadata', () => {
                this.video.play().catch(e => {
                    console.log('Autoplay bloqueado:', e);
                });
            });
        } else {
            alert('Tu navegador no soporta reproducción HLS');
        }
    }

    // Cargar stream directo (MP4, etc.)
    loadDirectStream(url) {
        this.video.src = url;
        this.video.load();
        this.video.play().catch(e => {
            console.log('Autoplay bloqueado:', e);
        });
    }

    // Manejar errores de HLS
    handleHLSError(data) {
        switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Error de red, intentando recuperar...');
                this.hls.startLoad();
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Error de medios, intentando recuperar...');
                this.hls.recoverMediaError();
                break;
            default:
                console.error('Error fatal irrecuperable');
                this.cleanup();
                break;
        }
    }

    // Manejar errores generales
    handleError() {
        setTimeout(() => {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(229, 9, 20, 0.9);
                padding: 20px;
                border-radius: 8px;
                color: white;
                text-align: center;
                z-index: 10;
            `;
            errorMsg.innerHTML = `
                <h3>⚠️ Error de Reproducción</h3>
                <p>No se pudo cargar el stream. Verifica la URL o prueba con otro canal.</p>
            `;
            this.video.parentElement.appendChild(errorMsg);

            setTimeout(() => errorMsg.remove(), 5000);
        }, 1000);
    }

    // Limpiar reproductor
    cleanup() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.src = '';
        this.video.load();
    }

    // Detener reproducción
    stop() {
        this.cleanup();
        document.getElementById('videoOverlay').classList.remove('hidden');
    }

    // Obtener información del canal actual
    getCurrentChannel() {
        return this.currentChannel;
    }
}