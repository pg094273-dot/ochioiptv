class IPTVApp {
    constructor() {
        this.parser = new M3UParser();
        this.currentTab = 'live';
        this.currentContent = [];
        this.init();
    }

    init() {
        logger.init();
        logger.success('═══════════════════════════════');
        logger.success('IPTV PLAYER - VERSIÓN FINAL');
        logger.success('Solución para timeout en servidores externos');
        logger.success('═══════════════════════════════');

        window.player = new IPTVPlayer(document.getElementById('videoPlayer'));

        this.setupMethodTabs();
        this.setupContentTabs();
        this.setupEvents();
        this.setupSettings();
        this.restoreState();
    }

    setupMethodTabs() {
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.querySelectorAll('.input-method').forEach(m => m.classList.remove('active'));
                document.getElementById('method-' + tab.dataset.method).classList.add('active');
            };
        });
    }

    setupContentTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
    }

    setupEvents() {
        // Xtream
        document.getElementById('loadXtreamBtn').onclick = () => this.loadXtream();
        ['xtreamServer', 'xtreamUsername', 'xtreamPassword'].forEach(id => {
            document.getElementById(id).onkeypress = (e) => {
                if (e.key === 'Enter') this.loadXtream();
            };
        });

        // M3U
        document.getElementById('loadM3uBtn').onclick = () => this.loadM3uUrl();
        document.getElementById('m3uUrl').onkeypress = (e) => {
            if (e.key === 'Enter') this.loadM3uUrl();
        };

        // Búsqueda
        document.getElementById('searchInput').oninput = (e) => {
            this.filterContent(e.target.value);
        };
    }

    setupSettings() {
        const directLoadCheckbox = document.getElementById('useDirectLoad');
        const timeoutSelect = document.getElementById('timeoutSelect');

        directLoadCheckbox.checked = xtreamAPI.directLoad;

        const savedTimeout = localStorage.getItem(CONFIG.STORAGE_KEYS.TIMEOUT);
        if (savedTimeout) {
            timeoutSelect.value = savedTimeout;
        }

        directLoadCheckbox.onchange = () => {
            xtreamAPI.setDirectLoad(directLoadCheckbox.checked);
        };

        timeoutSelect.onchange = () => {
            const timeout = parseInt(timeoutSelect.value);
            window.player.setTimeout(timeout);
        };
    }

    async loadXtream() {
        const server = document.getElementById('xtreamServer').value.trim();
        const username = document.getElementById('xtreamUsername').value.trim();
        const password = document.getElementById('xtreamPassword').value.trim();

        if (!server || !username || !password) {
            alert('Completa todos los campos');
            return;
        }

        xtreamAPI.saveSettings(server, username, password);

        this.showLoading('Conectando...');

        try {
            const content = await xtreamAPI.loadPlaylist();
            this.parser.parse(content);
            this.switchTab(this.currentTab);
            logger.success('✅ CONEXIÓN EXITOSA');

            // Mostrar recomendación si hay muchos canales
            const total = this.parser.allContent.length;
            if (total > 1000) {
                logger.warning('Playlist grande detectada');
                logger.info('RECOMENDACIÓN: Activa "Carga directa" para mejor rendimiento');
            }

        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al conectar:\n\n' + error.message);
            this.hideLoading();
        }
    }

    async loadM3uUrl() {
        const url = document.getElementById('m3uUrl').value.trim();
        if (!url) {
            alert('Ingresa una URL');
            return;
        }

        this.showLoading('Descargando...');

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const content = await response.text();
            this.parser.parse(content);
            this.switchTab(this.currentTab);
            logger.success('Playlist M3U cargada');
        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar:\n\n' + error.message);
            this.hideLoading();
        }
    }

    switchTab(tabType) {
        this.currentTab = tabType;

        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) tab.classList.add('active');
        });

        const titles = {
            'live': 'TV en Vivo',
            'movies': 'Películas',
            'series': 'Series'
        };
        document.getElementById('sidebarTitle').textContent = titles[tabType];

        const content = this.parser.getByType(tabType);
        this.currentContent = content;
        this.renderContent(content);

        logger.info(`${tabType.toUpperCase()}: ${content.length} items`);
    }

    renderContent(items) {
        const list = document.getElementById('contentList');

        if (items.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; color: #666; padding: 30px 15px;">
                    <div style="font-size: 36px; margin-bottom: 12px;">📭</div>
                    <p style="font-size: 13px;">Sin contenido en esta categoría</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';

        // Limitar renderizado inicial para mejor rendimiento
        const maxInitial = 100;
        const itemsToRender = items.slice(0, maxInitial);

        itemsToRender.forEach(item => {
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = `
                <strong>${item.name}</strong>
                <small>${item.group}</small>
            `;
            div.onclick = () => this.playContent(item, div);
            list.appendChild(div);
        });

        if (items.length > maxInitial) {
            const loadMore = document.createElement('div');
            loadMore.style.cssText = 'text-align: center; padding: 15px; color: #999; font-size: 12px;';
            loadMore.innerHTML = `Mostrando ${maxInitial} de ${items.length}. Usa búsqueda para encontrar más.`;
            list.appendChild(loadMore);
        }

        logger.info(`Renderizados ${itemsToRender.length} de ${items.length} items`);
    }

    playContent(content, element) {
        logger.info('═══════════════════════════════');
        logger.info('SELECCIONADO: ' + content.name);

        document.querySelectorAll('.content-item').forEach(i => i.classList.remove('active'));
        if (element) element.classList.add('active');

        window.player.loadStream(content.url, content);

        document.getElementById('contentTitle').textContent = content.name;
        document.getElementById('contentMeta').textContent = content.group;
        document.getElementById('nowPlaying').style.display = 'block';
    }

    filterContent(term) {
        const filtered = this.parser.filterByName(this.currentContent, term);
        this.renderContent(filtered);
        if (term) logger.info(`Búsqueda "${term}": ${filtered.length} resultados`);
    }

    showLoading(msg = 'Cargando...') {
        document.getElementById('contentList').innerHTML = `
            <div style="text-align: center; color: #999; padding: 30px 15px;">
                <div style="font-size: 36px; margin-bottom: 12px;">⏳</div>
                <p style="font-size: 13px;">${msg}</p>
            </div>
        `;
    }

    hideLoading() {
        this.renderContent(this.currentContent);
    }

    restoreState() {
        if (xtreamAPI.server) {
            document.getElementById('xtreamServer').value = xtreamAPI.server;
            document.getElementById('xtreamUsername').value = xtreamAPI.username;
            document.getElementById('xtreamPassword').value = xtreamAPI.password;
            logger.info('Credenciales restauradas desde localStorage');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});