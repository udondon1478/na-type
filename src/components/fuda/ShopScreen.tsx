"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BALANCE } from "@/lib/fuda/balance";
import { CHARM_DEFS } from "@/lib/fuda/charms";
import { OFUDA_DEFS } from "@/lib/fuda/items";
import { wordAttrProfile } from "@/lib/fuda/segment";
import { YAKU_DEFS } from "@/lib/fuda/yaku";
import { ATTR_META, ATTR_ORDER } from "./attrMeta";
import { CharmShelf } from "./CharmShelf";
import type { RunState, WordCardData } from "@/types/fuda";

interface ShopScreenProps {
  run: RunState;
  onBuyCharm: (index: number) => void;
  onBuyOfuda: () => void;
  onBuyScroll: () => void;
  onBuyPack: () => void;
  onPickPackWord: (word: string) => void;
  onSellCharm: (slot: number) => void;
  onReroll: () => void;
  onRemoveWord: (uid: number) => void;
  onCopyWord: (uid: number) => void;
  onUseOfuda: (slot: number) => void;
  onLeave: () => void;
}

/** 単語の属性ドット列（パック・デッキ一覧の共通表示） */
function AttrDots({ word }: { word: string }) {
  const profile = wordAttrProfile(word);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {ATTR_ORDER.flatMap((attr) =>
        Array.from({ length: profile[attr] }, (_, i) => (
          <span
            key={`${attr}-${i}`}
            title={ATTR_META[attr].label}
            className={cn("h-1.5 w-1.5 rounded-full", ATTR_META[attr].dot)}
          />
        ))
      )}
    </span>
  );
}

export function ShopScreen({
  run,
  onBuyCharm,
  onBuyOfuda,
  onBuyScroll,
  onBuyPack,
  onPickPackWord,
  onSellCharm,
  onReroll,
  onRemoveWord,
  onCopyWord,
  onUseOfuda,
  onLeave,
}: ShopScreenProps) {
  const shop = run.shop;
  // 有償の単語削除モード（御札の pendingAction とは別のローカル状態）
  const [removeMode, setRemoveMode] = useState(false);
  if (!shop) return null;

  const pendingAction = shop.pendingAction;
  const deckClickable = pendingAction !== null || removeMode;
  const charmSlotsFull = run.charms.length >= BALANCE.hand.charmSlots;
  const ofudaSlotsFull = run.ofudas.length >= BALANCE.hand.ofudaSlots;

  const handleDeckWordClick = (card: WordCardData) => {
    if (pendingAction === "remove") return onRemoveWord(card.uid);
    if (pendingAction === "copy") return onCopyWord(card.uid);
    if (removeMode) {
      onRemoveWord(card.uid);
      setRemoveMode(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold font-mono tracking-widest">幕間ショップ</p>
        <CharmShelf run={run} onSell={onSellCharm} />
      </div>

      {/* パック開封: 3語から1語選ぶ */}
      {shop.packChoice ? (
        <div className="space-y-2 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3">
          <p className="text-sm font-bold text-amber-400">
            単語パック — デッキに加える札を1枚選べ
          </p>
          <div className="grid grid-cols-3 gap-2">
            {shop.packChoice.map((word) => (
              <button
                key={word}
                onClick={() => onPickPackWord(word)}
                className="rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/60 transition-colors text-center"
              >
                <span className="font-mono">{word}</span>
                <span className="block mt-1">
                  <AttrDots word={word} />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 商品棚 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {shop.charmOffers.map((offer, i) => {
              const def = CHARM_DEFS[offer.charmId];
              const disabled =
                offer.sold || charmSlotsFull || run.money < offer.price;
              return (
                <button
                  key={`${offer.charmId}-${i}`}
                  onClick={() => onBuyCharm(i)}
                  disabled={disabled}
                  title={def.describe(0)}
                  className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary/60 transition-colors disabled:opacity-40 disabled:hover:border-border"
                >
                  <p className="text-sm font-bold">
                    {def.icon} {def.name}
                    <span
                      className={cn(
                        "ml-1 text-[10px] font-normal",
                        def.rarity === "legendary"
                          ? "text-amber-400"
                          : def.rarity === "rare"
                            ? "text-sky-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {def.rarity === "legendary"
                        ? "伝説"
                        : def.rarity === "rare"
                          ? "稀"
                          : "並"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {def.describe(0)}
                  </p>
                  <p className="text-xs text-amber-400 font-mono mt-1">
                    {offer.sold ? "売切" : `${offer.price}文`}
                  </p>
                </button>
              );
            })}

            {shop.scrollOffer && (
              <button
                onClick={onBuyScroll}
                disabled={shop.scrollOffer.sold || run.money < shop.scrollOffer.price}
                className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary/60 transition-colors disabled:opacity-40 disabled:hover:border-border"
              >
                <p className="text-sm font-bold">
                  📖 {YAKU_DEFS[shop.scrollOffer.yakuId].name}の巻物
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  役「{YAKU_DEFS[shop.scrollOffer.yakuId].name}」のレベル +1
                  （現在 Lv{run.yakuLevels[shop.scrollOffer.yakuId] ?? 1}）
                </p>
                <p className="text-xs text-amber-400 font-mono mt-1">
                  {shop.scrollOffer.sold ? "売切" : `${shop.scrollOffer.price}文`}
                </p>
              </button>
            )}

            {shop.ofudaOffer && (
              <button
                onClick={onBuyOfuda}
                disabled={
                  shop.ofudaOffer.sold ||
                  ofudaSlotsFull ||
                  run.money < shop.ofudaOffer.price
                }
                className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary/60 transition-colors disabled:opacity-40 disabled:hover:border-border"
              >
                <p className="text-sm font-bold">
                  {OFUDA_DEFS[shop.ofudaOffer.ofudaId].icon}{" "}
                  {OFUDA_DEFS[shop.ofudaOffer.ofudaId].name}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    御札
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {OFUDA_DEFS[shop.ofudaOffer.ofudaId].description}
                </p>
                <p className="text-xs text-amber-400 font-mono mt-1">
                  {shop.ofudaOffer.sold ? "売切" : `${shop.ofudaOffer.price}文`}
                </p>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBuyPack}
              disabled={shop.packSold || run.money < shop.packPrice}
              className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors disabled:opacity-40"
            >
              🎴 単語パック {shop.packSold ? "（開封済）" : `${shop.packPrice}文`}
            </button>
            <button
              onClick={onReroll}
              disabled={run.money < shop.rerollPrice}
              className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors disabled:opacity-40"
            >
              🎲 リロール {shop.rerollPrice}文
            </button>
            <button
              onClick={() => setRemoveMode((v) => !v)}
              disabled={
                pendingAction !== null ||
                run.deck.length <= 1 ||
                run.money < shop.removePrice
              }
              className={cn(
                "px-3 py-1.5 rounded-md border text-sm transition-colors disabled:opacity-40",
                removeMode
                  ? "border-red-400 text-red-400"
                  : "border-border hover:bg-accent"
              )}
            >
              ✂️ 語を削除 {shop.removePrice}文{removeMode && "（対象を選択）"}
            </button>
          </div>

          {/* 所持御札 */}
          {run.ofudas.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">所持御札:</span>
              {run.ofudas.map((id, slot) => {
                const def = OFUDA_DEFS[id];
                return (
                  <button
                    key={`${id}-${slot}`}
                    onClick={() => onUseOfuda(slot)}
                    disabled={!def.canUse(run)}
                    title={def.description}
                    className="px-2.5 py-1 rounded-md border border-border text-sm hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    {def.icon} {def.name}を使う
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* デッキ一覧 */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          デッキ（{run.deck.length}枚）
          {pendingAction === "remove" && (
            <span className="text-red-400 ml-2 font-bold">
              → 取り除く札を選べ
            </span>
          )}
          {pendingAction === "copy" && (
            <span className="text-sky-400 ml-2 font-bold">→ 複製する札を選べ</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {run.deck.map((card) => (
            <button
              key={card.uid}
              onClick={() => handleDeckWordClick(card)}
              disabled={!deckClickable}
              className={cn(
                "rounded border border-border bg-card px-2 py-1 font-mono text-sm inline-flex items-center gap-1.5 transition-colors",
                deckClickable
                  ? pendingAction === "copy"
                    ? "hover:border-sky-400"
                    : "hover:border-red-400"
                  : "cursor-default"
              )}
            >
              {card.word}
              <AttrDots word={card.word} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onLeave}
          disabled={shop.packChoice !== null || pendingAction !== null}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          次の勝負へ
          <kbd className="ml-2 text-xs opacity-60">Enter</kbd>
        </button>
      </div>
    </div>
  );
}
