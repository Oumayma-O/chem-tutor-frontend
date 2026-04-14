import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RevealHelpSection } from "@/components/tutor/steps/RevealHelpSection";

describe("RevealHelpSection", () => {
  it("renders nothing when completed", () => {
    const { container } = render(
      <RevealHelpSection completed revealLimitReached={false} revealAnswerText="x" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows session limit copy when capped", () => {
    render(<RevealHelpSection completed={false} revealLimitReached revealAnswerText="x" />);
    expect(screen.getByText(/all your help/i)).toBeInTheDocument();
  });

  it("shows stuck copy when reveal text present", () => {
    render(<RevealHelpSection completed={false} revealLimitReached={false} revealAnswerText="42" />);
    expect(screen.getByText(/Stuck\?/i)).toBeInTheDocument();
  });
});
