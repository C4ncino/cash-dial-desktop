import { useEffect, useState } from "react";

function useIterator(maxIndex: number, initial = 0) {
  const [current, setCurrent] = useState(initial);

  const clamp = (value: number) => Math.min(Math.max(value, 0), maxIndex);

  useEffect(() => {
    setCurrent((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  return {
    current,
    isFirst: current === 0,
    isLast: current === maxIndex,
    next: () => setCurrent((v) => clamp(v + 1)),
    prev: () => setCurrent((v) => clamp(v - 1)),
    set: (value: number) => setCurrent(clamp(value)),
  };
}

export default useIterator;
