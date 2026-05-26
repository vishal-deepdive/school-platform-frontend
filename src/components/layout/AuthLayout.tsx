import { Outlet, useLocation } from 'react-router-dom'
import { Typewriter } from '@/components/ui/auth-fuse'
import logoImg from '@/public/logo.png'
import authImg from '@/public/auth.png'
import registerImg from '@/public/register.png'

const signInContent = {
    image: {
        src: authImg,
        alt: "A modern, collaborative space for learning"
    },
    quote: {
        text: "Welcome back! Dive back into a world of collaborative learning and growth.",
        author: "DeepDive Team"
    }
};

const signUpContent = {
    image: {
        src: registerImg,
        alt: "A vibrant, modern space for education"
    },
    quote: {
        text: "Join DeepDive. Connect students, teachers, and parents in one unified space.",
        author: "DeepDive Team"
    }
};

export function AuthLayout() {
  const location = useLocation()
  const isSignIn = location.pathname.includes('login') || location.pathname === '/'
  const currentContent = isSignIn ? signInContent : signUpContent;

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
        <div className="absolute top-5 left-5 flex items-center z-20 bg-white backdrop-blur-md px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
           <img src={logoImg} alt="DeepDive Logo" className="h-8 w-auto object-contain" />
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-8 pb-8">
            <blockquote className="space-y-2.5 text-center text-foreground bg-background/80 max-w-lg">
              <p className="text-xl font-semibold leading-relaxed">
                “<Typewriter
                    key={currentContent.quote.text}
                    text={currentContent.quote.text}
                    speed={60}
                  />”
              </p>
              <cite className="block text-sm font-medium text-muted-foreground not-italic">
                  — {currentContent.quote.author}
              </cite>
            </blockquote>
        </div>
      </div>

      {/* Form Side (Right Side) */}
      <div className="flex flex-col p-6 md:p-12 bg-background relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="w-full max-w-md mx-auto relative flex flex-col my-auto py-8">
            {/* Mobile Branding */}
            <div className="flex items-center gap-3 mb-8 md:hidden justify-center shrink-0">
              <img src={logoImg} alt="DeepDive Logo" className="h-10 w-auto object-contain drop-shadow-md" />
              <span className="text-2xl font-bold text-foreground tracking-tight">DeepDive</span>
            </div>
            
            <div className="shrink-0 w-full">
               <Outlet />
            </div>
        </div>
      </div>
    </div>
  );
}
