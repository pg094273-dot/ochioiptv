class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        logger.info('Reproductor inicializado');
        this.setupEvents();
    }
    setupEvents() {
        this.video.addEventListener('playing', () => {
            logger.success('✅ REPRODUCIENDO');
            document.getElementById('videoOverlay').classList.add('hidden');
        });
        this.video.addEventListener('error', () => {
            logger.error('Error en video');
        });
    }
    loadStream(url, content) {
        logger.info(`Cargando: ${content.name}`);
        this.currentContent = content;
        this.cleanup();
        const processedUrl = corsHandler.processUrl(url);
        const isHLS = processedUrl.toLowerCase().includes('.m3u8');
        if (isHLS) {
            this.loadHLS(processedUrl);
        } else {
            this.loadDirect(processedUrl);
        }
    }
    loadHLS(url) {
        if (Hls.isSupported()) {
            this.hls = new Hls({ debug: false });
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                logger.success('Manifest cargado');
                this.video.play().catch(() => logger.warning('Autoplay bloqueado'));
            });
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                logger.error(`Error HLS: ${data.details}`);
                if (data.details === 'manifestLoadError') {
                    logger.error('❌ ERROR CORS DETECTADO');
                    logger.warning('SOLUCIÓN: Activa el Proxy CORS arriba');
                    this.handleError('Error CORS: Activa el proxy en la barra superior');
                }
            });
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.load();
            this.video.play();
        }
    }
    loadDirect(url) {
        this.video.src = url;
        this.video.load();
        this.video.play().catch(() => logger.warning('Autoplay bloqueado'));
    }
    handleError(message) {
        const overlay = document.getElementById('videoOverlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = `<div style="text-align: center; padding: 40px;"><h2>⚠️ Error</h2><p>${message}</p></div>`;
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