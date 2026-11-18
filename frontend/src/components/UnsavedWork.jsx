import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBlocker } from "react-router-dom";
export const UnsavedContext = createContext(null);
export const DirtyContext = createContext(false);
export function UnsavedWorkProvider({ children }) {
  const [drafts, setDrafts] = useState({});
  const register = useCallback(
    (id, dirty) =>
      setDrafts((old) => {
        if (!!old[id] === dirty) return old;
        const next = { ...old };
        if (dirty) next[id] = true;
        else delete next[id];
        return next;
      }),
    [],
  );
  const blocker = useBlocker(Object.values(drafts).some(Boolean));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard your unsaved changes?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  const context = useMemo(() => ({ register }), [register]);
  return (
    <UnsavedContext.Provider value={context}>
      <DirtyContext.Provider value={Object.values(drafts).some(Boolean)}>
        {children}
      </DirtyContext.Provider>
    </UnsavedContext.Provider>
  );
}
