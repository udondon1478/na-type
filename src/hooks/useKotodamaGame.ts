"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getWaveConfig,
  sampleWord,
  rollEnemySpeed,
  kanaScore,
  killBonus,
  waveClearBonus,
  matchChordToEnemies,
  type ChordCandidate,
} from "@/lib/game/engine";
import { effects, rollUpgradeOptions } from "@/lib/game/upgrades";
import { resolveKeyToKana } from "@/lib/resolve-key-to-kana";
import { updateGameRecord } from "@/lib/storage";
import type {
  Enemy,
  GamePhase,
  GameSnapshot,
  UpgradeId,
  UpgradeStacks,
} from "@/types/game";

/**
 * physical モードの同時打鍵確定を保留する時間（ミリ秒）。
 * useTypingSession の DEFAULT_CHORD_SETTLE_MS と同じ意味（じ→じゃ 等の拡張待ち）。
 */
const CHORD_SETTLE_MS = 50;

const INITIAL_HP = 5;
const MAX_HP = 10;
const UPGRADE_CHOICES = 3;

/** ゲームの内部状態（rAFループ・入力ハンドラから直接ミューテートする） */
interface Sim {
  phase: GamePhase;
  paused: boolean;
  level: number;
  wordPool: string[];
  wave: number;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  kanaTyped: number;
  missCount: number;
  enemies: Enemy[];
  lockedId: number | null;
  upgradeOptions: UpgradeId[];
  stacks: UpgradeStacks;
  shieldCharges: number;
  /** performance.now() 基準。これ未満の間は敵が停止 */
  freezeUntil: number;
  toSpawn: number;
  lastSpawnAt: number;
  bombGauge: number;
  nextId: number;
  isNewRecord: boolean;
}

function createInitialSim(): Sim {
  return {
    phase: "menu",
    paused: false,
    level: 8,
    wordPool: [],
    wave: 1,
    hp: INITIAL_HP,
    maxHp: MAX_HP,
    score: 0,
    combo: 0,
    maxCombo: 0,
    kanaTyped: 0,
    missCount: 0,
    enemies: [],
    lockedId: null,
    upgradeOptions: [],
    stacks: {},
    shieldCharges: 0,
    freezeUntil: 0,
    toSpawn: 0,
    lastSpawnAt: 0,
    bombGauge: 0,
    nextId: 1,
    isNewRecord: false,
  };
}

function toSnapshot(sim: Sim, now: number): GameSnapshot {
  return {
    phase: sim.phase,
    paused: sim.paused,
    wave: sim.wave,
    hp: sim.hp,
    maxHp: sim.maxHp,
    score: sim.score,
    combo: sim.combo,
    maxCombo: sim.maxCombo,
    kanaTyped: sim.kanaTyped,
    missCount: sim.missCount,
    enemies: sim.enemies.map((e) => ({ ...e })),
    lockedId: sim.lockedId,
    upgradeOptions: [...sim.upgradeOptions],
    stacks: { ...sim.stacks },
    shieldCharges: sim.shieldCharges,
    freezeRemainingMs: Math.max(0, sim.freezeUntil - now),
    toSpawn: sim.toSpawn,
    bombGauge: sim.bombGauge,
    isNewRecord: sim.isNewRecord,
  };
}

export function useKotodamaGame() {
  // useRef(createInitialSim()) だと react-hooks/immutability が「hookの引数」への
  // 変更として simRef 内部のミューテートを拒否するため、遅延初期化にする
  const simRef = useRef<Sim | null>(null);
  const getSim = useCallback((): Sim => {
    if (simRef.current === null) simRef.current = createInitialSim();
    return simRef.current;
  }, []);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    toSnapshot(createInitialSim(), 0)
  );

  // physical モードの同時打鍵（chord）判定用。useTypingSession と同じ構造だが、
  // 目標が「単一のテキスト」ではなく「複数の敵の単語」になる点だけが異なる。
  const pressedRef = useRef<Set<string>>(new Set());
  const clusterRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<{ enemyId: number; kana: string } | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    setSnapshot(toSnapshot(getSim(), performance.now()));
  }, [getSim]);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const resetChordState = useCallback(() => {
    clearSettleTimer();
    pressedRef.current = new Set();
    clusterRef.current = new Set();
  }, [clearSettleTimer]);

  // ── ゲーム内イベント（simRef をミューテートし、呼び出し側で sync する） ──

  const startWave = useCallback((now: number) => {
    const sim = getSim();
    const config = getWaveConfig(sim.wave);
    sim.toSpawn = config.enemyCount;
    // ウェーブ開始直後に最初の敵が出るようにする
    sim.lastSpawnAt = now - config.spawnIntervalMs;
    sim.shieldCharges = effects.shieldCharges(sim.stacks);
    sim.hp = Math.min(sim.maxHp, sim.hp + effects.waveHeal(sim.stacks));
    sim.freezeUntil = 0;
  }, [getSim]);

  const spawnEnemy = useCallback((now: number) => {
    const sim = getSim();
    const config = getWaveConfig(sim.wave);
    const activeFirstKana = new Set(sim.enemies.map((e) => e.word[0]));
    const word = sampleWord(sim.wordPool, config.maxWordLen, activeFirstKana);
    if (word === null) {
      sim.toSpawn = 0;
      return;
    }
    sim.enemies.push({
      id: sim.nextId++,
      word,
      typed: 0,
      // 長い単語チップが左右にはみ出しにくい範囲に抑える
      x: 12 + Math.random() * 76,
      y: 0,
      speed: rollEnemySpeed(config.baseSpeed, word.length),
      missed: false,
    });
    sim.toSpawn--;
    sim.lastSpawnAt = now;
  }, [getSim]);

  const endRun = useCallback(
    (now: number) => {
      const sim = getSim();
      sim.phase = "gameover";
      sim.freezeUntil = now;
      const { isNewRecord } = updateGameRecord(sim.level, {
        score: sim.score,
        wave: sim.wave,
      });
      sim.isNewRecord = isNewRecord;
      resetChordState();
    },
    [getSim, resetChordState]
  );

  const registerMiss = useCallback(() => {
    const sim = getSim();
    sim.missCount++;
    sim.combo = effects.hasMikiri(sim.stacks) ? Math.floor(sim.combo / 2) : 0;
    sim.bombGauge = 0;
    const locked = sim.enemies.find((e) => e.id === sim.lockedId);
    if (locked) locked.missed = true;
  }, [getSim]);

  /** 言霊爆ぜ: 結界に最も近い敵を消滅させる */
  const detonateBomb = useCallback(() => {
    const sim = getSim();
    if (sim.enemies.length === 0) return;
    let front = sim.enemies[0];
    for (const e of sim.enemies) {
      if (e.y > front.y) front = e;
    }
    sim.enemies = sim.enemies.filter((e) => e.id !== front.id);
    if (sim.lockedId === front.id) sim.lockedId = null;
    sim.score += 50;
    sim.bombGauge = 0;
  }, [getSim]);

  /** 正解かなを敵に確定する（combo かなは複数文字まとめて届く） */
  const commitKana = useCallback(
    (enemyId: number, kana: string, now: number) => {
      const sim = getSim();
      const enemy = sim.enemies.find((e) => e.id === enemyId);
      if (!enemy) return;

      const comboRate = effects.comboRate(sim.stacks);
      const bombThreshold = effects.bombThreshold(sim.stacks);

      for (let i = 0; i < kana.length; i++) {
        sim.combo++;
        sim.kanaTyped++;
        sim.score += kanaScore(sim.combo, comboRate);
        if (bombThreshold !== null) {
          sim.bombGauge++;
          if (sim.bombGauge >= bombThreshold) detonateBomb();
        }
      }
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);

      // 言霊爆ぜ（detonateBomb）が確定中の enemy 自身を消滅させた場合、
      // 以降の撃破処理（killBonus 二重計上）や lockedId の亡霊参照を防ぐ
      if (!sim.enemies.some((e) => e.id === enemy.id)) {
        if (sim.lockedId === enemy.id) sim.lockedId = null;
        return;
      }

      enemy.typed += kana.length;
      sim.lockedId = enemy.id;

      if (enemy.typed >= enemy.word.length) {
        // 撃破
        sim.score += killBonus(enemy.word.length, !enemy.missed);
        if (!enemy.missed) {
          const freezeMs = effects.freezeMs(sim.stacks);
          if (freezeMs > 0) {
            sim.freezeUntil = Math.max(sim.freezeUntil, now + freezeMs);
          }
        }
        sim.enemies = sim.enemies.filter((e) => e.id !== enemy.id);
        sim.lockedId = null;
      }
    },
    [getSim, detonateBomb]
  );

  // ── かな入力（karabiner / remapping モード: 変換済みのかなが届く） ──

  const handleKanaInput = useCallback(
    (text: string, keyCode?: string) => {
      const sim = getSim();
      if (sim.phase !== "playing" || sim.paused) return;
      const now = performance.now();

      for (const char of text) {
        const locked = sim.enemies.find((e) => e.id === sim.lockedId);
        if (locked) {
          const expected = locked.word[locked.typed];
          if (
            char === expected ||
            (keyCode !== undefined && resolveKeyToKana(keyCode) === expected)
          ) {
            commitKana(locked.id, expected, now);
          } else {
            registerMiss();
          }
          continue;
        }

        // 未ロック: 先頭かなが一致する敵のうち、結界に最も近いものをロックする
        const kana =
          sim.enemies.some((e) => e.word[0] === char) || keyCode === undefined
            ? char
            : resolveKeyToKana(keyCode) ?? char;
        let target: Enemy | null = null;
        for (const e of sim.enemies) {
          if (e.word[0] !== kana) continue;
          if (target === null || e.y > target.y) target = e;
        }
        if (target) {
          commitKana(target.id, kana, now);
        } else {
          registerMiss();
        }
      }
      sync();
    },
    [getSim, commitKana, registerMiss, sync]
  );

  // ── physical モード: 物理キーの同時打鍵を複数の敵と照合する ──

  const evaluateCluster = useCallback(() => {
    const sim = getSim();
    const locked = sim.enemies.find((e) => e.id === sim.lockedId);
    const candidates: ChordCandidate[] = (locked ? [locked] : sim.enemies).map(
      (e) => ({
        enemyId: e.id,
        tail: e.word.slice(e.typed),
        y: e.y,
      })
    );

    const { match, canExtend } = matchChordToEnemies(
      [...clusterRef.current],
      candidates
    );
    clearSettleTimer();

    if (match && !canExtend) {
      clusterRef.current = new Set();
      commitKana(match.enemyId, match.kana, performance.now());
      sync();
    } else if (match && canExtend) {
      // より長いかな（じ→じゃ 等）になりうるため確定を保留して後続キーを待つ
      pendingRef.current = match;
      settleTimerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending === null) return;
        clearSettleTimer();
        clusterRef.current = new Set();
        commitKana(pending.enemyId, pending.kana, performance.now());
        sync();
      }, CHORD_SETTLE_MS);
    }
    // 未一致は後続キー or 全キー解放（＝ミス確定）を待つ
  }, [getSim, clearSettleTimer, commitKana, sync]);

  const handleChordKeyDown = useCallback(
    (code: string) => {
      const sim = getSim();
      if (sim.phase !== "playing" || sim.paused) return;
      if (pressedRef.current.has(code)) return; // オートリピート除去
      pressedRef.current.add(code);
      clusterRef.current.add(code);
      evaluateCluster();
    },
    [getSim, evaluateCluster]
  );

  const handleChordKeyUp = useCallback(
    (code: string) => {
      const sim = getSim();
      pressedRef.current.delete(code);
      if (sim.phase !== "playing" || sim.paused) return;
      if (!clusterRef.current.has(code)) return; // 確定済み/無関係キーの解放
      const anyHeld = [...clusterRef.current].some((k) =>
        pressedRef.current.has(k)
      );
      if (anyHeld) return;

      // 未確定クラスタが全解放された → 保留があれば確定、なければミス
      const pending = pendingRef.current;
      clusterRef.current = new Set();
      if (pending !== null) {
        clearSettleTimer();
        commitKana(pending.enemyId, pending.kana, performance.now());
      } else {
        clearSettleTimer();
        registerMiss();
      }
      sync();
    },
    [getSim, clearSettleTimer, commitKana, registerMiss, sync]
  );

  // ── フェーズ操作 ──

  const startGame = useCallback(
    (level: number, wordPool: string[]) => {
      const prev = getSim();
      simRef.current = {
        ...createInitialSim(),
        phase: "playing",
        level,
        wordPool,
        nextId: prev.nextId, // ID再利用によるReact key衝突を避ける
      };
      resetChordState();
      startWave(performance.now());
      sync();
    },
    [getSim, resetChordState, startWave, sync]
  );

  const pickUpgrade = useCallback(
    (id: UpgradeId) => {
      const sim = getSim();
      if (sim.phase !== "upgrade") return;
      if (!sim.upgradeOptions.includes(id)) return;

      sim.stacks[id] = (sim.stacks[id] ?? 0) + 1;
      if (id === "ofuda") {
        sim.hp = Math.min(sim.maxHp, sim.hp + 2);
      }
      sim.upgradeOptions = [];
      sim.wave++;
      sim.phase = "playing";
      startWave(performance.now());
      sync();
    },
    [getSim, startWave, sync]
  );

  const togglePause = useCallback(() => {
    const sim = getSim();
    if (sim.phase !== "playing") return;
    sim.paused = !sim.paused;
    if (sim.paused) resetChordState();
    sync();
  }, [getSim, resetChordState, sync]);

  const backToMenu = useCallback(() => {
    simRef.current = {
      ...createInitialSim(),
      nextId: getSim().nextId,
    };
    resetChordState();
    sync();
  }, [getSim, resetChordState, sync]);

  // ── ゲームループ ──

  const tick = useCallback(
    (now: number, dt: number) => {
      const sim = getSim();
      if (sim.phase !== "playing") return;

      const config = getWaveConfig(sim.wave);

      if (now < sim.freezeUntil) {
        // 時詠み発動中: 移動・出現タイマーを止める
        sim.lastSpawnAt += dt;
        sync();
        return;
      }

      // 移動
      const slowFactor = effects.slowFactor(sim.stacks);
      for (const enemy of sim.enemies) {
        enemy.y += (enemy.speed * slowFactor * dt) / 1000;
      }

      // 結界到達判定
      const leaked = sim.enemies.filter((e) => e.y >= 100);
      if (leaked.length > 0) {
        sim.enemies = sim.enemies.filter((e) => e.y < 100);
        for (const enemy of leaked) {
          if (sim.lockedId === enemy.id) sim.lockedId = null;
          if (sim.shieldCharges > 0) {
            sim.shieldCharges--;
          } else {
            sim.hp--;
            sim.combo = 0;
            sim.bombGauge = 0;
          }
        }
        if (sim.hp <= 0) {
          sim.hp = 0;
          endRun(now);
          sync();
          return;
        }
      }

      // 出現
      if (sim.toSpawn > 0 && now - sim.lastSpawnAt >= config.spawnIntervalMs) {
        spawnEnemy(now);
      }

      // ウェーブクリア
      if (sim.toSpawn === 0 && sim.enemies.length === 0) {
        sim.score += waveClearBonus(sim.wave, sim.hp);
        const options = rollUpgradeOptions(sim.stacks, UPGRADE_CHOICES);
        if (options.length > 0) {
          sim.phase = "upgrade";
          sim.upgradeOptions = options;
          resetChordState();
        } else {
          // 全強化を取り切っている場合はそのまま次のウェーブへ
          sim.wave++;
          startWave(now);
        }
      }

      sync();
    },
    [getSim, endRun, resetChordState, spawnEnemy, startWave, sync]
  );

  useEffect(() => {
    if (snapshot.phase !== "playing" || snapshot.paused) return;

    let rafId: number;
    let last = performance.now();
    const loop = (now: number) => {
      // タブ非表示からの復帰等で dt が跳ねないよう上限を設ける
      const dt = Math.min(now - last, 100);
      last = now;
      tick(now, dt);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [snapshot.phase, snapshot.paused, tick]);

  // アンマウント時に保留タイマーを破棄
  useEffect(() => {
    return () => clearSettleTimer();
  }, [clearSettleTimer]);

  // フォーカスロス・タブ切替（Alt-Tab 等）で keyup を取り逃すと押下状態が残り、
  // 同じキーの keydown がオートリピート扱いで無視され続けるため、押下状態をリセットする
  useEffect(() => {
    const handleReset = () => resetChordState();
    window.addEventListener("blur", handleReset);
    document.addEventListener("visibilitychange", handleReset);
    return () => {
      window.removeEventListener("blur", handleReset);
      document.removeEventListener("visibilitychange", handleReset);
    };
  }, [resetChordState]);

  return {
    snapshot,
    startGame,
    pickUpgrade,
    togglePause,
    backToMenu,
    handleKanaInput,
    handleChordKeyDown,
    handleChordKeyUp,
  };
}
