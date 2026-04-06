interface CounterProps {
  total: number;
  session: number;
}

export function Counter({ total, session }: CounterProps) {
  return (
    <div className="text-center py-3">
      <div className="text-3xl font-bold text-blue-400">
        {formatNumber(total)}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        ads blocked ({formatNumber(session)} this session)
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
