/**
 * Kindle Utilities
 * Helper functions for Kindle email validation, format handling, and filename sanitization
 */

/**
 * Format configuration map
 * Maps format names to MIME types, file extensions, and descriptions
 */
export const FORMAT_INFO = {
  epub: {
    mimeType: 'application/epub+zip',
    extension: 'epub',
    description: 'Best reading experience. Text reflows to fit your screen. Adjustable font size. Works like a real Kindle book.'
  },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    description: 'Preserves more complex formatting (tables, columns). Text reflows but may not be as clean.'
  },
  pdf: {
    mimeType: 'application/pdf',
    extension: 'pdf',
    description: 'Exact layout preservation. Best for documents with specific visual formatting. Poor readability on smaller screens.'
  }
};

/**
 * Validates a Kindle email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid Kindle email
 */
export function isValidKindleEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  email = email.trim().toLowerCase();

  // Must end with @kindle.com or @free.kindle.com
  const kindleEmailPattern = /@(kindle|free\.kindle)\.com$/i;

  // Basic email structure check (has @ and domain)
  const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return basicEmailPattern.test(email) && kindleEmailPattern.test(email);
}

/**
 * Sanitizes a filename by removing invalid characters
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename safe for attachment
 */
export function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') {
    return 'document';
  }

  // Remove characters not safe for filenames
  // Keep alphanumeric, spaces, hyphens, underscores, and periods
  let sanitized = name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .trim();

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Truncate to 100 characters
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  // If empty after sanitization, use default
  if (!sanitized) {
    sanitized = 'document';
  }

  return sanitized;
}

/**
 * Gets format information for a given format type
 * @param {string} format - Format type (epub, docx, pdf)
 * @returns {Object|null} Format info object or null if invalid
 */
export function getFormatInfo(format) {
  if (!format || typeof format !== 'string') {
    return FORMAT_INFO.epub; // Default to EPUB
  }

  const normalizedFormat = format.toLowerCase().trim();
  return FORMAT_INFO[normalizedFormat] || FORMAT_INFO.epub;
}

/**
 * Validates format string
 * @param {string} format - Format to validate
 * @returns {boolean} True if valid format
 */
export function isValidFormat(format) {
  if (!format || typeof format !== 'string') {
    return false;
  }
  const normalizedFormat = format.toLowerCase().trim();
  return normalizedFormat in FORMAT_INFO;
}

/**
 * Gets all available format types
 * @returns {Array<string>} Array of format names
 */
export function getAvailableFormats() {
  return Object.keys(FORMAT_INFO);
}

/**
 * Formats time ago string for display
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Human-readable time ago string
 */
export function formatTimeAgo(dateString) {
  if (!dateString) {
    return 'Unknown';
  }

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}
