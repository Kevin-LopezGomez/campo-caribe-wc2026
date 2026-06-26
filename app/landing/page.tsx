import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function AuthRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
  return null;
}

export default function LandingPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Suspense>
        <AuthRedirect />
      </Suspense>
      <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center">
        <div className="flex flex-col items-center gap-3 mb-2">
          <Image
            src="/farm-cup-trophy.png"
            alt="The Farm Cup 2026"
            width={180}
            height={225}
            className="object-contain"
            priority
          />
          <h1 className="text-3xl font-bold tracking-tight text-center">
            The Farm Cup 2026
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            World Cup Prediction Challenge
          </p>
        </div>

        {/* vs banner */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <Image src="/logo.png" alt="Campo Caribe" width={48} height={48} className="object-contain" />
            <span className="text-sm font-medium">Campo Caribe</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-1.5">
            <Image src="/hawaii-farming-logo.avif" alt="Hawaii Farming" width={48} height={48} className="object-contain" />
            <span className="text-sm font-medium">Hawaii Farming</span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <Link
            href="/auth/login"
            className="flex-1 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            Log In
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex-1 border border-border rounded-md px-4 py-2.5 text-sm font-semibold text-center hover:bg-muted/40 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
