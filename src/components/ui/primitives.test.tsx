import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

describe("ui primitives", () => {
  it("mark every part with a data-slot", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="name">Name</Label>
          <Input id="name" />
          <Textarea aria-label="Notes" />
          <Separator />
          <Badge>1/1</Badge>
          <Button>Go</Button>
        </CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    const slots = Array.from(container.querySelectorAll("[data-slot]")).map(
      (el) => el.getAttribute("data-slot"),
    );
    expect(slots).toEqual([
      "card",
      "card-header",
      "card-title",
      "card-description",
      "card-content",
      "label",
      "input",
      "textarea",
      "separator",
      "badge",
      "button",
      "card-footer",
    ]);
  });

  it("forward refs to the underlying element", () => {
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    const card = createRef<HTMLDivElement>();
    render(
      <Card ref={card}>
        <Input ref={input} aria-label="Name" />
        <Textarea ref={textarea} aria-label="Notes" />
      </Card>,
    );

    expect(input.current).toBe(screen.getByLabelText("Name"));
    expect(textarea.current).toBe(screen.getByLabelText("Notes"));
    expect(card.current?.dataset.slot).toBe("card");
  });

  it("keeps caller classes merged with the primitive's", () => {
    render(<Input aria-label="Name" className="w-1/2" />);
    const el = screen.getByLabelText("Name");
    expect(el).toHaveClass("w-1/2", "rounded-md");
    expect(el).not.toHaveClass("w-full");
  });
});
