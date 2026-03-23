const axios = require('axios');
const logger = require('../utils/logger');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llava';
    this.isAvailable = false;
    
    // Проверяем доступность Ollama
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 5000 });
      this.isAvailable = response.status === 200;
      if (this.isAvailable) {
        logger.info('Ollama service is available');
        // Проверяем наличие модели
        const models = response.data.models || [];
        const hasModel = models.some(m => m.name === this.model);
        if (!hasModel) {
          logger.warn(`Model ${this.model} not found, will pull on first use`);
        }
      }
    } catch (error) {
      this.isAvailable = false;
      logger.warn('Ollama service not available:', error.message);
    }
  }

  async analyzeImage(imageBuffer, fileName) {
    if (!this.isAvailable) {
      logger.warn('Ollama not available, skipping AI analysis');
      return null;
    }

    try {
      // Конвертируем изображение в base64
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `Analyze this image and provide a detailed description. 
Please include:
1. Main objects and subjects in the image
2. Scene type (indoor/outdoor/nature/urban/portrait/etc)
3. Colors and lighting
4. Any notable details or features
5. Possible location clues (if any)

Format your response as JSON with the following structure:
{
  "description": "A detailed description of the image",
  "objects": ["list", "of", "detected", "objects"],
  "scene": "scene type",
  "colors": ["main", "colors"],
  "details": ["notable", "details"],
  "locationClues": ["possible", "location", "clues"]
}`;

      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }, { timeout: 60000 }); // 60 секунд таймаут

      let analysis;
      try {
        // Пытаемся парсить JSON
        analysis = JSON.parse(response.data.response);
      } catch (e) {
        // Если не JSON, используем текст
        analysis = {
          description: response.data.response,
          objects: [],
          scene: 'unknown',
          colors: [],
          details: [],
          locationClues: []
        };
      }
      
      return {
        ...analysis,
        analyzedAt: new Date(),
        model: this.model,
        confidence: 0.85
      };
    } catch (error) {
      logger.error('Ollama analysis error:', error.message);
      return null;
    }
  }

  async generateLocationDescription(lat, lng) {
    if (!this.isAvailable) return null;
    
    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: `Describe the typical characteristics, climate, culture, and notable features of a location at coordinates ${lat}, ${lng}.`,
        stream: false
      }, { timeout: 30000 });
      
      return response.data.response;
    } catch (error) {
      logger.error('Ollama location description error:', error.message);
      return null;
    }
  }

  async pullModel() {
    try {
      logger.info(`Pulling model ${this.model}...`);
      const response = await axios.post(`${this.baseURL}/api/pull`, {
        name: this.model,
        stream: false
      }, { timeout: 300000 }); // 5 минут на скачивание
      
      if (response.status === 200) {
        logger.info(`Model ${this.model} pulled successfully`);
        this.isAvailable = true;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to pull model:', error.message);
      return false;
    }
  }
}

module.exports = new OllamaService();