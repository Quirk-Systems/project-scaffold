"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { registerNames, type RegisterName } from "@/lib/ai/registers";
import type { AnimationVocabulary } from "@/lib/ai/registers";

type PreviewResult = {
  pitch: string;
  register: RegisterName;
  animation: AnimationVocabulary;
};

async function previewVoice(body: {
  text: string;
  register: RegisterName;
  persona: string;
}): Promise<PreviewResult> {
  const res = await fetch("/api/voice-preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<PreviewResult>;
}

export default function VoicePreviewPage() {
  const [text, setText] = useState("");
  const [register, setRegister] = useState<RegisterName>("hype");

  const preview = useMutation({
    mutationFn: () => previewVoice({ text, register, persona: "house" }),
  });

  const result = preview.data;
  const motionColors: Record<string, string> = {
    calm: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    snappy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    frantic: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    swoon: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voice Preview</h1>
        <p className="text-muted-foreground text-sm">
          Audition the house persona + register before minting an offer. Pick a
          register, paste your asset text, and see the composed pitch alongside
          the animation vocabulary the UI would key motion off.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Register</p>
                <div className="flex flex-wrap gap-2">
                  {(registerNames as RegisterName[]).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={register === r ? "default" : "outline"}
                      onClick={() => setRegister(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Paste asset text — prose, lyrics, a prompt, anything with signal…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
              />
              {preview.error && (
                <p className="text-destructive text-sm">
                  {(preview.error as Error).message}
                </p>
              )}
              <div>
                <Button
                  onClick={() => preview.mutate()}
                  disabled={!text.trim() || preview.isPending}
                >
                  {preview.isPending ? "Composing…" : "Compose pitch"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pitch —{" "}
                    <span className="font-normal italic">{result.register}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.pitch}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Animation vocabulary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-36 text-xs">
                      waiting caption
                    </span>
                    <span className="text-sm font-medium italic">
                      &ldquo;{result.animation.waitingCaption}&rdquo;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-36 text-xs">
                      motion
                    </span>
                    <Badge
                      className={
                        motionColors[result.animation.motion] ??
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {result.animation.motion}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-36 text-xs">
                      intensity
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{
                            width: `${result.animation.intensity * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                        {result.animation.intensity.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-36 text-xs">
                      enter / exit
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {result.animation.enterMs}ms / {result.animation.exitMs}ms
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && !preview.isPending && (
            <div className="border-muted flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground text-sm">
                Pitch appears here after composing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
