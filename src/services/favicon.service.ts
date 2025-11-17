import * as cheerio from 'cheerio'
import { StatusCodes } from 'http-status-codes'
import { LRUCache } from 'lru-cache'

// Cache LRU
const cache = new LRUCache<string, any>({
  max: 5000,
  ttl: 1000 * 60 * 60,
})

const log = (...msg: any[]) => console.log('[FAVICON]', ...msg)

const logError = (context: string, err: unknown) => {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)

  console.error(`[FAVICON ERROR] ${context}: ${message}`)
}

const fetchWithTimeout = async (url: string, timeoutMs = 6000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)
    return res
  } catch (err) {
    clearTimeout(timeout)
    logError(`Timeout or fetch error at ${url}`, err)
    throw err
  }
}

// Parses icons from HTML using Cheerio (SAFE)
const parseIconsFromHtml = (html: string, baseUrl: string) => {
  const $ = cheerio.load(html)
  const icons: { sizes: string; href: string }[] = []

  $('link[rel*="icon"]').each((_, el) => {
    const href = $(el).attr('href')
    const sizes = $(el).attr('sizes') || 'unknown'

    if (href) {
      const absolute = new URL(href, baseUrl).href
      icons.push({ sizes, href: absolute })
    }
  })

  return icons
}

// Try common default icon paths
const tryDefaultPaths = async (origin: string) => {
  const defaults = ['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png']

  for (const path of defaults) {
    const url = origin + path

    try {
      const res = await fetchWithTimeout(url)
      if (res.ok) {
        return [{ sizes: 'unknown', href: url }]
      }
    } catch (err) {
      logError(`Default path fetch failed (${url})`, err)
    }
  }

  return []
}

// Proxy favicon services
const fetchFromProxy = async (domain: string) => {
  const sources = [
    `https://www.google.com/s2/favicons?domain=${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ]

  for (const src of sources) {
    try {
      const res = await fetchWithTimeout(src)
      if (res.ok) {
        return {
          status: StatusCodes.OK,
          statusText: 'OK',
          url: src,
          host: new URL(src).host,
          icons: [{ sizes: 'unknown', href: src }],
        }
      }
    } catch (err) {
      logError(`Proxy fetch failed (${src})`, err)
    }
  }

  return null
}

// Generated fallback icon
const generatePlaceholder = (domain: string) => {
  const first = domain[0]?.toUpperCase() || '?'
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="16" fill="#222"/>
      <text x="50%" y="50%" font-size="48" font-weight="bold"
            text-anchor="middle" dominant-baseline="middle"
            fill="#fff">${first}</text>
    </svg>
  `
  const base64 = Buffer.from(svg).toString('base64')

  return {
    status: StatusCodes.NOT_FOUND,
    statusText: 'Generated Placeholder',
    url: `data:image/svg+xml;base64,${base64}`,
    host: domain,
    icons: [
      {
        sizes: '100x100',
        href: `data:image/svg+xml;base64,${base64}`,
      },
    ],
  }
}

export const fetchFaviconsForDomain = async (domain: string) => {
  if (cache.has(domain)) {
    log('Returning cached result for', domain)
    return cache.get(domain)
  }

  const protocols = ['http', 'https']
  let result = null

  for (const protocol of protocols) {
    const url = `${protocol}://${domain}`

    try {
      log(`Trying ${url}`)

      const res = await fetchWithTimeout(url)
      if (!res.ok) continue

      const html = await res.text()
      const baseUrl = res.url
      const icons = parseIconsFromHtml(html, baseUrl)

      const finalIcons = icons.length > 0 ? icons : await tryDefaultPaths(new URL(baseUrl).origin)

      if (finalIcons.length > 0) {
        result = {
          status: StatusCodes.OK,
          statusText: 'OK',
          url: baseUrl,
          host: new URL(baseUrl).host,
          icons: finalIcons,
        }
        break
      }
    } catch (err) {
      logError(`Error on protocol ${protocol}`, err)
    }
  }

  if (!result) {
    try {
      result = await fetchFromProxy(domain)
    } catch (err) {
      logError(`Proxy fallback failed for ${domain}`, err)
    }
  }

  if (!result) {
    result = generatePlaceholder(domain)
  }

  cache.set(domain, result)
  return result
}
