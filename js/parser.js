class M3UParser {
    constructor() {
        this.channels = [];
    }

    parse(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const channels = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                current = this.parseExtinf(line);
            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                channels.push(current);
                current = null;
            }
        }

        this.channels = channels;
        console.log(`📋 ${channels.length} canales cargados`);
        return channels;
    }

    parseExtinf(line) {
        const ch = { name: 'Canal', logo: '', group: 'General', url: '' };
        const logoM = line.match(/tvg-logo="([^"]*)"/);
        if (logoM) ch.logo = logoM[1];
        const groupM = line.match(/group-title="([^"]*)"/);
        if (groupM) ch.group = groupM[1];
        const parts = line.split(',');
        if (parts.length > 1) ch.name = parts[parts.length - 1].trim();
        return ch;
    }

    async loadFromUrl(url) {
        console.log('🌐 Cargando playlist...');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return this.parse(await res.text());
    }

    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(this.parse(e.target.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    filterByName(term) {
        if (!term) return this.channels;
        term = term.toLowerCase();
        return this.channels.filter(ch => 
            ch.name.toLowerCase().includes(term) || ch.group.toLowerCase().includes(term)
        );
    }
}