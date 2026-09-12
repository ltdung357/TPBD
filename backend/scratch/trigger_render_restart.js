const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '..', '..', '.env');
let deployHook = process.env.RENDER_DEPLOY_HOOK;

if (!deployHook && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/RENDER_DEPLOY_HOOK=(.+)/);
  if (match) deployHook = match[1].trim();
}

if (!deployHook) {
  console.log('⚠️ CHƯA CẤU HÌNH DEPLOY HOOK CỦA RENDER!');
  console.log('👉 Hướng dẫn lấy URL Deploy Hook (chỉ làm 1 lần):');
  console.log('   1. Truy cập https://dashboard.render.com -> chọn Web Service "tpbd-thuyha"');
  console.log('   2. Vào mục "Settings" -> cuộn xuống tìm "Deploy Hook"');
  console.log('   3. Coppy đường dẫn dạng: https://api.render.com/deploy/srv-xxxxx?key=yyyyy');
  console.log('   4. Thêm dòng sau vào tệp .env:');
  console.log('      RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxxxx?key=yyyyy\n');
  process.exit(1);
}

console.log('🚀 Đang gửi yêu cầu Restart / Re-deploy tới Render.com...');

const req = https.request(deployHook, { method: 'POST' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ RESTART THÀNH CÔNG! Render đang khởi động lại web online (mất 30-60s).');
    } else {
      console.log(`❌ Lỗi từ Render (${res.statusCode}): ${data}`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Lỗi kết nối tới Render:', err.message);
});

req.end();
