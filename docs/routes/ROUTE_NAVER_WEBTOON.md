# Route: Naver Webtoon Series

← [INDEX](INDEX.md) | Setup: [RSSHUB_SETUP.md](RSSHUB_SETUP.md)

## File Location

`lib/v2/naver/webtoon-series.ts`

## Route Path

`/naver/webtoon/series/:titleId`

## Parameters

| Param     | Type             | Example  | Source                                       |
| --------- | ---------------- | -------- | -------------------------------------------- |
| `titleId` | string (numeric) | `758037` | `comic.naver.com/webtoon/list?titleId=XXXXX` |

## Example URLs

```
/naver/webtoon/series/758037   ← 나 혼자만 레벨업 (Solo Leveling)
/naver/webtoon/series/570503   ← 유미의 세포들
/naver/webtoon/series/183559   ← 외모지상주의
```

## Radar Rules

Detects subscription intent on:

- `comic.naver.com/webtoon/list?titleId=*` (series page)
- `comic.naver.com/webtoon/detail?titleId=*` (episode viewer)
- `comic.naver.com/webtoon/info?titleId=*` (series info)

All extract `titleId` from query params.

## Selectors Reference

Naver uses CSS Modules (obfuscated class suffixes). Always provide fallbacks:

| Data          | Primary selector                          | Fallback                     |
| ------------- | ----------------------------------------- | ---------------------------- |
| Series title  | `h2.EpisodeListInfo__title--*`            | `h2.title`, `og:title` meta  |
| Author        | `.EpisodeListInfo__author_area--*`        | `span.wrt_nm`                |
| Episode title | `.EpisodeListList__title--*`              | `span.title`                 |
| Episode thumb | `img.EpisodeListList__thumbnail_image--*` | `img.thumb`, series OG image |
| Episode date  | `.EpisodeListList__date--*`               | `span.date`                  |
| Free badge    | `.EpisodeListList__free--*`               | `.ico_free`                  |
| Genre tags    | `.EpisodeListInfo__tag_area--* span`      | —                            |

**Robust fallback pattern (CSS Module-resistant):**

```typescript
const link = $el.find('a[href*="webtoon/detail"]').first().attr('href');
const title = $el.find('a[href*="webtoon/detail"] strong, a[href*="webtoon/detail"] span').first().text().trim();
const thumb = $el.find('img[src*="comic.naver.com"]').first().attr('src');
```

## Cache Strategy

| Data                                   | Key                               | TTL    |
| -------------------------------------- | --------------------------------- | ------ |
| Series metadata (title, author, genre) | `naver:webtoon:meta:{titleId}`    | 600s   |
| Individual episode                     | `naver:webtoon:ep:{titleId}:{no}` | 86400s |
| Series episode list                    | Not cached (always fresh)         | —      |

## Required Headers

```typescript
{
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.5',
  'User-Agent': 'Mozilla/5.0 ... Chrome/124',
  'Referer': 'https://comic.naver.com/',
}
```

Without `Accept-Language: ko-KR`, Naver returns an error or redirect.

## `extra` Payload Shape

```typescript
{
  type: 'webtoon_episode',
  platform: 'naver',
  titleId: string,
  episodeNo: string,
  thumbnail: string,
  seriesTitle: string,
  seriesThumb: string,
  author: string,
  genre: string[],
  isFree: boolean,
  sourceLocale: 'ko',
  ocrPending: true,   // flag for future OCR pipeline
}
```

## Known Fragility Points

1. **CSS Module class names** change on Naver redeploys. Mitigation: always
   test with 2 selectors + structural fallback. Add a health check test.
2. **Rate limiting**: Naver may 429 on rapid sequential episode fetches.
   Mitigation: `cache.tryGet` prevents re-fetching; 24h TTL on episode pages.
3. **Paywalled episodes**: `ofetch` on a locked episode returns a redirect to
   login. Catch the error, return empty description, still add the item.

## Sunbi URL Parser Utility

When users paste Naver URLs into the "Add Source" dialog:

```typescript
// extension/src/utils/parseNaverWebtoonInput.ts
export function parseNaverWebtoonInput(input: string): string | null {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return trimmed; // raw ID
    try {
        const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL('https://' + trimmed);
        if (url.hostname.includes('naver.com')) return url.searchParams.get('titleId');
    } catch {}
    return null; // trigger name search fallback
}
```
