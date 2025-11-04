import { v } from 'convex/values';
import { action } from './_generated/server';

// Read API key from Convex environment variables
// Users should set this with: npx convex env set OPENAI_API_KEY sk-your-key-here
function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY not found. Please set it with: npx convex env set OPENAI_API_KEY your-key'
    );
  }
  return apiKey;
}

export const suggestImprovements = action({
  args: {
    content: v.string(),
  },
  handler: async (_, { content }) => {
    const apiKey = getApiKey();
    
    // Generate a random seed to ensure varied suggestions each time
    const randomAspects = [
      'pacing and rhythm',
      'character depth and motivation', 
      'sensory details and imagery',
      'dialogue and voice',
      'tension and conflict',
      'world-building and atmosphere',
      'emotional resonance',
      'plot structure and flow',
      'theme and symbolism',
      'opening and closing impact'
    ];
    
    // Randomly select 3 aspects to focus on
    const shuffled = randomAspects.sort(() => Math.random() - 0.5);
    const selectedAspects = shuffled.slice(0, 3).join(', ');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a creative writing assistant. Provide exactly 3 specific, actionable suggestions to improve narrative text. Focus your analysis on these aspects: ${selectedAspects}. Each suggestion should be concrete and different from each other.`,
          },
          {
            role: 'user',
            content: `Analyze this story text and provide exactly 3 distinct improvement suggestions:\n\n${content}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const data = await response.json();
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('OpenAI API response did not contain any choices or message content.');
    }
    const suggestions = data.choices[0].message.content;
    
    // Now generate example edits based on the suggestions
    const exampleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a creative writing assistant. Given the original text and improvement suggestions, provide a revised version that demonstrates how to apply those suggestions.',
          },
          {
            role: 'user',
            content: `Original text:\n${content}\n\nSuggestions:\n${suggestions}\n\nPlease rewrite the text applying these suggestions. Show how the improvements enhance the narrative.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!exampleResponse.ok) {
      const error = await exampleResponse.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const exampleData = await exampleResponse.json();
    const exampleEdits = exampleData.choices[0].message.content;
    
    // Return as structured object with clear sections
    return {
      suggestions,
      exampleEdits
    };
  },
});

export const rewriteContent = action({
  args: {
    content: v.string(),
    tone: v.optional(v.string()),
  },
  handler: async (_, { content, tone }) => {
    const apiKey = getApiKey();
    
    const systemContent = tone 
      ? `You are a creative writing assistant. Rewrite the text in a ${tone} tone while preserving the core meaning and story beats.`
      : 'You are a creative writing assistant. Rewrite the text in an engaging way while preserving the core meaning and story beats.';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: `Rewrite this:\n\n${content}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },
});

export const enhanceContent = action({
  args: {
    content: v.string(),
  },
  handler: async (_, { content }) => {
    const apiKey = getApiKey();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a creative writing assistant. Expand and enhance the given text by adding more detail, depth, and narrative richness while maintaining the original tone and direction.',
          },
          {
            role: 'user',
            content: `Enhance and expand this text by adding more detail and depth:\n\n${content}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },
});

export const generateChoices = action({
  args: {
    content: v.string(),
    numChoices: v.optional(v.number()),
  },
  handler: async (_, { content, numChoices = 3 }) => {
    const apiKey = getApiKey();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a creative writing assistant. Generate compelling story choices that branch from the given narrative.',
          },
          {
            role: 'user',
            content: `Given this story text, suggest ${numChoices} interesting choices/branches the reader could make. Return as a JSON object with a "choices" key containing an array of objects with "label" and "description" fields.\n\n${content}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    
    // Return the choices array from the object
    return parsed.choices || parsed;
  },
});