import { bindAuthEvents, ensureAuth } from './auth.js'
import { bindChatEvents, getChatUiState, loadUsers, teardownChatRuntime } from './chat.js'
import { mount } from './dom.js'
import { bindCommonEvents } from './events.js'
import { getPath, navigate, onRouteChange } from './router.js'
import { state } from './state.js'
import { authView, chatView, homeView, loadingView } from './views.js'

const CHAT_TRANSITION_MS = 180
let renderVersion = 0

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function animateTransitionProgress(duration) {
  const bar = document.getElementById('transition-progress-bar')
  const label = document.getElementById('transition-progress-label')

  if (!bar || !label) {
    return () => {}
  }

  let frameId = null
  const start = performance.now()

  const tick = (now) => {
    const elapsed = Math.min(now - start, duration)
    const progress = Math.min(elapsed / duration, 1)
    const percent = Math.round(progress * 100)

    bar.style.width = `${percent}%`
    label.textContent = `${percent}%`

    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick)
    }
  }

  frameId = window.requestAnimationFrame(tick)

  return () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
    }
    bar.style.width = '100%'
    label.textContent = '100%'
  }
}

async function renderHomePage() {
  teardownChatRuntime()
  mount(homeView())
  bindCommonEvents()
}

async function renderAuthPage(type) {
  teardownChatRuntime()
  mount(authView(type))
  bindCommonEvents()
  bindAuthEvents(type)
}

async function renderChatPage(version) {
  teardownChatRuntime()
  mount(loadingView())

  const finishProgress = animateTransitionProgress(CHAT_TRANSITION_MS)
  const transitionStart = performance.now()
  const ok = await ensureAuth()

  if (version !== renderVersion) {
    finishProgress()
    return
  }

  if (!ok) {
    finishProgress()
    navigate('/login')
    return
  }

  await loadUsers()
  if (version !== renderVersion) {
    finishProgress()
    return
  }

  const elapsed = performance.now() - transitionStart

  if (elapsed < CHAT_TRANSITION_MS) {
    await delay(CHAT_TRANSITION_MS - elapsed)
  }

  if (version !== renderVersion) {
    finishProgress()
    return
  }

  finishProgress()

  mount(
    chatView({
      user: state.user,
      users: state.users,
      selectedUserId: state.selectedUserId,
      messages: state.messages,
      ...getChatUiState(),
    })
  )
  bindCommonEvents()
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
    if (state.token) {
      const ok = await ensureAuth()

      if (version !== renderVersion) {
        return
      }

      if (ok) {
        navigate('/chat')
        return
      }
    }

    await renderAuthPage(path === '/login' ? 'login' : 'register')
    return
  }

  await renderHomePage()
}

export function renderApp() {
  onRouteChange(renderRoute)
  renderRoute()
}
