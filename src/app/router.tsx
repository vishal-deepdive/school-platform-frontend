import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ModulePageLayout } from "@/shared/components/ui/ModulePageLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import {
  LoginPage,
  RegisterPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  AuthCallbackPage,
  GoogleCompleteProfilePage,
} from "@/features/auth";
import { LandingPage } from "@/features/landing";
import { DashboardPage } from "@/features/dashboard";
import {
  AttendancePage,
  EnrollPage,
  MarkAttendancePage,
  RollCallPage,
  ViewAttendancePage,
  AttendanceStatsPage,
  AttendanceDashboardPage,
  HolidaysPage,
  LeavePage,
  ManageStudentsPage,
} from "@/features/attendance";
import {
  RecordingPage,
  UploadRecordingPage,
  RecordingsListPage,
  SearchRecordingsPage,
  RecordingAuditPage,
} from "@/features/recording";
import {
  RagPage,
  QAPage,
  QuestionsPage,
  NotesPage,
  RagAuditPage,
  RagDocumentsPage,
} from "@/features/rag";
import {
  SurveyPage,
  SurveyDashboardPage,
  SurveySearchPage,
  SurveyDataPage,
  SurveySourcePage,
} from "@/features/survey";
import {
  SchoolOnboardingPage,
  ApplicationStatusPage,
  VerifyOnboardingOtpPage,
} from "@/features/onboarding";
import {
  OnboardingApplicationsPage,
  ApplicationDetailPage,
  AdminManagementPage,
  PromptsPage,
  StudentImportPage,
} from "@/features/admin";
import { ParentApprovalsPage } from "@/features/parents";
import { ProfilePage } from "@/features/profile";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
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
