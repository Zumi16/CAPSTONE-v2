import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";

/** Simple 404 page for unknown URLs. */
export function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "120px 20px 60px",
        gap: "12px",
      }}
    >
      <h1 style={{ fontSize: "64px", color: "rgb(111, 35, 35)", margin: 0 }}>
        404
      </h1>
      <p style={{ fontSize: "20px" }}>Sorry, we couldn't find that page.</p>
      <Link
        to={PATHS.home}
        style={{
          marginTop: "8px",
          background: "rgb(111, 35, 35)",
          color: "white",
          padding: "10px 24px",
          borderRadius: "6px",
          textDecoration: "none",
        }}
      >
        Back to Home
      </Link>
    </main>
  );
}
