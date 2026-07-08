/**
 * ショップの品揃え抽選と価格
 *
 * 勝負に勝つたびに幕間ショップが開く。品揃えは rngState を消費して決まるため
 * 同一シードのランでは常に同じ（チェックポイント復元でも一致する）。
 */

import { BALANCE, stakeMod } from "./balance";
import { CHARM_DEFS, effectivePrice, rollCharmOffers } from "./charms";
import { OFUDA_DEFS } from "./items";
import * as rng from "./rng";
import { YAKU_DEFS } from "./yaku";
import type { OfudaId, RunState, ShopState, YakuId } from "@/types/fuda";

/** ショップの品揃えを抽選する */
export function rollShop(run: RunState): [ShopState, number] {
  const priceMult = stakeMod(run.stake).priceMult;
  const unlocked = new Set(run.unlockedCharms);
  let s = run.rngState;

  const [charmIds, s2] = rollCharmOffers(s, run, unlocked, BALANCE.shop.charmSlots);
  s = s2;
  const charmOffers = charmIds.map((charmId) => ({
    charmId,
    price: effectivePrice(CHARM_DEFS[charmId].price, run, priceMult),
    sold: false,
  }));

  const ofudaIds = Object.keys(OFUDA_DEFS) as OfudaId[];
  const [ofudaId, s3] = rng.pick(s, ofudaIds);
  s = s3;

  const yakuIds = Object.keys(YAKU_DEFS) as YakuId[];
  const [scrollYaku, s4] = rng.pick(s, yakuIds);
  s = s4;

  const shop: ShopState = {
    charmOffers,
    ofudaOffer:
      ofudaId !== null
        ? {
            ofudaId,
            price: effectivePrice(BALANCE.shop.ofudaPrice, run, priceMult),
            sold: false,
          }
        : null,
    scrollOffer:
      scrollYaku !== null
        ? {
            yakuId: scrollYaku,
            price: effectivePrice(BALANCE.shop.scrollPrice, run, priceMult),
            sold: false,
          }
        : null,
    packPrice: effectivePrice(BALANCE.shop.packPrice, run, priceMult),
    packSold: false,
    packChoice: null,
    pendingAction: null,
    removePrice: effectivePrice(BALANCE.shop.removePrice, run, priceMult),
    rerollPrice: BALANCE.shop.rerollBase,
  };
  return [shop, s];
}

/** リロール: お守り・御札・巻物の枠を引き直す（パックと価格系は据え置き） */
export function rerollShop(run: RunState, shop: ShopState): [ShopState, number] {
  const [fresh, s] = rollShop(run);
  return [
    {
      ...fresh,
      packPrice: shop.packPrice,
      packSold: shop.packSold,
      packChoice: shop.packChoice,
      pendingAction: shop.pendingAction,
      removePrice: shop.removePrice,
      rerollPrice: shop.rerollPrice + BALANCE.shop.rerollStep,
    },
    s,
  ];
}
