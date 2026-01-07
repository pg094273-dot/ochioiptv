class CORSHandler {
    constructor() {
        this.useCorsProxy = true;
        this.corsProxyUrl = CONFIG.CORS_PROXIES[0];
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY);
        if (saved !== null) this.useCorsProxy = saved === 'true';
    }
    setUseProxy(use) {
        this.useCorsProxy = use;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY, use);
        logger.info(`Proxy ${use ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }
    setProxyUrl(url) {
        this.corsProxyUrl = url;
        localStorage.setItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL, url);
        logger.info(`Proxy: ${url || 'Ninguno (directo)'}`);
    }
    processUrl(url) {
        if (!url || !this.useCorsProxy || !this.corsProxyUrl) return url;
        if (url.includes(this.corsProxyUrl)) return url;
        return this.corsProxyUrl + encodeURIComponent(url);
    }
    async testProxy() {
        logger.info('Probando conexión del proxy...');
        try {
            const test = 'https://iptv-org.github.io/iptv/countries/es.m3u';
            const response = await fetch(this.corsProxyUrl + encodeURIComponent(test));
            if (response.ok) {
                logger.success('✅ Proxy funciona correctamente');
                return true;
            }
            logger.error('Proxy no responde correctamente');
        } catch (error) {
            logger.error('Proxy falló: ' + error.message);
        }
        return false;
    }
}
const corsHandler = new CORSHandler();