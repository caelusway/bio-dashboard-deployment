import { PlatformIcon } from './PlatformIcon';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  platform?: string;
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  platform,
  subtitle,
}: MetricCardProps) {
  const changeColor = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
  }[changeType];

  return (
    <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all shadow-lg hover:shadow-xl">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-400 mb-2">{title}</p>
          <p class="text-3xl font-bold text-white mb-2">{value}</p>
          {change && (
            <div class={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded ${
              changeType === 'positive' ? 'bg-green-500/10 text-green-400' :
              changeType === 'negative' ? 'bg-red-500/10 text-red-400' :
              'bg-gray-500/10 text-gray-400'
            }`}>
              {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '•'}{' '}
              {change}
            </div>
          )}
          {subtitle && <p class="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
        {platform ? (
          <div class="text-blue-500/40">
            <PlatformIcon platform={platform} size="xl" />
          </div>
        ) : icon ? (
          <div class="text-5xl opacity-40">{icon}</div>
        ) : null}
      </div>
    </div>
  );
}
