const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });
  }

  async getAvailableModels() {
    try {
      const response = await this.client.models.list();
      // Filter for GPT models and create a mapped object
      const gptModels = response.data
        .filter(model => 
          model.id.startsWith('gpt-4') || 
          model.id.startsWith('gpt-3.5')
        )
        .reduce((acc, model) => {
          // Create friendly names for the models
          let displayName = model.id;
          if (model.id === 'gpt-4-1106-preview') displayName = 'GPT-4 Turbo';
          else if (model.id.startsWith('gpt-4')) displayName = 'GPT-4';
          else if (model.id.startsWith('gpt-3.5')) displayName = 'GPT-3.5 Turbo';
          
          acc[model.id] = displayName;
          return acc;
        }, {});

      return gptModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      // Return default models if API fetch fails
      return {
        'gpt-4-1106-preview': 'GPT-4 Turbo',
        'gpt-4': 'GPT-4',
        'gpt-3.5-turbo': 'GPT-3.5 Turbo'
      };
    }
  }

  async generateResponse(prompt, modelVersion = 'gpt-4-1106-preview') {
    try {
      const response = await this.client.chat.completions.create({
        model: modelVersion,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        model: modelVersion,
        response: response.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      return {
        model: modelVersion,
        response: 'Error generating response: ' + error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OpenAIService();
