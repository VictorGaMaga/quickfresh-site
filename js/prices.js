// QuickFresh - base prices + quote calculator
const QUICKFRESH_PRICES = {
  // Minimum call-out
  MINIMUM_CALLOUT: 149,
  MIN_TOTAL: 149,

  // Carpets
  CARPET_ROOM_PRICE: 50,
  CARPET_HALLWAY_PRICE: 25,
  CARPET_STAIRS_PRICE: 60,
  PRICE_PER_ROOM: 50,
  CARPET_ROOM: 50,
  URINE_FEE: 20,
  CARPET_URINE_BOOST: 20,
  HEAVY_HAIR_FEE: 20,
  CARPET_HEAVY_HAIR: 20,

  // Rugs & mats
  RUG_PRICES: { tiny: 10, small: 19, medium: 29, large: 39 },
  RUG_TINY: 10,
  RUG_SMALL: 19,
  RUG_MEDIUM: 29,
  RUG_LARGE: 39,

  // Upholstery
  sofa: {
    seat1: 50,
    seat2: 90,
    seat3: 120,
    extraSeat: 40,
    doubleSided: 10
  },

  // Fabric protector
  scotch: {
    perSeat: 10,
    perSeatDouble: 12
  },

  // Dining chairs
  dining: {
    standard: 25,
    full: 35
  },

  // Mattresses
  mattress: {
    single: 70,
    double: 90,
    queen: 110,
    king: 130,
    bothSidesMultiplier: 1.5,
    protection: 20
  },

  // Tile & grout
  tile: {
    perSqm: 8,
    minTotal: 200
  }
};

function sofaStandardTotal(seats){
  if (seats <= 0) return 0;
  if (seats === 1) return 50;
  if (seats === 2) return 90;
  if (seats === 3) return 120;
  return 120 + (seats - 3) * 40;
}

function sofaTotal(seats, isDoubleSided){
  const base = sofaStandardTotal(seats);
  if (!isDoubleSided) return base;
  return base + seats * 10;
}

function safeInt(value){
  const n = parseInt(value ?? 0, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function calculateQuote(state){
  const prices = QUICKFRESH_PRICES;
  const rooms = safeInt(state?.rooms);
  const hallway = safeInt(state?.hallway);
  const stairs = safeInt(state?.stairs);
  const rugs = state?.rugs || {};
  const addOns = state?.addOns || {};

  let carpetsSubtotal = 0;
  let carpetAddOnsSubtotal = 0;
  let rugsSubtotal = 0;
  let upholsterySubtotal = 0;
  let tileSubtotal = 0;
  let mattressSubtotal = 0;
  const lineItems = [];
  const carpetAddOns = [];

  const urineRooms = safeInt(addOns?.urineBoostRooms);
  const hairRooms = safeInt(addOns?.heavyHairRooms);

  if (rooms > 0){
    carpetsSubtotal = rooms * prices.CARPET_ROOM_PRICE;
    lineItems.push({ key: 'carpet-rooms', label: 'Carpet rooms', qty: rooms, subtotal: carpetsSubtotal, kind: 'priced' });
  }

  if (hallway > 0){
    const cost = hallway * prices.CARPET_HALLWAY_PRICE;
    lineItems.push({ key: 'carpet-hallway', label: 'Hallway', qty: hallway, subtotal: cost, kind: 'priced' });
    carpetsSubtotal += cost;
  }

  if (stairs > 0){
    const cost = stairs * prices.CARPET_STAIRS_PRICE;
    lineItems.push({ key: 'carpet-stairs', label: 'Stairs', qty: stairs, subtotal: cost, kind: 'priced' });
    carpetsSubtotal += cost;
  }

  if (urineRooms > 0){
    const fee = urineRooms * prices.URINE_FEE;
    lineItems.push({ key: 'carpet-urine', label: 'Odour & urine boost', qty: urineRooms, subtotal: fee, kind: 'priced' });
    carpetAddOnsSubtotal += fee;
    carpetAddOns.push({ label: 'Odour & urine boost', amount: fee, isQuote: false });
  }

  if (hairRooms > 0){
    const fee = hairRooms * prices.HEAVY_HAIR_FEE;
    lineItems.push({ key: 'carpet-hair', label: 'Heavy pet hair', qty: hairRooms, subtotal: fee, kind: 'priced' });
    carpetAddOnsSubtotal += fee;
    carpetAddOns.push({ label: 'Heavy pet hair', amount: fee, isQuote: false });
  }

  if (addOns?.advancedStainQuote){
    lineItems.push({ key: 'carpet-advanced', label: 'Advanced stain removal', qty: '', subtotal: 0, kind: 'quote' });
    carpetAddOns.push({ label: 'Advanced stain removal', amount: 0, isQuote: true });
  }

  const rugSizes = ['tiny', 'small', 'medium', 'large'];
  rugSizes.forEach((size) => {
    const qty = safeInt(rugs[size]);
    if (!qty) return;
    const unit = prices.RUG_PRICES[size];
    const cost = qty * unit;
    const label = `Rug (${size.charAt(0).toUpperCase() + size.slice(1)})`;
    lineItems.push({ key: `rug-${size}`, label, qty, subtotal: cost, kind: 'priced' });
    rugsSubtotal += cost;
  });

  const seats = safeInt(state?.seats);
  const doubleSided = !!state?.doubleSided;
  const scotchOpt = !!state?.scotchOpt;
  if (seats > 0){
    const sCost = sofaTotal(seats, doubleSided);
    lineItems.push({
      key: 'sofa',
      label: 'Sofa / Couch',
      qty: seats,
      subtotal: sCost,
      kind: 'priced'
    });
    upholsterySubtotal += sCost;
    if (scotchOpt){
      const sc = seats * (doubleSided ? prices.scotch.perSeatDouble : prices.scotch.perSeat);
      lineItems.push({ key: 'sofa-scotch', label: 'Fabric protector', qty: seats, subtotal: sc, kind: 'priced' });
      upholsterySubtotal += sc;
    }
  }

  const diningQty = safeInt(state?.diningQty);
  const diningFull = !!state?.diningFull;
  if (diningQty > 0){
    const unit = diningFull ? prices.dining.full : prices.dining.standard;
    lineItems.push({
      key: 'dining',
      label: `Dining chairs${diningFull ? ' (fabric protector)' : ''}`,
      qty: diningQty,
      subtotal: diningQty * unit,
      kind: 'priced'
    });
    upholsterySubtotal += diningQty * unit;
  }

  const mSingle = safeInt(state?.mSingle);
  const mDouble = safeInt(state?.mDouble);
  const mQueen = safeInt(state?.mQueen);
  const mKing = safeInt(state?.mKing);
  const mBoth = !!state?.mBoth;
  const mProtect = !!state?.mProtect;

  const mRows = [
    ['Single mattress', mSingle, prices.mattress.single],
    ['Double mattress', mDouble, prices.mattress.double],
    ['Queen mattress', mQueen, prices.mattress.queen],
    ['King mattress', mKing, prices.mattress.king]
  ].filter(row => row[1] > 0);

  let mTotal = 0;
  let mQty = 0;
  mRows.forEach(([label, qty, price]) => {
    const cost = qty * price;
    lineItems.push({ key: `mattress-${label.toLowerCase().replace(/\s+/g,'-')}`, label, qty, subtotal: cost, kind: 'priced' });
    mTotal += cost;
    mQty += qty;
  });

  if (mRows.length){
    if (mBoth){
      const extra = mTotal * (prices.mattress.bothSidesMultiplier - 1);
      lineItems.push({ key: 'mattress-both', label: 'Mattress both sides (+50%)', qty: '', subtotal: extra, kind: 'priced' });
      mTotal += extra;
    }
    if (mProtect){
      const p = mQty * prices.mattress.protection;
      lineItems.push({ key: 'mattress-protect', label: 'Fabric protector', qty: mQty, subtotal: p, kind: 'priced' });
      mTotal += p;
    }
    mattressSubtotal += mTotal;
  }

  const tileSqm = safeInt(state?.tiles?.sqm ?? state?.tileSqm);
  const tileUnknown = !!state?.tiles?.sqmUnknown;
  if (tileUnknown){
    lineItems.push({ key: 'tile-quote', label: 'Tile & Grout cleaning', qty: '', subtotal: 0, kind: 'quote' });
  } else if (tileSqm > 0){
    const base = tileSqm * prices.tile.perSqm;
    const min = prices.tile.minTotal || 0;
    const cost = Math.max(base, min);
    const label = cost > base ? `Tile & Grout cleaning (min $${min})` : 'Tile & Grout cleaning';
    lineItems.push({ key: 'tile', label, qty: `${tileSqm} sqm`, subtotal: cost, kind: 'priced' });
    tileSubtotal += cost;
  }

  if (addOns?.specialisedTreatment){
    lineItems.push({ key: 'carpet-specialised', label: 'Specialised treatment', qty: '', subtotal: 0, kind: 'quote' });
  }

  const rawSubtotal = carpetsSubtotal + rugsSubtotal + carpetAddOnsSubtotal + upholsterySubtotal + tileSubtotal + mattressSubtotal;
  const rawTotal = rawSubtotal;
  let finalTotal = rawTotal;
  let minimumApplied = false;
  let awayFromMinimum = 0;

  if (rawTotal > 0 && rawTotal < prices.MINIMUM_CALLOUT){
    finalTotal = prices.MINIMUM_CALLOUT;
    minimumApplied = true;
    awayFromMinimum = prices.MINIMUM_CALLOUT - rawTotal;
  }
  if (rawTotal === 0){
    finalTotal = 0;
    minimumApplied = false;
    awayFromMinimum = 0;
  }

  return {
    carpetsSubtotal,
    rugsSubtotal,
    carpetAddOnsSubtotal,
    upholsterySubtotal,
    tileSubtotal,
    mattressSubtotal,
    lineItems,
    rawSubtotal,
    rawTotal,
    minimumApplied,
    awayFromMinimum,
    finalTotal,
    flags: {
      advancedStainQuote: !!addOns?.advancedStainQuote,
      heavyPetHair: hairRooms > 0,
      tileQuoteApprox: tileUnknown
    },
    carpetNotes: [
      addOns?.specialisedTreatment ? 'Specialised treatment: on-site quote.' : null
    ].filter(Boolean),
    carpetAddOnsLineItems: carpetAddOns.map(item => ({
      label: item.label,
      amount: item.amount,
      type: item.isQuote ? 'quote' : 'fee'
    })),
    breakdown: lineItems.map(item => ({
      label: item.label,
      qty: item.qty,
      subtotal: item.kind === 'quote' ? 'On-site quote' : item.subtotal
    }))
  };
}

window.QUICKFRESH_PRICES = QUICKFRESH_PRICES;
window.calculateQuote = calculateQuote;
