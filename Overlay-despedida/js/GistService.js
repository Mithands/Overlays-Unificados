/**
 * GistService - Maneja la comunicación con GitHub Gist
 */
class GistService {
    constructor(config) {
        this.config = config;
        this.apiBase = 'https://api.github.com';
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.config.GIST_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    async loadFile(fileName) {
        try {
            const response = await fetch(`${this.apiBase}/gists/${this.config.GIST_ID}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error(`GitHub Error: ${response.status}`);

            const gist = await response.json();
            const file = gist.files[fileName];

            if (!file) return null;
            return JSON.parse(file.content);
        } catch (error) {
            console.error('Error al cargar Gist:', error);
            return null;
        }
    }

    async saveFile(fileName, data) {
        try {
            const response = await fetch(`${this.apiBase}/gists/${this.config.GIST_ID}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    files: {
                        [fileName]: {
                            content: JSON.stringify(data, null, 2)
                        }
                    }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error al guardar Gist:', error);
            return false;
        }
    }
}
