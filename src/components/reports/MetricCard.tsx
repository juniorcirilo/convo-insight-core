import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
  info?: string;
  trend?: {
    value: number;
    isPercentage?: boolean;
  };
}

export function MetricCard({ title, value, icon: Icon, className, children, info, trend }: MetricCardProps) {
  const getTrendDisplay = () => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;
    const isNeutral = trend.value === 0;

    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const trendColor = isPositive 
      ? 'text-success' 
      : isNegative 
        ? 'text-destructive' 
        : 'text-muted-foreground';

    const displayValue = trend.isPercentage 
      ? `${Math.abs(trend.value).toFixed(1)}%`
      : Math.abs(trend.value).toFixed(0);

    return (
      <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
        <TrendIcon className="h-3 w-3" />
        <span>{displayValue}</span>
        <span className="text-muted-foreground">vs período anterior</span>
      </div>
    );
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {info && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <p className="text-xs">{info}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {getTrendDisplay()}
        {children}
      </CardContent>
    </Card>
  );
}
