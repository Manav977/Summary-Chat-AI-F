import { useEffect, useRef } from 'react';

export function useAutoScroll(primaryDependency, secondaryDependency) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.scrollTop = ref.current.scrollHeight;
  }, [primaryDependency, secondaryDependency]);

  return ref;
}
