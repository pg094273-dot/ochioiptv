class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }

    parse(content) {
        logger.info('Iniciando parseo de playlist...');
        const lines = content.split('\n').filter(l => l.trim());
        const items = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                current = this.parseExtinf(line);
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                items.push(current);
                current = null;
            }
        }

        this.allContent = items;
        this.categorizeContent(items);

        logger.success(`Parseados ${items.length} items (${this.liveChannels.length} TV, ${this.movies.length} películas, ${this.series.length} series)`);
        return items;
    }

    parseExtinf(line) {
        const item = {
            name: 'Sin nombre',
            logo: '',
            group: 'General',
            url: '',
            type: 'live' // Por defecto TV en vivo
        };

        // Logo
        const logoM = line.match(/tvg-logo="([^"]*)"/);
        if (logoM) item.logo = logoM[1];

        // Grupo
        const groupM = line.match(/group-title="([^"]*)"/);
        if (groupM) item.group = groupM[1];

        // Nombre
        const parts = line.split(',');
        if (parts.length > 1) {
            item.name = parts[parts.length - 1].trim();
        }

        // Detectar tipo de contenido
        item.type = this.detectContentType(item.name, item.group);

        return item;
    }

    detectContentType(name, group) {
        const text = (name + ' ' + group).toLowerCase();

        // Detectar películas
        for (const keyword of CONFIG.VOD_KEYWORDS.MOVIES) {
            if (text.includes(keyword)) {
                return 'movie';
            }
        }

        // Detectar series
        for (const keyword of CONFIG.VOD_KEYWORDS.SERIES) {
            if (text.includes(keyword)) {
                return 'series';
            }
        }

        // Por defecto es TV en vivo
        return 'live';
    }

    categorizeContent(items) {
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');

        logger.info(`Categorizado: ${this.liveChannels.length} canales, ${this.movies.length} películas, ${this.series.length} series`);
    }

    async loadFromUrl(url) {
        logger.info('Cargando desde URL: ' + url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const content = await response.text();
            logger.success('Playlist descargada correctamente');
            return this.parse(content);
        } catch (error) {
            logger.error('Error cargando playlist: ' + error.message);
            throw error;
        }
    }

    async loadFromFile(file) {
        logger.info('Cargando desde archivo: ' + file.name);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const items = this.parse(e.target.result);
                    logger.success('Archivo cargado correctamente');
                    resolve(items);
                } catch (error) {
                    logger.error('Error parseando archivo: ' + error.message);
                    reject(error);
                }
            };
            reader.onerror = () => {
                logger.error('Error leyendo archivo');
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