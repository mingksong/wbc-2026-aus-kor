import { useState, useMemo } from 'react';
import { AUS_PITCHES, AUS_PITCHERS } from './data/ausPitchData';
import PitcherSelector from './components/PitcherSelector';
import PitchLocationChart from './components/PitchLocationChart';
import PitchLegend from './components/PitchLegend';
import TwoStrikeAnalysis from './components/TwoStrikeAnalysis';

export default function App() {
  const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null);

  const filteredPitches = useMemo(() => {
    if (!selectedPitcher) return AUS_PITCHES;
    return AUS_PITCHES.filter(p => p.pitcher === selectedPitcher);
  }, [selectedPitcher]);

  const pitcherInfo = useMemo(() => {
    if (!selectedPitcher) return null;
    return AUS_PITCHERS.find(p => p.name === selectedPitcher) ?? null;
  }, [selectedPitcher]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">&#x1F1E6;&#x1F1FA;</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              WBC 2026 호주 투수 피치맵
            </h1>
          </div>
          <p className="text-xs text-slate-400 ml-11">
            Pool C | vs Chinese Taipei (W 3-0) | vs Czechia (W 5-1) | vs Japan (L 3-4) | 총 396구
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Pitcher Selector */}
        <section>
          <PitcherSelector selected={selectedPitcher} onSelect={setSelectedPitcher} />
        </section>

        {/* Pitcher Info */}
        {pitcherInfo && (
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">
              {pitcherInfo.name}
              <span className="text-sm text-slate-400 ml-2">
                ({pitcherInfo.hand === 'L' ? '좌투' : '우투'})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {pitcherInfo.games.join(' & ')} | {pitcherInfo.pitchCount}구
            </p>
          </div>
        )}

        {/* Pitch Location Charts - 3 panels */}
        <section>
          <PitchLocationChart pitches={filteredPitches} />
        </section>

        {/* Pitch Legend */}
        <section>
          <PitchLegend pitches={filteredPitches} />
        </section>

        {/* Two-Strike Analysis */}
        <section>
          <TwoStrikeAnalysis pitches={filteredPitches} />
        </section>

        {/* Footer */}
        <footer className="text-center text-[10px] text-slate-600 py-4 border-t border-slate-800">
          Data: MLB Stats API (Statcast) | Pitcher&apos;s perspective view
        </footer>
      </main>
    </div>
  );
}
