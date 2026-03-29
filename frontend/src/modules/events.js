import { root } from './dom.js'
import { navigate } from './router.js'

export function bindCommonEvents() {
  root.querySelectorAll('[data-link]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault()
      navigate(element.getAttribute('href'))
    })
  })
}
