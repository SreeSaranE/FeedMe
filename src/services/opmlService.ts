import { XMLParser } from 'fast-xml-parser';
import type { FeedConfig } from '../types';
import { normalizeFeedUrl } from '../utils/url';

export interface ParsedOpmlFeed {
  name: string;
  url: string;
  category: string;
  htmlUrl?: string;
  iconUrl?: string;
}

export interface ParseOpmlResult {
  feeds: ParsedOpmlFeed[];
  categories: string[];
  totalParsed: number;
}

export const DEFAULT_IMPORT_CATEGORY = 'Others';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export class OpmlService {
  /**
   * Generates a standard OPML 2.0 XML string from a list of FeedConfig items,
   * grouped hierarchically by category.
   */
  static generateOpml(feeds: FeedConfig[], options?: { title?: string }): string {
    const title = options?.title || 'FeedMe Subscriptions';
    const dateCreated = new Date().toUTCString();

    // Group feeds by category
    const categoriesMap = new Map<string, FeedConfig[]>();
    for (const feed of feeds) {
      const cat = (feed.category || DEFAULT_IMPORT_CATEGORY).trim();
      const list = categoriesMap.get(cat) || [];
      list.push(feed);
      categoriesMap.set(cat, list);
    }

    const outlinesXml: string[] = [];

    // Sort categories alphabetically, but put 'Others' or 'Default' at the end if desired
    const sortedCategories = Array.from(categoriesMap.keys()).sort((a, b) => {
      if (a === DEFAULT_IMPORT_CATEGORY) return 1;
      if (b === DEFAULT_IMPORT_CATEGORY) return -1;
      return a.localeCompare(b);
    });

    for (const category of sortedCategories) {
      const categoryFeeds = categoriesMap.get(category) || [];
      if (categoryFeeds.length === 0) continue;

      const escapedCategory = escapeXml(category);
      outlinesXml.push(`    <outline text="${escapedCategory}" title="${escapedCategory}">`);

      for (const feed of categoryFeeds) {
        const escapedName = escapeXml(feed.name || 'Untitled Feed');
        const escapedUrl = escapeXml(feed.url);
        const iconAttr = feed.iconUrl ? ` icon="${escapeXml(feed.iconUrl)}"` : '';
        outlinesXml.push(
          `      <outline type="rss" text="${escapedName}" title="${escapedName}" xmlUrl="${escapedUrl}"${iconAttr} />`
        );
      }

      outlinesXml.push('    </outline>');
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<opml version="2.0">',
      '  <head>',
      `    <title>${escapeXml(title)}</title>`,
      `    <dateCreated>${dateCreated}</dateCreated>`,
      '  </head>',
      '  <body>',
      outlinesXml.join('\n'),
      '  </body>',
      '</opml>',
    ].join('\n');
  }

  /**
   * Parses an OPML or XML string into a structured list of feeds and categories.
   * Feeds inside an enclosing outline folder inherit that category.
   * Feeds without a category folder default to 'Others'.
   */
  static parseOpml(xmlContent: string): ParseOpmlResult {
    if (!xmlContent || typeof xmlContent !== 'string') {
      return { feeds: [], categories: [], totalParsed: 0 };
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      parseTagValue: false,
    });

    let parsedDoc: Record<string, unknown>;
    try {
      parsedDoc = parser.parse(xmlContent);
    } catch {
      return { feeds: [], categories: [], totalParsed: 0 };
    }

    if (!parsedDoc || typeof parsedDoc !== 'object') {
      return { feeds: [], categories: [], totalParsed: 0 };
    }

    // Locate the <body> element (case-insensitive search if needed)
    const opmlRoot = (parsedDoc.opml || parsedDoc.OPML || parsedDoc) as Record<string, unknown>;
    const body = (opmlRoot?.body || opmlRoot?.BODY) as Record<string, unknown> | undefined;

    if (!body) {
      return { feeds: [], categories: [], totalParsed: 0 };
    }

    const rootOutlines = toArray(body.outline || (body as Record<string, unknown>)['OUTLINE']);
    const extractedFeeds: ParsedOpmlFeed[] = [];
    const discoveredCategories = new Set<string>();

    // Recursively parse outline elements
    function traverseOutline(node: Record<string, unknown>, parentCategory?: string) {
      if (!node || typeof node !== 'object') return;

      const xmlUrlRaw =
        node['@_xmlUrl'] ??
        node['@_xmlurl'] ??
        node['@_XMLURL'] ??
        node['@_url'] ??
        node['@_URL'];

      const xmlUrl = typeof xmlUrlRaw === 'string' ? xmlUrlRaw.trim() : '';

      // Determine category name if this node represents a folder
      const nodeText =
        (typeof node['@_text'] === 'string' ? node['@_text'] : '') ||
        (typeof node['@_title'] === 'string' ? node['@_title'] : '') ||
        '';

      const explicitCategory = typeof node['@_category'] === 'string' ? node['@_category'].trim() : '';

      // An outline is a feed if it has an xmlUrl attribute
      if (xmlUrl) {
        let finalUrl = '';
        try {
          finalUrl = normalizeFeedUrl(xmlUrl);
        } catch {
          finalUrl = xmlUrl;
        }

        if (finalUrl && finalUrl.startsWith('http')) {
          const category = (parentCategory || explicitCategory || DEFAULT_IMPORT_CATEGORY).trim();
          const feedName = nodeText || new URL(finalUrl).hostname.replace(/^www\./, '');
          const htmlUrlRaw =
            node['@_htmlUrl'] ??
            node['@_htmlurl'] ??
            node['@_HTMLURL'];

          const htmlUrl = typeof htmlUrlRaw === 'string' ? htmlUrlRaw.trim() : undefined;

          const iconUrlRaw =
            node['@_icon'] ??
            node['@_imageHref'] ??
            node['@_imagehref'] ??
            node['@_favicon'];

          const iconUrl = typeof iconUrlRaw === 'string' ? iconUrlRaw.trim() : undefined;

          extractedFeeds.push({
            name: feedName,
            url: finalUrl,
            category: category || DEFAULT_IMPORT_CATEGORY,
            htmlUrl,
            iconUrl,
          });

          discoveredCategories.add(category || DEFAULT_IMPORT_CATEGORY);
        }
      }

      // Check for nested outline children (sub-folders or grouped feeds)
      const children = toArray(node.outline || (node as Record<string, unknown>)['OUTLINE']);
      if (children.length > 0) {
        // If this node had child outlines, its text is the folder/category name
        const folderCategory = (nodeText || parentCategory || DEFAULT_IMPORT_CATEGORY).trim();
        for (const child of children) {
          traverseOutline(child as Record<string, unknown>, folderCategory);
        }
      }
    }

    for (const outline of rootOutlines) {
      traverseOutline(outline as Record<string, unknown>);
    }

    return {
      feeds: extractedFeeds,
      categories: Array.from(discoveredCategories),
      totalParsed: extractedFeeds.length,
    };
  }
}
