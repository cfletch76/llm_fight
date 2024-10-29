const path = require('path');
const { LLama } = require('llama-node');

class LlamaService {
  constructor() {
    this.modelPath = path.join(__dirname, '../models/llama-integration/llama-models/llama-3.2-11b-vision-instruct');
    this.llama = new LLama();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.llama.load({
        modelPath: this.modelPath,
        contextSize: 2048,
        batchSize: 512
      });
      this.initialized = true;
    }
  }

  async generateResponse(prompt) {
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
  }
}

module.exports = new LlamaService();
