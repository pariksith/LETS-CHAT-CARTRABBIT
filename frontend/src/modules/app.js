import { bindAuthEvents, ensureAuth } from './auth.js'
import { bindChatEvents, getChatUiState, loadUsers, primeSelectedConversation, teardownChatRuntime } from './chat.js'
import { mount } from './dom.js'
import { bindCommonEvents } from './events.js'
import { getPath, navigate, onRouteChange } from './router.js'
import { state } from './state.js'
import { authView, chatView, homeView, loadingView } from './views.js'

const CHAT_LOADING_DELAY_MS = 120
let renderVersion = 0

async function renderHomePage() {
  teardownChatRuntime()
  mount(homeView())
}

async function renderAuthPage(type) {
  teardownChatRuntime()
  mount(authView(type))
  bindAuthEvents(type)
}

async function renderChatPage(version) {
  teardownChatRuntime()
  const canRenderFromCache = Boolean(state.token && state.user)
  let loadingVisible = false
  const loadingTimerId = canRenderFromCache
    ? 0
    : window.setTimeout(() => {
      if (version !== renderVersion) {
        return
      }

      loadingVisible = true
      mount(loadingView())
    }, CHAT_LOADING_DELAY_MS)

  if (canRenderFromCache) {
    mount(
      chatView({
        user: state.user,
        users: state.users,
        selectedUserId: state.selectedUserId,
        messages: state.messages,
        ...getChatUiState(),
      })
    )
    bindChatEvents()
  }

  const ok = await ensureAuth()

  if (loadingTimerId) {
    window.clearTimeout(loadingTimerId)
  }

  if (version !== renderVersion) {
    return
  }

  if (!ok) {
    teardownChatRuntime()
    navigate('/login')
    return
  }

  if (state.selectedUserId) {
    void primeSelectedConversation(state.selectedUserId)
  }

  if (!canRenderFromCache) {
    mount(
      chatView({
        user: state.user,
        users: state.users,
        selectedUserId: state.selectedUserId,
        messages: state.messages,
        ...getChatUiState(),
      })
    )
    bindChatEvents()
  }

  try {
    await loadUsers()
  } catch (error) {
    if (version !== renderVersion) {
      return
    }

    if (error?.status === 401 || error?.status === 403) {
      navigate('/login')
      return
    }

    if (canRenderFromCache) {
      return
    }

    return
  }

  if (version !== renderVersion) {
    return
  }

  if (!loadingVisible && getPath() !== '/chat') {
    return
  }

  mount(
    chatView({
      user: state.user,
      users: state.users,
      selectedUserId: state.selectedUserId,
      messages: state.messages,
      ...getChatUiState(),
    })
  )
  bindChatEvents()
}

async function renderRoute() {
  const version = ++renderVersion
  const path = getPath()

  if (path === '/chat') {
    await renderChatPage(version)
    return
  }

  if (path === '/login' || path === '/register') {
    await renderAuthPage(path === '/login' ? 'login' : 'register')
    return
  }

  if (path !== '/') {
    navigate('/')
    return
  }

  await renderHomePage()
}

export function renderApp() {
  bindCommonEvents()
  onRouteChange(renderRoute)
  renderRoute()
}
