// Message status and online status utilities

export function getMessageStatusIcon(message, currentUserId) {
  // Only show status for sent messages (own messages)
  if (String(message.sender_id) !== String(currentUserId)) {
    return ''
  }

  // Check if message has been read
  if (message.read_at) {
    return 'checkDoubleBlue'
  }

  // Check if message has been delivered
  if (message.delivered_at) {
    return 'checkDouble'
  }

  // Message sent but not delivered yet
  return 'checkSingle'
}

export function getOnlineStatus(user) {
  if (!user.is_online || !user.last_seen_at) {
    return {
      isOnline: false,
      label: 'Offline'
    }
  }

  const lastSeen = new Date(user.last_seen_at)
  const now = new Date()
  const diffSeconds = Math.floor((now - lastSeen) / 1000)

  // Consider online if last seen within 45 seconds
  if (diffSeconds < 45) {
    return {
      isOnline: true,
      label: 'Online'
    }
  }

  // Format last seen time
  if (diffSeconds < 60) {
    return {
      isOnline: false,
      label: 'Last seen just now'
    }
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return {
      isOnline: false,
      label: `Last seen ${diffMinutes}m ago`
    }
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return {
      isOnline: false,
      label: `Last seen ${diffHours}h ago`
    }
  }

  return {
    isOnline: false,
    label: 'Last seen recently'
  }
}

// Send heartbeat to update online status
export async function sendHeartbeat(api) {
  try {
    await api('/presence/heartbeat', { method: 'POST', body: JSON.stringify({}) })
  } catch (error) {
    // Silently fail - don't disrupt user experience
  }
}

// Mark messages as delivered
export async function markMessagesDelivered(api) {
  try {
    await api('/messages/delivered', { method: 'POST', body: JSON.stringify({}) })
  } catch (error) {
    // Silently fail
  }
}

// Mark conversation as read
export async function markConversationRead(api, userId) {
  try {
    await api(`/messages/${userId}/read`, { method: 'POST', body: JSON.stringify({}) })
  } catch (error) {
    // Silently fail
  }
}
