class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
        this.allContent = [];
    }
    parse(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const items = [];
        let current = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                current = { name: 'Sin nombre', logo: '', group: 'General', url: '', originalUrl: '', type: 'live' };
                const logoM = line.match(/tvg-logo="([^"]*)"/);
                if (logoM) current.logo = logoM[1];
                const groupM = line.match(/group-title="([^"]*)"/);
                if (groupM) current.group = groupM[1];
                const parts = line.split(',');
                if (parts.length > 1) current.name = parts[parts.length - 1].trim();
                const text = (current.name + ' ' + current.group).toLowerCase();
                for (const kw of CONFIG.VOD_KEYWORDS.MOVIES) {
                    if (text.includes(kw)) { current.type = 'movie'; break; }
                }
                for (const kw of CONFIG.VOD_KEYWORDS.SERIES) {
                    if (text.includes(kw)) { current.type = 'series'; break; }
                }
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                current.originalUrl = line;
                items.push(current);
                current = null;
            }
        }
        this.allContent = items;
        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');
        logger.success(`Parseados ${items.length} items`);
        return items;
    }
    async loadFromUrl(url) {
        const processedUrl = corsHandler.processUrl(url);
        logger.info('Cargando playlist...');
        try {
            const response = await fetch(processedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            logger.success('Playlist descargada');
            return this.parse(content);
        } catch (error) {
            logger.error('Error: ' + error.message);
            if (error.message.includes('Failed')) logger.error('❌ ERROR CORS - Verifica el proxy');
            throw error;
        }
    }
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => { try { resolve(this.parse(e.target.result)); } catch (err) { reject(err); } };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
    filterByName(items, term) {
        if (!term) return items;
        term = term.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(term) || i.group.toLowerCase().includes(term));
    }
}