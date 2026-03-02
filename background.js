/**
 * Background Service Worker
 * Handles OAuth2 token management, Google Drive export, Gmail send, and message routing
 */

import { exportDocument } from './utils/drive-api.js';
import { sendEmail, sendPlainEmail } from './utils/gmail-api.js';
import { getFormatInfo, sanitizeFileName } from './utils/kindle-utils.js';

// Message listener - routes messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message types
  switch (message.action) {
    case 'sendToKindle':
      handleSendToKindle(message)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response

    case 'checkAuth':
      checkAuthStatus()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getHistory':
      getHistory()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'testSend':
      handleTestSend()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'signOut':
      handleSignOut()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

/**
 * Main send-to-Kindle pipeline
 * @param {Object} message - Message containing documentId and documentTitle
 * @returns {Promise<Object>} Success/failure response
 */
async function handleSendToKindle(message) {
  const { documentId, documentTitle } = message;

  console.log('=== Send to Kindle started ===');
  console.log('Document ID:', documentId);
  console.log('Document Title:', documentTitle);

  if (!documentId) {
    return { success: false, error: 'Document ID is required' };
  }

  try {
    // Step 1: Get OAuth token
    const token = await getAuthToken();
    console.log('Got OAuth token, length:', token ? token.length : 'null');

    // Step 2: Get settings
    const settings = await getSettings();
    console.log('Settings loaded:', { kindleEmail: settings.kindleEmail, format: settings.format });

    if (!settings.kindleEmail) {
      return {
        success: false,
        error: 'Kindle email not configured. Open extension settings.',
        needsSetup: true
      };
    }

    // Step 3: Verify document type first
    console.log('Checking document metadata for ID:', documentId);
    try {
      const metadata = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?fields=id,name,mimeType`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());

      console.log('Document metadata:', metadata);

      // Check if it's a Google Docs file
      if (metadata.mimeType !== 'application/vnd.google-apps.document') {
        return {
          success: false,
          error: `This is not a Google Docs document. File type: ${metadata.mimeType}. Only Google Docs can be exported.`
        };
      }
    } catch (metadataError) {
      console.error('Failed to get document metadata:', metadataError);
      // Continue anyway - the export call will give us the real error
    }

    // Step 4: Export document from Google Drive
    const format = settings.format || 'epub';
    const formatInfo = getFormatInfo(format);
    console.log('Exporting document:', { documentId, format, mimeType: formatInfo.mimeType });

    let blob;
    try {
      blob = await exportDocument(token, documentId, format);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        // Token expired, refresh and retry
        const newToken = await refreshAuthToken(token);
        blob = await exportDocument(newToken, documentId, format);
      } else {
        throw error;
      }
    }

    // Step 5: Send to Kindle via Gmail
    const title = documentTitle || 'Untitled Document';
    const safeFileName = sanitizeFileName(title) + '.' + formatInfo.extension;
    const emailSubject = title;
    const emailBody = 'Sent from Docs to Kindle Chrome Extension\n\nDocument: ' + title;

    try {
      await sendEmail(
        token,
        settings.kindleEmail,
        emailSubject,
        emailBody,
        blob,
        safeFileName,
        formatInfo.mimeType
      );
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') {
        // Token expired, refresh and retry
        const newToken = await refreshAuthToken(token);
        await sendEmail(
          newToken,
          settings.kindleEmail,
          emailSubject,
          emailBody,
          blob,
          safeFileName,
          formatInfo.mimeType
        );
      } else if (error.message === 'RATE_LIMIT') {
        // Handle rate limiting with exponential backoff
        await sleep(1000);
        try {
          await sendEmail(
            token,
            settings.kindleEmail,
            emailSubject,
            emailBody,
            blob,
            safeFileName,
            formatInfo.mimeType
          );
        } catch (retryError) {
          if (retryError.message === 'RATE_LIMIT') {
            throw new Error('Too many requests. Please wait a moment and try again.');
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // Step 6: Save to history
    await saveToHistory(documentId, title, format);

    return {
      success: true,
      title: title,
      format: format
    };

  } catch (error) {
    console.error('Send to Kindle failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Gets OAuth2 access token
 * @param {boolean} interactive - Whether to show consent screen if needed
 * @returns {Promise<string>} OAuth token
 */
async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Authentication failed'));
      } else if (!token) {
        reject(new Error('No token received'));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Refreshes an expired OAuth token
 * @param {string} expiredToken - The expired token to clear
 * @returns {Promise<string>} New OAuth token
 */
async function refreshAuthToken(expiredToken) {
  // Remove the expired token from cache
  await new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token: expiredToken }, () => {
      resolve();
    });
  });

  // Get a fresh token (non-interactive first attempt)
  try {
    return await getAuthToken(false);
  } catch (error) {
    // If non-interactive fails, try interactive
    return await getAuthToken(true);
  }
}

/**
 * Checks authentication status
 * @returns {Promise<Object>} Auth status with user info
 */
async function checkAuthStatus() {
  try {
    // Try to get token without showing consent screen
    const token = await getAuthToken(false);

    // Get user profile info
    const userInfo = await new Promise((resolve) => {
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (info) => {
        resolve(info);
      });
    });

    return {
      success: true,
      authenticated: true,
      email: userInfo.email || 'Unknown'
    };
  } catch (error) {
    return {
      success: true,
      authenticated: false
    };
  }
}

/**
 * Signs out the user by clearing auth token
 * @returns {Promise<Object>} Success response
 */
async function handleSignOut() {
  try {
    const token = await getAuthToken(false);
    await new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
    });

    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    // Even if getting token fails, consider it signed out
    return {
      success: true,
      message: 'Signed out'
    };
  }
}

/**
 * Gets extension settings from chrome.storage.sync
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        kindleEmail: '',
        format: 'epub',
        autoSend: true,
        deviceLabel: ''
      },
      (settings) => {
        resolve(settings);
      }
    );
  });
}

/**
 * Gets send history from chrome.storage.local
 * @returns {Promise<Object>} History response
 */
async function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ history: [] }, (data) => {
      resolve({
        success: true,
        history: data.history || []
      });
    });
  });
}

/**
 * Saves a send event to history
 * @param {string} documentId - Document ID
 * @param {string} title - Document title
 * @param {string} format - Export format
 * @returns {Promise<void>}
 */
async function saveToHistory(documentId, title, format) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ history: [] }, (data) => {
      const history = data.history || [];

      // Add new entry at the beginning
      history.unshift({
        documentId,
        title,
        format,
        sentAt: new Date().toISOString()
      });

      // Keep only last 20 entries
      const trimmedHistory = history.slice(0, 20);

      chrome.storage.local.set({ history: trimmedHistory }, () => {
        resolve();
      });
    });
  });
}

/**
 * Handles test send - sends a small test document
 * @returns {Promise<Object>} Success/failure response
 */
async function handleTestSend() {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Get settings
    const settings = await getSettings();

    if (!settings.kindleEmail) {
      return {
        success: false,
        error: 'Kindle email not configured. Please set it in extension settings.'
      };
    }

    // Create a test text file
    const testContent = 'This is a test from Docs to Kindle Chrome Extension.\n\n' +
      'If you receive this on your Kindle, the extension is working correctly!\n\n' +
      'Sent at: ' + new Date().toLocaleString();

    const testBlob = new Blob([testContent], { type: 'text/plain' });

    // Send via Gmail
    const subject = 'Test from Docs to Kindle';
    const body = 'Test email from Docs to Kindle Chrome Extension';

    await sendEmail(
      token,
      settings.kindleEmail,
      subject,
      body,
      testBlob,
      'test-docs-to-kindle.txt',
      'text/plain'
    );

    return {
      success: true,
      message: 'Test document sent! Check your Kindle in a few minutes.'
    };

  } catch (error) {
    console.error('Test send failed:', error);
    return {
      success: false,
      error: error.message || 'Test send failed'
    };
  }
}

/**
 * Sleep utility for rate limiting
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log service worker startup
console.log('Docs to Kindle service worker started');
