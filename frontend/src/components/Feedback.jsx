import React, { useEffect, useRef } from "react";
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
  text = "No records yet. Add your first record to get started.",
}) {
  return (
    <div className="empty">
      <ClipboardList size={30} />
      <h3>Nothing here yet</h3>
      <p>{text}</p>
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const d = dialog.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
