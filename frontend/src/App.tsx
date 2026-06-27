import { Routes, Route } from "react-router-dom";

import { PublicLayout } from "./components/layout/PublicLayout";
import { PATHS } from "./routes/paths";

// Public pages
import { HomePage } from "./pages/public/home/HomePage";
import { HistoryPage } from "./pages/public/about/HistoryPage";
import { ResearchExtensionPage } from "./pages/public/about/ResearchExtensionPage";
import { AdministrativeOfficialsPage } from "./pages/public/about/AdministrativeOfficialsPage";
import { VicinityMapPage } from "./pages/public/about/VicinityMapPage";
import { AdmissionPage } from "./pages/public/AdmissionPage";
import { StudentsPage } from "./pages/public/students/StudentsPage";
import { NstpPage } from "./pages/public/students/NstpPage";
import { OjtPage } from "./pages/public/students/OjtPage";
import { FeedbackPage } from "./pages/public/students/FeedbackPage";
import { ScholarshipsPage } from "./pages/public/students/ScholarshipsPage";
import { CareersPage } from "./pages/public/students/CareersPage";
import { CertificateRequestPage } from "./pages/public/students/CertificateRequestPage";
import { CampusLifePage } from "./pages/public/CampusLifePage";
import { AlumniPage } from "./pages/public/AlumniPage";
import { ContactPage } from "./pages/public/ContactPage";
import { AllNewsPage } from "./pages/public/AllNewsPage";
import { SearchResultsPage } from "./pages/public/SearchResultsPage";
import { NotFoundPage } from "./pages/public/NotFoundPage";

// Admin / accreditation portal (migration of the old "private/" area)
import { LoginPage } from "./pages/admin/LoginPage";
import { AdminPlaceholderPage } from "./pages/admin/AdminPlaceholderPage";
import { EniergaLayout } from "./pages/admin/enierga/EniergaLayout";
import { DashboardPage as EniergaDashboardPage } from "./pages/admin/enierga/DashboardPage";
import { DataUploadsPage } from "./pages/admin/enierga/DataUploadsPage";
import { FileRepositoryPage } from "./pages/admin/enierga/FileRepositoryPage";
import { AnalyticsReportPage } from "./pages/admin/enierga/AnalyticsReportPage";

const ADMIN_DASHBOARDS = PATHS.admin.dashboards;
const ACCREDITATION = PATHS.admin.accreditation;

export function App() {
  return (
    <Routes>
      {/* Everything under the public layout (navbar + footer + chatbot). */}
      <Route element={<PublicLayout />}>
        <Route path={PATHS.home} element={<HomePage />} />

        <Route path={PATHS.about.history} element={<HistoryPage />} />
        <Route
          path={PATHS.about.researchExtension}
          element={<ResearchExtensionPage />}
        />
        <Route
          path={PATHS.about.administrativeOfficials}
          element={<AdministrativeOfficialsPage />}
        />
        <Route path={PATHS.about.vicinityMap} element={<VicinityMapPage />} />

        <Route path={PATHS.admission} element={<AdmissionPage />} />

        <Route path={PATHS.students.index} element={<StudentsPage />} />
        <Route path={PATHS.students.nstp} element={<NstpPage />} />
        <Route path={PATHS.students.ojt} element={<OjtPage />} />
        <Route path={PATHS.students.feedback} element={<FeedbackPage />} />
        <Route
          path={PATHS.students.scholarships}
          element={<ScholarshipsPage />}
        />
        <Route path={PATHS.students.careers} element={<CareersPage />} />
        <Route
          path={PATHS.students.certificateRequest}
          element={<CertificateRequestPage />}
        />

        <Route path={PATHS.campusLife} element={<CampusLifePage />} />
        <Route path={PATHS.alumni} element={<AlumniPage />} />
        <Route path={PATHS.contact} element={<ContactPage />} />
        <Route path={PATHS.news} element={<AllNewsPage />} />
        <Route path={PATHS.search} element={<SearchResultsPage />} />

        {/* Admin login keeps the public navbar/footer, like the old page. */}
        <Route path={PATHS.admin.login} element={<LoginPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin dashboards (placeholders until each role's pages are migrated). */}
      <Route
        path={ADMIN_DASHBOARDS.superAdmin}
        element={<AdminPlaceholderPage title="Super Administrator" />}
      />
      <Route
        path={ADMIN_DASHBOARDS.secondarySuperAdmin}
        element={<AdminPlaceholderPage title="Assistant Super Administrator" />}
      />
      <Route
        path={ADMIN_DASHBOARDS.adminAve}
        element={<AdminPlaceholderPage title="OJT / NSTP / Research & Extension" />}
      />
      {/* adminEnierga portal (migrated): dashboard + data tools. */}
      <Route path={PATHS.admin.enierga.dashboard} element={<EniergaLayout />}>
        <Route index element={<EniergaDashboardPage />} />
        <Route path="data-uploads" element={<DataUploadsPage />} />
        <Route path="analytics-report" element={<AnalyticsReportPage />} />
        <Route path="file-repository" element={<FileRepositoryPage />} />
      </Route>
      <Route
        path={ADMIN_DASHBOARDS.adminMila}
        element={<AdminPlaceholderPage title="Scholarships / Careers / Alumni" />}
      />
      <Route
        path={ADMIN_DASHBOARDS.adminLlave}
        element={<AdminPlaceholderPage title="Management & Accreditation" />}
      />
      <Route
        path={ADMIN_DASHBOARDS.adminSerrano}
        element={<AdminPlaceholderPage title="Faculty Management" />}
      />
      <Route
        path={ADMIN_DASHBOARDS.adminCMO}
        element={<AdminPlaceholderPage title="News Management (CMO)" />}
      />
      <Route
        path={ACCREDITATION.areaHead}
        element={<AdminPlaceholderPage title="Accreditation — Area Head" />}
      />
      <Route
        path={ACCREDITATION.accreditor}
        element={<AdminPlaceholderPage title="Accreditation — Accreditor" />}
      />
    </Routes>
  );
}
