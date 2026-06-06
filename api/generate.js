// api/generate.js
// Place this file at: /api/generate.js in your GitHub repo
// Vercel runs this as a serverless function — your API key stays hidden

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read what the frontend sent
  const { input, industry, format, budget, tone } = req.body;

  // Basic validation
  if (!input || input.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a client description.' });
  }

  // Check API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in Vercel environment variables');
    return res.status(500).json({ error: 'Server not configured. Add ANTHROPIC_API_KEY in Vercel.' });
  }

  // Build the prompt here on the server (not exposed to browser)
  const prompt = `You are a world-class motion design producer. A client gave a vague project request. Extract and structure it into a professional motion design brief.

Client input: "${input}"
Industry: ${industry || 'General'}
Output format: ${format || 'Social Media'}
Budget: ${budget || 'Professional'}
Desired tone: ${tone || 'clean'}

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "summary": "2-sentence professional project summary",
  "style_direction": "Detailed motion style: aesthetic language, visual references, specific techniques (3 sentences)",
  "timing": "Duration recommendation, pacing notes, rhythm approach (2 sentences)",
  "color_mood": "Color palette direction, mood, emotional tone (2 sentences)",
  "deliverables": "Specific file formats, dimensions, quantities, naming conventions (2 sentences)",
  "scope_notes": "What is included, what is excluded, revision rounds suggested (2 sentences)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // Send the Anthropic response back to the browser
    res.status(200).json(data);

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Failed to generate brief. Please try again.' });
  }
}
