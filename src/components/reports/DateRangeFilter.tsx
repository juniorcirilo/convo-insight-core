import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

type FilterPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

interface DateRangeFilterProps {
  selectedPeriod: FilterPeriod;
  setSelectedPeriod: (period: FilterPeriod) => void;
  periodLabel: string;
  customRange: { from: Date; to: Date } | null;
  setCustomRange: (range: { from: Date; to: Date } | null) => void;
}

export function DateRangeFilter({
  selectedPeriod,
  setSelectedPeriod,
  periodLabel,
  customRange,
  setCustomRange
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {(['today', 'yesterday', 'last7days', 'last30days'] as FilterPeriod[]).map((period) => (
        <Button
          key={period}
          variant={selectedPeriod === period ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod(period)}
        >
          {period === 'today' && 'Hoje'}
          {period === 'yesterday' && 'Ontem'}
          {period === 'last7days' && '7 dias'}
          {period === 'last30days' && '30 dias'}
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={selectedPeriod === 'custom' ? 'default' : 'outline'} size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedPeriod === 'custom' ? periodLabel : 'Personalizado'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange ? { from: customRange.from, to: customRange.to } : undefined}
            onSelect={(range: DateRange | undefined) => {
              if (range?.from && range?.to) {
                setCustomRange({ from: range.from, to: range.to });
                setSelectedPeriod('custom');
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
