const listeners = []

export function getPath() {
  return window.location.pathname
}

export function navigate(path) {
  window.history.pushState({}, '', path)
  listeners.forEach((listener) => listener())
}

export function onRouteChange(listener) {
  listeners.push(listener)
}

window.addEventListener('popstate', () => {
  listeners.forEach((listener) => listener())
})
