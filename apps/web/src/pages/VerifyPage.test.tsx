// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { VerifyPage } from "./VerifyPage.js";

describe("VerifyPage", () => {
  it("renders public verification heading", () => {
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Public Verification")).toBeInTheDocument();
  });
});
