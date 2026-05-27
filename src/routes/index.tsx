import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EnrollPage } from '@/pages/attendance/EnrollPage'
import { MarkAttendancePage } from '@/pages/attendance/MarkAttendancePage'
import { ViewAttendancePage } from '@/pages/attendance/ViewAttendancePage'
import { AttendanceStatsPage } from '@/pages/attendance/AttendanceStatsPage'
import { UploadRecordingPage } from '@/pages/recording/UploadRecordingPage'
import { RecordingsListPage } from '@/pages/recording/RecordingsListPage'
import { RecordingAuditPage } from '@/pages/recording/RecordingAuditPage'
import { QAPage } from '@/pages/rag/QAPage'
import { QuestionsPage } from '@/pages/rag/QuestionsPage'
import { NotesPage } from '@/pages/rag/NotesPage'
import { RagAuditPage } from '@/pages/rag/RagAuditPage'
import { SurveyDashboardPage } from '@/pages/survey/SurveyDashboardPage'
import { SurveySearchPage } from '@/pages/survey/SurveySearchPage'
import { SurveyDataPage } from '@/pages/survey/SurveyDataPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { GoogleCompleteProfilePage } from '@/pages/auth/GoogleCompleteProfilePage'
import { SchoolOnboardingPage } from '@/pages/onboarding/SchoolOnboardingPage'
import { ApplicationStatusPage } from '@/pages/onboarding/ApplicationStatusPage'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-otp', element: <VerifyOtpPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/complete-profile', element: <GoogleCompleteProfilePage /> },
      // ── School onboarding (public, auth-layout) ──────────────────────────
      { path: '/onboarding/apply',  element: <SchoolOnboardingPage /> },
      { path: '/onboarding/status', element: <ApplicationStatusPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/attendance/enroll', element: <EnrollPage /> },
          { path: '/attendance/mark', element: <MarkAttendancePage /> },
          { path: '/attendance/view', element: <ViewAttendancePage /> },
          { path: '/attendance/stats', element: <AttendanceStatsPage /> },
          { path: '/recording/upload', element: <UploadRecordingPage /> },
          { path: '/recording/list', element: <RecordingsListPage /> },
          { path: '/recording/audit', element: <RecordingAuditPage /> },
          { path: '/rag/qa', element: <QAPage /> },
          { path: '/rag/questions', element: <QuestionsPage /> },
          { path: '/rag/notes', element: <NotesPage /> },
          { path: '/rag/audit', element: <RagAuditPage /> },
          { path: '/survey', element: <SurveyDashboardPage /> },
          { path: '/survey/search', element: <SurveySearchPage /> },
          { path: '/survey/data', element: <SurveyDataPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
