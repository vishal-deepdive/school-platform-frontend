import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
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
  ViewAttendancePage,
  AttendanceStatsPage,
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
} from "@/features/admin";
import { ParentApprovalsPage } from "@/features/parents";

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
          { path: "/dashboard", element: <DashboardPage /> },
          {
            path: "/attendance",
            element: <AttendancePage />,
            children: [
              { index: true, element: <Navigate to="view" replace /> },
              { path: "enroll", element: <RoleRoute><EnrollPage /></RoleRoute> },
              { path: "mark", element: <RoleRoute><MarkAttendancePage /></RoleRoute> },
              { path: "view", element: <RoleRoute><ViewAttendancePage /></RoleRoute> },
              { path: "stats", element: <RoleRoute><AttendanceStatsPage /></RoleRoute> },
            ],
          },
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
            ],
          },
          // ── Admin routes (platform admin only) ───────────────────────────
          {
            path: "/admin/onboarding",
            element: (
              <RoleRoute allow={["admin"]}>
                <OnboardingApplicationsPage />
              </RoleRoute>
            ),
          },
          {
            path: "/admin/onboarding/:applicationId",
            element: (
              <RoleRoute allow={["admin"]}>
                <ApplicationDetailPage />
              </RoleRoute>
            ),
          },
          {
            path: "/admin/admins",
            element: (
              <RoleRoute allow={["admin"]}>
                <AdminManagementPage />
              </RoleRoute>
            ),
          },
          {
            path: "/approvals/parents",
            element: (
              <RoleRoute allow={["admin", "principal"]}>
                <ParentApprovalsPage />
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
