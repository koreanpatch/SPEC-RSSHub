# Route: Netflix Drama Series

← [INDEX](INDEX.md) | Setup: [RSSHUB_SETUP.md](RSSHUB_SETUP.md)

## File Location

`lib/v2/netflix/drama-series.ts`

## Route Path

`/netflix/drama/:showId`

## Parameters

| Param    | Type             | Example    | Source                       |
| -------- | ---------------- | ---------- | ---------------------------- |
| `showId` | string (numeric) | `81040344` | `netflix.com/title/81040344` |

## Anti-Crawling Status

`antiCrawler: true` — Netflix actively detects and blocks scrapers.
The strategy below works from a residential IP. From a VPS you may need to
rotate user agents or use a proxy. This is a known limitation.

## Data Strategy: Two Layers

### Layer A (no auth) — always attempted

Scrape `netflix.com/title/{showId}` HTML:

1. Parse `<script type="application/ld+json">` → show title, description, poster image
2. Parse `window.netflix.falcorCache` blob embedded in a `<script>` tag →
   season/episode structure with thumbnails, synopses, air times

### Layer B (with auth cookie) — optional, set `NETFLIX_COOKIE` env var

Same scrape but authenticated, which yields:

- Full episode synopses (not truncated)
- More accurate episode thumbnail stills
- Air dates for upcoming episodes

### Falcor Cache Parsing

```typescript
// Extract the Falcor blob from the page HTML
const match = html.match(/netflix\.falcorCache\s*=\s*(\{.+?\});?\s*<\/script>/s);
const falcorData = JSON.parse(match[1]);

// Path to episode data:
// falcorData.videos[showId].seasonList.value → [{type:'ref', value:['videos', seasonId]}]
// falcorData.videos[seasonId].episodes.value → [{type:'ref', value:['videos', epId]}]
// falcorData.videos[epId] → episode object
```

### Episode object fields from Falcor

```typescript
{
  title:                  { value: string },
  synopsis:               { value: string },
  runtime:                { value: number },  // seconds
  seasonNum:              { value: number },
  episodeNum:             { value: number },
  availabilityStartTime:  { value: number },  // Unix ms
  interestingMoment: {
    '_342x192': { jpg: { url: string } },     // episode thumbnail
  },
  boxart: {
    '_284x160': { jpg: { url: string } },     // fallback thumbnail
  },
}
```

## `extra` Payload Shape

```typescript
{
  type: 'drama_episode',
  platform: 'netflix',
  showId: string,
  episodeId: string,
  episodeNumber: number,
  seasonNumber: number,
  thumbnail: string,
  showTitle: string,
  showPoster: string,
  runtimeSeconds: number,
  isAuthenticated: boolean,    // whether Layer B was used
  sourceLocale: 'ko',
}
```

## Fallback Behaviour

If Falcor parsing fails entirely (Netflix changes their bundle structure),
the route returns a single show-level item:

```
Title: "Show Title — New content available"
Link: netflix.com/title/{showId}
```

This is intentional: a broken episode parse is better than a broken feed.

## Cache Strategy

Netflix pages should not be cached aggressively (anti-bot risk on repeat hits):
| Data | TTL |
|---|---|
| Show page HTML | 3600s |
| Per-episode (from Falcor) | Not separately cached; episode list refetches |

## Config

Set in RSSHub `.env`:

```
NETFLIX_COOKIE=<full Cookie header string from browser devtools>
```

This is optional. Without it, Layer A still works for most shows.
