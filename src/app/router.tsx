import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ModulePageLayout } from "@/shared/components/ui/ModulePageLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { SchoolGate } from "./routes/SchoolGate";

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

const landing = () => import("@/features/landing");
const LandingPage = lazyPage(landing, "LandingPage");
const AboutPage = lazyPage(landing, "AboutPage");
const ContactPage = lazyPage(landing, "ContactPage");
const legal = () => import("@/features/legal");
const TermsPage = lazyPage(legal, "TermsPage");
const PrivacyPage = lazyPage(legal, "PrivacyPage");
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
const RagInsightsPage = lazyPage(rag, "RagInsightsPage");
const PracticePage = lazyPage(rag, "PracticePage");
const AssignmentsPage = lazyPage(rag, "AssignmentsPage");
const FlashcardsPage = lazyPage(rag, "FlashcardsPage");
const LessonPlanPage = lazyPage(rag, "LessonPlanPage");
const FeedbackReviewPage = lazyPage(rag, "FeedbackReviewPage");
const ContentRequestsPage = lazyPage(rag, "ContentRequestsPage");

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
const SchoolsPage = lazyPage(admin, "SchoolsPage");
const SchoolDetailPage = lazyPage(admin, "SchoolDetailPage");
const UsersPage = lazyPage(admin, "UsersPage");
const AuditLogPage = lazyPage(admin, "AuditLogPage");

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
    path: "/about",
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <AboutPage />
      </Suspense>
    ),
  },
  {
    path: "/contact",
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <ContactPage />
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
    path: "/privacy",
    element: (
      <Suspense fallback={<FullPageFallback />}>
        <PrivacyPage />
      </Suspense>
    ),
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      // Teacher / co-principal invite links land here. RegisterPage detects the
      // `token` query param and renders the invite-claim form. Kept as an explicit
      // path (vs. only `/register?token=`) so invite emails carry a clear, semantic
      // URL — and so a mistyped/legacy `/register/teacher` never falls through to
      // the `*` catch-all that redirects to the landing page.
      { path: "/register/teacher", element: <RegisterPage /> },
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
            element: (
              <SchoolGate>
                <AttendancePage />
              </SchoolGate>
            ),
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
                    <SchoolGate>
                      <StudentImportPage />
                    </SchoolGate>
                  </RoleRoute>
                ),
              },
            ],
          },
          // ── Lecture Capture ───────────────────────────────────────────────
          {
            path: "/recording",
            element: (
              <SchoolGate>
                <RecordingPage />
              </SchoolGate>
            ),
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
            element: (
              <SchoolGate>
                <RagPage />
              </SchoolGate>
            ),
            children: [
              { index: true, element: <Navigate to="qa" replace /> },
              { path: "qa", element: <RoleRoute><QAPage /></RoleRoute> },
              { path: "practice", element: <RoleRoute><PracticePage /></RoleRoute> },
              { path: "flashcards", element: <RoleRoute><FlashcardsPage /></RoleRoute> },
              { path: "questions", element: <RoleRoute><QuestionsPage /></RoleRoute> },
              { path: "assignments", element: <RoleRoute><AssignmentsPage /></RoleRoute> },
              { path: "notes", element: <RoleRoute><NotesPage /></RoleRoute> },
              { path: "lesson-plan", element: <RoleRoute><LessonPlanPage /></RoleRoute> },
              { path: "insights", element: <RoleRoute><RagInsightsPage /></RoleRoute> },
              { path: "requests", element: <RoleRoute><ContentRequestsPage /></RoleRoute> },
              { path: "review", element: <RoleRoute><FeedbackReviewPage /></RoleRoute> },
              { path: "audit", element: <RoleRoute><RagAuditPage /></RoleRoute> },
              { path: "documents", element: <RoleRoute><RagDocumentsPage /></RoleRoute> },
            ],
          },
          // ── Feedback Insights ─────────────────────────────────────────────
          {
            path: "/survey",
            element: (
              <RoleRoute allow={["admin", "principal", "teacher"]}>
                <SchoolGate>
                  <SurveyPage />
                </SchoolGate>
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
              { path: "schools", element: <SchoolsPage /> },
              { path: "schools/:schoolId", element: <SchoolDetailPage /> },
              { path: "users", element: <UsersPage /> },
              { path: "audit-log", element: <AuditLogPage /> },
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
