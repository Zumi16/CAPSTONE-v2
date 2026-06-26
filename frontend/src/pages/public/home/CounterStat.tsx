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
    <div className="stat-box">
      <div className="counter" ref={ref}>
        {value.toLocaleString()}
      </div>
      <p>{label}</p>
    </div>
  );
}
