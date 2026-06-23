require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const geoip = require('geoip-lite');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected to Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const otps = new Map(); // Store OTPs temporarily

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all. In prod, restrict to frontend domain.
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving uploaded files across origins
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 chunks/reqs per 15 mins to avoid blocking large file chunks
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/upload-chunk', apiLimiter);
app.use('/merge-chunks', apiLimiter);

// Nodemailer setup
let transporter;
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('Failed to create a testing account', err);
    return;
  }
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
});

// We no longer need Nodemailer, but we'll leave it for legacy testing if needed.
// Firebase Phone Auth validates the OTP on the client side.
// The client sends the verified phone number here to get the App JWT.
app.post('/firebase-login', apiLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    let user = await User.findOne({ email: phone });
    if (!user) {
      user = new User({ email: phone, name: phone });
      await user.save();
    }
    const token = jwt.sign({ email: phone, phone }, JWT_SECRET, { expiresIn: '24h' });
    console.log(`[AUTH] User logged in via Firebase SMS: ${phone}`);
    return res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ---------------------------------------------------------
// GEO-RESTRICTION MIDDLEWARE (INDIA ONLY)
// ---------------------------------------------------------
const enforceIndiaOnly = (req, res, next) => {
  // Allow a test header to simulate IPs for testing
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Localhost and LAN bypass for development
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('::ffff:192.168.') || clientIp.startsWith('::ffff:10.');
  if (isLocal) {
    return next();
  }

  const geo = geoip.lookup(clientIp);
  
  // If we can't determine the country or it's not India, block.
  if (!geo || geo.country !== 'IN') {
    return res.status(403).json({ 
      error: 'Access Denied', 
      message: 'This service is only available in India.' 
    });
  }
  
  next();
};

app.use(enforceIndiaOnly);

// ---------------------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------------------
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const user = jwt.verify(token, JWT_SECRET);
      req.user = user;
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid Token' });
    }
  }
  res.status(401).json({ error: 'Authentication Required' });
};

// ---------------------------------------------------------
// DATABASE API ROUTES
// ---------------------------------------------------------
app.post('/update-profile', authenticateJWT, async (req, res) => {
  try {
    const { name, bio, privacySettings } = req.body;
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { name, bio, privacySettings },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/fetch-users', authenticateJWT, async (req, res) => {
  try {
    const users = await User.find({}, 'email name avatar bio lastSeen privacySettings');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/fetch-messages/:chatId', authenticateJWT, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.email, receiverId: req.params.chatId },
        { senderId: req.params.chatId, receiverId: req.user.email }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ---------------------------------------------------------
// LARGE FILE UPLOAD (CHUNKS)
// ---------------------------------------------------------
const upload = multer({ dest: 'uploads/temp/' });

// Create temp directory for chunks
const tempDir = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

app.post('/upload-chunk', authenticateJWT, upload.single('file'), (req, res) => {
  const { originalName, chunkIndex, totalChunks, fileId } = req.body;
  const chunk = req.file;

  if (!chunk) {
    return res.status(400).json({ error: 'No chunk provided' });
  }

  const chunkPath = path.join(tempDir, `${fileId}-${chunkIndex}`);
  fs.renameSync(chunk.path, chunkPath);

  res.json({ message: 'Chunk received', chunkIndex });
});

app.post('/merge-chunks', authenticateJWT, (req, res) => {
  const { fileId, originalName, totalChunks } = req.body;
  const finalPath = path.join(uploadsDir, `${fileId}-${originalName}`);
  
  const writeStream = fs.createWriteStream(finalPath);
  
  let i = 0;
  const mergeNext = () => {
    if (i >= totalChunks) {
      writeStream.end();
      // Clean up chunks
      for (let j = 0; j < totalChunks; j++) {
        fs.unlinkSync(path.join(tempDir, `${fileId}-${j}`));
      }
      return res.json({ message: 'File merged successfully', url: `/uploads/${fileId}-${originalName}` });
    }
    
    const chunkPath = path.join(tempDir, `${fileId}-${i}`);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
    i++;
    mergeNext();
  };
  
  mergeNext();
});

// Serve uploaded files securely
app.use('/uploads', express.static(uploadsDir));

// ---------------------------------------------------------
// REAL-TIME MESSAGING (SOCKET.IO)
// ---------------------------------------------------------
io.use((socket, next) => {
  // Check JWT Token
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }

  // Geo-restrict sockets as well
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('::ffff:192.168.') || clientIp.startsWith('::ffff:10.');
  if (isLocal) {
    return next();
  }
  const geo = geoip.lookup(clientIp);
  if (!geo || geo.country !== 'IN') {
    return next(new Error('Access Denied: India Only'));
  }
  next();
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'Email:', socket.user?.email);

  // Automatically join a room matching their own phone/email for receiving private messages
  if (socket.user?.email) {
    socket.join(socket.user.email);
  }

  // Join a specific private chat room (for backward compatibility if needed)
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user?.email} joined chat room: ${chatId}`);
  });

  socket.on('send_message', async (data) => {
    // Inject the real authenticated user identity
    data.senderEmail = socket.user?.email || 'Unknown';
    
    // Save to MongoDB
    try {
      if (data.senderEmail !== 'Unknown') {
        const newMsg = new Message({
          senderId: data.senderEmail,
          receiverId: data.chatId,
          chatId: data.chatId,
          content: data.content,
          type: data.type || 'text',
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileUrl: data.fileUrl
        });
        await newMsg.save();
        data._id = newMsg._id;
      }
    } catch(err) {
      console.error('Failed to save message to DB', err);
    }

    // Route message to the target's personal room
    io.to(data.chatId).emit('receive_message', data);
    
    // Also bounce it back to the sender so their UI updates
    if (socket.user?.email && socket.user.email !== data.chatId) {
      io.to(socket.user.email).emit('receive_message', data);
    }
  });

  socket.on('report_message', (data) => {
    console.log(`[ADMIN DASHBOARD ALERT] User ${socket.user?.email} reported message ${data.msgId} from ${data.userEmail}. Reason: ${data.reason}`);
    // In the future (Feature 9), this will write to MongoDB Admin Dashboard
  });

  // --- WebRTC Signaling ---
  socket.on('call_user', (data) => {
    io.to(data.userToCall).emit('call_incoming', {
      signal: data.signalData,
      from: socket.user?.email || 'Unknown',
      isVideo: data.isVideo
    });
  });

  socket.on('answer_call', (data) => {
    io.to(data.to).emit('call_accepted', data.signal);
  });

  socket.on('end_call', (data) => {
    io.to(data.to).emit('call_ended');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
