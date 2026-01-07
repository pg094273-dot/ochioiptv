class TMDBService {
    constructor() {
        this.apiKey = CONFIG.TMDB_API_KEY;
        this.baseUrl = CONFIG.TMDB_BASE_URL;
    }

    isConfigured() {
        return this.apiKey && this.apiKey !== 'TU_API_KEY_AQUI';
    }

    async getPopularMovies() {
        if (!this.isConfigured()) return this.getMockData('movies');
        try {
            const res = await fetch(`${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=es-ES`);
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            return this.getMockData('movies');
        }
    }

    async getPopularSeries() {
        if (!this.isConfigured()) return this.getMockData('series');
        try {
            const res = await fetch(`${this.baseUrl}/tv/popular?api_key=${this.apiKey}&language=es-ES`);
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            return this.getMockData('series');
        }
    }

    getImageUrl(path) {
        if (!path) return 'https://via.placeholder.com/500x750?text=Sin+Imagen';
        return `https://image.tmdb.org/t/p/w500${path}`;
    }

    getMockData(type) {
        const movies = [
            { id: 1, title: 'Ejemplo 1', poster_path: null, vote_average: 7.5, release_date: '2024' },
            { id: 2, title: 'Ejemplo 2', poster_path: null, vote_average: 8.0, release_date: '2024' }
        ];
        const series = [
            { id: 1, name: 'Ejemplo 1', poster_path: null, vote_average: 8.2, first_air_date: '2024' }
        ];
        return type === 'movies' ? movies : series;
    }
}

const tmdbService = new TMDBService();