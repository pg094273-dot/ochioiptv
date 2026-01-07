class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }

    parse(content) {
        logger.info('Iniciando parseo de playlist...');

        if (!content || content.trim().length === 0) {
            logger.error('Playlist vacía o inválida');
            throw new Error('Playlist vacía');
        }

        const lines = content.split('\n').filter(l => l.trim());

        if (!lines[0] || !lines[0].includes('#EXTM3U')) {
            logger.warning('Playlist no comienza con #EXTM3U (puede funcionar igual)');
        }

        const items = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                current = {
                    name: 'Sin nombre',
                    logo: '',
                    group: 'General',
                    url: '',
                    originalUrl: '',
                    type: 'live'
                };

                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) current.logo = logoMatch[1];

                const groupMatch = line.match(/group-title="([^"]*)"/);
                if (groupMatch) current.group = groupMatch[1];

                const parts = line.split(',');
                if (parts.length > 1) {
                    current.name = parts[parts.length - 1].trim();
                }

                const text = (current.name + ' ' + current.group).toLowerCase();
                for (const keyword of CONFIG.VOD_KEYWORDS.MOVIES) {
                    if (text.includes(keyword)) {
                        current.type = 'movie';
                        break;
                    }
                }
                for (const keyword of CONFIG.VOD_KEYWORDS.SERIES) {
                    if (text.includes(keyword)) {
                        current.type = 'series';
                        break;
                    }
                }
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                current.originalUrl = line;
                items.push(current);
                current = null;
            }
        }

        this.allContent = items;
        this.categorizeContent(items);

        logger.success(`✅ Parseados ${items.length} items`);
        logger.info(`├─ ${this.liveChannels.length} canales en vivo`);
        logger.info(`├─ ${this.movies.length} películas`);
        logger.info(`└─ ${this.series.length} series`);

        return items;
    }

    categorizeContent(items) {
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');
    }

    async loadFromUrl(url) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO PLAYLIST DESDE URL');
        logger.info('═══════════════════════════════');
        logger.info('URL original: ' + url.substring(0, 80) + '...');

        // Usar proxy SOLO para la playlist
        const processedUrl = corsHandler.processPlaylistUrl(url);

        try {
            logger.info('Iniciando fetch de playlist...');

            const response = await fetch(processedUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*'
                }
            });

            logger.info(`Respuesta HTTP: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();

            if (!content || content.trim().length === 0) {
                throw new Error('Playlist vacía');
            }

            logger.success(`✅ Playlist descargada: ${content.length} caracteres`);

            // Mostrar primeras líneas para debug
            const firstLines = content.split('\n').slice(0, 3).join('\n');
            logger.info('Primeras líneas de la playlist:');
            logger.info(firstLines);

            return this.parse(content);

        } catch (error) {
            logger.error('═══════════════════════════════');
            logger.error('ERROR AL CARGAR PLAYLIST');
            logger.error('═══════════════════════════════');
            logger.error('Mensaje: ' + error.message);

            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                logger.error('❌ ERROR CORS DETECTADO');
                logger.warning('SOLUCIONES:');
                logger.info('1. Activa "Proxy CORS para Playlist" arriba');
                logger.info('2. Cambia el proxy en el selector');
                logger.info('3. Prueba con el botón "🧪 Test"');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                logger.error('❌ ERROR DE AUTENTICACIÓN');
                logger.warning('Verifica username/password en la URL');
            } else if (error.message.includes('404')) {
                logger.error('❌ URL NO ENCONTRADA');
                logger.warning('Verifica que la URL sea correcta');
            } else if (error.message.includes('vacía')) {
                logger.error('❌ PLAYLIST VACÍA O INVÁLIDA');
                logger.warning('El servidor devolvió contenido vacío');
            }

            logger.error('═══════════════════════════════');
            throw error;
        }
    }

    async loadFromFile(file) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO PLAYLIST DESDE ARCHIVO');
        logger.info('═══════════════════════════════');
        logger.info('Archivo: ' + file.name);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    logger.success('Archivo leído correctamente');
                    const items = this.parse(content);
                    resolve(items);
                } catch (error) {
                    logger.error('Error al parsear archivo: ' + error.message);
                    reject(error);
                }
            };

            reader.onerror = () => {
                logger.error('Error al leer archivo');
                reject(reader.error);
            };

            reader.readAsText(file);
        });
    }

    filterByName(items, term) {
        if (!term) return items;
        term = term.toLowerCase();
        return items.filter(item => 
            item.name.toLowerCase().includes(term) || 
            item.group.toLowerCase().includes(term)
        );
    }

    getByType(type) {
        switch(type) {
            case 'live': return this.liveChannels;
            case 'movies': return this.movies;
            case 'series': return this.series;
            default: return this.allContent;
        }
    }
}