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
import { InternshipPage } from "./pages/public/students/InternshipPage";
import { FeedbackPage } from "./pages/public/students/FeedbackPage";
import { ScholarshipsPage } from "./pages/public/students/ScholarshipsPage";
import { CareersPage } from "./pages/public/students/CareersPage";
import { CertificateRequestPage } from "./pages/public/students/CertificateRequestPage";
import { DownloadableFormsPage } from "./pages/public/students/DownloadableFormsPage";
import { CampusLifePage } from "./pages/public/CampusLifePage";
import { AlumniPage } from "./pages/public/AlumniPage";
import { ContactPage } from "./pages/public/ContactPage";
import { AllNewsPage } from "./pages/public/AllNewsPage";
import { SearchResultsPage } from "./pages/public/SearchResultsPage";
import { NotFoundPage } from "./pages/public/NotFoundPage";

// Admin / accreditation portal (migration of the old "private/" area)
import { LoginPage } from "./pages/admin/LoginPage";
import { PortalRoute } from "./pages/admin/portals";
import { DashboardPage as EniergaDashboardPage } from "./pages/admin/enierga/DashboardPage";
import { DataUploadsPage } from "./pages/admin/enierga/DataUploadsPage";
import { FileRepositoryPage } from "./pages/admin/enierga/FileRepositoryPage";
import { AnalyticsReportPage } from "./pages/admin/enierga/AnalyticsReportPage";
import { AveDashboardPage } from "./pages/admin/ave/AveDashboardPage";
import { OjtPage as AveOjtPage } from "./pages/admin/ave/OjtPage";
import { InternshipPage as AveInternshipPage } from "./pages/admin/ave/InternshipPage";
import { NstpPage as AveNstpPage } from "./pages/admin/ave/NstpPage";
import { ResearchExtensionPage as AveResearchExtensionPage } from "./pages/admin/ave/ResearchExtensionPage";
import { FormsRepositoryPage as AveFormsRepositoryPage } from "./pages/admin/ave/FormsRepositoryPage";
import { MilaDashboardPage } from "./pages/admin/mila/MilaDashboardPage";
import { ScholarshipsPage as MilaScholarshipsPage } from "./pages/admin/mila/ScholarshipsPage";
import { CareersPage as MilaCareersPage } from "./pages/admin/mila/CareersPage";
import { CertificatesPage as MilaCertificatesPage } from "./pages/admin/mila/CertificatesPage";
import { AlumniEmploymentPage as MilaAlumniEmploymentPage } from "./pages/admin/mila/AlumniEmploymentPage";
import { DashboardPage as SerranoDashboardPage } from "./pages/admin/serrano/DashboardPage";
import { FacultyManagementPage } from "./pages/admin/serrano/FacultyManagementPage";
import { FacultyAnalyticsReportPage } from "./pages/admin/serrano/FacultyAnalyticsReportPage";
import { SuperDashboardPage } from "./pages/admin/super/SuperDashboardPage";
import { SecondaryDashboardPage } from "./pages/admin/secondary/SecondaryDashboardPage";
import { UserManagementPage } from "./pages/admin/super/UserManagementPage";
import { RoleManagementPage } from "./pages/admin/super/RoleManagementPage";
import { ActivityLogsPage } from "./pages/admin/super/ActivityLogsPage";
import { FeedbackPage as ServiceFeedbackPage } from "./pages/admin/super/FeedbackPage";
import { AnalyticsDashboardPage } from "./pages/admin/super/AnalyticsDashboardPage";
import { LlaveDashboardPage } from "./pages/admin/llave/LlaveDashboardPage";
import { ManagementPage } from "./pages/admin/llave/ManagementPage";
import { ReviewMonitoringPage } from "./pages/admin/llave/ReviewMonitoringPage";
import { ReportsLogsPage } from "./pages/admin/llave/ReportsLogsPage";
import { CmoDashboardPage } from "./pages/admin/cmo/CmoDashboardPage";
import { NewsManagementPage } from "./pages/admin/cmo/NewsManagementPage";
import { LiveChatPage } from "./pages/admin/ly/LiveChatPage";
import { DashboardPage as AreaHeadDashboardPage } from "./pages/admin/accreditation/areaHead/DashboardPage";
import { ActivityLogPage as AreaHeadActivityLogPage } from "./pages/admin/accreditation/areaHead/ActivityLogPage";
import { ReportsPage as AreaHeadReportsPage } from "./pages/admin/accreditation/areaHead/ReportsPage";
import { DashboardPage as AccreditorDashboardPage } from "./pages/admin/accreditation/accreditor/DashboardPage";
import { MyReviewsPage } from "./pages/admin/accreditation/accreditor/MyReviewsPage";
import { StatisticsPage as AccreditorStatisticsPage } from "./pages/admin/accreditation/accreditor/StatisticsPage";

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
        <Route path={PATHS.students.internship} element={<InternshipPage />} />
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
        <Route
          path={PATHS.students.downloadableForms}
          element={<DownloadableFormsPage />}
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
      <Route path={PATHS.admin.super.dashboard} element={<PortalRoute portal="super" />}>
        <Route index element={<SuperDashboardPage />} />
        <Route path="analytics" element={<AnalyticsDashboardPage />} />
        <Route path="users" element={<UserManagementPage variant="super" />} />
        <Route path="roles" element={<RoleManagementPage variant="super" />} />
        <Route path="feedback" element={<ServiceFeedbackPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>
      {/* secondarySuperAdmin (Assistant) portal — mirrors superAdmin. */}
      <Route path={PATHS.admin.secondary.dashboard} element={<PortalRoute portal="secondary" />}>
        <Route index element={<SecondaryDashboardPage />} />
        <Route path="analytics" element={<AnalyticsDashboardPage />} />
        <Route path="users" element={<UserManagementPage variant="secondary" />} />
        <Route path="roles" element={<RoleManagementPage variant="secondary" />} />
        <Route path="feedback" element={<ServiceFeedbackPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>
      {/* adminAve portal (migrated dashboard; sub-pages pending). */}
      <Route path={PATHS.admin.ave.dashboard} element={<PortalRoute portal="ave" />}>
        <Route index element={<AveDashboardPage />} />
        <Route path="ojt" element={<AveOjtPage />} />
        <Route path="internship" element={<AveInternshipPage />} />
        <Route path="research-extension" element={<AveResearchExtensionPage />} />
        <Route path="nstp" element={<AveNstpPage />} />
        <Route path="forms-repository" element={<AveFormsRepositoryPage />} />
      </Route>
      {/* adminEnierga portal (migrated): dashboard + data tools. */}
      <Route path={PATHS.admin.enierga.dashboard} element={<PortalRoute portal="enierga" />}>
        <Route index element={<EniergaDashboardPage />} />
        <Route path="data-uploads" element={<DataUploadsPage />} />
        <Route path="analytics-report" element={<AnalyticsReportPage />} />
        <Route path="file-repository" element={<FileRepositoryPage />} />
      </Route>
      {/* adminMila portal (migrated dashboard; sub-pages pending). */}
      <Route path={PATHS.admin.mila.dashboard} element={<PortalRoute portal="mila" />}>
        <Route index element={<MilaDashboardPage />} />
        <Route path="scholarships" element={<MilaScholarshipsPage />} />
        <Route path="careers" element={<MilaCareersPage />} />
        <Route path="certificates" element={<MilaCertificatesPage />} />
        <Route path="alumni-employment" element={<MilaAlumniEmploymentPage />} />
      </Route>
      {/* adminLlave portal (Accreditation): dashboard + management tools. */}
      <Route path={PATHS.admin.llave.dashboard} element={<PortalRoute portal="llave" />}>
        <Route index element={<LlaveDashboardPage />} />
        <Route path="management" element={<ManagementPage />} />
        <Route path="review-monitoring" element={<ReviewMonitoringPage />} />
        <Route path="reports-logs" element={<ReportsLogsPage />} />
      </Route>
      {/* adminSerrano portal (Academic Affairs): dashboard + faculty tools. */}
      <Route path={PATHS.admin.serrano.dashboard} element={<PortalRoute portal="serrano" />}>
        <Route index element={<SerranoDashboardPage />} />
        <Route path="faculty-management" element={<FacultyManagementPage />} />
        <Route path="analytics-report" element={<FacultyAnalyticsReportPage />} />
      </Route>
      {/* adminCMO portal (Communications & Marketing): dashboard + news. */}
      <Route path={PATHS.admin.cmo.dashboard} element={<PortalRoute portal="cmo" />}>
        <Route index element={<CmoDashboardPage />} />
        <Route path="news" element={<NewsManagementPage />} />
      </Route>
      {/* adminLy portal (Live Chat Support): handles "Chat with an Agent". */}
      <Route path={PATHS.admin.ly.dashboard} element={<PortalRoute portal="ly" />}>
        <Route index element={<LiveChatPage />} />
      </Route>
      {/* Accreditation Area Head portal. */}
      <Route path={ACCREDITATION.areaHead.dashboard} element={<PortalRoute portal="areaHead" />}>
        <Route index element={<AreaHeadDashboardPage />} />
        <Route path="activity-log" element={<AreaHeadActivityLogPage />} />
        <Route path="reports" element={<AreaHeadReportsPage />} />
      </Route>
      {/* Accreditation Accreditor portal. */}
      <Route path={ACCREDITATION.accreditor.dashboard} element={<PortalRoute portal="accreditor" />}>
        <Route index element={<AccreditorDashboardPage />} />
        <Route path="my-reviews" element={<MyReviewsPage />} />
        <Route path="statistics" element={<AccreditorStatisticsPage />} />
      </Route>
    </Routes>
  );
}
