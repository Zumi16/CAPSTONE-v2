import "./hero.css";

type HeroProps = {
  title: string;
  text: string;
  /** Background image for the hero, e.g. "/assets/images/PUPBg4.jpg". */
  background: string;
};

/**
 * Shared page hero used by the inner pages (History, Vicinity Map, NSTP, OJT,
 * Research & Extension, Administrative Officials). The look is identical
 * everywhere — each page just passes its own title, text, and background image.
 *
 * All styles live in `hero.css` and are scoped under ".page-hero", so this hero
 * can never clash with (or be changed by) any other page's CSS.
 */
export function Hero({ title, text, background }: HeroProps) {
  return (
    <section
      className="page-hero"
      style={{ backgroundImage: `url('${background}')` }}
    >
      <div className="page-hero__overlay">
        <div className="page-hero__design" data-aos="fade">
          <div className="page-hero__line" />
          <div className="page-hero__body">
            <h1 className="page-hero__title">{title}</h1>
            <p className="page-hero__text">{text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
