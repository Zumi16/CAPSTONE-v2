const DEFAULT_BG = "/assets/images/PUPBg4.jpg";

type PageHeroProps = {
  title: string;
  text: string;
  /** Background image path. Defaults to the standard campus banner. */
  bg?: string;
  /** "left" matches the bordered style; "center" centers the text. */
  align?: "left" | "center";
};

/**
 * The dark banner used at the top of most inner pages. Fully responsive:
 * the heading and padding scale down on small screens.
 */
export function PageHero({ title, text, bg = DEFAULT_BG, align = "left" }: PageHeroProps) {
  if (align === "center") {
    return (
      <section
        className="relative flex min-h-[280px] items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${bg}')` }}
      >
        <div className="w-full bg-black/75 px-6 py-16 text-center text-white" data-aos="fade-in">
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h1>
          <hr className="mx-auto my-3 w-1/6 border-white/80" />
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed sm:text-lg">
            {text}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative flex min-h-[300px] items-center bg-cover bg-center"
      style={{ backgroundImage: `url('${bg}')` }}
    >
      <div className="w-full bg-black/75 px-6 py-16 md:px-24">
        <div className="flex gap-4" data-aos="fade">
          <div className="w-1 shrink-0 bg-gold" />
          <div className="max-w-3xl text-white">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-relaxed sm:text-lg">{text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
