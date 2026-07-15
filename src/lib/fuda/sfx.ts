/**
 * 効果音（WebAudio シンセサイズ、音声アセット不要）
 *
 * 【注意】lib/fuda で唯一の副作用モジュール。reducer からは絶対に呼ばず、
 * 演出層（ScoringDisplay・画面遷移 effect・ボタンハンドラ）だけが呼ぶ。
 * AudioContext は自動再生ポリシーのため、ユーザー操作起点で ensureAudio() を
 * 冪等に呼んで生成・resume する。
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

const MASTER_GAIN = 0.16;

export function ensureAudio(): void {
  if (typeof window === "undefined") return;
  if (ctx === null) {
    if (typeof window.AudioContext === "undefined") return;
    ctx = new window.AudioContext();
    master = ctx.createGain();
    master.gain.value = enabled ? MASTER_GAIN : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (master) master.gain.value = on ? MASTER_GAIN : 0;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

interface ToneOptions {
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  delay?: number;
  /** 終端周波数（指定時はスライドする） */
  slideTo?: number;
}

function tone(freq: number, options: ToneOptions = {}): void {
  if (!ctx || !master || !enabled) return;
  const { type = "triangle", dur = 0.08, gain = 1, delay = 0, slideTo } = options;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(options: { dur?: number; gain?: number; delay?: number; freq?: number } = {}): void {
  if (!ctx || !master || !enabled) return;
  const { dur = 0.15, gain = 0.5, delay = 0, freq = 2200 } = options;
  const t0 = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

/** 属性ごとの基音（ビルドの軸が耳でも分かるように） */
const ATTR_FREQ: Record<string, number> = {
  seion: 523,
  shifted: 587,
  dakuten: 466,
  handakuten: 699,
  kogaki: 784,
  combo: 880,
};

/**
 * かな確定音。連続正解でピッチが上がるラダー（Balatro のスコアリング音と同じ快感原理）。
 */
export function playUnit(attr: string, streak: number, delay = 0): void {
  const base = ATTR_FREQ[attr] ?? 523;
  const freq = base * Math.pow(2, Math.min(streak, 20) / 24);
  tone(freq, { type: "triangle", dur: 0.055, gain: 0.55, delay });
}

export function playMiss(delay = 0): void {
  tone(130, { type: "square", dur: 0.13, gain: 0.4, delay, slideTo: 80 });
}

export function playYaku(delay = 0): void {
  tone(659, { dur: 0.07, gain: 0.5, delay });
  tone(831, { dur: 0.07, gain: 0.5, delay: delay + 0.055 });
  tone(988, { dur: 0.1, gain: 0.55, delay: delay + 0.11 });
}

export function playCharm(delay = 0): void {
  tone(1175, { type: "sine", dur: 0.05, gain: 0.4, delay });
}

export function playWordScore(delay = 0): void {
  tone(523, { dur: 0.09, gain: 0.5, delay });
  tone(784, { dur: 0.14, gain: 0.5, delay: delay + 0.05 });
  noise({ dur: 0.12, gain: 0.12, delay: delay + 0.03, freq: 3600 });
}

export function playMoney(delay = 0): void {
  tone(1319, { type: "sine", dur: 0.05, gain: 0.45, delay });
  tone(1760, { type: "sine", dur: 0.08, gain: 0.45, delay: delay + 0.06 });
}

export function playGlassBreak(delay = 0): void {
  noise({ dur: 0.3, gain: 0.5, delay, freq: 4200 });
  tone(880, { type: "sawtooth", dur: 0.25, gain: 0.25, delay, slideTo: 220 });
}

export function playRoundWin(delay = 0): void {
  tone(523, { dur: 0.12, gain: 0.5, delay });
  tone(659, { dur: 0.12, gain: 0.5, delay: delay + 0.11 });
  tone(784, { dur: 0.2, gain: 0.55, delay: delay + 0.22 });
  tone(1047, { dur: 0.3, gain: 0.5, delay: delay + 0.33 });
}

export function playFail(delay = 0): void {
  tone(392, { type: "sawtooth", dur: 0.25, gain: 0.35, delay, slideTo: 262 });
  tone(262, { type: "sawtooth", dur: 0.4, gain: 0.35, delay: delay + 0.22, slideTo: 175 });
}
