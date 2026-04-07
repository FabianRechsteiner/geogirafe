import DOMPurify from 'dompurify';

export type FeedEntry = {
  id: string;
  title: string;
  date: Date | null;
  description: string;
  content: string;
  link: string;
  author: string;
};

type FeedType = 'rss' | 'atom' | 'unknown';

export async function loadFeeds(urls: string[]) {
  const entries = [];

  for (const url of urls) {
    const res = await fetch(url);
    const xmlText = await res.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    const feedType = detectFeedType(xml);

    if (feedType === 'rss') {
      entries.push(...parseRssFeed(xml));
    } else if (feedType === 'atom') {
      entries.push(...parseAtomFeed(xml));
    } else {
      console.warn(`Invalid feed URL or unknown feed format: ${url}`);
    }
  }

  entries.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  return entries;
}

function detectFeedType(xml: Document): FeedType {
  const root = xml.documentElement;
  const tagName = root.tagName.toLowerCase();

  if (tagName.includes('rss')) {
    return 'rss';
  }

  if (tagName.includes('feed')) {
    return 'atom';
  }

  if (tagName.includes('rdf')) {
    return 'rss'; // RSS 1.0
  }

  return 'unknown';
}

function parseRssFeed(xml: Document): FeedEntry[] {
  return Array.from(xml.querySelectorAll('item')).map((entry, index) => {
    const title = entry.querySelector('title')?.textContent?.trim() || '';

    const pubDateText = entry.querySelector('pubDate')?.textContent?.trim() || '';
    const date = pubDateText ? new Date(pubDateText) : null;

    const description = getSanitizedHtml(entry.querySelector('description'));

    const contentNode = entry.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0];
    const content = getSanitizedHtml(contentNode);

    const link = entry.querySelector('link')?.textContent?.trim() || '';

    const author =
      entry.querySelector('author')?.textContent?.trim() ||
      entry.getElementsByTagName('dc:creator')[0]?.textContent?.trim() ||
      '';

    const guid = entry.querySelector('guid')?.textContent?.trim() || '';
    const id = guid || link || `rss-${index}`;

    return {
      id,
      title,
      date,
      description,
      content,
      link,
      author
    };
  });
}

function parseAtomFeed(xml: Document): FeedEntry[] {
  return Array.from(xml.querySelectorAll('entry')).map((entry, index) => {
    const title = entry.querySelector('title')?.textContent?.trim() || '';
    const id = entry.querySelector('id')?.textContent?.trim() || `atom-${index}`;

    const updated = entry.querySelector('updated')?.textContent?.trim() || '';
    const published = entry.querySelector('published')?.textContent?.trim() || '';
    const date = updated || published ? new Date(updated || published) : null;

    const summary = getSanitizedHtml(entry.querySelector('summary'));
    const content = getSanitizedHtml(entry.querySelector('content'));
    const description = summary || content;

    const author =
      entry.querySelector('author > name')?.textContent?.trim() ||
      entry.querySelector('author')?.textContent?.trim() ||
      '';

    const link =
      entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
      entry.querySelector('link')?.getAttribute('href') ||
      '';

    return {
      id,
      title,
      date,
      description,
      content,
      link,
      author
    };
  });
}

function sanitizeHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
  });
}

function getSanitizedHtml(node: Element | null | undefined): string {
  const raw = node?.textContent?.trim() || '';
  return raw ? sanitizeHtml(raw) : '';
}
