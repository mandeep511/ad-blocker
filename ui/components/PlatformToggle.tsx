import { Toggle } from './Toggle';

interface PlatformToggleProps {
  platforms: { hotstar: boolean; prime: boolean; netflix: boolean };
  onToggle: (platform: 'hotstar' | 'prime' | 'netflix', enabled: boolean) => void;
  disabled?: boolean;
}

const PLATFORM_LABELS = {
  hotstar: 'JioHotstar',
  prime: 'Prime Video',
  netflix: 'Netflix',
} as const;

export function PlatformToggle({ platforms, onToggle, disabled }: PlatformToggleProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        OTT Platforms
      </div>
      {(Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>).map(
        (platform) => (
          <Toggle
            key={platform}
            label={PLATFORM_LABELS[platform]}
            checked={platforms[platform]}
            onChange={(checked) => onToggle(platform, checked)}
            disabled={disabled}
          />
        ),
      )}
    </div>
  );
}
