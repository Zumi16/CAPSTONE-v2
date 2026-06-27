import "./hero.css";

type HeroProps = {
  title: string;
  text: string;
  background: string;
};


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
