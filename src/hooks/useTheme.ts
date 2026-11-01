import { useEffect } from "react";
import { useUiStore } from "@/store/ui";

const QUERY = "(prefers-color-scheme: dark)";

/** Applies the theme setting to <html data-theme> and follows the OS when set to system. */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" && window.matchMedia(QUERY).matches);
      if (dark) root.dataset.theme = "dark";
      else delete root.dataset.theme;
    };
    apply();
    if (theme !== "system") return;
    const media = window.matchMedia(QUERY);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
