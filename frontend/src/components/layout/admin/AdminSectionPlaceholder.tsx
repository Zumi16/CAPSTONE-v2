/** Placeholder for admin pages still being migrated (rendered inside a layout). */
export function AdminSectionPlaceholder({ title }: { title: string }) {
  return (
    <div style={{ padding: "40px 0", color: "#555" }}>
      <h1 style={{ color: "#822020", marginBottom: 8 }}>{title}</h1>
      <p>This page is being migrated. The sidebar and shell are live — content lands next.</p>
    </div>
  );
}
