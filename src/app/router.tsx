import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
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
  EnrollPage,
  MarkAttendancePage,
  ViewAttendancePage,
  AttendanceStatsPage,
} from "@/features/attendance";
import {
  UploadRecordingPage,
  RecordingsListPage,
  SearchRecordingsPage,
  RecordingAuditPage,
} from "@/features/recording";
import { QAPage, QuestionsPage, NotesPage, RagAuditPage } from "@/features/rag";
import {
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
          { path: "/attendance/enroll", element: <EnrollPage /> },
          { path: "/attendance/mark", element: <MarkAttendancePage /> },
          { path: "/attendance/view", element: <ViewAttendancePage /> },
          { path: "/attendance/stats", element: <AttendanceStatsPage /> },
          { path: "/recording/upload", element: <UploadRecordingPage /> },
          { path: "/recording/list", element: <RecordingsListPage /> },
          { path: "/recording/search", element: <SearchRecordingsPage /> },
          { path: "/recording/audit", element: <RecordingAuditPage /> },
          { path: "/rag/qa", element: <QAPage /> },
          { path: "/rag/questions", element: <QuestionsPage /> },
          { path: "/rag/notes", element: <NotesPage /> },
          { path: "/rag/audit", element: <RagAuditPage /> },
          { path: "/survey", element: <SurveyDashboardPage /> },
          { path: "/survey/search", element: <SurveySearchPage /> },
          { path: "/survey/data", element: <SurveyDataPage /> },
          // ── Admin routes ─────────────────────────────────────────────────
          {
            path: "/admin/onboarding",
            element: <OnboardingApplicationsPage />,
          },
          {
            path: "/admin/onboarding/:applicationId",
            element: <ApplicationDetailPage />,
          },
          { path: "/admin/admins", element: <AdminManagementPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
