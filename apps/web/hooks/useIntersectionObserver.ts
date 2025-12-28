import { useCallback, useEffect, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px' } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  const targetRef = useCallback((nextNode: HTMLDivElement | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, threshold, rootMargin]);

  return { targetRef, isIntersecting };
}
