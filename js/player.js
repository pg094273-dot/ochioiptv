class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.timeout = 30000;
        this.loadTimeout = null;
        this.setupEvents();
        this.loadTimeoutSetting();
        logger.success('Reproductor inicializado');
    }

    loadTimeoutSetting() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMEOUT);
        this.timeout = saved ? parseInt(saved) : CONFIG.DEFAULT_TIMEOUT;
        logger.info(`Timeout configurado: ${this.timeout/1000}s`);
    }

    setTimeout(ms) {
        this.timeout = ms;
        localStorage.setItem(CONFIG.STORAGE_KEYS.TIMEOUT, ms);
        logger.info(`Timeout actualizado: ${ms/1000}s`);
    }

    setupEvents() {
        this.video.addEventListener('loadstart', () => {
            logger.info('Iniciando carga...');
        });

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Metadata cargada');
            this.clearLoadTimeout();
        });

        this.video.addEventListener('canplay', () => {
            logger.success('Stream listo para reproducir');
            this.clearLoadTimeout();
        });

        this.video.addEventListener('playing', () => {
            logger.success('▶️ REPRODUCIENDO');
            document.getElementById('videoOverlay').classList.add('hidden');
            this.clearLoadTimeout();
        });

        this.video.addEventListener('pause', () => {
            logger.info('Pausado');
        });

        this.video.addEventListener('waiting', () => {
            logger.warning('Buffering...');
        });

        this.video.addEventListener('error', (e) => {
            this.clearLoadTimeout();
            const error = this.video.error;
            if (!error) return;

            let msg = '';
            let solution = '';
            switch(error.code) {
                case 1: 
                    msg = 'Carga abortada'; 
                    solution = 'Reintenta o prueba otro canal';
                    break;
                case 2: 
                    msg = 'Error de red';
                    solution = 'Stream offline o inaccesible. Prueba otro canal o aumenta el timeout.';
                    break;
                case 3: 
                    msg = 'Error de decodificación'; 
                    solution = 'Formato corrupto. Prueba otro canal.';
                    break;
                case 4: 
                    msg = 'Formato no soportado';
                    solution = 'El navegador no soporta este formato. Prueba con Safari en iPhone o aumenta el timeout.';
                    break;
            }

            logger.error('Error en video: ' + msg);
            this.handleError(msg, solution);
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

        logger.info('URL original: ' + url.substring(0, 100) + '...');

        // Detectar tipo de stream
        const isHLS = url.toLowerCase().includes('.m3u8') || 
                      url.toLowerCase().includes('.ts') ||
                      content.type === 'live';

        logger.info('Formato detectado: ' + (isHLS ? 'HLS/TS' : 'MP4'));
        logger.info(`Timeout: ${this.timeout/1000}s`);
        logger.info('═══════════════════════════════');

        // Configurar timeout de carga
        this.startLoadTimeout();

        if (isHLS) {
            this.loadHLS(url);
        } else {
            this.loadDirect(url);
        }
    }

    startLoadTimeout() {
        this.clearLoadTimeout();
        logger.warning(`Iniciando timeout de ${this.timeout/1000}s...`);

        this.loadTimeout = setTimeout(() => {
            logger.error('TIMEOUT: Stream tardó demasiado en cargar');

            // Si estamos usando HLS.js, intentar carga directa
            if (this.hls && xtreamAPI.directLoad) {
                logger.warning('Reintentando con carga directa...');
                this.retryDirectLoad();
            } else {
                this.handleError(
                    'Timeout al cargar stream',
                    'SOLUCIONES:\n1. Activa "Carga directa" en configuración\n2. Aumenta el timeout a 60s\n3. Prueba otro canal'
                );
            }
        }, this.timeout);
    }

    clearLoadTimeout() {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
        }
    }

    retryDirectLoad() {
        if (!this.currentContent) return;

        logger.info('═══════════════════════════════');
        logger.info('REINTENTO CON CARGA DIRECTA');
        logger.info('═══════════════════════════════');

        this.cleanup();
        this.loadDirect(this.currentContent.url);
    }

    loadHLS(url) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Si está activada la carga directa, usar nativa siempre
        if (xtreamAPI.directLoad) {
            logger.info('Usando carga DIRECTA (modo activado)');
            this.loadNativeHLS(url);
            return;
        }

        if ((isIOS || isSafari) && this.video.canPlayType('application/vnd.apple.mpegurl')) {
            logger.info('Usando HLS nativo (iOS/Safari)');
            this.loadNativeHLS(url);
        } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            logger.info('Usando HLS.js');
            this.loadHLSjs(url);
        } else {
            logger.warning('HLS no soportado, usando carga directa');
            this.loadNativeHLS(url);
        }
    }

    loadNativeHLS(url) {
        this.video.src = url;

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Metadata HLS cargada (nativo)');
            this.showPlayButton();
        }, { once: true });

        this.video.addEventListener('error', () => {
            logger.error('Error en carga nativa');
        }, { once: true });

        this.video.load();
    }

    loadHLSjs(url) {
        this.hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            manifestLoadingTimeOut: this.timeout,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: this.timeout,
            fragLoadingTimeOut: this.timeout
        });

        this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            logger.success('Manifest HLS cargado');
            logger.info(`Calidades disponibles: ${data.levels.length}`);
            this.clearLoadTimeout();
            this.showPlayButton();
        });

        this.hls.on(Hls.Events.MANIFEST_LOADING, () => {
            logger.info('Descargando manifest...');
        });

        this.hls.on(Hls.Events.LEVEL_LOADED, () => {
            logger.info('Nivel cargado');
        });

        this.hls.on(Hls.Events.FRAG_LOADED, () => {
            logger.info('Fragmento cargado');
        });

        this.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                logger.error(`Error HLS: ${data.type} - ${data.details}`);
                this.clearLoadTimeout();

                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        if (data.details === 'manifestLoadTimeOut') {
                            logger.error('TIMEOUT al cargar manifest');

                            if (xtreamAPI.directLoad) {
                                logger.warning('Reintentando con carga directa...');
                                this.retryDirectLoad();
                            } else {
                                this.handleError(
                                    'Timeout al cargar stream',
                                    '✅ SOLUCIÓN: Activa "Carga directa" arriba y recarga el canal'
                                );
                            }
                        } else {
                            logger.warning('Error de red, reintentando...');
                            setTimeout(() => {
                                if (this.hls) this.hls.startLoad();
                            }, 1000);
                        }
                        break;

                    case Hls.ErrorTypes.MEDIA_ERROR:
                        logger.warning('Error de medios, recuperando...');
                        if (this.hls) this.hls.recoverMediaError();
                        break;

                    default:
                        this.handleError(
                            'Error fatal en stream',
                            'Prueba con otro canal o activa "Carga directa"'
                        );
                        this.cleanup();
                }
            }
        });

        this.hls.loadSource(url);
        this.hls.attachMedia(this.video);
    }

    loadDirect(url) {
        logger.info('Cargando stream DIRECTO...');
        this.video.src = url;

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Stream cargado (directo)');
            this.showPlayButton();
        }, { once: true });

        this.video.load();
    }

    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div style="font-size: 80px; margin-bottom: 15px; cursor: pointer;" 
                     onclick="window.player.play()">▶️</div>
                <h2 style="margin-bottom: 12px; font-size: 20px;">Listo</h2>
                <button onclick="window.player.play()" 
                        style="padding: 12px 35px; background: #e50914; border: none; color: white; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    ▶️ REPRODUCIR
                </button>
            </div>
        `;
    }

    play() {
        logger.info('Iniciando reproducción...');

        const playPromise = this.video.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    logger.success('✅ Reproducción iniciada correctamente');
                    document.getElementById('videoOverlay').classList.add('hidden');
                })
                .catch(error => {
                    logger.error('Error al reproducir: ' + error.message);

                    if (error.name === 'NotAllowedError') {
                        alert('El navegador bloqueó la reproducción.\n\nHaz clic de nuevo en REPRODUCIR.');
                    } else if (error.name === 'NotSupportedError') {
                        this.handleError(
                            'Formato no compatible',
                            'Activa "Carga directa" o prueba con Safari en iPhone'
                        );
                    } else {
                        this.handleError('No se pudo reproducir', error.message);
                    }
                });
        }
    }

    handleError(message, detail = '') {
        logger.error('Error de reproducción: ' + message);

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; padding: 25px; max-width: 450px; margin: 0 auto;">
                    <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                    <h2 style="margin-bottom: 12px; color: #f87171; font-size: 18px;">${message}</h2>
                    ${detail ? `<p style="color: #fff; font-size: 13px; margin-bottom: 15px; white-space: pre-line;">${detail}</p>` : ''}
                    <button onclick="document.getElementById('debugConsole').style.display='block'" 
                            style="padding: 8px 20px; background: #e50914; border: none; color: white; border-radius: 5px; font-size: 13px; cursor: pointer;">
                        Ver Log Completo
                    </button>
                </div>
            `;
        }

        document.getElementById('debugConsole').style.display = 'block';
    }

    cleanup() {
        this.clearLoadTimeout();
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
    }
}