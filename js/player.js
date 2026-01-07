class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        logger.info('Reproductor inicializado');
        this.setupEvents();
    }
    setupEvents() {
        this.video.addEventListener('canplay', () => logger.success('Stream listo'));
        this.video.addEventListener('playing', () => {
            logger.success('✅ REPRODUCIENDO');
            document.getElementById('videoOverlay').classList.add('hidden');
        });
        this.video.addEventListener('pause', () => logger.info('Pausado'));
        this.video.addEventListener('waiting', () => logger.warning('Buffering...'));
        this.video.addEventListener('error', (e) => {
            const err = this.video.error;
            if (!err) return;
            let msg = 'Error desconocido';
            switch(err.code) {
                case err.MEDIA_ERR_ABORTED: msg = 'Carga abortada'; break;
                case err.MEDIA_ERR_NETWORK: msg = 'Error de red - Servidor puede estar offline'; break;
                case err.MEDIA_ERR_DECODE: msg = 'Error de decodificación - Formato incompatible'; break;
                case err.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = 'Formato no soportado o URL inválida'; break;
            }
            logger.error('Error en video: ' + msg);
            this.handleError(msg + '\n\nPrueba con otro canal.');
        });
    }
    loadStream(url, content) {
        logger.info('═══════════════════════════════');
        logger.info('Cargando: ' + content.name);
        logger.info('═══════════════════════════════');
        this.cleanup();
        const processedUrl = corsHandler.processUrl(url);
        const isHLS = processedUrl.toLowerCase().includes('.m3u8');
        logger.info('Tipo: ' + (isHLS ? 'HLS' : 'Directo'));
        if (isHLS) this.loadHLS(processedUrl);
        else this.loadDirect(processedUrl);
    }
    loadHLS(url) {
        if (typeof Hls === 'undefined') {
            logger.error('HLS.js no cargado');
            this.handleError('Error: Recarga la página');
            return;
        }
        if (Hls.isSupported()) {
            this.hls = new Hls({ debug: false });
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                logger.success('✓ Manifest HLS cargado');
                logger.info('Calidades: ' + data.levels.length);
                this.showPlayButton();
            });
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    logger.error('Error HLS: ' + data.details);
                    if (data.details === 'manifestLoadError') {
                        logger.error('══════════════════════════════');
                        logger.error('ERROR CORS / MANIFEST');
                        logger.error('══════════════════════════════');
                        logger.warning('SOLUCIONES:');
                        logger.info('1. Verifica proxy CORS activado');
                        logger.info('2. Cambia proxy en selector');
                        logger.info('3. Stream puede estar offline');
                        this.handleError('❌ Error CORS\n\n• Verifica proxy arriba\n• Cambia el proxy\n• Prueba otro canal');
                    } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        logger.warning('Error de red, reintentando...');
                        setTimeout(() => { if (this.hls) this.hls.startLoad(); }, 1000);
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        logger.warning('Error de medios, recuperando...');
                        if (this.hls) this.hls.recoverMediaError();
                    } else {
                        this.handleError('Error fatal. Prueba otro canal.');
                        this.cleanup();
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
        logger.info('Cargando stream directo...');
        this.video.src = url;
        this.video.addEventListener('loadedmetadata', () => this.showPlayButton(), { once: true });
        this.video.load();
    }
    showPlayButton() {
        const overlay = document.getElementById('videoOverlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 100px; margin-bottom: 20px; cursor: pointer;">▶️</div>
                <h2 style="margin-bottom: 15px; font-size: 28px;">Haz clic para reproducir</h2>
                <p style="color: #999; margin-bottom: 25px; font-size: 16px;">El stream está listo</p>
                <button class="btn-primary" id="playButton" style="font-size: 18px; padding: 15px 40px; font-weight: bold;">
                    ▶️ REPRODUCIR AHORA
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
                        logger.warning('Navegador bloqueó reproducción');
                        alert('Haz clic de nuevo en REPRODUCIR');
                    } else if (error.name === 'NotSupportedError') {
                        this.handleError('Formato no compatible. Prueba otro canal.');
                    } else {
                        this.handleError('No se pudo reproducir. Prueba otro canal.');
                    }
                });
        };
        document.getElementById('playButton').onclick = play;
        overlay.onclick = (e) => { if (e.target.textContent.includes('▶️') || e.target.id === 'playButton') play(); };
    }
    handleError(message) {
        logger.error('Mostrando error al usuario');
        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; padding: 40px; max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin-bottom: 15px; color: #f87171; font-size: 24px;">Error de Reproducción</h2>
                    <p style="color: #999; white-space: pre-line; line-height: 1.8; font-size: 15px;">${message}</p>
                    <button class="btn-primary" onclick="document.getElementById('debugConsole').style.display='block'" style="margin-top: 25px;">
                        🔧 Ver Consola de Depuración
                    </button>
                </div>
            `;
        }
        document.getElementById('debugConsole').style.display = 'block';
    }
    cleanup() {
        if (this.hls) { this.hls.destroy(); this.hls = null; }
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
    }
}