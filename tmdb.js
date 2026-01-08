class TMDBManager {
    constructor() {
        this.apiKey = CONFIG.TMDB_API_KEY;
        this.baseUrl = CONFIG.TMDB_BASE_URL;
        this.imageBase = CONFIG.TMDB_IMAGE_BASE;
        this.cache = {};
    }

    async searchMovie(title) {
        if (this.cache[title]) {
            return this.cache[title];
        }

        try {
            const cleanTitle = this.cleanTitle(title);
            logger.info(`Buscando en TMDB: ${cleanTitle}`);

            const url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=es&query=${encodeURIComponent(cleanTitle)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const movie = data.results[0];
                logger.success(`Encontrado: ${movie.title}`);
                this.cache[title] = movie;
                return movie;
            }

            logger.warning('No se encontró en TMDB');
            return null;

        } catch (error) {
            logger.error('Error TMDB: ' + error.message);
            return null;
        }
    }

    async searchTVShow(title) {
        if (this.cache[title]) {
            return this.cache[title];
        }

        try {
            const cleanTitle = this.cleanTitle(title);
            logger.info(`Buscando serie en TMDB: ${cleanTitle}`);

            const url = `${this.baseUrl}/search/tv?api_key=${this.apiKey}&language=es&query=${encodeURIComponent(cleanTitle)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const show = data.results[0];
                logger.success(`Serie encontrada: ${show.name}`);
                this.cache[title] = show;
                return show;
            }

            logger.warning('Serie no encontrada en TMDB');
            return null;

        } catch (error) {
            logger.error('Error TMDB: ' + error.message);
            return null;
        }
    }

    cleanTitle(title) {
        // Limpiar el título de caracteres especiales y años
        return title
            .replace(/\([0-9]{4}\)/g, '') // Eliminar año
            .replace(/\[[^\]]*\]/g, '')    // Eliminar [tags]
            .replace(/\b(HD|FHD|4K|1080p|720p)\b/gi, '') // Eliminar calidades
            .trim();
    }

    getPosterUrl(posterPath) {
        if (!posterPath) return null;
        return this.imageBase + posterPath;
    }

    getBackdropUrl(backdropPath) {
        if (!backdropPath) return null;
        return 'https://image.tmdb.org/t/p/w1280' + backdropPath;
    }
}

const tmdb = new TMDBManager();