import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AOS from "aos";

/**
 * Initializes AOS (Animate On Scroll), the library that powers the
 * `data-aos="fade-up"` reveal effects from the old site. We init once, then
 * refresh after every route change so elements on the newly shown page animate.
 */
export function useAos() {
  const location = useLocation();

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  useEffect(() => {
    // Let the new page render first, then ask AOS to re-scan the DOM.
    const id = window.setTimeout(() => AOS.refresh(), 50);
    return () => window.clearTimeout(id);
  }, [location.pathname]);
}
