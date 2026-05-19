// Voice recording utilities

let mediaRecorder = null
let audioChunks = []
let recordingStartTime = 0

export function isRecording() {
  return mediaRecorder && mediaRecorder.state === 'recording'
}

export async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    recordingStartTime = Date.now()

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start()
    return true
  } catch (error) {
    console.error('Failed to start recording:', error)
    return false
  }
}

export async function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      reject(new Error('No active recording'))
      return
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const duration = Math.floor((Date.now() - recordingStartTime) / 1000)
      
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      
      // Convert blob to data URL
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve({
          dataUrl: reader.result,
          duration,
          blob: audioBlob
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(audioBlob)
    }

    mediaRecorder.stop()
  })
}

export function cancelRecording() {
  if (mediaRecorder) {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    mediaRecorder.stream.getTracks().forEach(track => track.stop())
    mediaRecorder = null
    audioChunks = []
  }
}

export function getRecordingDuration() {
  if (!isRecording()) {
    return 0
  }
  return Math.floor((Date.now() - recordingStartTime) / 1000)
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
