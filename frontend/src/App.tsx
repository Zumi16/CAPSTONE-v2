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

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
