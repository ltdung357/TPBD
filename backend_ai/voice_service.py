"""
AI Voice Service for TPBD Website
Backend FastAPI microservice serving VieNeu-TTS v3 Turbo with NSƯT Lê Chức voice profile.
Port: 5055
"""

import os
import sys
import re
import time
import uuid
import logging
import warnings

# Đảm bảo stdout / stderr luôn dùng UTF-8 trên Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import numpy as np
import soundfile as sf
import librosa
import lameenc

# Tắt cảnh báo Hugging Face Hub không cần thiết
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
warnings.filterwarnings("ignore", message=".*unauthenticated requests.*")
warnings.filterwarnings("ignore", category=UserWarning, module="huggingface_hub.*")
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Cấu hình đường dẫn
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
UPLOADS_VOICE_DIR = os.path.join(PROJECT_ROOT, "frontend", "uploads", "voice_ai")
os.makedirs(UPLOADS_VOICE_DIR, exist_ok=True)

# Đường dẫn giọng NSƯT Lê Chức mặc định
DEFAULT_VOICE_PATH = r"E:\Music_Made\dongnoi\voices\NSUT_Le_Chuc.wav"
LOCAL_VOICE_PATH = os.path.join(BASE_DIR, "voices", "NSUT_Le_Chuc.wav")

app = FastAPI(title="TPBD AI Voice Service", version="1.0")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import threading

model = None
is_model_ready = False
model_lock = threading.Lock()


def get_reference_voice_path() -> str:
    """Trả về đường dẫn file giọng NSƯT Lê Chức."""
    if os.path.exists(DEFAULT_VOICE_PATH):
        return DEFAULT_VOICE_PATH
    if os.path.exists(LOCAL_VOICE_PATH):
        return LOCAL_VOICE_PATH
    raise FileNotFoundError(f"Không tìm thấy file giọng NSUT_Le_Chuc.wav tại: {DEFAULT_VOICE_PATH}")


def load_ai_model():
    """Khởi tạo và nạp mô hình VieNeu-TTS vào GPU/VRAM."""
    global model, is_model_ready
    with model_lock:
        if model is not None:
            return model

        print("[AI Voice Service] Dang nap mo hinh VieNeu-TTS v3 Turbo...", flush=True)
        from vieneu import Vieneu

        try:
            model = Vieneu(mode="v3turbo")
            is_model_ready = True
            print("[AI Voice Service] Da nap mo hinh VieNeu-TTS v3 Turbo thanh cong!", flush=True)
        except Exception as e:
            print(f"[AI Voice Service] Chuyen sang ONNX fallback: {e}", flush=True)
            model = Vieneu(mode="v3turbo", backend="onnx")
            is_model_ready = True
            print("[AI Voice Service] Da nap mo hinh VieNeu-TTS v3 Turbo (ONNX) thanh cong!", flush=True)

        # Pre-warm mô hình với một từ ngắn để sẵn sàng phục vụ
        try:
            ref_path = get_reference_voice_path()
            print(f"[AI Voice Service] Dang pre-warm voi giong NSUT Le Chuc: {ref_path}", flush=True)
            _ = model.infer("Xin chào", ref_audio=ref_path, denoise=True)
            print("[AI Voice Service] Pre-warm hoan tat! San sang phuc vu.", flush=True)
        except Exception as e:
            print(f"[AI Voice Service] Pre-warm warning: {e}", flush=True)

        return model


@app.on_event("startup")
def startup_event():
    """Khởi động tiến trình nạp model ngầm để server mở port 5055 ngay lập tức."""
    print("[AI Voice Service] Server dang khoi dong tren port 5055...", flush=True)
    t = threading.Thread(target=load_ai_model, daemon=True)
    t.start()


class SynthesizeRequest(BaseModel):
    text: str
    speed: float = 1.0


def split_text_chunks(text: str, max_chars: int = 150) -> list[str]:
    """Chia nhỏ văn bản thành các câu tự nhiên để mô hình sinh giọng tốt nhất."""
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    parts = re.split(r'([.!?;\n]+)', text)
    chunks = []
    curr = ""
    for p in parts:
        if not p:
            continue
        if len(curr) + len(p) <= max_chars:
            curr += p
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = p
    if curr.strip():
        chunks.append(curr.strip())

    return chunks if chunks else [text]


def wav_to_mp3(wav_path: str, mp3_path: str, bitrate: int = 192):
    """Mã hóa file WAV sang MP3 bằng lameenc."""
    data, sample_rate = sf.read(wav_path, dtype="int16")
    if data.ndim == 1:
        channels = 1
        raw_bytes = data.tobytes()
    else:
        channels = data.shape[1]
        raw_bytes = data.tobytes()

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(channels)
    encoder.set_quality(2)

    mp3_data = encoder.encode(raw_bytes)
    mp3_data += encoder.flush()

    with open(mp3_path, "wb") as f:
        f.write(mp3_data)


def cleanup_old_files(max_age_hours: int = 24):
    """Dọn dẹp các file audio cũ trong uploads/voice_ai."""
    now = time.time()
    for fname in os.listdir(UPLOADS_VOICE_DIR):
        fpath = os.path.join(UPLOADS_VOICE_DIR, fname)
        if os.path.isfile(fpath) and fname.startswith("speech_") and fname.endswith(".mp3"):
            if now - os.path.getmtime(fpath) > max_age_hours * 3600:
                try:
                    os.remove(fpath)
                except Exception:
                    pass


@app.get("/health")
def health_check():
    """Kiểm tra tình trạng hoạt động của service."""
    ref_exists = False
    ref_path = ""
    try:
        ref_path = get_reference_voice_path()
        ref_exists = os.path.exists(ref_path)
    except Exception:
        pass

    return {
        "status": "healthy" if is_model_ready else "loading",
        "model_ready": is_model_ready,
        "default_voice": "NSUT_Le_Chuc",
        "voice_file_exists": ref_exists,
        "voice_path": ref_path,
        "port": 5055
    }


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    """Sinh giọng nói AI từ văn bản sử dụng giọng NSƯT Lê Chức."""
    text = req.text.strip()
    speed = float(req.speed)

    if not text:
        raise HTTPException(status_code=400, detail="Vui lòng nhập nội dung văn bản.")

    if len(text) > 1500:
        raise HTTPException(status_code=400, detail="Văn bản không được vượt quá 1500 ký tự.")

    # Đảm bảo model đã sẵn sàng
    ai_model = load_ai_model()
    ref_path = get_reference_voice_path()

    try:
        chunks = split_text_chunks(text)
        sample_rate = 48000
        pause_samples = np.zeros(int(sample_rate * 0.15), dtype=np.float32)
        generated_audios = []

        for chunk in chunks:
            if not chunk.strip():
                continue
            audio_out = ai_model.infer(chunk, ref_audio=ref_path, denoise=True)
            if not isinstance(audio_out, np.ndarray):
                audio_out = np.array(audio_out, dtype=np.float32)
            else:
                audio_out = audio_out.astype(np.float32)
            generated_audios.append(audio_out)
            generated_audios.append(pause_samples)

        if not generated_audios:
            raise RuntimeError("Không sinh được âm thanh.")

        full_audio = np.concatenate(generated_audios)

        # Điều chỉnh tốc độ nếu khác 1.0
        if abs(speed - 1.0) > 0.05:
            full_audio = librosa.effects.time_stretch(full_audio, rate=speed)

        # Lưu WAV tạm thời
        file_id = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
        temp_wav = os.path.join(UPLOADS_VOICE_DIR, f"temp_{file_id}.wav")
        output_mp3 = os.path.join(UPLOADS_VOICE_DIR, f"speech_{file_id}.mp3")

        sf.write(temp_wav, full_audio, sample_rate, subtype="PCM_16")

        # Chuyển đổi sang MP3 tốc độ cao
        wav_to_mp3(temp_wav, output_mp3, bitrate=192)

        # Xóa file WAV tạm
        try:
            os.remove(temp_wav)
        except Exception:
            pass

        duration = len(full_audio) / sample_rate

        # Dọn dẹp ngầm file cũ
        try:
            cleanup_old_files()
        except Exception:
            pass

        return {
            "success": True,
            "message": "Đã tạo giọng nói thành công!",
            "audio_url": f"/uploads/voice_ai/speech_{file_id}.mp3",
            "duration": round(duration, 2),
            "voice": "NSƯT Lê Chức"
        }

    except Exception as e:
        print(f"[Synthesis Error] {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi sinh giọng nói AI: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("voice_service:app", host="127.0.0.1", port=5055, reload=False, workers=1)
