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
        logger.success('IPTV PLAYER PRO v2.1 - Directo');
        logger.success('═══════════════════════════════');
        logger.warning('💡 Usa "Pegar Contenido M3U" para evitar CORS');
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
        document.getElementById('addXtreamBtn').onclick = () => this.generateXtreamURL();
        document.getElementById('addM3uBtn').onclick = () => this.addM3UPlaylist();
        document.getElementById('addPasteBtn').onclick = () => this.addPastePlaylist();
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
    generateXtreamURL() {
        const name = document.getElementById('playlistName').value.trim();
        const server = document.getElementById('xtreamServer').value.trim().replace(/\/+$/, '');
        const username = document.getElementById('xtreamUser').value.trim();
        const password = document.getElementById('xtreamPass').value.trim();

        if (!server || !username || !password) {
            alert('Completa servidor, usuario y contraseña');
            return;
        }

        const url = `${server}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;

        const message = `📋 INSTRUCCIONES XTREAM CODES:\n\n` +
            `1️⃣ Copia esta URL:\n${url}\n\n` +
            `2️⃣ Abre una nueva pestaña y pégala en la barra de direcciones\n\n` +
            `3️⃣ Copia TODO el contenido que aparece (empezará con #EXTM3U)\n\n` +
            `4️⃣ Vuelve aquí y haz clic en "Pegar Contenido M3U"\n\n` +
            `5️⃣ Pega el contenido en el área de texto y dale a "Agregar"\n\n` +
            `⚠️ NOTA: Esto es necesario porque Safari/iPhone bloquea CORS`;

        alert(message);

        logger.info('═════════════════════════════');
        logger.warning('COPIA ESTA URL:');
        logger.info(url);
        logger.info('═════════════════════════════');
        logger.warning('1. Abre la URL en una nueva pestaña');
        logger.warning('2. Copia TODO el contenido');
        logger.warning('3. Usa "Pegar Contenido M3U"');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                logger.success('✅ URL copiada al portapapeles');
            }).catch(() => {
                logger.warning('Copia la URL manualmente del log');
            });
        }
    }
    addM3UPlaylist() {
        const name = document.getElementById('m3uName').value.trim();
        const url = document.getElementById('m3uUrl').value.trim();
        if (!name || !url) {
            alert('Completa todos los campos');
            return;
        }
        alert('⚠️ Las URLs M3U no funcionan por CORS.\n\n' +
              'En su lugar:\n' +
              '1. Abre la URL en tu navegador\n' +
              '2. Copia el contenido\n' +
              '3. Usa "Pegar Contenido M3U"');
        logger.error('URLs M3U bloqueadas por CORS');
        logger.info('Usa "Pegar Contenido M3U" en su lugar');
    }
    addPastePlaylist() {
        const name = document.getElementById('pasteName').value.trim();
        const content = document.getElementById('pasteContent').value.trim();

        if (!name) {
            alert('Escribe un nombre para la lista');
            return;
        }

        if (!content) {
            alert('Pega el contenido M3U');
            return;
        }

        if (!content.includes('#EXTM3U') && !content.includes('#EXTINF')) {
            alert('⚠️ El contenido no parece ser un archivo M3U válido.\n\nAsegúrate de copiar TODO desde #EXTM3U hasta el final.');
            return;
        }

        const playlist = {
            name: name,
            type: 'paste',
            content: content
        };

        const id = storage.addPlaylist(playlist);
        this.loadPlaylistList();
        this.loadPlaylist(id);

        document.getElementById('pasteName').value = '';
        document.getElementById('pasteContent').value = '';
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
            let typeIcon = '📋';
            let typeText = 'Contenido pegado';
            if (playlist.type === 'xtream') {
                typeIcon = '🌐';
                typeText = 'Xtream (pegado)';
            } else if (playlist.type === 'm3u') {
                typeIcon = '📄';
                typeText = 'M3U (pegado)';
            }
            item.innerHTML = `
                <div class="playlist-item-info">
                    <h4>${playlist.name}</h4>
                    <p>${typeIcon} ${typeText}</p>
                </div>
                <div class="playlist-item-actions">
                    <button class="btn-mini" onclick="app.loadPlaylist('${playlist.id}')">📂</button>
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
            alert('Error al cargar lista:\n' + error.message);
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
            alert('Error al reproducir:\n' + error.message);
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