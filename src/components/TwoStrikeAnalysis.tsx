import { useState } from 'react';
import { AusPitch } from '../data/ausPitchData';
import { PITCH_COLORS, PITCH_NAMES_KR, getResultColor } from '../utils/pitchColors';

type BatSideFilter = 'ALL' | 'L' | 'R';

interface TwoStrikeAnalysisProps {
  pitches: AusPitch[];
}

const SZ_HALF = 0.7083;
const SVG_W = 240;
const SVG_H = 280;
const MARGIN = { top: 15, right: 15, bottom: 25, left: 15 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;
const X_MIN = -2.0;
const X_MAX = 2.0;
const Z_MIN = 0.5;
const Z_MAX = 4.5;

function toSvgX(pX: number): number {
  const displayX = pX * -1;
  return MARGIN.left + ((displayX - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

function toSvgY(pZ: number): number {
  return MARGIN.top + ((Z_MAX - pZ) / (Z_MAX - Z_MIN)) * PLOT_H;
}

function ZoneHeatmap({ pitches }: { pitches: AusPitch[] }) {
  const total = pitches.length;
  if (total === 0) return <div className="text-sm text-slate-500">데이터 없음</div>;

  // Classify each pitch into 3x3 grid based on pX and pZ
  // Horizontal (pitcher's view, mirrored): IN / MID / OUT relative to average szTop/szBot
  // Vertical: HIGH / CENTER / LOW
  const avgSzTop = pitches.reduce((s, p) => s + p.szTop, 0) / total;
  const avgSzBot = pitches.reduce((s, p) => s + p.szBot, 0) / total;
  const szHeight = avgSzTop - avgSzBot;
  const thirdH = szHeight / 3;

  // Zone boundaries
  const xThird = (SZ_HALF * 2) / 3;
  const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => 0));
  // grid[row][col]: row=0 HIGH, row=2 LOW; col=0 LEFT(pitcher view), col=2 RIGHT(pitcher view)

  for (const p of pitches) {
    // Vertical zone
    let row: number;
    if (p.pZ >= avgSzTop - thirdH) row = 0; // HIGH
    else if (p.pZ >= avgSzBot + thirdH) row = 1; // CENTER
    else row = 2; // LOW

    // Horizontal zone (pitcher's view: mirror pX)
    const px = p.pX * -1;
    let col: number;
    if (px <= -xThird) col = 0;
    else if (px <= xThird) col = 1;
    else col = 2;

    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      grid[row][col]++;
    }
  }

  const maxCount = Math.max(...grid.flat(), 1);
  const rowLabels = ['HIGH', 'CENTER', 'LOW'];
  const colLabels = ['L', 'MID', 'R'];

  return (
    <div>
      <h4 className="text-xs text-slate-400 font-medium mb-2">코스 히트맵 (3x3)</h4>
      <div className="inline-block">
        {/* Column headers */}
        <div className="flex">
          <div className="w-14" />
          {colLabels.map(label => (
            <div key={label} className="w-16 text-center text-[10px] text-slate-500 font-medium pb-1">
              {label}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {grid.map((row, ri) => (
          <div key={ri} className="flex items-center">
            <div className="w-14 text-right pr-2 text-[10px] text-slate-500 font-medium">
              {rowLabels[ri]}
            </div>
            {row.map((count, ci) => {
              const opacity = count > 0 ? 0.2 + (count / maxCount) * 0.8 : 0.05;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <div
                  key={ci}
                  className="w-16 h-14 flex flex-col items-center justify-center border border-slate-700/50 rounded"
                  style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})` }}
                >
                  <span className="text-base font-bold text-white">{count}</span>
                  <span className="text-[9px] text-slate-300">{pct}%</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PitchTypeDistribution({ pitches }: { pitches: AusPitch[] }) {
  const total = pitches.length;
  if (total === 0) return null;

  const typeCounts = new Map<string, number>();
  for (const p of pitches) {
    typeCounts.set(p.pitchCode, (typeCounts.get(p.pitchCode) ?? 0) + 1);
  }
  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h4 className="text-xs text-slate-400 font-medium mb-2">결정구 구종</h4>
      <div className="space-y-1.5">
        {sorted.map(([code, count]) => {
          const pct = (count / total) * 100;
          return (
            <div key={code} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-16">
                {PITCH_NAMES_KR[code] ?? code}
              </span>
              <div className="flex-1 h-5 bg-slate-900 rounded overflow-hidden">
                <div
                  className="h-full rounded flex items-center pl-2"
                  style={{
                    width: `${Math.max(pct, 8)}%`,
                    backgroundColor: PITCH_COLORS[code] ?? '#6b7280',
                  }}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PutawayResults({ pitches }: { pitches: AusPitch[] }) {
  const total = pitches.length;
  if (total === 0) return null;

  // Count results
  let strikeouts = 0;
  let inPlayOuts = 0;
  let hits = 0;
  let other = 0;

  // Only count the LAST pitch of each at-bat in our filtered set
  // For 2-strike pitches, check abResult
  const abResults = new Set<string>();
  for (const p of pitches) {
    // Check if this pitch ended the at-bat
    const isTerminal = ['Strikeout', 'Strikeout Double Play'].includes(p.abResult) ||
      p.callDesc.includes('In play');
    if (!isTerminal) continue;

    const key = `${p.batter}-${p.abResult}-${p.game}`;
    if (abResults.has(key)) continue;
    abResults.add(key);

    if (p.abResult.includes('Strikeout')) strikeouts++;
    else if (['Groundout', 'Flyout', 'Lineout', 'Pop Out', 'Forceout',
      'Grounded Into DP', 'Sac Fly', 'Sac Bunt', 'Fielders Choice',
      'Fielders Choice Out', 'Double Play'].includes(p.abResult)) inPlayOuts++;
    else if (['Single', 'Double', 'Triple', 'Home Run'].includes(p.abResult)) hits++;
    else other++;
  }

  const abTotal = strikeouts + inPlayOuts + hits + other;
  if (abTotal === 0) return null;

  const stats = [
    { label: '삼진', count: strikeouts, color: '#22c55e' },
    { label: '인플레이 아웃', count: inPlayOuts, color: '#60a5fa' },
    { label: '피안타', count: hits, color: '#ef4444' },
  ];

  return (
    <div>
      <h4 className="text-xs text-slate-400 font-medium mb-2">결정구 결과</h4>
      <div className="space-y-1">
        {stats.map(({ label, count, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color }}>{count}</span>
              <span className="text-[10px] text-slate-500">
                ({abTotal > 0 ? ((count / abTotal) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoStrikePitchMap({ pitches }: { pitches: AusPitch[] }) {
  const avgSzTop = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szTop, 0) / pitches.length : 3.5;
  const avgSzBot = pitches.length > 0
    ? pitches.reduce((s, p) => s + p.szBot, 0) / pitches.length : 1.5;

  const szLeft = toSvgX(SZ_HALF);
  const szRight = toSvgX(-SZ_HALF);
  const szTopY = toSvgY(avgSzTop);
  const szBotY = toSvgY(avgSzBot);

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-xs text-slate-400 font-medium mb-1">결정구 피치맵</h4>
      <svg width={SVG_W} height={SVG_H} className="rounded-lg">
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#0f172a" rx={8} />
        <rect
          x={szLeft} y={szTopY}
          width={szRight - szLeft} height={szBotY - szTopY}
          fill="none" stroke="#475569" strokeWidth={2}
        />
        {[1, 2].map(i => (
          <g key={`grid-${i}`}>
            <line
              x1={szLeft + (szRight - szLeft) * i / 3} y1={szTopY}
              x2={szLeft + (szRight - szLeft) * i / 3} y2={szBotY}
              stroke="#334155" strokeWidth={1} strokeDasharray="3,3"
            />
            <line
              x1={szLeft} y1={szTopY + (szBotY - szTopY) * i / 3}
              x2={szRight} y2={szTopY + (szBotY - szTopY) * i / 3}
              stroke="#334155" strokeWidth={1} strokeDasharray="3,3"
            />
          </g>
        ))}
        {pitches.map((p, idx) => (
          <circle
            key={idx}
            cx={toSvgX(p.pX)} cy={toSvgY(p.pZ)} r={8}
            fill={PITCH_COLORS[p.pitchCode] ?? '#6b7280'}
            stroke={getResultColor(p.callDesc)}
            strokeWidth={2}
            opacity={0.9}
          />
        ))}
        <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fill="#64748b" fontSize={10}>
          Pitcher&apos;s View
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 mt-1">{pitches.length} pitches</span>
    </div>
  );
}

const BAT_SIDE_TABS: { value: BatSideFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'L', label: 'vs 좌타' },
  { value: 'R', label: 'vs 우타' },
];

export default function TwoStrikeAnalysis({ pitches }: TwoStrikeAnalysisProps) {
  const [batSideFilter, setBatSideFilter] = useState<BatSideFilter>('ALL');
  const twoStrikePitches = pitches.filter(p => p.strikes === 2);
  const filtered = batSideFilter === 'ALL'
    ? twoStrikePitches
    : twoStrikePitches.filter(p => p.batSide === batSideFilter);

  if (twoStrikePitches.length === 0) {
    return (
      <div className="text-center text-slate-500 text-sm py-4">
        2스트라이크 데이터 없음
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-200">
          2스트라이크 결정구 분석
          <span className="text-slate-500 font-normal ml-2">
            ({filtered.length}구 / 전체 {pitches.length}구)
          </span>
        </h3>
        {/* Bat side toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {BAT_SIDE_TABS.map(tab => {
            const count = tab.value === 'ALL'
              ? twoStrikePitches.length
              : twoStrikePitches.filter(p => p.batSide === tab.value).length;
            const isActive = batSideFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setBatSideFilter(tab.value)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab.label}
                <span className={`ml-1 text-[10px] ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-4">
          해당 조건의 데이터 없음
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pitch map */}
          <div className="flex justify-center">
            <TwoStrikePitchMap pitches={filtered} />
          </div>
          {/* Right: Analysis */}
          <div className="space-y-5">
            <PitchTypeDistribution pitches={filtered} />
            <ZoneHeatmap pitches={filtered} />
            <PutawayResults pitches={filtered} />
          </div>
        </div>
      )}
    </div>
  );
}
