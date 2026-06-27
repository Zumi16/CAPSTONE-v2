import { useState } from "react";

import { NewsSection } from "@/features/news/NewsSection";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import "@/styles/pages/admission.css";
import {
  ADMISSION_MODALS,
  type AdmissionModalKey,
} from "./admission.data";

const HERO_BG = "/assets/images/buttonimage/coursesoffered.jpg";

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/puppq", label: "Facebook", icon: "fab fa-facebook-f" },
  {
    href: "https://www.instagram.com/pupparanaqueofficial/",
    label: "Instagram",
    icon: "fab fa-instagram",
  },
  {
    href: "https://www.linkedin.com/school/polytechnic-university-of-the-philippines/posts/?feedView=all",
    label: "LinkedIn",
    icon: "fab fa-linkedin-in",
  },
];

export function AdmissionPage() {
  const [openKey, setOpenKey] = useState<AdmissionModalKey | null>(null);
  const modal = openKey ? ADMISSION_MODALS[openKey] : null;

  useEscapeToClose(Boolean(modal), () => setOpenKey(null));

  return (
    <main className="main admission-page">
      <section
        className="hero-section"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="hero-content">
          <h1 className="hero-title" data-aos="fade-in">
            Admission
          </h1>
          <hr className="hero-divider" />
          <p className="hero-text" data-aos="fade-in">
            Welcome to the Polytechnic University of the Philippines Parañaque
            Campus Admission Page. Here, you will find all the information you
            need to apply and become a part of our vibrant academic community.
          </p>
          <section className="hero-buttons">
            <button className="hero-button" onClick={() => setOpenKey("howToApply")}>
              How to apply
            </button>
            <div className="vl" />
            <button className="hero-button" onClick={() => setOpenKey("iApply")}>
              Pup iApply
            </button>
            <div className="vl" />
            <button className="hero-button" onClick={() => setOpenKey("courses")}>
              Courses Offered
            </button>
          </section>
        </div>
      </section>

      <div className="main-container">
        <div className="main-content">
          <section className="content-box">
            <section className="image-container" data-aos="fade-in">
              <img
                className="content-image"
                src="/assets/images/buttonimage/howtoapply.jpg"
              />
              <h2 className="content-title">How to Apply</h2>
            </section>
            <div className="vl1" />
            <section className="text-container">
              <div className="text-button-wrap">
                <p className="content-text" data-aos="fade-right">
                  Ready to become part of the vibrant community at PUP Parañaque?
                  <br />
                  <br />
                  We're excited to welcome aspiring students who are driven,
                  passionate, and eager to grow. Learn about the qualifications
                  you need, the documents to prepare, and the steps to take to
                  begin your academic journey with us. Your future at PUP starts
                  here.
                </p>
                <button className="more-info" onClick={() => setOpenKey("howToApply")}>
                  Learn More
                </button>
              </div>
            </section>
          </section>

          <section className="content-box-dark">
            <section className="text-container">
              <div className="text-button-wrap1">
                <p className="content-text" data-aos="fade-right">
                  Online registration for various University admission evaluation
                  and entrance exams.
                  <br />
                  <br />
                  PUP iApply enable applicants to register for University college
                  admission evaluation and entrance exams. Online application for
                  PUPCET is for the First Semester only.
                </p>
                <button className="more-info" onClick={() => setOpenKey("iApply")}>
                  Learn More
                </button>
              </div>
            </section>
            <div className="vl1" />
            <section className="image-container" data-aos="fade-in">
              <img
                className="content-image"
                src="/assets/images/buttonimage/pupiapply.jpg"
              />
              <h2 className="content-title">PUP iApply</h2>
            </section>
          </section>

          <section className="content-box">
            <section className="image-container" data-aos="fade-in">
              <img
                className="content-image"
                src="/assets/images/buttonimage/coursesoffered.jpg"
              />
              <h2 className="content-title">Courses Offered</h2>
            </section>
            <div className="vl1" />
            <section className="text-container">
              <div className="text-button-wrap">
                <p className="content-text" data-aos="fade-right">
                  Pursue your academic goals with the diverse range of programs
                  offered at PUP Parañaque. Our courses are designed to equip
                  students with practical skills, critical thinking, and a strong
                  foundation for their future careers. Explore the paths that can
                  shape your journey toward excellence and meaningful impact.
                </p>
                <button className="more-info" onClick={() => setOpenKey("courses")}>
                  Learn More
                </button>
              </div>
            </section>
          </section>
        </div>

        <ul className="social-links1">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href} aria-label={link.label} target="_blank" rel="noreferrer">
                <i className={link.icon} />
              </a>
            </li>
          ))}
        </ul>

        <NewsSection />
      </div>

      {/* Admission modal */}
      {modal && (
        <div
          className="modal"
          style={{ display: "flex" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenKey(null);
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                <i className={modal.icon} /> {modal.title}
              </h2>
              <button className="close-btn" onClick={() => setOpenKey(null)}>
                &times;
              </button>
            </div>
            <div
              className="modal-body"
              dangerouslySetInnerHTML={{ __html: modal.content }}
            />
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => window.open(modal.primaryAction.url, "_blank")}
              >
                <i className={modal.primaryAction.icon} /> {modal.primaryAction.label}
              </button>
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setOpenKey(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
