import { api } from './api.js'
import { byId } from './dom.js'
import { navigate } from './router.js'
import { resetChatState, setGuestMode, setToken, setUser, state } from './state.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,15}$/

export async function ensureAuth() {
  if (!state.token) {
    setUser(null)
    return false
  }

  try {
    state.user = await api('/me', { method: 'GET' })
    return true
  } catch {
    setToken(null)
    resetChatState()
    return false
  }
}

function showAuthError(message) {
  const box = byId('auth-error')

  if (!box) {
    return
  }

  box.textContent = message
  box.classList.remove('hidden')
}

function hideAuthError() {
  const box = byId('auth-error')

  if (!box) {
    return
  }

  box.textContent = ''
  box.classList.add('hidden')
}

function validateAuthPayload(payload, type) {
  const name = payload.name?.trim() || ''
  const email = payload.email?.trim() || ''
  const password = payload.password?.trim() || ''
  const passwordConfirmation = payload.password_confirmation?.trim() || ''

  if (type === 'register' && !name) {
    throw new Error('Enter your name.')
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Enter a valid email address.')
  }

  if (!PASSWORD_PATTERN.test(password)) {
    throw new Error('Password must be 6 to 15 characters and include at least one letter, one number, and one special character.')
  }

  if (type === 'register' && passwordConfirmation !== password) {
    throw new Error('Confirm password must match password.')
  }
}

async function tryBackendAuth(type, payload) {
  const email = payload.email.trim()
  const password = payload.password.trim()
  const loginPayload = {
    email,
    password,
  }

  if (type === 'login') {
    return await api('/login', {
      method: 'POST',
      body: JSON.stringify(loginPayload),
    })
  }

  const registerPayload = {
    name: payload.name.trim(),
    email,
    password,
    password_confirmation: payload.password_confirmation.trim(),
  }

  return await api('/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload),
  })
}

export function bindAuthEvents(type) {
  const form = byId('auth-form')

  if (!form) {
    return
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const payload = Object.fromEntries(new FormData(form).entries())

    try {
      hideAuthError()
      validateAuthPayload(payload, type)

      resetChatState()
      const result = await tryBackendAuth(type, payload)
      setGuestMode(false)
      setToken(result.token)
      setUser(result.user)

      navigate('/chat')
    } catch (error) {
      const detail = error?.url ? ` (${error.status || 'error'} at ${error.url})` : ''
      showAuthError(`${error.message}${detail}`)
    }
  })
}
