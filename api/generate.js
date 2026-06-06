// api/generate.js
// This file sits on YOUR server — clients never see your API key

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, industry, format, budget, tone } = req.body;

  // Basic validation
  if (!input || input.trim().length < 10) {
    return res.status(400).json({ error: 'Input too short' });
  }

  const prompt = `You are a world-class motion design producer. A client gave a vague project request. Extract and structure it into a professional motion design brief.

Client input: "${input}"
Industry: ${industry}
Output format: ${format}
Budget: ${budget}
Desired tone: ${tone}

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
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    res.status(200).json(data);

  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
