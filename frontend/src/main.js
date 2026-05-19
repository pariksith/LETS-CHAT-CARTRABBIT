import './styles/app.css'
import { renderApp } from './modules/app.js'
import { root } from './modules/dom.js'

function renderFatalError(message) {
  const fallbackRoot = root || document.body

  fallbackRoot.innerHTML = `
    <section class="transition-screen" aria-label="Application error">
      <div class="transition-shell">
        <h1 class="transition-title">Let's chat</h1>
        <p class="transition-copy">${message}</p>
      </div>
    </section>
  `
}

function startApp() {
  if (!root) {
    renderFatalError('The app container is missing. Check the frontend HTML entry file.')
    return
  }

  try {
    renderApp()
  } catch (error) {
    console.error('Failed to start frontend app.', error)
    renderFatalError('The app could not start. Refresh the page and verify the frontend configuration.')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true })
} else {
  startApp()
}
