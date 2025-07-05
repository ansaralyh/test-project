import React from 'react';
import styled, { keyframes } from 'styled-components';

// Animation for progress bar
const progressAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Helper function for progress percentage
const getProgressPercentage = (progress) => {
  if (!progress || typeof progress.totalFiles !== 'number' || progress.totalFiles === 0) return 0;
  return (progress.processedFiles / progress.totalFiles) * 100;
};

// Styled components
const ProgressContainer = styled.div`
  background: ${props => props.theme?.background?.secondary || '#161b22'};
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  border: 1px solid ${props => props.theme?.border?.primary || '#30363d'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ProgressTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme?.text?.primary || '#f0f6fc'};
  font-size: 16px;
  font-weight: 600;
`;

const ProgressPercentage = styled.span`
  color: ${props => props.theme?.accent?.blue || '#58a6ff'};
  font-weight: 600;
  font-size: 14px;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme?.background?.tertiary || '#21262d'};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: linear-gradient(90deg, 
    ${props => props.theme?.accent?.blue || '#58a6ff'} 0%, 
    ${props => props.theme?.accent?.purple || '#8957e5'} 50%, 
    ${props => props.theme?.accent?.blue || '#58a6ff'} 100%);
  background-size: 200% 100%;
  animation: ${progressAnimation} 2s ease-in-out infinite;
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const StatusMessage = styled.div`
  color: ${props => props.theme?.text?.secondary || '#c9d1d9'};
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
`;

const ProgressDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: ${props => props.theme?.text?.muted || '#8b949e'};
`;

const BatchInfo = styled.span`
  color: ${props => props.theme?.accent?.yellow || '#d29922'};
  font-weight: 500;
`;

const TimeEstimate = styled.span`
  color: ${props => props.theme?.accent?.green || '#2ea043'};
  font-weight: 500;
`;

const ErrorList = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme?.border?.primary || '#30363d'};
`;

const ErrorTitle = styled.h4`
  margin: 0 0 8px 0;
  color: ${props => props.theme?.accent?.red || '#f85149'};
  font-size: 14px;
  font-weight: 600;
`;

const ErrorItem = styled.div`
  background: ${props => props.theme?.background?.tertiary || '#21262d'};
  border: 1px solid ${props => props.theme?.accent?.red || '#f85149'};
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 6px;
  font-size: 12px;
  color: ${props => props.theme?.text?.secondary || '#c9d1d9'};
`;

const ErrorFileName = styled.strong`
  color: ${props => props.theme?.accent?.red || '#f85149'};
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme?.accent?.green || '#2ea043'};
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  padding: 12px;
  background: ${props => props.theme?.background?.tertiary || '#21262d'};
  border-radius: 4px;
  border: 1px solid ${props => props.theme?.accent?.green || '#2ea043'};
`;

const UploadProgress = ({ progress, onCancel }) => {
  if (!progress) return null;

  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return 'Calculating...';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return '#2ea043';
      case 'error':
        return '#f85149';
      case 'processing':
        return '#58a6ff';
      default:
        return '#8b949e';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'processing':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const handleCancel = () => {
    if (onCancel && progress.status === 'processing') {
      onCancel();
    }
  };

  return (
    <ProgressContainer>
      <ProgressHeader>
        <ProgressTitle>
          {getStatusIcon()} Upload Progress
        </ProgressTitle>
        <ProgressPercentage>
          {Math.round(getProgressPercentage(progress))}%
        </ProgressPercentage>
      </ProgressHeader>

      <ProgressBarContainer>
        <ProgressBar 
          progress={getProgressPercentage(progress)} 
          style={{ background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}88)` }}
        />
      </ProgressBarContainer>

      <StatusMessage>
        {progress.currentMessage || 'Preparing upload...'}
      </StatusMessage>

      <ProgressDetails>
        <div>
          <BatchInfo>
            Batch {progress.currentBatch + 1} of {progress.totalBatches}
          </BatchInfo>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>
            {progress.processedFiles} of {progress.totalFiles} files
          </span>
        </div>
        <TimeEstimate>
          {progress.estimatedTimeRemaining && progress.status === 'processing' 
            ? `ETA: ${formatDuration(progress.estimatedTimeRemaining)}`
            : progress.status === 'completed' 
              ? 'Completed!'
              : 'Calculating...'
          }
        </TimeEstimate>
      </ProgressDetails>

      {progress.errors.length > 0 && (
        <ErrorList>
          <ErrorTitle>Errors ({progress.errors.length})</ErrorTitle>
          {progress.errors.slice(0, 3).map((error, index) => (
            <ErrorItem key={index}>
              <ErrorFileName>{error.fileName}</ErrorFileName>: {error.error}
            </ErrorItem>
          ))}
          {progress.errors.length > 3 && (
            <ErrorItem>
              ... and {progress.errors.length - 3} more errors
            </ErrorItem>
          )}
        </ErrorList>
      )}

      {progress.status === 'completed' && (
        <SuccessMessage>
          🎉 Upload completed successfully! {progress.processedFiles} files uploaded.
        </SuccessMessage>
      )}

      {progress.status === 'error' && (
        <ErrorList>
          <ErrorTitle>Upload Failed</ErrorTitle>
          <ErrorItem>
            The upload encountered errors. Please check the error details above and try again.
          </ErrorItem>
        </ErrorList>
      )}

      {progress.status === 'processing' && onCancel && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button
            onClick={handleCancel}
            style={{
              background: '#f85149',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Cancel Upload
          </button>
        </div>
      )}
    </ProgressContainer>
  );
};

export default UploadProgress; 