export const root = document.getElementById('app')

export function mount(markup) {
  root.innerHTML = markup
}

export function byId(id) {
  return document.getElementById(id)
}
