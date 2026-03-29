const storedUser = localStorage.getItem('user')
const storedToken = localStorage.getItem('token')
const storedGuestMode = localStorage.getItem('guestMode') === 'true'

if (storedGuestMode || storedToken === 'guest-mode') {
  localStorage.removeItem('guestMode')
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const state = {
  token: storedGuestMode || storedToken === 'guest-mode' ? null : (localStorage.getItem('token') || null),
  guestMode: false,
  user: storedGuestMode || storedToken === 'guest-mode' ? null : (storedUser ? JSON.parse(storedUser) : null),
  users: [],
  selectedUserId: null,
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

export function resetChatState() {
  setGuestMode(false)
  setUser(null)
  state.users = []
  state.selectedUserId = null
  state.messages = []
}
