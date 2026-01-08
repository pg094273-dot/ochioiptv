class StorageManager {
    constructor() {
        this.playlists = this.loadPlaylists();
        this.activePlaylistId = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_PLAYLIST);
        this.playbackPositions = this.loadPlaybackPositions();
    }
    loadPlaylists() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYLISTS);
        return data ? JSON.parse(data) : [];
    }
    savePlaylists() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.playlists));
    }
    addPlaylist(playlist) {
        playlist.id = Date.now().toString();
        playlist.addedAt = new Date().toISOString();
        this.playlists.push(playlist);
        this.savePlaylists();
        logger.success('Lista agregada: ' + playlist.name);
        return playlist.id;
    }
    removePlaylist(id) {
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.savePlaylists();
        logger.success('Lista eliminada');
    }
    getPlaylist(id) {
        return this.playlists.find(p => p.id === id);
    }
    setActivePlaylist(id) {
        this.activePlaylistId = id;
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_PLAYLIST, id);
    }
    getActivePlaylist() {
        return this.getPlaylist(this.activePlaylistId);
    }
    loadPlaybackPositions() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYBACK_POSITIONS);
        return data ? JSON.parse(data) : {};
    }
    savePlaybackPositions() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYBACK_POSITIONS, JSON.stringify(this.playbackPositions));
    }
    savePosition(contentId, position, duration) {
        this.playbackPositions[contentId] = {
            position: position,
            duration: duration,
            timestamp: Date.now()
        };
        this.savePlaybackPositions();
    }
    getPosition(contentId) {
        return this.playbackPositions[contentId];
    }
    clearPosition(contentId) {
        delete this.playbackPositions[contentId];
        this.savePlaybackPositions();
    }
}
const storage = new StorageManager();