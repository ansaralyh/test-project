import React, { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/rest';
import JSZip from 'jszip';
import { 
  AppContainer, Header, Title, UserInfo, UserAvatar, UserName,
  LoginButton, LogoutButton, MainContent, Sidebar, SidebarHeader,
  RepoList, RepoItem, Content, WelcomeMessage, RepositoryHeader,
  RepoName, BranchSelector, PathNavigator, PathItem, PathSeparator,
  FileExplorer, FileItem, FileIcon, FileName, DropZone, DropZoneText,
  Notification, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  CloseButton, FileList, FileListItem, CommitMessageInput, CancelButton,
  UploadButton
} from './styles/StyledComponents';

// Import new components for repository consolidation
import ConsolidateButton from './components/ConsolidateButton';
import ConsolidateModal from './components/ConsolidateModal';
import UploadProgress from './components/UploadProgress';
import UploadSettings from './components/UploadSettings';

// Import consolidation utilities
import { 
  processSelectedItems,
  createConsolidatedCommit,
  checkPathConflicts,
  retryOperation
} from './utils/ConsolidationUtils';

// Import upload utilities
import {
  processZipFileInChunks,
  processRegularFilesInChunks,
  createCommitWithFiles,
  UploadProgress as UploadProgressClass,
  formatFileSize
} from './utils/UploadUtils';

const App = () => {
  // --- State Management ---
  
  // Authentication and user state
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [octokit, setOctokit] = useState(null);
  
  // Repository state
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [contents, setContents] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  
  // Upload state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [uploadStep, setUploadStep] = useState('initial');
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  
  // Notification state
  const [notification, setNotification] = useState(null);
  
  // New state for repository consolidation
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [consolidationProgress, setConsolidationProgress] = useState(0);
  const [consolidationStatus, setConsolidationStatus] = useState('');
  const [isConsolidating, setIsConsolidating] = useState(false);

  // New state for upload progress
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSettings, setUploadSettings] = useState({
    batchSize: 10,
    delayBetweenBatches: 1000,
    maxRetries: 3,
    maxFileSize: 100 * 1024 * 1024 // 100MB
  });

  // --- Initialization ---
  
  // Initialize GitHub client on component mount
  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      initializeGitHub(token);
    }
  }, []);
  
  // Initialize GitHub client with token
  const initializeGitHub = async (token) => {
    try {
      const octokitClient = new Octokit({ auth: token });
      
      // Verify token by getting user info
      const { data: userData } = await octokitClient.users.getAuthenticated();
      
      setOctokit(octokitClient);
      setUser(userData);
      setAuthenticated(true);
      
      // Load repositories
      loadRepositories(octokitClient);
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('github_token');
      setAuthenticated(false);
      setUser(null);
      setOctokit(null);
      showNotification('error', 'Authentication failed. Please check your token and try again.');
    }
  };
  
  // --- Repository Management ---
  
  // Load user repositories
  const loadRepositories = async (client) => {
    try {
      const { data: repos } = await client.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      });
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      showNotification('error', 'Failed to load repositories');
    }
  };
  
  // Handle repository selection
  const handleSelectRepository = async (repo) => {
    setSelectedRepo(repo);
    setCurrentPath('/');
    
    try {
      // Load branches
      const { data: branchesData } = await octokit.repos.listBranches({
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 100
      });
      
      const branchNames = branchesData.map(branch => branch.name);
      setBranches(branchNames);
      
      // Set default branch
      const defaultBranch = repo.default_branch || 'main';
      setCurrentBranch(branchNames.includes(defaultBranch) ? defaultBranch : branchNames[0]);
      
      // Load contents
      loadRepositoryContents(repo, '/', defaultBranch);
    } catch (error) {
      console.error('Error loading repository details:', error);
      showNotification('error', 'Failed to load repository details');
    }
  };
  
  // Handle branch selection
  const handleSelectBranch = (e) => {
    const branch = e.target.value;
    setCurrentBranch(branch);
    loadRepositoryContents(selectedRepo, currentPath, branch);
  };
  
  // Load repository contents
  const loadRepositoryContents = async (repo, path, branch) => {
    if (!repo) return;
    
    try {
      const { data: contentsData } = await octokit.repos.getContent({
        owner: repo.owner.login,
        repo: repo.name,
        path: path === '/' ? '' : path.replace(/^\//, ''),
        ref: branch
      });
      
      setContents(Array.isArray(contentsData) ? contentsData : [contentsData]);
      setCurrentPath(path);
    } catch (error) {
      console.error('Error loading repository contents:', error);
      setContents([]);
      showNotification('error', 'Failed to load repository contents');
    }
  };
  
  // Handle path navigation
  const handlePathNavigation = (index) => {
    const pathSegments = currentPath.split('/').filter(Boolean);
    const newPath = index < 0 ? '/' : '/' + pathSegments.slice(0, index + 1).join('/');
    loadRepositoryContents(selectedRepo, newPath, currentBranch);
  };
  
  // Handle file/directory navigation
  const handleNavigate = async (item) => {
    if (item.type === 'dir') {
      loadRepositoryContents(selectedRepo, item.path, currentBranch);
    } else {
      try {
        // Get file content
        const { data: fileData } = await octokit.repos.getContent({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          path: item.path,
          ref: currentBranch
        });
        
        // Handle different file types
        if (item.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
          // Image file - open in new tab
          const imageUrl = fileData.download_url;
          window.open(imageUrl, '_blank');
        } else {
          // Text file - show content
          let content = '';
          
          if (fileData.encoding === 'base64') {
            content = atob(fileData.content);
          } else {
            content = fileData.content;
          }
          
          // Simple preview alert - in a real app, you'd use a modal
          alert(`File: ${item.name}\n\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`);
        }
      } catch (error) {
        console.error('Error loading file:', error);
        showNotification('error', 'Failed to load file');
      }
    }
  };
  
  // --- File Upload Handling ---
  
  // Handle drag over event
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!authenticated || !selectedRepo) {
      showNotification('error', 'Please select a repository first');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      showNotification('error', 'No files detected');
      return;
    }
    
    // Validate file sizes
    const maxFileSize = uploadSettings.maxFileSize;
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      showNotification('error', `Files too large (max ${maxSizeMB}MB each): ${fileNames}`);
      return;
    }
    
    // Check for ZIP files
    const zipFiles = files.filter(file => file.name.toLowerCase().endsWith('.zip'));
    
    if (zipFiles.length > 0) {
      // Handle ZIP file
      setUploadFiles(zipFiles);
      setNewFolderName('');
      setCommitMessage(`Add files from ${zipFiles[0].name}`);
      setShowUploadModal(true);
      setUploadStep('initial');
    } else {
      // Handle regular files
      setUploadFiles(files);
      setNewFolderName('');
      setCommitMessage(`Add ${files.length} file(s)`);
      setShowUploadModal(true);
      setUploadStep('initial');
    }
  };
  
  // Reset upload state
  const resetUploadState = () => {
    setUploadFiles([]);
    setShowUploadModal(false);
    setNewFolderName('');
    setCommitMessage('');
    setUploadStep('initial');
    setDetectedConflicts([]);
    setUploadProgress(null);
    setIsUploading(false);
  };

  // Cancel upload
  const cancelUpload = () => {
    if (isUploading) {
      showNotification('info', 'Upload cancelled by user');
    }
    resetUploadState();
  };
  
  // Handle upload initiation
  const handleUploadInitiation = async () => {
    if (!newFolderName.trim() || !commitMessage.trim()) {
      showNotification('error', 'Please provide both folder name and commit message');
      return;
    }
    
    setUploadStep('uploading');
    setIsUploading(true);
    
    try {
      // Check if any of the files is a ZIP
      const zipFile = uploadFiles.find(file => file.name.toLowerCase().endsWith('.zip'));
      
      if (zipFile) {
        // Process ZIP file with new chunked approach
        await processZipUpload(zipFile);
      } else {
        // Process regular files with new chunked approach
        await processRegularFilesUpload(uploadFiles);
      }
    } catch (error) {
      console.error('Error processing upload:', error);
      showNotification('error', `Upload failed: ${error.message}`);
      setUploadStep('initial');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };
  
  // Handle conflict resolution
  const handleConflictResolution = async (action) => {
    setUploadStep('uploading');
    setIsUploading(true);
    
    try {
      const zipFile = uploadFiles.find(file => file.name.toLowerCase().endsWith('.zip'));
      
      if (action === 'replace') {
        // User chose to replace conflicting files
        await processZipUpload(zipFile, true);
      } else {
        // User chose to skip conflicting files
        await processZipUpload(zipFile, false);
      }
    } catch (error) {
      console.error('Error during conflict resolution:', error);
      showNotification('error', `Upload failed: ${error.message}`);
      setUploadStep('initial');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Process ZIP file upload with chunking
  const processZipUpload = async (zipFile, replaceConflicts = false) => {
    try {
      // Check for conflicts first
      const conflicts = await checkZipConflicts(zipFile);
      
      if (conflicts.length > 0 && !replaceConflicts) {
        setDetectedConflicts(conflicts);
        setUploadStep('confirmConflict');
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      const repoInfo = {
        owner: selectedRepo.owner.login,
        name: selectedRepo.name
      };

      const conflictingNames = conflicts.map(conflict => conflict.repoPath);

      // Process ZIP file in chunks
      const treeEntries = await processZipFileInChunks(
        zipFile,
        octokit,
        repoInfo,
        newFolderName,
        (progress) => {
          setUploadProgress(progress);
        },
        {
          replaceConflicts,
          conflictingNames,
          batchSize: uploadSettings.batchSize,
          delayBetweenBatches: uploadSettings.delayBetweenBatches,
          maxRetries: uploadSettings.maxRetries
        }
      );

      // Create commit with processed files
      await createCommitWithFiles(
        octokit,
        repoInfo,
        treeEntries,
        commitMessage,
        currentBranch,
        (progress, message) => {
          if (progress) {
            setUploadProgress(progress);
          } else {
            setUploadProgress(prev => {
              if (prev) {
                prev.currentMessage = message;
                return { ...prev };
              }
              return prev;
            });
          }
        }
      );

      showNotification('success', `Successfully uploaded files to ${newFolderName ? `folder '${newFolderName}'` : 'current directory'}`);
      resetUploadState();
      setIsUploading(false);
      setUploadProgress(null);

      // Refresh contents after a short delay
      setTimeout(() => {
        if (selectedRepo) {
          loadRepositoryContents(selectedRepo, currentPath, currentBranch);
        }
      }, 1000);

    } catch (error) {
      console.error('Error processing ZIP upload:', error);
      throw error;
    }
  };

  // Process regular files upload with chunking
  const processRegularFilesUpload = async (files) => {
    try {
      const repoInfo = {
        owner: selectedRepo.owner.login,
        name: selectedRepo.name
      };

      // Process regular files in chunks
      const treeEntries = await processRegularFilesInChunks(
        files,
        octokit,
        repoInfo,
        newFolderName,
        (progress) => {
          setUploadProgress(progress);
        },
        {
          batchSize: uploadSettings.batchSize,
          delayBetweenBatches: uploadSettings.delayBetweenBatches,
          maxRetries: uploadSettings.maxRetries
        }
      );

      // Create commit with processed files
      await createCommitWithFiles(
        octokit,
        repoInfo,
        treeEntries,
        commitMessage,
        currentBranch,
        (progress, message) => {
          if (progress) {
            setUploadProgress(progress);
          } else {
            setUploadProgress(prev => {
              if (prev) {
                prev.currentMessage = message;
                return { ...prev };
              }
              return prev;
            });
          }
        }
      );

      showNotification('success', `Successfully uploaded ${files.length} file(s) to ${newFolderName ? `folder '${newFolderName}'` : 'current directory'}`);
      resetUploadState();
      setIsUploading(false);
      setUploadProgress(null);

      // Refresh contents after a short delay
      setTimeout(() => {
        if (selectedRepo) {
          loadRepositoryContents(selectedRepo, currentPath, currentBranch);
        }
      }, 1000);

    } catch (error) {
      console.error('Error processing regular files upload:', error);
      throw error;
    }
  };

  // Check for conflicts in ZIP file
  const checkZipConflicts = async (zipFile) => {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      
      // Get repository root contents to check for conflicts
      const { data: rootContents } = await octokit.repos.getContent({
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        ref: currentBranch
      });
      
      // Extract file names from root
      const rootFiles = Array.isArray(rootContents) 
        ? rootContents.map(item => item.name) 
        : [rootContents.name];
      
      // Check for conflicts between ZIP contents and repository root
      const conflicts = [];
      
      // Process ZIP entries
      const zipEntries = Object.keys(zipContent.files)
        .filter(path => !zipContent.files[path].dir)
        .map(path => ({
          path,
          name: path.split('/').pop()
        }));
      
      // Check for conflicts
      zipEntries.forEach(entry => {
        if (rootFiles.includes(entry.name)) {
          conflicts.push({
            zipPath: entry.path,
            repoPath: entry.name
          });
        }
      });
      
      return conflicts;
    } catch (error) {
      console.error('Error checking ZIP conflicts:', error);
      return [];
    }
  };

  // Estimate upload time based on file sizes
  const estimateUploadTime = (files) => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    // Rough estimate: 1MB per second for processing + network overhead
    const estimatedSeconds = totalSizeMB * 1.5;
    
    if (estimatedSeconds < 60) {
      return `${Math.round(estimatedSeconds)} seconds`;
    } else if (estimatedSeconds < 3600) {
      return `${Math.round(estimatedSeconds / 60)} minutes`;
    } else {
      return `${Math.round(estimatedSeconds / 3600)} hours`;
    }
  };
  

  
  // --- Repository Consolidation Handlers ---
  
  // Handle opening the consolidate modal
  const handleOpenConsolidateModal = () => {
    setShowConsolidateModal(true);
  };

  // Handle closing the consolidate modal
  const handleCloseConsolidateModal = () => {
    setShowConsolidateModal(false);
  };

  // Handle repository consolidation
  const handleConsolidate = async (consolidationData, options = {}) => {
    const { targetRepo, sourceRepos, selectedItems, targetPaths, commitMessage } = consolidationData;
    const { onProgress = () => {} } = options;
    
    setIsConsolidating(true);
    
    try {
      // Process selected items
      onProgress(10, 'Processing selected items...');
      const processedItems = await processSelectedItems(
        octokit,
        sourceRepos,
        selectedItems,
        targetPaths,
        (progress, message) => {
          onProgress(10 + (progress * 0.4), message);
        }
      );
      
      // Check for conflicts
      onProgress(50, 'Checking for conflicts...');
      const conflicts = await checkPathConflicts(
        octokit,
        targetRepo,
        processedItems,
        currentBranch
      );
      
      // If conflicts exist, ask for confirmation
      if (conflicts.length > 0) {
        const confirmMessage = `${conflicts.length} file(s) already exist in the target repository. Do you want to overwrite them?`;
        if (!window.confirm(confirmMessage)) {
          throw new Error('Consolidation cancelled due to conflicts');
        }
      }
      
      // Create consolidated commit
      onProgress(60, 'Creating commit...');
      const result = await createConsolidatedCommit(
        octokit,
        targetRepo,
        processedItems,
        commitMessage,
        currentBranch,
        (progress, message) => {
          onProgress(60 + (progress * 0.4), message);
        }
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create consolidated commit');
      }
      
      // Success
      onProgress(100, 'Consolidation completed successfully!');
      showNotification('success', `Successfully consolidated ${processedItems.length} items into ${targetRepo.name}`);
      
      // Refresh contents after a short delay
      setTimeout(() => {
        if (selectedRepo && selectedRepo.id === targetRepo.id) {
          loadRepositoryContents(selectedRepo, currentPath, currentBranch);
        }
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Consolidation error:', error);
      showNotification('error', `Consolidation failed: ${error.message}`);
      throw error;
    } finally {
      setIsConsolidating(false);
    }
  };
  
  // --- Notification and Authentication ---
  
  // Show notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };
  
  // Handle login
  const handleLogin = () => {
    const token = prompt('Enter your GitHub Personal Access Token (with repo scope):');
    if (token) {
      localStorage.setItem('github_token', token);
      initializeGitHub(token);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setAuthenticated(false);
    setUser(null);
    setOctokit(null);
    setRepositories([]);
    setSelectedRepo(null);
    setContents([]);
    setCurrentPath('/');
    setBranches([]);
    resetUploadState();
  };
  
  // --- Render Logic --- 
  
  return (
    <AppContainer>
      <Header>
        <Title>Git Helper Web</Title>
        {authenticated && user ? (
          <UserInfo>
            <UserAvatar src={user.avatar_url} alt={`${user.login} avatar`} />
            <UserName>{user.login}</UserName>
            <ConsolidateButton onClick={handleOpenConsolidateModal} />
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </UserInfo>
        ) : (
          <LoginButton onClick={handleLogin}>Login with GitHub Token</LoginButton>
        )}
      </Header>

      <MainContent>
        {authenticated && (
          <Sidebar>
            <SidebarHeader>Repositories</SidebarHeader>
            <RepoList>
              {repositories.map(repo => (
                <RepoItem
                  key={repo.id}
                  selected={selectedRepo?.id === repo.id}
                  onClick={() => handleSelectRepository(repo)}
                >
                  {repo.name}
                </RepoItem>
              ))}
            </RepoList>
          </Sidebar>
        )}

        <Content onDragOver={handleDragOver} onDrop={handleDrop}>
          {!authenticated ? (
            <WelcomeMessage>
              <h2>Welcome to Git Helper Web</h2>
              <p>Please log in using a GitHub Personal Access Token with 'repo' scope to manage your repositories.</p>
              <LoginButton onClick={handleLogin}>Login with GitHub Token</LoginButton>
            </WelcomeMessage>
          ) : !selectedRepo ? (
            <WelcomeMessage>
              <h2>Select a Repository</h2>
              <p>Choose a repository from the sidebar to view its contents.</p>
            </WelcomeMessage>
          ) : (
            <>
              <RepositoryHeader>
                <RepoName>{selectedRepo.name}</RepoName>
                {branches.length > 0 && (
                  <BranchSelector>
                    <label htmlFor="branch-select">Branch:</label>
                    <select id="branch-select" value={currentBranch} onChange={handleSelectBranch}>
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </BranchSelector>
                )}
              </RepositoryHeader>

              <PathNavigator>
                 <PathItem onClick={() => loadRepositoryContents(selectedRepo, '/', currentBranch)}>Root</PathItem>
                 {currentPath.split('/').filter(Boolean).map((segment, index, arr) => (
                     <React.Fragment key={index}>
                         <PathSeparator>/</PathSeparator>
                         <PathItem onClick={() => handlePathNavigation(index)}>
                             {segment}
                         </PathItem>
                     </React.Fragment>
                 ))}
              </PathNavigator>

              <FileExplorer>
                {contents.length === 0 && <p style={{ padding: '10px 16px', color: '#8b949e' }}>This directory is empty.</p>}
                {contents.sort((a, b) => {
                    // Sort directories first, then files, then alphabetically
                    if (a.type === 'dir' && b.type !== 'dir') return -1;
                    if (a.type !== 'dir' && b.type === 'dir') return 1;
                    return a.name.localeCompare(b.name);
                  }).map(item => (
                  <FileItem key={item.sha} onClick={() => handleNavigate(item)} title={`Type: ${item.type} | Size: ${item.size || 'N/A'}`}>
                    <FileIcon>{item.type === 'dir' ? '📁' : '📄'}</FileIcon>
                    <FileName>{item.name}</FileName>
                  </FileItem>
                ))}
              </FileExplorer>

              <DropZone>
                <DropZoneText>Drag & Drop files or ZIP archives here to upload to '{newFolderName || "<Specify Folder Name>"}' in '{currentPath}'</DropZoneText>
              </DropZone>
              
              {/* Show upload progress in main content area for large uploads */}
              {isUploading && uploadProgress && (
                <div style={{ marginTop: '16px' }}>
                  <UploadProgress progress={uploadProgress} onCancel={cancelUpload} />
                </div>
              )}
            </>
          )}
        </Content>
      </MainContent>

      {notification && (
        <Notification type={notification.type}>{notification.message}</Notification>
      )}

      {showUploadModal && (
        <Modal>
          <ModalContent>
            {/* Initial Upload Prompt */} 
            {uploadStep === "initial" && (
              <>
                <ModalHeader>
                  <h3>Upload Files to '{selectedRepo?.name}'</h3>
                  <CloseButton onClick={resetUploadState}>&times;</CloseButton>
                </ModalHeader>
                <ModalBody>
                  <p>Files to upload:</p>
                  <FileList>
                    {uploadFiles.map((file, index) => (
                      <FileListItem key={index}>
                        {file.name} ({formatFileSize(file.size)})
                      </FileListItem>
                    ))}
                  </FileList>
                  <p style={{ fontSize: '12px', color: '#8b949e', marginTop: '8px' }}>
                    Estimated upload time: {estimateUploadTime(uploadFiles)}
                  </p>
                  <div style={{ marginBottom: '15px' }}> 
                    <label htmlFor="newFolderName" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Target Folder Name:</label>
                    <input
                      type="text"
                      id="newFolderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name (required)"
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#f0f6fc' }}
                    />
                  </div>
                  <CommitMessageInput> 
                    <label htmlFor="commitMessage" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Commit Message:</label>
                    <textarea
                      id="commitMessage"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Enter commit message (required)"
                      rows={3}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#f0f6fc', resize: 'vertical' }}
                    />
                  </CommitMessageInput>
                  
                  <UploadSettings 
                    settings={uploadSettings}
                    onSettingsChange={setUploadSettings}
                  />
                </ModalBody>
                <ModalFooter>
                  <CancelButton onClick={resetUploadState}>Cancel</CancelButton>
                  <UploadButton onClick={handleUploadInitiation} disabled={!newFolderName.trim() || !commitMessage.trim()}>Check & Upload</UploadButton>
                </ModalFooter>
              </>
            )}

            {/* Conflict Confirmation */} 
            {uploadStep === "confirmConflict" && (
              <>
                <ModalHeader>
                  <h3>File Conflict Detected</h3>
                  <CloseButton onClick={resetUploadState}>&times;</CloseButton>
                </ModalHeader>
                <ModalBody>
                  <p>The uploaded ZIP contains files that already exist in the repository's root directory:</p>
                  <FileList style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #30363d', borderRadius: '6px', padding: '5px' }}> 
                    {detectedConflicts.map((conflict, index) => (
                      <FileListItem key={index} style={{ borderBottom: 'none', marginBottom: '2px' }}>
                        <strong>{conflict.repoPath}</strong> (from ZIP: {conflict.zipPath})
                      </FileListItem>
                    ))}
                  </FileList>
                  <p style={{ marginTop: '15px' }}>Do you want to replace these files in the root directory? Non-conflicting files will be added to the '<strong>{newFolderName}</strong>' folder.</p>
                </ModalBody>
                <ModalFooter>
                  <CancelButton onClick={resetUploadState}>Cancel Upload</CancelButton>
                  <CancelButton onClick={() => handleConflictResolution('skip')}>Skip Conflicting Files</CancelButton>
                  <UploadButton onClick={() => handleConflictResolution('replace')}>Replace Root Files</UploadButton>
                </ModalFooter>
              </>
            )}

            {/* Uploading Indicator */} 
            {uploadStep === "uploading" && (
              <>
                <ModalHeader>
                  <h3>Uploading Files</h3>
                  <CloseButton onClick={cancelUpload}>&times;</CloseButton>
                </ModalHeader>
                <ModalBody>
                  <UploadProgress progress={uploadProgress} onCancel={cancelUpload} />
                  {uploadProgress && uploadProgress.status === 'completed' && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <UploadButton onClick={cancelUpload}>Close</UploadButton>
                    </div>
                  )}
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Consolidate Modal */}
      <ConsolidateModal
        isOpen={showConsolidateModal}
        onClose={handleCloseConsolidateModal}
        repositories={repositories}
        octokit={octokit}
        onConsolidate={handleConsolidate}
      />
    </AppContainer>
  );
};

export default App;
