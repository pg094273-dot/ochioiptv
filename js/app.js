class IPTVApp {
    constructor() {
        this.player = null;
        this.parser = new M3UParser();
        this.currentChannels = [];
        this.init();
    }

    init() {
        this.player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupEvents();
        this.loadTMDB();
        this.restorePlaylist();
        console.log('✅ App inicializada');
    }

    setupEvents() {
        document.getElementById('loadBtn').onclick = () => this.loadFromUrl();
        document.getElementById('m3uUrl').onkeypress = (e) => {
            if (e.key === 'Enter') this.loadFromUrl();
        };
        document.getElementById('fileBtn').onclick = () => {
            document.getElementById('m3uFile').click();
        };
        document.getElementById('m3uFile').onchange = (e) => {
            if (e.target.files[0]) this.loadFromFile(e.target.files[0]);
        };
        document.getElementById('searchChannel').oninput = (e) => {
            this.filterChannels(e.target.value);
        };
        document.querySelector('.close-modal').onclick = () => this.closeModal();
    }

    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value.trim();
        if (!url) {
            alert('Ingresa una URL');
            return;
        }

        try {
            this.showLoading();
            const channels = await this.parser.loadFromUrl(url);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);
            this.currentChannels = channels;
            this.renderChannels(channels);
        } catch (error) {
            alert('Error al cargar playlist: ' + error.message);
        }
    }

    async loadFromFile(file) {
        try {
            this.showLoading();
            const channels = await this.parser.loadFromFile(file);
            this.currentChannels = channels;
            this.renderChannels(channels);
        } catch (error) {
            alert('Error al cargar archivo: ' + error.message);
        }
    }

    renderChannels(channels) {
        const list = document.getElementById('channelList');
        list.innerHTML = '';

        if (channels.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>❌ Sin canales</p></div>';
            return;
        }

        channels.forEach((ch, i) => {
            const div = document.createElement('div');
            div.className = 'channel-item';
            div.innerHTML = `
                <img src="${ch.logo || 'https://via.placeholder.com/40?text=TV'}" 
                     onerror="this.src='https://via.placeholder.com/40?text=TV'">
                <div class="channel-item-info">
                    <div class="channel-item-name">${ch.name}</div>
                    <div class="channel-item-group">${ch.group}</div>
                </div>
            `;
            div.onclick = () => this.playChannel(ch, div);
            list.appendChild(div);
        });
    }

    playChannel(channel, el) {
        document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
        el?.classList.add('active');
        this.player.loadStream(channel.url, channel);
        this.showNowPlaying(channel);
    }

    showNowPlaying(ch) {
        const np = document.getElementById('nowPlaying');
        document.getElementById('channelLogo').src = ch.logo || 'https://via.placeholder.com/80?text=TV';
        document.getElementById('channelName').textContent = ch.name;
        document.getElementById('channelGroup').textContent = ch.group;
        np.style.display = 'block';
    }

    filterChannels(term) {
        this.renderChannels(this.parser.filterByName(term));
    }

    async loadTMDB() {
        const movies = await tmdbService.getPopularMovies();
        this.renderMedia(movies, 'moviesGrid', 'movie');
        const series = await tmdbService.getPopularSeries();
        this.renderMedia(series, 'seriesGrid', 'tv');
    }

    renderMedia(items, containerId, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        items.slice(0, 6).forEach(item => {
            const div = document.createElement('div');
            div.className = 'media-card';
            const title = item.title || item.name;
            const rating = item.vote_average?.toFixed(1) || 'N/A';
            const year = (item.release_date || item.first_air_date || '').split('-')[0];
            div.innerHTML = `
                <img src="${tmdbService.getImageUrl(item.poster_path)}">
                <div class="media-card-info">
                    <div class="media-card-title">${title}</div>
                    <div class="media-card-meta">
                        <span>⭐ ${rating}</span>
                        <span>${year}</span>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    showLoading() {
        document.getElementById('channelList').innerHTML = 
            '<div class="empty-state"><p>⏳ Cargando...</p></div>';
    }

    restorePlaylist() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL);
        if (saved) document.getElementById('m3uUrl').value = saved;
    }

    closeModal() {
        document.getElementById('mediaModal').classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});