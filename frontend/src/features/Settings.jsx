import React, { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { LogOut } from "lucide-react";
import { api } from "../api";
import { Message } from "../components/Feedback";
import { Heading } from "../components/WorkspaceUI";
import { GradeThresholdEditor } from "../components/GradeThresholdEditor";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { DirtyContext } from "../components/UnsavedWork";
import { ThemeSettings } from "../components/Theme";
export default function SettingsPage({ me, logout }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm({ defaultValues: { currentPassword: "", newPassword: "" } });
  const unsaved = useContext(DirtyContext);
  useUnsavedChanges(isDirty);
  const password = useMutation({
    mutationFn: (v) =>
      api("/auth/password", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      reset();
      logout();
    },
  });
  return (
    <>
      <Heading
        title="Settings"
        description="Your account, academic preferences, and workspace information."
      />
      {me.error && <Message error>{me.error.message}</Message>}
      <section className="panel setting appearance-setting">
        <div>
          <h2>Appearance</h2>
          <p>Choose a theme, or follow your device. Saved in this browser.</p>
        </div>
        <ThemeSettings />
      </section>
      <div className="settings-grid">
        <div className="settings-stack">
          <section className="panel setting">
            <h2>Administrator profile</h2>
            <div className="profile-line">
              <span className="avatar large">{me.data?.name?.[0]}</span>
              <div>
                <strong>{me.data?.name}</strong>
                <p>{me.data?.email}</p>
                <span className="badge active">Administrator</span>
              </div>
            </div>
            <button
              onClick={async () => {
                if (
                  unsaved &&
                  !window.confirm("Discard unsaved changes and sign out?")
                )
                  return;
                try {
                  await api("/auth/logout", { method: "POST" });
                } finally {
                  logout();
                }
              }}
            >
              <LogOut size={16} />
              Log out of all sessions
            </button>
          </section>
          <section className="panel setting">
            <h2>Change password</h2>
            <p>At least 12 characters. Changing your password signs you out.</p>
            <form onSubmit={handleSubmit((v) => password.mutate(v))}>
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  {...register("currentPassword")}
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  {...register("newPassword")}
                />
              </label>
              {password.error && (
                <Message error>{password.error.message}</Message>
              )}
              <button className="primary" disabled={password.isPending}>
                Update password
              </button>
            </form>
          </section>
        </div>
        <div className="settings-stack">
          {me.data && <GradeThresholdEditor thresholds={me.data.thresholds} />}
          <section className="panel setting">
            <h2>About CampusDesk</h2>
            <p>CampusDesk Nova · 4.0 Spectrum Edition</p>
            <p>
              Academic records, course administration, attendance, and
              assessment reporting.
            </p>
            <div className="info-note">
              Sessions last 15 minutes. Your token is kept in memory and is
              cleared when you reload or close this page.
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
