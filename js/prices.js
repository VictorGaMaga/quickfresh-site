// ── QuickFresh — Preços base (fácil de editar) ─────────────────────────────
const QUICKFRESH_PRICES = {
  // Valor mínimo de chamada
  MIN_TOTAL: 149,

  // ── Pacotes principais ─────────────────────────────
  FreshClean: 50,   // Steam Extraction — ideal para manutenção
  TotalClean: 70,   // CRB + Steam Extraction — limpeza profunda

  // ── Sofás ───────────────────────────────────────────
  sofa: {
    seat1: 50,
    seat2: 90,
    seat3: 120,
    extraSeat: 40,        // por assento adicional acima de 3
    doubleSided: 10       // adicional por assento (frente e verso)
  },

  // ── Scotchgard ──────────────────────────────────────
  scotch: {
    perSeat: 10,
    perSeatDouble: 12
  },

  // ── Cadeiras ────────────────────────────────────────
  dining: {
    standard: 25,
    full: 30
  },

  // ── Colchões ────────────────────────────────────────
  mattress: {
    single: 80,
    double: 100,
    queen: 120,
    king: 140,
    bothSidesMultiplier: 1.5, // limpeza dos dois lados (+50%)
    protection: 20            // proteção adicional
  }
};

