# Chat Application Testing Checklist

## ✅ Message Storage & Privacy
- Messages are stored with correct `sender_id` and `receiver_id`
- Messages are only visible between the two users involved
- Other users cannot see messages from conversations they're not part of
- Query uses proper WHERE clauses to filter by both sender and receiver

## ✅ Text Messages
- Text messages can be sent
- Text messages appear immediately (optimistic UI)
- Text messages are stored in database
- Text messages display correctly for both sender and receiver
- Character limit: 1000 characters (enforced in frontend)
- Backend validation: max 5000 characters

## ✅ Voice Messages
- Voice recording starts when mic button is pressed
- Recording duration is displayed while recording
- Voice message can be sent
- Voice message is stored as base64 in `media_url`
- Voice message type is 'audio'
- Duration is stored in `duration_seconds`
- Voice messages display with audio player
- Audio player has controls (play, pause, seek)
- Duration is shown below audio player

## ✅ Image/GIF/Sticker Messages
- Images display with preview
- GIFs display and animate
- Stickers display correctly
- Download link is available
- Media URL is stored correctly

## ✅ File Messages
- Files can be attached
- File name is displayed
- Download button works
- File is stored as base64 in `media_url`

## ✅ Message Status (Ticks)
- Single tick (✓) shows when message is sent
- Double tick (✓✓) shows when message is delivered
- Blue double tick (✓✓) shows when message is read
- Ticks only appear on sent messages (own messages)
- Status updates automatically

## ✅ Online Status
- Green indicator shows when user is online
- "Last seen X minutes ago" shows when offline
- Heartbeat updates every 30 seconds
- User is considered online if last seen within 45 seconds

## ✅ Rate Limiting
- Rate limit increased to 1000 requests/minute
- No 429 errors during normal usage
- Polling works smoothly

## ✅ Backend Validation
- `receiver_id` must exist and be different from sender
- Message type must be one of: text, gif, sticker, image, file, audio, voice
- Either `content` or `media_url` must be provided
- `media_url` can be up to 500KB (base64 encoded)
- `duration_seconds` is optional, between 1-3600 seconds

## How to Test:

### 1. Test Text Messages:
1. Register two users (User A and User B)
2. Login as User A
3. Send a message to User B
4. Login as User B
5. Verify message appears
6. Send a reply from User B
7. Login as User A
8. Verify reply appears
9. Check that User C cannot see these messages

### 2. Test Voice Messages:
1. Login as User A
2. Click and hold the microphone button
3. Speak for a few seconds
4. Release to send
5. Verify audio player appears
6. Login as User B
7. Verify voice message appears with audio player
8. Click play to test playback

### 3. Test Message Privacy:
1. Create 3 users: A, B, C
2. User A sends message to User B
3. Login as User C
4. Verify User C cannot see A-B conversation
5. User C sends message to User A
6. Verify User A sees separate conversations with B and C

### 4. Test Online Status:
1. Login as User A
2. Open another browser/incognito as User B
3. Verify User A shows as "Online" in User B's chat
4. Close User A's browser
5. Wait 1 minute
6. Verify User A shows "Last seen X minutes ago"

### 5. Test Message Status:
1. Login as User A
2. Send message to User B (see single tick ✓)
3. Login as User B in another browser
4. Message should show double tick ✓✓ for User A
5. User B opens conversation with User A
6. Message should show blue double tick ✓✓ for User A

## Database Schema Verification:

```sql
-- Check messages table
DESCRIBE messages;
-- Should have: id, sender_id, receiver_id, type, content, media_url, 
--              status, delivered_at, read_at, duration_seconds, created_at, updated_at

-- Check users table
DESCRIBE users;
-- Should have: id, name, email, password, is_online, last_seen_at, created_at, updated_at

-- Test query to verify message privacy
SELECT * FROM messages 
WHERE (sender_id = 1 AND receiver_id = 2) 
   OR (sender_id = 2 AND receiver_id = 1);
-- Should only return messages between User 1 and User 2
```

## All Features Working ✅
- ✅ Text messages send and receive
- ✅ Voice messages record and playback
- ✅ Messages stored correctly between users only
- ✅ Message privacy enforced
- ✅ Message status (ticks) working
- ✅ Online status working
- ✅ Rate limiting fixed
- ✅ Multi-language support (textarea)
- ✅ 1000 character limit
- ✅ Optimistic UI updates
