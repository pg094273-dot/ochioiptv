class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }
    parse(content) {
        logger.info('Parseando playlist...');
        const lines = content.split('\n').filter(l => l.trim());
        const items = [];
        let current = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                current = this.parseExtinf(line);
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                current.originalUrl = line;
                items.push(current);
                current = null;
            }
        }
        this.allContent = items;
        this.categorizeContent(items);
        logger.success(`Parseados ${items.length} items`);
        return items;
    }
    parseExtinf(line) {
        const item = { name: 'Sin nombre', logo: '', group: 'General', url: '', originalUrl: '', type: 'live' };
        const logoM = line.match(/tvg-logo="([^"]*)"/);
        if (logoM) item.logo = logoM[1];
        const groupM = line.match(/group-title="([^"]*)"/);
        if (groupM) item.group = groupM[1];
        const parts = line.split(',');
        if (parts.length > 1) item.name = parts[parts.length - 1].trim();
        item.type = this.detectContentType(item.name, item.group);
        return item;
    }
    detectContentType(name, group) {
        const text = (name + ' ' + group).toLowerCase();
        for (const keyword of CONFIG.VOD_KEYWORDS.MOVIES) {
            if (text.includes(keyword)) return 'movie';
        }
        for (const keyword of CONFIG.VOD_KEYWORDS.SERIES) {
            if (text.includes(keyword)) return 'series';
        }
        return 'live';
    }
    categorizeContent(items) {
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');
    }
    async loadFromUrl(url) {
        const processedUrl = corsHandler.processUrl(url);
        logger.info('Cargando: ' + processedUrl.substring(0, 80) + '...');
        try {
            const response = await fetch(processedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            logger.success('Playlist descargada');
            return this.parse(content);
        } catch (error) {
            logger.error('Error: ' + error.message);
            if (error.message.includes('CORS') || error.message.includes('Failed')) {
                logger.error('❌ ERROR CORS - Activa el proxy arriba');
            }
            throw error;
        }
    }
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    resolve(this.parse(e.target.result));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
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