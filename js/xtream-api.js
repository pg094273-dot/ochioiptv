class XtreamAPI {
    constructor() {
        this.server = '';
        this.username = '';
        this.password = '';
        this.useCorsProxy = false;
        this.corsProxyUrl = '';
        this.loadCredentials();
    }

    loadCredentials() {
        this.server = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_SERVER) || '';
        this.username = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_USERNAME) || '';
        this.password = localStorage.getItem(CONFIG.STORAGE_KEYS.XTREAM_PASSWORD) || '';
        this.useCorsProxy = localStorage.getItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY) === 'true';
        this.corsProxyUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL) || '';

        if (this.server && this.username && this.password) {
            logger.info('Credenciales Xtream Codes cargadas del almacenamiento');
        }
    }

    saveCredentials(server, username, password) {
        this.server = server;
        this.username = username;
        this.password = password;

        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_SERVER, server);
        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_USERNAME, username);
        localStorage.setItem(CONFIG.STORAGE_KEYS.XTREAM_PASSWORD, password);

        logger.success('Credenciales guardadas');
    }

    setProxy(use, url) {
        this.useCorsProxy = use;
        this.corsProxyUrl = url;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USE_CORS_PROXY, use);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CORS_PROXY_URL, url);
    }

    buildPlaylistUrl() {
        if (!this.server || !this.username || !this.password) {
            throw new Error('Faltan credenciales');
        }

        // Limpiar servidor (quitar / al final)
        let cleanServer = this.server.trim();
        if (cleanServer.endsWith('/')) {
            cleanServer = cleanServer.slice(0, -1);
        }

        const url = `${cleanServer}${CONFIG.XTREAM_ENDPOINTS.GET_M3U}?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;

        logger.info('URL construida para Xtream Codes');
        return url;
    }

    buildStreamUrl(streamId, type = 'live') {
        if (!this.server || !this.username || !this.password) {
            throw new Error('Faltan credenciales');
        }

        let cleanServer = this.server.trim();
        if (cleanServer.endsWith('/')) {
            cleanServer = cleanServer.slice(0, -1);
        }

        let url;
        switch(type) {
            case 'movie':
                url = `${cleanServer}/movie/${this.username}/${this.password}/${streamId}.mp4`;
                break;
            case 'series':
                url = `${cleanServer}/series/${this.username}/${this.password}/${streamId}.mp4`;
                break;
            default: // live
                url = `${cleanServer}/live/${this.username}/${this.password}/${streamId}.ts`;
        }

        return url;
    }

    async loadPlaylist() {
        logger.info('═══════════════════════════════════════');
        logger.info('CONECTANDO CON XTREAM CODES API');
        logger.info('═══════════════════════════════════════');
        logger.info('Servidor: ' + this.server);
        logger.info('Usuario: ' + this.username);
        logger.info('═══════════════════════════════════════');

        const url = this.buildPlaylistUrl();

        logger.info('Descargando playlist...');

        try {
            let fetchUrl = url;

            // Solo usar proxy si está activado
            if (this.useCorsProxy && this.corsProxyUrl) {
                fetchUrl = this.corsProxyUrl + encodeURIComponent(url);
                logger.warning('Usando proxy CORS: ' + this.corsProxyUrl);
            } else {
                logger.success('Conexión directa (sin proxy)');
            }

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/x-mpegURL, text/plain, */*'
                }
            });

            logger.info(`Respuesta HTTP: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Autenticación fallida. Verifica usuario/contraseña.');
                } else if (response.status === 404) {
                    throw new Error('Servidor no encontrado. Verifica la URL.');
                }
                throw new Error(`Error HTTP ${response.status}`);
            }

            const content = await response.text();

            if (!content || content.trim().length === 0) {
                throw new Error('Playlist vacía');
            }

            logger.success(`✅ Playlist descargada: ${content.length} caracteres`);

            // Mostrar primeras líneas
            const firstLines = content.split('\n').slice(0, 3).join('\n');
            logger.info('Primeras líneas:');
            logger.info(firstLines.substring(0, 150) + '...');

            return content;

        } catch (error) {
            logger.error('═══════════════════════════════════════');
            logger.error('ERROR AL CONECTAR CON XTREAM CODES');
            logger.error('═══════════════════════════════════════');
            logger.error('Mensaje: ' + error.message);

            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                logger.warning('Problema de conexión o CORS');
                logger.info('SOLUCIONES:');
                logger.info('1. Verifica que el servidor esté online');
                logger.info('2. Verifica la URL del servidor');
                logger.info('3. Si persiste, activa el proxy CORS');
            } else if (error.message.includes('Autenticación')) {
                logger.error('Usuario o contraseña incorrectos');
            }

            logger.error('═══════════════════════════════════════');
            throw error;
        }
    }

    processStreamUrl(originalUrl) {
        // Si la URL ya tiene credenciales Xtream, no hacer nada
        if (originalUrl.includes(`/${this.username}/${this.password}/`)) {
            logger.info('Stream con credenciales Xtream detectado');
            return originalUrl;
        }

        // Si es una URL externa, aplicar proxy si está activado
        if (this.useCorsProxy && this.corsProxyUrl && !originalUrl.includes(this.server)) {
            logger.warning('URL externa, aplicando proxy');
            return this.corsProxyUrl + encodeURIComponent(originalUrl);
        }

        return originalUrl;
    }
}

const xtreamAPI = new XtreamAPI();