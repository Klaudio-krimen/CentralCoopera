"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, ArrowRight, Warning } from "@phosphor-icons/react";
import type { EventoEscena } from "../../lib/login-escena/maquina";

export interface LoginFormProps {
  onEscenaEvento?: (evento: EventoEscena) => void | Promise<void>;
}
export default function LoginForm({ onEscenaEvento }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [greeting, setGreeting] = useState("Bienvenido, equipo");
  useEffect(() => {
    setGreeting(
      new Date().getHours() < 12
        ? "Buenos días, equipo"
        : "Buenas tardes, equipo"
    );
  }, []);

  function emitir(evento: EventoEscena) {
    try {
      const result = onEscenaEvento?.(evento);
      if (result instanceof Promise) return result.catch(() => {});
    } catch {
      /* La decoración nunca interrumpe el formulario. */
    }
  }
  async function celebrar() {
    const animation = emitir("EXITO");
    if (!animation) return;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        animation,
        new Promise<void>((resolve) => {
          deadline = setTimeout(resolve, 750);
        }),
      ]);
    } finally {
      if (deadline !== undefined) clearTimeout(deadline);
    }
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        remember: remember ? "1" : "0",
        redirect: false,
      });
      if (!result?.ok) {
        setError("Correo o contraseña incorrectos");
        emitir("ERROR");
        return;
      }
      await celebrar();
      router.push("/");
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Intenta nuevamente.");
      emitir("ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-form${error ? " login-form-error" : ""}`}>
      <div className="login-heading mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          <span className="login-normal-title">Iniciar sesión</span>
          <span className="login-pixel-title">CENTRAL COOPERA</span>
        </h2>
        <p className="login-instructions text-zinc-500 text-sm mt-1">
          Ingresa tus credenciales para continuar
        </p>
        <p className="login-greeting">{greeting}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        onFocusCapture={(event) =>
          emitir(
            event.target.id === "login-email"
              ? "FOCO_CORREO"
              : event.target.id === "login-password"
                ? "FOCO_CLAVE"
                : "BLUR"
          )
        }
        onBlurCapture={(event) => {
          const next = event.relatedTarget;
          if (
            !(next instanceof HTMLElement) ||
            !["login-email", "login-password"].includes(next.id)
          )
            emitir("BLUR");
        }}
        onInputCapture={() => emitir("ACTIVIDAD")}
      >
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-zinc-700"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@cooperapro.cl"
            className="input-base"
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-zinc-700"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              ref={passwordInput}
              id="login-password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-base pr-12"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => {
                setShowPw(!showPw);
                passwordInput.current?.focus();
              }}
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label
          htmlFor="login-remember"
          className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-700"
        >
          <input
            id="login-remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            disabled={loading}
            className="size-4 shrink-0 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          />
          <span>Mantener sesión iniciada en este equipo</span>
        </label>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100"
          >
            <Warning
              size={16}
              className="text-red-500 shrink-0"
              weight="fill"
            />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn-primary w-full mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Ingresando...
            </>
          ) : (
            <>
              <span className="login-normal-title">Ingresar</span>
              <span className="login-pixel-title">INICIAR TURNO</span>
              <ArrowRight size={17} weight="bold" />
            </>
          )}
        </button>
      </form>

      <p className="login-help text-center text-xs text-zinc-400 mt-8">
        ¿No tienes cuenta? Contacta al administrador.
      </p>
    </div>
  );
}
