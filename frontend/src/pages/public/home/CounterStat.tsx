import { useCountUp } from "@/lib/useCountUp";

type CounterStatProps = {
  target: number;
  label: string;
};

/**
 * One animated statistic in the "PUP PQ at a glance" section. The number
 * counts up from zero the first time it scrolls into view.
 */
export function CounterStat({ target, label }: CounterStatProps) {
  const { ref, value } = useCountUp(target);

  return (
    <div className="min-w-[140px] px-5 py-2 sm:border-l sm:border-white/20">
      <div ref={ref} className="text-5xl font-bold text-gold sm:text-6xl lg:text-7xl">
        {value.toLocaleString()}
      </div>
      <p className="mt-2 text-sm sm:text-base">{label}</p>
    </div>
  );
}
