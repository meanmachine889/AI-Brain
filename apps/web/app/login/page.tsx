"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, type Agency } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthResponse = { token: string; agency: Agency };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login" ? { email, password } : { name, email, password };
      const data = await api<AuthResponse>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">🧠 Agency AI Brain</CardTitle>
          <CardDescription>
            {mode === "login" ? "Sign in to your agency" : "Create your agency"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Agency name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "..."
                : mode === "login"
                  ? "Sign in"
                  : "Create agency"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "register" : "login");
            }}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
