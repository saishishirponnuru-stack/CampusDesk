import { useEffect, useContext, useId } from "react";
import { UnsavedContext } from "../components/UnsavedWork";
export function useUnsavedChanges(dirty) {
  const context = useContext(UnsavedContext),
    id = useId();
  useEffect(() => {
    context?.register(id, dirty);
    return () => context?.register(id, false);
  }, [context, id, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event) => {
      const link = event.target.closest?.("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.href === location.href ||
        new URL(link.href).hash
      )
        return;
      if (context && new URL(link.href).origin === location.origin) return;
      if (!window.confirm("Discard your unsaved changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, context]);
}
