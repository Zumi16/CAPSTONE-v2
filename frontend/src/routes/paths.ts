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

  /**
   * The admin / accreditation portal (the old "/private/..." area).
   *
   * The legacy site redirected to role-specific HTML files after login; the
   * React app uses clean URLs. Dashboards are being migrated one role at a
   * time — until each is built, its route shows the "under migration"
   * placeholder.
   */
  admin: {
    login: "/login",
    dashboards: {
      superAdmin: "/admin/super",
      secondarySuperAdmin: "/admin/secondary",
      adminAve: "/admin/ave",
      adminEnierga: "/admin/enierga",
      adminMila: "/admin/mila",
      adminLlave: "/admin/llave",
      adminSerrano: "/admin/serrano",
      adminCMO: "/admin/cmo",
    },
    accreditation: {
      areaHead: "/accreditation/area-head",
      accreditor: "/accreditation/accreditor",
    },

    /** adminEnierga portal: dashboard + data tools. */
    enierga: {
      dashboard: "/admin/enierga",
      dataUploads: "/admin/enierga/data-uploads",
      analyticsReport: "/admin/enierga/analytics-report",
      fileRepository: "/admin/enierga/file-repository",
    },
  },
} as const;

/** External links that leave the site (kept as normal anchor tags). */
export const EXTERNAL_LINKS = {
  pupSinta: "https://pupsinta.freshservice.com/support/home",
  studentPortal: "https://sis8.pup.edu.ph/student/",
} as const;
