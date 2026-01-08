class TMDBManager {
    constructor() {
        this.apiKey = CONFIG.TMDB_API_KEY;
        this.baseUrl = CONFIG.TMDB_BASE_URL;
        this.imageBase = CONFIG.TMDB_IMAGE_BASE;
        this.cache = {};
    }
    async searchMovie(title) {
        if (this.cache[title]) return this.cache[title];
        try {
            const cleanTitle = this.cleanTitle(title);
            const url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=es&query=${encodeURIComponent(cleanTitle)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const movie = data.results[0];
                this.cache[title] = movie;
                return movie;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    async searchTVShow(title) {
        if (this.cache[title]) return this.cache[title];
        try {
            const cleanTitle = this.cleanTitle(title);
            const url = `${this.baseUrl}/search/tv?api_key=${this.apiKey}&language=es&query=${encodeURIComponent(cleanTitle)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const show = data.results[0];
                this.cache[title] = show;
                return show;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    cleanTitle(title) {
        return title.replace(/\([0-9]{4}\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\b(HD|FHD|4K|1080p|720p)\b/gi, '').trim();
    }
    getPosterUrl(posterPath) {
        if (!posterPath) return null;
        return this.imageBase + posterPath;
    }
}
const tmdb = new TMDBManager();