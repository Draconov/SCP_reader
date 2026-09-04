function decodeNumericEntity(_match, token) {
  const hexadecimal = token[0]?.toLowerCase() === 'x';
  const codePoint = Number.parseInt(hexadecimal ? token.slice(1) : token, hexadecimal ? 16 : 10);
  if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return '\uFFFD';
  return String.fromCodePoint(codePoint);
}

function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&ndash;', '–')
    .replaceAll('&mdash;', '—')
    .replaceAll('&hellip;', '…')
    .replaceAll('&times;', '×')
    .replaceAll('&middot;', '·')
    .replaceAll('&amp;', '&')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, decodeNumericEntity);
}

function stripTags(value) {
  return decodeEntities(value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractElementById(html, id) {
  const startRe = new RegExp(`<([a-z0-9]+)([^>]*\\sid=["']${id}["'][^>]*)>`, 'i');
  const match = startRe.exec(html);
  if (!match) return '';
  const tag = match[1].toLowerCase();
  const start = match.index;
  const openEnd = match.index + match[0].length;
  const tokenRe = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  tokenRe.lastIndex = openEnd;
  let depth = 1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<\//.test(token[0])) depth -= 1; else depth += 1;
    if (depth === 0) return html.slice(start, tokenRe.lastIndex);
  }
  return html.slice(start);
}

function sanitizeContent(content, sourceUrl) {
  const origin = new URL(sourceUrl).origin;
  let html = content
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '<div class="specialized-omitted">[ SPECIALIZED EMBED OMITTED — VIEW SOURCE RECORD ]</div>')
    .replace(/<object\b[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[\s\S]*?<\/form>/gi, '')
    .replace(/<(audio|video)\b[\s\S]*?<\/\1>/gi, '<div class="media-omitted">[ MEDIA OMITTED FROM LOCAL ARCHIVE — VIEW SOURCE RECORD ]</div>')
    .replace(/<source\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '<div class="media-omitted">[ MEDIA OMITTED FROM LOCAL ARCHIVE — VIEW SOURCE RECORD ]</div>')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');

  html = html.replace(/href=("|')([^"']+)\1/gi, (_full, quote, href) => {
    if (href.startsWith('#')) return `href=${quote}${href}${quote}`;
    try {
      const absolute = new URL(href, origin).toString();
      return `href=${quote}${absolute}${quote} target=${quote}_blank${quote} rel=${quote}noopener noreferrer${quote}`;
    } catch {
      return `href=${quote}#${quote}`;
    }
  });
  return html;
}

function buildSummary(sanitized, slug) {
  let text = stripTags(sanitized)
    .replace(/\[\s*(?:MEDIA OMITTED FROM LOCAL ARCHIVE|SPECIALIZED EMBED OMITTED)[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^scp-\d/i.test(slug)) {
    const itemMarker = /\bItem\s*#\s*:\s*SCP-[A-Z0-9-]+\b/i.exec(text);
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleMarker = new RegExp(`\\b${escapedSlug}\\s*:`, 'i').exec(text);
    const marker = itemMarker ?? titleMarker;
    if (marker) text = text.slice(marker.index);
  }

  text = text
    .replace(/^rating:\s*[+\-]?\d+(?:\s*[+\-–—×x]\s*)*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, 320);
}

function extractTags(html) {
  const block = extractElementById(html, 'page-tags');
  if (!block) return [];
  return [...block.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => stripTags(match[1]).toLowerCase())
    .filter(Boolean);
}

function classify(slug, tags) {
  if (/^scp-\d/.test(slug)) return 'scp';
  if (slug.includes('joke') || tags.includes('joke')) return 'joke';
  if (tags.includes('tale')) return 'tale';
  if (tags.includes('goi-format')) return 'goi';
  if (tags.includes('canon')) return 'canon';
  if (tags.includes('essay')) return 'essay';
  if (slug.includes('guide')) return 'guide';
  if (slug.includes('hub')) return 'hub';
  return 'other';
}

function deriveClearance(tags, objectClass, slug) {
  if (slug.startsWith('scp-001')) return 3;
  if (tags.includes('keter') || String(objectClass).toLowerCase() === 'keter') return 2;
  return 1;
}

function extractCitation(html) {
  const text = stripTags(html);
  const citeMatch = /Cite this page as:\s*([\s\S]{0,600}?)(?:For information|Filename:|page revision:)/i.exec(text);
  const citation = citeMatch ? citeMatch[1].trim() : undefined;
  const authors = [];
  if (citation) {
    const byMatch = /\bby\s+(.+?)(?:,\s*from\s+the\s+SCP|\.\s*Source:|$)/i.exec(citation);
    if (byMatch) authors.push(byMatch[1].trim());
  }
  return { citation, authors: authors.length ? authors : ['See source page licensing/citation block'] };
}

function extractLinks(content) {
  const links = new Set();
  for (const match of content.matchAll(/href=(?:"|')([^"']+)(?:"|')/gi)) {
    try {
      const url = new URL(match[1], 'https://scp-wiki.wikidot.com');
      if (url.hostname === 'scp-wiki.wikidot.com') {
        const slug = url.pathname.replace(/^\//, '').replace(/\/$/, '');
        if (slug && !slug.startsWith('system:') && !slug.startsWith('forum:') && !slug.includes(':')) links.add(slug);
      }
    } catch { /* ignore malformed links */ }
  }
  return [...links];
}

export function normalizeWikiPage({ slug, url, html, fetchedAt }) {
  const content = extractElementById(html, 'page-content');
  if (!content) throw new Error(`Unable to locate #page-content for ${slug}`);
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? stripTags(titleMatch[1]).replace(/\s+-\s+SCP Foundation.*$/i, '').trim() : slug.toUpperCase();
  const tags = extractTags(html);
  const sanitized = sanitizeContent(content, url);
  const plain = stripTags(sanitized);
  const classHtmlMatch = /Object Class:\s*<\/(?:strong|b)>\s*([^<]{1,80})/i.exec(sanitized);
  const classPlainMatch = /Object Class:\s*(.{1,80}?)(?=\s+(?:Special Containment Procedures|Containment Procedures|Description|Item\s*#)|$)/i.exec(plain);
  const objectClass = (classHtmlMatch?.[1] ? stripTags(classHtmlMatch[1]) : classPlainMatch?.[1])?.replace(/\s+/g, ' ').trim();
  const revisionMatch = /page revision:\s*(\d+)/i.exec(stripTags(html));
  const revision = revisionMatch ? Number(revisionMatch[1]) : undefined;
  const { citation, authors } = extractCitation(html);
  const specialized = /<iframe\b|class=["'][^"']*(?:anom|terminal|interactive|component)[^"']*["']/i.test(content);
  return {
    id: `en:${slug}`,
    branch: 'en',
    slug,
    title,
    type: classify(slug, tags),
    summary: buildSummary(sanitized, slug),
    tags,
    clearance: deriveClearance(tags, objectClass, slug),
    renderer: specialized ? 'specialized' : 'foundation-document',
    objectClass,
    html: sanitized,
    links: extractLinks(content),
    synchronized: true,
    attribution: {
      sourceUrl: url,
      sourceSite: 'SCP Foundation Wiki',
      authors,
      citation,
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      revision,
      fetchedAt
    }
  };
}
