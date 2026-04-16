'use client';

interface Props {
  stats: {
    total: number;
    avgScore: number;
    byNiche: Record<string, number>;
    emailVerified: number;
  };
}

export default function DashboardStats({ stats }: Props) {
  const Stat = ({ title, value, sub }: any) => (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat title="Total Leads" value={stats.total} sub={`Avg score: ${stats.avgScore.toFixed(1)}`} />
      <Stat title="Email Verified" value={stats.emailVerified} sub={`${((stats.emailVerified / stats.total) * 100 || 0).toFixed(0)}%`} />
      <Stat title="Top Niche" value={Object.entries(stats.byNiche || {}).sort(([,a],[,b]) => b - a)[0]?.[0]?.replace('_', ' ') || 'N/A'} />
      <Stat title="Niches" value={Object.keys(stats.byNiche || {}).length} />
    </div>
  );
}
