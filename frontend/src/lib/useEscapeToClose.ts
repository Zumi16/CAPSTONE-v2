import { useEffect } from "react";

/**
 * While `isOpen` is true: pressing Escape calls `onClose`, and the page behind
 * the modal is prevented from scrolling. Cleans up automatically when closed.
 */
export function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);
}
