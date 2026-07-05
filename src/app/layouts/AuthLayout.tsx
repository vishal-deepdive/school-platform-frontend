import { Suspense } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { Typewriter } from "@/shared/components/ui/auth-fuse";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useAuthStore } from "@/features/auth/store/auth";
import logoImg from "@/public/logo.png";
import authImg from "@/public/auth.png";
import registerImg from "@/public/register.png";
import onboardingImg from "@/public/school_onboarding.png";

const signInContent = {
  image: {
    src: authImg,
    alt: "A modern, collaborative space for learning",
  },
  quote: {
    text: "Welcome back! Dive back into a world of collaborative learning and growth.",
    author: "DeepDive Team",
  },
};

const signUpContent = {
  image: {
    src: registerImg,
    alt: "A vibrant, modern space for education",
  },
  quote: {
    text: "Join DeepDive. Connect students, teachers, and parents in one unified space.",
    author: "DeepDive Team",
  },
};

const onboardingContent = {
  image: {
    src: onboardingImg,
    alt: "A dynamic and collaborative school environment",
  },
  quote: {
    text: "Join DeepDive. The next-generation platform for school administration and collaborative learning.",
    author: "DeepDive Team",
  },
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
    <div className="w-full h-screen md:grid md:grid-cols-2 overflow-hidden">
      {/* Image Side (Left Side) */}
      <div
        className="hidden md:block relative h-full w-full bg-cover bg-center transition-all duration-500 ease-in-out"
        style={{ backgroundImage: `url(${currentContent.image.src})` }}
        key={currentContent.image.src}
      >
        <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-background to-transparent" />

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

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-8 pb-8">
          <blockquote className="max-w-lg space-y-2.5 rounded-2xl bg-background/80 px-6 py-5 text-center text-foreground backdrop-blur-md ring-1 ring-border/40">
            <p className="text-xl font-semibold leading-relaxed">
              “
              <Typewriter
                key={currentContent.quote.text}
                text={currentContent.quote.text}
                speed={60}
              />
              ”
            </p>
            <cite className="block text-sm font-medium text-muted-foreground not-italic">
              — {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>

      {/* Form Side (Right Side) */}
      <div className="flex flex-col p-6 md:p-12 bg-background relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="w-full max-w-md mx-auto relative flex flex-col my-auto py-8 gap-5 items-center">
          {/* Mobile Branding */}
          <div className="w-fit flex items-center md:hidden justify-center z-20 bg-white dark:bg-slate-900 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
            <img
              src={logoImg}
              alt="DeepDive Logo"
              className="h-10 w-auto object-contain"
            />
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
