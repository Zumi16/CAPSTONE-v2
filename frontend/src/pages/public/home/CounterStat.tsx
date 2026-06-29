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

  // Reserve the final number's width from the start so the box doesn't resize
  // (and the row doesn't re-wrap) while counting up from 0.
  const reserve = `${target.toLocaleString().length}ch`;

  return (
    <div className="stat-box">
      <div className="counter" ref={ref} style={{ minWidth: reserve }}>
        {value.toLocaleString()}
      </div>
      <p>{label}</p>
    </div>
  );
}
