class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.isPlaying = false;

        logger.info('Inicializando reproductor...');

        // Configurar video element
        this.video.preload = 'metadata';

        // Restaurar volumen
        const savedVolume = localStorage.getItem(CONFIG.STORAGE_KEYS.VOLUME);
        if (savedVolume) {
            this.video.volume = parseFloat(savedVolume);
            logger.info('Volumen restaurado: ' + (this.video.volume * 100).toFixed(0) + '%');
        }

        this.setupEvents();
        logger.success('Reproductor inicializado correctamente');
    }

    setupEvents() {
        // Evento: Volumen
        this.video.addEventListener('volumechange', () => {
            localStorage.setItem(CONFIG.STORAGE_KEYS.VOLUME, this.video.volume);
        });

        // Evento: Cargando
        this.video.addEventListener('loadstart', () => {
            logger.info('Iniciando carga del stream...');
        });

        // Evento: Puede reproducir
        this.video.addEventListener('canplay', () => {
            logger.success('Stream listo para reproducir');
        });

        // Evento: Reproduciendo
        this.video.addEventListener('playing', () => {
            this.isPlaying = true;
            logger.success('Reproducción iniciada');
            document.getElementById('videoOverlay')?.classList.add('hidden');
        });

        // Evento: Pausado
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            logger.info('Reproducción pausada');
        });

        // Evento: Esperando (buffering)
        this.video.addEventListener('waiting', () => {
            logger.warning('Buffering...');
        });

        // Evento: Error
        this.video.addEventListener('error', (e) => {
            const error = this.video.error;
            let errorMsg = 'Error desconocido';

            if (error) {
                switch(error.code) {
                    case error.MEDIA_ERR_ABORTED:
                        errorMsg = 'Carga abortada';
                        break;
                    case error.MEDIA_ERR_NETWORK:
                        errorMsg = 'Error de red';
                        break;
                    case error.MEDIA_ERR_DECODE:
                        errorMsg = 'Error de decodificación';
                        break;
                    case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMsg = 'Formato no soportado o URL inválida';
                        break;
                }
            }

            logger.error('Error en video: ' + errorMsg);
            this.handleError(errorMsg);
        });
    }

    loadStream(url, content) {
        logger.info(`Cargando contenido: ${content.name}`);
        logger.info(`Tipo: ${content.type}`);
        logger.info(`URL: ${url.substring(0, 100)}...`);

        this.currentContent = content;
        this.cleanup();

        // Detectar tipo de stream
        const urlLower = url.toLowerCase();
        const isHLS = urlLower.includes('.m3u8') || urlLower.includes('/hls/') || 
                     urlLower.includes('m3u8') || content.type !== 'live';

        if (isHLS) {
            logger.info('Tipo de stream detectado: HLS');
            this.loadHLS(url);
        } else {
            logger.info('Tipo de stream detectado: Directo');
            this.loadDirect(url);
        }
    }

    loadHLS(url) {
        // Verificar que HLS.js esté disponible
        if (typeof Hls === 'undefined') {
            logger.error('HLS.js no está cargado');
            alert('Error crítico: Biblioteca HLS.js no disponible. Recarga la página.');
            return;
        }

        if (Hls.isSupported()) {
            logger.success('HLS.js soportado en este navegador');

            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                xhrSetup: function(xhr, url) {
                    // Intentar sin credenciales para evitar CORS
                    xhr.withCredentials = false;
                    logger.info('Configurando petición XHR para: ' + url.substring(0, 50) + '...');
                }
            });

            // Evento: Manifest parseado
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                logger.success('Manifest HLS parseado correctamente');
                logger.info(`Niveles de calidad: ${data.levels.length}`);

                // Intentar reproducir
                const playPromise = this.video.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            logger.success('Reproducción automática exitosa');
                        })
                        .catch(error => {
                            logger.warning('Autoplay bloqueado por el navegador');
                            logger.info('Se requiere interacción del usuario');
                            this.showPlayButton();
                        });
                }
            });

            // Evento: Fragmento cargado
            this.hls.on(Hls.Events.FRAG_LOADED, () => {
                if (!this.isPlaying) {
                    logger.info('Fragmento de video cargado');
                }
            });

            // Evento: Error
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                logger.error(`Error HLS: ${data.type} - ${data.details}`);

                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            logger.warning('Error de red fatal, intentando recuperar...');
                            setTimeout(() => {
                                if (this.hls) {
                                    logger.info('Reintentando carga...');
                                    this.hls.startLoad();
                                }
                            }, 1000);
                            break;

                        case Hls.ErrorTypes.MEDIA_ERROR:
                            logger.warning('Error de medios fatal, intentando recuperar...');
                            if (this.hls) {
                                this.hls.recoverMediaError();
                            }
                            break;

                        default:
                            logger.error('Error fatal irrecuperable');
                            this.handleError('No se pudo cargar este contenido. La URL puede ser inválida o el servidor no está disponible.');
                            this.cleanup();
                            break;
                    }
                }
            });

            // Cargar source
            logger.info('Cargando source en HLS.js...');
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari con soporte HLS nativo
            logger.success('Usando soporte HLS nativo del navegador (Safari)');
            this.video.src = url;

            this.video.addEventListener('loadedmetadata', () => {
                logger.success('Metadata cargada');
                this.video.play()
                    .then(() => logger.success('Reproducción iniciada'))
                    .catch(e => {
                        logger.warning('Autoplay bloqueado');
                        this.showPlayButton();
                    });
            }, { once: true });

            this.video.load();

        } else {
            logger.error('HLS no soportado en este navegador');
            alert('Tu navegador no soporta streaming HLS. Usa Chrome, Firefox, Edge o Safari.');
        }
    }

    loadDirect(url) {
        logger.info('Cargando stream directo...');

        this.video.src = url;
        this.video.load();

        this.video.play()
            .then(() => {
                logger.success('Stream directo reproduciendo');
            })
            .catch(error => {
                logger.warning('Autoplay bloqueado: ' + error.message);
                this.showPlayButton();
            });
    }

    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div class="welcome-message">
                <h2>▶️ Haz clic para reproducir</h2>
                <p>Tu navegador bloqueó la reproducción automática</p>
                <button class="btn-primary" style="margin-top: 20px;">
                    ▶️ Reproducir Ahora
                </button>
            </div>
        `;
        overlay.style.cursor = 'pointer';

        const playHandler = () => {
            logger.info('Usuario inició reproducción manualmente');
            this.video.play();
            overlay.classList.add('hidden');
            overlay.onclick = null;
        };

        overlay.onclick = playHandler;
        overlay.querySelector('button').onclick = playHandler;
    }

    handleError(message) {
        logger.error('Mostrando error al usuario: ' + message);

        // Mostrar mensaje en el reproductor
        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div class="welcome-message">
                    <h2>⚠️ Error de Reproducción</h2>
                    <p>${message}</p>
                    <p style="margin-top: 15px; font-size: 14px;">
                        Verifica la consola de depuración abajo para más detalles.
                    </p>
                </div>
            `;
        }

        // Mostrar consola de debug
        document.getElementById('debugConsole').style.display = 'block';
    }

    cleanup() {
        logger.info('Limpiando reproductor...');

        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        this.isPlaying = false;
    }

    stop() {
        logger.info('Deteniendo reproducción');
        this.cleanup();
        const overlay = document.getElementById('videoOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    getCurrentContent() {
        return this.currentContent;
    }
}