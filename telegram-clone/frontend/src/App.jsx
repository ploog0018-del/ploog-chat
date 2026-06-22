import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import SettingsModal from './components/SettingsModal';
import localforage from 'localforage';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import Peer from 'simple-peer';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('telegram-clone-jwt') || null);
  const [socket, setSocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('telegram-theme') || 'dark-theme');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myKeyPair, setMyKeyPair] = useState(null);
  
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('blip_user_profile');
    return saved ? JSON.parse(saved) : { bio: 'Hey there! I am using Ploog.', avatar: '' };
  });

  const [appLockEnabled, setAppLockEnabled] = useState(JSON.parse(localStorage.getItem('appLockEnabled')) || false);
  const [isAppLocked, setIsAppLocked] = useState(JSON.parse(localStorage.getItem('appLockEnabled')) || false);
  const [privacySettings, setPrivacySettings] = useState(() => {
    const saved = localStorage.getItem('blip_privacy');
    return saved ? JSON.parse(saved) : { profilePhoto: 'everybody', lastSeen: 'everybody' };
  });

  useEffect(() => {
    localStorage.setItem('blip_privacy', JSON.stringify(privacySettings));
  }, [privacySettings]);

  useEffect(() => {
    localStorage.setItem('appLockEnabled', JSON.stringify(appLockEnabled));
  }, [appLockEnabled]);

  // WebRTC States
  const [storageStats, setStorageStats] = useState(null);
  const [mutedChats, setMutedChats] = useState(JSON.parse(localStorage.getItem('mutedChats') || '[]'));
  const mutedChatsRef = useRef(mutedChats);

  useEffect(() => {
    mutedChatsRef.current = mutedChats;
    localStorage.setItem('mutedChats', JSON.stringify(mutedChats));
  }, [mutedChats]);

  const toggleMute = (chatId) => {
    setMutedChats(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const myVideo = React.useRef();
  const userVideo = React.useRef();
  const connectionRef = React.useRef();

  useEffect(() => {
    // Load or Generate E2E Keys
    localforage.getItem('blip_e2e_keys').then((keys) => {
      if (keys) {
        setMyKeyPair({
          publicKey: decodeBase64(keys.publicKey),
          secretKey: decodeBase64(keys.secretKey)
        });
      } else {
        const newKeys = nacl.box.keyPair();
        localforage.setItem('blip_e2e_keys', {
          publicKey: encodeBase64(newKeys.publicKey),
          secretKey: encodeBase64(newKeys.secretKey)
        });
        setMyKeyPair(newKeys);
      }
    });

    // Load offline messages on boot
    localforage.getItem('blip_offline_messages').then((stored) => {
      if (stored) {
        setMessagesByChat(stored);
      }
    });

    localforage.getItem('blip_sidebar_chats').then((storedChats) => {
      if (storedChats && storedChats.length > 0) {
        setChats(storedChats);
      } else {
        // Initial setup with a Global Chat if empty
        setChats([{ id: 'global', name: 'Global Chat', avatar: '🌐', preview: 'Welcome to Ploog!' }]);
      }
    });
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localforage.setItem('blip_sidebar_chats', chats);
    }
  }, [chats]);

  useEffect(() => {
    // Save messages offline whenever they change
    if (Object.keys(messagesByChat).length > 0) {
      localforage.setItem('blip_offline_messages', messagesByChat);
    }
  }, [messagesByChat]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('telegram-theme', theme);
  }, [theme]);

  const updateProfile = (updates) => {
    const newProfile = { ...userProfile, ...updates };
    setUserProfile(newProfile);
    localStorage.setItem('blip_user_profile', JSON.stringify(newProfile));
  };

  const toggleTheme = () => setTheme(t => t === 'dark-theme' ? 'light-theme' : 'dark-theme');

  useEffect(() => {
    if (!token) return;

    const newSocket = io(`http://${window.location.hostname}:5000`, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      if (err.message.includes('India Only') || err.message.includes('Access Denied')) {
        setAccessDenied(true);
        setErrorMessage(err.message);
      } else if (err.message.includes('Authentication error')) {
        setToken(null);
        localStorage.removeItem('telegram-clone-jwt');
      }
    });

    newSocket.on('receive_message', (data) => {
      let myEmail = '';
      try { myEmail = JSON.parse(atob(token.split('.')[1])).email; } catch(e){}

      const threadId = data.senderEmail === myEmail ? data.chatId : data.senderEmail;

      setMessagesByChat((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), data]
      }));
      
      // Play notification sound if chat is NOT muted and NOT sent by me
      if (data.senderEmail !== myEmail && !mutedChatsRef.current.includes(threadId)) {
        try {
          // Play a simple pop sound
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch(err) {
          console.error("Audio play failed:", err);
        }
      }

      if (data.senderEmail) {
        setChats(prevChats => {
          if (!prevChats.find(c => c.id === data.senderEmail)) {
            return [...prevChats, { id: data.senderEmail, name: data.senderEmail, avatar: '👤', preview: 'New message received' }];
          }
          return prevChats;
        });
      }
    });

    newSocket.on('call_incoming', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      setIsVideoCall(data.isVideo);
    });

    newSocket.on('call_ended', () => {
      leaveCall();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const handleNewChat = () => {
    const email = window.prompt("Enter the exact Phone Number or Email of the person you want to chat with:");
    if (!email || email.trim() === '') return;
    
    setChats(prev => {
      if (prev.find(c => c.id === email)) return prev;
      return [...prev, { id: email, name: email, avatar: '👤', preview: 'Say hi!' }];
    });
    setActiveChat({ id: email, name: email, avatar: '👤', preview: 'Say hi!' });
    setIsSidebarOpen(false);
  };

  const handleClearCache = async () => {
    setIsSettingsOpen(false);
    if (window.confirm("Are you sure you want to clear downloaded files to free up space? Your text messages will be kept safe.")) {
      
      const newMessagesByChat = { ...messagesByChat };
      
      // Strip files out of the message history to save space
      Object.keys(newMessagesByChat).forEach(chatId => {
        newMessagesByChat[chatId] = newMessagesByChat[chatId].map(msg => {
          if (msg.type === 'file') {
            return { ...msg, type: 'cleared_file', originalContent: msg.content, content: '' };
          }
          return msg;
        });
      });

      setMessagesByChat(newMessagesByChat);
      await localforage.setItem('blip_offline_messages', newMessagesByChat);
      alert("Files cleared from cache successfully! Storage space freed.");
    }
  };

  const calculateStorageStats = () => {
    let imagesMB = 0;
    let videosMB = 0;
    let documentsMB = 0;

    Object.values(messagesByChat).forEach(messages => {
      messages.forEach(msg => {
        if (msg.type === 'file' && msg.fileSize) {
          const sizeMB = parseFloat(msg.fileSize.replace(' MB', '')) || 0;
          const ext = msg.fileName ? msg.fileName.split('.').pop().toLowerCase() : '';
          
          if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            imagesMB += sizeMB;
          } else if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) {
            videosMB += sizeMB;
          } else {
            documentsMB += sizeMB;
          }
        }
      });
    });

    const totalMB = imagesMB + videosMB + documentsMB;
    return { 
      images: imagesMB.toFixed(1), 
      videos: videosMB.toFixed(1), 
      documents: documentsMB.toFixed(1), 
      total: totalMB.toFixed(1) 
    };
  };

  const handleRestoreFile = async (msgId, chatId) => {
    const newMessagesByChat = { ...messagesByChat };
    if (newMessagesByChat[chatId]) {
      newMessagesByChat[chatId] = newMessagesByChat[chatId].map(msg => {
        if (msg.id === msgId && msg.type === 'cleared_file') {
          return { ...msg, type: 'file', content: msg.originalContent };
        }
        return msg;
      });
      setMessagesByChat(newMessagesByChat);
      await localforage.setItem('blip_offline_messages', newMessagesByChat);
    }
  };

  useEffect(() => {
    if (!socket || !activeChat) return;
    socket.emit('join_chat', activeChat.id);
  }, [socket, activeChat]);

  // --- WebRTC Functions ---
  const callUser = async (idToCall, isVideo) => {
    setIsCalling(true);
    setIsVideoCall(isVideo);
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
      });

      peer.on('signal', (data) => {
        socket.emit('call_user', {
          userToCall: idToCall,
          signalData: data,
          isVideo
        });
      });

      peer.on('stream', (userStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream;
      });

      socket.on('call_accepted', (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setIsCalling(false);
    }
  };

  const answerCall = async () => {
    setCallAccepted(true);
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
      });

      peer.on('signal', (data) => {
        socket.emit('answer_call', { signal: data, to: caller });
      });

      peer.on('stream', (userStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream;
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (err) {
      console.error("Error accessing media devices.", err);
    }
  };

  const leaveCall = () => {
    setCallEnded(true);
    setReceivingCall(false);
    setIsCalling(false);
    setCallAccepted(false);
    if (connectionRef.current) connectionRef.current.destroy();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    socket.emit('end_call', { to: activeChat?.id || caller });
  };

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('telegram-clone-jwt', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('telegram-clone-jwt');
    setToken(null);
    if (socket) {
      socket.disconnect();
    }
    window.location.reload();
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isOffline = !socket || !socket.connected;
  const handleUnlock = async () => {
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: "Ploog Secure App" },
            user: {
              id: new Uint8Array(16),
              name: "user",
              displayName: "User"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000,
          }
        });
        setIsAppLocked(false);
      } else {
        const pass = window.prompt("WebAuthn not supported. Enter master PIN (0000) to unlock:");
        if (pass === "0000") setIsAppLocked(false);
      }
    } catch (e) {
      console.error("Biometric failure:", e);
      alert("Authentication failed or cancelled.");
    }
  };

  if (isAppLocked) {
    return (
      <div className={`app-container ${theme}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '30px' }}>App Locked</h2>
        <button 
          onClick={handleUnlock}
          style={{ padding: '15px 30px', borderRadius: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Unlock with Face ID / PIN
        </button>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="access-denied-container flex flex-col items-center justify-center w-full h-full">
        <div className="error-card">
          <h1>Access Denied 🚫</h1>
          <p>This service is exclusively available within India.</p>
          <p className="error-detail">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}`}>
      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar 
          chats={chats}
          activeChat={activeChat} 
          setActiveChat={setActiveChat}
          setIsSidebarOpen={setIsSidebarOpen}
          onNewChat={handleNewChat}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          userPhone={socket?.user?.email}
          userProfile={userProfile}
          updateProfile={updateProfile}
          toggleTheme={toggleTheme}
          theme={theme}
          onClearCache={handleClearCache}
          storageStats={storageStats}
          onLogout={handleLogout}
          mutedChats={mutedChats}
          toggleMute={toggleMute}
          appLockEnabled={appLockEnabled}
          setAppLockEnabled={setAppLockEnabled}
          privacySettings={privacySettings}
          setPrivacySettings={setPrivacySettings}
        />
      </div>
      <div className={`main-chat-container ${!isSidebarOpen ? 'open' : ''}`}>
        {activeChat ? (
          <ChatWindow 
            socket={socket} 
            activeChat={activeChat} 
            messages={messagesByChat[activeChat.id] || []} 
            goBack={() => {
              setActiveChat(null);
              setIsSidebarOpen(true);
            }}
            isOffline={isOffline}
            myKeyPair={myKeyPair}
            onRestoreFile={handleRestoreFile}
            onInitiateCall={(isVideo) => callUser(activeChat.id, isVideo)}
          />
        ) : (
          <div className="empty-chat-state glass">
          </div>
        )}
      </div>

      {/* Incoming Call Overlay */}
      {receivingCall && !callAccepted && !callEnded && (
        <div className="call-overlay glass">
          <div className="call-modal">
            <h2>{caller} is calling...</h2>
            <p>{isVideoCall ? '📹 Video Call' : '📞 Audio Call'}</p>
            <div className="call-actions">
              <button onClick={answerCall} className="answer-btn">Accept</button>
              <button onClick={leaveCall} className="reject-btn">Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call UI */}
      {(callAccepted || isCalling) && !callEnded && (
        <div className="active-call-overlay glass">
          <div className="videos-container">
            {stream && (
              <video playsInline muted ref={myVideo} autoPlay className="my-video" />
            )}
            {callAccepted && (
              <video playsInline ref={userVideo} autoPlay className="user-video" />
            )}
          </div>
          <button onClick={leaveCall} className="end-call-btn">End Call</button>
        </div>
      )}

    </div>
  );
}

export default App;
