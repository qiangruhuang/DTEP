export type SysmlRecord = Record<string, any>

function configuredBaseUrl() {
  const raw = process.env.DTEP_SYSML_V2_BASE_URL
  if (!raw) throw new Error('未配置 DTEP_SYSML_V2_BASE_URL')
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('SysML v2 API 仅允许 http/https')
  url.pathname = url.pathname.replace(/\/$/, '')
  return url
}

function headers() {
  const out: Record<string, string> = { Accept: 'application/json, application/ld+json' }
  const token = process.env.DTEP_SYSML_V2_TOKEN
  if (token) out.Authorization = `Bearer ${token}`
  return out
}

async function getPage(path: string, params: Record<string, string | number | undefined> = {}) {
  const base = configuredBaseUrl()
  const url = new URL(`${base.pathname}${path}`, base.origin)
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(url, { method: 'GET', headers: headers(), cache: 'no-store', signal: controller.signal })
    const text = await res.text()
    if (!res.ok) throw new Error(`SysML v2 API ${res.status}: ${text.slice(0, 500)}`)
    const data = text ? JSON.parse(text) : null
    return { data, link: res.headers.get('link'), origin: base.origin }
  } finally {
    clearTimeout(timer)
  }
}

function nextLink(link: string | null, origin: string): string | null {
  if (!link) return null
  for (const part of link.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="?next"?/)
    if (!match) continue
    const url = new URL(match[1], origin)
    if (url.origin !== origin) throw new Error('SysML v2 pagination next link changed origin')
    return `${url.pathname}${url.search}`
  }
  return null
}

async function getCollection(path: string, params: Record<string, string | number | undefined> = {}) {
  const records: SysmlRecord[] = []
  let next: string | null = path
  let first = true
  for (let page = 0; next && page < 100; page += 1) {
    const response = await getPage(next, first ? { 'page[size]': 500, ...params } : {})
    if (!Array.isArray(response.data)) throw new Error(`SysML v2 collection expected array at ${next}`)
    records.push(...response.data)
    next = nextLink(response.link, response.origin)
    first = false
  }
  return records
}

export const sysmlV2 = {
  listProjects: () => getCollection('/projects'),
  listCommits: (projectId: string) => getCollection(`/projects/${encodeURIComponent(projectId)}/commits`),
  listElements: (projectId: string, commitId: string) =>
    getCollection(`/projects/${encodeURIComponent(projectId)}/commits/${encodeURIComponent(commitId)}/elements`),
  getElement: async (projectId: string, commitId: string, elementId: string) =>
    (await getPage(`/projects/${encodeURIComponent(projectId)}/commits/${encodeURIComponent(commitId)}/elements/${encodeURIComponent(elementId)}`)).data as SysmlRecord,
  listRelationships: (projectId: string, commitId: string, elementId: string, direction: 'in' | 'out' | 'both' = 'both') =>
    getCollection(
      `/projects/${encodeURIComponent(projectId)}/commits/${encodeURIComponent(commitId)}/elements/${encodeURIComponent(elementId)}/relationships`,
      { direction },
    ),
}
