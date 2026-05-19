export const root = document.getElementById('app') || document.getElementById('root')
let mountAnimationFrameId = 0

function animateMount() {
  if (!root) {
    return
  }

  root.classList.remove('app-route-enter')

  if (mountAnimationFrameId) {
    window.cancelAnimationFrame(mountAnimationFrameId)
  }

  // Force a fresh enter animation after replacing the route subtree.
  void root.offsetWidth
  root.classList.add('app-route-enter')
  mountAnimationFrameId = window.requestAnimationFrame(() => {
    root?.classList.remove('app-route-enter')
    mountAnimationFrameId = 0
  })
}

export function mount(markup, options = {}) {
  if (!root) {
    throw new Error('App mount element was not found. Expected #app or #root in the page.')
  }

  root.innerHTML = markup

  if (options.animate !== false) {
    animateMount()
    return
  }

  root.classList.remove('app-route-enter')
}

export function byId(id) {
  return document.getElementById(id)
}
