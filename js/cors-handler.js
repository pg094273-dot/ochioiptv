class CORSHandler {
    constructor() {
        this.useCorsProxy = true;
        this.corsProxyUrl = CONFIG.CORS_PROXIES[0];
        this.loadSettings();
    }
    loadSettings() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY);
        if (saved !== null) this.useCorsProxy = saved === 'true';
        const savedProxy = localStorage.getItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL);
        if (savedProxy) this.corsProxyUrl = savedProxy;
        logger.info(`CORS Proxy: ${this.useCorsProxy ? 'ON' : 'OFF'}`);
    }
    saveSettings() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY, this.useCorsProxy);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL, this.corsProxyUrl);
    }
    setUseProxy(use) {
        this.useCorsProxy = use;
        this.saveSettings();
        logger.info(`Proxy ${use ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }
    setProxyUrl(url) {
        this.corsProxyUrl = url;
        this.saveSettings();
        logger.info(`Proxy: ${url || 'Ninguno'}`);
    }
    processUrl(url) {
        if (!url || !this.useCorsProxy || !this.corsProxyUrl) return url;
        if (url.includes(this.corsProxyUrl)) return url;
        return this.corsProxyUrl + encodeURIComponent(url);
    }
    async testProxy() {
        logger.info('Probando proxy...');
        const testUrl = 'https://iptv-org.github.io/iptv/countries/es.m3u';
        try {
            const response = await fetch(this.corsProxyUrl + encodeURIComponent(testUrl));
            if (response.ok) {
                logger.success('Proxy funciona correctamente');
                return true;
            }
        } catch (error) {
            logger.error('Proxy falló: ' + error.message);
        }
        return false;
    }
}
const corsHandler = new CORSHandler();