/**
 * Gmail API Utilities
 * Handles email sending via Gmail API with MIME message construction
 */

import { sanitizeFileName } from './kindle-utils.js';

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1';

/**
 * Converts an ArrayBuffer to base64 string
 * Processes in chunks to avoid call stack limits on large files
 * @param {ArrayBuffer} buffer - Binary data to convert
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

/**
 * Encodes a string for Gmail API (URL-safe base64)
 * @param {string} str - String to encode
 * @returns {string} URL-safe base64 encoded string
 */
export function encodeForGmail(str) {
  // Convert to UTF-8 bytes first
  const utf8Bytes = unescape(encodeURIComponent(str));

  // Base64 encode
  const base64 = btoa(utf8Bytes);

  // Make URL-safe: replace + with -, / with _, and remove padding =
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds a MIME message with attachment
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} textBody - Plain text body
 * @param {Blob} attachmentBlob - File to attach
 * @param {string} fileName - Name for the attachment
 * @param {string} mimeType - MIME type of attachment
 * @returns {Promise<string>} Complete MIME message
 */
export async function buildMimeMessage(to, subject, textBody, attachmentBlob, fileName, mimeType) {
  // Generate boundary string
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Sanitize filename
  const safeFileName = sanitizeFileName(fileName);

  // Build message parts
  const messageParts = [];

  // Headers
  messageParts.push(`To: ${to}`);
  messageParts.push(`Subject: ${subject}`);
  messageParts.push('MIME-Version: 1.0');
  messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  messageParts.push('');

  // Text body part
  messageParts.push(`--${boundary}`);
  messageParts.push('Content-Type: text/plain; charset="UTF-8"');
  messageParts.push('');
  messageParts.push(textBody);
  messageParts.push('');

  // Attachment part
  messageParts.push(`--${boundary}`);
  messageParts.push(`Content-Type: ${mimeType}; name="${safeFileName}"`);
  messageParts.push(`Content-Disposition: attachment; filename="${safeFileName}"`);
  messageParts.push('Content-Transfer-Encoding: base64');
  messageParts.push('');

  // Convert blob to base64
  const arrayBuffer = await attachmentBlob.arrayBuffer();
  const base64Data = arrayBufferToBase64(arrayBuffer);

  // Split base64 into 76-character lines (RFC 2045)
  const base64Lines = base64Data.match(/.{1,76}/g) || [];
  messageParts.push(...base64Lines);
  messageParts.push('');

  // Closing boundary
  messageParts.push(`--${boundary}--`);

  // Join all parts
  const rawMessage = messageParts.join('\r\n');

  return rawMessage;
}

/**
 * Sends an email with attachment via Gmail API
 * @param {string} token - OAuth2 access token
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @param {Blob} attachmentBlob - File to attach
 * @param {string} fileName - Name for the attachment
 * @param {string} mimeType - MIME type of attachment
 * @returns {Promise<Object>} Gmail API response with message ID
 * @throws {Error} If send fails
 */
export async function sendEmail(token, to, subject, body, attachmentBlob, fileName, mimeType) {
  if (!token) {
    throw new Error('OAuth token is required');
  }

  if (!to) {
    throw new Error('Recipient email is required');
  }

  if (!attachmentBlob) {
    throw new Error('Attachment is required');
  }

  try {
    // Build MIME message
    const mimeMessage = await buildMimeMessage(to, subject, body, attachmentBlob, fileName, mimeType);

    // Encode for Gmail
    const encodedMessage = encodeForGmail(mimeMessage);

    // Send via Gmail API
    const url = `${GMAIL_API_BASE}/users/me/messages/send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Gmail API access denied';
      throw new Error(`Gmail permission error: ${errorMessage}. Please re-authorize the extension.`);
    }

    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Send failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    // Re-throw special errors for handling by caller
    if (error.message === 'UNAUTHORIZED' || error.message === 'RATE_LIMIT') {
      throw error;
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * Sends a plain text email (no attachment)
 * Useful for test emails
 * @param {string} token - OAuth2 access token
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<Object>} Gmail API response
 */
export async function sendPlainEmail(token, to, subject, body) {
  if (!token) {
    throw new Error('OAuth token is required');
  }

  if (!to) {
    throw new Error('Recipient email is required');
  }

  try {
    // Build simple message
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body
    ];

    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = encodeForGmail(rawMessage);

    // Send via Gmail API
    const url = `${GMAIL_API_BASE}/users/me/messages/send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Send failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'RATE_LIMIT') {
      throw error;
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw error;
  }
}
