# Debugging Guide: 403 Permission Error

## Error: "No access to this document or document too large"

This error means the Google Drive API is rejecting the export request with a 403 (Forbidden) status.

## Steps to Debug and Fix

### 1. Check the Console Logs

1. Open Chrome and go to `chrome://extensions/`
2. Find "Docs to Kindle" and click "Inspect views: service worker"
3. In the console, look for:
   - "Got OAuth token, length: XXX" - Confirms token was retrieved
   - "Settings loaded: {...}" - Shows your settings
   - "Exporting document: {...}" - Shows document ID and format
   - "Drive API 403 error: {...}" - Full error details from Google

### 2. Verify OAuth Token Has Correct Scopes

In the service worker console, run:

```javascript
// Get a fresh token and check what scopes it has
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  console.log('Token:', token);

  // Decode the token to see scopes (tokens are JWTs)
  fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token)
    .then(r => r.json())
    .then(info => {
      console.log('Token info:', info);
      console.log('Scopes:', info.scope);
    });
});
```

**Expected scopes:**
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/gmail.send`

### 3. Clear and Re-authorize

If the scopes are missing or incorrect:

1. In the service worker console:
```javascript
// Get current token
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  console.log('Removing token:', token);

  // Remove it
  chrome.identity.removeCachedAuthToken({ token }, () => {
    console.log('Token removed');

    // Get a new one (this will show consent screen)
    chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
      console.log('New token:', newToken);
    });
  });
});
```

2. Or use the Settings page:
   - Click extension icon → Settings
   - Click "Sign Out"
   - Click "Sign In" and grant all permissions

### 4. Verify Google Cloud Project Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your "Docs to Kindle" project
3. Go to **APIs & Services** → **Enabled APIs & services**
4. Verify both are enabled:
   - ✅ Google Drive API
   - ✅ Gmail API

5. Go to **APIs & Services** → **Credentials**
6. Click on your OAuth 2.0 Client ID
7. Verify:
   - Application type: Chrome Extension
   - Item ID matches your extension ID from `chrome://extensions/`

6. Go to **APIs & Services** → **OAuth consent screen**
7. Make sure:
   - Your email is added as a test user
   - Scopes include:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/gmail.send`

### 5. Test the Drive API Directly

In the service worker console:

```javascript
// Get a token
chrome.identity.getAuthToken({ interactive: false }, async (token) => {
  // Get document ID from URL (e.g., from a Google Docs tab)
  const documentId = 'YOUR_DOCUMENT_ID_HERE';

  // Try to export
  const url = `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=application/epub+zip`;

  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  console.log('Response status:', response.status);
  const data = await response.blob();
  console.log('Blob size:', data.size);
});
```

If this works, the issue is in the extension code. If it fails with 403, the issue is with OAuth setup.

### 6. Common Issues and Solutions

#### Issue: "The app is blocked"
**Solution**: Add your email as a test user in OAuth consent screen

#### Issue: Token has wrong scopes
**Solution**:
1. Update `manifest.json` with correct scopes (already done)
2. Reload extension in `chrome://extensions/`
3. Clear tokens and re-authorize (see step 3)

#### Issue: "Access Not Configured"
**Solution**: Enable Google Drive API in Cloud Console

#### Issue: "Invalid Client"
**Solution**:
1. Make sure Client ID in `manifest.json` matches the one in Cloud Console
2. Make sure "Item ID" in Cloud Console matches extension ID from `chrome://extensions/`

### 7. Force Complete Re-authorization

If nothing else works:

```javascript
// In service worker console
chrome.identity.clearAllCachedAuthTokens(() => {
  console.log('All tokens cleared. Click Sign In in Settings.');
});
```

Then go to Settings and sign in again. This will show a fresh consent screen with all permissions.

## What the 403 Error Usually Means

1. **Token doesn't have `drive.readonly` scope** - Most common cause
2. **Drive API not enabled** in Google Cloud Project
3. **OAuth Client ID mismatch** between manifest and Cloud Console
4. **Document is actually restricted** - Try with a document you own
5. **Project in testing mode** and your email not added as test user

## Next Steps After Fixing

Once you see logs without errors:

1. Try sending a document you own (not shared with you)
2. Try different formats (EPUB, DOCX, PDF)
3. Test with a small document first
4. Check Kindle email is configured in Settings
5. Verify Gmail is approved in Amazon settings
