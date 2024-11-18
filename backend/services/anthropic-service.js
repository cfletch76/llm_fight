const Anthropic = require('@anthropic-ai/sdk');

class AnthropicService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.availableModels = {
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
      'claude-2.1': 'Claude 2.1'
    };
  }

  async getAvailableModels() {
    try {
      // Return the predefined models since Anthropic doesn't have a models list endpoint
      return this.availableModels;
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      return this.availableModels;
    }
  }

  async generateResponse(prompt, modelVersion = 'claude-3-opus-20240229') {
    try {
      const response = await this.client.messages.create({
        model: modelVersion,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });

      return {
        model: this.availableModels[modelVersion],
        response: response.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      return {
        model: this.availableModels[modelVersion],
        response: 'Error generating response: ' + error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new AnthropicService();
