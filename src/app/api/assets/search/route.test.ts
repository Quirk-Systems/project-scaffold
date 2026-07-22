import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./params";

describe("parseSearchParams", () => {
  it("parses combined discovery filters", () => {
    const params = new URLSearchParams({
      q: "  strange loop ",
      type: "text,image,invalid",
      status: "captured",
      tag: "dreamy,lo-fi",
      limit: "25",
      offset: "5",
    });

    expect(parseSearchParams(params)).toEqual({
      text: "  strange loop ",
      assetTypes: ["text", "image"],
      statuses: ["captured"],
      tags: ["dreamy", "lo-fi"],
      limit: 25,
      offset: 5,
    });
  });

  it("drops invalid enum and pagination values", () => {
    const params = new URLSearchParams({
      type: "unknown",
      status: "pending",
      limit: "many",
      offset: "1.5",
    });

    expect(parseSearchParams(params)).toEqual({
      text: undefined,
      assetTypes: undefined,
      statuses: undefined,
      tags: undefined,
      limit: undefined,
      offset: undefined,
    });
  });

  it("accepts repeated filter parameters", () => {
    const params = new URLSearchParams("tag=one&tag=two&type=audio&type=video");

    expect(parseSearchParams(params)).toMatchObject({
      tags: ["one", "two"],
      assetTypes: ["audio", "video"],
    });
  });
});
