class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }

    parse(content) {
        logger.info('Parseando playlist M3U...');

        if (!content || content.trim().length === 0) {
            throw new Error('Playlist vacía');
        }

        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        const items = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXTINF:')) {
                current = {
                    name: 'Canal',
                    logo: '',
                    group: 'General',
                    url: '',
                    streamId: null,
                    type: 'live'
                };

                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) current.logo = logoMatch[1];

                const groupMatch = line.match(/group-title="([^"]*)"/);
                if (groupMatch) current.group = groupMatch[1];

                const idMatch = line.match(/tvg-id="([^"]*)"/);
                if (idMatch) current.streamId = idMatch[1];

                const parts = line.split(',');
                if (parts.length > 1) {
                    current.name = parts[parts.length - 1].trim();
                }

                const text = (current.name + ' ' + current.group).toLowerCase();
                if (text.match(/movie|pelicula|film|cine/)) {
                    current.type = 'movie';
                } else if (text.match(/serie|series|season|temporada/)) {
                    current.type = 'series';
                }

            } else if (line && !line.startsWith('#') && current) {
                current.url = line;

                const xtreamMatch = line.match(/\/(live|movie|series)\/[^\/]+\/[^\/]+\/(\d+)/);
                if (xtreamMatch) {
                    current.streamId = xtreamMatch[2];
                    if (xtreamMatch[1] === 'movie') current.type = 'movie';
                    else if (xtreamMatch[1] === 'series') current.type = 'series';
                }

                items.push(current);
                current = null;
            }
        }

        this.allContent = items;
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');

        logger.success(`Parseados ${items.length} items`);
        logger.info(`TV: ${this.liveChannels.length} | Películas: ${this.movies.length} | Series: ${this.series.length}`);

        return items;
    }

    filterByName(items, term) {
        if (!term) return items;
        term = term.toLowerCase();
        return items.filter(i => 
            i.name.toLowerCase().includes(term) || 
            i.group.toLowerCase().includes(term)
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