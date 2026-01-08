// Logger
class Logger {
    constructor() {
        this.logElement = null;
    }
    init() {
        this.logElement = document.getElementById('debugLog');
        this.log('Logger iniciado', 'success');
    }
    log(msg, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const entry = `[${time}] ${msg}`;
        console.log(entry);
        if (this.logElement) {
            const div = document.createElement('div');
            div.className = `debug-log-item ${type}`;
            div.textContent = entry;
            this.logElement.appendChild(div);
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }
    success(msg) { this.log('✅ ' + msg, 'success'); }
    error(msg) { this.log('❌ ' + msg, 'error'); }
    warning(msg) { this.log('⚠️ ' + msg, 'warning'); }
    info(msg) { this.log('ℹ️ ' + msg, 'info'); }
    clear() { if (this.logElement) this.logElement.innerHTML = ''; }
}

const logger = new Logger();

// Parser M3U
class M3UParser {
    constructor() {
        this.liveChannels = [];
        this.movies = [];
        this.series = [];
    }

    parse(content) {
        logger.info('Parseando playlist...');

        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        const items = [];
        let current = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXTINF:')) {
                current = {
                    name: 'Canal',
                    logo: '',
                    group: 'General',
                    url: '',
                    type: 'live'
                };

                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) current.logo = logoMatch[1];

                const groupMatch = line.match(/group-title="([^"]*)"/);
                if (groupMatch) current.group = groupMatch[1];

                const parts = line.split(',');
                if (parts.length > 1) {
                    current.name = parts[parts.length - 1].trim();
                }

                const text = (current.name + ' ' + current.group).toLowerCase();
                if (text.match(/movie|pelicula|film|cine/)) {
                    current.type = 'movie';
                } else if (text.match(/serie|series|season|temporada/)) {
                    current.type = 'series';
                }

            } else if (line && !line.startsWith('#') && current) {
                current.url = line;
                items.push(current);
                current = null;
            }
        }

        this.liveChannels = items.filter(i => i.type === 'live');
        this.movies = items.filter(i => i.type === 'movie');
        this.series = items.filter(i => i.type === 'series');

        logger.success(`Parseados ${items.length} items`);
        logger.info(`TV: ${this.liveChannels.length} | Películas: ${this.movies.length} | Series: ${this.series.length}`);

        return items;
    }

    getByType(type) {
        switch(type) {
            case 'live': return this.liveChannels;
            case 'movies': return this.movies;
            case 'series': return this.series;
            default: return [];
        }
    }

    filterByName(items, term) {
        if (!term) return items;
        term = term.toLowerCase();
        return items.filter(i => 
            i.name.toLowerCase().includes(term) || 
            i.group.toLowerCase().includes(term)
        );
    }
}

// Player
class IPTVPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.hls = null;
        this.currentContent = null;
        logger.success('Reproductor inicializado');
    }

    loadStream(url, content) {
        logger.info('═══════════════════════════════');
        logger.info('CARGANDO: ' + content.name);
        logger.info('═══════════════════════════════');

        this.currentContent = content;
        this.cleanup();

        // SOLUCIÓN: Convertir .ts a .m3u8
        let finalUrl = url;

        if (url.endsWith('.ts')) {
            finalUrl = url.replace(/\.ts$/, '.m3u8');
            logger.warning('URL .ts detectada → Convirtiendo a .m3u8');
            logger.info('Nueva URL: ' + finalUrl.substring(0, 80) + '...');
        } else {
            logger.info('URL original: ' + url.substring(0, 80) + '...');
        }

        // Intentar ambas: m3u8 y ts
        this.tryUrls([finalUrl, url], content);
    }

    async tryUrls(urls, content) {
        logger.info(`Intentando ${urls.length} URLs...`);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            logger.info(`Intento ${i + 1}/${urls.length}: ${url.substring(url.length - 30)}`);

            try {
                await this.tryLoad(url);
                logger.success('✅ URL válida encontrada');
                return;
            } catch (error) {
                logger.error(`Intento ${i + 1} falló: ${error.message}`);
                if (i < urls.length - 1) {
                    logger.warning('Probando siguiente URL...');
                }
            }
        }

        logger.error('Todas las URLs fallaron');
        this.showError('No se pudo cargar el stream', 'Prueba con otro canal');
    }

    tryLoad(url) {
        return new Promise((resolve, reject) => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            // iOS/Safari: usar HLS nativo
            if ((isIOS || isSafari) && this.video.canPlayType('application/vnd.apple.mpegurl')) {
                logger.info('Usando HLS nativo (iOS/Safari)');

                this.video.src = url;

                const onLoadedMetadata = () => {
                    logger.success('Stream cargado (nativo)');
                    cleanup();
                    resolve();
                };

                const onError = () => {
                    logger.error('Error en carga nativa');
                    cleanup();
                    reject(new Error('Error HLS nativo'));
                };

                const cleanup = () => {
                    this.video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    this.video.removeEventListener('error', onError);
                };

                this.video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
                this.video.addEventListener('error', onError, { once: true });

                this.video.load();

                // Timeout de 15 segundos
                setTimeout(() => {
                    cleanup();
                    reject(new Error('Timeout'));
                }, 15000);

            } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                logger.info('Usando HLS.js');

                this.hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    manifestLoadingTimeOut: 20000,
                    manifestLoadingMaxRetry: 2,
                    levelLoadingTimeOut: 20000,
                    fragLoadingTimeOut: 20000
                });

                let resolved = false;

                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (!resolved) {
                        logger.success('Manifest cargado');
                        resolved = true;
                        resolve();
                    }
                });

                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal && !resolved) {
                        logger.error(`Error HLS: ${data.details}`);
                        resolved = true;
                        this.hls.destroy();
                        this.hls = null;
                        reject(new Error(data.details));
                    }
                });

                this.hls.loadSource(url);
                this.hls.attachMedia(this.video);

                // Timeout de 20 segundos
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        if (this.hls) {
                            this.hls.destroy();
                            this.hls = null;
                        }
                        reject(new Error('Timeout'));
                    }
                }, 20000);

            } else {
                logger.warning('HLS no soportado, usando video directo');
                this.video.src = url;
                this.video.load();

                const onLoadedMetadata = () => {
                    cleanup();
                    resolve();
                };

                const onError = () => {
                    cleanup();
                    reject(new Error('Error de carga'));
                };

                const cleanup = () => {
                    this.video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    this.video.removeEventListener('error', onError);
                };

                this.video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
                this.video.addEventListener('error', onError, { once: true });

                setTimeout(() => {
                    cleanup();
                    reject(new Error('Timeout'));
                }, 15000);
            }
        });
    }

    showError(title, message) {
        alert(title + '\n\n' + message);
    }

    cleanup() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
    }
}

// App
class IPTVApp {
    constructor() {
        this.parser = new M3UParser();
        this.currentTab = 'live';
        this.currentContent = [];
        this.server = '';
        this.username = '';
        this.password = '';
        this.init();
    }

    init() {
        logger.init();
        logger.success('═══════════════════════════════');
        logger.success('IPTV PLAYER ULTIMATE');
        logger.success('Conversión automática .ts → .m3u8');
        logger.success('═══════════════════════════════');

        window.player = new IPTVPlayer(document.getElementById('videoPlayer'));

        this.setupEvents();
        this.restoreState();
    }

    setupEvents() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });

        // Conectar
        document.getElementById('loadXtreamBtn').onclick = () => this.loadXtream();

        // Enter en inputs
        ['xtreamServer', 'xtreamUsername', 'xtreamPassword'].forEach(id => {
            document.getElementById(id).onkeypress = (e) => {
                if (e.key === 'Enter') this.loadXtream();
            };
        });

        // Búsqueda
        document.getElementById('searchInput').oninput = (e) => {
            const filtered = this.parser.filterByName(this.currentContent, e.target.value);
            this.renderContent(filtered);
        };
    }

    async loadXtream() {
        this.server = document.getElementById('xtreamServer').value.trim().replace(/\/+$/, '');
        this.username = document.getElementById('xtreamUsername').value.trim();
        this.password = document.getElementById('xtreamPassword').value.trim();

        if (!this.server || !this.username || !this.password) {
            alert('Completa todos los campos');
            return;
        }

        localStorage.setItem('iptv_server', this.server);
        localStorage.setItem('iptv_username', this.username);
        localStorage.setItem('iptv_password', this.password);

        logger.info('Conectando...');
        logger.info('Servidor: ' + this.server);
        logger.info('Usuario: ' + this.username);

        const url = `${this.server}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const content = await response.text();
            logger.success('Playlist descargada');

            this.parser.parse(content);
            this.switchTab('live');

            logger.success('✅ CONEXIÓN EXITOSA');

        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al conectar:\n' + error.message);
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

        this.currentContent = this.parser.getByType(tabType);
        this.renderContent(this.currentContent);
    }

    renderContent(items) {
        const list = document.getElementById('contentList');

        if (items.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; padding: 25px 10px;"><div style="font-size: 32px; margin-bottom: 10px;">📭</div><p style="font-size: 12px;">Sin contenido</p></div>';
            return;
        }

        list.innerHTML = '';

        const max = Math.min(items.length, 100);

        for (let i = 0; i < max; i++) {
            const item = items[i];
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = `<strong>${item.name}</strong><small>${item.group}</small>`;
            div.onclick = () => this.playContent(item, div);
            list.appendChild(div);
        }

        if (items.length > max) {
            const more = document.createElement('div');
            more.style.cssText = 'text-align: center; padding: 10px; color: #999; font-size: 11px;';
            more.textContent = `Mostrando ${max} de ${items.length}. Usa búsqueda.`;
            list.appendChild(more);
        }
    }

    playContent(content, element) {
        logger.info('Seleccionado: ' + content.name);

        document.querySelectorAll('.content-item').forEach(i => i.classList.remove('active'));
        if (element) element.classList.add('active');

        window.player.loadStream(content.url, content);

        document.getElementById('contentTitle').textContent = content.name;
        document.getElementById('contentMeta').textContent = content.group;
        document.getElementById('nowPlaying').style.display = 'block';
    }

    restoreState() {
        this.server = localStorage.getItem('iptv_server') || '';
        this.username = localStorage.getItem('iptv_username') || '';
        this.password = localStorage.getItem('iptv_password') || '';

        if (this.server) {
            document.getElementById('xtreamServer').value = this.server;
            document.getElementById('xtreamUsername').value = this.username;
            document.getElementById('xtreamPassword').value = this.password;
            logger.info('Credenciales restauradas');
        }
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});