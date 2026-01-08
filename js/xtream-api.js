class XtreamAPI {
    constructor() {
        this.server = '';
        this.username = '';
        this.password = '';
        this.directLoad = false;
        this.loadSettings();
    }

    loadSettings() {
        this.server = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_SERVER) || '';
        this.username = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_USERNAME) || '';
        this.password = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_PASSWORD) || '';
        this.directLoad = localStorage.getItem(CONFIG.STORAGE_KEYS.DIRECT_LOAD) === 'true';
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

    setDirectLoad(enabled) {
        this.directLoad = enabled;
        localStorage.setItem(CONFIG.STORAGE_KEYS.DIRECT_LOAD, enabled);
        logger.info(`Carga directa: ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
    }

    buildPlaylistUrl() {
        if (!this.server || !this.username || !this.password) {
            throw new Error('Faltan credenciales');
        }
        return `${this.server}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;
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
            const response = await fetch(url, {
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
            throw error;
        }
    }
}

const xtreamAPI = new XtreamAPI();