// Módulo para interactuar con la API de TMDB
class TMDBService {
    constructor() {
        this.apiKey = CONFIG.TMDB_API_KEY;
        this.baseUrl = CONFIG.TMDB_BASE_URL;
        this.imageBaseUrl = CONFIG.TMDB_IMAGE_BASE_URL;
    }

    // Verificar si la API key está configurada
    isConfigured() {
        return this.apiKey && this.apiKey !== 'TU_API_KEY_AQUI';
    }

    // Obtener películas populares
    async getPopularMovies(page = 1) {
        if (!this.isConfigured()) return this.getMockData('movies');

        try {
            const response = await fetch(
                `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=es-ES&page=${page}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error obteniendo películas populares:', error);
            return this.getMockData('movies');
        }
    }

    // Obtener series populares
    async getPopularSeries(page = 1) {
        if (!this.isConfigured()) return this.getMockData('series');

        try {
            const response = await fetch(
                `${this.baseUrl}/tv/popular?api_key=${this.apiKey}&language=es-ES&page=${page}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error obteniendo series populares:', error);
            return this.getMockData('series');
        }
    }

    // Buscar contenido multimedia
    async searchMedia(query) {
        if (!this.isConfigured()) return [];

        try {
            const response = await fetch(
                `${this.baseUrl}/search/multi?api_key=${this.apiKey}&language=es-ES&query=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error buscando contenido:', error);
            return [];
        }
    }

    // Obtener detalles de una película
    async getMovieDetails(movieId) {
        if (!this.isConfigured()) return null;

        try {
            const response = await fetch(
                `${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=es-ES&append_to_response=credits,videos`
            );
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo detalles de película:', error);
            return null;
        }
    }

    // Obtener detalles de una serie
    async getSeriesDetails(seriesId) {
        if (!this.isConfigured()) return null;

        try {
            const response = await fetch(
                `${this.baseUrl}/tv/${seriesId}?api_key=${this.apiKey}&language=es-ES&append_to_response=credits,videos`
            );
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo detalles de serie:', error);
            return null;
        }
    }

    // Obtener URL de imagen
    getImageUrl(path, size = 'w500') {
        if (!path) return 'https://via.placeholder.com/500x750?text=Sin+Imagen';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    // Datos de ejemplo cuando no hay API key configurada
    getMockData(type) {
        const mockMovies = [
            { id: 1, title: 'Película de Ejemplo 1', poster_path: null, vote_average: 7.5, release_date: '2024' },
            { id: 2, title: 'Película de Ejemplo 2', poster_path: null, vote_average: 8.0, release_date: '2024' },
            { id: 3, title: 'Película de Ejemplo 3', poster_path: null, vote_average: 6.8, release_date: '2024' }
        ];

        const mockSeries = [
            { id: 1, name: 'Serie de Ejemplo 1', poster_path: null, vote_average: 8.2, first_air_date: '2024' },
            { id: 2, name: 'Serie de Ejemplo 2', poster_path: null, vote_average: 7.9, first_air_date: '2024' },
            { id: 3, name: 'Serie de Ejemplo 3', poster_path: null, vote_average: 8.5, first_air_date: '2024' }
        ];

        return type === 'movies' ? mockMovies : mockSeries;
    }
}

// Crear instancia global
const tmdbService = new TMDBService();