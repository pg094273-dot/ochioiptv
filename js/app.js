// Aplicación principal IPTV Web Player
class IPTVApp {
    constructor() {
        this.player = null;
        this.parser = new M3UParser();
        this.currentChannels = [];
        this.init();
    }

    // Inicializar la aplicación
    init() {
        // Inicializar reproductor
        const videoElement = document.getElementById('videoPlayer');
        this.player = new IPTVPlayer(videoElement);

        // Configurar eventos
        this.setupEventListeners();

        // Cargar contenido de TMDB
        this.loadTMDBContent();

        // Restaurar última playlist si existe
        this.restoreLastPlaylist();

        console.log('✅ IPTV Web Player inicializado');
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón cargar playlist desde URL
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadPlaylistFromUrl();
        });

        // Enter en input de URL
        document.getElementById('m3uUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadPlaylistFromUrl();
            }
        });

        // Botón cargar desde archivo
        document.getElementById('fileBtn').addEventListener('click', () => {
            document.getElementById('m3uFile').click();
        });

        // Selección de archivo
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadPlaylistFromFile(e.target.files[0]);
        });

        // Búsqueda de canales
        document.getElementById('searchChannel').addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });

        // Cerrar modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Cerrar modal al hacer click fuera
        document.getElementById('mediaModal').addEventListener('click', (e) => {
            if (e.target.id === 'mediaModal') {
                this.closeModal();
            }
        });
    }

    // Cargar playlist desde URL
    async loadPlaylistFromUrl() {
        const urlInput = document.getElementById('m3uUrl');
        const url = urlInput.value.trim();

        if (!url) {
            alert('Por favor, ingresa una URL válida');
            return;
        }

        try {
            this.showLoading('Cargando playlist...');
            const channels = await this.parser.loadFromUrl(url);

            // Guardar URL en localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);

            this.currentChannels = channels;
            this.renderChannels(channels);
            this.hideLoading();

            console.log(`✅ ${channels.length} canales cargados`);
        } catch (error) {
            this.hideLoading();
            alert('Error al cargar la playlist: ' + error.message);
            console.error(error);
        }
    }

    // Cargar playlist desde archivo
    async loadPlaylistFromFile(file) {
        if (!file) return;

        try {
            this.showLoading('Cargando archivo...');
            const channels = await this.parser.loadFromFile(file);

            this.currentChannels = channels;
            this.renderChannels(channels);
            this.hideLoading();

            console.log(`✅ ${channels.length} canales cargados desde archivo`);
        } catch (error) {
            this.hideLoading();
            alert('Error al cargar el archivo: ' + error.message);
            console.error(error);
        }
    }

    // Renderizar lista de canales
    renderChannels(channels) {
        const channelList = document.getElementById('channelList');
        channelList.innerHTML = '';

        if (channels.length === 0) {
            channelList.innerHTML = `
                <div class="empty-state">
                    <p>❌ No se encontraron canales</p>
                </div>
            `;
            return;
        }

        channels.forEach((channel, index) => {
            const channelItem = this.createChannelElement(channel, index);
            channelList.appendChild(channelItem);
        });
    }

    // Crear elemento de canal
    createChannelElement(channel, index) {
        const div = document.createElement('div');
        div.className = 'channel-item';
        div.dataset.index = index;

        const logo = channel.logo || 'https://via.placeholder.com/40x40?text=TV';

        div.innerHTML = `
            <img src="${logo}" alt="${channel.name}" onerror="this.src='https://via.placeholder.com/40x40?text=TV'">
            <div class="channel-item-info">
                <div class="channel-item-name">${channel.name}</div>
                <div class="channel-item-group">${channel.group}</div>
            </div>
        `;

        div.addEventListener('click', () => {
            this.playChannel(channel, div);
        });

        return div;
    }

    // Reproducir canal
    playChannel(channel, element) {
        // Remover clase active de todos los canales
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });

        // Añadir clase active al canal seleccionado
        if (element) {
            element.classList.add('active');
        }

        // Cargar stream
        this.player.loadStream(channel.url, channel);

        // Mostrar información del canal
        this.showNowPlaying(channel);

        console.log('▶️ Reproduciendo:', channel.name);
    }

    // Mostrar información "Now Playing"
    showNowPlaying(channel) {
        const nowPlaying = document.getElementById('nowPlaying');
        const channelLogo = document.getElementById('channelLogo');
        const channelName = document.getElementById('channelName');
        const channelGroup = document.getElementById('channelGroup');

        channelLogo.src = channel.logo || 'https://via.placeholder.com/80x80?text=TV';
        channelLogo.onerror = () => {
            channelLogo.src = 'https://via.placeholder.com/80x80?text=TV';
        };

        channelName.textContent = channel.name;
        channelGroup.textContent = channel.group;

        nowPlaying.style.display = 'block';
    }

    // Filtrar canales por búsqueda
    filterChannels(searchTerm) {
        const filtered = this.parser.filterByName(searchTerm);
        this.renderChannels(filtered);
    }

    // Cargar contenido de TMDB
    async loadTMDBContent() {
        try {
            // Cargar películas populares
            const movies = await tmdbService.getPopularMovies();
            this.renderMediaGrid(movies, 'moviesGrid', 'movie');

            // Cargar series populares
            const series = await tmdbService.getPopularSeries();
            this.renderMediaGrid(series, 'seriesGrid', 'tv');
        } catch (error) {
            console.error('Error cargando contenido TMDB:', error);
        }
    }

    // Renderizar grid de películas/series
    renderMediaGrid(items, containerId, mediaType) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        items.slice(0, 12).forEach(item => {
            const card = this.createMediaCard(item, mediaType);
            container.appendChild(card);
        });
    }

    // Crear tarjeta de película/serie
    createMediaCard(item, mediaType) {
        const div = document.createElement('div');
        div.className = 'media-card';

        const title = item.title || item.name;
        const posterPath = tmdbService.getImageUrl(item.poster_path);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const year = (item.release_date || item.first_air_date || '').split('-')[0];

        div.innerHTML = `
            <img src="${posterPath}" alt="${title}" loading="lazy">
            <div class="media-card-info">
                <div class="media-card-title">${title}</div>
                <div class="media-card-meta">
                    <span>⭐ ${rating}</span>
                    <span>${year}</span>
                </div>
            </div>
        `;

        div.addEventListener('click', () => {
            this.showMediaDetails(item.id, mediaType);
        });

        return div;
    }

    // Mostrar detalles de película/serie
    async showMediaDetails(id, mediaType) {
        try {
            const details = mediaType === 'movie' 
                ? await tmdbService.getMovieDetails(id)
                : await tmdbService.getSeriesDetails(id);

            if (!details) return;

            const modal = document.getElementById('mediaModal');
            const detailsContainer = document.getElementById('mediaDetails');

            const title = details.title || details.name;
            const posterPath = tmdbService.getImageUrl(details.poster_path, 'w780');
            const overview = details.overview || 'No hay descripción disponible.';
            const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
            const year = (details.release_date || details.first_air_date || '').split('-')[0];

            detailsContainer.innerHTML = `
                <h2>${title} (${year})</h2>
                <div style="display: flex; gap: 20px; margin-top: 20px;">
                    <img src="${posterPath}" style="width: 300px; border-radius: 8px;">
                    <div>
                        <p><strong>⭐ Puntuación:</strong> ${rating}/10</p>
                        <p><strong>📅 Año:</strong> ${year}</p>
                        ${details.runtime ? `<p><strong>⏱️ Duración:</strong> ${details.runtime} min</p>` : ''}
                        ${details.genres ? `<p><strong>🎭 Géneros:</strong> ${details.genres.map(g => g.name).join(', ')}</p>` : ''}
                        <p style="margin-top: 20px;"><strong>📝 Sinopsis:</strong></p>
                        <p style="line-height: 1.8;">${overview}</p>
                    </div>
                </div>
            `;

            modal.classList.add('active');
        } catch (error) {
            console.error('Error mostrando detalles:', error);
        }
    }

    // Cerrar modal
    closeModal() {
        document.getElementById('mediaModal').classList.remove('active');
    }

    // Mostrar loading
    showLoading(message) {
        const channelList = document.getElementById('channelList');
        channelList.innerHTML = `
            <div class="empty-state">
                <p>⏳ ${message}</p>
            </div>
        `;
    }

    // Ocultar loading
    hideLoading() {
        // Se manejará con renderChannels
    }

    // Restaurar última playlist
    restoreLastPlaylist() {
        const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL);
        if (savedUrl) {
            document.getElementById('m3uUrl').value = savedUrl;
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});