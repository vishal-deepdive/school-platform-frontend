/**
 * One-time getting-started card shown to a teacher right after they accept an
 * invite and land on the dashboard. Driven by the TEACHER_WELCOME_FLAG that the
 * invite-registration form sets; dismissing (or clicking a CTA) clears it so it
 * never nags on later visits.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  CheckSquare,
  AudioLines,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { useAuthStore } from "@/features/auth/store/auth";
import { TEACHER_WELCOME_FLAG } from "@/features/auth/constants";

function readFlag(): boolean {
  try {
    return localStorage.getItem(TEACHER_WELCOME_FLAG) === "1";
  } catch {
    return false;
  }
}

const STEPS = [
  {
    icon: CheckSquare,
    title: "Take attendance",
    desc: "Mark a class in seconds with face recognition or roll call.",
    to: "/attendance/mark",
  },
  {
    icon: AudioLines,
    title: "Capture a lecture",
    desc: "Upload a recording and get notes, questions, and resources.",
    to: "/recording/upload",
  },
  {
    icon: MessageSquare,
    title: "Ask the study assistant",
    desc: "Answer doubts from your textbooks with cited sources.",
    to: "/rag/qa",
  },
] as const;

export function TeacherWelcomeCard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [show, setShow] = useState(readFlag);

  if (!show || user?.role !== "teacher") return null;

  const dismiss = () => {
    try {
      localStorage.removeItem(TEACHER_WELCOME_FLAG);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const go = (to: string) => {
    dismiss();
    navigate(to);
  };

  const firstName = user.full_name?.trim().split(/\s+/)[0];

  return (
    <Card padding="md" className="relative border-primary/30">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4 flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Welcome to DeepDive{firstName ? `, ${firstName}` : ""} 🎉
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You're all set. Here are three things to try first.
          </p>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.to}>
              <button
                type="button"
                onClick={() => go(s.to)}
                className="group flex h-full w-full flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {s.title}
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
