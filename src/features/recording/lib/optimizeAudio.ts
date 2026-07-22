/**
 * Client-side audio optimization for recording uploads.
 *
 * The backend transcodes every upload to 16 kHz mono 16-bit PCM WAV before
 * sending it to Deepgram — that is the speech-model's target format, and audio
 * above it (higher sample rate, stereo, video streams) carries no extra STT
 * signal. So we can safely down-convert in the browser to that exact format,
 * cutting upload bandwidth with **no transcription-quality loss**.
 *
 * Strategy (dependency-free, uses the native Web Audio API):
 *   decode straight into a 16 kHz AudioContext (decodeAudioData resamples to the
 *   context rate in one pass) → downmix to mono → encode 16-bit WAV. Engines that
 *   reject a 16 kHz context fall back to a default-rate decode + OfflineAudioContext
 *   resample.
 *
 * Safeguards:
 *   - Files larger than MAX_DECODE_BYTES are passed through untouched — decoding
 *     into PCM would risk an out-of-memory crash on very large inputs.
 *   - The converted file is only used when it is actually SMALLER than the
 *     original; an already-compact low-bitrate MP3 (smaller than 16 kHz WAV) is
 *     uploaded as-is, so we never make an upload bigger.
 *   - Any decode/render failure falls back to the original file — optimization
 *     is best-effort and must never block a valid upload.
 */

/** Deepgram/back-end target: 16 kHz mono matches transcriber._convert_to_wav. */
const TARGET_SAMPLE_RATE = 16000;

/**
 * Hard ceiling on what the server will accept — mirrors the backend's
 * RequestSizeLimitMiddleware (500 MB). The upload must be rejected on the client
 * when the (optimized) file still exceeds this, so the user gets an instant,
 * actionable error instead of a 413 after a long upload.
 */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Upper bound on inputs we attempt to decode. decodeAudioData expands the whole
 * file into float PCM in memory (roughly sampleRate × channels × 4 bytes ×
 * duration), so we cap the source size to avoid OOM on huge uploads — those are
 * still allowed, just uploaded without client-side optimization.
 */
const MAX_DECODE_BYTES = 300 * 1024 * 1024; // 300 MB

export interface OptimizeProgress {
  stage: string;
  percent: number | null;
}

export type ProgressCb = (progress: OptimizeProgress) => void;

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

export interface OptimizeResult {
  /** The file to upload — the optimized WAV, or the original when skipped. */
  file: File;
  /** True when the returned file is a smaller, converted version. */
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
  /**
   * Media duration in whole seconds, when it could be decoded. Undefined for
   * pass-through uploads (too large / decode failed) — duration is best-effort.
   */
  durationSeconds?: number;
}

type AudioContextCtor = typeof AudioContext;
type OfflineAudioContextCtor = typeof OfflineAudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ||
    null
  );
}

function getOfflineAudioContextCtor(): OfflineAudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: OfflineAudioContextCtor })
      .webkitOfflineAudioContext ||
    null
  );
}

/**
 * Downmix an AudioBuffer to a single mono Float32 channel. A mono buffer is
 * returned as-is (no copy); multi-channel audio is averaged across channels.
 */
function toMonoSamples(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  for (let i = 0; i < length; i++) mono[i] /= channels;
  return mono;
}

/**
 * Encode mono Float32 samples as a 16-bit PCM WAV file (RIFF/WAVE).
 *
 * The PCM conversion loop can run tens of millions of iterations for a long
 * recording, which would freeze the UI thread if done in one go. We process it
 * in chunks, yielding to the browser between chunks so the page keeps painting
 * and reporting real progress (0–100%).
 */
async function encodeWav16Mono(
  samples: Float32Array,
  sampleRate: number,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;

  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  // fmt chunk (PCM)
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const total = samples.length;
  const CHUNK = 1 << 20; // ~1M samples (~2 MB written) between UI yields
  for (let start = 0; start < total; start += CHUNK) {
    const end = Math.min(start + CHUNK, total);
    let offset = 44 + start * bytesPerSample;
    for (let i = start; i < end; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    onProgress?.(Math.round((end / total) * 100));
    if (end < total) await yieldToBrowser();
  }
  return out;
}

/**
 * Convert an audio/video file to a 16 kHz mono WAV suitable for STT, returning
 * the smaller of the converted file and the original. Never throws — on any
 * failure it returns the original file unchanged.
 */
export async function optimizeAudioForUpload(
  input: File,
  onProgress?: ProgressCb,
): Promise<OptimizeResult> {
  const passthrough = (): OptimizeResult => ({
    file: input,
    optimized: false,
    originalBytes: input.size,
    outputBytes: input.size,
  });

  const AudioCtx = getAudioContextCtor();
  const OfflineCtx = getOfflineAudioContextCtor();
  if (!AudioCtx || !OfflineCtx || input.size > MAX_DECODE_BYTES) {
    return passthrough();
  }

  let decodeCtx: AudioContext | null = null;
  try {
    onProgress?.({ stage: "Reading file…", percent: null });
    const arrayBuffer = await input.arrayBuffer();

    onProgress?.({ stage: "Decoding audio…", percent: null });
    // Decode directly at the STT target rate: decodeAudioData resamples to the
    // context's sampleRate, so a 16 kHz context yields 16 kHz PCM in one pass —
    // no separate OfflineAudioContext render needed. Some engines reject an
    // uncommon rate at construction; fall back to a default-rate decode +
    // offline resample in that case.
    try {
      decodeCtx = new AudioCtx({ sampleRate: TARGET_SAMPLE_RATE });
    } catch {
      decodeCtx = new AudioCtx();
    }
    // decodeAudioData detaches the buffer, so pass a copy.
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));

    onProgress?.({ stage: "Optimizing for speech…", percent: null });
    let samples: Float32Array;
    if (decoded.sampleRate === TARGET_SAMPLE_RATE) {
      // Already at target rate — just downmix to mono.
      samples = toMonoSamples(decoded);
    } else {
      // Context couldn't decode at 16 kHz; resample + downmix offline.
      const frameCount = Math.max(
        1,
        Math.ceil(decoded.duration * TARGET_SAMPLE_RATE),
      );
      const offline = new OfflineCtx(1, frameCount, TARGET_SAMPLE_RATE);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start(0);
      const rendered = await offline.startRendering();
      samples = rendered.getChannelData(0);
    }

    // Capture the media length now that we have decoded PCM — best-effort metadata.
    const durationSeconds = Number.isFinite(decoded.duration)
      ? Math.round(decoded.duration)
      : undefined;

    const wav = await encodeWav16Mono(samples, TARGET_SAMPLE_RATE, (percent) =>
      onProgress?.({ stage: "Encoding audio…", percent }),
    );

    // Only adopt the conversion when it genuinely reduces bandwidth.
    if (wav.byteLength >= input.size) {
      return { ...passthrough(), durationSeconds };
    }

    const baseName = input.name.replace(/\.[^./\\]+$/, "") || "recording";
    const file = new File([wav], `${baseName}.wav`, { type: "audio/wav" });
    return {
      file,
      optimized: true,
      originalBytes: input.size,
      outputBytes: file.size,
      durationSeconds,
    };
  } catch {
    // Unsupported/corrupt container, OOM, etc. — upload the original untouched.
    return passthrough();
  } finally {
    // AudioContext.close returns a promise; ignore it (best-effort cleanup).
    void decodeCtx?.close?.();
  }
}
