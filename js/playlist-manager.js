class PlaylistManager {
    constructor() {
        this.currentPlaylist = null;
        this.allContent = [];
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
    }
    async loadPlaylist(playlist) {
        logger.info('═════════════════════════════');
        logger.info('Cargando lista: ' + playlist.name);
        logger.info('═════════════════════════════');
        this.currentPlaylist = playlist;
        try {
            let content;
            if (playlist.type === 'xtream') {
                content = await this.loadXtream(playlist);
            } else if (playlist.type === 'm3u') {
                content = await this.loadM3U(playlist);
            }
            this.parseContent(content);
            logger.success('Lista cargada correctamente');
            return true;
        } catch (error) {
            logger.error('Error al cargar lista: ' + error.message);
            throw error;
        }
    }
    async loadXtream(playlist) {
        const url = `${playlist.server}/get.php?username=${playlist.username}&password=${playlist.password}&type=m3u_plus&output=ts`;
        logger.info('Conectando a Xtream...');

        try {
            // Intento 1: Fetch directo
            logger.info('Intento 1: Fetch directo');
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            if (response.ok) {
                logger.success('Conexión directa exitosa');
                return await response.text();
            }
        } catch (error) {
            logger.warning('Fetch directo falló: ' + error.message);
        }

        try {
            // Intento 2: Con proxy CORS
            logger.info('Intento 2: Usando proxy CORS');
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const response = await fetch(proxyUrl);

            if (response.ok) {
                logger.success('Conexión con proxy exitosa');
                return await response.text();
            }
        } catch (error) {
            logger.warning('Proxy CORS falló: ' + error.message);
        }

        try {
            // Intento 3: Proxy alternativo
            logger.info('Intento 3: Proxy alternativo');
            const proxyUrl2 = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            const response = await fetch(proxyUrl2);

            if (response.ok) {
                logger.success('Conexión con proxy alternativo exitosa');
                return await response.text();
            }
        } catch (error) {
            logger.error('Todos los intentos fallaron');
        }

        throw new Error('No se pudo conectar al servidor. Problema de CORS en iPhone.');
    }
    async loadM3U(playlist) {
        logger.info('Descargando M3U...');
        try {
            const response = await fetch(playlist.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (error) {
            // Intentar con proxy
            logger.warning('Reintentando con proxy...');
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(playlist.url);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        }
    }
    parseContent(content) {
        logger.info('Parseando contenido...');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        const items = [];
        let current = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('#EXTINF:')) {
                current = {name: 'Canal', logo: '', group: 'General', url: '', type: 'live', id: null};
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) current.logo = logoMatch[1];
                const groupMatch = line.match(/group-title="([^"]*)"/);
                if (groupMatch) current.group = groupMatch[1];
                const idMatch = line.match(/tvg-id="([^"]*)"/);
                if (idMatch) current.id = idMatch[1];
                const parts = line.split(',');
                if (parts.length > 1) {
                    current.name = parts[parts.length - 1].trim();
                }
                const text = (current.name + ' ' + current.group).toLowerCase();
                if (text.match(/movie|pelicula|film|cine/)) {
                    current.type = 'movie';
                } else if (text.match(/serie|series|season|temporada|episode|cap/)) {
                    current.type = 'series';
                }
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                if (!current.id) {
                    current.id = this.generateId(current.name + current.url);
                }
                items.push(current);
                current = null;
            }
        }
        this.allContent = items;
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');
        logger.success(`Total: ${items.length} items`);
        logger.info(`📺 TV: ${this.liveChannels.length} | 🎬 Películas: ${this.movies.length} | 📺 Series: ${this.series.length}`);
    }
    generateId(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'id_' + Math.abs(hash).toString();
    }
    getByType(type) {
        switch(type) {
            case 'live': return this.liveChannels;
            case 'movies': return this.movies;
            case 'series': return this.series;
            default: return this.allContent;
        }
    }
    search(items, term) {
        if (!term) return items;
        term = term.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(term) || i.group.toLowerCase().includes(term));
    }
}
const playlistManager = new PlaylistManager();