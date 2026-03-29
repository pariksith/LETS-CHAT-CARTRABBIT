export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'

export const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || ''

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function normalizeIceServer(server) {
  if (!server || typeof server !== 'object') {
    return null
  }

  const urls = Array.isArray(server.urls)
    ? server.urls.filter((value) => typeof value === 'string' && value.trim())
    : typeof server.urls === 'string' && server.urls.trim()
      ? server.urls.trim()
      : null

  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    return null
  }

  const normalized = { urls }

  if (typeof server.username === 'string' && server.username.trim()) {
    normalized.username = server.username.trim()
  }

  if (typeof server.credential === 'string' && server.credential.trim()) {
    normalized.credential = server.credential.trim()
  }

  return normalized
}

function parseIceServers() {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS

  if (!raw) {
    return DEFAULT_ICE_SERVERS
  }

  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      throw new Error('ICE config must be an array.')
    }

    const servers = parsed
      .map(normalizeIceServer)
      .filter(Boolean)

    return servers.length > 0 ? servers : DEFAULT_ICE_SERVERS
  } catch (error) {
    console.error('Invalid VITE_WEBRTC_ICE_SERVERS value. Falling back to default STUN servers.', error)
    return DEFAULT_ICE_SERVERS
  }
}

export const WEBRTC_ICE_SERVERS = parseIceServers()
