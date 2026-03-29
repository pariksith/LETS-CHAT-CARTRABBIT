import { api } from './api.js'
import { GIPHY_API_KEY, WEBRTC_ICE_SERVERS } from './config.js'
import { byId, mount, root } from './dom.js'
import { navigate } from './router.js'
import { resetChatState, setGuestMode, setToken, state } from './state.js'
import { chatView } from './views.js'
import { bindCommonEvents } from './events.js'

const CALL_POLL_MS = 2000
const ICE_CONFIG = {
  iceServers: WEBRTC_ICE_SERVERS,
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

const pickerFallback = {
  gif: [],
  sticker: [],
}

let pollTimerId = 0
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
const appliedRemoteCandidates = new Set()

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

function rerenderChat() {
  if (rerenderFrameId) {
    window.cancelAnimationFrame(rerenderFrameId)
    rerenderFrameId = 0
  }

  const threadScrollState = getThreadScrollState()
  const profileScrollState = getProfileScrollState()
  const composerFocusState = getComposerFocusState()

  mount(
    chatView({
      user: state.user,
      users: state.users,
      selectedUserId: state.selectedUserId,
      messages: state.messages,
      pickerState,
      toolbarState,
      callState,
    })
  )
  bindCommonEvents()
  bindChatEvents()
  window.requestAnimationFrame(() => {
    restoreThreadScrollState(threadScrollState)
    restoreProfileScrollState(profileScrollState)
    restoreComposerFocusState(composerFocusState)
    attachCallMedia()
    syncProfilePanelPosition()
    window.setTimeout(syncProfilePanelPosition, 0)
    window.setTimeout(syncProfilePanelPosition, 60)
  })
}

function requestChatRender() {
  if (rerenderFrameId) {
    return
  }

  rerenderFrameId = window.requestAnimationFrame(() => {
    rerenderFrameId = 0
    rerenderChat()
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
    element.style.height = 'auto'
    const nextHeight = Math.min(element.scrollHeight, 120)
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

function showToolbarBanner(message) {
  toolbarState.banner = message
  requestChatRender()

  window.clearTimeout(showToolbarBanner.timeoutId)
  showToolbarBanner.timeoutId = window.setTimeout(() => {
    toolbarState.banner = ''
    requestChatRender()
  }, 2600)
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
  callState.remoteConnected = false
  callState.muted = false
  callState.cameraOff = false
}

async function endSessionOnServer(reason = 'end') {
  if (!callState.session?.id || !state.token) {
    return
  }

  const endpoint = reason === 'decline'
    ? `/calls/${callState.session.id}/decline`
    : `/calls/${callState.session.id}/end`

  try {
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {}
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

function stopCallPolling() {
  if (pollTimerId) {
    window.clearInterval(pollTimerId)
    pollTimerId = 0
  }
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

    try {
      await api(`/calls/${callState.session.id}/candidate`, {
        method: 'POST',
        body: JSON.stringify({
          candidate: event.candidate.toJSON(),
        }),
      })
    } catch {}
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
      endSessionOnServer('end')
      finalizeCall('Call connection failed.')
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
    state.selectedUserId = getCallPeer(session).id
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
  requestChatRender()
}

async function pollCurrentCall() {
  if (polling || !state.token) {
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

function ensureCallPolling() {
  if (pollTimerId || !state.token) {
    return
  }

  pollCurrentCall()
  pollTimerId = window.setInterval(pollCurrentCall, CALL_POLL_MS)
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

    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)

    const updatedSession = await api(`/calls/${session.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        answer_sdp: answer.sdp,
      }),
    })

    setCallSession(updatedSession, 'active')
    await flushRemoteCandidates(updatedSession)
    rerenderChat()
  } catch (error) {
    await endSessionOnServer('decline')
    finalizeCall('')
    showToolbarBanner(error.message || 'Unable to accept the call.')
  }
}

async function closeCurrentCall(reason = 'end') {
  await endSessionOnServer(reason)
  finalizeCall(reason === 'decline' ? 'Call declined.' : 'Call ended.')
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
  state.users = await api('/users', { method: 'GET' })

  if (state.selectedUserId && !state.users.some((user) => user.id === state.selectedUserId)) {
    state.selectedUserId = null
    state.messages = []
  }

  if (!state.selectedUserId && state.users.length > 0) {
    state.selectedUserId = state.users[0].id
    await loadMessages(state.selectedUserId)
  }
}

export async function loadMessages(userId) {
  const requestId = ++messageRequestId
  state.selectedUserId = userId
  const messages = await api(`/messages/${userId}`, { method: 'GET' })

  if (requestId !== messageRequestId || state.selectedUserId !== userId) {
    return
  }

  state.messages = messages
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

  const input = byId('message-input')
  const content = input?.value.trim()

  if (!content || !state.selectedUserId) {
    return
  }

  try {
    await api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: state.selectedUserId,
        content,
        type: 'text',
      }),
    })

    input.value = ''
    pickerState.draft = ''
    await loadMessages(state.selectedUserId)
    rerenderChat()
  } catch (error) {
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
  if (!file || !state.selectedUserId) {
    return
  }

  try {
    const mediaUrl = await readFileAsDataUrl(file)
    const payload = {
      receiver_id: state.selectedUserId,
      type,
      content: file.name,
      media_url: mediaUrl,
    }

      await api('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    toolbarState.attachOpen = false
    await loadMessages(state.selectedUserId)
    rerenderChat()
  } catch (error) {
    showToolbarBanner(error.message || 'Unable to attach this file.')
  }
}

async function appendMediaMessage(type, src, title) {
  if (!state.selectedUserId) {
    return
  }

  try {
      await api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: state.selectedUserId,
        type,
        content: title,
        media_url: src,
      }),
    })

    pickerState.open = false
    pickerState.query = ''
    await loadMessages(state.selectedUserId)
    rerenderChat()
  } catch (error) {
    showToolbarBanner(error.message || 'Unable to send media message.')
  }
}

export function teardownChatRuntime() {
  stopCallPolling()
  resetPeerState()
  clearCallState()
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
  }
}

export function bindChatEvents() {
  ensureCallPolling()

  root.querySelectorAll('[data-user-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await loadMessages(Number(button.dataset.userId))
      rerenderChat()
    })
  })

  const logoutButton = byId('logout-button')
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout)
  }

  const form = byId('message-form')
  if (form) {
    form.addEventListener('submit', handleMessageSubmit)
  }

  root.querySelectorAll('[data-picker-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      toolbarState.attachOpen = false
      pickerState.open = !pickerState.open
      rerenderChat()

      if (pickerState.open) {
        await refreshPickerMedia()
      }
    })
  })

  root.querySelectorAll('[data-attach-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      pickerState.open = false
      toolbarState.attachOpen = !toolbarState.attachOpen
      toolbarState.activeRail = toolbarState.attachOpen ? 'media' : 'chats'
      rerenderChat()
    })
  })

  root.querySelectorAll('[data-attach-action]').forEach((button) => {
    button.addEventListener('click', async () => {
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
    button.addEventListener('click', async () => {
      pickerState.tab = button.dataset.pickerTab
      rerenderChat()
      await refreshPickerMedia()
    })
  })

  root.querySelectorAll('[data-picker-item]').forEach((button) => {
    button.addEventListener('click', () => {
      insertIntoComposer(button.dataset.pickerItem)
    })
  })

  root.querySelectorAll('[data-picker-media-type]').forEach((button) => {
    button.addEventListener('click', () => {
      appendMediaMessage(
        button.dataset.pickerMediaType,
        button.dataset.pickerMediaSrc,
        button.dataset.pickerMediaTitle
      )
    })
  })

  const pickerSearch = byId('picker-search')
  if (pickerSearch) {
    pickerSearch.addEventListener('input', (event) => {
      pickerState.query = event.target.value
      schedulePickerMediaRefresh()
    })
  }

  const sidebarSearchInput = byId('sidebar-search-input')
  if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', (event) => {
      toolbarState.sidebarQuery = event.target.value
      requestChatRender()
    })
  }

  const messageInput = byId('message-input')
  if (messageInput) {
    messageInput.addEventListener('input', (event) => {
      pickerState.draft = event.target.value

      resizeComposerInput(event.target)
    })

    resizeComposerInput(messageInput)
  }

  const imageInput = byId('attach-image-input')
  if (imageInput) {
    imageInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      await appendAttachmentMessage('image', file)
    })
  }

  const fileInput = byId('attach-file-input')
  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      await appendAttachmentMessage('file', file)
    })
  }

  const profilePanel = byId('chat-profile-panel')
  if (profilePanel) {
    profilePanel.addEventListener('scroll', () => {
      profilePanelScrollTop = profilePanel.scrollTop
      profilePanelScrollLeft = profilePanel.scrollLeft
    }, { passive: true })
  }

  root.querySelectorAll('[data-thread-action]').forEach((button) => {
    button.addEventListener('click', () => {
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
  if (threadSearchInput) {
    threadSearchInput.addEventListener('input', (event) => {
      toolbarState.searchQuery = event.target.value
      requestChatRender()
    })
  }

  root.querySelectorAll('[data-menu-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.menuAction

      if (action === 'clear') {
        if (!state.selectedUserId) {
          return
        }

        api(`/messages/${state.selectedUserId}`, { method: 'DELETE' })
          .then(() => {
            state.messages = []
            toolbarState.menuOpen = false
            showToolbarBanner('Conversation cleared.')
            rerenderChat()
          })
          .catch((error) => {
            showToolbarBanner(error.message || 'Unable to clear this conversation.')
          })
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
    button.addEventListener('click', () => {
      toolbarState.profileOpen = false
      toolbarState.selfProfileOpen = false
      toolbarState.activeRail = 'chats'
      rerenderChat()
    })
  })

  root.querySelectorAll('[data-rail-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.railAction

      if (action === 'chats') {
        toolbarState.activeRail = 'chats'
        toolbarState.selfProfileOpen = false
        toolbarState.profileOpen = false
        pickerState.open = false
        toolbarState.attachOpen = false
        rerenderChat()
        byId('sidebar-search-input')?.focus()
        return
      }

      if (action === 'media') {
        toolbarState.activeRail = 'media'
        toolbarState.selfProfileOpen = false
        toolbarState.profileOpen = false
        toolbarState.attachOpen = false
        pickerState.open = true
        pickerState.tab = 'emoji'
        rerenderChat()
        return
      }

      if (action === 'account') {
        toolbarState.activeRail = 'account'
        toolbarState.profileOpen = false
        toolbarState.selfProfileOpen = !toolbarState.selfProfileOpen
        pickerState.open = false
        toolbarState.attachOpen = false

        if (!toolbarState.selfProfileOpen) {
          toolbarState.activeRail = 'chats'
        }

        rerenderChat()
      }
    })
  })

  root.querySelectorAll('[data-call-action]').forEach((button) => {
    button.addEventListener('click', () => {
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
