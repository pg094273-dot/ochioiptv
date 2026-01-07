class CORSHandler {
    constructor() {
        this.useProxyForPlaylist = true;
        this.useProxyForStreams = false; // Por defecto OFF para autenticación
        this.corsProxyUrl = CONFIG.CORS_PROXIES[0];
        this.loadSettings();
    }

    loadSettings() {
        const savedPlaylist = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_PROXY_PLAYLIST);
        if (savedPlaylist !== null) {
            this.useProxyForPlaylist = savedPlaylist === 'true';
        }

        const savedStreams = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_PROXY_STREAMS);
        if (savedStreams !== null) {
            this.useProxyForStreams = savedStreams === 'true';
        }

        const savedProxy = localStorage.getItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL);
        if (savedProxy) {
            this.corsProxyUrl = savedProxy;
        }

        logger.info('═══════════════════════════════');
        logger.info('CONFIGURACIÓN CORS');
        logger.info('═══════════════════════════════');
        logger.info(`Proxy para Playlist: ${this.useProxyForPlaylist ? 'ACTIVADO' : 'DESACTIVADO'}`);
        logger.info(`Proxy para Streams: ${this.useProxyForStreams ? 'ACTIVADO' : 'DESACTIVADO'}`);
        if (this.corsProxyUrl) {
            logger.info(`Proxy URL: ${this.corsProxyUrl}`);
        }
        logger.info('═══════════════════════════════');
    }

    saveSettings() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_PROXY_PLAYLIST, this.useProxyForPlaylist);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_PROXY_STREAMS, this.useProxyForStreams);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL, this.corsProxyUrl);
    }

    setUseProxyForPlaylist(use) {
        this.useProxyForPlaylist = use;
        this.saveSettings();
        logger.info(`Proxy para Playlist: ${use ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    setUseProxyForStreams(use) {
        this.useProxyForStreams = use;
        this.saveSettings();
        logger.info(`Proxy para Streams: ${use ? 'ACTIVADO' : 'DESACTIVADO'}`);
        if (!use) {
            logger.success('✅ Streams se reproducirán directamente (mejor para autenticación)');
        }
    }

    setProxyUrl(url) {
        this.corsProxyUrl = url;
        this.saveSettings();
        logger.info(`Proxy URL cambiado: ${url || 'Sin proxy (directo)'}`);
    }

    processPlaylistUrl(url) {
        if (!url || !this.useProxyForPlaylist || !this.corsProxyUrl) {
            logger.info('Playlist: Sin proxy (URL directa)');
            return url;
        }
        if (url.includes(this.corsProxyUrl)) {
            return url;
        }
        logger.info('Playlist: Usando proxy CORS');
        return this.corsProxyUrl + encodeURIComponent(url);
    }

    processStreamUrl(url) {
        if (!url || !this.useProxyForStreams || !this.corsProxyUrl) {
            logger.info('Stream: Sin proxy (URL directa con autenticación)');
            return url;
        }
        if (url.includes(this.corsProxyUrl)) {
            return url;
        }
        logger.info('Stream: Usando proxy CORS');
        return this.corsProxyUrl + encodeURIComponent(url);
    }

    async testProxy() {
        logger.info('═══════════════════════════════');
        logger.info('PROBANDO CONEXIÓN DEL PROXY');
        logger.info('═══════════════════════════════');

        if (!this.corsProxyUrl) {
            logger.warning('No hay proxy configurado para probar');
            return false;
        }

        const testUrl = 'https://iptv-org.github.io/iptv/countries/es.m3u';

        try {
            logger.info(`Probando proxy: ${this.corsProxyUrl}`);
            const proxiedUrl = this.corsProxyUrl + encodeURIComponent(testUrl);

            const response = await fetch(proxiedUrl, {
                method: 'GET',
                headers: { 'Accept': '*/*' }
            });

            if (response.ok) {
                const content = await response.text();
                logger.success('✅ Proxy funciona correctamente');
                logger.info(`Respuesta: ${content.length} caracteres`);
                return true;
            } else {
                logger.error(`Proxy devolvió error HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            logger.error('Error al probar proxy: ' + error.message);
            logger.warning('Prueba con otro proxy del selector');
            return false;
        }
    }
}

const corsHandler = new CORSHandler();