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
        document.getElementById('m3uFile').onchange = (e) => {
            if (e.target.files[0]) this.loadFromFile(e.target.files[0]);
        };
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
    }
    setupCORSControls() {
        const checkbox = document.getElementById('useCorsProxy');
        const select = document.getElementById('corsProxySelect');
        const testBtn = document.getElementById('testProxyBtn');
        checkbox.checked = corsHandler.useCorsProxy;
        checkbox.onchange = () => corsHandler.setUseProxy(checkbox.checked);
        select.onchange = () => corsHandler.setProxyUrl(select.value);
        testBtn.onclick = async () => {
            testBtn.disabled = true;
            testBtn.textContent = '🔄 Probando...';
            await corsHandler.testProxy();
            testBtn.disabled = false;
            testBtn.textContent = '🧪 Test';
        };
    }
    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value.trim();
        if (!url) { alert('Ingresa una URL'); return; }
        logger.info('═════════════════════════');
        logger.info('CARGANDO PLAYLIST');
        logger.info('═════════════════════════');
        try {
            await this.parser.loadFromUrl(url);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLIST_URL, url);
            this.switchTab(this.currentTab);
        } catch (error) {
            logger.error('Error: ' + error.message);
            alert('Error al cargar playlist. Verifica el proxy CORS.');
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
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Sin contenido</div>';
            return;
        }
        list.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px;margin:5px;background:#2a2a2a;border-radius:5px;cursor:pointer;';
            div.innerHTML = `<strong>${item.name}</strong><br><small style="color:#999;">${item.group}</small>`;
            div.onclick = () => this.playContent(item);
            list.appendChild(div);
        });
    }
    playContent(content) {
        logger.info(`► ${content.name}`);
        this.player.loadStream(content.originalUrl || content.url, content);
        document.getElementById('contentTitle').textContent = content.name;
        document.getElementById('nowPlaying').style.display = 'block';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVApp();
});