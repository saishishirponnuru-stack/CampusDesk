import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api, setToken } from "../api";
import { Message } from "../components/Feedback";
import { ThemeSelector } from "../components/Theme";
import { Brand, CampusIllustration } from "../components/Brand";
export function Login({ onLogin }) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        email: z.email("Enter a valid email"),
        password: z.string().min(1, "Enter your password"),
      }),
    ),
  });
  const mutation = useMutation({
    mutationFn: (values) =>
      api("/auth/login", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (data) => {
      setToken(data.token);
      onLogin(true);
    },
  });
  return (
    <main className="login">
      <section className="login-brand">
        <Brand />
        <div className="login-story">
          <span className="eyebrow">
            A little clarity. A lot of possibility.
          </span>
          <h1>
            Your campus.
            <br />
            <em>Beautifully connected.</em>
          </h1>
          <p>
            Bring people, learning, and everyday administration into one
            considered workspace.
          </p>
        </div>
        <CampusIllustration />
        <small>Built for the people behind student success.</small>
      </section>
      <section className="login-form">
        <div className="login-appearance">
          <ThemeSelector />
        </div>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <span className="eyebrow">Your academic workspace</span>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your CampusDesk workspace.</p>
          <label>
            Email address
            <input
              autoComplete="username"
              type="email"
              {...register("email")}
            />
            {errors.email && (
              <small className="field-error">{errors.email.message}</small>
            )}
          </label>
          <label htmlFor="login-password">Password</label>
          <span className="password-input">
            <input
              id="login-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          {errors.password && (
            <small className="field-error">{errors.password.message}</small>
          )}
          {mutation.error && <Message error>{mutation.error.message}</Message>}
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in…" : "Sign in to workspace"}{" "}
            <ArrowUpRight size={17} />
          </button>
          <p className="login-note">
            Administrator accounts are provisioned by your institution. Sessions
            expire after 15 minutes.
          </p>
          <div className="login-security">
            <ShieldCheck size={14} />
            Private by design. Built around your institution.
          </div>
        </form>
      </section>
    </main>
  );
}
