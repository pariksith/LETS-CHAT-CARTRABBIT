import { api } from './api.js'
import { GIPHY_API_KEY, SIGNALING_WS_URL, WEBRTC_ICE_SERVERS } from './config.js'
import { byId, mount, root } from './dom.js'
import { getPath, navigate } from './router.js'
import { resetChatState, setGuestMode, setSelectedUserId, setToken, setUsers, state } from './state.js'
import { chatPartialView, chatView, threadMessagesMarkupView, userPreviewLineMarkupView } from './views.js'
import { bindCommonEvents } from './events.js'
const CALL_POLL_MS = 2000
const CALL_SOCKET_RECONNECT_MS = 1500
const MESSAGE_POLL_MS = 1200
const HEARTBEAT_INTERVAL = 30000
const DELIVERY_CHECK_INTERVAL = 10000
const USER_POLL_MS = 20000
const DELIVERY_POLL_MS = 2500
const HEARTBEAT_MS = 25000
const RECORDING_TICK_MS = 250
const ICE_CONFIG = {
  iceServers: WEBRTC_ICE_SERVERS,
}
const THEME_STORAGE_KEY = 'chat-theme'
const CONVERSATION_CACHE_STORAGE_KEY = 'chat-conversation-cache-v1'
const themeState = {
  mode: localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light',
}

const pickerState = {
  open: false,
  tab: 'emoji',
  query: '',
  loading: false,
  error: '',
  remote: {
    gif: [],
    sticker: [],
  },
  draft: '',
}

const toolbarState = {
  banner: '',
  sidebarQuery: '',
  searchOpen: false,
  searchQuery: '',
  threadLoading: false,
  menuOpen: false,
  profileOpen: false,
  selfProfileOpen: false,
  attachOpen: false,
  activeRail: 'chats',
}

const callState = {
  session: null,
  contact: null,
  mode: '',
  phase: 'idle',
  startedAt: 0,
  muted: false,
  cameraOff: false,
  remoteConnected: false,
}

const recordingState = {
  active: false,
  sending: false,
  durationMs: 0,
  startedAt: 0,
  recorder: null,
  stream: null,
  targetUserId: null,
  mimeType: '',
}

const pickerFallback = {
  gif: [],
  sticker: [],
}

let pollTimerId = 0
let messagePollTimerId = 0
let userPollTimerId = 0
let deliveryPollTimerId = 0
let heartbeatTimerId = 0
let polling = false
let peerConnection = null
let localStream = null
let remoteStream = null
let activeCallId = null
let lastClosedCallId = null
let composerResizeFrame = 0
let profilePanelScrollTop = 0
let profilePanelScrollLeft = 0
let pickerSearchTimeoutId = 0
let pickerRequestId = 0
let lastCallSnapshot = ''
let messageRequestId = 0
let rerenderFrameId = 0
let recordingTickTimerId = 0
let threadLoadingTimerId = 0
let optimisticMessageId = 0
let messageRefreshInFlight = false
let userRefreshInFlight = false
let activeConversationUserId = null
let activeConversationLoaded = false
let activeConversationBootstrapUserId = null
let activeConversationBootstrapPromise = null
let railEventsBound = false
let callSocket = null
let callSocketAuthenticated = false
let callSocketReconnectTimerId = 0
let callSocketShouldReconnect = false
const pendingSocketCandidates = []
const appliedRemoteCandidates = new Set()
const conversationCache = loadConversationCache()

function canPollNetwork() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function loadConversationCache() {
  try {
    const raw = localStorage.getItem(CONVERSATION_CACHE_STORAGE_KEY)

    if (!raw) {
      return new Map()
    }

    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return new Map()
    }

    return new Map(
      Object.entries(parsed).map(([userId, messages]) => [
        String(userId),
        Array.isArray(messages) ? messages : [],
      ])
    )
  } catch {
    return new Map()
  }
}

function persistConversationCache() {
  try {
    const serialized = {}

    conversationCache.forEach((messages, userId) => {
      serialized[userId] = Array.isArray(messages) ? messages.slice(-80) : []
    })

    localStorage.setItem(CONVERSATION_CACHE_STORAGE_KEY, JSON.stringify(serialized))
  } catch {}
}

function getConversationCache(userId) {
  return conversationCache.get(String(userId)) || null
}

function setConversationCache(userId, messages) {
  conversationCache.set(String(userId), [...messages])
  persistConversationCache()
}

function getConversationPreviews() {
  const previews = {}

  conversationCache.forEach((messages, userId) => {
    if (messages.length > 0) {
      previews[userId] = messages[messages.length - 1]
    }
  })

  return previews
}

function getConversationPreview(userId) {
  const messages = getConversationCache(userId)

  if (!messages?.length) {
    return null
  }

  return messages[messages.length - 1]
}

function getMessageTimestamp(message) {
  if (!message?.created_at) {
    return 0
  }

  const timestamp = new Date(message.created_at).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function isSameConversation(userId) {
  return Number(userId) > 0 && Number(state.selectedUserId) === Number(userId)
}

function getConversationMessages(userId) {
  if (isSameConversation(userId)) {
    return [...state.messages]
  }

  return [...(getConversationCache(userId) || [])]
}

function setActiveConversationState(userId, messages, options = {}) {
  const normalizedUserId = Number(userId)
  const loaded = options.loaded !== false

  state.messages = Array.isArray(messages) ? messages : []

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    activeConversationUserId = null
    activeConversationLoaded = false
    return
  }

  activeConversationUserId = normalizedUserId
  activeConversationLoaded = loaded
}

function isActiveConversationReady(userId) {
  return Number(userId) > 0 &&
    Number(activeConversationUserId) === Number(userId) &&
    activeConversationLoaded
}

function setConversationMessages(userId, messages) {
  if (!userId) {
    return
  }

  const nextMessages = sortMessagesChronologically(messages)

  if (isSameConversation(userId)) {
    setActiveConversationState(userId, nextMessages)
  }

  setConversationCache(userId, nextMessages)
}

function isOptimisticMessageForUser(message, userId) {
  return Boolean(
    message?.optimistic &&
    state.user?.id &&
    userId &&
    String(message.sender_id) === String(state.user.id) &&
    String(message.receiver_id) === String(userId)
  )
}

function messagesLikelyMatch(localMessage, remoteMessage) {
  if (!localMessage || !remoteMessage) {
    return false
  }

  if (
    String(localMessage.sender_id) !== String(remoteMessage.sender_id) ||
    String(localMessage.receiver_id) !== String(remoteMessage.receiver_id)
  ) {
    return false
  }

  if ((localMessage.type || 'text') !== (remoteMessage.type || 'text')) {
    return false
  }

  if ((localMessage.content || '') !== (remoteMessage.content || '')) {
    return false
  }

  if (Number(localMessage.duration_seconds || 0) !== Number(remoteMessage.duration_seconds || 0)) {
    return false
  }

  const localTimestamp = getMessageTimestamp(localMessage)
  const remoteTimestamp = getMessageTimestamp(remoteMessage)

  if (localTimestamp && remoteTimestamp) {
    if (remoteTimestamp < localTimestamp - 1000) {
      return false
    }

    if (remoteTimestamp > localTimestamp + 15000) {
      return false
    }
  }

  return true
}

function sortMessagesChronologically(messages) {
  return [...messages].sort((left, right) => {
    const timestampDifference = getMessageTimestamp(left) - getMessageTimestamp(right)

    if (timestampDifference !== 0) {
      return timestampDifference
    }

    if (Boolean(left.optimistic) !== Boolean(right.optimistic)) {
      return left.optimistic ? 1 : -1
    }

    return String(left.id || '').localeCompare(String(right.id || ''))
  })
}

function mergeMessagesWithOptimisticLocal(userId, serverMessages) {
  const optimisticMessages = getConversationMessages(userId).filter((message) => isOptimisticMessageForUser(message, userId))

  if (!optimisticMessages.length) {
    return serverMessages
  }

  const mergedMessages = [...serverMessages]

  optimisticMessages.forEach((localMessage) => {
    const matchedServerMessage = serverMessages.some((serverMessage) =>
      String(serverMessage.id) === String(localMessage.id) || messagesLikelyMatch(localMessage, serverMessage)
    )

    if (!matchedServerMessage) {
      mergedMessages.push(localMessage)
    }
  })

  return sortMessagesChronologically(mergedMessages)
}

function haveMessagesChanged(currentMessages, nextMessages) {
  if (currentMessages.length !== nextMessages.length) {
    return true
  }

  for (let i = 0; i < nextMessages.length; i++) {
    const currentMessage = currentMessages[i]
    const nextMessage = nextMessages[i]

    if (
      !currentMessage ||
      !nextMessage ||
      currentMessage.id !== nextMessage.id ||
      currentMessage.updated_at !== nextMessage.updated_at ||
      currentMessage.read_at !== nextMessage.read_at ||
      currentMessage.delivered_at !== nextMessage.delivered_at ||
      currentMessage.created_at !== nextMessage.created_at ||
      currentMessage.content !== nextMessage.content ||
      currentMessage.media_url !== nextMessage.media_url ||
      Boolean(currentMessage.optimistic) !== Boolean(nextMessage.optimistic)
    ) {
      return true
    }
  }

  return false
}

function shouldRerenderAfterConfirmation(previousMessage, confirmedMessage) {
  if (!previousMessage || !confirmedMessage) {
    return true
  }

  return !(
    previousMessage.type === confirmedMessage.type &&
    (previousMessage.content || '') === (confirmedMessage.content || '') &&
    (previousMessage.media_url || '') === (confirmedMessage.media_url || '') &&
    Number(previousMessage.duration_seconds || 0) === Number(confirmedMessage.duration_seconds || 0) &&
    String(previousMessage.sender_id) === String(confirmedMessage.sender_id) &&
    String(previousMessage.receiver_id) === String(confirmedMessage.receiver_id) &&
    Boolean(previousMessage.delivered_at) === Boolean(confirmedMessage.delivered_at) &&
    Boolean(previousMessage.read_at) === Boolean(confirmedMessage.read_at)
  )
}

function resolveRecordedMimeType(recorder, fallbackMimeType = '', chunks = []) {
  const chunkMimeType = chunks.find((chunk) => typeof chunk?.type === 'string' && chunk.type.trim())?.type || ''
  return recorder?.mimeType || chunkMimeType || fallbackMimeType || 'audio/webm'
}

function getUserSortTimestamp(user) {
  const preview = getConversationPreview(user.id)

  if (preview) {
    return getMessageTimestamp(preview)
  }

  if (user?.last_seen_at) {
    const timestamp = new Date(user.last_seen_at).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  if (user?.created_at) {
    const timestamp = new Date(user.created_at).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  return 0
}

function sortUsersForSidebar(users) {
  return [...users].sort((left, right) => {
    if (Boolean(left.is_online) !== Boolean(right.is_online)) {
      return left.is_online ? -1 : 1
    }

    const timestampDifference = getUserSortTimestamp(right) - getUserSortTimestamp(left)

    if (timestampDifference !== 0) {
      return timestampDifference
    }

    return (left.name || '').localeCompare(right.name || '')
  })
}

function getPreferredSelectedUserId(users) {
  if (!users.length) {
    return null
  }

  if (state.selectedUserId && users.some((user) => user.id === state.selectedUserId)) {
    return state.selectedUserId
  }

  return sortUsersForSidebar(users)[0].id
}

function clearActiveConversationLocally() {
  if (!state.selectedUserId) {
    return
  }

  messageRequestId += 1
  setActiveConversationState(state.selectedUserId, [])
  conversationCache.set(String(state.selectedUserId), [])
  persistConversationCache()
}

function cancelThreadLoadingIndicator() {
  if (!threadLoadingTimerId) {
    return
  }

  window.clearTimeout(threadLoadingTimerId)
  threadLoadingTimerId = 0
}

function startThreadLoadingIndicator() {
  cancelThreadLoadingIndicator()

  if (toolbarState.threadLoading) {
    return
  }

  toolbarState.threadLoading = true
  requestChatRender()
}

function stopThreadLoadingIndicator() {
  cancelThreadLoadingIndicator()
  toolbarState.threadLoading = false
}

function applyTheme(mode = themeState.mode) {
  const nextMode = mode === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = nextMode
  document.body.dataset.theme = nextMode
  document.body.classList.toggle('theme-dark', nextMode === 'dark')
}

function setTheme(mode) {
  themeState.mode = mode === 'dark' ? 'dark' : 'light'
  localStorage.setItem(THEME_STORAGE_KEY, themeState.mode)
  applyTheme(themeState.mode)
}

function toggleTheme() {
  setTheme(themeState.mode === 'dark' ? 'light' : 'dark')
  toolbarState.activeRail = 'theme'
  requestChatRender()
}

applyTheme()

function normalizeRemoteItem(item, type) {
  return {
    type,
    id: item.id,
    title: item.title || `${type} item`,
    label: item.username || item.source_tld || 'Powered by GIPHY',
    preview: item.images?.fixed_width?.url || item.images?.downsized?.url || item.images?.original?.url || '',
    original: item.images?.original?.url || item.images?.fixed_width?.url || item.images?.downsized?.url || '',
    insertValue: item.images?.original?.url || item.url || '',
  }
}

function getCallPeer(session) {
  if (!session || !state.user) {
    return null
  }

  return Number(session.caller_id) === Number(state.user.id)
    ? session.callee
    : session.caller
}

function isCaller(session) {
  return Number(session?.caller_id) === Number(state.user?.id)
}

function normalizeStartedAt(session) {
  if (!session?.started_at) {
    return 0
  }

  const value = new Date(session.started_at).getTime()
  return Number.isNaN(value) ? 0 : value
}

function setCallSession(session, phase) {
  callState.session = session
  callState.contact = getCallPeer(session)
  callState.mode = session?.type || ''
  callState.phase = phase
  callState.startedAt = normalizeStartedAt(session) || callState.startedAt || Date.now()
}

function clearCallState() {
  callState.session = null
  callState.contact = null
  callState.mode = ''
  callState.phase = 'idle'
  callState.startedAt = 0
  callState.muted = false
  callState.cameraOff = false
  callState.remoteConnected = false
  lastCallSnapshot = ''
}

function stopStream(stream) {
  if (!stream) {
    return
  }

  stream.getTracks().forEach((track) => track.stop())
}

function ensureMediaPlayback(element) {
  if (!element || typeof element.play !== 'function') {
    return
  }

  const playPromise = element.play()

  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {})
  }
}

function attachCallMedia() {
  const localVideo = byId('call-local-video')
  const remoteVideo = byId('call-remote-video')
  const remoteAudio = byId('call-remote-audio')

  if (localVideo) {
    localVideo.srcObject = localStream || null
    localVideo.muted = true
    ensureMediaPlayback(localVideo)
  }

  if (remoteVideo) {
    remoteVideo.srcObject = remoteStream || null
    ensureMediaPlayback(remoteVideo)
  }

  if (remoteAudio) {
    remoteAudio.srcObject = remoteStream || null
    remoteAudio.autoplay = true
    ensureMediaPlayback(remoteAudio)
  }
}

function syncProfilePanelPosition() {
  if (!toolbarState.profileOpen && !toolbarState.selfProfileOpen) {
    return
  }

  const panel = byId('chat-profile-panel')

  if (panel) {
    panel.style.scrollBehavior = 'auto'
  }
}

function getThreadScrollState() {
  const container = root.querySelector('.chat-thread-messages')

  if (!container) {
    return null
  }

  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

  return {
    scrollTop: container.scrollTop,
    distanceFromBottom,
    shouldStickToBottom: distanceFromBottom < 24,
  }
}

function restoreThreadScrollState(scrollState) {
  const container = root.querySelector('.chat-thread-messages')

  if (!container || !scrollState) {
    return
  }

  if (scrollState.shouldStickToBottom) {
    container.scrollTop = container.scrollHeight
    return
  }

  const nextTop = container.scrollHeight - container.clientHeight - scrollState.distanceFromBottom
  container.scrollTop = Math.max(0, nextTop)
}

function getProfileScrollState() {
  const panel = byId('chat-profile-panel')

  if (!panel) {
    return {
      scrollTop: profilePanelScrollTop,
      scrollLeft: profilePanelScrollLeft,
    }
  }

  profilePanelScrollTop = panel.scrollTop
  profilePanelScrollLeft = panel.scrollLeft

  return {
    scrollTop: panel.scrollTop,
    scrollLeft: panel.scrollLeft,
  }
}

function restoreProfileScrollState(scrollState) {
  const panel = byId('chat-profile-panel')

  if (!panel || !scrollState) {
    return
  }

  const nextTop = scrollState.scrollTop ?? profilePanelScrollTop
  const nextLeft = scrollState.scrollLeft ?? profilePanelScrollLeft

  panel.scrollTop = nextTop
  panel.scrollLeft = nextLeft
  profilePanelScrollTop = nextTop
  profilePanelScrollLeft = nextLeft
}

function getComposerFocusState() {
  const input = byId('message-input')

  if (!input || document.activeElement !== input) {
    return null
  }

  return {
    selectionStart: input.selectionStart ?? input.value.length,
    selectionEnd: input.selectionEnd ?? input.value.length,
  }
}

function restoreComposerFocusState(focusState) {
  if (!focusState) {
    return
  }

  const input = byId('message-input')

  if (!input) {
    return
  }

  input.focus({ preventScroll: true })
  input.setSelectionRange(focusState.selectionStart, focusState.selectionEnd)
}

function updateRecordingDurationLabel() {
  const label = byId('chat-recording-duration')

  if (!label) {
    return
  }

  label.textContent = formatDuration(Math.floor((recordingState.durationMs || 0) / 1000))
}

function updateSlotMarkup(element, markup) {
  if (!element || element.innerHTML === markup) {
    return false
  }

  element.innerHTML = markup
  return true
}

function syncMarkupChildren(element, markup) {
  if (!element) {
    return false
  }

  const template = document.createElement('template')
  template.innerHTML = markup.trim()

  const nextChildren = Array.from(template.content.children)
  const currentChildren = Array.from(element.children)
  const sharedLength = Math.min(currentChildren.length, nextChildren.length)
  let changed = false

  for (let index = 0; index < sharedLength; index += 1) {
    const currentChild = currentChildren[index]
    const nextChild = nextChildren[index]

    if (currentChild.outerHTML === nextChild.outerHTML) {
      continue
    }

    currentChild.replaceWith(nextChild)
    changed = true
  }

  if (currentChildren.length > nextChildren.length) {
    currentChildren.slice(nextChildren.length).forEach((child) => child.remove())
    changed = true
  }

  if (nextChildren.length > currentChildren.length) {
    const fragment = document.createDocumentFragment()
    nextChildren.slice(currentChildren.length).forEach((child) => {
      fragment.append(child)
    })
    element.append(fragment)
    changed = true
  }

  return changed
}

function getSidebarPreviewFallback(user) {
  if (!user) {
    return ''
  }

  const displayName = user.name || 'contact'
  const normalizedName = (user.name || '').trim().toLowerCase()
  const hasDuplicateName = normalizedName && state.users.some((candidate) => (
    candidate.id !== user.id &&
    (candidate.name || '').trim().toLowerCase() === normalizedName
  ))

  return hasDuplicateName ? (user.email || '') : `Message ${displayName} directly`
}

function syncSelectedUserPreviewOnly() {
  if (!state.selectedUserId) {
    return
  }

  const previewLine = root.querySelector(`[data-user-id="${state.selectedUserId}"] .user-preview-line`)
  const selectedUser = state.users.find((user) => user.id === state.selectedUserId)

  if (!previewLine || !selectedUser) {
    return
  }

  const nextMarkup = userPreviewLineMarkupView({
    previewMessage: getConversationPreview(state.selectedUserId),
    currentUserId: state.user?.id,
    fallbackLabel: getSidebarPreviewFallback(selectedUser),
  })

  updateSlotMarkup(previewLine, nextMarkup)
}

function rerenderThreadMessagesOnly() {
  const container = root.querySelector('.chat-thread-messages')

  if (!container) {
    return false
  }

  const scrollState = getThreadScrollState()
  const nextMarkup = threadMessagesMarkupView({
    messages: state.messages,
    currentUserId: state.user?.id,
    toolbarState,
  })
  const updated = syncMarkupChildren(container, nextMarkup)

  if (updated) {
    window.requestAnimationFrame(() => {
      restoreThreadScrollState(scrollState)
    })
  }

  syncSelectedUserPreviewOnly()

  return true
}

function rerenderSidebarUsersOnly() {
  const container = root.querySelector('.chat-user-list')
  if (!container) return false

  const partial = chatPartialView(getChatUiState())
  const template = document.createElement('template')
  template.innerHTML = partial.sidebar.trim()

  const nextList = template.content.querySelector('.chat-user-list')
  if (nextList) {
    syncMarkupChildren(container, nextList.innerHTML)
  }
  return true
}

function rerenderChat() {
  if (getPath() !== '/chat' || !state.token) {
    return
  }

  if (rerenderFrameId) {
    window.cancelAnimationFrame(rerenderFrameId)
    rerenderFrameId = 0
  }

  const threadScrollState = getThreadScrollState()
  const profileScrollState = getProfileScrollState()
  const composerFocusState = getComposerFocusState()
  const nextView = {
    user: state.user,
    users: state.users,
    selectedUserId: state.selectedUserId,
    messages: state.messages,
    pickerState,
    toolbarState,
    callState,
    recordingState,
    themeMode: themeState.mode,
    conversationPreviews: getConversationPreviews(),
  }
  const chatPage = root.querySelector('.chat-page')
  const chatShell = byId('chat-shell')
  const sidebarSlot = byId('chat-sidebar-slot')
  const contentSlot = byId('chat-content-slot')
  const profileSlot = byId('chat-profile-slot')

  if (chatPage && chatShell && sidebarSlot && contentSlot && profileSlot) {
    const partial = chatPartialView(nextView)
    if (chatPage.className !== partial.pageClassName) {
      chatPage.className = partial.pageClassName
    }
    if (chatShell.className !== partial.shellClassName) {
      chatShell.className = partial.shellClassName
    }
    updateSlotMarkup(sidebarSlot, partial.sidebar)
    updateSlotMarkup(contentSlot, partial.content)
    updateSlotMarkup(profileSlot, partial.profile)
  } else {
    mount(
      chatView(nextView),
      { animate: false }
    )
  }

  bindCommonEvents()
  bindChatEvents()
  window.requestAnimationFrame(() => {
    restoreThreadScrollState(threadScrollState)
    restoreProfileScrollState(profileScrollState)
    restoreComposerFocusState(composerFocusState)
    attachCallMedia()
    updateRecordingDurationLabel()
    syncProfilePanelPosition()
    window.setTimeout(syncProfilePanelPosition, 0)
    window.setTimeout(syncProfilePanelPosition, 60)
  })
}

function requestChatRender() {
  if (getPath() !== '/chat' || !state.token) {
    return
  }

  if (rerenderFrameId) {
    return
  }

  rerenderFrameId = window.requestAnimationFrame(() => {
    rerenderFrameId = 0
    rerenderChat()
  })
}

function isCallSocketReady() {
  return Boolean(callSocket && callSocket.readyState === WebSocket.OPEN && callSocketAuthenticated)
}

function queueSocketCandidate(sessionId, candidate) {
  pendingSocketCandidates.push({
    sessionId: Number(sessionId),
    candidate,
  })
}

async function flushSocketCandidates(sessionId = callState.session?.id) {
  if (!peerConnection?.remoteDescription || !sessionId) {
    return
  }

  for (let index = pendingSocketCandidates.length - 1; index >= 0; index--) {
    const entry = pendingSocketCandidates[index]

    if (Number(entry.sessionId) !== Number(sessionId)) {
      continue
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(entry.candidate))
      pendingSocketCandidates.splice(index, 1)
    } catch {}
  }
}

function scheduleCallSocketReconnect() {
  if (!callSocketShouldReconnect || !state.token || callSocketReconnectTimerId) {
    return
  }

  callSocketReconnectTimerId = window.setTimeout(() => {
    callSocketReconnectTimerId = 0
    connectCallSocket()
  }, CALL_SOCKET_RECONNECT_MS)
}

async function handleSignaledSession(session) {
  if (!session) {
    return
  }

  await hydrateCallSession(session)
}

async function handleSignaledCandidate(payload) {
  if (!payload?.candidate || !payload?.sessionId) {
    return
  }

  if (!callState.session || Number(callState.session.id) !== Number(payload.sessionId)) {
    queueSocketCandidate(payload.sessionId, payload.candidate)
    return
  }

  if (!peerConnection?.remoteDescription) {
    queueSocketCandidate(payload.sessionId, payload.candidate)
    return
  }

  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
  } catch {}
}

function handleCallSocketMessage(event) {
  let payload = null

  try {
    payload = JSON.parse(event.data)
  } catch {
    return
  }

  if (!payload || typeof payload !== 'object') {
    return
  }

  if (payload.type === 'auth.ok') {
    callSocketAuthenticated = true
    stopCallPolling()
    return
  }

  if (payload.type === 'auth.error') {
    callSocketAuthenticated = false
    callSocket?.close()
    return
  }

  if (payload.type === 'call.offer' || payload.type === 'call.answer' || payload.type === 'call.decline' || payload.type === 'call.end') {
    void handleSignaledSession(payload.session)
    return
  }

  if (payload.type === 'call.candidate') {
    void handleSignaledCandidate(payload)
  }
}

function connectCallSocket() {
  if (!state.token || typeof WebSocket === 'undefined') {
    return
  }

  if (callSocket && (callSocket.readyState === WebSocket.OPEN || callSocket.readyState === WebSocket.CONNECTING)) {
    return
  }

  callSocketShouldReconnect = true
  callSocketAuthenticated = false

  try {
    const socket = new WebSocket(SIGNALING_WS_URL)
    callSocket = socket

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'auth',
        token: state.token,
      }))
    })

    socket.addEventListener('message', handleCallSocketMessage)

    socket.addEventListener('close', () => {
      if (callSocket === socket) {
        callSocket = null
      }

      callSocketAuthenticated = false

      if (callSocketShouldReconnect && state.token) {
        ensureCallPolling()
        scheduleCallSocketReconnect()
      }
    })

    socket.addEventListener('error', () => {})
  } catch {
    ensureCallPolling()
    scheduleCallSocketReconnect()
  }
}

function disconnectCallSocket() {
  callSocketShouldReconnect = false
  callSocketAuthenticated = false

  if (callSocketReconnectTimerId) {
    window.clearTimeout(callSocketReconnectTimerId)
    callSocketReconnectTimerId = 0
  }

  if (callSocket) {
    const socket = callSocket
    callSocket = null
    socket.close()
  }
}

function sendCallSignal(type, payload = {}) {
  if (!isCallSocketReady()) {
    return false
  }

  callSocket.send(JSON.stringify({
    type,
    ...payload,
  }))

  return true
}

function focusSidebarSearchSoon() {
  window.requestAnimationFrame(() => {
    byId('sidebar-search-input')?.focus()
  })
}

function bindElementOnce(element, bindingKey, eventName, handler, options) {
  if (!element) {
    return
  }

  const marker = `__chatBound${bindingKey}`

  if (element[marker]) {
    return
  }

  element.addEventListener(eventName, handler, options)
  element[marker] = true
}

function bindRailEvents() {
  if (!root || railEventsBound) {
    return
  }

  railEventsBound = true

  root.addEventListener('click', (event) => {
    const railButton = event.target.closest('[data-rail-action]')

    if (railButton && root.contains(railButton)) {
      if (recordingState.active || recordingState.sending) {
        showToolbarBanner('Finish the voice message before leaving this conversation.')
        return
      }

      const action = railButton.dataset.railAction

      if (action === 'chats') {
        toolbarState.activeRail = 'chats'
        toolbarState.selfProfileOpen = false
        toolbarState.profileOpen = false
        pickerState.open = false
        toolbarState.attachOpen = false
        toolbarState.menuOpen = false
        toolbarState.searchOpen = false
        requestChatRender()
        focusSidebarSearchSoon()
        return
      }

      if (action === 'media') {
        toolbarState.activeRail = 'media'
        toolbarState.selfProfileOpen = false
        toolbarState.profileOpen = false
        toolbarState.attachOpen = false
        toolbarState.menuOpen = false
        toolbarState.searchOpen = false
        pickerState.open = true
        pickerState.tab = 'emoji'
        requestChatRender()
        return
      }

      if (action === 'account') {
        toolbarState.activeRail = 'account'
        toolbarState.profileOpen = false
        toolbarState.selfProfileOpen = !toolbarState.selfProfileOpen
        pickerState.open = false
        toolbarState.attachOpen = false
        toolbarState.menuOpen = false
        toolbarState.searchOpen = false

        if (!toolbarState.selfProfileOpen) {
          toolbarState.activeRail = 'chats'
        }

        requestChatRender()
        return
      }

      if (action === 'theme') {
        toolbarState.profileOpen = false
        toolbarState.selfProfileOpen = false
        pickerState.open = false
        toolbarState.attachOpen = false
        toolbarState.menuOpen = false
        toolbarState.searchOpen = false
        toggleTheme()
      }

      return
    }

    const logoutButton = event.target.closest('#logout-button')

    if (logoutButton && root.contains(logoutButton)) {
      if (recordingState.active || recordingState.sending) {
        showToolbarBanner('Finish the voice message before leaving this conversation.')
        return
      }

      handleLogout()
    }
  })
}

function resizeComposerInput(element) {
  if (!element) {
    return
  }

  if (composerResizeFrame) {
    window.cancelAnimationFrame(composerResizeFrame)
  }

  composerResizeFrame = window.requestAnimationFrame(() => {
    const currentHeight = element.style.height
    
    // Temporarily reset height to measure true scrollHeight
    element.style.transition = 'none'
    element.style.height = '1px'
    const nextHeight = Math.min(element.scrollHeight, 120)
    
    // Restore and animate to new height
    element.style.height = currentHeight
    
    // Force layout recalculation so the browser knows we are animating from currentHeight
    void element.offsetHeight
    
    element.style.transition = '' // Restore CSS transition
    element.style.height = `${nextHeight}px`
    element.style.overflowY = element.scrollHeight > 120 ? 'auto' : 'hidden'
    
    composerResizeFrame = 0
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.readAsDataURL(file)
  })
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to process the recorded audio.'))
    reader.readAsDataURL(blob)
  })
}

function nextOptimisticMessageId() {
  optimisticMessageId += 1
  return `temp-${Date.now()}-${optimisticMessageId}`
}

function buildOptimisticMessage({ type, content, mediaUrl = null, durationSeconds = null, receiverId = state.selectedUserId }) {
  const now = new Date().toISOString()

  return {
    id: nextOptimisticMessageId(),
    sender_id: state.user?.id,
    receiver_id: receiverId,
    type,
    content,
    media_url: mediaUrl,
    duration_seconds: durationSeconds,
    created_at: now,
    updated_at: now,
    delivered_at: null,
    read_at: null,
    sender: state.user ? { id: state.user.id, name: state.user.name } : null,
    receiver: state.users.find((user) => user.id === receiverId) || null,
    optimistic: true,
  }
}

function pushOptimisticMessage(message, conversationUserId = message?.receiver_id, options = {}) {
  if (!conversationUserId) {
    return
  }

  const nextMessages = [...getConversationMessages(conversationUserId), message]
  setConversationMessages(conversationUserId, nextMessages)

  if (isSameConversation(conversationUserId)) {
    if (options.renderMode === 'messages' && rerenderThreadMessagesOnly()) {
      return
    }

    requestChatRender()
  }
}

function replaceOptimisticMessage(tempId, confirmedMessage, conversationUserId = confirmedMessage?.receiver_id) {
  if (!conversationUserId) {
    return
  }

  const previousMessages = getConversationMessages(conversationUserId)
  const previousMessage = previousMessages.find((message) => String(message.id) === String(tempId)) || null
  let replaced = false
  let alreadyPresent = false

  let nextMessages = previousMessages.map((message) => {
    if (String(message.id) === String(confirmedMessage.id)) {
      alreadyPresent = true
      return confirmedMessage
    }

    if (String(message.id) !== String(tempId)) {
      return message
    }

    replaced = true
    return confirmedMessage
  })

  if (!replaced && !alreadyPresent) {
    const matchedMessageIndex = nextMessages.findIndex((message) => messagesLikelyMatch(message, confirmedMessage))

    if (matchedMessageIndex >= 0) {
      alreadyPresent = true
      nextMessages = nextMessages.map((message, index) => (
        index === matchedMessageIndex
          ? confirmedMessage
          : message
      ))
    }
  }

  if (!replaced && !alreadyPresent) {
    nextMessages = [...nextMessages, confirmedMessage]
  }

  setConversationMessages(conversationUserId, nextMessages)

  if (isSameConversation(conversationUserId) && (!replaced || shouldRerenderAfterConfirmation(previousMessage, confirmedMessage))) {
    if (rerenderThreadMessagesOnly()) {
      return
    }

    requestChatRender()
  }
}

function removeOptimisticMessage(tempId, conversationUserId = state.selectedUserId, options = {}) {
  if (!conversationUserId) {
    return
  }

  const nextMessages = getConversationMessages(conversationUserId)
    .filter((message) => String(message.id) !== String(tempId))

  setConversationMessages(conversationUserId, nextMessages)

  if (isSameConversation(conversationUserId)) {
    if (options.renderMode === 'messages' && rerenderThreadMessagesOnly()) {
      return
    }

    requestChatRender()
  }
}

function showToolbarBanner(message) {
  toolbarState.banner = message
  requestChatRender()

  window.clearTimeout(showToolbarBanner.timeoutId)
  showToolbarBanner.timeoutId = window.setTimeout(() => {
    toolbarState.banner = ''
    requestChatRender()
  }, 2600)
}

function bootstrapSelectedConversation(userId) {
  const normalizedUserId = Number(userId)

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    return Promise.resolve(false)
  }

  if (
    activeConversationBootstrapPromise &&
    Number(activeConversationBootstrapUserId) === normalizedUserId
  ) {
    return activeConversationBootstrapPromise
  }

  const cachedMessages = getConversationCache(normalizedUserId)
  const hasCachedMessages = cachedMessages !== null

  if (hasCachedMessages) {
    setActiveConversationState(normalizedUserId, cachedMessages)
    stopThreadLoadingIndicator()
  } else {
    setActiveConversationState(normalizedUserId, [], { loaded: false })
    startThreadLoadingIndicator()
  }

  activeConversationBootstrapUserId = normalizedUserId
  activeConversationBootstrapPromise = loadMessages(normalizedUserId)
    .then((didChange) => {
      if (didChange) {
        requestChatRender()
        return true
      }

      if (!hasCachedMessages) {
        rerenderChat()
      }

      return false
    })
    .catch((error) => {
      if (!hasCachedMessages) {
        stopThreadLoadingIndicator()
        showToolbarBanner(error.message || 'Unable to load this conversation.')
      }

      return false
    })
    .finally(() => {
      if (Number(activeConversationBootstrapUserId) === normalizedUserId) {
        stopThreadLoadingIndicator()
      }

      if (Number(activeConversationBootstrapUserId) === normalizedUserId) {
        activeConversationBootstrapUserId = null
        activeConversationBootstrapPromise = null
      }
    })

  return activeConversationBootstrapPromise
}

export function primeSelectedConversation(userId) {
  return bootstrapSelectedConversation(userId)
}

function hydrateChatBootstrap(payload) {
  if (!payload || typeof payload !== 'object') {
    return
  }

  const users = Array.isArray(payload.users) ? payload.users : []
  setUsers(sortUsersForSidebar(users))

  const selectedUserId = Number(payload.selected_user_id)

  if (!Number.isFinite(selectedUserId) || selectedUserId <= 0) {
    setSelectedUserId(null)
    setActiveConversationState(null, [], { loaded: true })
    stopThreadLoadingIndicator()
    return
  }

  setSelectedUserId(selectedUserId)
  setConversationMessages(selectedUserId, Array.isArray(payload.messages) ? payload.messages : [])
  stopThreadLoadingIndicator()
}

export async function prepareChatAfterAuth() {
  const query = state.selectedUserId
    ? `?selected_user_id=${encodeURIComponent(state.selectedUserId)}`
    : ''
  const payload = await api(`/chat/bootstrap${query}`, { method: 'GET' })

  hydrateChatBootstrap(payload)
}

function resetPeerState() {
  if (peerConnection) {
    peerConnection.onicecandidate = null
    peerConnection.ontrack = null
    peerConnection.onconnectionstatechange = null
    peerConnection.close()
    peerConnection = null
  }

  stopStream(localStream)
  localStream = null

  stopStream(remoteStream)
  remoteStream = null

  activeCallId = null
  appliedRemoteCandidates.clear()
  pendingSocketCandidates.length = 0
  callState.remoteConnected = false
  callState.muted = false
  callState.cameraOff = false
}

async function endSessionOnServer(reason = 'end') {
  if (!callState.session?.id || !state.token) {
    return null
  }

  const endpoint = reason === 'decline'
    ? `/calls/${callState.session.id}/decline`
    : `/calls/${callState.session.id}/end`

  try {
    return await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {
    return null
  }
}

function finalizeCall(reasonMessage = '') {
  if (callState.session?.id) {
    lastClosedCallId = callState.session.id
  }

  resetPeerState()
  clearCallState()

  if (reasonMessage) {
    showToolbarBanner(reasonMessage)
    return
  }

  requestChatRender()
}

function settleCallTerminationInBackground({ reason = 'end', contactId = 0 } = {}) {
  void (async () => {
    const session = await endSessionOnServer(reason)

    if (session && contactId) {
      sendCallSignal(reason === 'decline' ? 'call.decline' : 'call.end', {
        toUserId: contactId,
        session,
      })
    }
  })()
}

function stopCallPolling() {
  if (pollTimerId) {
    window.clearInterval(pollTimerId)
    pollTimerId = 0
  }
}

function stopChatPolling() {
  if (messagePollTimerId) {
    window.clearInterval(messagePollTimerId)
    messagePollTimerId = 0
  }

  if (userPollTimerId) {
    window.clearInterval(userPollTimerId)
    userPollTimerId = 0
  }

  if (deliveryPollTimerId) {
    window.clearInterval(deliveryPollTimerId)
    deliveryPollTimerId = 0
  }

  if (heartbeatTimerId) {
    window.clearInterval(heartbeatTimerId)
    heartbeatTimerId = 0
  }
}

function stopRecordingTicker() {
  if (recordingTickTimerId) {
    window.clearInterval(recordingTickTimerId)
    recordingTickTimerId = 0
  }
}

function stopRecordingStream() {
  if (!recordingState.stream) {
    return
  }

  recordingState.stream.getTracks().forEach((track) => track.stop())
  recordingState.stream = null
}

function resetRecordingState() {
  stopRecordingTicker()
  stopRecordingStream()
  recordingState.active = false
  recordingState.sending = false
  recordingState.durationMs = 0
  recordingState.startedAt = 0
  recordingState.recorder = null
  recordingState.targetUserId = null
  recordingState.mimeType = ''
}

async function flushRemoteCandidates(session) {
  if (!peerConnection?.remoteDescription) {
    return
  }

  const remoteCandidates = isCaller(session)
    ? (session.callee_candidates || [])
    : (session.caller_candidates || [])

  for (const candidateData of remoteCandidates) {
    const key = JSON.stringify(candidateData)

    if (appliedRemoteCandidates.has(key)) {
      continue
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData))
      appliedRemoteCandidates.add(key)
    } catch {}
  }
}

async function createPeerConnection(session) {
  if (peerConnection && activeCallId === session.id) {
    return peerConnection
  }

  resetPeerState()

  remoteStream = new MediaStream()
  activeCallId = session.id
  peerConnection = new RTCPeerConnection(ICE_CONFIG)

  localStream?.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate || !callState.session?.id) {
      return
    }

    const targetUserId = Number(callState.contact?.id || 0)

    try {
      await api(`/calls/${callState.session.id}/candidate`, {
        method: 'POST',
        body: JSON.stringify({
          candidate: event.candidate.toJSON(),
        }),
      })
    } catch {}

    if (targetUserId) {
      sendCallSignal('call.candidate', {
        toUserId: targetUserId,
        sessionId: callState.session.id,
        candidate: event.candidate.toJSON(),
      })
    }
  }

  peerConnection.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => {
      const exists = remoteStream.getTracks().some((current) => current.id === track.id)

      if (!exists) {
        remoteStream.addTrack(track)
      }
    })

    callState.remoteConnected = remoteStream.getTracks().length > 0
    attachCallMedia()
    requestChatRender()
  }

  peerConnection.onconnectionstatechange = () => {
    if (!peerConnection) {
      return
    }

    const status = peerConnection.connectionState

    if (status === 'connected') {
      callState.phase = 'active'
      requestChatRender()
      return
    }

    if (status === 'failed') {
      const contactId = Number(callState.contact?.id || 0)
      finalizeCall('Call connection failed.')
      settleCallTerminationInBackground({ reason: 'end', contactId })
      return
    }

    if (status === 'disconnected') {
      showToolbarBanner('Call connection is unstable.')
    }
  }

  attachCallMedia()
  return peerConnection
}

async function ensureLocalStream(mode) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support WebRTC media access.')
  }

  const needsVideo = mode === 'video'
  const hasVideo = localStream?.getVideoTracks().length > 0

  if (localStream && hasVideo === needsVideo) {
    return localStream
  }

  stopStream(localStream)

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: needsVideo,
    })
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      throw new Error(needsVideo
        ? 'Camera and microphone access were denied. Allow both to start the video call.'
        : 'Microphone access was denied. Allow it to start the voice call.')
    }

    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      throw new Error(needsVideo
        ? 'No camera or microphone was found for this video call.'
        : 'No microphone was found for this voice call.')
    }

    throw error
  }

  callState.muted = false
  callState.cameraOff = false
  attachCallMedia()
  return localStream
}

async function refreshPickerMedia() {
  if (!pickerState.open || pickerState.tab === 'emoji') {
    return
  }

  const requestId = ++pickerRequestId
  pickerState.loading = true
  pickerState.error = ''
  requestChatRender()

  try {
    if (!GIPHY_API_KEY) {
      pickerState.error = 'Add VITE_GIPHY_API_KEY for live GIPHY search.'
      pickerState.remote[pickerState.tab] = pickerFallback[pickerState.tab]
      return
    }

    const endpointBase = pickerState.tab === 'gif' ? 'gifs' : 'stickers'
    const query = pickerState.query.trim()
    const endpoint = query ? 'search' : 'trending'
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit: '24',
      rating: 'g',
    })

    if (query) {
      params.set('q', query)
      params.set('lang', 'en')
    }

    const response = await fetch(`https://api.giphy.com/v1/${endpointBase}/${endpoint}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`GIPHY request failed with status ${response.status}.`)
    }

    const payload = await response.json()

    if (requestId !== pickerRequestId) {
      return
    }

    pickerState.remote[pickerState.tab] = (payload.data || [])
      .map((item) => normalizeRemoteItem(item, pickerState.tab))
      .filter((item) => item.preview && item.original)
  } catch (error) {
    if (requestId !== pickerRequestId) {
      return
    }

    pickerState.error = error.message || 'Unable to load media right now.'
    pickerState.remote[pickerState.tab] = pickerFallback[pickerState.tab]
  } finally {
    if (requestId !== pickerRequestId) {
      return
    }

    pickerState.loading = false
    requestChatRender()
  }
}

function schedulePickerMediaRefresh() {
  window.clearTimeout(pickerSearchTimeoutId)
  pickerSearchTimeoutId = window.setTimeout(() => {
    refreshPickerMedia()
  }, 180)
}

function getCallSnapshot(session) {
  if (!session) {
    return ''
  }

  return JSON.stringify({
    id: session.id,
    status: session.status,
    type: session.type,
    caller_id: session.caller_id,
    callee_id: session.callee_id,
    offer_sdp: session.offer_sdp,
    answer_sdp: session.answer_sdp,
    caller_candidates: session.caller_candidates?.length || 0,
    callee_candidates: session.callee_candidates?.length || 0,
    started_at: session.started_at,
    ended_at: session.ended_at,
  })
}

async function applyCallerAnswer(session) {
  if (!peerConnection || !isCaller(session) || !session.answer_sdp || peerConnection.currentRemoteDescription) {
    return
  }

  await peerConnection.setRemoteDescription({
    type: 'answer',
    sdp: session.answer_sdp,
  })

  await flushRemoteCandidates(session)
  await flushSocketCandidates(session.id)
}

async function hydrateCallSession(session) {
  lastCallSnapshot = getCallSnapshot(session)

  if (!session) {
    if (callState.session) {
      finalizeCall('')
    }

    return
  }

  if (session.status === 'declined') {
    if (lastClosedCallId !== session.id) {
      finalizeCall('Call declined.')
    }
    return
  }

  if (session.status === 'ended') {
    if (lastClosedCallId !== session.id) {
      finalizeCall('Call ended.')
    }
    return
  }

  if (!state.selectedUserId && getCallPeer(session)?.id) {
    setSelectedUserId(getCallPeer(session).id)
  }

  if (session.status === 'ringing') {
    setCallSession(session, isCaller(session) ? 'outgoing' : 'incoming')
    requestChatRender()
    return
  }

  setCallSession(session, 'active')
  callState.startedAt = normalizeStartedAt(session) || callState.startedAt || Date.now()

  if (isCaller(session)) {
    await applyCallerAnswer(session)
  }

  await flushRemoteCandidates(session)
  await flushSocketCandidates(session.id)
  requestChatRender()
}

async function pollCurrentCall() {
  if (polling || !state.token || !canPollNetwork()) {
    return
  }

  polling = true

  try {
    const session = await api('/calls/current', { method: 'GET' })
    const nextSnapshot = getCallSnapshot(session)

    if (nextSnapshot === lastCallSnapshot) {
      return
    }

    await hydrateCallSession(session)
  } catch {
    // Keep polling quiet; chat should stay usable even if calls are unavailable.
  } finally {
    polling = false
  }
}

async function sendHeartbeat() {
  if (!state.token || !canPollNetwork()) {
    return
  }

  try {
    await api('/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {}
}

async function markPendingMessagesDelivered() {
  if (!state.token || !canPollNetwork() || !state.selectedUserId) {
    return
  }

  const hasPendingIncomingMessages = state.messages.some((message) =>
    String(message.receiver_id) === String(state.user?.id) && !message.delivered_at
  )

  if (!hasPendingIncomingMessages) {
    return
  }

  try {
    await api('/messages/delivered', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {}
}

async function refreshUsersQuietly() {
  if (userRefreshInFlight || !canPollNetwork()) {
    return
  }

  userRefreshInFlight = true

  try {
    const changed = await loadUsers()

    if (changed) {
      requestChatRender()
    }
  } catch {}
  finally {
    userRefreshInFlight = false
  }
}

async function refreshSelectedThreadQuietly() {
  if (
    !state.selectedUserId ||
    messageRefreshInFlight ||
    !canPollNetwork() ||
    state.messages.some((message) => isOptimisticMessageForUser(message, state.selectedUserId))
  ) {
    return
  }

  messageRefreshInFlight = true

  try {
    const changed = await loadMessages(state.selectedUserId, { showLoading: false })

    if (changed) {
      if (rerenderThreadMessagesOnly()) {
        return
      }

      requestChatRender()
    }
  } catch {}
  finally {
    messageRefreshInFlight = false
  }
}

function ensureCallPolling() {
  if (pollTimerId || !state.token || callSocketAuthenticated) {
    return
  }

  pollCurrentCall()
  pollTimerId = window.setInterval(pollCurrentCall, CALL_POLL_MS)
}

function ensureCallSignaling() {
  connectCallSocket()
  void pollCurrentCall()
  ensureCallPolling()
}

function ensureChatPolling() {
  if (!state.token) {
    return
  }

  if (!userPollTimerId) {
    refreshUsersQuietly()
    userPollTimerId = window.setInterval(refreshUsersQuietly, USER_POLL_MS)
  }

  if (!messagePollTimerId) {
    refreshSelectedThreadQuietly()
    messagePollTimerId = window.setInterval(refreshSelectedThreadQuietly, MESSAGE_POLL_MS)
  }

  if (!deliveryPollTimerId) {
    markPendingMessagesDelivered()
    deliveryPollTimerId = window.setInterval(markPendingMessagesDelivered, DELIVERY_POLL_MS)
  }

  if (!heartbeatTimerId) {
    sendHeartbeat()
    heartbeatTimerId = window.setInterval(sendHeartbeat, HEARTBEAT_MS)
  }
}

async function startOutgoingCall(mode) {
  if (!state.selectedUserId) {
    showToolbarBanner('Select a contact before starting a call.')
    return
  }

  if (!window.RTCPeerConnection) {
    showToolbarBanner('WebRTC is not available in this browser.')
    return
  }

  try {
    const session = await api('/calls', {
      method: 'POST',
      body: JSON.stringify({
        callee_id: state.selectedUserId,
        type: mode,
      }),
    })

    setCallSession(session, 'outgoing')
    rerenderChat()

    await ensureLocalStream(mode)
    const connection = await createPeerConnection(session)
    const offer = await connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: mode === 'video',
    })

    await connection.setLocalDescription(offer)

    await api(`/calls/${session.id}/offer`, {
      method: 'POST',
      body: JSON.stringify({
        offer_sdp: offer.sdp,
      }),
    })

    session.offer_sdp = offer.sdp
    sendCallSignal('call.offer', {
      toUserId: session.callee_id,
      session,
    })

    rerenderChat()
  } catch (error) {
    await endSessionOnServer('end')
    finalizeCall('')
    showToolbarBanner(error.message || 'Unable to start the call.')
  }
}

async function acceptIncomingCall() {
  if (!callState.session) {
    return
  }

  try {
    const session = callState.session

    await ensureLocalStream(session.type)
    const connection = await createPeerConnection(session)

    if (!session.offer_sdp) {
      throw new Error('The incoming call offer is not ready yet.')
    }

    if (!connection.currentRemoteDescription) {
      await connection.setRemoteDescription({
        type: 'offer',
        sdp: session.offer_sdp,
      })
    }

    await flushSocketCandidates(session.id)

    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)

    const updatedSession = await api(`/calls/${session.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        answer_sdp: answer.sdp,
      }),
    })

    sendCallSignal('call.answer', {
      toUserId: updatedSession.caller_id,
      session: updatedSession,
    })

    setCallSession(updatedSession, 'active')
    await flushRemoteCandidates(updatedSession)
    await flushSocketCandidates(updatedSession.id)
    rerenderChat()
  } catch (error) {
    await endSessionOnServer('decline')
    finalizeCall('')
    showToolbarBanner(error.message || 'Unable to accept the call.')
  }
}

async function closeCurrentCall(reason = 'end') {
  const contactId = Number(callState.contact?.id || 0)
  finalizeCall(reason === 'decline' ? 'Call declined.' : 'Call ended.')
  settleCallTerminationInBackground({ reason, contactId })
}

function toggleMute() {
  if (!localStream) {
    return
  }

  callState.muted = !callState.muted
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !callState.muted
  })
  rerenderChat()
}

function toggleCamera() {
  if (!localStream) {
    return
  }

  callState.cameraOff = !callState.cameraOff
  localStream.getVideoTracks().forEach((track) => {
    track.enabled = !callState.cameraOff
  })
  rerenderChat()
}

export async function loadUsers() {
  const users = await api('/users', { method: 'GET' })
  let changed = false

  if (state.users.length !== users.length) {
    changed = true
  } else {
    for (let i = 0; i < users.length; i++) {
      const previous = state.users[i]
      const next = users[i]

      if (
        !previous ||
        previous.id !== next.id ||
        previous.name !== next.name ||
        previous.email !== next.email ||
        previous.is_online !== next.is_online ||
        (previous.is_online === false && next.is_online === false && previous.last_seen_at !== next.last_seen_at)
      ) {
        changed = true
        break
      }
    }
  }

  if (changed) {
    setUsers(sortUsersForSidebar(users))
  }

  if (state.selectedUserId && !state.users.some((user) => user.id === state.selectedUserId)) {
    setSelectedUserId(null)
    setActiveConversationState(null, [], { loaded: false })
    stopThreadLoadingIndicator()
    changed = true
  }

  if (!state.selectedUserId && state.users.length > 0) {
    setSelectedUserId(getPreferredSelectedUserId(state.users))
    bootstrapSelectedConversation(state.selectedUserId)
    changed = true
  } else if (state.selectedUserId && !isActiveConversationReady(state.selectedUserId)) {
    bootstrapSelectedConversation(state.selectedUserId)
    changed = true
  }

  return changed
}

export async function loadMessages(userId, options = {}) {
  const requestId = ++messageRequestId
  setSelectedUserId(userId)
  const showLoading = options.showLoading !== false

  if (showLoading && !state.messages.length) {
    startThreadLoadingIndicator()
  } else if (showLoading) {
    stopThreadLoadingIndicator()
  }

  const serverMessages = await api(`/messages/${userId}`, { method: 'GET' })

  if (requestId !== messageRequestId || state.selectedUserId !== userId) {
    return false
  }

  if (showLoading) {
    stopThreadLoadingIndicator()
  }

  const nextMessages = mergeMessagesWithOptimisticLocal(userId, serverMessages)

  if (haveMessagesChanged(state.messages, nextMessages)) {
    setActiveConversationState(userId, nextMessages)
    setConversationCache(userId, nextMessages)
    return true
  }

  if (isSameConversation(userId) && !isActiveConversationReady(userId)) {
    setActiveConversationState(userId, nextMessages)
  }

  if (!getConversationCache(userId)) {
    setConversationCache(userId, nextMessages)
  }

  return false
}

async function startVoiceRecording() {
  if (!state.selectedUserId) {
    showToolbarBanner('Select a contact before recording a voice message.')
    return
  }

  if (recordingState.active || recordingState.sending) {
    return
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToolbarBanner('Voice recording is not supported in this browser.')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    const chunks = []

    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data)
      }
    }

    recorder.onerror = () => {
      showToolbarBanner('Voice recording stopped unexpectedly.')
      resetRecordingState()
      requestChatRender()
    }

    recorder.onstop = async () => {
      const durationMs = Math.max(0, Date.now() - recordingState.startedAt)
      const targetUserId = recordingState.targetUserId
      const nextMimeType = resolveRecordedMimeType(recorder, recordingState.mimeType || mimeType, chunks)
      const durationSeconds = Math.max(1, Math.round(durationMs / 1000))
      stopRecordingTicker()
      stopRecordingStream()
      recordingState.active = false
      recordingState.recorder = null
      recordingState.sending = true
      recordingState.durationMs = durationMs
      requestChatRender()

      let optimisticMessage = null

      try {
        const blob = new Blob(chunks, { type: nextMimeType })

        if (!blob.size) {
          throw new Error('Recorded audio was empty.')
        }

        const mediaUrl = await readBlobAsDataUrl(blob)
        optimisticMessage = buildOptimisticMessage({
          type: 'audio',
          content: 'Voice message',
          mediaUrl,
          durationSeconds,
          receiverId: targetUserId,
        })
        pushOptimisticMessage(optimisticMessage, targetUserId, { renderMode: 'messages' })

        const result = await api('/messages', {
          method: 'POST',
          body: JSON.stringify({
            receiver_id: targetUserId,
            type: 'audio',
            content: 'Voice message',
            media_url: mediaUrl,
            duration_seconds: durationSeconds,
          }),
        })

        if (optimisticMessage) {
          replaceOptimisticMessage(optimisticMessage.id, result.data, targetUserId)
        }
      } catch (error) {
        if (optimisticMessage) {
          removeOptimisticMessage(optimisticMessage.id, targetUserId, { renderMode: 'messages' })
        }
        showToolbarBanner(error.message || 'Unable to send the voice message.')
      } finally {
        resetRecordingState()
        requestChatRender()
      }
    }

    recordingState.active = true
    recordingState.sending = false
    recordingState.startedAt = Date.now()
    recordingState.durationMs = 0
    recordingState.recorder = recorder
    recordingState.stream = stream
    recordingState.targetUserId = state.selectedUserId
    recordingState.mimeType = mimeType
    pickerState.open = false
    toolbarState.attachOpen = false
    toolbarState.menuOpen = false
    toolbarState.searchOpen = false
    recorder.start(250)
    stopRecordingTicker()
    recordingTickTimerId = window.setInterval(() => {
      recordingState.durationMs = Math.max(0, Date.now() - recordingState.startedAt)
      updateRecordingDurationLabel()
    }, RECORDING_TICK_MS)
    rerenderChat()
  } catch (error) {
    const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
    showToolbarBanner(denied
      ? 'Microphone access was denied. Allow it to record voice messages.'
      : (error.message || 'Unable to start voice recording.'))
    resetRecordingState()
    requestChatRender()
  }
}

function stopVoiceRecording() {
  if (!recordingState.active || !recordingState.recorder) {
    return
  }

  if (recordingState.recorder.state !== 'inactive') {
    recordingState.recorder.stop()
  }
}

async function handleLogout() {
  if (callState.session) {
    await endSessionOnServer('end')
  }

  teardownChatRuntime()

  try {
    await api('/logout', { method: 'POST', body: JSON.stringify({}) })
  } catch {}

  setGuestMode(false)
  setToken(null)
  resetChatState()
  navigate('/login')
}

async function handleMessageSubmit(event) {
  event.preventDefault()

  if (recordingState.active) {
    stopVoiceRecording()
    return
  }

  if (recordingState.sending) {
    return
  }

  const input = byId('message-input')
  const content = input?.value.trim()
  const targetUserId = state.selectedUserId

  if (!content || !targetUserId) {
    return
  }

  const optimisticMessage = buildOptimisticMessage({
    type: 'text',
    content,
    receiverId: targetUserId,
  })

  input.value = ''
  pickerState.draft = ''
  resizeComposerInput(input)
  pushOptimisticMessage(optimisticMessage, targetUserId, { renderMode: 'messages' })

  try {
    const result = await api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: targetUserId,
        content,
        type: 'text',
      }),
    })

    replaceOptimisticMessage(optimisticMessage.id, result.data, targetUserId)
  } catch (error) {
    removeOptimisticMessage(optimisticMessage.id, targetUserId, { renderMode: 'messages' })
    input.value = content
    pickerState.draft = content
    resizeComposerInput(input)
    showToolbarBanner(error.message || 'Unable to send the message.')
  }
}

function insertIntoComposer(value) {
  const input = byId('message-input')

  if (!input) {
    return
  }

  const nextValue = input.value ? `${input.value} ${value}` : value
  input.value = nextValue
  pickerState.draft = nextValue
  input.focus()
}

async function appendAttachmentMessage(type, file) {
  const targetUserId = state.selectedUserId

  if (!file || !targetUserId) {
    return
  }

  let optimisticMessage = null

  try {
    const mediaUrl = await readFileAsDataUrl(file)
    optimisticMessage = buildOptimisticMessage({
      type,
      content: file.name,
      mediaUrl,
      receiverId: targetUserId,
    })
    const payload = {
      receiver_id: targetUserId,
      type,
      content: file.name,
      media_url: mediaUrl,
    }

    toolbarState.attachOpen = false
    pushOptimisticMessage(optimisticMessage, targetUserId, { renderMode: 'messages' })

    const result = await api('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    replaceOptimisticMessage(optimisticMessage.id, result.data, targetUserId)
  } catch (error) {
    if (optimisticMessage) {
      removeOptimisticMessage(optimisticMessage.id, targetUserId, { renderMode: 'messages' })
    }
    showToolbarBanner(error.message || 'Unable to attach this file.')
  }
}

async function appendMediaMessage(type, src, title) {
  const targetUserId = state.selectedUserId

  if (!targetUserId) {
    return
  }

  let optimisticMessage = null

  try {
    optimisticMessage = buildOptimisticMessage({
      type,
      content: title,
      mediaUrl: src,
      receiverId: targetUserId,
    })

    pickerState.open = false
    pickerState.query = ''
    pushOptimisticMessage(optimisticMessage, targetUserId, { renderMode: 'messages' })

    const result = await api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: targetUserId,
        type,
        content: title,
        media_url: src,
      }),
    })

    replaceOptimisticMessage(optimisticMessage.id, result.data, targetUserId)
  } catch (error) {
    if (optimisticMessage) {
      removeOptimisticMessage(optimisticMessage.id, targetUserId, { renderMode: 'messages' })
    }
    showToolbarBanner(error.message || 'Unable to send media message.')
  }
}

export function teardownChatRuntime() {
  disconnectCallSocket()
  stopCallPolling()
  stopChatPolling()
  resetPeerState()
  clearCallState()
  resetRecordingState()
  window.clearTimeout(pickerSearchTimeoutId)
  pickerRequestId += 1
  if (rerenderFrameId) {
    window.cancelAnimationFrame(rerenderFrameId)
    rerenderFrameId = 0
  }
  pickerState.open = false
  pickerState.query = ''
  pickerState.loading = false
  pickerState.error = ''
  pickerState.draft = ''
  toolbarState.banner = ''
  toolbarState.sidebarQuery = ''
  toolbarState.searchOpen = false
  toolbarState.searchQuery = ''
  stopThreadLoadingIndicator()
  toolbarState.menuOpen = false
  toolbarState.profileOpen = false
  toolbarState.selfProfileOpen = false
  toolbarState.attachOpen = false
  toolbarState.activeRail = 'chats'
}

export function getChatUiState() {
  return {
    pickerState,
    toolbarState,
    callState,
    recordingState,
    themeMode: themeState.mode,
    conversationPreviews: getConversationPreviews(),
  }
}

export function bindChatEvents() {
  bindRailEvents()
  ensureCallSignaling()
  ensureChatPolling()

  root.querySelectorAll('[data-user-id]').forEach((button) => {
    bindElementOnce(button, 'UserClick', 'click', async () => {
      const userId = Number(button.dataset.userId)

      if (state.selectedUserId === userId) {
        return
      }

      setSelectedUserId(userId)
      toolbarState.searchOpen = false
      toolbarState.searchQuery = ''
      toolbarState.menuOpen = false
      toolbarState.profileOpen = false
      toolbarState.banner = ''
      const cachedMessages = getConversationCache(userId)
      setActiveConversationState(userId, cachedMessages || [], { loaded: Boolean(cachedMessages) })
      if (!state.messages.length) {
        startThreadLoadingIndicator()
      } else {
        stopThreadLoadingIndicator()
      }
      rerenderChat()

      messageRefreshInFlight = true

      try {
        const changed = await loadMessages(userId)

        if (changed) {
          requestChatRender()
          return
        }

        rerenderChat()
      } catch (error) {
        stopThreadLoadingIndicator()
        showToolbarBanner(error.message || 'Unable to load this conversation.')
      } finally {
        messageRefreshInFlight = false
      }
    })
  })

  const form = byId('message-form')
  bindElementOnce(form, 'MessageSubmit', 'submit', handleMessageSubmit)

  root.querySelectorAll('[data-picker-toggle]').forEach((button) => {
    bindElementOnce(button, 'PickerToggle', 'click', async () => {
      toolbarState.attachOpen = false
      pickerState.open = !pickerState.open
      rerenderChat()

      if (pickerState.open) {
        await refreshPickerMedia()
      }
    })
  })

  root.querySelectorAll('[data-attach-toggle]').forEach((button) => {
    bindElementOnce(button, 'AttachToggle', 'click', () => {
      pickerState.open = false
      toolbarState.attachOpen = !toolbarState.attachOpen
      toolbarState.activeRail = toolbarState.attachOpen ? 'media' : 'chats'
      rerenderChat()
    })
  })

  root.querySelectorAll('[data-attach-action]').forEach((button) => {
    bindElementOnce(button, 'AttachAction', 'click', async () => {
      const action = button.dataset.attachAction

      if (action === 'gif' || action === 'sticker') {
        toolbarState.attachOpen = false
        pickerState.open = true
        pickerState.tab = action
        rerenderChat()
        await refreshPickerMedia()
        return
      }

      if (action === 'image') {
        byId('attach-image-input')?.click()
        return
      }

      if (action === 'file') {
        byId('attach-file-input')?.click()
      }
    })
  })

  root.querySelectorAll('[data-picker-tab]').forEach((button) => {
    bindElementOnce(button, 'PickerTab', 'click', async () => {
      pickerState.tab = button.dataset.pickerTab
      rerenderChat()
      await refreshPickerMedia()
    })
  })

  root.querySelectorAll('[data-picker-item]').forEach((button) => {
    bindElementOnce(button, 'PickerItem', 'click', () => {
      insertIntoComposer(button.dataset.pickerItem)
    })
  })

  root.querySelectorAll('[data-picker-media-type]').forEach((button) => {
    bindElementOnce(button, 'PickerMediaType', 'click', () => {
      appendMediaMessage(
        button.dataset.pickerMediaType,
        button.dataset.pickerMediaSrc,
        button.dataset.pickerMediaTitle
      )
    })
  })

  const pickerSearch = byId('picker-search')
  bindElementOnce(pickerSearch, 'PickerSearchInput', 'input', (event) => {
    pickerState.query = event.target.value
    schedulePickerMediaRefresh()
  })

  const sidebarSearchInput = byId('sidebar-search-input')
  bindElementOnce(sidebarSearchInput, 'SidebarSearchInput', 'input', (event) => {
    toolbarState.sidebarQuery = event.target.value
    if (rerenderSidebarUsersOnly()) {
      bindChatEvents()
    } else {
      requestChatRender()
    }
  })

  const messageInput = byId('message-input')
  if (messageInput) {
    bindElementOnce(messageInput, 'MessageInput', 'input', (event) => {
      if (recordingState.active) {
        event.target.value = pickerState.draft
        return
      }

      pickerState.draft = event.target.value

      resizeComposerInput(event.target)
    })

    resizeComposerInput(messageInput)
  }

  const imageInput = byId('attach-image-input')
  bindElementOnce(imageInput, 'AttachImageChange', 'change', async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    await appendAttachmentMessage('image', file)
  })

  const fileInput = byId('attach-file-input')
  bindElementOnce(fileInput, 'AttachFileChange', 'change', async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    await appendAttachmentMessage('file', file)
  })

  root.querySelectorAll('[data-record-action]').forEach((button) => {
    bindElementOnce(button, 'RecordAction', 'click', () => {
      const action = button.dataset.recordAction

      if (action === 'start') {
        startVoiceRecording()
        return
      }

      stopVoiceRecording()
    })
  })

  const profilePanel = byId('chat-profile-panel')
  bindElementOnce(profilePanel, 'ProfileScroll', 'scroll', () => {
    profilePanelScrollTop = profilePanel.scrollTop
    profilePanelScrollLeft = profilePanel.scrollLeft
  }, { passive: true })

  root.querySelectorAll('[data-thread-action]').forEach((button) => {
    bindElementOnce(button, 'ThreadAction', 'click', () => {
      const action = button.dataset.threadAction

      if (action === 'video') {
        startOutgoingCall('video')
        return
      }

      if (action === 'call') {
        startOutgoingCall('voice')
        return
      }

      if (action === 'search') {
        toolbarState.activeRail = 'chats'
        toolbarState.searchOpen = !toolbarState.searchOpen
        toolbarState.menuOpen = false
        toolbarState.attachOpen = false
        rerenderChat()
        byId('thread-search-input')?.focus()
        return
      }

      if (action === 'menu') {
        toolbarState.activeRail = 'chats'
        toolbarState.menuOpen = !toolbarState.menuOpen
        toolbarState.searchOpen = false
        toolbarState.profileOpen = false
        toolbarState.attachOpen = false
        rerenderChat()
      }
    })
  })

  const threadSearchInput = byId('thread-search-input')
  bindElementOnce(threadSearchInput, 'ThreadSearchInput', 'input', (event) => {
    toolbarState.searchQuery = event.target.value
    if (rerenderThreadMessagesOnly()) {
      bindChatEvents()
    } else {
      requestChatRender()
    }
  })

  root.querySelectorAll('[data-menu-action]').forEach((button) => {
    bindElementOnce(button, 'MenuAction', 'click', async () => {
      const action = button.dataset.menuAction

      if (action === 'clear') {
        if (!state.selectedUserId) {
          return
        }

        const targetUserId = state.selectedUserId
        const previousMessages = [...state.messages]
        const previousCachedMessages = getConversationCache(targetUserId) || []

        clearActiveConversationLocally()
        toolbarState.menuOpen = false
        toolbarState.searchQuery = ''
        rerenderChat()

        try {
          await api(`/messages/${targetUserId}`, { method: 'DELETE' })
          showToolbarBanner('Conversation cleared.')
        } catch (error) {
          if (state.selectedUserId === targetUserId) {
            setActiveConversationState(targetUserId, previousMessages)
          }
          setConversationCache(targetUserId, previousCachedMessages)
          rerenderChat()
          showToolbarBanner(error.message || 'Unable to clear this conversation.')
        }
        return
      }

      if (action === 'info') {
        toolbarState.menuOpen = false
        toolbarState.profileOpen = true
        toolbarState.attachOpen = false
        rerenderChat()
        return
      }

      if (action === 'close') {
        toolbarState.menuOpen = false
        rerenderChat()
      }
    })
  })

  root.querySelectorAll('[data-profile-close]').forEach((button) => {
    bindElementOnce(button, 'ProfileClose', 'click', () => {
      toolbarState.profileOpen = false
      toolbarState.selfProfileOpen = false
      toolbarState.activeRail = 'chats'
      rerenderChat()
    })
  })

  root.querySelectorAll('[data-call-action]').forEach((button) => {
    bindElementOnce(button, 'CallAction', 'click', () => {
      const action = button.dataset.callAction

      if (action === 'accept') {
        acceptIncomingCall()
        return
      }

      if (action === 'decline') {
        closeCurrentCall('decline')
        return
      }

      if (action === 'end') {
        closeCurrentCall('end')
        return
      }

      if (action === 'mute') {
        toggleMute()
        return
      }

      if (action === 'camera') {
        toggleCamera()
      }
    })
  })
}
