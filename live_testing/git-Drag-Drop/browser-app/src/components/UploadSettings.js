import React, { useState } from 'react';
import styled from 'styled-components';

const SettingsContainer = styled.div`
  background: ${props => props.theme?.background?.secondary || '#161b22'};
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid ${props => props.theme?.border?.primary || '#30363d'};
`;

const SettingsTitle = styled.h4`
  margin: 0 0 12px 0;
  color: ${props => props.theme?.text?.primary || '#f0f6fc'};
  font-size: 14px;
  font-weight: 600;
`;

const SettingsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SettingsLabel = styled.label`
  color: ${props => props.theme?.text?.secondary || '#c9d1d9'};
  font-size: 12px;
  font-weight: 500;
`;

const SettingsInput = styled.input`
  background: ${props => props.theme?.background?.tertiary || '#21262d'};
  border: 1px solid ${props => props.theme?.border?.primary || '#30363d'};
  border-radius: 4px;
  padding: 4px 8px;
  color: ${props => props.theme?.text?.primary || '#f0f6fc'};
  font-size: 12px;
  width: 80px;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.accent?.blue || '#58a6ff'};
  }
`;

const SettingsInfo = styled.span`
  color: ${props => props.theme?.text?.muted || '#8b949e'};
  font-size: 11px;
  margin-left: 8px;
`;

const UploadSettings = ({ settings, onSettingsChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: parseInt(value) || 0
    });
  };

  return (
    <SettingsContainer>
      <SettingsTitle onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        {isExpanded ? '▼' : '▶'} Upload Settings
      </SettingsTitle>
      
      {isExpanded && (
        <div>
          <SettingsRow>
            <SettingsLabel>Batch Size:</SettingsLabel>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingsInput
                type="number"
                min="1"
                max="50"
                value={settings.batchSize || 10}
                onChange={(e) => handleChange('batchSize', e.target.value)}
              />
              <SettingsInfo>files per batch</SettingsInfo>
            </div>
          </SettingsRow>
          
          <SettingsRow>
            <SettingsLabel>Delay Between Batches:</SettingsLabel>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingsInput
                type="number"
                min="0"
                max="10000"
                step="100"
                value={settings.delayBetweenBatches || 1000}
                onChange={(e) => handleChange('delayBetweenBatches', e.target.value)}
              />
              <SettingsInfo>ms</SettingsInfo>
            </div>
          </SettingsRow>
          
          <SettingsRow>
            <SettingsLabel>Max Retries:</SettingsLabel>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingsInput
                type="number"
                min="1"
                max="10"
                value={settings.maxRetries || 3}
                onChange={(e) => handleChange('maxRetries', e.target.value)}
              />
              <SettingsInfo>per file</SettingsInfo>
            </div>
          </SettingsRow>
          
          <SettingsRow>
            <SettingsLabel>Max File Size:</SettingsLabel>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingsInput
                type="number"
                min="1"
                max="1000"
                value={Math.round((settings.maxFileSize || 100 * 1024 * 1024) / (1024 * 1024))}
                onChange={(e) => handleChange('maxFileSize', e.target.value * 1024 * 1024)}
              />
              <SettingsInfo>MB</SettingsInfo>
            </div>
          </SettingsRow>
        </div>
      )}
    </SettingsContainer>
  );
};

export default UploadSettings; 