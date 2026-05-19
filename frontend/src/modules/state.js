const USERS_STORAGE_KEY = 'users'
const storedUser = localStorage.getItem('user')
const storedToken = localStorage.getItem('token')
const storedGuestMode = localStorage.getItem('guestMode') === 'true'
const storedSelectedUserId = Number(localStorage.getItem('selectedUserId'))
const storedUsers = (() => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})()

if (storedGuestMode || storedToken === 'guest-mode') {
  localStorage.removeItem('guestMode')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem(USERS_STORAGE_KEY)
}

export const state = {
  token: storedGuestMode || storedToken === 'guest-mode' ? null : (localStorage.getItem('token') || null),
  guestMode: false,
  user: storedGuestMode || storedToken === 'guest-mode' ? null : (storedUser ? JSON.parse(storedUser) : null),
  users: storedGuestMode || storedToken === 'guest-mode' ? [] : storedUsers,
  selectedUserId: storedGuestMode || storedToken === 'guest-mode' || Number.isNaN(storedSelectedUserId)
    ? null
    : storedSelectedUserId,
  messages: [],
}

export function setToken(token) {
  state.token = token

  if (token) {
    localStorage.setItem('token', token)
    return
  }

  localStorage.removeItem('token')
}

export function setGuestMode(enabled) {
  state.guestMode = enabled

  if (enabled) {
    localStorage.setItem('guestMode', 'true')
    return
  }

  localStorage.removeItem('guestMode')
}

export function setUser(user) {
  state.user = user

  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
    return
  }

  localStorage.removeItem('user')
}

export function setUsers(users) {
  state.users = Array.isArray(users) ? users : []

  if (state.users.length > 0) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
    return
  }

  localStorage.removeItem(USERS_STORAGE_KEY)
}

export function setSelectedUserId(userId) {
  const normalizedUserId = Number(userId)

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    state.selectedUserId = null
    localStorage.removeItem('selectedUserId')
    return
  }

  state.selectedUserId = normalizedUserId
  localStorage.setItem('selectedUserId', String(normalizedUserId))
}

export function resetChatState() {
  setGuestMode(false)
  setUser(null)
  setUsers([])
  setSelectedUserId(null)
  state.messages = []
}
