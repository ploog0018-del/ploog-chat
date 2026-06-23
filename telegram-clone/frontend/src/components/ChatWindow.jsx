import React, { useState, useRef, useEffect } from 'react';
import * as nsfwjs from 'nsfwjs';
import imageCompression from 'browser-image-compression';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { Phone, Video, MoreVertical, ArrowLeft, Paperclip, Send } from 'lucide-react';
import UserProfile from './UserProfile';

const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks
const SHARED_SECRET = 'india-telegram-clone-secret-key'; // Simulated E2EE Key

export default function ChatWindow({ activeChat, messages, socket, goBack, isOffline, myKeyPair, onRestoreFile, onInitiateCall }) {
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [nsfwModel, setNsfwModel] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState(JSON.parse(localStorage.getItem('blockedUsers') || '[]'));
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  useEffect(() => {
    // Load NSFW AI Model purely on the client for safety and speed
    nsfwjs.load().then(model => setNsfwModel(model)).catch(console.error);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendText = () => {
    if (!inputText.trim() || isOffline) return;
    
    // Generate a 32-byte key using SHA-512 (truncate to 32)
    const keyHash = nacl.hash(decodeUTF8(SHARED_SECRET + activeChat.id)).slice(0, 32);
    
    // Generate random 24-byte nonce
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageUint8 = decodeUTF8(inputText);
    const box = nacl.secretbox(messageUint8, nonce, keyHash);

    // Send encrypted data + nonce (Base64 encoded for JSON transmission)
    const payload = encodeBase64(nonce) + ':' + encodeBase64(box);
    
    const msg = {
      id: Date.now().toString(),
      chatId: activeChat.id,
      type: 'text',
      content: payload, // Signal-style E2E encrypted box
      senderId: socket?.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('send_message', msg);
    setInputText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isOffline) return;

    setUploading(true);
    setUploadProgress(0);

    // AI 18+ Content Blocking
    if (file.type.startsWith('image/') && nsfwModel) {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => { img.onload = resolve; });
        
        const predictions = await nsfwModel.classify(img);
        const isAdult = predictions.some(p => (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6);
        
        if (isAdult) {
          alert('🚨 18+ Adult Content Detected! Upload blocked by AI.');
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      } catch (err) {
        console.error('NSFW Check Failed', err);
      }
    }

    // AI Image Compression (Client-side)
    let fileToUpload = file;
    if (file.type.startsWith('image/') && !file.type.includes('gif')) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(file, options);
        console.log(`Compressed from ${file.size/1024/1024}MB to ${fileToUpload.size/1024/1024}MB`);
      } catch (error) {
        console.log('Compression error', error);
      }
    }

    const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
    const fileId = Date.now().toString();

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
        const chunk = fileToUpload.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('fileId', fileId);
        formData.append('originalName', file.name);

        const token = localStorage.getItem('telegram-clone-jwt');
        await fetch(`https://ploog-chat.onrender.com/upload-chunk`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        setUploadProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
      }

      // Merge
      const token = localStorage.getItem('telegram-clone-jwt');
      const res = await fetch(`https://ploog-chat.onrender.com/merge-chunks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId, originalName: file.name, totalChunks })
      });
      
      const data = await res.json();

      // Send message with file
      const msg = {
        id: Date.now().toString(),
        chatId: activeChat.id,
        type: 'file',
        content: data.url,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        senderId: socket.id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socket.emit('send_message', msg);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please check your backend.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!activeChat) {
    return (
      <div className="chat-window items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {isProfileOpen ? (
        <UserProfile 
          activeChat={activeChat} 
          onClose={() => setIsProfileOpen(false)} 
          onInitiateCall={onInitiateCall} 
        />
      ) : (
        <>
          <div className="chat-header glass">
            <button className="back-btn mobile-only" onClick={goBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={24} />
            </button>
            <div className="chat-avatar" style={{ width: 40, height: 40, fontSize: 20, cursor: 'pointer' }} onClick={() => setIsProfileOpen(true)}>
              {activeChat.avatar}
            </div>
            <div className="chat-header-info" style={{ flex: 1, cursor: 'pointer' }} onClick={() => setIsProfileOpen(true)}>
              <h2>{activeChat.name}</h2>
              <span>{isOffline ? <strong style={{color: 'var(--danger)'}}>Offline</strong> : 'Online'}</span>
            </div>
            <div className="chat-header-actions" style={{ display: 'flex', gap: '15px', marginRight: '10px' }}>
              <button onClick={() => onInitiateCall(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Audio Call">
                <Phone size={20} />
              </button>
              <button onClick={() => onInitiateCall(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Video Call">
                <Video size={20} />
              </button>
              <button onClick={() => setIsProfileOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} title="More Options">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

      <div className="messages-area">
        <div className="message-bubble message-received">
          Welcome to the {activeChat.name} chat! Start sending messages or upload large movie files using the attachment icon below.
          <div className="message-meta">System</div>
        </div>
        
        {messages.filter(msg => !blockedUsers.includes(msg.senderEmail)).map((msg) => {
          const isMine = msg.senderId === socket.id;
          
          // Decrypt if it's text
          let displayContent = msg.content;
          if (msg.type === 'text') {
            try {
              const parts = msg.content.split(':');
              if (parts.length === 2) {
                const nonce = decodeBase64(parts[0]);
                const box = decodeBase64(parts[1]);
                const keyHash = nacl.hash(decodeUTF8(SHARED_SECRET + activeChat.id)).slice(0, 32);
                
                const decryptedUint8 = nacl.secretbox.open(box, nonce, keyHash);
                if (decryptedUint8) {
                  displayContent = encodeUTF8(decryptedUint8);
                } else {
                  displayContent = "🔒 [Encrypted Message]";
                }
              } else {
                // Fallback for old messages
                displayContent = "🔒 [Legacy Message]";
              }
            } catch (e) {
              displayContent = "🔒 [Encrypted Message]";
            }
          }

          return (
            <div key={msg.id} className={`message-wrapper ${isMine ? 'wrapper-sent' : 'wrapper-received'}`}>
              <div className={`message-bubble ${isMine ? 'message-sent' : 'message-received'}`}>
                {msg.type === 'text' ? (
                  <div>{displayContent}</div>
                ) : msg.type === 'cleared_file' ? (
                  <div className="movie-attachment" style={{ opacity: 0.7 }}>
                    <div className="movie-icon">🗑️</div>
                    <div className="movie-details">
                      <span className="movie-name" style={{ textDecoration: 'line-through' }}>{msg.fileName}</span>
                      <span className="movie-size">Removed from device to save space</span>
                      <button 
                        className="download-btn" 
                        onClick={() => onRestoreFile(msg.id, activeChat.id)}
                        style={{ marginTop: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        ☁️ Download from Cloud
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="movie-attachment">
                    <div className="movie-icon">🎬</div>
                    <div className="movie-details">
                      <span className="movie-name">{msg.fileName}</span>
                      <span className="movie-size">{msg.fileSize}</span>
                      <a href={`https://ploog-chat.onrender.com${msg.content}`} target="_blank" rel="noreferrer">
                        <button className="download-btn">Download / Stream</button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className={`message-meta-outside ${isMine ? 'meta-sent' : 'meta-received'}`}>
                {msg.timestamp}
                {isMine && (
                  <span style={{ color: msg.isRead ? '#c471f5' : 'inherit', marginLeft: '4px' }}>
                    {msg.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {uploading && (
        <div className="upload-progress-container">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 13, fontWeight: 500 }}>Uploading file...</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{uploadProgress}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}

      <div className="chat-input-area glass">
        <div className="input-wrapper">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.zip,.rar"
            disabled={isOffline}
          />
          <button className="attach-btn" onClick={() => fileInputRef.current.click()} title="Attach Large File" disabled={isOffline} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            className="message-input" 
            placeholder={isOffline ? "You are offline..." : "Write a message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            disabled={isOffline}
          />
          <button className="send-btn" onClick={handleSendText} disabled={isOffline} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={18} />
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
