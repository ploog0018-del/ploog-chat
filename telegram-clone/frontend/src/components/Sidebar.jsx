import React, { useState, useRef, useEffect } from 'react';
import { Settings, Plus, Pin, Bell, BellOff, Trash2, LogOut, Camera, User, Bookmark, PhoneCall, MonitorSmartphone, Folder, BellRing, Lock, Database, Paintbrush, Globe, BatteryMedium, ChevronRight, QrCode, ArrowLeft } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function Sidebar({ 
  chats, activeChat, setActiveChat, onNewChat, setIsSidebarOpen,
  isSettingsOpen, setIsSettingsOpen, 
  userPhone, userProfile, updateProfile, toggleTheme, theme, onClearCache, storageStats, onLogout,
  mutedChats, toggleMute, appLockEnabled, setAppLockEnabled, privacySettings, setPrivacySettings
}) {
  const [settingsView, setSettingsView] = useState('main');
  const [contextMenu, setContextMenu] = useState(null);
  const [scannedContact, setScannedContact] = useState(null);
  const longPressTimer = useRef(null);

  const handleContextMenu = (e, chatId) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, chatId });
  };

  const handleTouchStart = (e, chatId) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x: touch.pageX, y: touch.pageY, chatId });
    }, 600); // 600ms for long press
  };

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile({ avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const menuStyle = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 10px', cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s', marginBottom: '5px' };
  const iconStyle = { fontSize: '20px', width: '30px', textAlign: 'center' };

  if (isSettingsOpen) {
    if (settingsView === 'profile') {
      return (
        <div className="sidebar">
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              ←
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>My Profile</h2>
          </div>
          
          <div style={{ padding: '20px', overflowY: 'auto' }}>
            {/* Avatar Edit */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
              <label style={{ cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', overflow: 'hidden' }}>
                  {userProfile?.avatar ? <img src={userProfile.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : '👤'}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--text-primary)', color: 'var(--bg-primary)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  <Camera size={16} />
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'var(--accent-color)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Name</label>
              <input 
                type="text"
                value={userProfile?.name || 'Maddy....'}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Your Name"
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', padding: '10px 0', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'var(--accent-color)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Bio</label>
              <textarea 
                value={userProfile?.bio || ''}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                placeholder="A few words about you"
                maxLength={70}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', padding: '10px 0', outline: 'none', resize: 'none', minHeight: '40px' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>Any details such as age, occupation or city.</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'var(--accent-color)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Birthday</label>
              <input 
                type="date"
                value={userProfile?.birthday || ''}
                onChange={(e) => updateProfile({ birthday: e.target.value })}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', padding: '10px 0', outline: 'none', colorScheme: theme === 'dark-theme' ? 'dark' : 'light' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'var(--accent-color)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Phone Number</label>
              <div style={{ fontSize: '16px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                {userPhone || '+91 ••• ••• ••••'}
              </div>
            </div>

          </div>
        </div>
      );
    }

    if (settingsView === 'calls') {
      return (
        <div className="sidebar">
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Recent Calls</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📞</div>
            <div>No recent calls.</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>Your recent voice and video calls will appear here.</div>
          </div>
        </div>
      );
    }

    if (settingsView === 'notifications') {
      return (
        <div className="sidebar">
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Notifications & Sounds</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Message Notifications</span>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Call Ringtone</span>
              <select style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', padding: '5px 10px', borderRadius: '5px', outline: 'none' }}>
                <option>Default (Blip)</option>
                <option>Classic</option>
                <option>Silent</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (settingsView === 'storage') {
      return (
        <div className="sidebar">
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Data and Storage</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '8px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{storageStats?.total || '0'}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>MB Used</div>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '15px' }}>Storage Breakdown</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🖼️</span> <span>Images</span>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>{storageStats?.images || '0'} MB</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🎥</span> <span>Videos</span>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>{storageStats?.videos || '0'} MB</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📄</span> <span>Documents</span>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>{storageStats?.documents || '0'} MB</span>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '500' }}>Local Cache</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Clear media (images, videos) to free up space. Text messages will not be deleted.
              </div>
              <button 
                onClick={onClearCache}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
              >
                🗑️ Clear Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (settingsView === 'qrcode') {
      const myEmail = userProfile?.email || userPhone || 'user@ploog.com';
      const qrData = JSON.stringify({ email: myEmail, name: userProfile?.name, avatar: userProfile?.avatar });

      return (
        <div className="sidebar" style={{ background: '#000' }}>
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>My QR Code</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
              <QRCodeCanvas value={qrData} size={200} />
            </div>
            <h3 style={{ margin: '0 0 5px 0' }}>{userProfile?.name || 'User'}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Scan this code to start a chat</p>
          </div>
        </div>
      );
    }

    if (settingsView === 'scanner') {
      const handleScanSuccess = (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          setScannedContact(data);
          setSettingsView('scanned_contact');
        } catch (err) {
          console.error("Invalid QR Code");
          alert("Invalid QR Code format!");
        }
      };

      // Since html5-qrcode mounts to a DOM ID, we need a small child component
      const ScannerComponent = () => {
        useEffect(() => {
          const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
          scanner.render(
            (text) => {
              scanner.clear();
              handleScanSuccess(text);
            }, 
            () => {}
          );
          return () => scanner.clear();
        }, []);
        return <div id="qr-reader" style={{ width: '100%', color: '#fff', marginTop: '20px' }}></div>;
      };

      return (
        <div className="sidebar" style={{ background: '#000' }}>
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Scan QR Code</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <ScannerComponent />
          </div>
        </div>
      );
    }

    if (settingsView === 'scanned_contact') {
      const handleStartChat = () => {
        setActiveChat({
          id: scannedContact.email,
          name: scannedContact.name || scannedContact.email,
          avatar: scannedContact.avatar ? <img src={scannedContact.avatar} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : '👤',
          preview: 'Started a new chat'
        });
        setIsSettingsOpen(false);
        if (setIsSidebarOpen) setIsSidebarOpen(false);
      };

      return (
        <div className="sidebar" style={{ background: '#000' }}>
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('scanner')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Contact Found</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', overflow: 'hidden', marginBottom: '20px' }}>
              {scannedContact?.avatar ? <img src={scannedContact.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : '👤'}
            </div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{scannedContact?.name || 'User'}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 30px 0' }}>{scannedContact?.email}</p>
            <button 
              onClick={handleStartChat}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              Start Chat
            </button>
          </div>
        </div>
      );
    }

    if (settingsView === 'privacy') {
      return (
        <div className="sidebar" style={{ background: '#000' }}>
          <div className="sidebar-header glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="menu-btn" onClick={() => setSettingsView('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Privacy and Security</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '15px' }}>Security</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '16px' }}>App Lock</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={appLockEnabled} 
                    onChange={(e) => setAppLockEnabled(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} 
                  />
                </label>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Require Face ID, Touch ID, or Passcode to open the app.
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '15px' }}>Privacy</h3>
              
              <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '16px' }}>Profile Photo</span>
                </div>
                <select 
                  value={privacySettings?.profilePhoto || 'everybody'}
                  onChange={(e) => setPrivacySettings({...privacySettings, profilePhoto: e.target.value})}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', padding: '10px', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="everybody">Everybody</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '16px' }}>Last Seen & Online</span>
                </div>
                <select 
                  value={privacySettings?.lastSeen || 'everybody'}
                  onChange={(e) => setPrivacySettings({...privacySettings, lastSeen: e.target.value})}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', padding: '10px', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="everybody">Everybody</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

            </div>
          </div>
        </div>
      );
    }

    const handleSavedMessages = () => {
      setActiveChat({ 
        id: 'saved_messages', 
        name: 'Saved Messages', 
        avatar: <Bookmark size={20} />, 
        preview: 'Forward messages here to save them' 
      });
      setIsSettingsOpen(false);
      if (setIsSidebarOpen) setIsSidebarOpen(false);
    };

    return (
      <div className="sidebar" style={{ background: '#000', overflowY: 'auto' }}>
        <div className="settings-top-bar">
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="settings-top-btn" onClick={() => setIsSettingsOpen(false)}><ArrowLeft size={24} /></button>
            <button className="settings-top-btn" onClick={() => setSettingsView('qrcode')}><QrCode size={24} /></button>
          </div>
          <button className="settings-top-btn" style={{color: 'var(--accent-color)', fontWeight: 600}} onClick={() => setSettingsView('profile')}>Edit</button>
        </div>

        <div className="settings-profile-header">
          <div className="settings-profile-avatar" onClick={() => setSettingsView('profile')}>
            {userProfile?.avatar ? <img src={userProfile.avatar} alt="Avatar" /> : '👤'}
          </div>
          <div className="settings-profile-name">{userProfile?.name || 'Maddy....'}</div>
          <div className="settings-profile-phone">{userPhone || '+91 ••• ••• ••••'} • @MathaN183</div>
        </div>

        <div style={{ padding: '0 15px 20px' }}>
          
          <div className="settings-group">
            <div className="settings-item" onClick={() => document.getElementById('avatar-upload').click()}>
              <div className="settings-icon" style={{ background: 'transparent', color: '#9d7ad5' }}>
                <Camera size={24} />
              </div>
              <div className="settings-item-content" style={{ color: '#9d7ad5' }}>
                Change Profile Photo
              </div>
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-item" onClick={() => setSettingsView('profile')}>
              <div className="settings-icon" style={{ background: '#FF3B30' }}>
                <User size={18} />
              </div>
              <div className="settings-item-content">
                My Profile
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-item" onClick={handleSavedMessages}>
              <div className="settings-icon" style={{ background: '#007AFF' }}>
                <Bookmark size={18} />
              </div>
              <div className="settings-item-content">
                Saved Messages
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
            <div className="settings-item" onClick={() => setSettingsView('calls')}>
              <div className="settings-icon" style={{ background: '#34C759' }}>
                <PhoneCall size={18} />
              </div>
              <div className="settings-item-content">
                Recent Calls
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
            <div className="settings-item" onClick={() => setSettingsView('scanner')}>
              <div className="settings-icon" style={{ background: '#FF9500' }}>
                <MonitorSmartphone size={18} />
              </div>
              <div className="settings-item-content">
                Devices
                <span className="settings-item-value" style={{display: 'flex', alignItems: 'center'}}>Scan QR <ChevronRight size={18} className="settings-item-arrow" style={{marginLeft: 5}} /></span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-item" onClick={() => setSettingsView('notifications')}>
              <div className="settings-icon" style={{ background: '#FF3B30' }}>
                <BellRing size={18} />
              </div>
              <div className="settings-item-content">
                Notifications and Sounds
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
            <div className="settings-item" onClick={() => setSettingsView('privacy')}>
              <div className="settings-icon" style={{ background: '#8E8E93' }}>
                <Lock size={18} />
              </div>
              <div className="settings-item-content">
                Privacy and Security
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
            <div className="settings-item" onClick={() => setSettingsView('storage')}>
              <div className="settings-icon" style={{ background: '#34C759' }}>
                <Database size={18} />
              </div>
              <div className="settings-item-content">
                Data and Storage
                <ChevronRight size={18} className="settings-item-arrow" />
              </div>
            </div>
            <div className="settings-item" onClick={toggleTheme}>
              <div className="settings-icon" style={{ background: '#5856D6' }}>
                <Paintbrush size={18} />
              </div>
              <div className="settings-item-content">
                Appearance
                <span className="settings-item-value" style={{display: 'flex', alignItems: 'center'}}>{theme === 'dark-theme' ? 'Dark' : 'Light'} <ChevronRight size={18} className="settings-item-arrow" style={{marginLeft: 5}} /></span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-item" onClick={onLogout}>
              <div className="settings-icon" style={{ background: '#FF3B30' }}>
                <LogOut size={18} />
              </div>
              <div className="settings-item-content">
                Logout
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header glass">
        <button className="menu-btn" onClick={() => setIsSettingsOpen(true)} title="Settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} />
        </button>
        <div className="search-container">
          <input type="text" className="search-input" placeholder="Search chats..." />
        </div>
      </div>
      <div style={{ padding: '0 16px 12px' }}>
        <button 
          onClick={onNewChat}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Plus size={18} /> New Chat
        </button>
      </div>
      <div className="chat-list">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
            onClick={() => {
              setActiveChat(chat);
              if (setIsSidebarOpen) setIsSidebarOpen(false);
            }}
            onContextMenu={(e) => handleContextMenu(e, chat.id)}
            onTouchStart={(e) => handleTouchStart(e, chat.id)}
            onTouchEnd={clearLongPress}
            onTouchMove={clearLongPress}
          >
            <div className="chat-avatar">{chat.avatar}</div>
            <div className="chat-info">
              <div className="flex justify-between items-center">
                <span className="chat-name">{chat.name}</span>
                <span className="message-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {mutedChats?.includes(chat.id) && <BellOff size={14} color="#8E8E93" />}
                  10:30 AM
                </span>
              </div>
              <div className="chat-preview">{chat.preview}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div 
            className="context-menu glass" 
            style={{ 
              position: 'fixed', 
              top: contextMenu.y, 
              left: contextMenu.x, 
              zIndex: 10000, 
              borderRadius: '12px', 
              padding: '8px 0', 
              minWidth: '160px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}
          >
            <div className="context-menu-item" onClick={() => { alert('Chat Pinned!'); setContextMenu(null); }}>
              <Pin size={16} /> Pin
            </div>
            <div className="context-menu-item" onClick={() => { toggleMute(contextMenu.chatId); setContextMenu(null); }}>
              {mutedChats?.includes(contextMenu.chatId) ? <><Bell size={16} /> Unmute</> : <><BellOff size={16} /> Mute</>}
            </div>
            <div className="context-menu-item" style={{ color: 'var(--danger)' }} onClick={() => { alert('Chat Deleted!'); setContextMenu(null); }}>
              <Trash2 size={16} /> Delete
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;
