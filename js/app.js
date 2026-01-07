class IPTVApp {
    constructor() {
        this.player = null;
        this.parser = new M3UParser();
        this.currentTab = 'live';
        this.currentContent = [];
        this.init();
    }

    init() {
        logger.init();
        logger.success('Iniciando aplicación IPTV Player...');

        this.player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupEvents();
        this.restoreState();

        logger.success('Aplicación lista');

        // Mostrar debug console al inicio
        document.getElementById('debugConsole').style.display = 'block';
    }

    setupEvents() {
        // Botón cargar playlist
        document.getElementById('loadBtn').onclick = () => this.loadFromUrl();

        // Enter en input URL
        document.getElementById('m3uUrl').onkeypress = (e) => {
            if (e.key === 'Enter') this.loadFromUrl();
        };

        // Botón cargar archivo
        document.getElementById('fileBtn').onclick = () => {
            document.getElementById('m3uFile').click();
        };

        // Archivo seleccionado
        document.getElementById('m3uFile').onchange = (e) => {
            if (e.target.files[0]) {
                this.loadFromFile(e.target.files[0]);
            }
        };

        // Búsqueda
        document.getElementById('searchInput').oninput = (e) => {
            this.filterContent(e.target.value);
        };

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                const tabType = tab.dataset.tab;
                this.switchTab(tabType);
            };
        });

        logger.info('Eventos configurados');
    }

    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value.trim();

        if (!url) {
            alert('Por favor ingresa una URL');
            return;
        }

        logger.info('═══════════════════════════════');
        logger.info('CARGANDO NUEVA PLAYLIST');
        logger.info('═══════════════════════════════');

        this.showLoading();

        try {
            await this.parser.loadFromUrl(url);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);
            this.switchTab(this.currentTab);
            logger.success('Playlist cargada y procesada correctamente');
        } catch (error) {
            logger.error('Error fatal al cargar playlist: ' + error.message);
            alert('Error al cargar la playlist:\n' + error.message);
            this.hideLoading();
        }
    }

    async loadFromFile(file) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO ARCHIVO LOCAL');
        logger.info('═══════════════════════════════');

        this.showLoading();

        try {
            await this.parser.loadFromFile(file);
            this.switchTab(this.currentTab);
            logger.success('Archivo cargado y procesado correctamente');
        } catch (error) {
            logger.error('Error al cargar archivo: ' + error.message);
            alert('Error al cargar el archivo:\n' + error.message);
            this.hideLoading();
        }
    }

    switchTab(tabType) {
        logger.info(`Cambiando a pestaña: ${tabType}`);

        this.currentTab = tabType;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_TAB, tabType);

        // Actualizar UI de tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            }
        });

        // Actualizar título del sidebar
        const titles = {
            'live': 'Canales en Vivo',
            'movies': 'Películas VOD',
            'series': 'Series VOD'
        };
        document.getElementById('sidebarTitle').textContent = titles[tabType] || 'Contenido';

        // Cargar contenido según el tab
        let content = [];
        switch(tabType) {
            case 'live':
                content = this.parser.liveChannels;
                break;
            case 'movies':
                content = this.parser.movies;
                break;
            case 'series':
                content = this.parser.series;
                break;
        }

        this.currentContent = content;
        this.renderContent(content);

        logger.success(`${content.length} items en esta categoría`);
    }

    renderContent(items) {
        const list = document.getElementById('contentList');
        list.innerHTML = '';

        if (items.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>📭 No hay contenido en esta categoría</p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        Prueba cargando una playlist o cambia de pestaña
                    </p>
                </div>
            `;
            return;
        }

        logger.info(`Renderizando ${items.length} items...`);

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'content-item';

            const badgeText = {
                'live': 'LIVE',
                'movie': 'PELÍCULA',
                'series': 'SERIE'
            }[item.type] || 'VOD';

            div.innerHTML = `
                <img src="${item.logo || 'https://via.placeholder.com/50?text=' + badgeText}" 
                     onerror="this.src='https://via.placeholder.com/50?text=${badgeText}'">
                <div class="content-item-info">
                    <div class="content-item-name">${item.name}</div>
                    <div class="content-item-meta">
                        <span class="content-badge-small">${badgeText}</span>
                        ${item.group}
                    </div>
                </div>
            `;

            div.onclick = () => {
                logger.info('═══════════════════════════════');
                logger.info(`REPRODUCIENDO: ${item.name}`);
                logger.info('═══════════════════════════════');
                this.playContent(item, div);
            };

            list.appendChild(div);
        });
    }

    playContent(content, element) {
        // Remover active de todos
        document.querySelectorAll('.content-item').forEach(item => {
            item.classList.remove('active');
        });

        // Añadir active al seleccionado
        if (element) {
            element.classList.add('active');
        }

        // Reproducir
        this.player.loadStream(content.url, content);

        // Mostrar info
        this.showNowPlaying(content);
    }

    showNowPlaying(content) {
        const np = document.getElementById('nowPlaying');
        const logo = document.getElementById('contentLogo');
        const title = document.getElementById('contentTitle');
        const meta = document.getElementById('contentMeta');
        const badge = document.getElementById('contentBadge');

        logo.src = content.logo || 'https://via.placeholder.com/70?text=' + content.type.toUpperCase();
        logo.onerror = () => {
            logo.src = 'https://via.placeholder.com/70?text=' + content.type.toUpperCase();
        };

        title.textContent = content.name;
        meta.textContent = content.group;

        const badgeTexts = {
            'live': 'EN VIVO',
            'movie': 'PELÍCULA',
            'series': 'SERIE'
        };
        badge.textContent = badgeTexts[content.type] || 'VOD';
        badge.style.background = content.type === 'live' ? '#e50914' : '#0ea5e9';

        np.style.display = 'block';
    }

    filterContent(searchTerm) {
        const filtered = this.parser.filterByName(this.currentContent, searchTerm);
        this.renderContent(filtered);
        logger.info(`Filtrados: ${filtered.length} de ${this.currentContent.length} items`);
    }

    showLoading() {
        document.getElementById('contentList').innerHTML = `
            <div class="empty-state">
                <p>⏳ Cargando playlist...</p>
                <p style="font-size: 12px; margin-top: 10px;">Por favor espera...</p>
            </div>
        `;
    }

    hideLoading() {
        // Se maneja automáticamente con renderContent
    }

    restoreState() {
        // Restaurar URL de playlist
        const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL);
        if (savedUrl) {
            document.getElementById('m3uUrl').value = savedUrl;
            logger.info('URL de playlist restaurada: ' + savedUrl);
        }

        // Restaurar tab
        const savedTab = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_TAB);
        if (savedTab) {
            this.currentTab = savedTab;
            logger.info('Tab restaurado: ' + savedTab);
        }
    }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});