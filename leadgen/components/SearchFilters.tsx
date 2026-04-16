'use client';
import { Niche } from '@/types/lead';

interface Props {
  county: string;
  onCountyChange: (c: string) => void;
  niches: Niche[];
  selectedNiches: Niche[];
  onNichesChange: (n: Niche[]) => void;
  minScore: number;
  onMinScoreChange: (s: number) => void;
  loading?: boolean;
}

export default function SearchFilters(props: Props) {
  const toggle = (niche: Niche) => {
    if (props.selectedNiches.includes(niche)) {
      props.onNichesChange(props.selectedNiches.filter((n) => n !== niche));
    } else {
      props.onNichesChange([...props.selectedNiches, niche]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">County</label>
        <input type="text" value={props.county} onChange={(e) => props.onCountyChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Niches</label>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
          {props.niches.map((niche) => (
            <label key={niche} className="flex items-center gap-2">
              <input type="checkbox" checked={props.selectedNiches.includes(niche)}
                onChange={() => toggle(niche)} disabled={props.loading} />
              <span className="text-sm capitalize">{niche.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Min Quality Score: {props.minScore}</label>
        <input type="range" min="0" max="100" value={props.minScore}
          onChange={(e) => props.onMinScoreChange(parseInt(e.target.value))} className="w-full" />
      </div>
    </div>
  );
}
