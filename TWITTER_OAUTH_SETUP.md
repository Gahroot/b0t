# Twitter OAuth 2.0 Login Setup Guide

This guide explains how to set up Twitter OAuth 2.0 user authentication for the settings page.

## What Was Implemented

### 1. Database Schema
- **New table**: `oauth_state` - stores temporary OAuth PKCE state during authorization flow
- **Updated table**: `accounts` - stores user's Twitter OAuth tokens (access_token, refresh_token, etc.)

### 2. API Endpoints
- `GET /api/auth/twitter/authorize` - Initiates OAuth flow and redirects to Twitter
- `GET /api/auth/twitter/callback` - Handles callback from Twitter after authorization
- `GET /api/auth/twitter/status` - Check if user has connected Twitter account
- `DELETE /api/auth/twitter/status` - Disconnect Twitter account

### 3. Settings Page
- Real-time connection status (fetched from database)
- OAuth popup flow
- Automatic status refresh after successful connection
- Loading states and error handling

## How It Works

### OAuth 2.0 PKCE Flow

1. **User clicks "Connect" on settings page**
   - Opens popup window to `/api/auth/twitter/authorize`

2. **Authorization endpoint**
   - Generates OAuth 2.0 authorization link with PKCE (Proof Key for Code Exchange)
   - Stores `state` and `codeVerifier` in database
   - Redirects user to Twitter authorization page

3. **User authorizes on Twitter**
   - Twitter redirects back to `/api/auth/twitter/callback?code=...&state=...`

4. **Callback handler**
   - Retrieves `codeVerifier` from database using `state`
   - Exchanges authorization code for access/refresh tokens
   - Fetches Twitter user info
   - Stores tokens in `accounts` table
   - Closes popup and notifies parent window

5. **Settings page updates**
   - Receives message from popup
   - Fetches new connection status
   - Shows "Connected" state

## Twitter Developer Portal Setup

### Step 1: Enable OAuth 2.0

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Click **Settings** → **User authentication settings**
4. Click **Set up**

### Step 2: Configure OAuth 2.0

**App permissions:**
- ✅ Read
- ✅ Write

**Type of App:**
- ✅ Web App

**App info:**
- **Callback URL (Development)**:
  ```
  http://localhost:3000/api/auth/twitter/callback
  ```
- **Callback URL (Production)**:
  ```
  https://your-app.railway.app/api/auth/twitter/callback
  ```
- **Website URL**:
  ```
  http://localhost:3000
  ```

### Step 3: Get Credentials

After saving, you'll get:
- **Client ID** (OAuth 2.0)
- **Client Secret** (OAuth 2.0)

**Important**: These are different from your OAuth 1.0a credentials (API Key/Secret).

## Environment Variables

Add these to your `.env.local`:

```bash
# Twitter OAuth 2.0 (for user login in settings page)
TWITTER_CLIENT_ID=your_oauth2_client_id_here
TWITTER_CLIENT_SECRET=your_oauth2_client_secret_here

# NextAuth URL (required for callback URL)
NEXTAUTH_URL=http://localhost:3000  # Change to your Railway URL in production
```

## Token Management

### Access Tokens
- Default expiry: **2 hours**
- With `offline.access` scope: Get refresh token (implemented)
- Refresh tokens don't expire (unless revoked)

### Scopes Requested
- `tweet.read` - Read tweets
- `tweet.write` - Post tweets
- `users.read` - Read user profile
- `offline.access` - Get refresh token

### Token Storage
Tokens are stored in the `accounts` table:
```sql
{
  provider: 'twitter',
  providerAccountId: '123456789',  -- Twitter user ID
  access_token: 'encrypted_token',
  refresh_token: 'encrypted_refresh_token',
  expires_at: 1234567890,  -- Unix timestamp
  scope: 'tweet.read tweet.write users.read offline.access'
}
```

## Testing Locally

1. **Set environment variables**:
   ```bash
   cp .env.example .env.local
   # Add your TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET
   ```

2. **Run database migration**:
   ```bash
   npm run db:push
   ```

3. **Start dev server**:
   ```bash
   npm run dev
   ```

4. **Test OAuth flow**:
   - Navigate to http://localhost:3000/settings
   - Click "Connect" on Twitter card
   - Authorize on Twitter
   - Popup should close and show "Connected"

## Production Deployment

### Railway Setup

1. **Add environment variables** in Railway dashboard:
   ```
   TWITTER_CLIENT_ID=your_oauth2_client_id
   TWITTER_CLIENT_SECRET=your_oauth2_client_secret
   NEXTAUTH_URL=https://your-app.railway.app
   ```

2. **Update Twitter Developer Portal**:
   - Add production callback URL:
     ```
     https://your-app.railway.app/api/auth/twitter/callback
     ```

3. **Deploy**:
   ```bash
   git push
   ```

## Troubleshooting

### "Invalid OAuth state" error
- OAuth state expired (older than ~10 minutes)
- Solution: Try connecting again

### "Twitter OAuth is not configured" error
- Missing `TWITTER_CLIENT_ID` or `TWITTER_CLIENT_SECRET`
- Solution: Check environment variables

### Popup doesn't close after authorization
- Check browser console for errors
- Verify `window.postMessage` is working
- Try disabling popup blockers

### "401 Unauthorized" when checking status
- User not logged in to the app
- Solution: Login first, then connect Twitter

## Security Notes

1. **State parameter**: Prevents CSRF attacks
2. **PKCE (Code Verifier)**: Prevents authorization code interception
3. **Tokens**: Stored server-side in database (never exposed to client)
4. **Session required**: Must be logged in to connect Twitter account

## API Response Examples

### Check Connection Status
```bash
GET /api/auth/twitter/status
```

Response:
```json
{
  "connected": true,
  "account": {
    "providerAccountId": "123456789",
    "hasRefreshToken": true,
    "isExpired": false,
    "expiresAt": 1234567890
  }
}
```

### Disconnect Account
```bash
DELETE /api/auth/twitter/status
```

Response:
```json
{
  "success": true,
  "message": "Twitter account disconnected"
}
```

## Future Enhancements

- [ ] Automatic token refresh when expired
- [ ] Show Twitter username in settings
- [ ] Use user's OAuth token for posting (instead of app credentials)
- [ ] Support multiple Twitter accounts per user
- [ ] Token encryption at rest

## References

- [Twitter OAuth 2.0 Docs](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [twitter-api-v2 Library](https://github.com/PLhery/node-twitter-api-v2)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
