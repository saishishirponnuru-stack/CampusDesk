import { useEffect } from "react";
export function useUnsavedChanges(dirty) {
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
  }, [dirty]);
}
