class IPTVApp {
    constructor() {
        this.player = null;
        this.parser = new M3UParser();
        this.currentTab = 'live';
        this.currentContent = [];
        this.currentMethod = 'xtream';
        this.init();
    }

    init() {
        logger.init();
        logger.success('═══════════════════════════════════════');
        logger.success('IPTV PLAYER - XTREAM CODES API');
        logger.success('Versión profesional con API integrada');
        logger.success('═══════════════════════════════════════');

        this.player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupMethodTabs();
        this.setupContentTabs();
        this.setupEvents();
        this.setupCORSControls();
        this.restoreState();

        document.getElementById('debugConsole').style.display = 'block';
    }

    setupMethodTabs() {
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.onclick = () => {
                const method = tab.dataset.method;
                this.switchMethod(method);
            };
        });
    }

    switchMethod(method) {
        this.currentMethod = method;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_METHOD, method);

        // Actualizar UI tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.method === method) {
                tab.classList.add('active');
            }
        });

        // Mostrar formulario correspondiente
        document.querySelectorAll('.input-method').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById('method-' + method).classList.add('active');

        logger.info('Método seleccionado: ' + method.toUpperCase());
    }

    setupContentTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                this.switchTab(tab.dataset.tab);
            };
        });
    }

    setupEvents() {
        // Xtream Codes
        document.getElementById('loadXtreamBtn').onclick = () => this.loadXtream();

        // Detectar Enter en campos Xtream
        ['xtreamServer', 'xtreamUsername', 'xtreamPassword'].forEach(id => {
            document.getElementById(id).onkeypress = (e) => {
                if (e.key === 'Enter') this.loadXtream();
            };
        });

        // M3U URL
        document.getElementById('loadM3uBtn').onclick = () => this.loadM3uUrl();
        document.getElementById('m3uUrl').onkeypress = (e) => {
            if (e.key === 'Enter') this.loadM3uUrl();
        };

        // Archivo
        document.getElementById('fileBtn').onclick = () => {
            document.getElementById('m3uFile').click();
        };
        document.getElementById('m3uFile').onchange = (e) => {
            if (e.target.files[0]) {
                this.loadFile(e.target.files[0]);
            }
        };

        // Búsqueda
        document.getElementById('searchInput').oninput = (e) => {
            this.filterContent(e.target.value);
        };
    }

    setupCORSControls() {
        const checkbox = document.getElementById('useCorsProxy');
        const select = document.getElementById('corsProxySelect');

        checkbox.checked = xtreamAPI.useCorsProxy;

        if (xtreamAPI.corsProxyUrl) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === xtreamAPI.corsProxyUrl) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }

        checkbox.onchange = () => {
            xtreamAPI.setProxy(checkbox.checked, select.value);
            if (checkbox.checked) {
                logger.warning('Proxy CORS activado (solo si hay errores)');
            } else {
                logger.success('Proxy CORS desactivado (recomendado)');
            }
        };

        select.onchange = () => {
            xtreamAPI.setProxy(checkbox.checked, select.value);
        };
    }

    async loadXtream() {
        const server = document.getElementById('xtreamServer').value.trim();
        const username = document.getElementById('xtreamUsername').value.trim();
        const password = document.getElementById('xtreamPassword').value.trim();

        if (!server || !username || !password) {
            alert('Por favor completa todos los campos:\n\n• Servidor\n• Usuario\n• Contraseña');
            return;
        }

        logger.info('═══════════════════════════════════════');
        logger.info('INICIANDO CONEXIÓN XTREAM CODES');
        logger.info('═══════════════════════════════════════');

        // Guardar credenciales
        xtreamAPI.saveCredentials(server, username, password);

        this.showLoading('Conectando con Xtream Codes API...');

        try {
            // Cargar playlist usando API
            const content = await xtreamAPI.loadPlaylist();

            // Parsear contenido
            this.parser.parse(content);

            // Mostrar contenido
            this.switchTab(this.currentTab);

            logger.success('═══════════════════════════════════════');
            logger.success('✅ CONEXIÓN EXITOSA');
            logger.success('Todos los streams usarán credenciales');
            logger.success('═══════════════════════════════════════');

        } catch (error) {
            logger.error('Error al conectar: ' + error.message);

            let alertMsg = 'Error al conectar con Xtream Codes:\n\n' + error.message;

            if (error.message.includes('Autenticación')) {
                alertMsg += '\n\n💡 Verifica usuario y contraseña';
            } else if (error.message.includes('Servidor')) {
                alertMsg += '\n\n💡 Verifica la URL del servidor';
            } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                alertMsg += '\n\n💡 Activa el proxy CORS si el problema persiste';
            }

            alert(alertMsg);
            this.hideLoading();
        }
    }

    async loadM3uUrl() {
        const url = document.getElementById('m3uUrl').value.trim();

        if (!url) {
            alert('Por favor ingresa una URL M3U');
            return;
        }

        logger.info('═══════════════════════════════════════');
        logger.info('CARGANDO PLAYLIST M3U DESDE URL');
        logger.info('═══════════════════════════════════════');

        this.showLoading('Descargando playlist M3U...');

        try {
            let fetchUrl = url;
            if (xtreamAPI.useCorsProxy && xtreamAPI.corsProxyUrl) {
                fetchUrl = xtreamAPI.corsProxyUrl + encodeURIComponent(url);
                logger.info('Usando proxy CORS');
            }

            const response = await fetch(fetchUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const content = await response.text();
            logger.success('Playlist descargada');

            this.parser.parse(content);
            this.switchTab(this.currentTab);

            logger.success('✅ Playlist M3U cargada correctamente');

        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar playlist M3U:\n\n' + error.message);
            this.hideLoading();
        }
    }

    async loadFile(file) {
        logger.info('═══════════════════════════════════════');
        logger.info('CARGANDO ARCHIVO LOCAL');
        logger.info('Archivo: ' + file.name);
        logger.info('═══════════════════════════════════════');

        this.showLoading('Leyendo archivo...');

        try {
            const content = await this.readFile(file);
            this.parser.parse(content);
            this.switchTab(this.currentTab);

            logger.success('✅ Archivo cargado correctamente');

        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar archivo:\n\n' + error.message);
            this.hideLoading();
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    switchTab(tabType) {
        this.currentTab = tabType;

        // Actualizar UI
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            }
        });

        // Título
        const titles = {
            'live': 'Canales en Vivo',
            'movies': 'Películas',
            'series': 'Series'
        };
        document.getElementById('sidebarTitle').textContent = titles[tabType];

        // Contenido
        const content = this.parser.getByType(tabType);
        this.currentContent = content;
        this.renderContent(content);

        logger.info(`Tab: ${tabType.toUpperCase()} - ${content.length} items`);
    }

    renderContent(items) {
        const list = document.getElementById('contentList');

        if (items.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; color: #666; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                    <p style="font-size: 16px; margin-bottom: 10px; font-weight: 600;">Sin contenido</p>
                    <p style="font-size: 13px; color: #555;">
                        No hay items en esta categoría
                    </p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'content-item';

            let badge = '';
            if (item.type === 'movie') badge = '<span class="content-badge">MOVIE</span>';
            else if (item.type === 'series') badge = '<span class="content-badge">SERIES</span>';

            div.innerHTML = `
                <strong>${badge}${item.name}</strong>
                <small>${item.group}</small>
            `;

            div.onclick = () => {
                this.playContent(item, div);
            };

            list.appendChild(div);
        });

        logger.info(`Renderizados ${items.length} items`);
    }

    playContent(content, element) {
        logger.info('═══════════════════════════════════════');
        logger.info('SELECCIONADO: ' + content.name);
        logger.info('═══════════════════════════════════════');

        // Actualizar UI
        document.querySelectorAll('.content-item').forEach(item => {
            item.classList.remove('active');
        });
        if (element) element.classList.add('active');

        // Reproducir
        this.player.loadStream(content.url, content);

        // Now Playing
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

    showLoading(message = 'Cargando...') {
        document.getElementById('contentList').innerHTML = `
            <div style="text-align: center; color: #999; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                <p style="font-size: 18px; margin-bottom: 10px; font-weight: 600;">${message}</p>
                <p style="font-size: 13px; color: #666;">
                    Por favor espera
                </p>
            </div>
        `;
    }

    hideLoading() {
        this.renderContent(this.currentContent);
    }

    restoreState() {
        // Restaurar método
        const savedMethod = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_METHOD);
        if (savedMethod) {
            this.switchMethod(savedMethod);
        }

        // Restaurar credenciales Xtream en campos
        if (xtreamAPI.server) {
            document.getElementById('xtreamServer').value = xtreamAPI.server;
            document.getElementById('xtreamUsername').value = xtreamAPI.username;
            document.getElementById('xtreamPassword').value = xtreamAPI.password;
            logger.info('Credenciales Xtream restauradas');
        }
    }
}

// Iniciar app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});