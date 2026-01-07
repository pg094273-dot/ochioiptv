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
        logger.success('═══════════════════════════════');
        logger.success('IPTV PLAYER PRO INICIADO');
        logger.success('Compatible con Xtream Codes');
        logger.success('═══════════════════════════════');

        this.player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupEvents();
        this.setupCORSControls();
        this.restoreState();

        logger.success('Aplicación lista para usar');
        document.getElementById('debugConsole').style.display = 'block';
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
            if (e.target.files[0]) {
                this.loadFromFile(e.target.files[0]);
            }
        };

        document.getElementById('searchInput').oninput = (e) => {
            this.filterContent(e.target.value);
        };

        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                const tabType = tab.dataset.tab;
                this.switchTab(tabType);
            };
        });

        logger.info('Eventos configurados');
    }

    setupCORSControls() {
        const cbPlaylist = document.getElementById('useProxyForPlaylist');
        const cbStreams = document.getElementById('useProxyForStreams');
        const select = document.getElementById('corsProxySelect');
        const testBtn = document.getElementById('testProxyBtn');

        // Restaurar estado
        cbPlaylist.checked = corsHandler.useProxyForPlaylist;
        cbStreams.checked = corsHandler.useProxyForStreams;

        const savedProxyIndex = CONFIG.CORS_PROXIES.indexOf(corsHandler.corsProxyUrl);
        if (savedProxyIndex >= 0) {
            select.selectedIndex = savedProxyIndex;
        }

        // Eventos
        cbPlaylist.onchange = () => {
            corsHandler.setUseProxyForPlaylist(cbPlaylist.checked);
        };

        cbStreams.onchange = () => {
            corsHandler.setUseProxyForStreams(cbStreams.checked);

            if (!cbStreams.checked) {
                logger.info('═══════════════════════════════');
                logger.success('✅ CONFIGURACIÓN RECOMENDADA PARA AUTENTICACIÓN');
                logger.info('Los streams se reproducirán directamente');
                logger.info('Esto permite que username/password funcionen');
                logger.info('═══════════════════════════════');
            }
        };

        select.onchange = () => {
            const selectedProxy = select.value;
            corsHandler.setProxyUrl(selectedProxy);
        };

        testBtn.onclick = async () => {
            testBtn.disabled = true;
            testBtn.textContent = '🔄 Probando...';

            await corsHandler.testProxy();

            testBtn.disabled = false;
            testBtn.textContent = '🧪 Test';
        };

        logger.info('Controles CORS configurados');
    }

    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value.trim();

        if (!url) {
            alert('Por favor ingresa una URL de playlist');
            return;
        }

        logger.info('═══════════════════════════════════════');
        logger.info('CARGANDO NUEVA PLAYLIST');
        logger.info('═══════════════════════════════════════');

        // Detectar si es Xtream Codes
        if (url.includes('get.php') && url.includes('username=') && url.includes('password=')) {
            logger.info('✨ Formato Xtream Codes detectado');
            logger.info('URL contiene autenticación');

            if (corsHandler.useProxyForStreams) {
                logger.warning('⚠️ ADVERTENCIA: Proxy para streams está ACTIVADO');
                logger.warning('Esto puede causar "formato no soportado" con autenticación');
                logger.info('RECOMENDACIÓN: Desactiva "Proxy CORS para Streams"');
            } else {
                logger.success('✅ Configuración correcta detectada');
                logger.info('Proxy para streams está desactivado (correcto)');
            }
        }

        this.showLoading();

        try {
            await this.parser.loadFromUrl(url);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);
            this.switchTab(this.currentTab);
            logger.success('✅ Playlist cargada y lista para usar');
        } catch (error) {
            logger.error('Error fatal al cargar playlist: ' + error.message);

            let alertMsg = 'Error al cargar la playlist:\n\n' + error.message;

            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                alertMsg += '\n\n💡 SOLUCIÓN: Activa "Proxy CORS para Playlist"';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                alertMsg += '\n\n💡 SOLUCIÓN: Verifica username/password en la URL';
            }

            alert(alertMsg);
            this.hideLoading();
        }
    }

    async loadFromFile(file) {
        logger.info('═══════════════════════════════════════');
        logger.info('CARGANDO ARCHIVO LOCAL');
        logger.info('═══════════════════════════════════════');

        this.showLoading();

        try {
            await this.parser.loadFromFile(file);
            this.switchTab(this.currentTab);
            logger.success('Archivo cargado correctamente');
        } catch (error) {
            logger.error('Error al cargar archivo: ' + error.message);
            alert('Error al cargar el archivo:\n' + error.message);
            this.hideLoading();
        }
    }

    switchTab(tabType) {
        logger.info(`Cambiando a pestaña: ${tabType.toUpperCase()}`);

        this.currentTab = tabType;
        localStorage.setItem('iptv_last_tab', tabType);

        // Actualizar UI de tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            }
        });

        // Actualizar título
        const titles = {
            'live': 'Canales en Vivo',
            'movies': 'Películas VOD',
            'series': 'Series VOD'
        };
        document.getElementById('sidebarTitle').textContent = titles[tabType] || 'Contenido';

        // Cargar contenido
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

        logger.success(`${content.length} items disponibles en esta categoría`);
    }

    renderContent(items) {
        const list = document.getElementById('contentList');

        if (items.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px 20px;">
                    <p style="font-size: 16px; margin-bottom: 10px;">📭 Sin contenido en esta categoría</p>
                    <p style="font-size: 12px; color: #555;">
                        Prueba con otra pestaña o carga una playlist diferente
                    </p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        logger.info(`Renderizando ${items.length} items en la lista...`);

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'content-item';

            div.innerHTML = `
                <strong>${item.name}</strong>
                <small>${item.group}</small>
            `;

            div.onclick = () => {
                logger.info('═══════════════════════════════════════');
                logger.info(`SELECCIONADO: ${item.name}`);
                logger.info('═══════════════════════════════════════');
                this.playContent(item, div);
            };

            list.appendChild(div);
        });

        logger.success(`✅ Lista renderizada con ${items.length} items`);
    }

    playContent(content, element) {
        // Actualizar UI
        document.querySelectorAll('.content-item').forEach(item => {
            item.classList.remove('active');
        });

        if (element) {
            element.classList.add('active');
        }

        // Reproducir
        this.player.loadStream(content.originalUrl || content.url, content);

        // Mostrar info "Now Playing"
        document.getElementById('contentTitle').textContent = content.name;
        document.getElementById('contentMeta').textContent = content.group + ' • ' + content.type.toUpperCase();
        document.getElementById('nowPlaying').style.display = 'block';
    }

    filterContent(searchTerm) {
        const filtered = this.parser.filterByName(this.currentContent, searchTerm);
        this.renderContent(filtered);

        if (searchTerm) {
            logger.info(`Búsqueda: "${searchTerm}" - ${filtered.length} resultados`);
        }
    }

    showLoading() {
        document.getElementById('contentList').innerHTML = `
            <div style="text-align: center; color: #999; padding: 40px 20px;">
                <p style="font-size: 18px; margin-bottom: 10px;">⏳ Cargando playlist...</p>
                <p style="font-size: 13px; color: #666;">
                    Por favor espera un momento
                </p>
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
            logger.info('URL de playlist restaurada del almacenamiento local');
        }

        // Restaurar tab activo
        const savedTab = localStorage.getItem('iptv_last_tab');
        if (savedTab) {
            this.currentTab = savedTab;
            logger.info('Tab restaurado: ' + savedTab);
        }
    }
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});