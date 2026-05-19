const listeners = []
let pendingNotifyId = 0

function normalizePath(path) {
  if (!path) {
    return '/'
  }

  const sanitizedPath = path.split('?')[0].split('#')[0]

  if (sanitizedPath === '/' || sanitizedPath === '') {
    return '/'
  }

  return sanitizedPath.replace(/\/+$/, '') || '/'
}

function notifyListeners() {
  pendingNotifyId = 0
  listeners.forEach((listener) => listener())
}

export function getPath() {
  return normalizePath(window.location.pathname)
}

export function navigate(path) {
  const normalizedPath = normalizePath(path)

  if (normalizedPath === getPath()) {
    return
  }

  window.history.pushState({}, '', normalizedPath)

  if (pendingNotifyId) {
    window.cancelAnimationFrame(pendingNotifyId)
  }

  // Let the pressed state paint before the route swaps the entire view.
  pendingNotifyId = window.requestAnimationFrame(notifyListeners)
}

export function onRouteChange(listener) {
  listeners.push(listener)
}

window.addEventListener('popstate', () => {
  notifyListeners()
})
