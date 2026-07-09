import { Suspense } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useAuthStore } from "@/features/auth/store/auth";
import logoImg from "@/public/logo.png";
import authImg from "@/public/auth.png";
import registerImg from "@/public/register.png";
import onboardingImg from "@/public/school_onboarding.png";

interface PanelContent {
  image: { src: string; alt: string };
  headline: string;
  subcopy: string;
  highlights: string[];
}

// Concrete value props per journey — what the person actually gets — instead of
// a generic testimonial. Speaks to the audience each flow serves.
const signInContent: PanelContent = {
  image: {
    src: authImg,
    alt: "A modern, collaborative space for learning",
  },
  headline: "Welcome back to DeepDive",
  subcopy: "Pick up right where you left off.",
  highlights: [
    "Attendance & class analytics",
    "Lecture capture you can search",
    "Your AI study assistant",
  ],
};

const signUpContent: PanelContent = {
  image: {
    src: registerImg,
    alt: "A vibrant, modern space for education",
  },
  headline: "One platform for your whole school",
  subcopy: "Students, parents, and teachers — connected in one secure space.",
  highlights: [
    "Students: track classes and progress",
    "Parents: stay in the loop on your child",
    "Teachers: manage rosters in minutes",
  ],
};

const onboardingContent: PanelContent = {
  image: {
    src: onboardingImg,
    alt: "A dynamic and collaborative school environment",
  },
  headline: "Bring your school onto DeepDive",
  subcopy: "A guided setup for admissions, staff, and classes.",
  highlights: [
    "Guided school setup",
    "Invite staff and teachers",
    "Go live in days, not weeks",
  ],
};

const GUEST_ONLY_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
];

export function AuthLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated && GUEST_ONLY_ROUTES.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Password-recovery pages belong to the sign-in journey, so they share its imagery
  const SIGN_IN_ROUTES = [
    "login",
    "forgot-password",
    "reset-password",
    "verify-otp",
    "auth/callback",
  ];
  const isSignIn =
    location.pathname === "/" ||
    SIGN_IN_ROUTES.some((r) => location.pathname.includes(r));
  const isOnboarding = location.pathname.includes("onboarding");

  const currentContent = isOnboarding
    ? onboardingContent
    : isSignIn
      ? signInContent
      : signUpContent;

  return (
    <div className={`w-full h-screen md:grid ${isOnboarding ? "md:grid-cols-[40%_60%]" : "md:grid-cols-2"} overflow-hidden`}>
      {/* Image Side (Left Side) */}
      <div
        className="hidden md:block relative h-full w-full bg-cover bg-center transition-all duration-500 ease-in-out"
        style={{ backgroundImage: `url(${currentContent.image.src})` }}
        key={currentContent.image.src}
        role="img"
        aria-label={currentContent.image.alt}
      >
        <div className="absolute inset-x-0 bottom-0 h-[320px] bg-gradient-to-t from-background to-transparent" />

        {/* Desktop Branding Top Left */}
        <Link
          to="/"
          className="absolute top-5 left-5 flex items-center z-20 bg-white dark:bg-slate-900 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/50 shadow-sm"
        >
          <img
            src={logoImg}
            alt="DeepDive Logo"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* <div className="relative z-10 flex h-full flex-col items-start justify-end p-8 pb-10">
          <div className="max-w-lg space-y-4 rounded-2xl bg-background/80 px-6 py-6 text-foreground backdrop-blur-md ring-1 ring-border/40">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold leading-tight tracking-tight">
                <Typewriter
                  key={currentContent.headline}
                  text={currentContent.headline}
                  speed={45}
                />
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentContent.subcopy}
              </p>
            </div>
            <ul className="grid gap-2">
              {currentContent.highlights.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div> */}
      </div>

      {/* Form Side (Right Side) */}
      <div className="flex flex-col p-6 md:p-12 bg-background relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className={`w-full ${isOnboarding ? "max-w-3xl xl:max-w-4xl" : "max-w-md"} mx-auto relative flex flex-col my-auto py-8 gap-5 items-center`}>
          {/* Mobile Branding */}
          <div className="flex flex-col items-center gap-2 md:hidden">
            <div className="w-fit flex items-center justify-center z-20 bg-white dark:bg-slate-900 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
              <img
                src={logoImg}
                alt="DeepDive Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center text-balance">
              {currentContent.subcopy}
            </p>
          </div>

          <div className="shrink-0 w-full">
            <Suspense
              fallback={
                <div
                  className="mx-auto w-full max-w-[350px] space-y-4"
                  aria-busy="true"
                >
                  <Skeleton className="mx-auto h-8 w-56" />
                  <Skeleton className="mx-auto h-4 w-44" />
                  <Skeleton className="h-64 w-full" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
