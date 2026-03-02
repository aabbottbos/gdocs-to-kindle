/**
 * Options Page Script
 * Handles settings page logic
 */

import { isValidKindleEmail } from './utils/kindle-utils.js';

// DOM elements
let authStatusDot, authStatusText, authEmail, authBtn;
let kindleEmailInput, emailValidation, saveEmailBtn;
let gmailAddressInput, copyEmailBtn, copyFeedback;
let formatEpub, formatDocx, formatPdf;
let testSendBtn, testResult;

// State
let currentSettings = {};
let isAuthenticated = false;
let userEmail = '';

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  authStatusDot = document.getElementById('authStatusDot');
  authStatusText = document.getElementById('authStatusText');
  authEmail = document.getElementById('authEmail');
  authBtn = document.getElementById('authBtn');

  kindleEmailInput = document.getElementById('kindleEmail');
  emailValidation = document.getElementById('emailValidation');
  saveEmailBtn = document.getElementById('saveEmailBtn');

  gmailAddressInput = document.getElementById('gmailAddress');
  copyEmailBtn = document.getElementById('copyEmailBtn');
  copyFeedback = document.getElementById('copyFeedback');

  formatEpub = document.getElementById('formatEpub');
  formatDocx = document.getElementById('formatDocx');
  formatPdf = document.getElementById('formatPdf');

  testSendBtn = document.getElementById('testSendBtn');
  testResult = document.getElementById('testResult');

  // Set up event listeners
  authBtn.addEventListener('click', handleAuthClick);
  kindleEmailInput.addEventListener('input', handleEmailInput);
  kindleEmailInput.addEventListener('blur', validateEmail);
  saveEmailBtn.addEventListener('click', handleSaveEmail);
  copyEmailBtn.addEventListener('click', handleCopyEmail);

  // Format radio buttons
  [formatEpub, formatDocx, formatPdf].forEach(radio => {
    radio.addEventListener('change', handleFormatChange);
  });

  testSendBtn.addEventListener('click', handleTestSend);

  // Initialize
  await loadSettings();
  await checkAuth();
});

/**
 * Loads settings from storage
 */
async function loadSettings() {
  try {
    currentSettings = await chrome.storage.sync.get({
      kindleEmail: '',
      format: 'epub',
      autoSend: true,
      deviceLabel: ''
    });

    // Populate fields
    kindleEmailInput.value = currentSettings.kindleEmail;

    // Set format radio
    if (currentSettings.format === 'epub') {
      formatEpub.checked = true;
    } else if (currentSettings.format === 'docx') {
      formatDocx.checked = true;
    } else if (currentSettings.format === 'pdf') {
      formatPdf.checked = true;
    }

    // Validate email if present
    if (currentSettings.kindleEmail) {
      validateEmail();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('error', 'Error loading settings');
  }
}

/**
 * Checks authentication status
 */
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });

    if (response.authenticated && response.email) {
      isAuthenticated = true;
      userEmail = response.email;

      authStatusDot.className = 'status-dot status-dot--success';
      authStatusText.textContent = 'Connected';
      authEmail.textContent = response.email;
      authEmail.style.display = 'block';
      authBtn.textContent = 'Sign Out';

      // Populate Gmail address for approved sender section
      gmailAddressInput.value = response.email;
    } else {
      isAuthenticated = false;
      userEmail = '';

      authStatusDot.className = 'status-dot status-dot--warning';
      authStatusText.textContent = 'Not connected';
      authEmail.style.display = 'none';
      authBtn.textContent = 'Sign In';

      gmailAddressInput.value = 'Not signed in';
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    authStatusDot.className = 'status-dot status-dot--error';
    authStatusText.textContent = 'Error';
    authBtn.textContent = 'Retry';
  }
}

/**
 * Handles auth button click (sign in/out)
 */
async function handleAuthClick() {
  if (isAuthenticated) {
    // Sign out
    try {
      authBtn.disabled = true;
      authBtn.textContent = 'Signing out...';

      await chrome.runtime.sendMessage({ action: 'signOut' });

      // Refresh auth status
      await checkAuth();
    } catch (error) {
      console.error('Error signing out:', error);
      showNotification('error', 'Error signing out');
    } finally {
      authBtn.disabled = false;
    }
  } else {
    // Sign in
    try {
      authBtn.disabled = true;
      authBtn.textContent = 'Signing in...';

      // Trigger auth by requesting a token interactively
      await chrome.runtime.sendMessage({ action: 'checkAuth' });

      // Refresh auth status
      await checkAuth();
    } catch (error) {
      console.error('Error signing in:', error);
      showNotification('error', 'Error signing in. Please try again.');
    } finally {
      authBtn.disabled = false;
    }
  }
}

/**
 * Handles Kindle email input
 */
function handleEmailInput() {
  // Clear validation on input
  emailValidation.textContent = '';
  emailValidation.className = 'input-validation';
}

/**
 * Validates Kindle email
 */
function validateEmail() {
  const email = kindleEmailInput.value.trim();

  if (!email) {
    emailValidation.textContent = '';
    emailValidation.className = 'input-validation';
    return false;
  }

  if (isValidKindleEmail(email)) {
    emailValidation.textContent = '✓ Valid Kindle email';
    emailValidation.className = 'input-validation input-validation--success';
    return true;
  } else {
    emailValidation.textContent = '✗ Must be a valid @kindle.com or @free.kindle.com address';
    emailValidation.className = 'input-validation input-validation--error';
    return false;
  }
}

/**
 * Handles save email button click
 */
async function handleSaveEmail() {
  const email = kindleEmailInput.value.trim();

  // Validate
  if (!email) {
    showNotification('error', 'Please enter a Kindle email address');
    return;
  }

  if (!isValidKindleEmail(email)) {
    showNotification('error', 'Please enter a valid Kindle email address');
    validateEmail(); // Show validation error
    return;
  }

  // Save
  try {
    saveEmailBtn.disabled = true;
    saveEmailBtn.textContent = 'Saving...';

    await chrome.storage.sync.set({ kindleEmail: email });

    currentSettings.kindleEmail = email;

    saveEmailBtn.textContent = 'Saved!';
    showNotification('success', 'Kindle email saved successfully');

    setTimeout(() => {
      saveEmailBtn.textContent = 'Save Email Address';
      saveEmailBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error saving email:', error);
    showNotification('error', 'Error saving email. Please try again.');
    saveEmailBtn.textContent = 'Save Email Address';
    saveEmailBtn.disabled = false;
  }
}

/**
 * Handles copy email button click
 */
async function handleCopyEmail() {
  const email = gmailAddressInput.value;

  if (!email || email === 'Not signed in') {
    showNotification('error', 'Please sign in first');
    return;
  }

  try {
    await navigator.clipboard.writeText(email);

    copyFeedback.textContent = 'Copied!';
    copyFeedback.className = 'copy-feedback copy-feedback--success';

    setTimeout(() => {
      copyFeedback.textContent = '';
      copyFeedback.className = 'copy-feedback';
    }, 2000);
  } catch (error) {
    console.error('Error copying email:', error);

    // Fallback: select text
    gmailAddressInput.select();

    copyFeedback.textContent = 'Press Ctrl+C to copy';
    copyFeedback.className = 'copy-feedback copy-feedback--info';

    setTimeout(() => {
      copyFeedback.textContent = '';
      copyFeedback.className = 'copy-feedback';
    }, 3000);
  }
}

/**
 * Handles format radio button change
 */
async function handleFormatChange(e) {
  const format = e.target.value;

  try {
    await chrome.storage.sync.set({ format });
    currentSettings.format = format;
    showNotification('success', `Format changed to ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error saving format:', error);
    showNotification('error', 'Error saving format preference');
  }
}

/**
 * Handles test send button click
 */
async function handleTestSend() {
  // Check if email is configured
  if (!currentSettings.kindleEmail) {
    showNotification('error', 'Please configure your Kindle email first');
    return;
  }

  // Check if authenticated
  if (!isAuthenticated) {
    showNotification('error', 'Please sign in first');
    return;
  }

  // Disable button
  testSendBtn.disabled = true;
  testSendBtn.innerHTML = `
    <svg class="button-icon button-icon--spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
    Sending Test...
  `;

  testResult.textContent = '';
  testResult.className = 'test-result';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'testSend' });

    if (response.success) {
      testResult.textContent = '✓ ' + response.message;
      testResult.className = 'test-result test-result--success';
      showNotification('success', 'Test document sent!');
    } else {
      testResult.textContent = '✗ ' + (response.error || 'Test send failed');
      testResult.className = 'test-result test-result--error';
      showNotification('error', 'Test send failed');
    }
  } catch (error) {
    console.error('Error sending test:', error);
    testResult.textContent = '✗ Error: ' + error.message;
    testResult.className = 'test-result test-result--error';
    showNotification('error', 'Test send failed');
  } finally {
    // Reset button
    testSendBtn.disabled = false;
    testSendBtn.innerHTML = `
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      Send Test Document
    `;
  }
}

/**
 * Shows a notification message
 */
function showNotification(type, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('notification--visible');
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('notification--visible');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
