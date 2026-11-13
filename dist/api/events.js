const MONTHS = 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(' ');

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDate(text) {
  const numeric = text.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/);
  if (numeric) return numeric[0];
  const month = new RegExp(`\\b\\d{1,2}\\s+de\\s+(?:${MONTHS.join('|')})\\b`, 'i').exec(text);
  return month ? month[0] : '';
}

function decodeBingUrl(raw) {
  const value = String(raw || '').replace(/&amp;/gi, '&');
  try {
    const parsed = new URL(value);
    const encoded = parsed.searchParams.get('u');
    if (encoded && encoded.startsWith('a1')) {
      return Buffer.from(encoded.slice(2), 'base64').toString('utf8');
    }
    return parsed.href;
  } catch {
    return value;
  }
}

module.exports = async function handler(req, res) {
  const location = String(req.query?.location || '').trim().slice(0, 120);
  if (!location) return res.status(400).json({ error: 'Informe uma cidade ou região.' });

  const query = `encontro de motos ${location} motociclistas evento passeio`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=pt-BR&cc=br`;

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 Odisseia Event Search',
        'accept-language': 'pt-BR,pt;q=0.9'
      }
    });
    if (!response.ok) throw new Error(`Busca externa retornou ${response.status}`);
    const html = await response.text();
    const results = [...html.matchAll(/<li class="b_algo"[^>]*>[\s\S]*?<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?(?:<p>([\s\S]*?)<\/p>)?[\s\S]*?<\/li>/gi)];
    const events = [];
    const seen = new Set();

    for (const match of results) {
      const sourceUrl = decodeBingUrl(match[1]);
      if (!/^https?:\/\//i.test(sourceUrl)) continue;
      if (seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);
      const title = clean(match[2]);
      const description = clean(match[3] || '');
      const combined = `${title} ${description}`;
      if (!/(moto|motocicl|motorcycle|rider|passeio)/i.test(combined)) continue;
      events.push({
        id: `web-${events.length}`,
        name: title || 'Encontro de motociclistas',
        city: location,
        state: '',
        date: extractDate(combined),
        description: description || 'Veja os detalhes do evento na fonte original.',
        officialUrl: sourceUrl,
        source: 'Busca web'
      });
      if (events.length >= 10) break;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ location, events });
  } catch (error) {
    return res.status(502).json({ error: 'Não foi possível consultar eventos agora. Tente novamente em instantes.' });
  }
};
