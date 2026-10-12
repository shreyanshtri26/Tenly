"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// A submit button that reacts to its own form: it disables itself and shows
// `pendingText` from the moment the form is sent until the server answers.
type Props = ComponentProps<typeof Button> & { pendingText?: string };

export function SubmitButton({ children, pendingText = "Saving…", disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
