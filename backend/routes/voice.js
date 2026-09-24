const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const AI_SERVICE_URL = process.env.AI_VOICE_SERVICE_URL || 'http://127.0.0.1:5055';
const SAMPLE_MP3_PATH = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'voice_ai', 'NSUT_Le_Chuc_sample.mp3');
const DEFAULT_WAV_PATH = 'E:\\Music_Made\\dongnoi\\voices\\NSUT_Le_Chuc.wav';

// GET /api/voice/health - Kiểm tra tình trạng AI Voice Service
router.get('/health', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${AI_SERVICE_URL}/health`, {
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
      message: 'Dịch vụ AI Voice chưa chạy trên port 5055. Hãy chạy START_TPBD_WITH_AI.bat để khởi động!'
    });
  }
});

// GET /api/voice/sample - Phát file giọng mẫu của NSƯT Lê Chức
router.get('/sample', (req, res) => {
  if (fs.existsSync(SAMPLE_MP3_PATH)) {
    return res.sendFile(SAMPLE_MP3_PATH);
  }
  if (fs.existsSync(DEFAULT_WAV_PATH)) {
    res.setHeader('Content-Type', 'audio/wav');
    return res.sendFile(DEFAULT_WAV_PATH);
  }
  return res.status(404).json({ message: 'Không tìm thấy file mẫu giọng đọc NSƯT Lê Chức.' });
});

// POST /api/voice/synthesize - Chuyển văn bản thành giọng nói AI
router.post('/synthesize', async (req, res) => {
  const { text, speed } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập văn bản cần đọc.' });
  }

  if (text.length > 1500) {
    return res.status(400).json({ success: false, message: 'Văn bản vượt quá giới hạn 1500 ký tự.' });
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        speed: typeof speed === 'number' ? speed : 1.0
      })
    });

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
      message: 'Không thể kết nối đến máy chủ AI Voice (Port 5055). Vui lòng đảm bảo dịch vụ AI Python đã được khởi chạy!'
    });
  }
});

module.exports = router;
