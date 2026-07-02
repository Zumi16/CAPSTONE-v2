interface FacebookPageEmbedProps {
  /** Full URL of the Facebook page to embed, e.g. "https://www.facebook.com/YourPage" */
  pageUrl: string;
  /** Optional heading shown above the embedded feed */
  title?: string;
  /** Rendered width of the plugin in pixels (max ~500). Phone-like column by default. */
  width?: number;
  /** Rendered height of the plugin in pixels */
  height?: number;
}

/**
 * Embeds a Facebook Page timeline using the iframe-based Page Plugin.
 * No Facebook SDK/script required.
 */
export function FacebookPageEmbed({
  pageUrl,
  title,
  width = 360,
  height = 700,
}: FacebookPageEmbedProps) {
  const src =
    "https://www.facebook.com/plugins/page.php?" +
    new URLSearchParams({
      href: pageUrl,
      tabs: "timeline",
      width: String(width),
      height: String(height),
      small_header: "false",
      adapt_container_width: "true",
      hide_cover: "false",
      show_facepile: "true",
    }).toString();

  return (
    <aside className="fb-embed-col" aria-label="Facebook feed">
      {title && <h2 className="fb-embed-title">{title}</h2>}
      <iframe
        title={title || "Facebook page feed"}
        src={src}
        width={width}
        height={height}
        style={{ border: "none", overflow: "hidden" }}
        scrolling="no"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    </aside>
  );
}
