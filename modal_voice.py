"""
Modal Serverless AI Voice Service for TPBD
Runs VieNeu-TTS v3 Turbo with Nvidia T4 GPU on the cloud 24/7.
"""

import os
import modal

app = modal.App("tpbd-voice-ai")

# Xây dựng môi trường container trên đám mây Modal với GPU
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "vieneu",
        "soundfile",
        "librosa",
        "lameenc",
        "numpy",
        "fastapi",
        "pydantic"
    )
    .add_local_file(
        r"E:\Music_Made\dongnoi\voices\NSUT_Le_Chuc.wav",
        "/root/NSUT_Le_Chuc.wav"
    )
)


@app.cls(image=image, cpu=2.0, memory=4096, scaledown_window=300, timeout=180)
class VoiceService:
    @modal.enter()
    def load_model(self):
        print("[Modal Cloud] Dang nap mo hinh VieNeu-TTS v3 Turbo vao bo nho CPU...")
        from vieneu import Vieneu
        self.model = Vieneu(mode="v3turbo")
        self.ref_audio = "/root/NSUT_Le_Chuc.wav"
        # Pre-warm
        try:
            _ = self.model.infer("Xin chào", ref_audio=self.ref_audio, denoise=True)
            print("[Modal Cloud] Pre-warm hoan tat! San sang phuc vu 24/24.")
        except Exception as e:
            print(f"[Modal Cloud] Pre-warm warning: {e}")

    @modal.fastapi_endpoint(method="GET")
    def health(self):
        return {
            "status": "healthy",
            "compute": "Modal Cloud (Serverless CPU 2.0 / 4GB RAM)",
            "model": "VieNeu-TTS v3 Turbo",
            "voice": "NSUT_Le_Chuc"
        }

    @modal.fastapi_endpoint(method="GET")
    def sample(self):
        import base64
        if os.path.exists(self.ref_audio):
            with open(self.ref_audio, "rb") as f:
                data = f.read()
            return {
                "success": True,
                "audio_base64": base64.b64encode(data).decode("ascii"),
                "format": "wav"
            }
        return {"success": False, "message": "Sample audio not found"}

    @modal.fastapi_endpoint(method="POST")
    def synthesize(self, item: dict):
        import re
        import base64
        import numpy as np
        import librosa
        import lameenc

        text = item.get("text", "").strip()
        speed = float(item.get("speed", 1.0))

        if not text:
            return {"success": False, "message": "Vui long nhap van ban can doc."}

        # Chia nhỏ các câu tự nhiên
        parts = re.split(r'([.!?;\n]+)', text)
        chunks = []
        curr = ""
        for p in parts:
            if not p:
                continue
            if len(curr) + len(p) <= 150:
                curr += p
            else:
                if curr.strip():
                    chunks.append(curr.strip())
                curr = p
        if curr.strip():
            chunks.append(curr.strip())
        if not chunks:
            chunks = [text]

        sample_rate = 48000
        pause = np.zeros(int(sample_rate * 0.15), dtype=np.float32)
        generated = []

        for ch in chunks:
            if not ch.strip():
                continue
            out = self.model.infer(ch, ref_audio=self.ref_audio, denoise=True)
            if not isinstance(out, np.ndarray):
                out = np.array(out, dtype=np.float32)
            else:
                out = out.astype(np.float32)
            generated.append(out)
            generated.append(pause)

        if not generated:
            return {"success": False, "message": "Khong the tao am thanh."}

        full_audio = np.concatenate(generated)

        # Dieu chinh toc do neu can
        if abs(speed - 1.0) > 0.05:
            full_audio = librosa.effects.time_stretch(full_audio, rate=speed)

        duration = len(full_audio) / sample_rate

        # Ma hoa MP3 chat luong cao 192kbps
        scaled = np.clip(full_audio, -1.0, 1.0)
        int16_data = (scaled * 32767.0).astype(np.int16)
        raw_bytes = int16_data.tobytes()

        encoder = lameenc.Encoder()
        encoder.set_bit_rate(192)
        encoder.set_in_sample_rate(sample_rate)
        encoder.set_channels(1)
        encoder.set_quality(2)

        mp3_bytes = encoder.encode(raw_bytes) + encoder.flush()
        b64_audio = base64.b64encode(mp3_bytes).decode("ascii")

        return {
            "success": True,
            "message": "Đã tạo giọng nói thành công!",
            "audio_base64": b64_audio,
            "duration": round(duration, 2),
            "voice": "NSƯT Lê Chức"
        }
