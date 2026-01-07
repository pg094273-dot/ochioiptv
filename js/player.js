class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.isPlaying = false;

        logger.success('Reproductor inicializado');
        this.setupEvents();
    }

    setupEvents() {
        this.video.addEventListener('loadstart', () => {
            logger.info('Iniciando carga del stream...');
        });

        this.video.addEventListener('canplay', () => {
            logger.success('Stream listo para reproducir');
        });

        this.video.addEventListener('playing', () => {
            this.isPlaying = true;
            logger.success('✅ REPRODUCIENDO');
            document.getElementById('videoOverlay').classList.add('hidden');
        });

        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            logger.info('Pausado');
        });

        this.video.addEventListener('waiting', () => {
            logger.warning('Buffering...');
        });

        this.video.addEventListener('error', (e) => {
            const error = this.video.error;
            if (!error) return;

            let errorMsg = '';
            let suggestion = '';

            switch(error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMsg = 'Carga abortada';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMsg = 'Error de red al descargar el stream';
                    suggestion = '• Stream puede estar offline\n• Verifica tu conexión\n• Prueba otro canal';
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMsg = 'Error al decodificar el video';
                    suggestion = '• Formato incompatible\n• Prueba otro canal';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMsg = 'Formato no soportado o URL inválida';
                    suggestion = '• Verifica las credenciales Xtream\n• El stream puede no estar disponible\n• Prueba otro canal';
                    break;
            }

            logger.error('Error en video: ' + errorMsg);

            if (!this.isPlaying) {
                this.handleError(errorMsg, suggestion);
            }
        });
    }

    loadStream(url, content) {
        logger.info('═══════════════════════════════════════');
        logger.info('CARGANDO STREAM');
        logger.info('═══════════════════════════════════════');
        logger.info('Canal: ' + content.name);
        logger.info('Grupo: ' + content.group);
        logger.info('Tipo: ' + content.type.toUpperCase());

        this.currentContent = content;
        this.cleanup();

        // Procesar URL
        const processedUrl = xtreamAPI.processStreamUrl(url);

        logger.info('URL original: ' + url.substring(0, 120) + '...');
        if (processedUrl !== url) {
            logger.info('URL procesada: ' + processedUrl.substring(0, 120) + '...');
        }

        // Detectar tipo
        const urlLower = processedUrl.toLowerCase();
        const isHLS = urlLower.includes('.m3u8') || urlLower.includes('/hls/') || urlLower.includes('.ts');

        logger.info('Formato: ' + (isHLS ? 'HLS/MPEG-TS' : 'MP4/Stream directo'));
        logger.info('═══════════════════════════════════════');

        if (isHLS) {
            this.loadHLS(processedUrl);
        } else {
            this.loadDirect(processedUrl);
        }
    }

    loadHLS(url) {
        if (typeof Hls === 'undefined') {
            logger.error('HLS.js no cargado');
            this.handleError('HLS.js no disponible', 'Recarga la página');
            return;
        }

        if (Hls.isSupported()) {
            logger.info('Usando HLS.js');

            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                xhrSetup: (xhr, url) => {
                    xhr.withCredentials = false;
                }
            });

            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                logger.success('✅ Manifest HLS cargado');
                logger.info(`Calidades disponibles: ${data.levels.length}`);
                this.showPlayButton();
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    logger.error(`Error HLS fatal: ${data.type} - ${data.details}`);

                    switch(data.details) {
                        case 'manifestLoadError':
                            logger.error('No se pudo cargar el manifest');
                            this.handleError(
                                'Error al cargar stream',
                                '• Stream puede estar offline\n• Verifica credenciales Xtream\n• Prueba otro canal'
                            );
                            break;

                        case 'manifestParsingError':
                            this.handleError('Manifest inválido', 'Prueba otro canal');
                            break;

                        case 'levelLoadError':
                        case 'fragLoadError':
                            logger.warning('Error cargando fragmento, reintentando...');
                            setTimeout(() => {
                                if (this.hls) this.hls.startLoad();
                            }, 1000);
                            break;

                        default:
                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                logger.warning('Error de red, reintentando...');
                                setTimeout(() => {
                                    if (this.hls) this.hls.startLoad();
                                }, 1000);
                            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                logger.warning('Error de medios, recuperando...');
                                if (this.hls) this.hls.recoverMediaError();
                            } else {
                                this.handleError('Error fatal', 'Prueba otro canal');
                                this.cleanup();
                            }
                    }
                }
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            logger.info('Usando HLS nativo (Safari)');
            this.video.src = url;
            this.video.addEventListener('loadedmetadata', () => this.showPlayButton(), { once: true });
            this.video.load();
        }
    }

    loadDirect(url) {
        logger.info('Cargando stream directo (MP4)...');
        this.video.src = url;
        this.video.addEventListener('loadedmetadata', () => this.showPlayButton(), { once: true });
        this.video.load();
    }

    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;

        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <div style="font-size: 140px; margin-bottom: 25px; cursor: pointer; transition: 0.3s;" 
                     onmouseover="this.style.transform='scale(1.15)'" 
                     onmouseout="this.style.transform='scale(1)'">▶️</div>
                <h2 style="margin-bottom: 18px; font-size: 34px; font-weight: 700;">Listo para reproducir</h2>
                <p style="color: #999; margin-bottom: 30px; font-size: 18px;">
                    Haz clic para comenzar
                </p>
                <button class="btn-primary" id="playButton" 
                        style="font-size: 22px; padding: 20px 60px; font-weight: bold; box-shadow: 0 4px 20px rgba(229,9,20,0.4);">
                    ▶️ REPRODUCIR
                </button>
            </div>
        `;

        const play = () => {
            logger.info('Usuario inició reproducción');

            this.video.play()
                .then(() => {
                    logger.success('✅ Reproducción iniciada');
                    overlay.classList.add('hidden');
                })
                .catch(error => {
                    logger.error('Error al reproducir: ' + error.message);

                    if (error.name === 'NotAllowedError') {
                        alert('El navegador bloqueó la reproducción.\n\nHaz clic de nuevo en REPRODUCIR.');
                    } else if (error.name === 'NotSupportedError') {
                        this.handleError('Formato no compatible', 'Prueba otro canal');
                    } else {
                        this.handleError('No se pudo reproducir', 'Prueba otro canal');
                    }
                });
        };

        const playBtn = document.getElementById('playButton');
        if (playBtn) playBtn.onclick = play;

        overlay.onclick = (e) => {
            if (e.target === overlay || e.target.textContent.includes('▶️') || e.target.id === 'playButton') {
                play();
            }
        };
    }

    handleError(message, suggestion = '') {
        logger.error('Mostrando error al usuario');

        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                    <div style="font-size: 90px; margin-bottom: 25px;">⚠️</div>
                    <h2 style="margin-bottom: 18px; color: #f87171; font-size: 28px; font-weight: 700;">Error de Reproducción</h2>
                    <p style="color: #fff; font-size: 17px; margin-bottom: 25px; font-weight: 500;">
                        ${message}
                    </p>
                    ${suggestion ? `
                        <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 18px; margin: 25px 0; text-align: left;">
                            <p style="color: #fbbf24; font-size: 15px; font-weight: bold; margin-bottom: 10px;">💡 Posibles soluciones:</p>
                            <p style="color: #ccc; white-space: pre-line; line-height: 1.8; font-size: 14px;">
                                ${suggestion}
                            </p>
                        </div>
                    ` : ''}
                    <button class="btn-primary" 
                            onclick="document.getElementById('debugConsole').style.display='block'; document.getElementById('debugConsole').scrollIntoView({behavior: 'smooth'});" 
                            style="margin-top: 20px; padding: 14px 35px;">
                        🔧 Ver Consola
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
        this.isPlaying = false;
    }
}