import { useEffect, useState } from "react";

function useIterator(maxIndex: number, initial = 0) {
  const normalizedMax = Number.isFinite(maxIndex) ? Math.max(0, Math.floor(maxIndex)) : 0;
  const normalize = (value: number) => (Number.isFinite(value) ? Math.floor(value) : 0);
  const clamp = (value: number) => Math.min(Math.max(normalize(value), 0), normalizedMax);
  const [current, setCurrent] = useState(() => clamp(initial));

  useEffect(() => {
    setCurrent((current) => Math.min(current, normalizedMax));
  }, [normalizedMax]);

  return {
    current,
    isFirst: current === 0,
    isLast: current === normalizedMax,
    next: () => setCurrent((v) => clamp(v + 1)),
    prev: () => setCurrent((v) => clamp(v - 1)),
    set: (value: number) => setCurrent(clamp(value)),
  };
}

export default useIterator;
