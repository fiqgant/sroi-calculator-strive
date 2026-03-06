export interface StakeholderData {
  id: number;
  name: string;
  quantity: number;
  proxy: number;
  deadweight: number;   // % - apa yang terjadi tanpa program
  attribution: number;  // % - kontribusi pihak lain
  displacement: number; // % - dampak negatif tidak sengaja (NEW)
  dropoff: number;      // % - penurunan dampak per tahun (berlaku mulai tahun 2)
  duration: number;     // tahun - berapa lama dampak bertahan (NEW)
}

export interface StakeholderResult extends StakeholderData {
  grossOutcome: number;  // quantity × proxy
  netYear1: number;      // Gross × (1-DW) × (1-ATT) × (1-DISP) — tanpa drop-off
  yearlyNet: number[];   // net per tahun [t1, t2, ..., t_duration]
  yearlyPV: number[];    // PV per tahun setelah discount
  pvTotal: number;       // total NPV stakeholder ini
}

/**
 * Hitung hasil SROI per stakeholder sesuai metodologi standar:
 * - Drop-off hanya berlaku mulai Tahun 2 (bukan Tahun 1)
 * - NPV dihitung dengan discount rate
 */
export function calcStakeholderResult(
  s: StakeholderData,
  discountRate: number
): StakeholderResult {
  const gross = s.quantity * s.proxy;

  // Year 1: tidak ada drop-off — drop-off mengukur penurunan dari tahun sebelumnya
  const netYear1 =
    gross *
    (1 - s.deadweight / 100) *
    (1 - s.attribution / 100) *
    (1 - s.displacement / 100);

  const d = Math.max(1, Math.round(s.duration));
  const yearlyNet: number[] = [];
  const yearlyPV: number[] = [];

  for (let t = 1; t <= d; t++) {
    // Net tahun t = netYear1 × (1-dropoff)^(t-1)
    // t=1 → (1-dropoff)^0 = 1 → tidak ada drop-off ✓
    // t=2 → (1-dropoff)^1, dst.
    const net = netYear1 * Math.pow(1 - s.dropoff / 100, t - 1);
    // Discount: PV = nilai / (1+r)^t
    const pv = net / Math.pow(1 + discountRate / 100, t);
    yearlyNet.push(net);
    yearlyPV.push(pv);
  }

  const pvTotal = yearlyPV.reduce((a, b) => a + b, 0);

  return { ...s, grossOutcome: gross, netYear1, yearlyNet, yearlyPV, pvTotal };
}

export interface ProjectionParams {
  baseNetYear1: number;
  growth: number;
  annualDropoff: number;
  investmentYearly: number;
  discountRate: number;
  L: number;
  k: number;
  x0: number;
  years: number;
}

export interface ProjectionResult {
  year: number;
  linearOutcome: number;
  exponentialOutcome: number;
  logisticOutcome: number;
  pv_linear: number;
  pv_exponential: number;
  pv_logistic: number;
  sroi_linear: number;
  sroi_exponential: number;
  sroi_logistic: number;
  cumSroi_linear: number;
  cumSroi_exponential: number;
  cumSroi_logistic: number;
}

function logisticFormula(t: number, L: number, k: number, x0: number): number {
  return L / (1 + Math.exp(-k * (t - x0)));
}

export function projectOutcomes(params: ProjectionParams): ProjectionResult[] {
  const {
    baseNetYear1,
    growth,
    annualDropoff,
    investmentYearly,
    discountRate,
    L,
    k,
    x0,
    years,
  } = params;

  const g = 1 + growth / 100;
  const d = 1 - annualDropoff / 100;

  const linear: number[] = [baseNetYear1];
  const exponential: number[] = [baseNetYear1];
  // Logistic konsisten: semua tahun pakai formula (termasuk tahun 1)
  const logistic: number[] = [logisticFormula(1, L, k, x0)];

  for (let i = 1; i < years; i++) {
    linear.push(linear[linear.length - 1] * g * d);
    exponential.push(
      exponential[exponential.length - 1] * Math.exp(growth / 100) * d
    );
    logistic.push(logisticFormula(i + 1, L, k, x0));
  }

  // Kumulatif PV untuk SROI kumulatif
  let cumPV_l = 0,
    cumPV_e = 0,
    cumPV_g = 0;
  let cumInv = 0;

  return linear.map((_, i) => {
    const t = i + 1;
    const discountFactor = Math.pow(1 + discountRate / 100, t);

    const pv_l = linear[i] / discountFactor;
    const pv_e = exponential[i] / discountFactor;
    const pv_g = logistic[i] / discountFactor;

    cumPV_l += pv_l;
    cumPV_e += pv_e;
    cumPV_g += pv_g;
    cumInv += investmentYearly;

    return {
      year: t,
      linearOutcome: linear[i],
      exponentialOutcome: exponential[i],
      logisticOutcome: logistic[i],
      pv_linear: pv_l,
      pv_exponential: pv_e,
      pv_logistic: pv_g,
      // SROI tahunan (PV outcome tahun ini / investasi tahun ini)
      sroi_linear: investmentYearly > 0 ? pv_l / investmentYearly : 0,
      sroi_exponential: investmentYearly > 0 ? pv_e / investmentYearly : 0,
      sroi_logistic: investmentYearly > 0 ? pv_g / investmentYearly : 0,
      // SROI kumulatif (total PV s.d. tahun ini / total investasi s.d. tahun ini)
      cumSroi_linear: cumInv > 0 ? cumPV_l / cumInv : 0,
      cumSroi_exponential: cumInv > 0 ? cumPV_e / cumInv : 0,
      cumSroi_logistic: cumInv > 0 ? cumPV_g / cumInv : 0,
    };
  });
}

export function formatRp(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
