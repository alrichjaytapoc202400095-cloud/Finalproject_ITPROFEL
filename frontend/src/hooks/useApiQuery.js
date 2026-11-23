import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Abortable data-fetching hook.
 *
 * - `loader({ signal })` must call the API with the provided AbortSignal.
 * - The AbortController is aborted on unmount / dependency change, so no
 *   state updates happen on a screen that is already gone.
 * - `refetch()` re-runs the loader (used by error-state retry buttons).
 */
export function useApiQuery(loader, deps = [], { enabled = true, initialData = null } = {}) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [state, setState] = useState({
    data: initialData,
    meta: null,
    loading: enabled,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState((previous) => ({ ...previous, loading: false }));
      return undefined;
    }

    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    Promise.resolve()
      .then(() => loaderRef.current({ signal: controller.signal }))
      .then((result) => {
        if (controller.signal.aborted) return;
        const meta = result && !Array.isArray(result) ? result.meta ?? null : result?.meta ?? null;
        setState({ data: result, meta, loading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return;
        setState({ data: null, meta: null, loading: false, error });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, version, ...deps]);

  const refetch = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((previous) => ({
        ...previous,
        data: typeof updater === 'function' ? updater(previous.data) : updater,
      })),
    []
  );

  return { ...state, refetch, setData };
}
