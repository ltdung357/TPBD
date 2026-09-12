const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { verifyToken } = require('./auth');

const envPath = path.join(__dirname, '..', '..', '.env');

function getDeployHook() {
  if (process.env.RENDER_DEPLOY_HOOK) return process.env.RENDER_DEPLOY_HOOK;
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/RENDER_DEPLOY_HOOK=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

// GET /api/system/deploy-status
router.get('/deploy-status', verifyToken, (req, res) => {
  const hook = getDeployHook();
  res.json({ configured: !!hook });
});

// POST /api/system/save-deploy-hook
router.post('/save-deploy-hook', verifyToken, (req, res) => {
  const { deploy_hook } = req.body;
  if (!deploy_hook || !deploy_hook.startsWith('http')) {
    return res.status(400).json({ message: 'URL Deploy Hook không hợp lệ!' });
  }

  try {
    process.env.RENDER_DEPLOY_HOOK = deploy_hook.trim();
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('RENDER_DEPLOY_HOOK=')) {
      envContent = envContent.replace(/RENDER_DEPLOY_HOOK=.*/, `RENDER_DEPLOY_HOOK=${deploy_hook.trim()}`);
    } else {
      envContent += `\nRENDER_DEPLOY_HOOK=${deploy_hook.trim()}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    res.json({ message: 'Lưu URL Deploy Hook thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi ghi tệp .env: ' + err.message });
  }
});

// POST /api/system/trigger-deploy
router.post('/trigger-deploy', verifyToken, (req, res) => {
  const hook = getDeployHook();
  if (!hook) {
    return res.status(400).json({ 
      message: 'Chưa cấu hình URL Deploy Hook của Render!', 
      need_config: true 
    });
  }

  const clientReq = https.request(hook, { method: 'POST' }, (renderRes) => {
    let body = '';
    renderRes.on('data', chunk => body += chunk);
    renderRes.on('end', () => {
      if (renderRes.statusCode >= 200 && renderRes.statusCode < 300) {
        return res.json({ message: '🚀 Đã gửi lệnh Restart Web Online thành công! Render sẽ cập nhật trang web sau 30-60 giây.' });
      } else {
        return res.status(500).json({ message: `Lỗi từ Render (${renderRes.statusCode}): ${body}` });
      }
    });
  });

  clientReq.on('error', (err) => {
    return res.status(500).json({ message: 'Không thể kết nối tới Render: ' + err.message });
  });

  clientReq.end();
});

module.exports = router;
