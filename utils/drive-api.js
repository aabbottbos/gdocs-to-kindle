/**
 * Google Drive API Utilities
 * Handles document export from Google Drive
 */

import { getFormatInfo } from './kindle-utils.js';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Exports a Google Doc to the specified format
 * @param {string} token - OAuth2 access token
 * @param {string} documentId - Google Doc ID
 * @param {string} format - Export format (epub, docx, pdf)
 * @returns {Promise<Blob>} Exported document as Blob
 * @throws {Error} If export fails
 */
export async function exportDocument(token, documentId, format = 'epub') {
  if (!token) {
    throw new Error('OAuth token is required');
  }

  if (!documentId) {
    throw new Error('Document ID is required');
  }

  // Get format info
  const formatInfo = getFormatInfo(format);
  if (!formatInfo) {
    throw new Error(`Invalid format: ${format}`);
  }

  const url = `${DRIVE_API_BASE}/files/${documentId}/export?mimeType=${encodeURIComponent(formatInfo.mimeType)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Handle specific error codes
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));

      // Log full error for debugging
      console.error('Drive API 403 error:', errorData);

      // Check for specific 403 errors
      if (errorData.error?.message?.includes('exportSizeLimitExceeded')) {
        throw new Error(`This document is too large to export as ${format.toUpperCase()}. Try PDF format or split the document.`);
      }

      // Check if it's a scope/permission issue
      if (errorData.error?.message?.includes('insufficient') ||
          errorData.error?.message?.includes('permission') ||
          errorData.error?.code === 403) {
        throw new Error(`Access denied. The extension may need to be re-authorized. Go to Settings and sign out, then sign back in. Error: ${errorData.error?.message || 'Permission denied'}`);
      }

      throw new Error('No access to this document or document too large. Please check permissions.');
    }

    if (response.status === 404) {
      throw new Error('Document not found. It may have been deleted or you may not have access.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Export failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Get the blob
    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error('Export resulted in empty file');
    }

    return blob;

  } catch (error) {
    // Re-throw error with context if it's a fetch error
    if (error.message === 'UNAUTHORIZED') {
      throw error; // Let the caller handle token refresh
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Network error. Please check your internet connection.');
    }

    // Re-throw our custom errors
    throw error;
  }
}

/**
 * Gets document metadata from Google Drive
 * @param {string} token - OAuth2 access token
 * @param {string} documentId - Google Doc ID
 * @returns {Promise<Object>} Document metadata
 */
export async function getDocumentMetadata(token, documentId) {
  if (!token) {
    throw new Error('OAuth token is required');
  }

  if (!documentId) {
    throw new Error('Document ID is required');
  }

  const url = `${DRIVE_API_BASE}/files/${documentId}?fields=id,name,mimeType,size,createdTime,modifiedTime`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 404) {
      throw new Error('Document not found');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Failed to get document metadata';
      throw new Error(errorMessage);
    }

    const metadata = await response.json();
    return metadata;

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      throw error;
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Network error. Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * Checks if a document exists and is accessible
 * @param {string} token - OAuth2 access token
 * @param {string} documentId - Google Doc ID
 * @returns {Promise<boolean>} True if document is accessible
 */
export async function isDocumentAccessible(token, documentId) {
  try {
    await getDocumentMetadata(token, documentId);
    return true;
  } catch (error) {
    return false;
  }
}
