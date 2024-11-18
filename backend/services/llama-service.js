const path = require('path');

class LlamaService {
  constructor() {
    this.modelPath = path.join(__dirname, '../models/llama-integration/llama-models/llama-3.2-11b-vision-instruct');
    this.llama = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      const { LLamaCpp } = await import('llama-node/dist/llm/llama-cpp.js');
      this.llama = new LLamaCpp();
      
      await this.llama.load({
        modelPath: this.modelPath,
        contextSize: 2048,
        batchSize: 512
      });
      this.initialized = true;
    }
  }

  async generateResponse(prompt) {
    try {
      await this.initialize();
      
      const response = await this.llama.createCompletion({
        prompt,
        maxTokens: 500,
        temperature: 0.7,
        topP: 0.9,
        stopSequences: ['\n\n']
      });

      return {
        model: 'LLaMA-3.2-11B-Vision-Instruct',
        response: response.text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('LLaMA error:', error);
      return {
        model: 'LLaMA-3.2-11B-Vision-Instruct',
        response: 'Model did not give a response',
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new LlamaService();
