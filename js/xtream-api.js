class XtreamAPI {
    constructor() {
        this.server = '';
        this.username = '';
        this.password = '';
        this.useCorsProxy = false;
        this.testMode = false;
        this.loadSettings();
    }

    loadSettings() {
        this.server = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_SERVER) || '';
        this.username = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_USERNAME) || '';
        this.password = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_PASSWORD) || '';
        this.useCorsProxy = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_CORS) === 'true';
        this.testMode = localStorage.getItem(CONFIG.STORAGE_KEYS.TEST_MODE) === 'true';
    }

    saveSettings(server, username, password) {
        this.server = server.trim().replace(/\/+$/, '');
        this.username = username.trim();
        this.password = password.trim();
        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_SERVER, this.server);
        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_USERNAME, this.username);
        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_PASSWORD, this.password);
        logger.success('Credenciales guardadas');
    }

    setProxy(use) {
        this.useCorsProxy = use;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_CORS, use);
        logger.info(`Proxy CORS: ${use ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    setTestMode(enabled) {
        this.testMode = enabled;
        localStorage.setItem(CONFIG.STORAGE_KEYS.TEST_MODE, enabled);
        logger.info(`Modo de prueba: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    buildPlaylistUrl() {
        if (!this.server || !this.username || !this.password) {
            throw new Error('Faltan credenciales');
        }
        return `${this.server}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;
    }

    buildStreamUrl(streamUrl, streamId, type = 'live') {
        // Si ya tiene las credenciales, devolverla tal cual
        if (streamUrl.includes(`/${this.username}/${this.password}/`)) {
            return streamUrl;
        }

        // Si es una URL externa completa, devolverla
        if (streamUrl.startsWith('http') && !streamUrl.includes(this.server)) {
            return streamUrl;
        }

        // Construir URL Xtream si tenemos los datos
        if (this.server && this.username && this.password && streamId) {
            let endpoint;
            if (type === 'movie') endpoint = '/movie/';
            else if (type === 'series') endpoint = '/series/';
            else endpoint = '/live/';

            return `${this.server}${endpoint}${this.username}/${this.password}/${streamId}.ts`;
        }

        return streamUrl;
    }

    async loadPlaylist() {
        logger.info('═══════════════════════════════');
        logger.info('CONECTANDO CON XTREAM CODES');
        logger.info('═══════════════════════════════');
        logger.info('Servidor: ' + this.server);
        logger.info('Usuario: ' + this.username);

        const url = this.buildPlaylistUrl();
        logger.info('URL: ' + url.substring(0, 80) + '...');

        try {
            let fetchUrl = url;

            if (this.useCorsProxy) {
                fetchUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                logger.warning('Usando proxy CORS');
            }

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: { 'Accept': '*/*' }
            });

            logger.info(`HTTP ${response.status} ${response.statusText}`);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Usuario o contraseña incorrectos');
                } else if (response.status === 404) {
                    throw new Error('Servidor no encontrado');
                }
                throw new Error(`Error HTTP ${response.status}`);
            }

            const content = await response.text();

            if (!content || content.trim().length === 0) {
                throw new Error('Playlist vacía');
            }

            logger.success(`Playlist descargada: ${content.length} bytes`);
            return content;

        } catch (error) {
            logger.error('Error al conectar: ' + error.message);

            if (error.message.includes('Failed to fetch')) {
                logger.error('No se pudo conectar al servidor');
                logger.info('SOLUCIONES:');
                logger.info('1. Verifica que el servidor esté online');
                logger.info('2. Verifica la URL (debe incluir http://)');
                logger.info('3. Activa el proxy CORS');
            }

            throw error;
        }
    }
}

const xtreamAPI = new XtreamAPI();