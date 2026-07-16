import { useState } from "react";
import { Check, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

type UpdateState = "idle" | "checking" | "downloading" | "current" | "error";

const isDesktopTauri = () =>
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window &&
  !/Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

export default function UpdateButton({ mobile = false }: { mobile?: boolean }) {
  const [state, setState] = useState<UpdateState>("idle");
  const [message, setMessage] = useState("Verifică actualizări");

  if (!isDesktopTauri()) return null;

  const checkForUpdate = async () => {
    if (state === "checking" || state === "downloading") return;
    setState("checking");
    setMessage("Se verifică...");

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check({ timeout: 30_000 });
      if (!update) {
        setState("current");
        setMessage("Aplicația este la zi");
        return;
      }

      if (!window.confirm(`Este disponibilă versiunea ${update.version}. O instalăm acum?`)) {
        await update.close();
        setState("idle");
        setMessage("Verifică actualizări");
        return;
      }

      setState("downloading");
      setMessage("Se descarcă și se instalează...");
      await update.downloadAndInstall();
    } catch (error) {
      console.error("Actualizarea aplicației a eșuat", error);
      setState("error");
      setMessage("Actualizarea a eșuat");
    }
  };

  const Icon = state === "checking" || state === "downloading"
    ? LoaderCircle
    : state === "current"
      ? Check
      : state === "error"
        ? TriangleAlert
        : RefreshCw;
  const spinning = state === "checking" || state === "downloading";

  if (mobile) {
    return (
      <button type="button" onClick={checkForUpdate} disabled={spinning} className="flex w-full items-center space-x-3 rounded-md px-4 py-3 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:text-amber-500 disabled:cursor-wait disabled:opacity-70">
        <Icon className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} />
        <span>{message}</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={checkForUpdate} disabled={spinning} className="grid h-9 w-9 place-items-center rounded-lg border border-stone-800 text-stone-400 transition-colors hover:border-amber-700 hover:bg-stone-800 hover:text-amber-500 disabled:cursor-wait disabled:opacity-70" title={message} aria-label={message}>
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}
