import type { Context } from 'hono';

import { config } from '@/config';
import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const COMIC_ORIGIN = 'https://comic.naver.com';

function naverHeaders() {
    return {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.5',
        Referer: `${COMIC_ORIGIN}/`,
        'User-Agent': config.trueUA,
    };
}

interface ArticleListInfo {
    titleName?: string;
    thumbnailUrl?: string;
    sharedThumbnailUrl?: string;
    communityArtists?: Array<{ name: string }>;
    curationTagList?: Array<{ tagName: string; curationType: string }>;
    gfpAdCustomParam?: {
        displayAuthor?: string;
        genreTypes?: string[];
    };
}

interface ArticleEntry {
    no: number;
    thumbnailUrl?: string;
    subtitle?: string;
    charge?: boolean;
    serviceDateDescription?: string;
}

interface ArticleListResponse {
    articleList?: ArticleEntry[];
    chargeFolderArticleList?: ArticleEntry[];
}

function genreLabels(info: ArticleListInfo): string[] {
    const fromCuration = info.curationTagList?.filter((t) => t.curationType.startsWith('GENRE')).map((t) => t.tagName) ?? [];
    if (fromCuration.length > 0) {
        return fromCuration;
    }
    return info.gfpAdCustomParam?.genreTypes ?? [];
}

function seriesAuthor(info: ArticleListInfo): string {
    const display = info.gfpAdCustomParam?.displayAuthor?.trim();
    if (display) {
        return display;
    }
    const artists = info.communityArtists?.map((a) => a.name.trim()).filter(Boolean);
    return artists?.length ? artists.join(' / ') : '';
}

function episodePubDate(serviceDateDescription?: string): Date | undefined {
    const desc = serviceDateDescription?.trim();
    if (!desc || !/^\d{2}\.\d{2}\.\d{2}$/.test(desc)) {
        return undefined;
    }
    return parseDate(desc, 'YY.MM.DD');
}

export const route: Route = {
    path: '/webtoon/series/:titleId',
    categories: ['reading'],
    example: '/naver/webtoon/series/758037',
    parameters: { titleId: 'Series id from comic.naver.com `titleId` query (e.g. list/detail/info URL).' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    url: 'comic.naver.com',
    name: 'Series',
    maintainers: ['koreanpatch'],
    radar: [
        {
            source: ['comic.naver.com/webtoon/list', 'comic.naver.com/webtoon/detail', 'comic.naver.com/webtoon/info'],
            target: '/webtoon/series/:titleId',
        },
    ],
    handler,
};

async function handler(ctx: Context): Promise<Data> {
    const titleId = ctx.req.param('titleId');
    const limitRaw = ctx.req.query('limit');
    const limit = Math.min(100, Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) || 30 : 30));

    const headers = naverHeaders();
    const [info, list] = await Promise.all([
        ofetch(`${COMIC_ORIGIN}/api/article/list/info`, {
            headers,
            query: { titleId },
        }) as Promise<ArticleListInfo>,
        ofetch(`${COMIC_ORIGIN}/api/article/list`, {
            headers,
            query: { titleId, page: 1 },
        }) as Promise<ArticleListResponse>,
    ]);

    const seriesTitle = info.titleName?.trim() || `Webtoon ${titleId}`;
    const seriesThumb = info.sharedThumbnailUrl ?? info.thumbnailUrl ?? '';
    const author = seriesAuthor(info);
    const genres = genreLabels(info);

    const free = list.articleList ?? [];
    const paidFolder = list.chargeFolderArticleList ?? [];
    const episodes = [...free, ...paidFolder].slice(0, limit);

    const detailBase = `${COMIC_ORIGIN}/webtoon/detail?titleId=${titleId}`;

    const item: DataItem[] = episodes.map((ep) => {
        const link = `${detailBase}&no=${ep.no}`;
        const thumb = ep.thumbnailUrl ?? '';
        const title = `${seriesTitle} — ${ep.subtitle ?? ep.no}`;
        const pubDate = episodePubDate(ep.serviceDateDescription);
        const isFree = ep.charge !== true;

        return {
            title,
            link,
            guid: `naver-webtoon-${titleId}-${ep.no}`,
            pubDate,
            author,
            category: genres,
            image: thumb,
            description: thumb ? `<img src="${thumb}" />` : undefined,
            _extra: {
                type: 'webtoon_episode',
                platform: 'naver',
                titleId,
                episodeNo: String(ep.no),
                thumbnail: thumb,
                seriesTitle,
                seriesThumb,
                author,
                genre: genres,
                isFree,
                sourceLocale: 'ko',
                ocrPending: true,
            },
        };
    });

    return {
        title: `${seriesTitle} — Naver Webtoon`,
        link: `${COMIC_ORIGIN}/webtoon/list?titleId=${titleId}`,
        item,
        language: 'ko',
    };
}
