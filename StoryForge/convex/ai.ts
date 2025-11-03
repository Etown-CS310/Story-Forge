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
            content: 'You are a creative writing assistant. Provide concise suggestions to improve narrative text, focusing on clarity, engagement, and storytelling.',
          },
          {
            role: 'user',
            content: `Suggest improvements for this story text:\n\n${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
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

export const rewriteContent = action({
  args: {
    content: v.string(),
    tone: v.optional(v.string()),
  },
  handler: async (_, { content, tone = 'engaging' }) => {
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
            content: `You are a creative writing assistant. Rewrite the text in a ${tone} tone while preserving the core meaning and story beats.`,
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
            content: `Given this story text, suggest ${numChoices} interesting choices/branches the reader could make. Return as a JSON array of objects with "label" and "description" fields.\n\n${content}`,
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
    return JSON.parse(data.choices[0].message.content);
  },
});