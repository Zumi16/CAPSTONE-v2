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
    internship: "/students/internship",
    feedback: "/students/feedback",
    scholarships: "/students/scholarships",
    careers: "/students/careers",
    certificateRequest: "/students/certificate-request",
    downloadableForms: "/students/downloadable-forms",
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
      adminLy: "/admin/ly",
    },
    accreditation: {
      /** Accreditation Area Head portal: dashboard + activity log + reports. */
      areaHead: {
        dashboard: "/accreditation/area-head",
        activityLog: "/accreditation/area-head/activity-log",
        reports: "/accreditation/area-head/reports",
      },
      /** Accreditation Accreditor portal: dashboard + my reviews + statistics. */
      accreditor: {
        dashboard: "/accreditation/accreditor",
        myReviews: "/accreditation/accreditor/my-reviews",
        statistics: "/accreditation/accreditor/statistics",
      },
    },

    /** adminEnierga portal: dashboard + data tools. */
    enierga: {
      dashboard: "/admin/enierga",
      dataUploads: "/admin/enierga/data-uploads",
      analyticsReport: "/admin/enierga/analytics-report",
      fileRepository: "/admin/enierga/file-repository",
    },

    /** adminAve portal: OJT / Internship / NSTP / Research & Extension / Forms. */
    ave: {
      dashboard: "/admin/ave",
      ojt: "/admin/ave/ojt",
      internship: "/admin/ave/internship",
      research: "/admin/ave/research-extension",
      nstp: "/admin/ave/nstp",
      forms: "/admin/ave/forms-repository",
    },

    /** adminMila portal: Scholarships / Careers / Certificates / Alumni. */
    mila: {
      dashboard: "/admin/mila",
      scholarships: "/admin/mila/scholarships",
      careers: "/admin/mila/careers",
      certificates: "/admin/mila/certificates",
      alumni: "/admin/mila/alumni-employment",
    },

    /** adminSerrano portal: Faculty Management + Analytics & AI Insights. */
    serrano: {
      dashboard: "/admin/serrano",
      facultyManagement: "/admin/serrano/faculty-management",
      analyticsReport: "/admin/serrano/analytics-report",
    },

    /** superAdmin (Salao) portal: analytics / users / roles / feedback / logs. */
    super: {
      dashboard: "/admin/super",
      analytics: "/admin/super/analytics",
      users: "/admin/super/users",
      roles: "/admin/super/roles",
      feedback: "/admin/super/feedback",
      activityLogs: "/admin/super/activity-logs",
    },

    /** secondarySuperAdmin (Assistant) portal: mirrors superAdmin. */
    secondary: {
      dashboard: "/admin/secondary",
      analytics: "/admin/secondary/analytics",
      users: "/admin/secondary/users",
      roles: "/admin/secondary/roles",
      feedback: "/admin/secondary/feedback",
      activityLogs: "/admin/secondary/activity-logs",
    },

    /** adminLlave portal: Accreditation management. */
    llave: {
      dashboard: "/admin/llave",
      management: "/admin/llave/management",
      reviewMonitoring: "/admin/llave/review-monitoring",
      reportsLogs: "/admin/llave/reports-logs",
    },

    /** adminCMO portal: Communications & Marketing — dashboard + news. */
    cmo: {
      dashboard: "/admin/cmo",
      news: "/admin/cmo/news",
    },

    /** adminLy portal: Live Chat Support — handles "Chat with an Agent". */
    ly: {
      dashboard: "/admin/ly",
    },
  },
} as const;

/** External links that leave the site (kept as normal anchor tags). */
export const EXTERNAL_LINKS = {
  pupSinta: "https://pupsinta.freshservice.com/support/home",
  studentPortal: "https://sis8.pup.edu.ph/student/",
} as const;
