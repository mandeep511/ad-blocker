import { Toggle } from './Toggle';

interface SiteToggleProps {
  hostname: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SiteToggle({ hostname, enabled, onToggle, disabled }: SiteToggleProps) {
  return (
    <div className="border-t border-gray-700 pt-2">
      <Toggle
        label={hostname}
        checked={enabled}
        onChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
