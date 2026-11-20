import type { Article } from '../types';
import { jsonFetch } from './football';

const NEWS_LEAGUES = [
  { code: 'eng.1', name: 'Premier League' },
  { code: 'esp.1', name: 'LaLiga' },
  { code: 'uefa.champions', name: 'Champions League' },
  { code: 'mex.1', name: 'Liga MX' },
  { code: 'conmebol.libertadores', name: 'Libertadores' },
];
const words = /transfer|transfers|rumou?r|signing|signs|signed|recruit|deal|joins?|move to|fichaje|traspaso|mercado de pases|negotiat|bid for|loan move/i;

export function fromESPNArticle(item: any, league: string): Article | null {
  const title = String(item?.headline || '').trim();
  const link = item?.links?.web?.href;
  if (!item?.id || !title || typeof link !== 'string' || !link.startsWith('https://')) return null;
  const description = String(item?.description || '').trim();
  return {
    id: String(item.id), title, description,
    image: item.images?.find?.((img: any) => img?.url)?.url,
    published: item.published || undefined,
    link, source: 'ESPN', league,
    isTransfer: words.test(`${title} ${description}`),
  };
}

export async function getNews(): Promise<{ articles: Article[]; warning?: string }> {
  const requests = await Promise.allSettled(NEWS_LEAGUES.map(async league => {
    const data = await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/news`);
    if (!Array.isArray(data?.articles)) throw new Error('Noticias no disponibles');
    return data.articles.map((a: any) => fromESPNArticle(a, league.name)).filter(Boolean) as Article[];
  }));
  const ok = requests.filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled');
  if (ok.length === 0) throw new Error('No se pudieron obtener las noticias de ESPN.');
  const unique = new Map<string, Article>();
  for (const item of ok.flatMap(r => r.value)) if (!unique.has(item.id)) unique.set(item.id, item);
  const articles = [...unique.values()]
    .sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    .slice(0, 90);
  return {
    articles,
    warning: ok.length < NEWS_LEAGUES.length ? 'Algunas competiciones no entregaron noticias.' : undefined,
  };
}
