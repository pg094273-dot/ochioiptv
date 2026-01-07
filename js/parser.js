class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }

    parse(content) {
        logger.info('Iniciando parseo de playlist M3U...');

        if (!content || content.trim().length === 0) {
            logger.error('Playlist vacía');
            throw new Error('Playlist vacía');
        }

        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        if (!lines[0] || !lines[0].includes('#EXTM3U')) {
            logger.warning('Playlist no comienza con #EXTM3U (puede funcionar igual)');
        }

        const items = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXTINF:')) {
                current = {
                    name: 'Sin nombre',
                    logo: '',
                    group: 'General',
                    url: '',
                    streamId: null,
                    type: 'live'
                };

                // Extraer atributos
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) current.logo = logoMatch[1];

                const groupMatch = line.match(/group-title="([^"]*)"/);
                if (groupMatch) current.group = groupMatch[1];

                const idMatch = line.match(/tvg-id="([^"]*)"/);
                if (idMatch) current.streamId = idMatch[1];

                // Nombre del canal (después de la última coma)
                const parts = line.split(',');
                if (parts.length > 1) {
                    current.name = parts[parts.length - 1].trim();
                }

                // Detectar tipo por nombre/grupo
                const text = (current.name + ' ' + current.group).toLowerCase();

                if (text.match(/\b(movie|pelicula|film|cine|cinema)\b/)) {
                    current.type = 'movie';
                } else if (text.match(/\b(serie|series|season|temporada|episode|episodio|capitulo)\b/)) {
                    current.type = 'series';
                }

            } else if (line && !line.startsWith('#') && current) {
                current.url = line;

                // Extraer stream ID de URLs Xtream Codes
                const xtreamMatch = line.match(/\/(?:live|movie|series)\/[^\/]+\/[^\/]+\/(\d+)/);
                if (xtreamMatch) {
                    current.streamId = xtreamMatch[1];
                }

                items.push(current);
                current = null;
            }
        }

        this.allContent = items;
        this.categorize();

        logger.success(`✅ Parseados ${items.length} items`);
        logger.info(`├─ ${this.liveChannels.length} canales en vivo`);
        logger.info(`├─ ${this.movies.length} películas`);
        logger.info(`└─ ${this.series.length} series`);

        return items;
    }

    categorize() {
        this.liveChannels = this.allContent.filter(i => i.type === 'live');
        this.movies = this.allContent.filter(i => i.type === 'movie');
        this.series = this.allContent.filter(i => i.type === 'series');
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