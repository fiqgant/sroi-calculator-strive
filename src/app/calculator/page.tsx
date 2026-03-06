"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  calcStakeholderResult,
  projectOutcomes,
  formatRp,
  type StakeholderData,
} from "@/lib/sroi";

const ProjectionChart = dynamic(() => import("@/components/ProjectionChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
      Memuat grafik...
    </div>
  ),
});

const MAX_STAKEHOLDERS = 20;

const BORDER_COLORS = [
  "border-l-primary-500",
  "border-l-blue-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-pink-500",
  "border-l-teal-500",
  "border-l-indigo-500",
  "border-l-orange-500",
  "border-l-cyan-500",
  "border-l-rose-500",
];

function getSroiStyle(sroi: number) {
  if (sroi <= 0)
    return { text: "text-gray-400", badge: "bg-gray-100 text-gray-500", label: "—", bar: "bg-gray-300" };
  if (sroi < 1)
    return { text: "text-red-500", badge: "bg-red-100 text-red-700", label: "Di Bawah Target", bar: "bg-red-400" };
  if (sroi < 2)
    return { text: "text-amber-500", badge: "bg-amber-100 text-amber-700", label: "Rendah", bar: "bg-amber-400" };
  if (sroi < 3)
    return { text: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700", label: "Cukup", bar: "bg-yellow-400" };
  if (sroi < 5)
    return { text: "text-primary-600", badge: "bg-primary-100 text-primary-700", label: "Baik", bar: "bg-primary-500" };
  return { text: "text-primary-700", badge: "bg-primary-200 text-primary-800", label: "Sangat Baik", bar: "bg-primary-600" };
}

function createDefaultStakeholder(id: number): StakeholderData {
  return {
    id,
    name: "",
    quantity: 1,
    proxy: 1_000_000,
    deadweight: 20,
    attribution: 30,
    displacement: 0,
    dropoff: 0,
    duration: 3,
  };
}

// ---- Sub-components ----

function PercentBar({ value }: { value: number }) {
  const color =
    value < 20 ? "bg-emerald-400" : value < 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="h-1 rounded-full bg-gray-100 mt-1.5">
      <div
        className={`h-1 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  showBar?: boolean;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  hint,
  value,
  min = 0,
  max = 100,
  step = 1,
  showBar = true,
  onChange,
}: SliderFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label !mb-0">{label}</label>
        <span className="text-sm font-bold text-gray-700 tabular-nums">{value}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mb-1.5">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary-600 cursor-pointer"
      />
      {showBar && <PercentBar value={((value - min) / (max - min)) * 100} />}
      <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  sroi?: number;
}

function StatCard({ label, value, sub, accent, sroi }: StatCardProps) {
  const style = sroi !== undefined ? getSroiStyle(sroi) : null;
  return (
    <div className={`rounded-2xl px-5 py-4 border ${accent ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-gray-100 shadow-sm"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${accent ? "text-primary-200" : "text-gray-400"}`}>
        {label}
      </p>
      <p className={`text-2xl font-extrabold tabular-nums leading-none ${accent ? "text-white" : style ? style.text : "text-gray-800"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1 ${accent ? "text-primary-200" : "text-gray-400"}`}>{sub}</p>
      )}
      {style && sroi !== undefined && sroi > 0 && (
        <span className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function CalculatorPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin");

  const [stakeholders, setStakeholders] = useState<StakeholderData[]>(() =>
    Array.from({ length: MAX_STAKEHOLDERS }, (_, i) => createDefaultStakeholder(i))
  );
  const [numRows, setNumRows] = useState(9);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 1, 2]));

  const [investment, setInvestment] = useState(112_250_000);
  const [discountRate, setDiscountRate] = useState(5);

  const [growth, setGrowth] = useState(10);
  const [annualDropoff, setAnnualDropoff] = useState(20);
  const [investmentYearly, setInvestmentYearly] = useState(112_250_000);
  const [L, setL] = useState(1_000_000_000);
  const [k, setK] = useState(1.2);
  const [x0, setX0] = useState(2);
  const [chartMode, setChartMode] = useState<"annual" | "cumulative">("cumulative");

  const sroiRef = useRef<HTMLSpanElement>(null);
  const prevSroi = useRef(0);

  useEffect(() => {
    const auth = sessionStorage.getItem("sroi_auth");
    if (auth !== "true") { router.replace("/login"); return; }
    setUserName(sessionStorage.getItem("sroi_user") ?? "Admin");
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("sroi_auth");
    sessionStorage.removeItem("sroi_user");
    router.push("/login");
  }

  function handleNumRowsChange(raw: string) {
    const val = parseInt(raw);
    if (isNaN(val)) return;
    setNumRows(Math.max(1, Math.min(MAX_STAKEHOLDERS, val)));
  }

  function updateStakeholder(id: number, field: keyof StakeholderData, value: string | number) {
    setStakeholders((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const visibleStakeholders = stakeholders.slice(0, numRows);

  const results = useMemo(
    () => visibleStakeholders.map((s) => calcStakeholderResult(s, discountRate)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stakeholders, numRows, discountRate]
  );

  const totalGross = useMemo(() => results.reduce((s, r) => s + r.grossOutcome, 0), [results]);
  const totalNetYear1 = useMemo(() => results.reduce((s, r) => s + r.netYear1, 0), [results]);
  const totalNPV = useMemo(() => results.reduce((s, r) => s + r.pvTotal, 0), [results]);

  const sroi_npv = investment > 0 ? totalNPV / investment : 0;
  const sroi_year1 = investment > 0 ? totalNetYear1 / investment : 0;
  const sroiStyle = getSroiStyle(sroi_npv);

  // Pulse animation when SROI changes meaningfully
  useEffect(() => {
    if (Math.abs(sroi_npv - prevSroi.current) > 0.05 && sroiRef.current) {
      sroiRef.current.classList.remove("sroi-pulse");
      void sroiRef.current.offsetWidth;
      sroiRef.current.classList.add("sroi-pulse");
    }
    prevSroi.current = sroi_npv;
  }, [sroi_npv]);

  const projection = useMemo(
    () =>
      projectOutcomes({
        baseNetYear1: totalNetYear1,
        growth,
        annualDropoff,
        investmentYearly,
        discountRate,
        L,
        k,
        x0,
        years: 3,
      }),
    [totalNetYear1, growth, annualDropoff, investmentYearly, discountRate, L, k, x0]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-primary-700 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
              S
            </div>
            <div className="leading-tight">
              <span className="font-bold text-sm">STRIVE</span>
              <span className="text-primary-300 text-xs ml-1.5 hidden sm:inline">
                Sustainable Tourism Initiative
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary-200 hidden sm:block">
              {userName}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* ── Title ── */}
        <div className="text-center animate-fade-up">
          <h1 className="text-2xl font-extrabold text-gray-800">
            Social Return on Investment Calculator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Multi-Year Social Impact &amp; Value Forecasting — SROI Network Standard
          </p>
        </div>

        {/* ── Live Stats Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up">
          <StatCard
            label="Stakeholder Aktif"
            value={String(numRows)}
            sub={`dari ${MAX_STAKEHOLDERS} tersedia`}
          />
          <StatCard
            label="Total Gross"
            value={formatRp(totalGross)}
            sub="belum disesuaikan"
          />
          <StatCard
            label="Total NPV"
            value={formatRp(totalNPV)}
            sub={`disc. rate ${discountRate}%`}
          />
          <StatCard
            label="SROI NPV"
            value={sroi_npv > 0 ? `${sroi_npv.toFixed(2)}x` : "—"}
            sub={`untuk setiap Rp1 investasi`}
            accent
            sroi={sroi_npv}
          />
        </div>

        {/* ── Jumlah Stakeholder ── */}
        <div className="card animate-fade-up">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="font-bold text-gray-800">Jumlah Stakeholder / Outcome</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pilih berapa stakeholder yang ingin dihitung
              </p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setNumRows((n) => Math.max(1, n - 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-gray-600 transition-all active:scale-95 text-lg"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={MAX_STAKEHOLDERS}
                value={numRows}
                onChange={(e) => handleNumRowsChange(e.target.value)}
                className="input-field w-20 text-center font-bold text-lg"
              />
              <button
                onClick={() => setNumRows((n) => Math.min(MAX_STAKEHOLDERS, n + 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-gray-600 transition-all active:scale-95 text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Progress bar showing count */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>0</span>
              <span>{MAX_STAKEHOLDERS}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-primary-500 transition-all duration-300"
                style={{ width: `${(numRows / MAX_STAKEHOLDERS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Stakeholder Cards ── */}
        <div className="card animate-fade-up">
          <h2 className="section-title">Input Data Outcome per Stakeholder</h2>
          <div className="space-y-2">
            {visibleStakeholders.map((s, idx) => {
              const result = results[idx];
              const isOpen = expanded.has(s.id);
              const borderColor = BORDER_COLORS[idx % BORDER_COLORS.length];

              return (
                <div
                  key={s.id}
                  className={`border-l-4 ${borderColor} rounded-r-2xl border border-gray-100 overflow-hidden shadow-sm transition-shadow hover:shadow-md`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          {s.name || `Stakeholder #${idx + 1}`}
                        </p>
                        {result.pvTotal > 0 && (
                          <p className="text-xs text-gray-400">
                            Net Y1: {formatRp(result.netYear1)} · NPV: {formatRp(result.pvTotal)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini percent indicators */}
                      <div className="hidden md:flex items-center gap-1.5">
                        {[
                          { label: "DW", value: s.deadweight },
                          { label: "Att", value: s.attribution },
                          { label: "Disp", value: s.displacement },
                        ].map(({ label, value }) => (
                          <span
                            key={label}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500"
                          >
                            {label} {value}%
                          </span>
                        ))}
                      </div>
                      <div
                        className={`w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Animated Content */}
                  <div
                    className="overflow-hidden transition-[max-height] duration-300 ease-in-out bg-slate-50/50"
                    style={{ maxHeight: isOpen ? "800px" : "0px" }}
                  >
                    <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Kolom kiri */}
                      <div className="space-y-3">
                        <div>
                          <label className="label">Nama Stakeholder &amp; Outcome</label>
                          <input
                            type="text"
                            className="input-field"
                            value={s.name}
                            onChange={(e) => updateStakeholder(s.id, "name", e.target.value)}
                            placeholder={`Stakeholder #${idx + 1}`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Jumlah Unit</label>
                            <input
                              type="number"
                              className="input-field"
                              value={s.quantity}
                              min={0}
                              onChange={(e) => updateStakeholder(s.id, "quantity", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="label">Durasi (tahun)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={s.duration}
                              min={1}
                              max={20}
                              onChange={(e) => updateStakeholder(s.id, "duration", parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label">Proksi Finansial (Rp/unit)</label>
                          <input
                            type="number"
                            className="input-field"
                            value={s.proxy}
                            min={0}
                            step={100_000}
                            onChange={(e) => updateStakeholder(s.id, "proxy", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Mini result card */}
                        <div className="rounded-xl bg-white border border-gray-100 p-3 space-y-2 shadow-sm">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Gross Outcome</span>
                            <span className="font-semibold text-gray-600">{formatRp(result.grossOutcome)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Net Tahun 1</span>
                            <span className="font-semibold text-gray-700">{formatRp(result.netYear1)}</span>
                          </div>
                          <div className="h-px bg-gray-100" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">
                              Total NPV ({s.duration} thn)
                            </span>
                            <span className="font-bold text-primary-600">{formatRp(result.pvTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Kolom kanan */}
                      <div className="space-y-4">
                        <SliderField
                          label="Deadweight (%)"
                          hint="Dampak yang terjadi tanpa program ini"
                          value={s.deadweight}
                          onChange={(v) => updateStakeholder(s.id, "deadweight", v)}
                        />
                        <SliderField
                          label="Attribution (%)"
                          hint="Kontribusi dari pihak / program lain"
                          value={s.attribution}
                          onChange={(v) => updateStakeholder(s.id, "attribution", v)}
                        />
                        <SliderField
                          label="Displacement (%)"
                          hint="Dampak negatif tidak disengaja"
                          value={s.displacement}
                          onChange={(v) => updateStakeholder(s.id, "displacement", v)}
                        />
                        <SliderField
                          label="Drop-off / tahun (%)"
                          hint="Penurunan dampak tiap tahun setelah tahun 1"
                          value={s.dropoff}
                          onChange={(v) => updateStakeholder(s.id, "dropoff", v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SROI Result ── */}
        <div className="card animate-fade-up">
          <h2 className="section-title">Hasil Kalkulasi SROI</h2>

          {/* Tabel ringkas */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Stakeholder</th>
                  <th className="text-right px-3 py-3">Gross</th>
                  <th className="text-right px-3 py-3">DW</th>
                  <th className="text-right px-3 py-3">Att</th>
                  <th className="text-right px-3 py-3">Disp</th>
                  <th className="text-right px-3 py-3">Drop</th>
                  <th className="text-right px-3 py-3">Dur</th>
                  <th className="text-right px-3 py-3">Net Y1</th>
                  <th className="text-right px-4 py-3">NPV Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-700">
                      {r.name || `Stakeholder #${i + 1}`}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{formatRp(r.grossOutcome)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{r.deadweight}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{r.attribution}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{r.displacement}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{r.dropoff}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-500">{r.duration}thn</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 font-medium text-xs">{formatRp(r.netYear1)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary-600 text-sm">{formatRp(r.pvTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary-50 font-bold border-t-2 border-primary-100">
                  <td className="px-4 py-3 text-primary-700">Total</td>
                  <td className="px-3 py-3 text-right text-primary-600 text-xs">{formatRp(totalGross)}</td>
                  <td colSpan={5} />
                  <td className="px-3 py-3 text-right text-primary-600 text-xs">{formatRp(totalNetYear1)}</td>
                  <td className="px-4 py-3 text-right text-primary-700">{formatRp(totalNPV)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Parameters + SROI Result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Total Investasi (Rp)</label>
                <input
                  type="number"
                  className="input-field"
                  value={investment}
                  min={0}
                  step={1_000_000}
                  onChange={(e) => setInvestment(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="label">Discount Rate (%)</label>
                <input
                  type="number"
                  className="input-field"
                  value={discountRate}
                  min={0}
                  max={30}
                  step={0.5}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                />
                <p className="text-[11px] text-gray-400 mt-1">Lazim: 3.5–10%</p>
              </div>
            </div>

            {/* Big SROI display */}
            <div className={`rounded-2xl p-5 border-2 ${sroi_npv >= 3 ? "border-primary-200 bg-primary-50" : sroi_npv >= 1 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    SROI Tahun 1
                  </p>
                  <p className="text-[11px] text-gray-400 mb-2">(referensi, tanpa diskonto)</p>
                  <p className="text-2xl font-bold text-gray-600 tabular-nums">
                    {sroi_year1.toFixed(2)}x
                  </p>
                </div>
                <div className="text-center border-l border-white/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    SROI NPV
                  </p>
                  <p className="text-[11px] text-gray-400 mb-1">disc. {discountRate}%</p>
                  <p className={`text-4xl font-extrabold tabular-nums ${sroiStyle.text}`}>
                    <span ref={sroiRef}>{sroi_npv.toFixed(2)}</span>
                    <span className="text-lg">x</span>
                  </p>
                  <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${sroiStyle.badge}`}>
                    {sroiStyle.label}
                  </span>
                </div>
              </div>

              {/* SROI bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>8+</span>
                </div>
                <div className="h-2 rounded-full bg-white/70 relative">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${sroiStyle.bar}`}
                    style={{ width: `${Math.min(100, (sroi_npv / 8) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Setiap <span className="font-bold">Rp 1</span> yang diinvestasikan menghasilkan nilai sosial{" "}
                  <span className={`font-bold ${sroiStyle.text}`}>
                    Rp {sroi_npv.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Metodologi note */}
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
            <p className="font-bold text-blue-800">Formula SROI Standar (SROI Network):</p>
            <p>Net Y1 = Gross × (1−DW) × (1−Attribution) × (1−Displacement)</p>
            <p>Net_t = Net_Y1 × (1−drop-off)^(t−1) &nbsp;→ drop-off mulai tahun 2</p>
            <p>NPV = Σ [ Net_t / (1+r)^t ] untuk t = 1 s.d. durasi stakeholder</p>
            <p className="font-semibold">SROI = Total NPV semua stakeholder / Total Investasi</p>
          </div>
        </div>

        {/* ── Proyeksi 3 Tahun ── */}
        <div className="card animate-fade-up">
          <h2 className="section-title">Skenario Proyeksi 3 Tahun</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <SliderField
              label="Pertumbuhan Tahunan (%)"
              value={growth}
              min={0}
              max={50}
              showBar={false}
              onChange={setGrowth}
            />
            <SliderField
              label="Drop-off Tahunan (%)"
              value={annualDropoff}
              min={0}
              max={50}
              showBar={false}
              onChange={setAnnualDropoff}
            />
            <div>
              <label className="label">Investasi Tahunan (Rp)</label>
              <input
                type="number"
                className="input-field"
                value={investmentYearly}
                min={0}
                step={1_000_000}
                onChange={(e) => setInvestmentYearly(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Logistic parameters */}
          <details className="group mb-6">
            <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-2 select-none">
              <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-xs group-open:rotate-90 transition-transform">
                ▶
              </span>
              Parameter Logistic Growth
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="label">Kapasitas Maksimum (L)</label>
                <input
                  type="number"
                  className="input-field"
                  value={L}
                  min={0}
                  step={100_000_000}
                  onChange={(e) => setL(parseFloat(e.target.value) || 0)}
                />
              </div>
              <SliderField
                label="Laju Pertumbuhan (k)"
                value={k}
                min={0.1}
                max={3.0}
                step={0.1}
                showBar={false}
                onChange={setK}
              />
              <SliderField
                label={"Titik Tengah (x\u2080)"}
                value={x0}
                min={1}
                max={5}
                step={1}
                showBar={false}
                onChange={setX0}
              />
            </div>
          </details>

          {/* Projection cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {projection.map((row) => (
              <div key={row.year} className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Tahun {row.year}
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Linear", value: row.cumSroi_linear, color: "text-primary-600" },
                    { label: "Exponential", value: row.cumSroi_exponential, color: "text-blue-600" },
                    { label: "Logistic", value: row.cumSroi_logistic, color: "text-amber-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>
                        {value.toFixed(2)}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Full projection table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Tahun</th>
                  <th className="text-right px-3 py-3">PV Linear</th>
                  <th className="text-right px-3 py-3 text-primary-600">SROI Kum. Linear</th>
                  <th className="text-right px-3 py-3">PV Exponential</th>
                  <th className="text-right px-3 py-3 text-blue-600">SROI Kum. Exp</th>
                  <th className="text-right px-3 py-3">PV Logistic</th>
                  <th className="text-right px-4 py-3 text-amber-600">SROI Kum. Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projection.map((row, i) => (
                  <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-gray-700">Tahun {row.year}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{formatRp(row.pv_linear)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-primary-600 tabular-nums">{row.cumSroi_linear.toFixed(2)}x</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{formatRp(row.pv_exponential)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-blue-600 tabular-nums">{row.cumSroi_exponential.toFixed(2)}x</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{formatRp(row.pv_logistic)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-amber-600 tabular-nums">{row.cumSroi_logistic.toFixed(2)}x</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 text-sm">
              Grafik Perbandingan SROI
            </h3>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(["cumulative", "annual"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartMode === mode
                      ? "bg-white shadow text-gray-800"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {mode === "cumulative" ? "Kumulatif" : "Tahunan"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4">
            <ProjectionChart data={projection} mode={chartMode} />
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Semua nilai menggunakan discount rate {discountRate}% · PV = Present Value
          </p>
        </div>
      </main>
    </div>
  );
}
