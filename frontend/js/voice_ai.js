/**
 * AI Voice Studio Frontend Logic
 * Giọng đọc AI NSƯT Lê Chức (VieNeu-TTS Turbo)
 */

let sampleAudio = null;
let isSamplePlaying = false;

// 1. Cập nhật số ký tự
function updateVoiceTextCount() {
  const textarea = document.getElementById('voice-text-input');
  const countEl = document.getElementById('voice-char-count');
  const clearBtn = document.getElementById('btn-clear-voice-text');
  if (!textarea || !countEl) return;

  const len = textarea.value.length;
  countEl.innerText = len;

  if (clearBtn) {
    clearBtn.style.display = len > 0 ? 'flex' : 'none';
  }

  if (len > 1400) {
    countEl.parentElement.className = 'text-counter limit-max';
  } else if (len > 1000) {
    countEl.parentElement.className = 'text-counter limit-near';
  } else {
    countEl.parentElement.className = 'text-counter';
  }
}

// 2. Xóa nội dung
function clearVoiceText() {
  const textarea = document.getElementById('voice-text-input');
  if (textarea) {
    textarea.value = '';
    textarea.focus();
    updateVoiceTextCount();
  }
}

// 3. Chèn thẻ cảm xúc
function insertEmotionTag(tag) {
  const textarea = document.getElementById('voice-text-input');
  if (!textarea) return;

  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  const text = textarea.value;

  // Thêm khoảng trắng tự nhiên
  const prefix = (start > 0 && text[start - 1] !== ' ') ? ' ' : '';
  const suffix = (end < text.length && text[end] !== ' ') ? ' ' : '';
  const insertText = prefix + tag + suffix;

  textarea.value = text.substring(0, start) + insertText + text.substring(end);
  const newPos = start + insertText.length;
  textarea.setSelectionRange(newPos, newPos);
  textarea.focus();
  updateVoiceTextCount();
}

// 4. Cập nhật hiển thị tốc độ
function updateVoiceSpeedLabel(val) {
  const label = document.getElementById('voice-speed-val');
  if (!label) return;
  const num = parseFloat(val);
  let desc = 'Bình thường';
  if (num <= 0.8) desc = 'Chậm, sâu lắng';
  else if (num < 1.0) desc = 'Hơi chậm';
  else if (num > 1.1) desc = 'Nhanh';
  else if (num > 1.0) desc = 'Hơi nhanh';
  label.innerText = `${num.toFixed(1)}x (${desc})`;
}

// 5. Nghe thử giọng mẫu NSƯT Lê Chức
function toggleVoiceSample() {
  const btn = document.getElementById('btn-play-voice-sample');
  if (!btn) return;

  if (isSamplePlaying && sampleAudio) {
    sampleAudio.pause();
    sampleAudio.currentTime = 0;
    isSamplePlaying = false;
    btn.classList.remove('playing');
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Nghe giọng mẫu</span>';
    return;
  }

  if (!sampleAudio) {
    sampleAudio = new Audio('/api/voice/sample');
    sampleAudio.onended = () => {
      isSamplePlaying = false;
      btn.classList.remove('playing');
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Nghe giọng mẫu</span>';
    };
    sampleAudio.onerror = () => {
      isSamplePlaying = false;
      btn.classList.remove('playing');
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Nghe giọng mẫu</span>';
      if (typeof showToast === 'function') {
        showToast('Đang tải giọng đọc mẫu, vui lòng thử lại sau vài giây!', 'info');
      }
    };
  }

  sampleAudio.play().then(() => {
    isSamplePlaying = true;
    btn.classList.add('playing');
    btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> <span>Dừng nghe mẫu</span>';
  }).catch(err => {
    console.error('Play sample error:', err);
    if (typeof showToast === 'function') {
      showToast('Không thể phát file giọng mẫu.', 'error');
    }
  });
}

// 6. Tổng hợp giọng nói từ văn bản
async function synthesizeSpeech() {
  const textarea = document.getElementById('voice-text-input');
  const text = (textarea ? textarea.value : '').trim();
  const speedSlider = document.getElementById('voice-speed-slider');
  const speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;

  if (!text) {
    if (typeof showToast === 'function') {
      showToast('Vui lòng nhập nội dung văn bản cần đọc!', 'warning');
    } else {
      alert('Vui lòng nhập nội dung văn bản cần đọc!');
    }
    if (textarea) textarea.focus();
    return;
  }

  if (text.length > 1500) {
    if (typeof showToast === 'function') {
      showToast('Nội dung tối đa 1500 ký tự cho mỗi lần đọc!', 'warning');
    }
    return;
  }

  // Dừng mẫu nếu đang phát
  if (isSamplePlaying && sampleAudio) {
    sampleAudio.pause();
    isSamplePlaying = false;
  }

  const btn = document.getElementById('btn-synthesize-voice');
  const loading = document.getElementById('voice-loading-state');
  const loadingText = document.getElementById('voice-loading-text');
  const resultCard = document.getElementById('voice-result-card');
  const audioEl = document.getElementById('voice-audio-element');
  const downloadBtn = document.getElementById('btn-download-voice-mp3');
  const durationEl = document.getElementById('voice-result-duration');

  if (btn) btn.disabled = true;
  if (loading) loading.style.display = 'flex';
  if (resultCard) resultCard.style.display = 'none';

  if (loadingText) {
    loadingText.innerText = 'Đang kích hoạt AI và tổng hợp giọng đọc NSƯT Lê Chức...';
  }

  try {
    const res = await fetch('/api/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Không thể tạo giọng nói. Vui lòng kiểm tra lại dịch vụ AI.');
    }

    // Hiển thị kết quả
    if (loading) loading.style.display = 'none';
    if (btn) btn.disabled = false;

    if (resultCard && audioEl) {
      let audioUrl = data.audio_url ? (data.audio_url + '?t=' + Date.now()) : '';
      if (data.audio_base64) {
        audioUrl = 'data:audio/mp3;base64,' + data.audio_base64;
      }
      audioEl.src = audioUrl;
      if (downloadBtn) {
        downloadBtn.href = audioUrl;
        downloadBtn.download = `Le_Chuc_AI_${Date.now()}.mp3`;
      }
      if (durationEl && data.duration) {
        durationEl.innerText = `${data.duration.toFixed(1)}s`;
      }

      resultCard.style.display = 'flex';
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Tự động phát âm thanh vừa sinh
      audioEl.play().catch(e => console.log('Autoplay prevented:', e));

      // Lưu lịch sử
      saveToVoiceHistory({
        id: Date.now(),
        text: text,
        audio_url: audioUrl,
        duration: data.duration || 0,
        created_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }

    if (typeof showToast === 'function') {
      showToast('Đã tạo giọng đọc AI thành công!', 'success');
    }

  } catch (err) {
    console.error('Synthesis error:', err);
    if (loading) loading.style.display = 'none';
    if (btn) btn.disabled = false;
    if (typeof showToast === 'function') {
      showToast(err.message || 'Lỗi xử lý tạo giọng nói!', 'error');
    } else {
      alert(err.message || 'Lỗi xử lý tạo giọng nói!');
    }
  }
}

// 7. Sao chép kịch bản vừa đọc
function copyVoiceScript() {
  const textarea = document.getElementById('voice-text-input');
  if (!textarea || !textarea.value) return;

  navigator.clipboard.writeText(textarea.value).then(() => {
    if (typeof showToast === 'function') {
      showToast('Đã sao chép văn bản vào bộ nhớ tạm!', 'success');
    }
  }).catch(() => {
    if (typeof showToast === 'function') {
      showToast('Không thể sao chép văn bản.', 'error');
    }
  });
}

// 8. Quản lý lịch sử tạo giọng trong LocalStorage
function saveToVoiceHistory(item) {
  try {
    let history = JSON.parse(localStorage.getItem('tpbd_voice_history') || '[]');
    history.unshift(item);
    if (history.length > 8) history = history.slice(0, 8); // Giữ tối đa 8 bản gần nhất
    localStorage.setItem('tpbd_voice_history', JSON.stringify(history));
    renderVoiceHistory();
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function renderVoiceHistory() {
  const card = document.getElementById('voice-history-card');
  const list = document.getElementById('voice-history-list');
  if (!card || !list) return;

  try {
    const history = JSON.parse(localStorage.getItem('tpbd_voice_history') || '[]');
    if (history.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'flex';
    list.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-item-content">
          <div class="history-item-text" title="${escapeHtmlVoice(item.text)}">${escapeHtmlVoice(item.text)}</div>
          <div class="history-item-meta">
            <span><i class="fa-regular fa-clock"></i> ${item.created_at || ''}</span>
            <span>•</span>
            <span><i class="fa-solid fa-waveform"></i> ${item.duration ? item.duration.toFixed(1) + 's' : ''}</span>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn-history-play" title="Phát lại" onclick="playHistoryAudio('${item.audio_url}')">
            <i class="fa-solid fa-play"></i>
          </button>
          <a class="btn-history-dl" title="Tải MP3" href="${item.audio_url}" download="Le_Chuc_${item.id}.mp3">
            <i class="fa-solid fa-download"></i>
          </a>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Render history error:', e);
  }
}

function playHistoryAudio(url) {
  const audioEl = document.getElementById('voice-audio-element');
  const resultCard = document.getElementById('voice-result-card');
  if (audioEl) {
    audioEl.src = url;
    if (resultCard) resultCard.style.display = 'flex';
    audioEl.play().catch(e => console.log(e));
  }
}

function clearVoiceHistory() {
  localStorage.removeItem('tpbd_voice_history');
  renderVoiceHistory();
  if (typeof showToast === 'function') {
    showToast('Đã xóa sạch lịch sử giọng đọc!', 'info');
  }
}

function escapeHtmlVoice(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  renderVoiceHistory();
  updateVoiceTextCount();
});
