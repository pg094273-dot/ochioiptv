class Logger {
    constructor() { this.logElement = null; this.logs = []; }
    init() { this.logElement = document.getElementById('debugLog'); }
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