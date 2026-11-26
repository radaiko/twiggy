// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCompletion, readPage } from "../src/lib/native-reader";

const fixtures = join(__dirname, "fixtures", "github");

function source(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

function load(name: string): Document {
  return new DOMParser().parseFromString(source(name), "text/html");
}

// A paged collection view past its first page: the page address names page 2 or later.
const PAGED = { pagedView: true, firstPage: false };
// The first page of any recognised scope.
const FIRST = { pagedView: false, firstPage: true };

describe("readPage", () => {
  it("reads GitHub's page parameter and falls back to 1", () => {
    expect(readPage({ pathname: "/o/r/branches/all" })).toBe(1);
    expect(readPage({ pathname: "/o/r/branches/all", search: "?page=7" })).toBe(7);
    expect(readPage({ pathname: "/o/r/branches/all", search: "?page=0" })).toBe(1);
    expect(readPage({ pathname: "/o/r/branches/all", search: "?page=nope" })).toBe(1);
  });
});

describe("readCompletion", () => {
  // @req REQ-BC-12
  it("completes a page-one search with the single-page proof", () => {
    expect(readCompletion(load("vscode-search.html"), 1, FIRST)).toEqual({
      kind: "single-page",
    });
  });

  // @req REQ-BC-12
  it("completes a page-one overview with the single-page proof", () => {
    expect(readCompletion(load("vscode-overview.html"), 6, FIRST)).toEqual({
      kind: "single-page",
    });
  });

  // @req REQ-BC-12
  it("completes page one when GitHub renders no pager for a 20-row list", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 20, FIRST)).toEqual({ kind: "single-page" });
  });

  // @req REQ-BC-12
  it("completes page one when the only Next is disabled", () => {
    expect(readCompletion(load("vscode-all-end.html"), 20, FIRST)).toEqual({
      kind: "single-page",
    });
  });

  // @req REQ-BC-4
  it("reads the disabled Next anchor past page one as the end signal", () => {
    expect(readCompletion(load("vscode-all-end.html"), 20, PAGED)).toEqual({
      kind: "end-signal",
    });
  });

  // @req REQ-BC-4
  it("reads an enabled Next anchor as unknown", () => {
    expect(readCompletion(load("vscode-all-first.html"), 20, { pagedView: true, firstPage: true })).toEqual({
      kind: "unknown",
    });
    expect(readCompletion(load("vscode-active.html"), 20, PAGED)).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("reads the native blankslate with zero rows as confirmed empty", () => {
    expect(readCompletion(load("vscode-search-empty.html"), 0, FIRST)).toEqual({
      kind: "confirmed-empty",
    });
  });

  // @req REQ-BC-4
  it("never calls an empty state confirmed while rows were collected", () => {
    expect(readCompletion(load("vscode-search-empty.html"), 20, FIRST).kind).not.toBe(
      "confirmed-empty",
    );
  });

  // @req REQ-BC-12
  it("never proves an empty page one complete without the blankslate", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 0, FIRST)).toEqual({ kind: "unknown" });
  });

  // @req REQ-BC-4
  it("reads pager absence on a paged view past the first page as the end signal", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 540, PAGED)).toEqual({ kind: "end-signal" });
  });

  // @req REQ-BC-4
  it("does not prove an end on a later page of a view that never paged", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 20, { pagedView: false, firstPage: false })).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("ignores an absent spinner or an unchanged row count", () => {
    expect(readCompletion(load("vscode-all-end.html"), 0, PAGED)).toEqual({
      kind: "end-signal",
    });
  });
});
