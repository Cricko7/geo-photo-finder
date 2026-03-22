const axios = require('axios');
const logger = require('../utils/logger');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://ollama:11434';
    this.model = process.env.OLLAMA_MODEL || 'llava';
  }

  async analyzeImage(imageBuffer) {
    try {
      // Конвертируем изображение в base64
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `Analyze this image and provide:
1. A detailed description of what you see
2. List of main objects detected
3. Scene type (indoor/outdoor/nature/urban/etc.)
4. Any notable landmarks or features
5. Possible location clues (if any)

Format as JSON with keys: description, objects, scene, locationClues`;

      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        format: 'json'
      });

      const analysis = JSON.parse(response.data.response);
      
      return {
        description: analysis.description,
        objects: analysis.objects,
        scene: analysis.scene,
        locationClues: analysis.locationClues,
        confidence: 0.85, // Можно настроить логику оценки confidence
        analyzedAt: new Date()
      };
    } catch (error) {
      logger.error('Ollama analysis error:', error);
      throw new Error('Failed to analyze image with AI');
    }
  }

  async generateLocationDescription(lat, lng) {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: `Describe the typical characteristics, climate, culture, and notable features of a location at coordinates ${lat}, ${lng}.`,
        stream: false
      });
      
      return response.data.response;
    } catch (error) {
      logger.error('Ollama location description error:', error);
      return null;
    }
  }
}

module.exports = new OllamaService();