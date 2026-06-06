export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { input, industry, format, budget, tone } = req.body;
  if (!input || input.trim().length < 3) return res.status(400).json({ error: 'Please enter a description.' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables.' });

  const prompt = `You are a world-class motion design producer. Turn this client input into a structured motion brief.

Client input: "${input}"
Industry: ${industry || 'General'}
Format: ${format || 'Social Media'}
Budget: ${budget || 'Professional'}
Tone: ${tone || 'clean'}

Reply ONLY with this exact JSON structure, no markdown, no extra text:
{"summary":"2 sentence summary","style_direction":"style and visual direction in 3 sentences","timing":"duration and pacing in 2 sentences","color_mood":"colors and mood in 2 sentences","deliverables":"file formats and specs in 2 sentences","scope_notes":"what is included and excluded, revision rounds in 2 sentences","tags":["tag1","tag2","tag3","tag4","tag5","tag6"]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'AI service error: ' + err });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Handler crashed:', err);
    return res.status(500).json({ error: err.message });
  }
}
