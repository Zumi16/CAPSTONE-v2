import { useState } from "react";

import { NewsGrid } from "@/features/news/NewsGrid";
import { cx } from "@/lib/cx";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { ADMISSION_MODALS, type AdmissionModalKey } from "./admission.data";

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

const CONTENT = [
  {
    key: "howToApply" as AdmissionModalKey,
    title: "How to Apply",
    image: "/assets/images/buttonimage/howtoapply.jpg",
    text: "Ready to become part of the vibrant community at PUP Parañaque? We're excited to welcome aspiring students who are driven, passionate, and eager to grow. Learn about the qualifications you need, the documents to prepare, and the steps to take to begin your academic journey with us.",
    dark: false,
  },
  {
    key: "iApply" as AdmissionModalKey,
    title: "PUP iApply",
    image: "/assets/images/buttonimage/pupiapply.jpg",
    text: "Online registration for various University admission evaluation and entrance exams. PUP iApply enables applicants to register for University college admission evaluation and entrance exams. Online application for PUPCET is for the First Semester only.",
    dark: true,
  },
  {
    key: "courses" as AdmissionModalKey,
    title: "Courses Offered",
    image: "/assets/images/buttonimage/coursesoffered.jpg",
    text: "Pursue your academic goals with the diverse range of programs offered at PUP Parañaque. Our courses are designed to equip students with practical skills, critical thinking, and a strong foundation for their future careers.",
    dark: false,
  },
];

export function AdmissionPage() {
  const [openKey, setOpenKey] = useState<AdmissionModalKey | null>(null);
  const modal = openKey ? ADMISSION_MODALS[openKey] : null;
  useEscapeToClose(Boolean(modal), () => setOpenKey(null));

  return (
    <main className="bg-white">
      {/* Hero */}
      <section
        className="relative flex min-h-[380px] items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="w-full bg-black/80 px-6 py-16 text-center text-white">
          <h1 className="text-3xl font-bold sm:text-5xl" data-aos="fade-in">
            Admission
          </h1>
          <hr className="mx-auto my-3 w-1/6 border-white/80" />
          <p className="mx-auto max-w-3xl text-base sm:text-lg" data-aos="fade-in">
            Welcome to the Polytechnic University of the Philippines Parañaque Campus
            Admission Page. Here, you will find all the information you need to apply
            and become a part of our vibrant academic community.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {CONTENT.map((c) => (
              <button
                key={c.key}
                onClick={() => setOpenKey(c.key)}
                className="rounded border border-white/70 px-4 py-2 font-semibold transition hover:bg-white/10"
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content boxes */}
      {CONTENT.map((c, index) => (
        <section
          key={c.key}
          className={cx(
            "flex flex-col items-center gap-8 px-6 py-12 lg:gap-12",
            index % 2 === 1 ? "bg-neutral-800 text-gray-100 lg:flex-row-reverse" : "lg:flex-row",
          )}
        >
          <div className="flex-1 text-center" data-aos="fade-in">
            <img
              src={c.image}
              alt={c.title}
              className="mx-auto h-64 w-full max-w-md rounded-2xl object-cover"
            />
            <h2 className="mt-3 text-xl font-bold uppercase">{c.title}</h2>
          </div>
          <div className="flex-1" data-aos="fade-right">
            <p className="text-lg leading-relaxed">{c.text}</p>
            <button
              onClick={() => setOpenKey(c.key)}
              className="mt-6 rounded bg-maroon px-6 py-2.5 font-semibold text-white transition hover:bg-brand-light"
            >
              Learn More
            </button>
          </div>
        </section>
      ))}

      {/* Socials + News */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ul className="mb-10 flex items-center justify-center gap-8">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                aria-label={link.label}
                target="_blank"
                rel="noreferrer"
                className="text-3xl text-gray-700 transition hover:scale-110 hover:text-maroon"
              >
                <i className={link.icon} />
              </a>
            </li>
          ))}
        </ul>

        <h2 className="text-center text-2xl font-bold text-brand sm:text-3xl">
          News and Updates
        </h2>
        <hr className="mx-auto mt-2.5 mb-10 h-1 w-20 rounded border-0 bg-maroon" />
        <NewsGrid limit={3} />
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenKey(null);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-red-900 to-red-700 px-6 py-5 text-white">
              <h2 className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
                <i className={modal.icon} /> {modal.title}
              </h2>
              <button
                onClick={() => setOpenKey(null)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl hover:bg-white/30"
              >
                &times;
              </button>
            </div>
            <div
              className="prose max-w-none overflow-y-auto p-6"
              dangerouslySetInnerHTML={{ __html: modal.content }}
            />
            <div className="flex flex-col justify-end gap-3 border-t bg-gray-50 px-6 py-4 sm:flex-row">
              <button
                onClick={() => window.open(modal.primaryAction.url, "_blank")}
                className="rounded-lg bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light"
              >
                <i className={modal.primaryAction.icon} /> {modal.primaryAction.label}
              </button>
              <button
                onClick={() => setOpenKey(null)}
                className="rounded-lg border-2 border-maroon px-6 py-2.5 font-semibold text-maroon hover:bg-rose-50"
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
