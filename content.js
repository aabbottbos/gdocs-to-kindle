/**
 * Content Script - Injects "Send to Kindle" button into Google Docs
 * Runs on docs.google.com/document/d/* pages
 */

// Button state tracking
let currentButtonState = 'default';
let injectionAttempts = 0;
const MAX_INJECTION_ATTEMPTS = 20;

// ============================================
// 1. EXTRACT DOCUMENT ID FROM URL
// ============================================
function getDocumentId() {
  const match = window.location.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ============================================
// 2. GET DOCUMENT TITLE FROM PAGE
// ============================================
function getDocumentTitle() {
  // Try the title input first (most accurate)
  const titleInput = document.querySelector('.docs-title-input');
  if (titleInput) {
    const title = titleInput.value || titleInput.textContent;
    if (title) return title.trim();
  }

  // Fallback to page title
  const pageTitle = document.title.replace(/ - Google Docs$/, '').trim();
  return pageTitle || 'Untitled Document';
}

// ============================================
// 3. CREATE THE KINDLE BUTTON
// ============================================
function createKindleButton() {
  // Check if button already exists
  if (document.getElementById('docs-to-kindle-btn')) {
    return null;
  }

  const button = document.createElement('div');
  button.id = 'docs-to-kindle-btn';
  button.className = 'docs-to-kindle-button';
  button.setAttribute('role', 'button');
  button.setAttribute('aria-label', 'Send to Kindle');
  button.setAttribute('title', 'Send this document to your Kindle');
  button.setAttribute('data-state', 'default');

  // SVG Icon - book with arrow
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('width', '18');
  icon.setAttribute('height', '18');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2');
  icon.classList.add('kindle-icon');

  // Book shape
  const bookPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bookPath1.setAttribute('d', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20');

  const bookPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bookPath2.setAttribute('d', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');

  // Arrow
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  arrowPath.setAttribute('points', '10 8 14 12 10 16');

  icon.appendChild(bookPath1);
  icon.appendChild(bookPath2);
  icon.appendChild(arrowPath);

  // Label
  const label = document.createElement('span');
  label.className = 'kindle-label';
  label.textContent = 'Send to Kindle';

  button.appendChild(icon);
  button.appendChild(label);

  // Click handler
  button.addEventListener('click', handleSendToKindle);

  return button;
}

// ============================================
// 4. HANDLE SEND ACTION
// ============================================
async function handleSendToKindle() {
  const button = document.getElementById('docs-to-kindle-btn');
  if (!button) return;

  // Don't allow clicks while processing
  if (currentButtonState === 'loading') {
    return;
  }

  // Get document info
  const documentId = getDocumentId();
  console.log('Content script - Document ID:', documentId);
  console.log('Content script - Current URL:', window.location.href);

  if (!documentId) {
    showToast('error', 'Unable to get document ID. Please refresh the page.');
    return;
  }

  const documentTitle = getDocumentTitle();
  console.log('Content script - Document title:', documentTitle);

  // Set loading state
  setButtonState('loading');

  try {
    // Send message to background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'sendToKindle',
          documentId,
          documentTitle
        },
        resolve
      );
    });

    if (response.success) {
      setButtonState('success');
      showToast('success', `"${response.title}" sent to Kindle!`);

      // Reset state after 3 seconds
      setTimeout(() => {
        setButtonState('default');
      }, 3000);
    } else {
      setButtonState('error');

      // Check if it's a setup error
      if (response.needsSetup) {
        showToast('error', response.error, true);
      } else {
        showToast('error', response.error || 'Failed to send document');
      }

      // Reset state after 5 seconds
      setTimeout(() => {
        setButtonState('default');
      }, 5000);
    }
  } catch (error) {
    console.error('Send to Kindle error:', error);
    setButtonState('error');
    showToast('error', 'Extension error. Please try again.');

    setTimeout(() => {
      setButtonState('default');
    }, 5000);
  }
}

// ============================================
// 5. BUTTON STATE MANAGEMENT
// ============================================
function setButtonState(state) {
  const button = document.getElementById('docs-to-kindle-btn');
  if (!button) return;

  currentButtonState = state;
  button.setAttribute('data-state', state);

  const label = button.querySelector('.kindle-label');
  if (!label) return;

  switch (state) {
    case 'loading':
      label.textContent = 'Sending...';
      button.style.pointerEvents = 'none';
      break;
    case 'success':
      label.textContent = 'Sent!';
      button.style.pointerEvents = 'none';
      break;
    case 'error':
      label.textContent = 'Failed';
      button.style.pointerEvents = 'auto';
      break;
    case 'default':
    default:
      label.textContent = 'Send to Kindle';
      button.style.pointerEvents = 'auto';
      break;
  }
}

// ============================================
// 6. INJECT BUTTON INTO TOOLBAR
// ============================================
function injectButton() {
  // Don't inject if already exists
  if (document.getElementById('docs-to-kindle-btn')) {
    return true;
  }

  // Don't try forever
  if (injectionAttempts >= MAX_INJECTION_ATTEMPTS) {
    return false;
  }

  injectionAttempts++;

  // Try different injection targets (in order of preference)

  // Target A: .docs-titlebar-buttons (preferred - next to Share button)
  const titlebarButtons = document.querySelector('.docs-titlebar-buttons');
  if (titlebarButtons) {
    const button = createKindleButton();
    if (button) {
      // Insert as first child
      titlebarButtons.insertBefore(button, titlebarButtons.firstChild);
      console.log('Docs to Kindle: Button injected into titlebar');
      return true;
    }
  }

  // Target B: #docs-menubar (fallback)
  const menubar = document.querySelector('#docs-menubar');
  if (menubar) {
    const button = createKindleButton();
    if (button) {
      menubar.appendChild(button);
      console.log('Docs to Kindle: Button injected into menubar');
      return true;
    }
  }

  // Target C: .docs-toolbar-wrapper (last resort)
  const toolbarWrapper = document.querySelector('.docs-toolbar-wrapper');
  if (toolbarWrapper) {
    const button = createKindleButton();
    if (button) {
      toolbarWrapper.appendChild(button);
      console.log('Docs to Kindle: Button injected into toolbar wrapper');
      return true;
    }
  }

  return false;
}

// ============================================
// 7. TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(type, message, includeSettingsLink = false) {
  // Remove any existing toasts
  const existingToast = document.querySelector('.docs-to-kindle-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `docs-to-kindle-toast docs-to-kindle-toast--${type}`;

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  // Add settings link if needed
  if (includeSettingsLink && type === 'error') {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Open Settings';
    link.style.marginLeft = '12px';
    link.style.color = 'inherit';
    link.style.textDecoration = 'underline';
    link.style.fontWeight = 'bold';

    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: 'openOptions' });
      // Fallback: open options page directly
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });

    toast.appendChild(link);
  }

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('docs-to-kindle-toast--visible');
  }, 10);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('docs-to-kindle-toast--visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ============================================
// 8. MUTATION OBSERVER + PERIODIC CHECK
// ============================================
let observer = null;
let periodicCheckInterval = null;

function startObserving() {
  // Try immediate injection
  if (injectButton()) {
    console.log('Docs to Kindle: Initial injection successful');
  }

  // Set up MutationObserver
  observer = new MutationObserver(() => {
    // Check if button is missing
    if (!document.getElementById('docs-to-kindle-btn')) {
      injectButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Periodic check every 2 seconds as safety net
  periodicCheckInterval = setInterval(() => {
    if (!document.getElementById('docs-to-kindle-btn')) {
      injectButton();
    }
  }, 2000);

  console.log('Docs to Kindle: Started observing for button injection');
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval);
    periodicCheckInterval = null;
  }
}

// ============================================
// 9. INITIALIZATION
// ============================================
function init() {
  // Verify we're on a Google Docs document page
  const documentId = getDocumentId();
  if (!documentId) {
    console.log('Docs to Kindle: Not on a document page');
    return;
  }

  console.log('Docs to Kindle: Initializing on document', documentId);

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
}

// Start initialization
init();

// Handle page navigation (for single-page app behavior)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Docs to Kindle: URL changed, re-initializing');
    injectionAttempts = 0; // Reset counter
    injectButton();
  }
}).observe(document.body, { childList: true, subtree: true });
