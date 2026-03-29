import { API_BASE } from './config.js'
import { state } from './state.js'

export async function api(path, options = {}) {
  const requestUrl = `${API_BASE}${path}`
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers,
  })

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
