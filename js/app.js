class IPTVApp {
    constructor() {
        this.currentTab = 'live';
        this.currentContent = [];
        this.selectedContent = null;
        this.init();
    }
    init() {
        logger.init();
        logger.success('═══════════════════════════════');
        logger.success('IPTV PLAYER PRO v2.0 - iPhone');
        logger.success('═══════════════════════════════');
        player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupUI();
        this.loadPlaylistList();
        const activePlaylist = storage.getActivePlaylist();
        if (activePlaylist) {
            this.loadPlaylist(activePlaylist.id);
        }
    }
    setupUI() {
        const modal = document.getElementById('playlistModal');
        const showBtn = document.getElementById('showPlaylistsBtn');
        const closeBtn = modal.querySelector('.modal-close');
        showBtn.onclick = () => modal.classList.add('active');
        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
        document.querySelectorAll('.tab-small').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.tab-small').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.method-form').forEach(f => f.classList.remove('active'));
                document.getElementById('method' + tab.dataset.method.charAt(0).toUpperCase() + tab.dataset.method.slice(1)).classList.add('active');
            };
        });
        document.getElementById('addXtreamBtn').onclick = () => this.addXtreamPlaylist();
        document.getElementById('addM3uBtn').onclick = () => this.addM3UPlaylist();
        document.getElementById('playlistSelect').onchange = (e) => {
            if (e.target.value) {
                this.loadPlaylist(e.target.value);
            }
        };
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
        document.getElementById('searchInput').oninput = (e) => {
            const filtered = playlistManager.search(this.currentContent, e.target.value);
            this.renderContent(filtered);
        };
        document.getElementById('playBtn').onclick = () => this.playSelected();
        document.getElementById('resumeBtn').onclick = () => this.resumeSelected();
        document.getElementById('clearLogBtn').onclick = () => logger.clear();
    }
    addXtreamPlaylist() {
        const name = document.getElementById('playlistName').value.trim();
        const server = document.getElementById('xtreamServer').value.trim().replace(/\/+$/, '');
        const username = document.getElementById('xtreamUser').value.trim();
        const password = document.getElementById('xtreamPass').value.trim();
        if (!name || !server || !username || !password) {
            alert('Completa todos los campos');
            return;
        }
        const playlist = {
            name: name,
            type: 'xtream',
            server: server,
            username: username,
            password: password
        };
        const id = storage.addPlaylist(playlist);
        this.loadPlaylistList();
        this.loadPlaylist(id);
        document.getElementById('playlistName').value = '';
        document.getElementById('xtreamServer').value = '';
        document.getElementById('xtreamUser').value = '';
        document.getElementById('xtreamPass').value = '';
        document.getElementById('playlistModal').classList.remove('active');
    }
    addM3UPlaylist() {
        const name = document.getElementById('m3uName').value.trim();
        const url = document.getElementById('m3uUrl').value.trim();
        if (!name || !url) {
            alert('Completa todos los campos');
            return;
        }
        const playlist = {
            name: name,
            type: 'm3u',
            url: url
        };
        const id = storage.addPlaylist(playlist);
        this.loadPlaylistList();
        this.loadPlaylist(id);
        document.getElementById('m3uName').value = '';
        document.getElementById('m3uUrl').value = '';
        document.getElementById('playlistModal').classList.remove('active');
    }
    loadPlaylistList() {
        const select = document.getElementById('playlistSelect');
        const itemsContainer = document.getElementById('playlistItems');
        select.innerHTML = '<option value="">Selecciona una lista</option>';
        itemsContainer.innerHTML = '';
        if (storage.playlists.length === 0) {
            itemsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; font-size: 12px;">No hay listas agregadas</p>';
            return;
        }
        storage.playlists.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist.id;
            option.textContent = playlist.name;
            if (playlist.id === storage.activePlaylistId) {
                option.selected = true;
            }
            select.appendChild(option);
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <div class="playlist-item-info">
                    <h4>${playlist.name}</h4>
                    <p>${playlist.type === 'xtream' ? '🌐 Xtream Codes' : '📄 M3U'}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-mini" onclick="app.loadPlaylist('${playlist.id}')">📂 Cargar</button>
                    <button class="btn-mini danger" onclick="app.removePlaylist('${playlist.id}')">🗑️</button>
                </div>
            `;
            itemsContainer.appendChild(item);
        });
    }
    removePlaylist(id) {
        if (!confirm('¿Eliminar esta lista?')) return;
        storage.removePlaylist(id);
        this.loadPlaylistList();
        if (id === storage.activePlaylistId) {
            storage.setActivePlaylist(null);
            this.clearContent();
        }
    }
    async loadPlaylist(id) {
        const playlist = storage.getPlaylist(id);
        if (!playlist) return;
        try {
            await playlistManager.loadPlaylist(playlist);
            storage.setActivePlaylist(id);
            this.switchTab('live');
            document.getElementById('playlistSelect').value = id;
        } catch (error) {
            alert('Error al cargar lista:\n' + error.message + '\n\nEn iPhone puede ser un problema de CORS. Verifica el log.');
        }
    }
    switchTab(tabType) {
        this.currentTab = tabType;
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) tab.classList.add('active');
        });
        this.currentContent = playlistManager.getByType(tabType);
        this.renderContent(this.currentContent);
    }
    renderContent(items) {
        const list = document.getElementById('contentList');
        if (items.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; padding: 30px 15px;"><div style="font-size: 40px; margin-bottom: 10px;">📭</div><p style="font-size: 12px;">Sin contenido</p></div>';
            return;
        }
        list.innerHTML = '';
        const max = Math.min(items.length, 100);
        for (let i = 0; i < max; i++) {
            const item = items[i];
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = `<strong>${item.name}</strong><small>${item.group}</small>`;
            div.onclick = () => this.selectContent(item, div);
            list.appendChild(div);
        }
        if (items.length > max) {
            const more = document.createElement('div');
            more.style.cssText = 'text-align: center; padding: 15px; color: #666; font-size: 11px;';
            more.textContent = `Mostrando ${max} de ${items.length}. Usa búsqueda.`;
            list.appendChild(more);
        }
    }
    async selectContent(content, element) {
        logger.info('Seleccionado: ' + content.name);
        this.selectedContent = content;
        document.querySelectorAll('.content-item').forEach(i => i.classList.remove('active'));
        if (element) element.classList.add('active');
        document.getElementById('videoOverlay').classList.add('hidden');
        document.getElementById('contentInfo').style.display = 'flex';
        document.getElementById('infoTitle').textContent = content.name;
        document.getElementById('infoMeta').textContent = content.group;
        document.getElementById('infoOverview').textContent = '';
        document.getElementById('infoPoster').style.backgroundImage = '';
        if (content.type === 'movie') {
            const movie = await tmdb.searchMovie(content.name);
            if (movie) {
                document.getElementById('infoOverview').textContent = movie.overview || 'Sin descripción';
                if (movie.poster_path) {
                    document.getElementById('infoPoster').style.backgroundImage = `url(${tmdb.getPosterUrl(movie.poster_path)})`;
                }
                document.getElementById('infoMeta').textContent += ` • ${movie.release_date ? movie.release_date.substring(0, 4) : ''} • ⭐ ${movie.vote_average}/10`;
            }
        } else if (content.type === 'series') {
            const show = await tmdb.searchTVShow(content.name);
            if (show) {
                document.getElementById('infoOverview').textContent = show.overview || 'Sin descripción';
                if (show.poster_path) {
                    document.getElementById('infoPoster').style.backgroundImage = `url(${tmdb.getPosterUrl(show.poster_path)})`;
                }
                document.getElementById('infoMeta').textContent += ` • ${show.first_air_date ? show.first_air_date.substring(0, 4) : ''} • ⭐ ${show.vote_average}/10`;
            }
        }
        const savedPosition = storage.getPosition(content.id);
        if (savedPosition && savedPosition.position > 5) {
            const minutes = Math.floor(savedPosition.position / 60);
            const seconds = Math.floor(savedPosition.position % 60);
            document.getElementById('resumeBtn').style.display = 'inline-block';
            document.getElementById('resumeBtn').textContent = `⏯️ Continuar (${minutes}:${seconds.toString().padStart(2, '0')})`;
        } else {
            document.getElementById('resumeBtn').style.display = 'none';
        }
    }
    async playSelected() {
        if (!this.selectedContent) return;
        try {
            await player.loadStream(this.selectedContent);
        } catch (error) {
            alert('Error al reproducir:\n' + error.message + '\n\nPrueba con otro canal.');
        }
    }
    async resumeSelected() {
        if (!this.selectedContent) return;
        const savedPosition = storage.getPosition(this.selectedContent.id);
        if (!savedPosition) {
            this.playSelected();
            return;
        }
        try {
            await player.loadStream(this.selectedContent);
            setTimeout(() => {
                player.resumeFrom(savedPosition.position);
            }, 1000);
        } catch (error) {
            alert('Error al reproducir:\n' + error.message);
        }
    }
    clearContent() {
        document.getElementById('contentList').innerHTML = '<div style="text-align: center; color: #666; padding: 30px 15px;"><div style="font-size: 40px; margin-bottom: 10px;">📋</div><p style="font-size: 12px;">Agrega una lista IPTV</p></div>';
        document.getElementById('contentInfo').style.display = 'none';
        document.getElementById('videoOverlay').classList.remove('hidden');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});