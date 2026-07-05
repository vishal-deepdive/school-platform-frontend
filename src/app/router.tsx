import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ModulePageLayout } from "@/shared/components/ui/ModulePageLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";

/*
 * Route-level code splitting: every feature barrel is imported lazily, so each
 * feature becomes its own chunk and the landing page doesn't pay for recharts,
 * katex, or the syntax highlighter. Pages within one feature share a chunk, so
 * switching tabs inside a module never re-suspends.
 */
function lazyPage<K extends string, T extends Record<K, ComponentType>>(
  loader: () => Promise<T>,
  name: K,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const auth = () => import("@/features/auth");
const LoginPage = lazyPage(auth, "LoginPage");
const RegisterPage = lazyPage(auth, "RegisterPage");
const VerifyOtpPage = lazyPage(auth, "VerifyOtpPage");
const ForgotPasswordPage = lazyPage(auth, "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(auth, "ResetPasswordPage");
const AuthCallbackPage = lazyPage(auth, "AuthCallbackPage");
const GoogleCompleteProfilePage = lazyPage(auth, "GoogleCompleteProfilePage");

const LandingPage = lazyPage(() => import("@/features/landing"), "LandingPage");
const TermsPage = lazyPage(() => import("@/features/legal"), "TermsPage");
const DashboardPage = lazyPage(() => import("@/features/dashboard"), "DashboardPage");
const ProfilePage = lazyPage(() => import("@/features/profile"), "ProfilePage");
const ParentApprovalsPage = lazyPage(() => import("@/features/parents"), "ParentApprovalsPage");

const attendance = () => import("@/features/attendance");
const AttendancePage = lazyPage(attendance, "AttendancePage");
const AttendanceDashboardPage = lazyPage(attendance, "AttendanceDashboardPage");
const EnrollPage = lazyPage(attendance, "EnrollPage");
const RollCallPage = lazyPage(attendance, "RollCallPage");
const MarkAttendancePage = lazyPage(attendance, "MarkAttendancePage");
const ViewAttendancePage = lazyPage(attendance, "ViewAttendancePage");
const LeavePage = lazyPage(attendance, "LeavePage");
const HolidaysPage = lazyPage(attendance, "HolidaysPage");
const ManageStudentsPage = lazyPage(attendance, "ManageStudentsPage");
const AttendanceStatsPage = lazyPage(attendance, "AttendanceStatsPage");

const recording = () => import("@/features/recording");
const RecordingPage = lazyPage(recording, "RecordingPage");
const UploadRecordingPage = lazyPage(recording, "UploadRecordingPage");
const RecordingsListPage = lazyPage(recording, "RecordingsListPage");
const SearchRecordingsPage = lazyPage(recording, "SearchRecordingsPage");
const RecordingAuditPage = lazyPage(recording, "RecordingAuditPage");

const rag = () => import("@/features/rag");
const RagPage = lazyPage(rag, "RagPage");
const QAPage = lazyPage(rag, "QAPage");
const QuestionsPage = lazyPage(rag, "QuestionsPage");
const NotesPage = lazyPage(rag, "NotesPage");
const RagAuditPage = lazyPage(rag, "RagAuditPage");
const RagDocumentsPage = lazyPage(rag, "RagDocumentsPage");

const survey = () => import("@/features/survey");
const SurveyPage = lazyPage(survey, "SurveyPage");
const SurveyDashboardPage = lazyPage(survey, "SurveyDashboardPage");
const SurveySearchPage = lazyPage(survey, "SurveySearchPage");
const SurveyDataPage = lazyPage(survey, "SurveyDataPage");
const SurveySourcePage = lazyPage(survey, "SurveySourcePage");

const onboarding = () => import("@/features/onboarding");
const SchoolOnboardingPage = lazyPage(onboarding, "SchoolOnboardingPage");
const ApplicationStatusPage = lazyPage(onboarding, "ApplicationStatusPage");
const VerifyOnboardingOtpPage = lazyPage(onboarding, "VerifyOnboardingOtpPage");

const admin = () => import("@/features/admin");
const OnboardingApplicationsPage = lazyPage(admin, "OnboardingApplicationsPage");
const ApplicationDetailPage = lazyPage(admin, "ApplicationDetailPage");
const AdminManagementPage = lazyPage(admin, "AdminManagementPage");
const PromptsPage = lazyPage(admin, "PromptsPage");
const StudentImportPage = lazyPage(admin, "StudentImportPage");

/** Full-viewport fallback for routes that render outside AppLayout. */
function FullPageFallback() {
  return <div className="min-h-screen w-full bg-background" aria-busy="true" />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: "/terms",
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <TermsPage />
      </Suspense>
    ),
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/verify-otp", element: <VerifyOtpPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/auth/callback", element: <AuthCallbackPage /> },
      { path: "/complete-profile", element: <GoogleCompleteProfilePage /> },
      // ── School onboarding (public, auth-layout) ──────────────────────────
      { path: "/onboarding/apply", element: <SchoolOnboardingPage /> },
      { path: "/onboarding/status", element: <ApplicationStatusPage /> },
      { path: "/onboarding/verify", element: <VerifyOnboardingOtpPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // ── Dashboard ────────────────────────────────────────────────────
          {
            path: "/dashboard",
            element: <ModulePageLayout />,
            children: [{ index: true, element: <DashboardPage /> }],
          },
          // ── Profile ──────────────────────────────────────────────────────
          {
            path: "/profile",
            element: <ModulePageLayout />,
            children: [{ index: true, element: <ProfilePage /> }],
          },
          // ── Attendance ───────────────────────────────────────────────────
          {
            path: "/attendance",
            element: <AttendancePage />,
            children: [
              { index: true, element: <Navigate to="view" replace /> },
              { path: "dashboard", element: <RoleRoute><AttendanceDashboardPage /></RoleRoute> },
              { path: "enroll", element: <RoleRoute><EnrollPage /></RoleRoute> },
              { path: "roll-call", element: <RoleRoute><RollCallPage /></RoleRoute> },
              { path: "mark", element: <RoleRoute><MarkAttendancePage /></RoleRoute> },
              { path: "view", element: <RoleRoute><ViewAttendancePage /></RoleRoute> },
              { path: "leave", element: <RoleRoute><LeavePage /></RoleRoute> },
              { path: "holidays", element: <RoleRoute><HolidaysPage /></RoleRoute> },
              { path: "manage", element: <RoleRoute><ManageStudentsPage /></RoleRoute> },
              { path: "stats", element: <RoleRoute><AttendanceStatsPage /></RoleRoute> },
            ],
          },
          // ── Student roster (shares Attendance module in nav) ─────────────
          {
            path: "/students",
            element: <ModulePageLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: "import",
                element: (
                  <RoleRoute allow={["admin", "principal"]}>
                    <StudentImportPage />
                  </RoleRoute>
                ),
              },
            ],
          },
          // ── Lecture Capture ───────────────────────────────────────────────
          {
            path: "/recording",
            element: <RecordingPage />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: "upload", element: <RoleRoute><UploadRecordingPage /></RoleRoute> },
              { path: "list", element: <RoleRoute><RecordingsListPage /></RoleRoute> },
              { path: "search", element: <RoleRoute><SearchRecordingsPage /></RoleRoute> },
              { path: "audit", element: <RoleRoute><RecordingAuditPage /></RoleRoute> },
            ],
          },
          // ── Study Assistant ───────────────────────────────────────────────
          {
            path: "/rag",
            element: <RagPage />,
            children: [
              { index: true, element: <Navigate to="qa" replace /> },
              { path: "qa", element: <RoleRoute><QAPage /></RoleRoute> },
              { path: "questions", element: <RoleRoute><QuestionsPage /></RoleRoute> },
              { path: "notes", element: <RoleRoute><NotesPage /></RoleRoute> },
              { path: "audit", element: <RoleRoute><RagAuditPage /></RoleRoute> },
              { path: "documents", element: <RoleRoute><RagDocumentsPage /></RoleRoute> },
            ],
          },
          // ── Feedback Insights ─────────────────────────────────────────────
          {
            path: "/survey",
            element: (
              <RoleRoute allow={["admin", "principal", "teacher"]}>
                <SurveyPage />
              </RoleRoute>
            ),
            children: [
              { index: true, element: <SurveyDashboardPage /> },
              { path: "search", element: <SurveySearchPage /> },
              {
                path: "data",
                element: (
                  <RoleRoute allow={["admin", "principal"]}>
                    <SurveyDataPage />
                  </RoleRoute>
                ),
              },
              {
                path: "source",
                element: (
                  <RoleRoute allow={["admin", "principal"]}>
                    <SurveySourcePage />
                  </RoleRoute>
                ),
              },
            ],
          },
          // ── Parent Approvals ──────────────────────────────────────────────
          {
            path: "/approvals",
            element: (
              <RoleRoute allow={["admin", "principal"]}>
                <ModulePageLayout />
              </RoleRoute>
            ),
            children: [
              { index: true, element: <Navigate to="parents" replace /> },
              { path: "parents", element: <ParentApprovalsPage /> },
            ],
          },
          // ── Platform Admin ────────────────────────────────────────────────
          {
            path: "/admin",
            element: (
              <RoleRoute allow={["admin"]}>
                <ModulePageLayout />
              </RoleRoute>
            ),
            children: [
              { index: true, element: <Navigate to="onboarding" replace /> },
              { path: "onboarding", element: <OnboardingApplicationsPage /> },
              { path: "onboarding/:applicationId", element: <ApplicationDetailPage /> },
              { path: "admins", element: <AdminManagementPage /> },
              { path: "prompts", element: <PromptsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
