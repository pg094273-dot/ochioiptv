class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        this.isPlaying = false;

        logger.info('Reproductor inicializado');
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

            let errorMsg = 'Error desconocido';
            let suggestion = '';

            switch(error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMsg = 'Carga abortada por el usuario';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMsg = 'Error de red al descargar el stream';
                    suggestion = '• Stream puede estar offline\n• Verifica tu conexión a internet\n• Prueba otro canal';
                    logger.warning('Posible causa: Stream offline o problemas de red');
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMsg = 'Error al decodificar el video';
                    suggestion = '• Formato de video incompatible\n• Codec no soportado\n• Prueba otro canal';
                    logger.warning('Posible causa: Formato o codec incompatible');
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMsg = 'Formato no soportado o URL inválida';
                    suggestion = '• Si usa autenticación, DESACTIVA "Proxy CORS para Streams"\n• Verifica que la URL sea correcta\n• El formato puede no ser compatible';
                    logger.error('⚠️ ERROR COMÚN CON AUTENTICACIÓN');
                    logger.warning('SOLUCIÓN: Desactiva "Proxy CORS para Streams" en la configuración');
                    break;
            }

            logger.error('Error en video element: ' + errorMsg);

            if (!this.isPlaying) {
                this.handleError(errorMsg, suggestion);
            }
        });
    }

    loadStream(url, content) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO STREAM');
        logger.info('═══════════════════════════════');
        logger.info('Canal: ' + content.name);
        logger.info('Grupo: ' + content.group);
        logger.info('Tipo: ' + content.type.toUpperCase());

        this.currentContent = content;
        this.cleanup();

        // Mostrar URL original (primeros 100 chars)
        logger.info('URL original: ' + url.substring(0, 100) + '...');

        // Detectar si tiene autenticación en la URL
        const hasAuth = url.includes('username=') || url.includes('password=');
        if (hasAuth) {
            logger.warning('⚠️ URL con autenticación detectada');
            if (corsHandler.useProxyForStreams) {
                logger.error('❌ PROXY ACTIVADO PARA STREAMS CON AUTENTICACIÓN');
                logger.warning('SOLUCIÓN: Desactiva "Proxy CORS para Streams" arriba');
            } else {
                logger.success('✅ Proxy desactivado (correcto para autenticación)');
            }
        }

        // Procesar URL con proxy SOLO si está activado para streams
        const processedUrl = corsHandler.processStreamUrl(url);

        logger.info('URL final: ' + processedUrl.substring(0, 100) + '...');

        // Detectar tipo de stream
        const urlLower = processedUrl.toLowerCase();
        const isHLS = urlLower.includes('.m3u8') || urlLower.includes('/hls/');

        logger.info('Formato detectado: ' + (isHLS ? 'HLS (m3u8)' : 'Stream directo'));
        logger.info('═══════════════════════════════');

        if (isHLS) {
            this.loadHLS(processedUrl);
        } else {
            this.loadDirect(processedUrl);
        }
    }

    loadHLS(url) {
        if (typeof Hls === 'undefined') {
            logger.error('HLS.js no está cargado');
            this.handleError('Error crítico: HLS.js no disponible', 'Recarga la página');
            return;
        }

        if (Hls.isSupported()) {
            logger.info('Usando HLS.js para reproducción');

            this.hls = new Hls({
                debug: false,
                enableWorker: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                xhrSetup: function(xhr, url) {
                    xhr.withCredentials = false;
                }
            });

            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                logger.success('✅ Manifest HLS parseado correctamente');
                logger.info(`Calidades disponibles: ${data.levels.length}`);

                data.levels.forEach((level, index) => {
                    logger.info(`  Nivel ${index}: ${level.width}x${level.height} @ ${Math.round(level.bitrate/1000)}kbps`);
                });

                this.showPlayButton();
            });

            this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                // Fragmento cargado correctamente
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                logger.error(`Error HLS: ${data.type} - ${data.details}`);

                if (data.fatal) {
                    switch(data.details) {
                        case 'manifestLoadError':
                            logger.error('══════════════════════════════');
                            logger.error('ERROR: NO SE PUDO CARGAR MANIFEST');
                            logger.error('══════════════════════════════');
                            logger.warning('POSIBLES CAUSAS:');
                            logger.info('1. Error CORS (necesita proxy)');
                            logger.info('2. Stream offline o inaccesible');
                            logger.info('3. Autenticación incorrecta');
                            logger.info('');
                            logger.warning('SOLUCIONES:');
                            logger.info('• Si NO usa autenticación: Activa proxy');
                            logger.info('• Si USA autenticación: Desactiva proxy para streams');
                            logger.info('• Prueba con otro canal');
                            logger.error('══════════════════════════════');

                            this.handleError(
                                'No se pudo cargar el manifest del stream',
                                '• Verifica configuración de proxy\n• Si usa autenticación, desactiva "Proxy CORS para Streams"\n• Prueba otro canal'
                            );
                            break;

                        case 'manifestParsingError':
                            logger.error('Manifest corrupto o inválido');
                            this.handleError('Manifest inválido', 'El stream tiene un formato incorrecto. Prueba otro canal.');
                            break;

                        case 'levelLoadError':
                        case 'fragLoadError':
                            logger.warning('Error cargando fragmento, reintentando...');
                            setTimeout(() => {
                                if (this.hls) {
                                    logger.info('Reintentando carga...');
                                    this.hls.startLoad();
                                }
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
                                logger.error('Error fatal irrecuperable');
                                this.handleError('Error fatal en el stream', 'Prueba con otro canal');
                                this.cleanup();
                            }
                    }
                }
            });

            logger.info('Cargando source en HLS.js...');
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            logger.info('Usando HLS nativo del navegador (Safari)');
            this.video.src = url;

            this.video.addEventListener('loadedmetadata', () => {
                logger.success('Metadata cargada');
                this.showPlayButton();
            }, { once: true });

            this.video.load();
        } else {
            logger.error('HLS no soportado en este navegador');
            this.handleError(
                'Tu navegador no soporta streaming HLS',
                'Usa Chrome, Firefox, Edge o Safari'
            );
        }
    }

    loadDirect(url) {
        logger.info('Cargando stream directo...');

        this.video.src = url;

        this.video.addEventListener('loadedmetadata', () => {
            logger.success('Metadata del stream cargada');
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
                <div style="font-size: 120px; margin-bottom: 20px; cursor: pointer; transition: transform 0.2s;" 
                     onmouseover="this.style.transform='scale(1.1)'" 
                     onmouseout="this.style.transform='scale(1)'">▶️</div>
                <h2 style="margin-bottom: 15px; font-size: 32px;">Haz clic para reproducir</h2>
                <p style="color: #999; margin-bottom: 25px; font-size: 17px;">
                    El stream está listo y esperando
                </p>
                <button class="btn-primary" id="playButton" 
                        style="font-size: 20px; padding: 18px 50px; font-weight: bold;">
                    ▶️ REPRODUCIR AHORA
                </button>
            </div>
        `;

        const play = () => {
            logger.info('Usuario inició reproducción manualmente');

            const playPromise = this.video.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        logger.success('✅ Reproducción iniciada exitosamente');
                        overlay.classList.add('hidden');
                    })
                    .catch(error => {
                        logger.error('Error al intentar reproducir: ' + error.message);
                        logger.error('Error type: ' + error.name);

                        if (error.name === 'NotAllowedError') {
                            logger.warning('Navegador bloqueó la reproducción');
                            alert('El navegador bloqueó la reproducción.\n\nHaz clic de nuevo en REPRODUCIR.');
                        } else if (error.name === 'NotSupportedError') {
                            logger.error('Formato de video no soportado');
                            this.handleError(
                                'Formato de video no compatible',
                                '• Si usa autenticación, desactiva "Proxy CORS para Streams"\n• Prueba otro canal'
                            );
                        } else {
                            logger.error('Error desconocido al reproducir');
                            this.handleError(
                                'No se pudo iniciar la reproducción',
                                'Prueba con otro canal o verifica la configuración de proxy'
                            );
                        }
                    });
            }
        };

        const playBtn = document.getElementById('playButton');
        if (playBtn) {
            playBtn.onclick = play;
        }

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
                    <div style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin-bottom: 15px; color: #f87171; font-size: 26px;">Error de Reproducción</h2>
                    <p style="color: #fff; font-size: 16px; margin-bottom: 20px; font-weight: 500;">
                        ${message}
                    </p>
                    ${suggestion ? `
                        <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
                            <p style="color: #fbbf24; font-size: 14px; font-weight: bold; margin-bottom: 8px;">💡 Posibles soluciones:</p>
                            <p style="color: #999; white-space: pre-line; line-height: 1.8; font-size: 14px;">
                                ${suggestion}
                            </p>
                        </div>
                    ` : ''}
                    <button class="btn-primary" 
                            onclick="document.getElementById('debugConsole').style.display='block'; document.getElementById('debugConsole').scrollIntoView({behavior: 'smooth'});" 
                            style="margin-top: 20px; padding: 12px 30px;">
                        🔧 Ver Consola de Depuración
                    </button>
                </div>
            `;
            overlay.style.cursor = 'default';
        }

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
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="font-size: 24px;">Reproducción detenida</h2>
                    <p style="color: #999; margin-top: 10px;">Selecciona otro canal para continuar</p>
                </div>
            `;
        }
    }
}