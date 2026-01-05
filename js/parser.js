// Clase para parsear archivos M3U/M3U8
class M3UParser {
    constructor() {
        this.channels = [];
    }

    // Parsear contenido M3U desde texto
    parse(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const channels = [];
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtinf(line);
            } else if (line.startsWith('#EXTGRP:')) {
                if (currentChannel) {
                    currentChannel.group = line.replace('#EXTGRP:', '').trim();
                }
            } else if (line && !line.startsWith('#') && currentChannel) {
                // Esta es la URL del stream
                currentChannel.url = line;
                channels.push(currentChannel);
                currentChannel = null;
            }
        }

        this.channels = channels;
        return channels;
    }

    // Parsear línea EXTINF
    parseExtinf(line) {
        const channel = {
            name: '',
            logo: '',
            group: 'Sin categoría',
            url: '',
            tvgId: '',
            tvgName: ''
        };

        // Extraer logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) {
            channel.logo = logoMatch[1];
        }

        // Extraer ID
        const idMatch = line.match(/tvg-id="([^"]*)"/);
        if (idMatch) {
            channel.tvgId = idMatch[1];
        }

        // Extraer nombre del TVG
        const nameMatch = line.match(/tvg-name="([^"]*)"/);
        if (nameMatch) {
            channel.tvgName = nameMatch[1];
        }

        // Extraer grupo
        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) {
            channel.group = groupMatch[1];
        }

        // Extraer nombre del canal (después de la última coma)
        const parts = line.split(',');
        if (parts.length > 1) {
            channel.name = parts[parts.length - 1].trim();
        }

        // Si no hay nombre, usar el tvgName
        if (!channel.name && channel.tvgName) {
            channel.name = channel.tvgName;
        }

        return channel;
    }

    // Cargar desde URL
    async loadFromUrl(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();
            return this.parse(content);
        } catch (error) {
            console.error('Error cargando playlist desde URL:', error);
            throw error;
        }
    }

    // Cargar desde archivo
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const channels = this.parse(content);
                    resolve(channels);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // Obtener canales agrupados por categoría
    getGroupedChannels() {
        const grouped = {};

        this.channels.forEach(channel => {
            const group = channel.group || 'Sin categoría';
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(channel);
        });

        return grouped;
    }

    // Filtrar canales por nombre
    filterByName(searchTerm) {
        if (!searchTerm) return this.channels;

        const term = searchTerm.toLowerCase();
        return this.channels.filter(channel => 
            channel.name.toLowerCase().includes(term) ||
            channel.group.toLowerCase().includes(term)
        );
    }

    // Obtener todos los grupos únicos
    getGroups() {
        const groups = new Set(this.channels.map(ch => ch.group));
        return Array.from(groups).sort();
    }

    // Obtener canales
    getChannels() {
        return this.channels;
    }
}