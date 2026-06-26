"use client";

import { cn } from "@/lib/utils";
import { signUp } from "@/app/auth/sign-up/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [employeeId, setEmployeeId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [passwordState, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isHawaiiFarming = employeeId.startsWith("HF");

  const handleSignUp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanEmployeeId = employeeId.trim().toUpperCase().replace(/-/g, "");
    const cleanAccessKey = accessKey.trim();
    const password = isHawaiiFarming ? cleanAccessKey : passwordState;

    if (!isHawaiiFarming) {
      if (passwordState !== confirmPassword) {
        setError("Passwords do not match.");
        setIsLoading(false);
        return;
      }
      if (passwordState.length < 8) {
        setError("Password must be at least 8 characters.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const result = await signUp(cleanEmployeeId, cleanAccessKey, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      // Account created — sign in immediately
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${cleanEmployeeId}@campocaribe.internal`,
        password,
      });

      if (signInError) {
        router.push("/auth/login?registered=1");
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center mb-2">
        <Image
          src="/farm-cup-trophy.png"
          alt="The Farm Cup 2026"
          width={100}
          height={125}
          className="object-contain"
          priority
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            {isHawaiiFarming
              ? "Enter your employee ID and access key to get started"
              : "Use your employee ID and the access key HR provided"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  placeholder="e.g. 6KYLJ6V2N or HF001"
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accessKey">Access Key</Label>
                <Input
                  id="accessKey"
                  placeholder="Access key from HR"
                  required
                  inputMode="numeric"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                />
              </div>
              {!isHawaiiFarming && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={passwordState}
                      onChange={(e) => setPasswordState(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
