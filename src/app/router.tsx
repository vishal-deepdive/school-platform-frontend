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
              { index: true, element: <Navigate to="enroll" replace /> },
              { path: "enroll", element: <EnrollPage /> },
              { path: "mark", element: <MarkAttendancePage /> },
              { path: "view", element: <ViewAttendancePage /> },
              { path: "stats", element: <AttendanceStatsPage /> },
            ],
          },
          {
            path: "/recording",
            element: <RecordingPage />,
            children: [
              { index: true, element: <Navigate to="upload" replace /> },
              { path: "upload", element: <UploadRecordingPage /> },
              { path: "list", element: <RecordingsListPage /> },
              { path: "search", element: <SearchRecordingsPage /> },
              { path: "audit", element: <RecordingAuditPage /> },
            ],
          },
          {
            path: "/rag",
            element: <RagPage />,
            children: [
              { index: true, element: <Navigate to="qa" replace /> },
              { path: "qa", element: <QAPage /> },
              { path: "questions", element: <QuestionsPage /> },
              { path: "notes", element: <NotesPage /> },
              { path: "audit", element: <RagAuditPage /> },
              { path: "documents", element: <RagDocumentsPage /> },
            ],
          },
          {
            path: "/survey",
            element: <SurveyPage />,
            children: [
              { index: true, element: <SurveyDashboardPage /> },
              { path: "search", element: <SurveySearchPage /> },
              { path: "data", element: <SurveyDataPage /> },
            ],
          },
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
