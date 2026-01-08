class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.setupEvents();
        logger.success('Reproductor inicializado');
    }
    setupEvents() {
        this.video.addEventListener('timeupdate', () => {
            if (this.currentContent && !isNaN(this.video.duration)) {
                if (this.video.currentTime > 5) {
                    storage.savePosition(this.currentContent.id, this.video.currentTime, this.video.duration);
                }
            }
        });
        this.video.addEventListener('ended', () => {
            logger.info('Video finalizado');
            if (this.currentContent) {
                storage.clearPosition(this.currentContent.id);
            }
        });
        this.video.addEventListener('error', (e) => {
            const error = this.video.error;
            if (!error) return;
            let msg = '';
            switch(error.code) {
                case 1: msg = 'Carga abortada'; break;
                case 2: msg = 'Error de red'; break;
                case 3: msg = 'Error de decodificación'; break;
                case 4: msg = 'Formato no soportado'; break;
            }
            logger.error('Error de video: ' + msg);
        });
    }
    async loadStream(content) {
        logger.info('═════════════════════════════');
        logger.info('Cargando: ' + content.name);
        logger.info('═════════════════════════════');
        this.currentContent = content;
        this.cleanup();
        let finalUrl = content.url;

        // Conversión .ts a .m3u8
        if (finalUrl.endsWith('.ts')) {
            finalUrl = finalUrl.replace(/\.ts$/, '.m3u8');
            logger.warning('Convirtiendo .ts → .m3u8');
        }

        logger.info('URL: ' + finalUrl.substring(0, 80) + '...');

        try {
            await this.tryLoad(finalUrl);
            logger.success('Stream cargado');

            // En iPhone, necesitamos esperar más tiempo
            setTimeout(() => {
                this.video.play().catch(err => {
                    logger.warning('Auto-play bloqueado. Haz clic en play manualmente.');
                });
            }, 1000);
        } catch (error) {
            logger.error('Error al cargar: ' + error.message);

            // Intentar con URL original
            if (finalUrl !== content.url) {
                logger.warning('Reintentando con URL original...');
                try {
                    await this.tryLoad(content.url);
                    logger.success('Stream cargado con URL original');
                } catch (err2) {
                    logger.error('También falló: ' + err2.message);
                    throw err2;
                }
            } else {
                throw error;
            }
        }
    }
    tryLoad(url) {
        return new Promise((resolve, reject) => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            // SIEMPRE usar HLS nativo en iPhone/Safari
            if (isIOS || isSafari) {
                logger.info('Modo: HLS nativo (iPhone/Safari)');

                this.video.src = url;

                const onLoad = () => {
                    cleanup();
                    logger.success('Metadata cargada');
                    resolve();
                };

                const onError = (e) => {
                    cleanup();
                    logger.error('Error en HLS nativo');
                    reject(new Error('Error HLS nativo'));
                };

                const cleanup = () => {
                    this.video.removeEventListener('loadedmetadata', onLoad);
                    this.video.removeEventListener('error', onError);
                };

                this.video.addEventListener('loadedmetadata', onLoad, { once: true });
                this.video.addEventListener('error', onError, { once: true });

                this.video.load();

                // Timeout más largo para iPhone (30 segundos)
                setTimeout(() => {
                    cleanup();
                    reject(new Error('Timeout - El servidor tarda demasiado'));
                }, 30000);

            } else {
                // Desktop: usar HLS.js si está disponible
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    logger.info('Modo: HLS.js');

                    this.hls = new Hls({
                        debug: false,
                        enableWorker: true,
                        maxBufferLength: 60,
                        maxMaxBufferLength: 120,
                        maxBufferSize: 60 * 1000 * 1000,
                        maxBufferHole: 0.5,
                        manifestLoadingTimeOut: 20000,
                        manifestLoadingMaxRetry: 3,
                        levelLoadingTimeOut: 20000,
                        fragLoadingTimeOut: 20000
                    });

                    let resolved = false;

                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (!resolved) {
                            logger.success('Manifest HLS cargado');
                            resolved = true;
                            resolve();
                        }
                    });

                    this.hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            logger.error(`Error HLS: ${data.details}`);

                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                logger.warning('Error de red, reintentando...');
                                setTimeout(() => {
                                    if (this.hls) this.hls.startLoad();
                                }, 1000);
                            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                logger.warning('Error de medios, recuperando...');
                                if (this.hls) this.hls.recoverMediaError();
                            } else {
                                if (!resolved) {
                                    resolved = true;
                                    this.hls.destroy();
                                    this.hls = null;
                                    reject(new Error(data.details));
                                }
                            }
                        }
                    });

                    this.hls.loadSource(url);
                    this.hls.attachMedia(this.video);

                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            if (this.hls) {
                                this.hls.destroy();
                                this.hls = null;
                            }
                            reject(new Error('Timeout'));
                        }
                    }, 20000);

                } else {
                    // Fallback: video directo
                    logger.info('Modo: Video directo');
                    this.video.src = url;

                    const onLoad = () => {
                        cleanup();
                        resolve();
                    };

                    const onError = () => {
                        cleanup();
                        reject(new Error('Error de carga'));
                    };

                    const cleanup = () => {
                        this.video.removeEventListener('loadedmetadata', onLoad);
                        this.video.removeEventListener('error', onError);
                    };

                    this.video.addEventListener('loadedmetadata', onLoad, { once: true });
                    this.video.addEventListener('error', onError, { once: true });

                    this.video.load();

                    setTimeout(() => {
                        cleanup();
                        reject(new Error('Timeout'));
                    }, 15000);
                }
            }
        });
    }
    resumeFrom(position) {
        logger.info(`Reanudando desde ${Math.floor(position)}s`);
        this.video.currentTime = position;
        this.video.play();
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
let player;