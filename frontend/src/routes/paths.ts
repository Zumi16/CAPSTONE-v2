/**
 * Every route in the app, in one place.
 *
 * Components link with `to={PATHS.about.history}` instead of typing the URL
 * string by hand, so a renamed route is a one-line change and a typo is a
 * TypeScript error. The old site linked to ".../html/About/history.html";
 * the React app uses clean URLs like "/about/history".
 */
export const PATHS = {
  home: "/",

  about: {
    history: "/about/history",
    researchExtension: "/about/research-extension",
    administrativeOfficials: "/about/administrative-officials",
    vicinityMap: "/about/vicinity-map",
  },

  admission: "/admission",

  students: {
    index: "/students",
    nstp: "/students/nstp",
    ojt: "/students/ojt",
    feedback: "/students/feedback",
    scholarships: "/students/scholarships",
    careers: "/students/careers",
    certificateRequest: "/students/certificate-request",
  },

  campusLife: "/campus-life",
  alumni: "/alumni",
  contact: "/contact",
  news: "/news",
  search: "/search",
} as const;

/** External links that leave the site (kept as normal anchor tags). */
export const EXTERNAL_LINKS = {
  pupSinta: "https://pupsinta.freshservice.com/support/home",
  studentPortal: "https://sis8.pup.edu.ph/student/",
} as const;
