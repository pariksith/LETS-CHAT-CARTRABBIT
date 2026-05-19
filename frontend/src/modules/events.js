import { root } from './dom.js'
import { navigate } from './router.js'

let commonEventsBound = false

export function bindCommonEvents() {
  if (!root || commonEventsBound) {
    return
  }

  commonEventsBound = true

  root.addEventListener('click', (event) => {
    const element = event.target.closest('[data-link]')

    if (!element || !root.contains(element)) {
      return
    }

    if (root.querySelector('.chat-page .chat-input-bar.recording')) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    navigate(element.getAttribute('href'))
  })
}
