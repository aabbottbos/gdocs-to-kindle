# Docs to Kindle

Send Google Docs to your Kindle with one click. Export as EPUB for perfect reflowable reading.

## What This Does

**Docs to Kindle** is a Chrome Extension that eliminates the tedious 5+ step process of sending Google Docs to your Kindle. Instead of manually exporting, downloading, navigating to Send to Kindle, uploading, selecting your device, and clicking send—you just click one button directly in Google Docs.

The extension:
- Adds a "Send to Kindle" button to the Google Docs toolbar
- Exports your document as EPUB (or DOCX/PDF) via Google Drive API
- Sends it to your Kindle email via Gmail API
- Tracks your send history
- Works entirely within your own Google and Amazon accounts (no third-party services)

## Quick Start

1. **Clone this repository**
   ```bash
   git clone https://github.com/yourusername/docs-to-kindle.git
   cd docs-to-kindle
   ```

2. **Set up Google Cloud Project** (see detailed instructions below)
   - Enable Drive API and Gmail API
   - Create OAuth Client ID
   - Copy Client ID to `manifest.json`

3. **Load extension in Chrome**
   ```
   1. Open Chrome and go to chrome://extensions/
   2. Enable "Developer mode" (toggle in top right)
   3. Click "Load unpacked"
   4. Select the docs-to-kindle directory
   ```

4. **Configure extension**
   - Click the extension icon and go to Settings
   - Sign in with your Google account
   - Enter your Kindle email address
   - Add your Gmail address to Amazon's approved senders (critical!)

5. **Start using**
   - Open any Google Doc
   - Click the "Send to Kindle" button in the toolbar
   - Your document appears on your Kindle in minutes!

---

## Google Cloud Project Setup (Detailed)

This is required for the OAuth2 authentication that allows the extension to access your Google Drive and Gmail.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Docs to Kindle" (or any name you prefer)
4. Click "Create"
5. Wait for the project to be created, then select it

### Step 2: Enable Required APIs

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google Drive API" and click on it
3. Click **Enable**
4. Go back to the API Library
5. Search for "Gmail API" and click on it
6. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Docs to Kindle
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click "Add or Remove Scopes"
   - Add these scopes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
   - Click **Update**
7. Click **Save and Continue**
8. **Test users**: Add your Gmail address as a test user
9. Click **Save and Continue**
10. Review and click **Back to Dashboard**

### Step 4: Create OAuth Client ID

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. **Application type**: Select **Chrome extension**
4. **Name**: Docs to Kindle
5. **Item ID**:
   - First, load the extension as "unpacked" in Chrome (see step 3 in Quick Start)
   - Go to `chrome://extensions/` in Chrome
   - Find your extension and copy the **ID** (a string like `abcdefghijklmnopqrstuvwxyz`)
   - Paste this ID into the "Item ID" field in Google Cloud Console
6. Click **Create**
7. A dialog will show your **Client ID** - copy it!
8. Open `manifest.json` in the extension directory
9. Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
10. Save the file
11. Go back to `chrome://extensions/` and click the **Reload** icon on your extension

---

## Finding Your Kindle Email

Your Kindle email address is where documents will be sent. It looks like `username_abc123@kindle.com`.

### Method A: Amazon Website

1. Go to [Amazon.com](https://www.amazon.com/)
2. Hover over **Account & Lists** → Click **Content & Devices**
3. Click the **Preferences** tab
4. Scroll down to **Personal Document Settings**
5. Look for "Send-to-Kindle Email Settings"
6. Your Kindle email(s) will be listed there (one per device)

**Direct link**: [Amazon Content & Devices](https://www.amazon.com/mn/dcw/myx.html#/home/settings/payment)

### Method B: On Your Kindle Device

1. On your Kindle, tap the top of the screen to open the menu
2. Tap **Settings**
3. Tap **Device Options**
4. Tap **Personalize Your Kindle**
5. Look for **Send to Kindle Email**

---

## Adding Gmail to Amazon's Approved Senders

**This step is critical!** Amazon will reject documents unless they come from an approved email address.

1. Go to [Amazon Content & Devices](https://www.amazon.com/mn/dcw/myx.html#/home/settings/payment)
2. Click the **Preferences** tab
3. Scroll to **Personal Document Settings**
4. Find **Approved Personal Document E-mail List**
5. Click **Add a new approved e-mail address**
6. Enter your Gmail address (the one you signed in with in the extension)
7. Click **Add Address**

**Verification**: Your Gmail address should now appear in the approved list.

---

## Supported Export Formats

The extension supports three export formats. You can change the format in the extension settings or popup.

| Format | Pros | Cons | Best For |
|--------|------|------|----------|
| **EPUB** (Recommended) | Perfect text reflow, adjustable font size, native Kindle experience, small file size | May not preserve complex layouts perfectly | Articles, books, standard documents |
| **DOCX** | Good text reflow, preserves tables and columns | Larger file size, may have formatting quirks | Documents with tables and structured content |
| **PDF** | Exact layout preservation, what-you-see-is-what-you-get | Fixed layout, poor on small screens, no font adjustment | Documents with specific visual formatting, forms, certificates |

**Recommendation**: Start with EPUB. It provides the best reading experience on Kindle and is what Amazon uses for its own books.

---

## Usage

### From Google Docs Toolbar

1. Open any Google Doc
2. Look for the "Send to Kindle" button in the toolbar (near the Share button)
3. Click it
4. A toast notification will confirm success
5. Check your Kindle in 1-5 minutes

### From Extension Popup

1. Open a Google Doc
2. Click the extension icon in Chrome toolbar
3. Select your preferred format (optional)
4. Click "Send Current Doc"
5. Check your Kindle in 1-5 minutes

### Viewing History

- Click the extension icon
- Scroll to "Recent Sends" to see your last 5 documents
- Full history (last 20) is stored locally

---

## Troubleshooting

### Button doesn't appear in Google Docs

**Solution**:
- Refresh the page (F5 or Cmd+R)
- Make sure you're on a document edit URL: `docs.google.com/document/d/...`
- Check that the extension is enabled: `chrome://extensions/`
- Try disabling and re-enabling the extension

### "Authentication failed" error

**Solution**:
- Go to extension Settings
- Click "Sign Out" then "Sign In"
- Grant all requested permissions in the consent screen
- Make sure your Google Cloud OAuth consent screen includes your email as a test user

### "Kindle email not configured" error

**Solution**:
- Click the extension icon → Settings
- Enter your Kindle email in the format: `username_abc123@kindle.com`
- Click "Save Email Address"

### Document doesn't appear on Kindle

**Possible causes**:

1. **Gmail not approved** (most common!)
   - Go to Amazon → Content & Devices → Preferences
   - Check "Approved Personal Document E-mail List"
   - Add your Gmail address if missing

2. **Kindle not connected to Wi-Fi**
   - Connect your Kindle to Wi-Fi
   - Documents only sync over Wi-Fi, not cellular

3. **Amazon delivery delay**
   - Documents can take 1-10 minutes to arrive
   - Check your Kindle's "All" items view (not just "Downloaded")

4. **Invalid Kindle email**
   - Double-check your Kindle email in extension settings
   - Make sure it ends with `@kindle.com` or `@free.kindle.com`

5. **Document too large**
   - Google Drive has a 10MB export limit
   - Try a different format (PDF is usually smallest)
   - Or split the document into parts

### "Export failed" or "No access to this document"

**Solution**:
- Make sure you have at least "View" access to the document
- Check if the document owner has restricted export/download
- Try making a copy of the document and sending that

### "Rate limit exceeded" error

**Solution**:
- Wait 30-60 seconds before trying again
- You're sending too many documents too quickly
- Gmail API has rate limits (typically 100 emails per day for new accounts)

### Extension works once, then stops working

**Solution**:
- This is usually a token expiration issue
- Go to Settings → Sign Out → Sign In
- The extension will refresh your OAuth tokens

---

## Privacy & Security

**No third-party services**: Your document content only passes through:
- **Google** (which already has access to your Google Docs)
- **Amazon** (via your own Gmail account sending to your own Kindle email)

**No data collection**: This extension does not:
- Track your usage
- Send analytics
- Store your documents on any external server
- Share your data with anyone

**Local storage only**:
- Settings are stored in Chrome's sync storage (encrypted, synced to your Google account)
- Send history is stored locally on your device only

**Open source**: The entire codebase is in this repository. You can audit exactly what it does.

**Permissions explained**:
- `identity`: To authenticate with Google (OAuth2)
- `storage`: To save your settings and history
- `activeTab`: To detect when you're on a Google Doc
- `docs.google.com`: To inject the button into Google Docs
- `www.googleapis.com`: To call Google Drive and Gmail APIs

---

## Development

### Project Structure

```
docs-to-kindle/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (API calls, OAuth)
├── content.js                 # Button injection into Google Docs
├── content.css                # Button styling
├── popup.html/js/css          # Extension popup UI
├── options.html/js/css        # Settings page
├── utils/
│   ├── drive-api.js           # Google Drive export helpers
│   ├── gmail-api.js           # Gmail send helpers
│   └── kindle-utils.js        # Validation and formatting
└── icons/                     # Extension icons
```

### Tech Stack

- **Manifest V3**: Latest Chrome extension format
- **Vanilla JavaScript**: No frameworks, no build step
- **ES Modules**: Modern import/export syntax
- **Chrome APIs**: identity, storage, runtime, tabs
- **Google APIs**: Drive v3, Gmail v1

### Making Changes

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension
4. Refresh any open Google Docs tabs
5. Test your changes

### Debugging

**Background service worker**:
```
chrome://extensions/ → Extension details → "Inspect views: service worker"
```

**Content script**:
```
Open a Google Doc → Right-click → Inspect → Console tab
```

**Popup**:
```
Click extension icon → Right-click on popup → Inspect
```

### Common Development Tasks

**Test OAuth flow**:
```javascript
// In service worker console
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  console.log('Token:', token);
});
```

**Test export**:
```javascript
// Get a document ID from a Google Docs URL
// In service worker console
import { exportDocument } from './utils/drive-api.js';
const token = 'your-token-here';
const blob = await exportDocument(token, 'DOCUMENT_ID', 'epub');
console.log('Export size:', blob.size);
```

**Clear all data**:
```javascript
// In service worker console
chrome.storage.sync.clear();
chrome.storage.local.clear();
console.log('Storage cleared');
```

---

## Limitations

- **10MB export limit**: Google Drive API has a 10MB limit per export. Very large or image-heavy documents may fail.
- **Gmail rate limits**: New Google accounts have lower rate limits (~100 emails/day). Established accounts have higher limits.
- **No offline support**: Requires internet connection to export and send.
- **Single document only**: Batch sending multiple documents is not supported (future feature).
- **Public Google accounts only**: OAuth consent screen must be set to "External" type.

---

## Future Enhancements (Not in V1)

These features are planned for future versions:

- **Batch send**: Select multiple docs from Google Drive and send all at once
- **Folder monitoring**: Auto-send new docs from a watched folder
- **Format customization**: Custom CSS for EPUB output
- **Send selection only**: Highlight text and send just that portion
- **Scheduled sends**: Queue documents for evening reading
- **Support for Sheets/Slides**: Export other Google Workspace file types

---

## FAQ

**Q: Does this work with Google Sheets or Slides?**
A: Not yet. Currently only Google Docs are supported.

**Q: Can I send to multiple Kindles?**
A: You can configure one Kindle email at a time. To send to another device, change the email in settings. Future versions may support multiple devices.

**Q: Will this work on Firefox or Safari?**
A: Not currently. This is a Chrome extension using Chrome-specific APIs. Firefox and Safari versions are possible future work.

**Q: Do I need a Kindle device?**
A: No! You can use the Kindle app on your phone, tablet, or computer. The document will sync to all devices registered to your Kindle email.

**Q: What happens if I exceed Gmail's rate limit?**
A: The extension will show an error. Wait a few minutes and try again. Gmail rate limits reset over time.

**Q: Can I customize the email subject or body?**
A: Not in V1. The subject is the document title, and the body is a simple "Sent from Docs to Kindle" message.

**Q: Is my document content stored anywhere?**
A: No. The document is exported from Google Drive and immediately sent via Gmail. It's not stored by the extension.

**Q: Can I use this at work/school with a Google Workspace account?**
A: Yes, but your Google Cloud OAuth consent screen must include your work email as a test user, or your workspace admin must configure the app.

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (all three formats, error cases, etc.)
5. Submit a pull request with a clear description

**Code style**:
- Use ES modules (`import`/`export`)
- Write clear comments
- Follow existing naming conventions
- No external dependencies (keep it vanilla JS)

---

## License

MIT License - see LICENSE file for details.

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Check existing [GitHub Issues](https://github.com/yourusername/docs-to-kindle/issues)
3. Open a new issue with:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Error messages (check console logs)
   - Screenshots if relevant

---

## Acknowledgments

- Built with the Chrome Extension Manifest V3 framework
- Uses Google Drive API and Gmail API
- Icons generated with the included `generate-icons.html` tool
- Inspired by the tedious manual process of sending docs to Kindle

---

## Version History

**v1.0.0** (Initial Release)
- One-click send to Kindle from Google Docs toolbar
- Support for EPUB, DOCX, and PDF export formats
- OAuth2 authentication with Google
- Send history tracking (last 20 documents)
- Settings page with Kindle email configuration
- Test send functionality
- Comprehensive error handling and user feedback
