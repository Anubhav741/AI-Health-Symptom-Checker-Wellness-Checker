import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'dashboard' }) => {
  if (type === 'analysis') {
    return (
      <div className="skeleton-overlay">
        <div className="skeleton-card glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
          <div className="skeleton-pulse skeleton-title" style={{ width: '60%', marginBottom: '24px' }}></div>
          <div className="skeleton-pulse skeleton-text" style={{ width: '100%', marginBottom: '16px' }}></div>
          <div className="skeleton-pulse skeleton-text" style={{ width: '80%', marginBottom: '16px' }}></div>
          <div className="skeleton-pulse skeleton-text" style={{ width: '90%', marginBottom: '32px' }}></div>
          <div className="skeleton-row" style={{ display: 'flex', gap: '16px' }}>
            <div className="skeleton-pulse skeleton-badge" style={{ width: '100px', height: '32px', borderRadius: '16px' }}></div>
            <div className="skeleton-pulse skeleton-badge" style={{ width: '120px', height: '32px', borderRadius: '16px' }}></div>
          </div>
        </div>
        <p className="skeleton-message">Evaluating symptoms with Medical AI...</p>
      </div>
    );
  }

  return (
    <div className="skeleton-wrapper">
      <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '16px', marginBottom: '24px' }}></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '16px' }}></div>
        <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '16px' }}></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
