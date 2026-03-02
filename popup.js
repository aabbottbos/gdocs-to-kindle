/**
 * Popup Script
 * Handles the extension popup UI logic
 */

import { formatTimeAgo, truncateText } from './utils/kindle-utils.js';

// DOM elements
let sendBtn, sendBtnText, formatSelect, statusDot, statusText, statusEmail;
let historyList, settingsLink;

// Current tab info
let currentTab = null;
let currentDocumentId = null;
let currentDocumentTitle = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  sendBtn = document.getElementById('sendBtn');
  sendBtnText = document.getElementById('sendBtnText');
  formatSelect = document.getElementById('formatSelect');
  statusDot = document.getElementById('statusDot');
  statusText = document.getElementById('statusText');
  statusEmail = document.getElementById('statusEmail');
  historyList = document.getElementById('historyList');
  settingsLink = document.getElementById('settingsLink');

  // Set up event listeners
  sendBtn.addEventListener('click', handleSendClick);
  formatSelect.addEventListener('change', handleFormatChange);
  settingsLink.addEventListener('click', handleSettingsClick);

  // Initialize
  await checkCurrentTab();
  await loadSettings();
  await checkAuthStatus();
  await loadHistory();
});

/**
 * Checks if current tab is a Google Doc
 */
async function checkCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      setNotOnDocState();
      return;
    }

    currentTab = tabs[0];

    // Check if it's a Google Docs URL
    const docMatch = currentTab.url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);

    if (docMatch) {
      currentDocumentId = docMatch[1];
      currentDocumentTitle = currentTab.title.replace(/ - Google Docs$/, '').trim();
      setOnDocState();
    } else {
      setNotOnDocState();
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
    setNotOnDocState();
  }
}

/**
 * Sets UI state when on a Google Doc
 */
function setOnDocState() {
  sendBtn.disabled = false;
  sendBtnText.textContent = 'Send Current Doc';
}

/**
 * Sets UI state when not on a Google Doc
 */
function setNotOnDocState() {
  sendBtn.disabled = true;
  sendBtnText.textContent = 'Open a Google Doc first';
  currentDocumentId = null;
  currentDocumentTitle = null;
}

/**
 * Loads settings from storage
 */
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      kindleEmail: '',
      format: 'epub',
      autoSend: true,
      deviceLabel: ''
    });

    // Set format dropdown
    formatSelect.value = settings.format;

    // Update status display
    if (settings.kindleEmail) {
      statusDot.className = 'status-dot status-dot--success';
      statusText.textContent = 'Ready to send';
      statusEmail.textContent = `Sending to: ${settings.kindleEmail}`;
      statusEmail.style.display = 'block';
    } else {
      statusDot.className = 'status-dot status-dot--warning';
      statusText.textContent = 'Setup required';
      statusEmail.innerHTML = '<a href="#" id="setupLink">Configure Kindle email →</a>';
      statusEmail.style.display = 'block';

      // Attach event listener to setup link
      const setupLink = document.getElementById('setupLink');
      if (setupLink) {
        setupLink.addEventListener('click', handleSettingsClick);
      }

      // Disable send button if no email configured
      sendBtn.disabled = true;
      sendBtnText.textContent = 'Setup required';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    statusDot.className = 'status-dot status-dot--error';
    statusText.textContent = 'Error loading settings';
  }
}

/**
 * Checks authentication status
 */
async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });

    if (response.authenticated) {
      // Auth is good - status already set in loadSettings
    } else {
      // Not authenticated
      statusDot.className = 'status-dot status-dot--warning';
      statusText.textContent = 'Sign in required';
      statusEmail.textContent = 'Click Settings to sign in';
      statusEmail.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking auth:', error);
  }
}

/**
 * Loads and displays send history
 */
async function loadHistory() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getHistory' });

    if (!response.success || !response.history || response.history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No documents sent yet</div>';
      return;
    }

    // Show most recent 5
    const recentHistory = response.history.slice(0, 5);

    historyList.innerHTML = '';

    recentHistory.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'history-title';
      titleDiv.textContent = truncateText(entry.title, 35);
      titleDiv.title = entry.title; // Full title on hover

      const metaDiv = document.createElement('div');
      metaDiv.className = 'history-meta';

      const formatBadge = document.createElement('span');
      formatBadge.className = 'format-badge';
      formatBadge.textContent = entry.format.toUpperCase();

      const timeSpan = document.createElement('span');
      timeSpan.textContent = formatTimeAgo(entry.sentAt);

      metaDiv.appendChild(formatBadge);
      metaDiv.appendChild(document.createTextNode(' • '));
      metaDiv.appendChild(timeSpan);

      item.appendChild(titleDiv);
      item.appendChild(metaDiv);

      historyList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading history:', error);
    historyList.innerHTML = '<div class="history-empty">Error loading history</div>';
  }
}

/**
 * Handles send button click
 */
async function handleSendClick() {
  if (!currentDocumentId) {
    return;
  }

  // Disable button and show loading state
  sendBtn.disabled = true;
  sendBtnText.textContent = 'Sending...';
  sendBtn.classList.add('send-button--loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'sendToKindle',
      documentId: currentDocumentId,
      documentTitle: currentDocumentTitle
    });

    if (response.success) {
      // Success state
      sendBtn.classList.remove('send-button--loading');
      sendBtn.classList.add('send-button--success');
      sendBtnText.textContent = 'Sent!';

      // Refresh history
      await loadHistory();

      // Reset after 2 seconds
      setTimeout(() => {
        sendBtn.classList.remove('send-button--success');
        sendBtn.disabled = false;
        sendBtnText.textContent = 'Send Current Doc';
      }, 2000);
    } else {
      // Error state
      sendBtn.classList.remove('send-button--loading');
      sendBtn.classList.add('send-button--error');

      if (response.needsSetup) {
        sendBtnText.textContent = 'Setup Required';
      } else {
        sendBtnText.textContent = 'Failed';
      }

      // Show error in status
      statusDot.className = 'status-dot status-dot--error';
      statusText.textContent = response.error || 'Send failed';

      // Reset after 3 seconds
      setTimeout(() => {
        sendBtn.classList.remove('send-button--error');
        sendBtn.disabled = false;
        sendBtnText.textContent = 'Send Current Doc';
        loadSettings(); // Reload status
      }, 3000);
    }
  } catch (error) {
    console.error('Error sending:', error);

    sendBtn.classList.remove('send-button--loading');
    sendBtn.classList.add('send-button--error');
    sendBtnText.textContent = 'Error';

    setTimeout(() => {
      sendBtn.classList.remove('send-button--error');
      sendBtn.disabled = false;
      sendBtnText.textContent = 'Send Current Doc';
    }, 3000);
  }
}

/**
 * Handles format dropdown change
 */
async function handleFormatChange() {
  const newFormat = formatSelect.value;

  try {
    await chrome.storage.sync.set({ format: newFormat });
  } catch (error) {
    console.error('Error saving format:', error);
  }
}

/**
 * Handles settings link click
 */
function handleSettingsClick(e) {
  e.preventDefault();

  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}
