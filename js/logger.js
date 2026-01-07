class Logger {
    constructor() { this.logElement = null; this.logs = []; }
    init() { this.logElement = document.getElementById('debugLog'); }
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        this.logs.push({ message: logEntry, type });
        if (this.logElement) {
            const div = document.createElement('div');
            div.className = `debug-log-item ${type}`;
            div.textContent = logEntry;
            this.logElement.appendChild(div);
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }
    success(msg) { this.log('✅ ' + msg, 'success'); }
    error(msg) { this.log('❌ ' + msg, 'error'); }
    warning(msg) { this.log('⚠️ ' + msg, 'warning'); }
    info(msg) { this.log('ℹ️ ' + msg, 'info'); }
    clear() { this.logs = []; if (this.logElement) this.logElement.innerHTML = ''; }
}
const logger = new Logger();