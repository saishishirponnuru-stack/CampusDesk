import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { LogOut } from "lucide-react";
import { api } from "../api";
import { Message } from "../components/Feedback";
import { Heading } from "../components/WorkspaceUI";
import { ThemeSettings } from "../components/Theme";
export default function SettingsPage({ me, logout }) {
  const qc = useQueryClient(),
    { register, handleSubmit, reset } = useForm(),
    [saved, setSaved] = useState(""),
    [thresholds, setThresholds] = useState("");
  useEffect(() => {
    if (me.data)
      setThresholds(
        me.data.thresholds.map((t) => t.label + ":" + t.minimum).join(", "),
      );
  }, [me.data]);
  const password = useMutation({
    mutationFn: (v) =>
      api("/auth/password", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      reset();
      logout();
    },
  });
  const grades = useMutation({
    mutationFn: () =>
      api("/auth/thresholds", {
        method: "PUT",
        body: JSON.stringify({
          thresholds: thresholds.split(",").map((t) => {
            const [label, minimum] = t.trim().split(":");
            return { label, minimum: Number(minimum) };
          }),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      setSaved("Grade thresholds saved.");
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
          <section className="panel setting">
            <h2>Grade thresholds</h2>
            <p>
              Format: label:minimum percentage. Include zero. Grades use the
              highest qualifying threshold.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                grades.mutate();
              }}
            >
              <label>
                Thresholds
                <input
                  required
                  value={thresholds}
                  onChange={(e) => {
                    setThresholds(e.target.value);
                    setSaved("");
                  }}
                />
              </label>
              {grades.error && <Message error>{grades.error.message}</Message>}
              {saved && <Message>{saved}</Message>}
              <button className="primary" disabled={grades.isPending}>
                Save thresholds
              </button>
            </form>
          </section>
          <section className="panel setting">
            <h2>About CampusDesk</h2>
            <p>CampusDesk Nova · 3.0</p>
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
