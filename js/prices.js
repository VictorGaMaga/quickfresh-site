// ── QuickFresh — Preços base (fácil de editar) ─────────────────────────────
const QUICKFRESH_PRICES = {
  MIN_TOTAL: 149,

  carpet: 50,
  rug: 40,

  // Sofá
  sofa: {
    seat1: 50,
    seat2: 90,
    seat3: 120,
    extraSeat: 40,        // por assento adicional acima de 3
    doubleSided: 10,      // adicional por assento
  },

  // Scotchgard
  scotch: {
    perSeat: 10,
    perSeatDouble: 12
  },

  // Cadeiras
  dining: {
    standard: 25,
    full: 30
  },

  // Colchões
  mattress: {
    single: 80,
    double: 100,
    queen: 120,
    king: 140,
    bothSidesMultiplier: 1.5,
    protection: 20
  }
};
