import { API_BASE } from './config.js'
import { state } from './state.js'

const REQUEST_TIMEOUT_MS = 15000

export async function api(path, options = {}) {
  const requestUrl = `${API_BASE}${path}`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const error = new Error('You are offline.')
    error.url = requestUrl
    error.code = 'OFFLINE'
    throw error
  }

  let response

  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The backend took too long to respond.')
      timeoutError.url = requestUrl
      timeoutError.code = 'TIMEOUT'
      throw timeoutError
    }

    const networkError = new Error('Network connection changed.')
    networkError.url = requestUrl
    networkError.code = 'NETWORK_CHANGED'
    networkError.cause = error
    throw networkError
  } finally {
    window.clearTimeout(timeoutId)
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const firstValidationMessage = data?.errors
      ? Object.values(data.errors).flat().find(Boolean)
      : null
    const message =
      data?.message ||
      firstValidationMessage ||
      'Request failed.'

    const error = new Error(message)
    error.status = response.status
    error.url = requestUrl
    throw error
  }

  return data
}
