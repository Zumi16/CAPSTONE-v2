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
import { AveLayout } from "./pages/admin/ave/AveLayout";
import { AveDashboardPage } from "./pages/admin/ave/AveDashboardPage";
import { OjtPage as AveOjtPage } from "./pages/admin/ave/OjtPage";
import { NstpPage as AveNstpPage } from "./pages/admin/ave/NstpPage";
import { ResearchExtensionPage as AveResearchExtensionPage } from "./pages/admin/ave/ResearchExtensionPage";
import { FormsRepositoryPage as AveFormsRepositoryPage } from "./pages/admin/ave/FormsRepositoryPage";
import { MilaLayout } from "./pages/admin/mila/MilaLayout";
import { MilaDashboardPage } from "./pages/admin/mila/MilaDashboardPage";
import { ScholarshipsPage as MilaScholarshipsPage } from "./pages/admin/mila/ScholarshipsPage";
import { CareersPage as MilaCareersPage } from "./pages/admin/mila/CareersPage";
import { CertificatesPage as MilaCertificatesPage } from "./pages/admin/mila/CertificatesPage";
import { AlumniEmploymentPage as MilaAlumniEmploymentPage } from "./pages/admin/mila/AlumniEmploymentPage";
import { SerranoLayout } from "./pages/admin/serrano/SerranoLayout";
import { DashboardPage as SerranoDashboardPage } from "./pages/admin/serrano/DashboardPage";
import { FacultyManagementPage } from "./pages/admin/serrano/FacultyManagementPage";
import { FacultyAnalyticsReportPage } from "./pages/admin/serrano/FacultyAnalyticsReportPage";
import { SuperLayout } from "./pages/admin/super/SuperLayout";
import { SuperDashboardPage } from "./pages/admin/super/SuperDashboardPage";
import { SecondaryLayout } from "./pages/admin/secondary/SecondaryLayout";
import { SecondaryDashboardPage } from "./pages/admin/secondary/SecondaryDashboardPage";
import { UserManagementPage } from "./pages/admin/super/UserManagementPage";
import { RoleManagementPage } from "./pages/admin/super/RoleManagementPage";
import { ActivityLogsPage } from "./pages/admin/super/ActivityLogsPage";
import { FeedbackPage as ServiceFeedbackPage } from "./pages/admin/super/FeedbackPage";
import { AnalyticsDashboardPage } from "./pages/admin/super/AnalyticsDashboardPage";

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
      {/* superAdmin (Salao) portal. */}
      <Route path={PATHS.admin.super.dashboard} element={<SuperLayout />}>
        <Route index element={<SuperDashboardPage />} />
        <Route path="analytics" element={<AnalyticsDashboardPage />} />
        <Route path="users" element={<UserManagementPage variant="super" />} />
        <Route path="roles" element={<RoleManagementPage variant="super" />} />
        <Route path="feedback" element={<ServiceFeedbackPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>
      {/* secondarySuperAdmin (Assistant) portal — mirrors superAdmin. */}
      <Route path={PATHS.admin.secondary.dashboard} element={<SecondaryLayout />}>
        <Route index element={<SecondaryDashboardPage />} />
        <Route path="analytics" element={<AnalyticsDashboardPage />} />
        <Route path="users" element={<UserManagementPage variant="secondary" />} />
        <Route path="roles" element={<RoleManagementPage variant="secondary" />} />
        <Route path="feedback" element={<ServiceFeedbackPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>
      {/* adminAve portal (migrated dashboard; sub-pages pending). */}
      <Route path={PATHS.admin.ave.dashboard} element={<AveLayout />}>
        <Route index element={<AveDashboardPage />} />
        <Route path="ojt" element={<AveOjtPage />} />
        <Route path="research-extension" element={<AveResearchExtensionPage />} />
        <Route path="nstp" element={<AveNstpPage />} />
        <Route path="forms-repository" element={<AveFormsRepositoryPage />} />
      </Route>
      {/* adminEnierga portal (migrated): dashboard + data tools. */}
      <Route path={PATHS.admin.enierga.dashboard} element={<EniergaLayout />}>
        <Route index element={<EniergaDashboardPage />} />
        <Route path="data-uploads" element={<DataUploadsPage />} />
        <Route path="analytics-report" element={<AnalyticsReportPage />} />
        <Route path="file-repository" element={<FileRepositoryPage />} />
      </Route>
      {/* adminMila portal (migrated dashboard; sub-pages pending). */}
      <Route path={PATHS.admin.mila.dashboard} element={<MilaLayout />}>
        <Route index element={<MilaDashboardPage />} />
        <Route path="scholarships" element={<MilaScholarshipsPage />} />
        <Route path="careers" element={<MilaCareersPage />} />
        <Route path="certificates" element={<MilaCertificatesPage />} />
        <Route path="alumni-employment" element={<MilaAlumniEmploymentPage />} />
      </Route>
      <Route
        path={ADMIN_DASHBOARDS.adminLlave}
        element={<AdminPlaceholderPage title="Management & Accreditation" />}
      />
      {/* adminSerrano portal (Academic Affairs): dashboard + faculty tools. */}
      <Route path={PATHS.admin.serrano.dashboard} element={<SerranoLayout />}>
        <Route index element={<SerranoDashboardPage />} />
        <Route path="faculty-management" element={<FacultyManagementPage />} />
        <Route path="analytics-report" element={<FacultyAnalyticsReportPage />} />
      </Route>
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
