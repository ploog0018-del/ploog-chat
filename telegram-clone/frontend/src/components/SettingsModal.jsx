import React from 'react';

export default function SettingsModal({ onClose, toggleTheme, theme, onClearCache, userPhone }) {
  return (
    <div className="call-overlay glass">
      <div className="call-modal" style={{ width: '90%', maxWidth: '400px', textAlign: 'left', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✖</button>
        </div>

        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Profile</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              👤
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>My Account</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{userPhone || '+91 ••• ••• ••••'}</div>
            </div>
          </div>
        </div>

        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Appearance</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: '500' }}>Dark Mode</span>
            <button 
              onClick={toggleTheme}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer' }}
            >
              {theme === 'dark-theme' ? 'Disable ☀️' : 'Enable 🌙'}
            </button>
          </div>
        </div>

        <div className="settings-section" style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Storage & Data</h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Storage Used</span>
              <span style={{ fontWeight: 600 }}>~120 MB</span>
            </div>
            <button 
              onClick={onClearCache}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
            >
              🗑️ Clear Local Cache
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
