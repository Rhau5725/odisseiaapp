const MONTHS = 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(' ');

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDate(text) {
  const numeric = text.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/);
  if (numeric) return numeric[0];
  const month = new RegExp(`\\b\\d{1,2}\\s+de\\s+(?:${MONTHS.join('|')})\\b`, 'i').exec(text);
  return month ? month[0] : '';
}

function normalizeUrl(raw) {
  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw, 'https://duckduckgo.com');
    return parsed.searchParams.get('uddg') || parsed.href;
  } catch {
    return raw;
  }
}

module.exports = async function handler(req, res) {
  const location = String(req.query?.location || '').trim().slice(0, 120);
  if (!location) return res.status(400).json({ error: 'Informe uma cidade ou região.' });

  const query = `encontro de motociclistas ${location} evento encontro passeio`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 Odisseia Event Search',
        'accept-language': 'pt-BR,pt;q=0.9'
      }
    });
    if (!response.ok) throw new Error(`Busca externa retornou ${response.status}`);
    const html = await response.text();
    const anchors = [...html.matchAll(/<a\b[^>]*class="[^"]*result__a[^"]*"[^>]*>[\s\S]*?<\/a>/gi)];
    const events = [];
    const seen = new Set();

    for (const match of anchors) {
      const anchor = match[0];
      const hrefMatch = anchor.match(/href="([^"]+)"/i);
      if (!hrefMatch) continue;
      const sourceUrl = normalizeUrl(hrefMatch[1]);
      if (!/^https?:\/\//i.test(sourceUrl) || /duckduckgo\.com/i.test(sourceUrl)) continue;
      if (seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);
      const title = clean(anchor);
      const after = html.slice(match.index + match[0].length, match.index + match[0].length + 1400);
      const snippetMatch = after.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\//i);
      const description = clean(snippetMatch ? snippetMatch[1] : '');
      const combined = `${title} ${description}`;
      events.push({
        id: `web-${events.length}-${Buffer.from(sourceUrl).toString('base64url').slice(0, 18)}`,
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
