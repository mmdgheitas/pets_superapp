import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  destructive: 'bg-destructive-bg text-destructive',
  money: 'bg-money-bg text-money',
} as const;

/**
 * Shared stat tile for admin/seller dashboards. Consolidates what used to be
 * two near-identical inline components (each with its own arbitrary hex-color
 * math) into one, using the app's semantic color tokens so a given tone always
 * carries the same meaning as everywhere else (recognition over recall).
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'primary',
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <Card className={cn('transition-shadow hover:shadow-raised', className)}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-xl font-extrabold num-tabular', tone === 'money' && 'text-money')}>{value}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
