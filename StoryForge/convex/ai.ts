import { v } from 'convex/values';
import { action } from './_generated/server';

// Read API key from Convex environment variables
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
    selectedAspects: v.optional(v.string()),
  },
  handler: async (_, { content, selectedAspects }) => {
    const apiKey = getApiKey();

    // Define possible aspects
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
      'opening and closing impact',
    ];

    // Randomly choose 3 aspects if not provided
    const aspects = selectedAspects
      ? selectedAspects
      : randomAspects.sort(() => Math.random() - 0.5).slice(0, 3).join(', ');

    const systemPrompt = `You are a creative writing assistant. Provide exactly 3 specific, actionable suggestions to improve narrative text. Focus your analysis on these aspects: ${aspects}. Each suggestion should be concrete and distinct.`;
    const userPrompt = `Analyze this story text and provide exactly 3 distinct improvement suggestions:\n\n${content}`;

    // Send content and selected aspects to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    const suggestionsText = data.choices?.[0]?.message?.content ?? '';

    // Generate example rewritten text with structured JSON output
    const examplePrompt = `Using the same aspects (${aspects}), rewrite a short example of the input text (2–3 sentences) that demonstrates improvement. Also suggest a compelling scene title.

Return your response as a JSON object with this exact structure:
{
  "sceneTitle": "Your suggested scene title",
  "revisedText": "Your revised text (2-3 sentences)",
  "analysis": "Brief explanation of the improvements made"
}`;
    const exampleUserPrompt = `Original text:\n\n${content}`;

    const exampleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: examplePrompt },
          { role: 'user', content: exampleUserPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!exampleResponse.ok) {
      const errorText = await exampleResponse.text();
      throw new Error(`OpenAI API (example) request failed: ${exampleResponse.status} ${exampleResponse.statusText} - ${errorText}`);
    }
    const exampleData = await exampleResponse.json();
    const exampleContent = exampleData.choices?.[0]?.message?.content ?? '{}';
    
    let parsedExample;
    try {
      parsedExample = JSON.parse(exampleContent);
    } catch (err) {
      console.error('Failed to parse example JSON:', err);
      parsedExample = {
        sceneTitle: '',
        revisedText: exampleContent,
        analysis: ''
      };
    }

    return {
      aspects,
      suggestions: suggestionsText,
      exampleEdits: {
        sceneTitle: parsedExample.sceneTitle || '',
        revisedText: parsedExample.revisedText || '',
        analysis: parsedExample.analysis || '',
      },
    };
  },
});

export const rewriteContent = action({
  args: {
    content: v.string(),
    tone: v.optional(v.string()),
    feedback: v.optional(v.string()),
  },
  handler: async (_, { content, tone, feedback }) => {
    const apiKey = getApiKey();

    // Build system prompt based on what's provided
    let systemContent: string;
    
    if (feedback) {
      // Feedback takes priority - it's more specific
      systemContent = `You are a creative writing assistant. Revise the text by addressing this specific feedback: "${feedback}". Maintain the core story while incorporating the requested changes.`;
    } else if (tone) {
      systemContent = `You are a creative writing assistant. Rewrite the text in a ${tone} tone while preserving the core meaning and story beats.`;
    } else {
      systemContent = 'You are a creative writing assistant. Rewrite the text in an engaging way while preserving the core meaning and story beats.';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: `Rewrite this:\n\n${content}` },
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
    if (
      !data ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      typeof data.choices[0].message.content !== 'string'
    ) {
      throw new Error('Unexpected response structure from OpenAI API');
    }
    return data.choices[0].message.content;
  },
});

export const enhanceContent = action({
  args: {
    content: v.string(),
    targetLength: v.optional(v.string()),
  },
  handler: async (_, { content, targetLength }) => {
    const apiKey = getApiKey();

    // Parse the target length (e.g., "2-3", "1-2", "3-5 paragraphs")
    // Check if "paragraph" is already in the input to avoid duplication
    const lengthInstruction = targetLength 
      ? (/\bparagraphs?\b/i.test(targetLength)
          ? `Expand to approximately ${targetLength}`
          : (() => {
              // Check if targetLength is a single number (e.g., "1")
              const numMatch = targetLength.match(/^\s*(\d+)\s*$/);
              if (numMatch) {
                const num = parseInt(numMatch[1], 10);
                const paraWord = num === 1 ? 'paragraph' : 'paragraphs';
                return `Expand to approximately ${targetLength} ${paraWord}`;
              }
              // Check if targetLength is a range (e.g., "1-2")
              const rangeMatch = targetLength.match(/^\s*\d+\s*-\s*\d+\s*$/);
              if (rangeMatch) {
                return `Expand to approximately ${targetLength} paragraphs`;
              }
              // Default to plural
              return `Expand to approximately ${targetLength} paragraphs`;
            })())
      : 'Expand by approximately 50-100%';

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
            content:
              `You are a creative writing assistant. ${lengthInstruction}. Expand and enhance the given text by adding more detail, depth, and narrative richness while maintaining the original tone and direction.`,
          },
          {
            role: 'user',
            content: `Enhance and expand this text:\n\n${content}`,
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
    
    if (
      !data ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      typeof data.choices[0].message.content !== 'string'
    ) {
      throw new Error('Unexpected response structure from OpenAI API');
    }
    
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
            content:
              'You are a creative writing assistant. Generate compelling story choices that branch from the given narrative.',
          },
          {
            role: 'user',
            content: `Given this story text, suggest ${numChoices} interesting choices/branches the reader could make. Return as a JSON object with a "choices" key containing an array of objects, where each object has "label" (the choice text shown to the reader), "title" (a scene title for where this choice leads), and "description" (the opening content for that scene).\n\nExample format: {"choices": [{"label": "Enter the dark forest", "title": "Into the Shadows", "description": "The trees loom overhead as you step into darkness..."}]}\n\n${content}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API request failed: ${error}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    if (!parsed.choices || !Array.isArray(parsed.choices)) {
      throw new Error('Invalid response format: expected object with "choices" array');
    }

    return parsed;
  },
});