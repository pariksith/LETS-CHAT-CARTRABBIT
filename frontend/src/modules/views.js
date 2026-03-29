import { escapeHtml } from './utils.js'

function icon(name, className = '') {
  const icons = {
    bubbles: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 4.2c-4.5 0-8.1 3.2-8.1 7.2 0 1.8.7 3.4 1.9 4.7l-.7 3c-.1.6.5 1 .9.7l3.5-2.1c.8.2 1.6.3 2.5.3 4.5 0 8.1-3.2 8.1-7.2S16.5 4.2 12 4.2Zm0 2.4c3 0 5.5 1.9 5.5 4.8S15 16.2 12 16.2c-.7 0-1.4-.1-2-.3l-.5-.2-1.8 1.1.4-1.5-.5-.5c-1-.9-1.5-2.1-1.5-3.4 0-2.8 2.5-4.8 5.5-4.8Z"/>
      </svg>
    `,
    mail: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="6.5" width="17" height="11" rx="2.5"/>
        <path d="m5.5 8 6.5 5 6.5-5"/>
      </svg>
    `,
    server: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="4.5" width="16" height="5" rx="2"/>
        <rect x="4" y="14.5" width="16" height="5" rx="2"/>
        <path d="M8 7h.01M8 17h.01"/>
      </svg>
    `,
    window: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="3"/>
        <path d="M4 9h16"/>
      </svg>
    `,
    route: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="7" cy="6.5" r="2.5"/>
        <circle cx="17" cy="17.5" r="2.5"/>
        <path d="M9.5 6.5h4a3 3 0 0 1 0 6h-3a3 3 0 0 0 0 6H14"/>
      </svg>
    `,
    shield: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3.8 18.5 6v5.7c0 4.1-2.6 6.9-6.5 8.5-3.9-1.6-6.5-4.4-6.5-8.5V6L12 3.8Z"/>
      </svg>
    `,
    lock: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="5.5" y="10.5" width="13" height="9" rx="2.5"/>
        <path d="M8.5 10.5V8.4a3.5 3.5 0 1 1 7 0v2.1"/>
      </svg>
    `,
    user: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3.3"/>
        <path d="M6 18.5a6 6 0 0 1 12 0"/>
      </svg>
    `,
    userPlus: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="10" cy="8" r="3.1"/>
        <path d="M4.5 18.5a5.6 5.6 0 0 1 11 0"/>
        <path d="M18 7.5v5M15.5 10h5"/>
      </svg>
    `,
    chat: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.2 17.5H4.5V6.8A2.8 2.8 0 0 1 7.3 4h9.4a2.8 2.8 0 0 1 2.8 2.8v6.4A2.8 2.8 0 0 1 16.7 16H10l-3.8 1.5Z"/>
      </svg>
    `,
    search: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6"/>
        <path d="m20 20-4.2-4.2"/>
      </svg>
    `,
    menu: `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="12" cy="19" r="2"/>
      </svg>
    `,
    plus: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    `,
    smile: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/>
        <path d="M9 10h.01M15 10h.01"/>
      </svg>
    `,
    sparkles: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/>
        <path d="m18.5 15 1 2.3 2.3 1-2.3 1-1 2.2-1-2.2-2.2-1 2.2-1 1-2.3Z"/>
        <path d="m5 15 .9 2 .1.2 2.2.8-2.2.9L5 21l-.9-2.1L2 18l2.1-.8L5 15Z"/>
      </svg>
    `,
    gif: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="6" width="17" height="12" rx="3"/>
        <path d="M7.8 12h2.7v2.4H8.8A1.8 1.8 0 0 1 7 12.6v-1.2c0-1 .8-1.8 1.8-1.8h1.7M12 14.4V9.6M15 14.4V9.6h3"/>
      </svg>
    `,
    image: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="3"/>
        <circle cx="9" cy="10" r="1.4"/>
        <path d="m6.5 16 4-4 3.2 3.2 2.8-2.8 1.9 1.9"/>
      </svg>
    `,
    file: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 19V5A1.5 1.5 0 0 1 8.5 3.5Z"/>
        <path d="M14 3.5V8h4"/>
      </svg>
    `,
    send: `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3.4 20.2 21 12 3.4 3.8l1.8 6.5L14 12l-8.8 1.7-1.8 6.5Z"/>
      </svg>
    `,
    phone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6.8 4.8h3.1l1.3 3.9-1.8 1.8a14.2 14.2 0 0 0 4.1 4.1l1.8-1.8 3.9 1.3v3.1a1.9 1.9 0 0 1-1.9 1.9A15.5 15.5 0 0 1 4.9 6.7a1.9 1.9 0 0 1 1.9-1.9Z"/>
      </svg>
    `,
    mic: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="4" width="6" height="11" rx="3"/>
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M8.5 20h7"/>
      </svg>
    `,
    video: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3.5" y="6.5" width="11" height="11" rx="2.5"/>
        <path d="m14.5 10.2 5-2.7v9l-5-2.7"/>
      </svg>
    `,
    back: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    `,
    html: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path fill="#E44D26" d="M10 6h44l-4 45-18 5-18-5-4-45Z"/>
        <path fill="#F16529" d="M32 10h18l-3.4 37.8L32 52V10Z"/>
        <path fill="#EBEBEB" d="M32 25H23l-.6-7H32v-7H14l.2 2 1.8 20H32v-8Zm0 18.8-.1.1-7.6-2.1-.5-6H16l1 11.4L32 51v-7.2Z"/>
        <path fill="#FFF" d="M32 25v8h8.4l-.8 8.7-7.6 2.1V51l15-4.2.1-1.2 1.6-17.6.2-2H32Zm0-14v7h17.4l.1-1.4.4-5.6H32Z"/>
      </svg>
    `,
    css: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path fill="#264DE4" d="M10 6h44l-4 45-18 5-18-5-4-45Z"/>
        <path fill="#2965F1" d="M32 10h18l-3.4 37.8L32 52V10Z"/>
        <path fill="#EBEBEB" d="M32 14H18.2l1.1 12.7H32v-5.2h-7.2l-.5-4.5H32V14Zm0 24.5-5.4-1.5-.4-4.3H21l.7 7.9 10.3 2.9v-4.9Z"/>
        <path fill="#FFFFFF" d="M32 14v5.2h11.2l-.4 4.5H32v5.2h10.3l-1 8.1-9.3 2.5v4.9l10.2-2.8.1-.8 1.9-17.1.1-1.3H32Z"/>
        <path fill="#FFFFFF" d="M24.5 29.6h5.2v-5.2h-5.7l.5 5.2Zm.8 8.3 4.4 1.2v-4.8h-4.8l.4 3.6Z"/>
      </svg>
    `,
    js: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="8" y="8" width="48" height="48" rx="10" fill="#F7DF1E"/>
        <path fill="#111B21" d="M39.6 43.8c1 1.7 2.3 2.9 4.7 2.9 2 0 3.2-1 3.2-2.4 0-1.7-1.3-2.3-3.6-3.3l-1.2-.5c-3.5-1.5-5.8-3.3-5.8-7.3 0-3.7 2.8-6.5 7.2-6.5 3.1 0 5.4 1.1 7 3.9l-3.8 2.4c-.8-1.5-1.8-2.1-3.2-2.1-1.5 0-2.4.9-2.4 2.1 0 1.5.9 2.1 3 3l1.2.5c4.1 1.8 6.4 3.5 6.4 7.7 0 4.4-3.5 6.9-8.2 6.9-4.6 0-7.6-2.2-9-5.1l4-2.3Zm-17.5.5c.8 1.4 1.5 2.6 3.2 2.6 1.6 0 2.7-.6 2.7-3.1V26.9h4.9v17c0 5.2-3 7.5-7.5 7.5-4 0-6.2-2-7.3-4.4l4-2.7Z"/>
      </svg>
    `,
    php: `
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <ellipse cx="32" cy="20" rx="29" ry="16" fill="#777BB4"/>
        <path fill="#fff" d="M18.2 11.8h6.1c3.3 0 5.3 1.7 5.3 4.8 0 3.6-2.6 5.8-6.2 5.8h-1.8l-.9 5h-3.9l2.4-15.6Zm4.3 7.5h1.6c1.4 0 2.3-.7 2.3-2.1 0-1-.7-1.5-1.8-1.5H23l-.5 3.6Zm9.2-7.5h3.9l-.8 4.8h5.1l.8-4.8h3.9l-2.4 15.6h-3.9l1-6h-5.1l-1 6h-3.9l2.4-15.6Zm16.5 0h6.1c3.3 0 5.3 1.7 5.3 4.8 0 3.6-2.6 5.8-6.2 5.8h-1.8l-.9 5h-3.9l2.4-15.6Zm4.3 7.5h1.6c1.4 0 2.3-.7 2.3-2.1 0-1-.7-1.5-1.8-1.5H53l-.5 3.6Z"/>
      </svg>
    `,
    laravel: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path fill="#FF2D20" d="M32 8.2 48.7 17v24.2L32 50l-16.7-8.8V17L32 8.2Zm0 5.1-11.7 6.1v8.8l7.2 3.7v12.4l4.5 2.4V30.8l11.9-6.2v-5.2L32 13.3Zm12.3 8.9-10.8 5.7V43l10.8-5.7V22.2Zm-18.1 12-5.9-3.1v7.2l5.9 3.1v-7.2Zm2.8-5 10.7-5.6-5.8-3.1-10.8 5.6 5.9 3.1Z"/>
      </svg>
    `,
    mysql: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path fill="#00758F" d="M53.8 20.8c-2.8-2.7-6.2-4.5-10.3-5.3-1.8-.4-3.8-.5-5.9-.4-1.6-2.7-4.4-4.5-7.6-5 1.9 1.5 3.1 3.2 3.7 5.1-3.6.8-6.9 2.4-9.8 4.8-2.6 2.2-4.8 4.9-6.4 8-2.3 4.5-3.1 9.5-2.4 14.4h4.4c-.2-3.7.6-7.4 2.4-10.7 1.2-2.3 2.9-4.4 4.9-6 .3 2.1.9 4 1.9 5.8-2.3 2.9-3.9 6.6-4.8 11h4.4c.7-3.1 1.8-5.8 3.3-8 1.7 1.8 3.7 3.4 6 4.6 2.4 1.3 5 2.2 7.9 2.7.2-1.1.7-2.1 1.5-2.9-4.5-.7-8.5-2.7-11.7-5.8 1.8-.3 3.6-.1 5.5.5 2.5.8 4.5 2.2 6 4.3.6-.9 1.5-1.6 2.6-2-1.3-3-3.6-5.3-6.9-6.8-2.1-1-4.2-1.4-6.4-1.4-.5-.9-.8-1.9-1-2.9 2.4-.7 5-.7 7.8-.1 3 .7 5.5 2.2 7.2 4.4.6-.6 1.5-1 2.5-1.2-1-2.9-3.1-5.2-6.2-7-3-1.7-6.4-2.6-10.1-2.5.3-1 .7-1.9 1.2-2.8 4.7-.3 8.9.7 12.5 2.9.5-1.3 1.5-2.4 2.9-3.2Z"/>
        <path fill="#00758F" d="M42.2 21.2c1.7 1.6 2.6 3.6 2.9 5.8l2.4-1.2-1.1 4.1-4-.7 2-.9c-.3-2.2-1.2-4.1-2.8-5.7l.6-1.4Z"/>
        <path fill="#F29111" d="M27.5 18.4c2-1.8 4.8-2.8 7.9-2.8 3.6 0 6.7 1.2 8.9 3.4L42 21c-1.6-1.6-3.8-2.4-6.6-2.4-2.6 0-4.8.8-6.3 2.3l-1.6-1.5Z"/>
        <circle cx="26.5" cy="20.4" r="1.7" fill="#F29111"/>
      </svg>
    `,
    vite: `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="vite-left" x1="15" y1="8" x2="31" y2="50" gradientUnits="userSpaceOnUse">
            <stop stop-color="#5BB9FF"/>
            <stop offset="1" stop-color="#41D1FF"/>
          </linearGradient>
          <linearGradient id="vite-right" x1="34" y1="10" x2="53" y2="50" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A26BFF"/>
            <stop offset="1" stop-color="#BD34FE"/>
          </linearGradient>
          <linearGradient id="vite-bolt" x1="34" y1="4" x2="34" y2="55" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFE266"/>
            <stop offset="1" stop-color="#FFC400"/>
          </linearGradient>
        </defs>
        <path fill="url(#vite-left)" d="M12 12.5 30.5 16 22.8 49.5c-.4 1.6-2.4 2.1-3.5.8L8.5 36.7c-.5-.6-.6-1.5-.3-2.2L12 12.5Z"/>
        <path fill="url(#vite-right)" d="m52.8 11.2-18.4 4.6 7.7 34.5c.3 1.6 2.3 2.2 3.4.9l10.4-12.8c.5-.6.7-1.5.4-2.3l-3.5-25Z"/>
        <path fill="url(#vite-bolt)" d="M36.7 4.5h8.3c1 0 1.8.9 1.6 1.9L42 27.3h7.5c1.3 0 2 1.4 1.1 2.4L29.8 58.5c-1 1.1-2.7 0-2.2-1.4l5.6-20.3h-8c-1 0-1.8-.9-1.6-1.9L34.5 5.8c.2-.8 1.1-1.3 2.2-1.3Z"/>
      </svg>
    `,
  }

  if (name === 'css') {
    return `<span class="${className}" aria-hidden="true"><img src="https://commons.wikimedia.org/wiki/Special:Redirect/file/CSS3_logo.svg" alt="" loading="lazy" decoding="async" /></span>`
  }

  return `<span class="${className}" aria-hidden="true">${icons[name] || ''}</span>`
}

const emojiCatalog = [
  ['😀', 'grinning face'], ['😃', 'smiley face'], ['😄', 'smile eyes'], ['😁', 'beaming smile'],
  ['😆', 'laughing'], ['😅', 'grin sweat'], ['😂', 'tears joy'], ['🤣', 'rolling laugh'],
  ['😊', 'soft smile'], ['🙂', 'slight smile'], ['😉', 'wink'], ['😍', 'heart eyes'],
  ['🥰', 'love face'], ['😘', 'kiss'], ['😎', 'cool sunglasses'], ['🤩', 'star eyes'],
  ['🥳', 'party'], ['😇', 'angel'], ['🤗', 'hug'], ['🫶', 'heart hands'],
  ['🤔', 'thinking'], ['🫡', 'salute'], ['🤭', 'giggle'], ['🤫', 'shush'],
  ['🤐', 'zip mouth'], ['😴', 'sleepy'], ['🤤', 'drooling'], ['😌', 'relieved'],
  ['😔', 'sad'], ['😢', 'cry'], ['😭', 'sob'], ['😤', 'steam nose'],
  ['😡', 'angry'], ['🤯', 'mind blown'], ['🥺', 'pleading'], ['😳', 'flushed'],
  ['😱', 'scream'], ['🤪', 'goofy'], ['😜', 'wink tongue'], ['😋', 'yum'],
  ['🥲', 'happy tears'], ['🤝', 'handshake'], ['👏', 'clap'], ['🙌', 'raise hands'],
  ['👍', 'thumbs up'], ['🔥', 'fire'], ['✨', 'sparkles'], ['🌟', 'glowing star'],
  ['💯', 'hundred'], ['🎉', 'celebration'], ['❤️', 'red heart'], ['💚', 'green heart'],
  ['💙', 'blue heart'], ['💬', 'speech bubble'], ['📩', 'message'], ['🚀', 'rocket'],
  ['🎯', 'target'], ['📌', 'pin'], ['💡', 'idea'], ['✅', 'check']
]

const stickerCatalog = [
  ['Mega Hi', '👋', 'Wave hello in a bold sticker style', 'green'],
  ['Cute Love', '💚', 'Soft green love sticker', 'mint'],
  ['Big Mood', '😎', 'Cool response sticker', 'gold'],
  ['Nice One', '👏', 'Celebrate a great message', 'peach'],
  ['LOL Burst', '😂', 'Laugh-out-loud sticker', 'yellow'],
  ['Party Time', '🥳', 'Celebration sticker pack', 'pink'],
  ['Good Job', '🏆', 'Winning reaction sticker', 'amber'],
  ['Sweet Thanks', '🙏', 'Warm thank-you sticker', 'beige'],
  ['Fast Reply', '⚡', 'Quick-response sticker', 'electric'],
  ['On Fire', '🔥', 'High-energy sticker', 'orange'],
  ['Star Reply', '🌟', 'Highlight sticker', 'gold'],
  ['Heart Drop', '💕', 'Soft affectionate sticker', 'rose'],
  ['Calm Okay', '🙂', 'Gentle positive reply', 'mint'],
  ['Power Yes', '✅', 'Strong approval sticker', 'green'],
  ['No Worries', '👌', 'Easy-going reassurance', 'beige'],
  ['Mind Blown', '🤯', 'Huge reaction sticker', 'electric'],
  ['Great Work', '💯', 'Top-tier response', 'amber'],
  ['Coffee Time', '☕', 'Break-time sticker', 'mocha'],
  ['Night Mode', '🌙', 'Late-night reply mood', 'navy'],
  ['Boss Move', '😏', 'Confident reaction sticker', 'gold'],
  ['Lovely Day', '🌼', 'Soft cheerful sticker', 'yellow'],
  ['Gaming Win', '🎮', 'Fun reaction sticker', 'purple'],
  ['Rocket Up', '🚀', 'Launch the conversation', 'electric'],
  ['Shiny Idea', '💡', 'Smart thought sticker', 'amber']
]

const gifCatalog = [
  ['Happy Dance', 'Celebrate the moment with movement', 'neon-wave'],
  ['Typing Fast', 'Rapid-fire conversation energy', 'speed-lines'],
  ['Mic Drop', 'For the perfect final reply', 'spotlight'],
  ['Big Applause', 'Reaction for a strong message', 'pulse-stage'],
  ['Victory Loop', 'Winning moment GIF vibe', 'confetti-pop'],
  ['Smooth Entrance', 'Stylish arrival energy', 'glow-sweep'],
  ['Mood Booster', 'Bright positive response', 'green-bounce'],
  ['Laugh Loop', 'Funny reaction moment', 'orbit-smile'],
  ['Green Pulse', 'Brand-matching animated feel', 'heart-pulse'],
  ['Focus Mode', 'Calm productive conversation', 'line-rhythm'],
  ['Weekend Vibe', 'Light casual mood', 'sun-float'],
  ['Instant Yes', 'Fast approval reaction', 'check-flash'],
  ['Late Reply', 'A dramatic comeback effect', 'delay-pop'],
  ['Wow Energy', 'High-reaction animated card', 'star-burst'],
  ['Soft Loop', 'Gentle elegant motion', 'soft-fade'],
  ['Glow Reply', 'Premium response motion', 'glow-sweep'],
  ['Heart Beat', 'Warm emotional response', 'heart-pulse'],
  ['Party Mode', 'Animated celebration feel', 'confetti-pop'],
  ['Status Live', 'Active, on-screen energy', 'signal-bars'],
  ['Fast Lane', 'Quick-response visual mood', 'speed-lines'],
  ['Hero Entry', 'Big arrival animation', 'spotlight'],
  ['Green Flow', 'Smooth branded motion', 'green-bounce'],
  ['Comic Pop', 'Playful punchy reaction', 'star-burst'],
  ['Midnight Loop', 'Cool darker animated card', 'night-flicker']
]

function filteredPickerItems(tab, query = '') {
  const search = query.trim().toLowerCase()
  const source = tab === 'emoji'
    ? emojiCatalog.map(([value, label]) => ({ type: 'emoji', value, label }))
    : tab === 'sticker'
      ? stickerCatalog.map(([title, value, label, theme]) => ({ type: 'sticker', title, value, label, theme }))
      : gifCatalog.map(([title, label, theme]) => ({ type: 'gif', title, value: `[GIF: ${title}]`, label, theme }))

  if (!search) {
    return source
  }

  return source.filter((item) =>
    [item.title, item.label, item.value].filter(Boolean).some((text) => text.toLowerCase().includes(search))
  )
}

function pickerPanelView(pickerState) {
  if (!pickerState?.open) {
    return ''
  }

  const items = pickerState.tab === 'emoji'
    ? filteredPickerItems(pickerState.tab, pickerState.query)
    : (pickerState.remote?.[pickerState.tab] || [])

  const itemMarkup = pickerState.loading
    ? '<p class="picker-empty">Loading media...</p>'
    : items.map((item) => {
      if (item.type === 'emoji') {
        return `<button type="button" class="picker-emoji" data-picker-item="${escapeHtml(item.value)}" title="${escapeHtml(item.label)}">${escapeHtml(item.value)}</button>`
      }

      if (item.type === 'sticker') {
        return `
        <button type="button" class="picker-card sticker-card network-card" data-picker-media-type="sticker" data-picker-media-src="${escapeHtml(item.original)}" data-picker-media-title="${escapeHtml(item.title)}">
          <span class="picker-sticker-scene">
            <img src="${escapeHtml(item.preview)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" />
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `
      }

      return `
      <button type="button" class="picker-card gif-card network-card" data-picker-media-type="gif" data-picker-media-src="${escapeHtml(item.original)}" data-picker-media-title="${escapeHtml(item.title)}">
        <span class="gif-preview">
          <img src="${escapeHtml(item.preview)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" />
        </span>
        <span class="gif-pill">GIF</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </button>
    `
    }).join('')

  return `
    <div class="picker-panel">
      <div class="picker-tabs">
        <button type="button" class="picker-tab ${pickerState.tab === 'emoji' ? 'active' : ''}" data-picker-tab="emoji">${icon('smile', 'picker-tab-icon')}Emoji</button>
        <button type="button" class="picker-tab ${pickerState.tab === 'sticker' ? 'active' : ''}" data-picker-tab="sticker">${icon('sparkles', 'picker-tab-icon')}Stickers</button>
        <button type="button" class="picker-tab ${pickerState.tab === 'gif' ? 'active' : ''}" data-picker-tab="gif">${icon('gif', 'picker-tab-icon')}GIFs</button>
      </div>
      <label class="picker-search">
        ${icon('search', 'chat-search-icon')}
        <input id="picker-search" type="text" placeholder="${pickerState.tab === 'emoji' ? 'Search emoji' : `Search ${pickerState.tab}s on GIPHY`}" value="${escapeHtml(pickerState.query || '')}" />
      </label>
      <div class="picker-body ${pickerState.tab === 'emoji' ? 'emoji-mode' : ''}">
        ${itemMarkup || '<p class="picker-empty">No results found.</p>'}
      </div>
      ${pickerState.error ? `<p class="picker-empty">${escapeHtml(pickerState.error)}</p>` : ''}
    </div>
  `
}

function attachmentPanelView(toolbarState) {
  if (!toolbarState?.attachOpen) {
    return ''
  }

  return `
    <div class="attach-panel">
      <button type="button" class="attach-panel-item" data-attach-action="image">
        ${icon('image', 'attach-panel-icon')}
        <span>
          <strong>Photo</strong>
          <small>Upload an image into chat</small>
        </span>
      </button>
      <button type="button" class="attach-panel-item" data-attach-action="file">
        ${icon('file', 'attach-panel-icon')}
        <span>
          <strong>Document</strong>
          <small>Share a file attachment</small>
        </span>
      </button>
      <button type="button" class="attach-panel-item" data-attach-action="gif">
        ${icon('gif', 'attach-panel-icon')}
        <span>
          <strong>GIF</strong>
          <small>Open the live GIF picker</small>
        </span>
      </button>
      <button type="button" class="attach-panel-item" data-attach-action="sticker">
        ${icon('sparkles', 'attach-panel-icon')}
        <span>
          <strong>Sticker</strong>
          <small>Open sticker suggestions</small>
        </span>
      </button>
    </div>
  `
}

function formatCallDuration(startedAt) {
  if (!startedAt) {
    return '00:00'
  }

  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatMessageTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  }).toLowerCase()
}

function formatSidebarDay(value) {
  if (!value) {
    return 'Today'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Today'
  }

  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()

  if (sameDay) {
    return 'Today'
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function callStatusText(callState) {
  if (!callState?.contact) {
    return ''
  }

  if (callState.phase === 'incoming') {
    return `${callState.mode === 'video' ? 'Incoming video call' : 'Incoming voice call'} from ${callState.contact.name}`
  }

  if (callState.phase === 'outgoing') {
    return `${callState.mode === 'video' ? 'Calling on video' : 'Calling on voice'}...`
  }

  return callState.remoteConnected
    ? 'Connected securely over WebRTC'
    : 'Connecting media streams...'
}

function renderProfilePanel({ panelLabel, entity, heroNote, statItems, detailItems, sectionTitle }) {
  return `
    <aside id="chat-profile-panel" class="chat-profile-panel">
      <div class="chat-profile-head">
        <button type="button" class="chat-profile-close" data-profile-close>${icon('back', 'chat-toolbar-icon')}</button>
        <span class="chat-profile-label">${escapeHtml(panelLabel)}</span>
      </div>

      <div class="chat-profile-hero">
        <span class="avatar chat-profile-avatar">${escapeHtml(entity.name?.slice(0, 1) || '?')}</span>
        <strong>${escapeHtml(entity.name)}</strong>
        <span>${escapeHtml(entity.email)}</span>
        <p class="chat-profile-note">${escapeHtml(heroNote)}</p>
      </div>

      <div class="chat-profile-stats">
        ${statItems.map((item) => `
          <div class="chat-profile-stat">
            <strong>${escapeHtml(item.value)}</strong>
            <span>${escapeHtml(item.label)}</span>
          </div>
        `).join('')}
      </div>

      <div class="chat-profile-section">
        <div class="chat-profile-section-head">
          <span class="eyebrow">${escapeHtml(sectionTitle)}</span>
        </div>
        <div class="chat-profile-grid">
          ${detailItems.map((item) => `
            <div class="chat-profile-card">
              <span class="eyebrow">${escapeHtml(item.title)}</span>
              <p>${escapeHtml(item.body)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </aside>
  `
}

function profilePanelView(selectedUser, messages, toolbarState) {
  if (!toolbarState?.profileOpen || !selectedUser) {
    return ''
  }

  const mediaCount = messages.filter((message) =>
    message.type === 'gif' || message.type === 'sticker' || message.type === 'image' || message.type === 'file'
  ).length

  return renderProfilePanel({
    panelLabel: 'Contact Info',
    entity: selectedUser,
    heroNote: 'Direct contact inside the Let\'s chat workspace.',
    statItems: [
      { value: 'Online', label: 'Current status' },
      { value: String(mediaCount), label: 'Shared items' },
      { value: '1:1', label: 'Conversation type' },
    ],
    sectionTitle: 'Profile Details',
    detailItems: [
      { title: 'About', body: 'Available for focused one-to-one conversation inside the project workspace.' },
      { title: 'Shared Media', body: `${mediaCount} media items exchanged in this conversation so far.` },
      { title: 'Availability', body: 'Ready for messaging, profile viewing, and call actions when enabled.' },
    ],
  })
}

function selfProfilePanelView(user, messages, toolbarState) {
  if (!toolbarState?.selfProfileOpen || !user) {
    return ''
  }

  const mediaCount = messages.filter((message) =>
    message.type === 'gif' || message.type === 'sticker' || message.type === 'image' || message.type === 'file'
  ).length
  const isGuest = String(user.id).startsWith('guest-')

  return renderProfilePanel({
    panelLabel: 'My Profile',
    entity: user,
    heroNote: isGuest
      ? 'Open access profile while backend authentication is still being completed.'
      : 'Primary account profile inside the Let\'s chat workspace.',
    statItems: [
      { value: isGuest ? 'Guest' : 'Secure', label: 'Access mode' },
      { value: String(mediaCount), label: 'Visible media' },
      { value: 'Ready', label: 'Workspace state' },
    ],
    sectionTitle: 'Account Details',
    detailItems: [
      { title: 'About', body: isGuest ? 'You are using open login mode for build-time access to the product.' : 'You are signed in with a full backend-backed account.' },
      { title: 'Shared Media', body: `${mediaCount} media items are visible in the current active thread.` },
      { title: 'Availability', body: isGuest ? 'Messaging is available now. Calling will fully activate after backend auth is turned back on.' : 'Messaging, profile tools, and calling are available from this account.' },
    ],
  })
}

function callOverlayView(callState) {
  if (!callState?.session || !callState?.contact) {
    return ''
  }

  const isVideo = callState.mode === 'video'
  const isIncoming = callState.phase === 'incoming'
  const isActive = callState.phase === 'active'
  const duration = formatCallDuration(callState.startedAt)

  return `
    <div class="call-overlay ${isVideo ? 'video-mode' : 'voice-mode'} ${isIncoming ? 'incoming-mode' : ''}">
      <div class="call-card">
        <audio id="call-remote-audio" autoplay playsinline></audio>
        ${isVideo ? `
          <div class="call-video-stage">
            <div class="call-remote-screen">
              <video id="call-remote-video" class="call-video call-video-remote" autoplay playsinline></video>
              <div class="call-video-hud">
                <span class="eyebrow">${isVideo ? 'Video call' : 'Voice call'}</span>
                <div class="call-video-meta">
                  <h3>${escapeHtml(callState.contact.name)}</h3>
                  <p>${escapeHtml(callStatusText(callState))}${isActive ? ` · ${duration}` : ''}</p>
                </div>
              </div>
              ${!callState.remoteConnected ? `<div class="call-video-placeholder">${escapeHtml(callState.contact.name)}</div>` : ''}
              <div class="call-local-screen ${callState.cameraOff ? 'camera-off' : ''}">
                <video id="call-local-video" class="call-video call-video-local" autoplay playsinline muted></video>
                ${callState.cameraOff ? '<span>Camera off</span>' : ''}
              </div>
            </div>
          </div>
        ` : ''}
        ${!isVideo ? `
          <span class="eyebrow">Voice call</span>
          <span class="avatar call-avatar">${escapeHtml(callState.contact.name?.slice(0, 1) || '?')}</span>
          <h3>${escapeHtml(callState.contact.name)}</h3>
          <p>${escapeHtml(callState.contact.email)}</p>
          <span class="call-status">${escapeHtml(callStatusText(callState))}</span>
          ${isActive ? `<span class="call-timer">${duration}</span>` : ''}
        ` : ''}
        <div class="call-actions ${isIncoming ? 'incoming-actions' : ''}">
          ${isIncoming ? `
            <button type="button" class="button button-secondary call-accept" data-call-action="accept">Accept</button>
            <button type="button" class="button button-secondary call-decline" data-call-action="decline">Decline</button>
          ` : `
            <button type="button" class="chat-icon-button call-action ${callState.muted ? 'active' : ''}" data-call-action="mute">${icon('mic', 'chat-toolbar-icon')}</button>
            ${isVideo ? `<button type="button" class="chat-icon-button call-action ${callState.cameraOff ? 'active' : ''}" data-call-action="camera">${icon('video', 'chat-toolbar-icon')}</button>` : ''}
            <button type="button" class="chat-send-button call-end" data-call-action="end">${icon('phone', 'chat-toolbar-icon')}</button>
          `}
        </div>
      </div>
    </div>
  `
}

function publicNav() {
  return `
    <a href="/login" data-link class="nav-link">Login</a>
    <a href="/register" data-link class="button button-primary">Register</a>
  `
}

function appFrame(content, topbarActions = publicNav()) {
  return `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a href="/" data-link class="brand" aria-label="Let's chat home">
            <span class="brand-mark" aria-hidden="true"></span>
            <span class="brand-text">Let's chat</span>
          </a>
          <nav class="topbar-actions">
            ${topbarActions}
          </nav>
        </div>
      </header>
      ${content}
    </div>
  `
}

export function homeView() {
  return appFrame(`
    <main class="main home-main">
      <section class="hero hero-panel">
        <div class="hero-copy">
          <p class="eyebrow">Messaging platform</p>
          <h1>Professional messaging experience with a clearer first impression.</h1>
          <p class="lead">
            Let's chat is a browser-based messaging application built with plain HTML, CSS, and JavaScript
            on the frontend and Laravel on the backend. It gives users a clean entry point, a readable auth flow,
            and a direct one-to-one chat experience without unnecessary product noise.
          </p>
          <div class="hero-actions">
            <a href="/register" data-link class="button button-primary">${icon('userPlus', 'button-icon')}Create account</a>
            <a href="/login" data-link class="button button-secondary">${icon('lock', 'button-icon')}Login</a>
            <a href="/chat" data-link class="button button-secondary">${icon('chat', 'button-icon')}Open chat</a>
          </div>
          <div class="hero-metrics">
            <div class="metric-item">
              ${icon('mail', 'surface-icon')}
              <strong>Email-based access</strong>
              <span>Simple onboarding with standard registration and login.</span>
            </div>
            <div class="metric-item">
              ${icon('bubbles', 'surface-icon')}
              <strong>Direct conversations</strong>
              <span>Focused private messaging between registered users.</span>
            </div>
            <div class="metric-item">
              ${icon('server', 'surface-icon')}
              <strong>Laravel API layer</strong>
              <span>Authentication, users, and message history handled cleanly.</span>
            </div>
          </div>
        </div>

        <div class="card preview-card">
          <div class="window-dots"><span></span><span></span><span></span></div>
          <div class="preview-body">
            <aside class="preview-sidebar">
              <div class="preview-sidebar-head">
                <h3>Recent chats</h3>
                <span>3 active contacts</span>
              </div>
              <div class="preview-user active"><span class="avatar">P</span><div><b>Priya</b><small>Can the homepage explain the app clearly?</small></div></div>
              <div class="preview-user"><span class="avatar">A</span><div><b>Arjun</b><small>Backend and frontend are both connected.</small></div></div>
              <div class="preview-user"><span class="avatar">N</span><div><b>Nisha</b><small>The UI should feel cleaner and more intentional.</small></div></div>
            </aside>
            <div class="preview-chat">
              <div class="preview-chathead"><strong>Conversation preview</strong><span>Private one-to-one thread</span></div>
              <div class="bubble">The platform should explain the product before users log in.</div>
              <div class="bubble own">This homepage introduces the app, the workflow, and the stack before the user enters the chat dashboard.</div>
              <div class="bubble">That makes the project feel more complete and easier to trust.</div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">What the project does</p>
          <h2 class="feature-heading">A focused chat product with a clean flow and clear purpose.</h2>
        </div>
        <div class="grid feature-grid">
          <article class="card feature-card">${icon('bubbles', 'surface-icon')}<p class="eyebrow">Messaging</p><h3>Direct conversation</h3><p>Users open individual threads and exchange messages without unnecessary product complexity.</p></article>
          <article class="card feature-card">${icon('mail', 'surface-icon')}<p class="eyebrow">Onboarding</p><h3>Email-based access</h3><p>Sign-up and login are standard, testable, and easy to understand from the first visit.</p></article>
          <article class="card feature-card">${icon('server', 'surface-icon')}<p class="eyebrow">Backend</p><h3>Laravel structure</h3><p>The backend exposes clear routes for authentication, user listing, and message history.</p></article>
          <article class="card feature-card">${icon('window', 'surface-icon')}<p class="eyebrow">Interface</p><h3>Responsive layout</h3><p>The UI adapts to smaller screens without changing the core messaging experience.</p></article>
        </div>
      </section>

      <section class="section split">
        <article class="card process-card">
          ${icon('route', 'surface-icon')}
          <div class="section-heading compact">
            <p class="eyebrow">How it works</p>
            <h2>From sign-up to conversation in four simple steps.</h2>
          </div>
          <ol class="list numbered">
            <li>Create an account or sign in with existing credentials.</li>
            <li>Open the dashboard and browse the registered user list.</li>
            <li>Select a contact to load the conversation thread.</li>
            <li>Send messages and continue from saved chat history later.</li>
          </ol>
        </article>

        <article class="card process-card">
          ${icon('shield', 'surface-icon')}
          <div class="section-heading compact">
            <p class="eyebrow">Rule book</p>
            <h2>How Let's chat should be used.</h2>
          </div>
          <ul class="list">
            <li>Use valid account details so identities remain clear in the chat list.</li>
            <li>Keep communication respectful and relevant to the platform purpose.</li>
            <li>Check the selected contact before sending a message.</li>
            <li>Log out on shared systems to keep your account protected.</li>
          </ul>
        </article>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Road Map</p>
          <h2 class="roadmap-heading">How the project works from first visit to active conversation.</h2>
        </div>
        <div class="card roadmap-card">
          <div class="roadmap-strip">
            <article class="roadmap-tile active">
              <span class="roadmap-badge">01</span>
              <span class="roadmap-arrow" aria-hidden="true"></span>
              <strong>Visit</strong>
              <p>Users land on the homepage and understand the product fast.</p>
            </article>
            <article class="roadmap-tile">
              <span class="roadmap-badge">02</span>
              <span class="roadmap-arrow" aria-hidden="true"></span>
              <strong>Register</strong>
              <p>Create an account with name, email, and password.</p>
            </article>
            <article class="roadmap-tile">
              <span class="roadmap-badge">03</span>
              <span class="roadmap-arrow" aria-hidden="true"></span>
              <strong>Login</strong>
              <p>Laravel authenticates the user and opens protected access.</p>
            </article>
            <article class="roadmap-tile">
              <span class="roadmap-badge">04</span>
              <span class="roadmap-arrow" aria-hidden="true"></span>
              <strong>Select</strong>
              <p>Pick a contact from the available user list.</p>
            </article>
            <article class="roadmap-tile">
              <span class="roadmap-badge">05</span>
              <span class="roadmap-arrow" aria-hidden="true"></span>
              <strong>Message</strong>
              <p>Send and receive messages in a clean direct thread.</p>
            </article>
            <article class="roadmap-tile">
              <span class="roadmap-badge">06</span>
              <strong>Continue</strong>
              <p>Return later and continue the same conversation flow.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Technology</p>
          <h2 class="stack-heading">A practical stack built for a full messaging flow.</h2>
        </div>
        <div class="card stack-card">
          <div class="stack-row">
            <span class="tech-pill">${icon('html', 'tech-icon')}HTML</span>
            <span class="tech-pill">${icon('css', 'tech-icon')}CSS</span>
            <span class="tech-pill">${icon('js', 'tech-icon')}JavaScript</span>
            <span class="tech-pill">${icon('php', 'tech-icon tech-icon-wide')}PHP</span>
            <span class="tech-pill">${icon('laravel', 'tech-icon')}Laravel</span>
            <span class="tech-pill">${icon('mysql', 'tech-icon')}MySQL</span>
            <span class="tech-pill">${icon('vite', 'tech-icon')}Vite</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="final-cta card">
          <div>
            <p class="eyebrow">Start using it</p>
            <h2>Start using it by clicking One</h2>
            <p class="section-copy">Choose Register or Login to move directly into the product flow.</p>
          </div>
          <div class="hero-actions">
            <a href="/register" data-link class="button button-primary">${icon('userPlus', 'button-icon')}Register now</a>
            <a href="/login" data-link class="button button-secondary">${icon('lock', 'button-icon')}Login</a>
          </div>
        </div>
      </section>
    </main>
  `)
}

export function authView(type) {
  const isLogin = type === 'login'

  if (isLogin) {
    return `
      <div class="login-page">
        <header class="login-header">
          <div class="login-header-inner">
            <a href="/" data-link class="brand" aria-label="Let's chat home">
              <span class="brand-mark" aria-hidden="true"></span>
              <span class="brand-text">Let's chat</span>
            </a>
            <nav class="topbar-actions">
              <a href="/login" data-link class="nav-link">Login</a>
              <a href="/register" data-link class="button button-primary">Register</a>
            </nav>
          </div>
        </header>
        <main class="login-main">
          <section class="login-card">
            <div class="login-copy">
              <p class="eyebrow">Account Login</p>
              <h1>Log in with email</h1>
              <p>Enter your email and password to continue chatting from this browser.</p>
            </div>
            <div id="auth-error" class="error-box hidden"></div>
            <form id="auth-form" class="login-form" action="javascript:void(0)" method="post" novalidate>
              <label class="login-field">
                <span>Email</span>
                <input name="email" type="email" placeholder="you@example.com" autocomplete="email" required />
              </label>
              <label class="login-field">
                <span>Password</span>
                <input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" minlength="6" maxlength="15" pattern="(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\\d]).{6,15}" required />
              </label>
              <label class="remember-row">
                <input type="checkbox" checked />
                <span>Stay logged in on this browser</span>
              </label>
              <button type="submit" class="login-submit">Sign In</button>
            </form>
            <p class="login-switch">Don't have an account? <a href="/register" data-link>Create one</a></p>
          </section>
        </main>
      </div>
    `
  }

  const authClass = 'register-mode'

  return appFrame(`
    <main class="main auth-main">
      <section class="card auth-card ${authClass}">
        <div class="auth-hero">
          <div class="auth-badge" aria-hidden="true">
            ${icon('userPlus', 'surface-icon')}
          </div>
          <div class="section-heading compact">
            <p class="eyebrow">Create your space</p>
            <h2>Register and open your account</h2>
            <p class="section-copy">Set up your name, email, and password once, then move straight into Let's chat.</p>
          </div>
          <div class="auth-note-grid">
            <div class="auth-note-card">
              <strong>Fresh profile</strong>
              <span>Your name and email become your visible identity in the chat list.</span>
            </div>
            <div class="auth-note-card">
              <strong>Ready to start</strong>
              <span>Once registered, the app can take you directly into messaging.</span>
            </div>
          </div>
        </div>
        <div id="auth-error" class="error-box hidden"></div>
        <form id="auth-form" class="auth-form" action="javascript:void(0)" method="post" novalidate>
          <label class="field"><span>${icon('user', 'field-icon')}Name</span><input name="name" type="text" placeholder="Your name" autocomplete="name" maxlength="255" required /></label>
          <label class="field"><span>${icon('mail', 'field-icon')}Email</span><input name="email" type="email" placeholder="you@example.com" autocomplete="email" required /></label>
          <label class="field"><span>${icon('lock', 'field-icon')}Password</span><input name="password" type="password" placeholder="6 to 15 chars with letter, number, symbol" autocomplete="new-password" minlength="6" maxlength="15" pattern="(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,15}" required /></label>
          <label class="field"><span>${icon('lock', 'field-icon')}Confirm Password</span><input name="password_confirmation" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" maxlength="15" pattern="(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,15}" required /></label>
          <button type="submit" class="button button-primary button-wide">${icon('userPlus', 'button-icon')}Create Account</button>
        </form>
        <p class="auth-switch">Already have an account? <a href="/login" data-link>Log in</a></p>
      </section>
    </main>
  `)
}

export function loadingView() {
  return `
    <section class="transition-screen" aria-label="Loading chat">
      <div class="transition-shell">
        <h1 class="transition-title">Let's Text</h1>
        <div class="transition-progress" aria-hidden="true">
          <span id="transition-progress-bar" style="width: 0%"></span>
        </div>
        <p id="transition-progress-label" class="transition-percent">0%</p>
        <p class="transition-copy">loading to your chat</p>
      </div>
    </section>
  `
}

export function emptyThreadView() {
  return `
    <div class="chat-empty">
      <div class="chat-empty-card">
        ${icon('chat', 'chat-empty-icon')}
        <h2>Select a conversation</h2>
        <p>Choose a contact from the left side to open the thread and start messaging.</p>
      </div>
    </div>
  `
}

export function messagesPaneView({ selectedUser, messages, currentUserId, pickerState, toolbarState, callState }) {
  if (!selectedUser) {
    return emptyThreadView()
  }

  const messageSearch = toolbarState?.searchQuery?.trim().toLowerCase() || ''
  const filteredMessages = messageSearch
    ? messages.filter((message) => (message.content || '').toLowerCase().includes(messageSearch))
    : messages

  const messagesMarkup = filteredMessages
    .map((message) => {
      const own = String(message.sender_id) === String(currentUserId)
      const timeLabel = formatMessageTime(message.created_at)
      const isImage = message.type === 'gif' || message.type === 'sticker' || message.type === 'image'
      const isFile = message.type === 'file'

      return `
        <div class="chat-message-row ${own ? 'own' : ''}">
          <div class="chat-message-bubble ${own ? 'own' : ''}">
            ${isImage
              ? `<span class="chat-media">
                  <a class="chat-media-link" href="${escapeHtml(message.media_url || '#')}" target="_blank" rel="noreferrer">
                    <img src="${escapeHtml(message.media_url || '')}" alt="${escapeHtml(message.content || message.type)}" loading="lazy" decoding="async" />
                  </a>
                  <span class="chat-media-meta">
                    <span class="chat-media-label">${escapeHtml(message.content || message.type)}</span>
                    <a class="chat-media-download" href="${escapeHtml(message.media_url || '#')}" download="${escapeHtml(message.content || 'image')}">Download</a>
                  </span>
                </span>`
              : isFile
                ? `<a class="chat-file-card" href="${escapeHtml(message.media_url || '#')}" download="${escapeHtml(message.content || 'attachment')}">
                    <span class="chat-file-icon">${icon('file', 'chat-toolbar-icon')}</span>
                    <span class="chat-file-copy">
                      <strong>${escapeHtml(message.content || 'Attachment')}</strong>
                      <span>Tap to download</span>
                    </span>
                  </a>`
              : `<span class="chat-message-text">${escapeHtml(message.content)}</span>`
            }
            <span class="chat-message-time">${timeLabel}</span>
          </div>
        </div>
      `
    })
    .join('')

  return `
    <div class="chat-thread">
      <div class="chat-thread-head">
        <div class="chat-thread-contact">
          <span class="avatar chat-thread-avatar">${escapeHtml(selectedUser.name?.slice(0, 1) || '?')}</span>
          <div>
            <strong>${escapeHtml(selectedUser.name)}</strong>
            <span>${escapeHtml(selectedUser.email)}</span>
          </div>
        </div>
        <div class="chat-thread-actions">
          <button type="button" class="chat-icon-button" data-thread-action="video">${icon('video', 'chat-toolbar-icon')}</button>
          <button type="button" class="chat-icon-button" data-thread-action="call">${icon('phone', 'chat-toolbar-icon')}</button>
          <button type="button" class="chat-icon-button" data-thread-action="search">${icon('search', 'chat-toolbar-icon')}</button>
          <button type="button" class="chat-icon-button" data-thread-action="menu">${icon('menu', 'chat-toolbar-icon')}</button>
        </div>
      </div>
      ${toolbarState?.banner ? `<div class="chat-toolbar-banner">${escapeHtml(toolbarState.banner)}</div>` : ''}
      ${toolbarState?.searchOpen ? `
        <div class="chat-thread-searchbar">
          ${icon('search', 'chat-search-icon')}
          <input id="thread-search-input" type="text" placeholder="Search messages in this conversation" value="${escapeHtml(toolbarState.searchQuery || '')}" />
        </div>
      ` : ''}
      ${toolbarState?.menuOpen ? `
        <div class="chat-thread-menu">
          <button type="button" data-menu-action="info">Contact Info</button>
          <button type="button" data-menu-action="clear">Clear Chat</button>
        </div>
      ` : ''}
      <div class="chat-thread-messages">
        ${messagesMarkup || '<p class="chat-placeholder">No matching messages found.</p>'}
      </div>
      <form id="message-form" class="chat-input-bar">
        <button type="button" class="chat-composer-icon" data-attach-toggle>${icon('plus', 'chat-toolbar-icon')}</button>
        <button type="button" class="chat-composer-icon" data-picker-toggle>${icon('smile', 'chat-toolbar-icon')}</button>
        <textarea id="message-input" name="message" placeholder="Type a message..." autocomplete="off" maxlength="1000" rows="1" required>${escapeHtml(pickerState?.draft || '')}</textarea>
        <button type="submit" class="chat-send-button">${icon('send', 'chat-toolbar-icon')}</button>
        <input id="attach-image-input" type="file" accept="image/*" hidden />
        <input id="attach-file-input" type="file" hidden />
      </form>
      ${attachmentPanelView(toolbarState)}
      ${pickerPanelView(pickerState)}
      ${callOverlayView(callState)}
    </div>
  `
}

export function chatView({ user, users, selectedUserId, messages, pickerState, toolbarState, callState }) {
  const selectedUser = users.find((chatUser) => chatUser.id === selectedUserId)
  const hasProfilePanel = Boolean(toolbarState?.selfProfileOpen || toolbarState?.profileOpen)
  const sidebarSearch = toolbarState?.sidebarQuery?.trim().toLowerCase() || ''
  const visibleUsers = sidebarSearch
    ? users.filter((chatUser) =>
      [chatUser.name, chatUser.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(sidebarSearch))
    )
    : users
  const usersMarkup = visibleUsers
    .map((chatUser) => {
      const activeThreadPreview = chatUser.id === selectedUserId && messages.length
        ? messages[messages.length - 1]
        : null
      const previewSource = activeThreadPreview
        ? (activeThreadPreview.content || `${activeThreadPreview.type} message`)
        : `Message ${chatUser.name} directly`
      const previewDay = activeThreadPreview ? formatSidebarDay(activeThreadPreview.created_at) : 'Today'

      return `
        <button class="user-item ${selectedUserId === chatUser.id ? 'active' : ''}" data-user-id="${chatUser.id}">
          <span class="avatar chat-list-avatar">${escapeHtml(chatUser.name?.slice(0, 1) || '?')}</span>
          <span class="user-copy">
            <span class="user-row-top">
              <strong>${escapeHtml(chatUser.name)}</strong>
              <small>${escapeHtml(previewDay)}</small>
            </span>
            <small>${escapeHtml(previewSource || chatUser.email)}</small>
          </span>
        </button>
      `
    })
    .join('')

  return `
    <div class="chat-page">
      <aside class="chat-rail">
        <a href="/" data-link class="chat-rail-button">${icon('back', 'chat-rail-icon')}</a>
        <button type="button" class="chat-rail-button ${toolbarState?.activeRail === 'chats' ? 'active' : ''}" data-rail-action="chats">${icon('chat', 'chat-rail-icon')}</button>
        <button type="button" class="chat-rail-button ${toolbarState?.activeRail === 'media' ? 'active' : ''}" data-rail-action="media">${icon('bubbles', 'chat-rail-icon')}</button>
        <button type="button" class="chat-rail-button ${toolbarState?.activeRail === 'account' ? 'active' : ''}" data-rail-action="account">${icon('user', 'chat-rail-icon')}</button>
        <div class="chat-rail-spacer"></div>
        <button id="logout-button" type="button" class="chat-rail-button">${icon('lock', 'chat-rail-icon')}</button>
      </aside>

      <section class="chat-shell ${hasProfilePanel ? 'profile-open' : ''}">
        <aside class="chat-sidebar">
          <div class="chat-sidebar-top">
            <div>
              <h1>Let's chat</h1>
              <span>${escapeHtml(user?.name || 'User')} · ${escapeHtml(user?.email || '')}</span>
            </div>
            </div>

          <label class="chat-search">
            ${icon('search', 'chat-search-icon')}
            <input id="sidebar-search-input" type="text" placeholder="Search or start a new chat" value="${escapeHtml(toolbarState?.sidebarQuery || '')}" />
          </label>

          <div class="chat-user-list">
            ${usersMarkup || '<p class="chat-placeholder">No users found.</p>'}
          </div>
        </aside>

        <section class="chat-content">
          ${messagesPaneView({
            selectedUser,
            messages,
            currentUserId: user?.id,
            pickerState,
            toolbarState,
            callState,
          })}
        </section>
        ${toolbarState?.selfProfileOpen ? selfProfilePanelView(user, messages, toolbarState) : profilePanelView(selectedUser, messages, toolbarState)}
      </section>
    </div>
  `
}
