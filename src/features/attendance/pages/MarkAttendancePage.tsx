import { MarkAttendanceForm } from "@/features/attendance/components";

export function MarkAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload classroom photos to automatically mark attendance using face
          recognition.
        </p>
      </div>

      <MarkAttendanceForm />
    </div>
  );
}
