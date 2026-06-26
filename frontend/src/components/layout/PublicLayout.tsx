import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useAos } from "@/lib/useAos";
import { PATHS } from "@/routes/paths";
import { Navbar } from "./navbar/Navbar";
import { Footer } from "./footer/Footer";
import { Chatbot } from "../chatbot/Chatbot";

/**
 * The shell shared by every public page: Navbar on top, the page content in the
 * middle (via <Outlet/>), then the Footer and the floating Chatbot.
 *
 * The homepage uses the transparent "home" navbar; all other pages use the
 * solid one.
 */
export function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === PATHS.home;

  useAos();

  // Jump back to the top whenever we navigate to a new page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Navbar variant={isHome ? "home" : "default"} />
      <Outlet />
      <Footer />
      <Chatbot />
    </>
  );
}
