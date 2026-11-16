import React, { useEffect, useRef, useId } from "react";
import { Illustration } from "./Brand";
import { AlertCircle, ClipboardList, X } from "lucide-react";
export function Message({ error, children }) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={error ? "message error" : "message"}
    >
      {error ? <AlertCircle size={17} /> : null}
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading records…
    </div>
  );
}
export function Empty({
  kind = "records",
  text = "No records yet. Add your first record to get started.",
}) {
  return (
    <div className="empty">
      <Illustration kind={kind} />
      <h3>Nothing here yet</h3>
      <p>{text}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
  busy = false,
}) {
  const titleId = useId();
  const dialog = useRef(null);
  useEffect(() => {
    const d = dialog.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={className}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
