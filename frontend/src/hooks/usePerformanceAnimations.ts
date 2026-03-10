import { usePerf } from '../contexts/PerfContext';

export const usePerformanceAnimations = () => {
  const { lowPerf, suggested } = usePerf();
  
  return {
    shouldAnimate: !lowPerf,
    isLowPerf: lowPerf,
    isMediumPerf: suggested && !lowPerf,
    isHighPerf: !suggested && !lowPerf,
    getDuration: (base: number) => lowPerf ? 0 : base,
  };
};
