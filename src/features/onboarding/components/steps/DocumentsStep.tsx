import { useCallback } from "react";
import { FileUpload } from "@/shared/components/ui/FileUpload";
import { InfoHint } from "@/shared/components/ui/InfoHint";
import { Check, FileCheck } from "lucide-react";

export interface DocumentsStepProps {
  certificate: File | null;
  setCertificate: (f: File | null) => void;
  certError: string;
  setCertError: (e: string) => void;
  /** Set when resubmitting an application that already has a certificate on file. */
  existingCertificateUrl?: string | null;
}

export function DocumentsStep({
  certificate,
  setCertificate,
  certError,
  setCertError,
  existingCertificateUrl,
}: DocumentsStepProps) {
  const handleChange = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setCertificate(files[0]);
        setCertError("");
      } else {
        setCertificate(null);
      }
    },
    [setCertificate, setCertError],
  );

  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upload your school's{" "}
          <strong className="text-foreground">registration certificate</strong>
          <InfoHint
            className="mx-1 align-middle"
            side="bottom"
            text="We use this only to verify your school is genuine during admin review. It's stored securely and never shared. Skipping it may slow approval."
          />
          ,
          UDISE affiliation letter, or any official identity document issued by
          your board or government authority.{" "}
          <span className="text-foreground/80">
            Optional — you can skip this now and add it later if the admin asks;
            it does speed up approval.
          </span>
        </p>
      </div>

      {existingCertificateUrl && !certificate && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <FileCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            You already have a{" "}
            <a
              href={existingCertificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              certificate on file
            </a>{" "}
            from your previous submission — no need to re-upload unless you want
            to replace it below.
          </p>
        </div>
      )}

      <FileUpload
        label={
          existingCertificateUrl
            ? "Replace certificate (optional)"
            : "School Certificate (recommended)"
        }
        accept="application/pdf,image/jpeg,image/png"
        maxSize={10 * 1024 * 1024}
        onChange={handleChange}
        error={certError}
        hint="PDF, JPEG or PNG — max 10 MB · optional"
      />

      {certificate && !certError && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            Certificate ready to upload
          </p>
        </div>
      )}
    </div>
  );
}
