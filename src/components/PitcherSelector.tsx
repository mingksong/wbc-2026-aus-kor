import { AUS_PITCHERS, AUS_PITCHES } from '../data/ausPitchData';

interface PitcherSelectorProps {
  selected: string | null;
  onSelect: (name: string | null) => void;
}

export default function PitcherSelector({ selected, onSelect }: PitcherSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {AUS_PITCHERS.map(p => {
        const isActive = selected === p.name;
        const lastName = p.name.split(' ').slice(-1)[0];
        return (
          <button
            key={p.name}
            onClick={() => onSelect(isActive ? null : p.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isActive
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
          >
            {lastName}
            <span className={`ml-1 text-[10px] ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
              ({p.hand}) {p.pitchCount}
            </span>
          </button>
        );
      })}
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          selected === null
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
        }`}
      >
        전체
        <span className={`ml-1 text-[10px] ${selected === null ? 'text-emerald-200' : 'text-slate-500'}`}>
          ({AUS_PITCHES.length})
        </span>
      </button>
    </div>
  );
}
