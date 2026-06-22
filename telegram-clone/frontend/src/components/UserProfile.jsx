import React, { useState } from 'react';
import { ChevronLeft, Phone, Video, Bell, Search, MoreHorizontal, QrCode } from 'lucide-react';

export default function UserProfile({ activeChat, onClose, onInitiateCall }) {
  const [activeTab, setActiveTab] = useState('Media');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('Bavash Milton');

  return (
    <div className="user-profile-container">
      {/* Top Header */}
      <div className="profile-header">
        <button className="profile-back-btn" onClick={onClose}><ChevronLeft size={24} /></button>
        <button className="profile-edit-btn" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="profile-scroll-area">
        {/* Avatar and Name */}
        <div className="profile-main-info">
          <div className="profile-avatar-large">
            {activeChat.avatar}
          </div>
          {isEditing ? (
            <input 
              type="text" 
              className="profile-name-edit" 
              value={editedName} 
              onChange={(e) => setEditedName(e.target.value)}
              autoFocus
            />
          ) : (
            <h2 className="profile-name">{editedName}</h2>
          )}
          <span className="profile-last-seen">last seen recently</span>
        </div>

        {/* Action Buttons Row (Hidden when editing to save space, or keep them) */}
        {!isEditing && (
          <div className="profile-actions-row">
            <div className="profile-action-btn" onClick={() => onInitiateCall(false)}>
              <div className="action-icon"><Phone size={20} /></div>
              <span>call</span>
            </div>
            <div className="profile-action-btn" onClick={() => onInitiateCall(true)}>
              <div className="action-icon"><Video size={20} /></div>
              <span>video</span>
            </div>
            <div className="profile-action-btn">
              <div className="action-icon"><Bell size={20} /></div>
              <span>mute</span>
            </div>
            <div className="profile-action-btn">
              <div className="action-icon"><Search size={20} /></div>
              <span>search</span>
            </div>
            <div className="profile-action-btn" onClick={() => alert('Report / Block features are in the Edit menu!')}>
              <div className="action-icon"><MoreHorizontal size={20} /></div>
              <span>more</span>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="profile-info-card" style={{ marginTop: isEditing ? '20px' : '0' }}>
          <div className="info-row">
            <div className="info-label">mobile</div>
            <div className="info-value highlight">+91 91507 96292</div>
          </div>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="info-content">
              <div className="info-label">username</div>
              <div className="info-value highlight">@Thiefgamer7</div>
            </div>
            <div className="qr-icon" style={{ opacity: 0.5, color: '#C471F5' }}><QrCode size={24} /></div>
          </div>
          <div className="info-row">
            <div className="info-label">birthday</div>
            <div className="info-value">30 Jul 2004 (21 years old)</div>
          </div>
          <div className="info-row no-border">
            <div className="info-label">bio</div>
            <div className="info-value">❤️ Instagram ID: MRBAVAS ⚡ PROUD TO BE Muslim 🕋 ⚡ I am single ✌️</div>
          </div>
        </div>

        {/* Edit Mode: Report & Block Options */}
        {isEditing && (
          <div className="profile-info-card danger-actions">
            <div className="info-row" onClick={() => alert('User Reported!')} style={{ cursor: 'pointer' }}>
              <div className="info-value" style={{ color: '#FF453A', textAlign: 'center', fontWeight: '500' }}>🚩 Report User</div>
            </div>
            <div className="info-row no-border" onClick={() => alert('User Blocked!')} style={{ cursor: 'pointer' }}>
              <div className="info-value" style={{ color: '#FF453A', textAlign: 'center', fontWeight: '500' }}>🚫 Block User</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {!isEditing && (
          <div className="profile-tabs">
            {['Media', 'Saved', 'Files', 'Voice', 'Links'].map(tab => (
              <div 
                key={tab} 
                className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        )}

        {/* Media Grid Placeholder */}
        {(!isEditing && activeTab === 'Media') && (
          <div className="profile-media-grid">
            <div className="media-item" style={{ background: '#333' }}></div>
            <div className="media-item" style={{ background: '#444' }}></div>
            <div className="media-item" style={{ background: '#555' }}></div>
            <div className="media-item" style={{ background: '#666' }}></div>
            <div className="media-item" style={{ background: '#777' }}></div>
            <div className="media-item" style={{ background: '#888' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
