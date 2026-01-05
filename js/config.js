// Configuración global de la aplicación
const CONFIG = {
    // API Key de TMDB (The Movie Database)
    // Obtén tu propia API key gratis en: https://www.themoviedb.org/settings/api
    TMDB_API_KEY: 'TU_API_KEY_AQUI', // Reemplaza con tu API key
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',

    // Configuración del reproductor
    PLAYER: {
        autoplay: true,
        controls: true,
        preload: 'metadata',
        playsinline: true
    },

    // Configuración de almacenamiento local
    STORAGE_KEYS: {
        PLAYLIST_URL: 'iptv_playlist_url',
        FAVORITES: 'iptv_favorites',
        LAST_CHANNEL: 'iptv_last_channel',
        VOLUME: 'iptv_volume'
    },

    // Playlists de ejemplo (canales legales y gratuitos)
    EXAMPLE_PLAYLISTS: [
        'https://iptv-org.github.io/iptv/countries/es.m3u',
        'https://iptv-org.github.io/iptv/categories/news.m3u',
        'https://iptv-org.github.io/iptv/categories/music.m3u'
    ]
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}