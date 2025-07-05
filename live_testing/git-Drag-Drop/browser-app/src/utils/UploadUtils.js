// UploadUtils.js - Utilities for handling large zip file uploads

import JSZip from 'jszip';

/**
 * Configuration for upload processing
 */
export const UPLOAD_CONFIG = {
  BATCH_SIZE: 10, // Number of files to process in each batch
  DELAY_BETWEEN_BATCHES: 1000, // Delay between batches in milliseconds
  MAX_RETRIES: 3, // Maximum number of retries for failed operations
  RETRY_DELAY: 2000, // Initial delay for retries
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB max file size for individual files
  PROGRESS_UPDATE_INTERVAL: 100, // How often to update progress (ms)
};

/**
 * Upload progress state
 */
export class UploadProgress {
  constructor(totalFiles = 0) {
    this.totalFiles = totalFiles;
    this.processedFiles = 0;
    this.currentBatch = 0;
    this.totalBatches = Math.ceil(totalFiles / UPLOAD_CONFIG.BATCH_SIZE);
    this.status = 'idle'; // idle, processing, completed, error
    this.currentMessage = '';
    this.errors = [];
    this.startTime = null;
    this.estimatedTimeRemaining = null;
  }

  updateProgress(processed, message, batch = null) {
    this.processedFiles = processed;
    this.currentMessage = message;
    if (batch !== null) this.currentBatch = batch;
    
    // Calculate estimated time remaining
    if (this.startTime && this.processedFiles > 0) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.processedFiles / elapsed;
      const remaining = this.totalFiles - this.processedFiles;
      this.estimatedTimeRemaining = remaining / rate;
    }
  }

  getProgressPercentage() {
    return this.totalFiles > 0 ? (this.processedFiles / this.totalFiles) * 100 : 0;
  }

  addError(error) {
    this.errors.push(error);
  }

  start() {
    this.startTime = Date.now();
    this.status = 'processing';
  }

  complete() {
    this.status = 'completed';
  }

  fail() {
    this.status = 'error';
  }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Read file as base64
 * @param {File} file - File to read
 * @returns {Promise<string>} - Base64 content
 */
export const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(new Error('Error processing file data: ' + error.message));
      }
    };
    reader.onerror = (error) => reject(new Error('FileReader error: ' + error.message));
    reader.readAsDataURL(file);
  });
};

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Operation result
 */
export const retryOperation = async (
  operation,
  { 
    maxRetries = UPLOAD_CONFIG.MAX_RETRIES,
    initialDelay = UPLOAD_CONFIG.RETRY_DELAY,
    maxDelay = 10000,
    factor = 2,
    onRetry = () => {}
  } = {}
) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      onRetry(attempt);
      
      const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Helper to sanitize file paths for GitHub API
 * @param {string} path - File path to sanitize
 * @returns {string} - Sanitized file path
 */
const sanitizePath = (path) => {
  if (!path) return '';
  let clean = path.replace(/\\/g, '/').replace(/%2F/gi, '_');
  clean = clean.replace(/\s+/g, '_');
  clean = clean.replace(/[^a-zA-Z0-9._\/-]/g, '_');
  clean = clean.replace(/\//g, '/');
  clean = clean.replace(/\/{2,}/g, '/');
  clean = clean.replace(/^\/+|\/+$/g, '');
  // Remove any '.' or '..' segments and empty segments
  clean = clean.split('/').filter(seg => seg !== '.' && seg !== '..' && seg !== '').join('/');
  return clean;
};

/**
 * Process a zip file in chunks with progress tracking
 * @param {File} zipFile - The zip file to process
 * @param {Object} octokit - Octokit instance
 * @param {Object} repoInfo - Repository information
 * @param {string} targetPath - Target path in repository
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of processed file entries
 */
export const processZipFileInChunks = async (
  zipFile,
  octokit,
  repoInfo,
  targetPath,
  onProgress,
  options = {}
) => {
  const {
    batchSize = UPLOAD_CONFIG.BATCH_SIZE,
    delayBetweenBatches = UPLOAD_CONFIG.DELAY_BETWEEN_BATCHES,
    maxRetries = UPLOAD_CONFIG.MAX_RETRIES,
    replaceConflicts = false,
    conflictingNames = []
  } = options;

  // Initialize progress tracking
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipFile);
  
  // Filter for files only (exclude directories and .git files)
  const fileEntries = Object.entries(zipContent.files)
    .filter(([path, file]) => !file.dir && !path.includes('/.git/') && !path.startsWith('.git/'))
    .map(([path, file]) => ({ path, file }));

  const progress = new UploadProgress(fileEntries.length);
  progress.start();
  onProgress(progress);

  const processedEntries = [];
  const totalBatches = Math.ceil(fileEntries.length / batchSize);

  try {
    // Process files in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, fileEntries.length);
      const batch = fileEntries.slice(startIndex, endIndex);

      progress.updateProgress(
        processedEntries.length,
        `Processing batch ${batchIndex + 1} of ${totalBatches}...`,
        batchIndex
      );
      onProgress(progress);

      // Process current batch
      const batchPromises = batch.map(async (entry, index) => {
        const { path, file } = entry;
        const fileName = path.split('/').pop();
        const isConflicting = conflictingNames.includes(fileName);

        // Skip conflicting files if not replacing
        if (isConflicting && !replaceConflicts) {
          progress.updateProgress(
            processedEntries.length + index + 1,
            `Skipping conflicting file: ${fileName}`
          );
          onProgress(progress);
          return null;
        }

        try {
          // Determine target path
          let finalTargetPath;
          if (isConflicting && replaceConflicts) {
            finalTargetPath = sanitizePath(fileName); // Place at root
          } else {
            finalTargetPath = sanitizePath(targetPath ? `${targetPath}/${path}` : path);
          }

          if (!finalTargetPath || finalTargetPath === '.' || finalTargetPath === '..') {
            console.warn('Skipping invalid path:', finalTargetPath, entry);
            return null;
          }
          console.log('Uploading file with path:', finalTargetPath);

          // Get file content
          const content = await file.async('base64');

          // Check file size
          if (content.length * 0.75 > UPLOAD_CONFIG.MAX_FILE_SIZE) {
            throw new Error(`File ${fileName} is too large (${formatFileSize(content.length * 0.75)})`);
          }

          // Create blob with retry logic
          const blobData = await retryOperation(
            () => octokit.git.createBlob({
              owner: repoInfo.owner,
              repo: repoInfo.name,
              content: content,
              encoding: 'base64'
            }),
            { maxRetries, onRetry: (attempt) => {
              progress.updateProgress(
                processedEntries.length + index + 1,
                `Retrying blob creation for ${fileName} (attempt ${attempt + 1})`
              );
              onProgress(progress);
            }}
          );

          const processedEntry = {
            path: finalTargetPath,
            mode: '100644',
            type: 'blob',
            sha: blobData.data.sha,
            originalPath: path,
            fileName: fileName
          };

          progress.updateProgress(
            processedEntries.length + index + 1,
            `Processed: ${fileName}`
          );
          onProgress(progress);

          return processedEntry;
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          progress.addError({
            fileName,
            path,
            error: error.message
          });
          return null;
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      processedEntries.push(...validResults);

      // Add delay between batches (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    progress.complete();
    onProgress(progress);

    return processedEntries;
  } catch (error) {
    progress.fail();
    progress.addError({
      fileName: 'Batch Processing',
      error: error.message
    });
    onProgress(progress);
    throw error;
  }
};

/**
 * Process regular files in chunks
 * @param {Array} files - Array of files to process
 * @param {Object} octokit - Octokit instance
 * @param {Object} repoInfo - Repository information
 * @param {string} targetPath - Target path in repository
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of processed file entries
 */
export const processRegularFilesInChunks = async (
  files,
  octokit,
  repoInfo,
  targetPath,
  onProgress,
  options = {}
) => {
  const {
    batchSize = UPLOAD_CONFIG.BATCH_SIZE,
    delayBetweenBatches = UPLOAD_CONFIG.DELAY_BETWEEN_BATCHES,
    maxRetries = UPLOAD_CONFIG.MAX_RETRIES
  } = options;

  // Filter files array
  const filteredFiles = files.filter(file => !file.name.includes('/.git/') && !file.name.startsWith('.git/'));
  const progress = new UploadProgress(filteredFiles.length);
  progress.start();
  onProgress(progress);

  const processedEntries = [];
  const totalBatches = Math.ceil(filteredFiles.length / batchSize);

  try {
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, filteredFiles.length);
      const batch = filteredFiles.slice(startIndex, endIndex);

      progress.updateProgress(
        processedEntries.length,
        `Processing batch ${batchIndex + 1} of ${totalBatches}...`,
        batchIndex
      );
      onProgress(progress);

      const batchPromises = batch.map(async (file, index) => {
        try {
          const content = await readFileAsBase64(file);
          
          // Check file size
          if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
            throw new Error(`File ${file.name} is too large (${formatFileSize(file.size)})`);
          }

          const blobData = await retryOperation(
            () => octokit.git.createBlob({
              owner: repoInfo.owner,
              repo: repoInfo.name,
              content: content,
              encoding: 'base64'
            }),
            { maxRetries, onRetry: (attempt) => {
              progress.updateProgress(
                processedEntries.length + index + 1,
                `Retrying blob creation for ${file.name} (attempt ${attempt + 1})`
              );
              onProgress(progress);
            }}
          );

          const processedEntry = {
            path: sanitizePath(targetPath ? `${targetPath}/${file.name}` : file.name),
            mode: '100644',
            type: 'blob',
            sha: blobData.data.sha,
            fileName: file.name
          };

          if (!processedEntry.path || processedEntry.path === '.' || processedEntry.path === '..') {
            console.warn('Skipping invalid path:', processedEntry.path, file);
            return null;
          }
          console.log('Uploading file with path:', processedEntry.path);

          progress.updateProgress(
            processedEntries.length + index + 1,
            `Processed: ${file.name}`
          );
          onProgress(progress);

          return processedEntry;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          progress.addError({
            fileName: file.name,
            error: error.message
          });
          return null;
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      processedEntries.push(...validResults);

      // Add delay between batches (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    progress.complete();
    onProgress(progress);

    return processedEntries;
  } catch (error) {
    progress.fail();
    progress.addError({
      fileName: 'Batch Processing',
      error: error.message
    });
    onProgress(progress);
    throw error;
  }
};

/**
 * Create a commit with the given files/tree entries and update the branch
 * @param {Object} octokit - Octokit instance
 * @param {Object} repoInfo - { owner, name }
 * @param {Array} treeEntries - Array of { path, mode, type, sha }
 * @param {string} commitMessage - Commit message
 * @param {string} branch - Branch name
 * @param {Function} [onProgress] - Optional progress callback
 */
export const createCommitWithFiles = async (
  octokit,
  repoInfo,
  treeEntries,
  commitMessage,
  branch,
  onProgress = () => {}
) => {
  const { owner, name } = repoInfo;
  try {
    onProgress(null, 'Fetching latest commit SHA...');
    // Get the latest commit SHA on the branch
    const refData = await octokit.git.getRef({
      owner,
      repo: name,
      ref: `heads/${branch}`
    });
    const latestCommitSha = refData.data.object.sha;

    onProgress(null, 'Fetching base tree SHA...');
    // Get the tree SHA for the latest commit
    const commitData = await octokit.git.getCommit({
      owner,
      repo: name,
      commit_sha: latestCommitSha
    });
    const baseTreeSha = commitData.data.tree.sha;

    onProgress(null, 'Creating new tree...');
    // Filter and log tree entries for valid paths
    const validTreeEntries = treeEntries.filter(
      entry =>
        entry.path &&
        typeof entry.path === 'string' &&
        entry.path !== '.' &&
        entry.path !== '..' &&
        !entry.path.includes('\0') &&
        !entry.path.startsWith('/') &&
        !entry.path.endsWith('/') &&
        !entry.path.match(/(^|\/)\.{1,2}(\/|$)/)
    );
    console.log('All tree entry paths:', treeEntries.map(e => e.path));
    console.log('Valid tree entry paths:', validTreeEntries.map(e => e.path));
    console.log('Full valid tree entries:', validTreeEntries);
    // Try to create a new tree, skipping problematic entries if needed
    let treeResponse;
    try {
      treeResponse = await octokit.git.createTree({
        owner,
        repo: name,
        tree: validTreeEntries,
        base_tree: baseTreeSha
      });
    } catch (error) {
      if (error.status === 422) {
        // Log and filter out problematic paths
        console.error('422 error creating tree. Attempting to isolate bad path.');
        for (const entry of validTreeEntries) {
          try {
            await octokit.git.createTree({
              owner,
              repo: name,
              tree: [entry],
              base_tree: baseTreeSha
            });
          } catch (entryError) {
            if (entryError.status === 422) {
              console.error('Malformed path detected and skipped:', entry.path, entry);
            }
          }
        }
        throw new Error('One or more file paths are malformed. See console for details.');
      } else {
        throw error;
      }
    }

    onProgress(null, 'Creating commit...');
    // Create a new commit
    const commitResponse = await octokit.git.createCommit({
      owner,
      repo: name,
      message: commitMessage,
      tree: treeResponse.data.sha,
      parents: [latestCommitSha]
    });
    const newCommitSha = commitResponse.data.sha;

    onProgress(null, 'Updating branch reference...');
    // Update the branch reference to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo: name,
      ref: `heads/${branch}`,
      sha: newCommitSha
    });

    onProgress(null, 'Commit created and branch updated!');
    return newCommitSha;
  } catch (error) {
    onProgress(null, `Error creating commit: ${error.message}`);
    throw error;
  }
};