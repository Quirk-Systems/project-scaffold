"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Submit button for the checkout form. It disables itself while the server
 * action creates the Stripe session, so a slow redirect can't be clicked twice.
 */
export function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Opening checkout…" : "Subscribe"}
    </Button>
  );
}
