import { api } from './api.js'
import { prepareChatAfterAuth } from './chat.js'
import { byId } from './dom.js'
import { navigate } from './router.js'
import { resetChatState, setGuestMode, setToken, setUser, state } from './state.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

export async function ensureAuth() {
  if (!state.token) {
    resetChatState()
    setUser(null)
    return false
  }

  try {
    setUser(await api('/me', { method: 'GET' }))
    return true
  } catch (error) {
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

function showAuthStatus(message, tone = 'pending') {
  const box = byId('auth-status')

  if (!box) {
    return
  }

  box.textContent = message
  box.dataset.state = tone
  box.classList.remove('hidden')
}

function hideAuthStatus() {
  const box = byId('auth-status')

  if (!box) {
    return
  }

  box.textContent = ''
  box.dataset.state = ''
  box.classList.add('hidden')
}

function setAuthSubmittingState(form, submitButton, type, isSubmitting) {
  const card = form?.closest('.login-card, .auth-card')

  form?.classList.toggle('is-submitting', isSubmitting)
  form?.setAttribute('aria-busy', isSubmitting ? 'true' : 'false')
  card?.classList.toggle('is-submitting', isSubmitting)

  if (!submitButton) {
    return
  }

  submitButton.disabled = isSubmitting
  submitButton.classList.toggle('is-loading', isSubmitting)
  submitButton.setAttribute('aria-busy', isSubmitting ? 'true' : 'false')
  submitButton.textContent = isSubmitting
    ? (type === 'login' ? 'Signing In...' : 'Creating Account...')
    : submitButton.dataset.idleLabel || submitButton.textContent
}

function formatAuthError(error, type) {
  if (!error) {
    return type === 'login'
      ? 'Login failed. Try again.'
      : 'Registration failed. Try again.'
  }

  if (error.status === 401 || error.status === 403) {
    return type === 'login'
      ? 'Your email or password is incorrect.'
      : 'You are not authorized to complete registration.'
  }

  if (error.status === 422) {
    return error.message || 'Please check the form fields and try again.'
  }

  if (error.code === 'OFFLINE') {
    return 'You appear to be offline. Check your internet or local server connection.'
  }

  if (error.code === 'NETWORK_CHANGED') {
    return 'The app could not reach the backend. Verify Laravel is running on http://127.0.0.1:8001.'
  }

  if (error.code === 'TIMEOUT') {
    return 'The backend is not responding. Restart MySQL and Laravel, then try signing in again.'
  }

  if (error.message) {
    return error.message
  }

  return type === 'login'
    ? 'Login failed. Try again.'
    : 'Registration failed. Try again.'
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
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

export function bindAuthEvents(type, attempt = 0) {
  const form = byId('auth-form')

  if (!form) {
    if (attempt >= 5) {
      console.error('Auth form was not found in the DOM.')
      return
    }

    window.requestAnimationFrame(() => bindAuthEvents(type, attempt + 1))
    return
  }

  if (form.dataset.authBound === 'true') {
    return
  }

  form.dataset.authBound = 'true'

  const submitButton = form.querySelector('button[type="submit"]')

  if (submitButton && !submitButton.dataset.idleLabel) {
    submitButton.dataset.idleLabel = submitButton.textContent || ''
  }

  form.addEventListener('input', () => {
    hideAuthError()

    if (form.classList.contains('is-submitting')) {
      return
    }

    hideAuthStatus()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const payload = Object.fromEntries(new FormData(form).entries())

    try {
      hideAuthError()
      hideAuthStatus()
      validateAuthPayload(payload, type)
      setAuthSubmittingState(form, submitButton, type, true)
      showAuthStatus(
        type === 'login'
          ? 'Checking your account and preparing your chats...'
          : 'Creating your account and preparing your chats...'
      )

      resetChatState()
      const result = await tryBackendAuth(type, payload)
      setGuestMode(false)
      setToken(result.token)
      setUser(result.user)
      await prepareChatAfterAuth()

      showAuthStatus(
        type === 'login' ? 'Welcome back. Opening your chat...' : 'Account ready. Opening your chat...',
        'success'
      )
      if (submitButton) {
        submitButton.textContent = type === 'login' ? 'Opening Chat...' : 'Starting Chat...'
      }
      navigate('/chat')
    } catch (error) {
      console.error('Authentication flow failed.', error)
      showAuthError(formatAuthError(error, type))
      hideAuthStatus()
    } finally {
      setAuthSubmittingState(form, submitButton, type, false)
    }
  })
}
