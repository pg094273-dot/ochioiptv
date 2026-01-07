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
        logger.success('IPTV Player iniciado');
        this.player = new IPTVPlayer(document.getElementById('videoPlayer'));
        this.setupEvents();
        this.setupCORSControls();
        document.getElementById('debugConsole').style.display = 'block';
    }
    setupEvents() {
        document.getElementById('loadBtn').onclick = () => this.loadFromUrl();
        document.getElementById('fileBtn').onclick = () => document.getElementById('m3uFile').click();
        document.getElementById('m3uFile').onchange = (e) => { if (e.target.files[0]) this.loadFromFile(e.target.files[0]); };
        document.getElementById('searchInput').oninput = (e) => this.filterContent(e.target.value);
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
    }
    setupCORSControls() {
        const cb = document.getElementById('useCorsProxy');
        const sel = document.getElementById('corsProxySelect');
        const btn = document.getElementById('testProxyBtn');
        cb.checked = corsHandler.useCorsProxy;
        cb.onchange = () => corsHandler.setUseProxy(cb.checked);
        sel.onchange = () => corsHandler.setProxyUrl(sel.value);
        btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = '🔄 Probando...';
            await corsHandler.testProxy();
            btn.disabled = false;
            btn.textContent = '🧪 Probar Proxy';
        };
    }
    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value.trim();
        if (!url) { alert('Ingresa una URL'); return; }
        logger.info('═════════════════════');
        logger.info('CARGANDO PLAYLIST');
        logger.info('═════════════════════');
        document.getElementById('contentList').innerHTML = '<div style="text-align:center;padding:40px;color:#666;">⏳ Cargando...</div>';
        try {
            await this.parser.loadFromUrl(url);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);
            this.switchTab(this.currentTab);
        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar playlist.\nVerifica el proxy CORS.');
            document.getElementById('contentList').innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;">❌ Error al cargar</div>';
        }
    }
    async loadFromFile(file) {
        try {
            await this.parser.loadFromFile(file);
            this.switchTab(this.currentTab);
        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar archivo');
        }
    }
    switchTab(tabType) {
        this.currentTab = tabType;
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabType);
        });
        const titles = { 'live': 'Canales en Vivo', 'movies': 'Películas VOD', 'series': 'Series VOD' };
        document.getElementById('sidebarTitle').textContent = titles[tabType];
        let content = [];
        switch(tabType) {
            case 'live': content = this.parser.liveChannels; break;
            case 'movies': content = this.parser.movies; break;
            case 'series': content = this.parser.series; break;
        }
        this.currentContent = content;
        this.renderContent(content);
    }
    renderContent(items) {
        const list = document.getElementById('contentList');
        if (items.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">📭 Sin contenido en esta categoría</div>';
            return;
        }
        list.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'content-item';
            div.innerHTML = '<strong>' + item.name + '</strong><br><small style="color:#999;">' + item.group + '</small>';
            div.onclick = () => this.playContent(item, div);
            list.appendChild(div);
        });
        logger.success('Renderizados ' + items.length + ' items');
    }
    playContent(content, element) {
        document.querySelectorAll('.content-item').forEach(i => i.classList.remove('active'));
        if (element) element.classList.add('active');
        logger.info('► ' + content.name);
        this.player.loadStream(content.originalUrl || content.url, content);
        document.getElementById('contentTitle').textContent = content.name;
        document.getElementById('contentMeta').textContent = content.group;
        document.getElementById('nowPlaying').style.display = 'block';
    }
    filterContent(term) {
        const filtered = this.parser.filterByName(this.currentContent, term);
        this.renderContent(filtered);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});