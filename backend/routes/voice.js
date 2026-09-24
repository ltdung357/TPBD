const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Cấu hình URL dịch vụ AI: Ưu tiên Modal Serverless GPU/CPU Cloud độc lập 24/24
const MODAL_ENDPOINT_BASE = 'https://ltdung357--tpbd-voice-ai-voiceservice';
const AI_SERVICE_URL = process.env.AI_VOICE_SERVICE_URL || MODAL_ENDPOINT_BASE;
const SAMPLE_MP3_PATH = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'voice_ai', 'NSUT_Le_Chuc_sample.mp3');
const DEFAULT_WAV_PATH = 'E:\\Music_Made\\dongnoi\\voices\\NSUT_Le_Chuc.wav';

function getEndpointUrl(action) {
  // Nếu trỏ tới Modal Cloud
  if (AI_SERVICE_URL.includes('modal.run') || AI_SERVICE_URL.includes('--tpbd-voice-ai-voiceservice')) {
    const base = AI_SERVICE_URL.replace(/-(health|sample|synthesize)\.modal\.run$/, '').replace(/\.modal\.run$/, '');
    return `${base}-${action}.modal.run`;
  }
  // Nếu trỏ tới local FastAPI (http://127.0.0.1:5055)
  return `${AI_SERVICE_URL.replace(/\/$/, '')}/${action}`;
}

// GET /api/voice/health - Kiểm tra tình trạng AI Voice Service
router.get('/health', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const healthUrl = getEndpointUrl('health');
    const response = await fetch(healthUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return res.json({ connected: true, ...data });
    }
    return res.status(502).json({ connected: false, message: 'Dịch vụ AI Voice trả về lỗi' });
  } catch (err) {
    return res.json({
      connected: false,
      message: 'Đang kết nối tới dịch vụ AI Voice Cloud...'
    });
  }
});

// GET /api/voice/sample - Phát file giọng mẫu của NSƯT Lê Chức
router.get('/sample', (req, res) => {
  if (fs.existsSync(SAMPLE_MP3_PATH)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.sendFile(SAMPLE_MP3_PATH);
  }
  if (fs.existsSync(DEFAULT_WAV_PATH)) {
    res.setHeader('Content-Type', 'audio/wav');
    return res.sendFile(DEFAULT_WAV_PATH);
  }
  return res.status(404).json({ message: 'Không tìm thấy file mẫu giọng đọc NSƯT Lê Chức.' });
});

const jwt = require('jsonwebtoken');

// Middleware phân quyền: Khách chỉ được nghe mẫu, chỉ tài khoản đăng nhập mới được tạo giọng nói
function requireVoiceAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Tính năng tạo giọng nói AI yêu cầu đăng nhập tài khoản. Quý khách vui lòng liên hệ Hotline / Zalo: 0962.384.661 để sử dụng dịch vụ!'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại hoặc liên hệ Hotline / Zalo: 0962.384.661!'
    });
  }
}

// POST /api/voice/synthesize - Chuyển văn bản thành giọng nói AI (Yêu cầu đăng nhập)
router.post('/synthesize', requireVoiceAuth, async (req, res) => {
  const { text, speed } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập văn bản cần đọc.' });
  }

  if (text.length > 1500) {
    return res.status(400).json({ success: false, message: 'Văn bản vượt quá giới hạn 1500 ký tự.' });
  }

  try {
    const synthUrl = getEndpointUrl('synthesize');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // Cho phép tối đa 120s nếu khởi động lạnh

    const response = await fetch(synthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        speed: typeof speed === 'number' ? speed : 1.0
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.detail || data.message || 'Lỗi từ dịch vụ AI Voice.'
      });
    }

    return res.json(data);
  } catch (err) {
    console.error('❌ [Voice API Proxy Error]', err.message);
    return res.status(503).json({
      success: false,
      message: 'Không thể kết nối đến máy chủ AI Voice Cloud (Modal). Vui lòng thử lại sau vài giây!'
    });
  }
});

module.exports = router;
