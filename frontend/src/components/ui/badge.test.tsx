import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge.js";

describe("Badge Component", () => {
  it("renders children correctly", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeDefined();
  });

  it("applies default classes", () => {
    const { container } = render(<Badge>Default</Badge>);
    const element = container.firstChild as HTMLDivElement;
    expect(element.className).toContain("bg-primary");
  });
});
