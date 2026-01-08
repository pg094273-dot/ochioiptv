class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.setupEvents();
        logger.success('Reproductor inicializado');
    }

    setupEvents() {
        this.video.addEventListener('loadstart', () => {
            logger.info('Iniciando carga...');
        });

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Metadata cargada');
        });

        this.video.addEventListener('canplay', () => {
            logger.success('Stream listo');
        });

        this.video.addEventListener('playing', () => {
            logger.success('▶️ REPRODUCIENDO');
            document.getElementById('videoOverlay').classList.add('hidden');
        });

        this.video.addEventListener('pause', () => {
            logger.info('Pausado');
        });

        this.video.addEventListener('waiting', () => {
            logger.warning('Buffering...');
        });

        this.video.addEventListener('error', (e) => {
            const error = this.video.error;
            if (!error) return;

            let msg = '';
            switch(error.code) {
                case 1: msg = 'Carga abortada'; break;
                case 2: msg = 'Error de red - Stream offline o inaccesible'; break;
                case 3: msg = 'Error de decodificación - Formato corrupto'; break;
                case 4: msg = 'Formato no soportado o URL inválida'; break;
            }

            logger.error('Error en video: ' + msg);
            this.handleError(msg);
        });
    }

    loadStream(url, content) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO STREAM');
        logger.info('═══════════════════════════════');
        logger.info('Canal: ' + content.name);
        logger.info('Tipo: ' + content.type.toUpperCase());

        this.currentContent = content;
        this.cleanup();

        // Construir URL correcta
        let finalUrl = url;
        if (content.streamId && xtreamAPI.server && xtreamAPI.username && xtreamAPI.password) {
            finalUrl = xtreamAPI.buildStreamUrl(url, content.streamId, content.type);
            logger.info('URL construida con credenciales Xtream');
        }

        logger.info('URL: ' + finalUrl.substring(0, 100) + '...');

        // Detectar tipo
        const isHLS = finalUrl.toLowerCase().includes('.m3u8') || 
                      finalUrl.toLowerCase().includes('.ts') ||
                      content.type === 'live';

        logger.info('Formato: ' + (isHLS ? 'HLS' : 'MP4'));
        logger.info('═══════════════════════════════');

        if (isHLS) {
            this.loadHLS(finalUrl);
        } else {
            this.loadDirect(finalUrl);
        }
    }

    loadHLS(url) {
        // Detectar si es iOS/Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if ((isIOS || isSafari) && this.video.canPlayType('application/vnd.apple.mpegurl')) {
            logger.info('Usando HLS nativo (iOS/Safari)');
            this.loadNativeHLS(url);
        } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            logger.info('Usando HLS.js');
            this.loadHLSjs(url);
        } else {
            logger.warning('HLS no soportado, intentando reproducción directa');
            this.loadDirect(url);
        }
    }

    loadNativeHLS(url) {
        this.video.src = url;

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Metadata HLS cargada');
            this.showPlayButton();
        }, { once: true });

        this.video.load();
    }

    loadHLSjs(url) {
        this.hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90
        });

        this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            logger.success('Manifest HLS cargado');
            logger.info(`Calidades: ${data.levels.length}`);
            this.showPlayButton();
        });

        this.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                logger.error(`Error HLS: ${data.type} - ${data.details}`);

                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        logger.warning('Error de red, reintentando...');
                        setTimeout(() => {
                            if (this.hls) this.hls.startLoad();
                        }, 1000);
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        logger.warning('Error de medios, recuperando...');
                        if (this.hls) this.hls.recoverMediaError();
                        break;
                    default:
                        this.handleError('Error fatal en stream', 'Prueba con otro canal');
                        this.cleanup();
                }
            }
        });

        this.hls.loadSource(url);
        this.hls.attachMedia(this.video);
    }

    loadDirect(url) {
        logger.info('Cargando stream directo...');
        this.video.src = url;

        this.video.addEventListener('loadedmetadata', () => {
            this.showPlayButton();
        }, { once: true });

        this.video.load();
    }

    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 100px; margin-bottom: 20px; cursor: pointer;" 
                     onclick="window.player.play()">▶️</div>
                <h2 style="margin-bottom: 15px; font-size: 24px;">Listo para reproducir</h2>
                <button onclick="window.player.play()" 
                        style="padding: 15px 40px; background: #e50914; border: none; color: white; border-radius: 6px; font-size: 18px; font-weight: bold; cursor: pointer;">
                    ▶️ REPRODUCIR
                </button>
            </div>
        `;
    }

    play() {
        logger.info('Iniciando reproducción manual...');

        const playPromise = this.video.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    logger.success('✅ Reproducción iniciada');
                    document.getElementById('videoOverlay').classList.add('hidden');
                })
                .catch(error => {
                    logger.error('Error al reproducir: ' + error.message);

                    if (error.name === 'NotAllowedError') {
                        alert('Navegador bloqueó reproducción.\n\nHaz clic de nuevo en REPRODUCIR.');
                    } else if (error.name === 'NotSupportedError') {
                        this.handleError('Formato no compatible', 'Prueba otro canal');
                    } else {
                        this.handleError('No se pudo reproducir', error.message);
                    }
                });
        }
    }

    handleError(message, detail = '') {
        logger.error('Mostrando error: ' + message);

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; padding: 30px; max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin-bottom: 15px; color: #f87171; font-size: 20px;">Error de Reproducción</h2>
                    <p style="color: #fff; font-size: 15px; margin-bottom: 15px;">
                        ${message}
                    </p>
                    ${detail ? `<p style="color: #999; font-size: 13px; margin-bottom: 20px;">${detail}</p>` : ''}
                    <button onclick="document.getElementById('debugConsole').style.display='block'" 
                            style="padding: 10px 25px; background: #e50914; border: none; color: white; border-radius: 6px; font-size: 14px; cursor: pointer;">
                        Ver Log
                    </button>
                </div>
            `;
        }

        document.getElementById('debugConsole').style.display = 'block';
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