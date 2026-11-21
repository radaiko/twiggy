// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCompletion } from "../src/lib/native-reader";

const fixtures = join(__dirname, "fixtures", "github");

function source(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

function load(name: string): Document {
  return new DOMParser().parseFromString(source(name), "text/html");
}

// A paged collection view: the page address names a page of /all or /active.
const PAGED = { pagedView: true, firstPage: false };
// A view that renders no pager and is not paginated (overview, search).
const UNPAGED = { pagedView: false, firstPage: false };
// The first page of a paged view: A4's inferred zero-result page 1 of /all also has no pager.
const FIRST_LEAF = { pagedView: true, firstPage: true };

describe("readCompletion", () => {
  // @req REQ-BC-4
  it("reads the disabled Next anchor of vscode-all-end.html as the end signal", () => {
    expect(readCompletion(load("vscode-all-end.html"), 20, PAGED)).toEqual({
      kind: "end-signal",
    });
  });

  // @req REQ-BC-4
  it("reads an enabled Next anchor as unknown", () => {
    expect(readCompletion(load("vscode-all-first.html"), 20, PAGED)).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("reads the native blankslate with zero rows as confirmed empty", () => {
    expect(
      readCompletion(load("vscode-search-empty.html"), 0, UNPAGED),
    ).toEqual({
      kind: "confirmed-empty",
    });
  });

  // @req REQ-BC-4
  it("never calls an empty state confirmed while rows were collected", () => {
    expect(
      readCompletion(load("vscode-search-empty.html"), 20, UNPAGED),
    ).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("does not treat a pager-free overview page as an end", () => {
    expect(readCompletion(load("vscode-overview.html"), 6, UNPAGED)).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("does not treat a pager-free search result as an end", () => {
    expect(readCompletion(load("vscode-search.html"), 1, UNPAGED)).toEqual({
      kind: "unknown",
    });
  });

  // @req REQ-BC-4
  it("does not treat an absent pager alone as an end", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 20, UNPAGED)).toEqual({ kind: "unknown" });
    expect(readCompletion(doc, 20, FIRST_LEAF)).toEqual({ kind: "unknown" });
  });

  // @req REQ-BC-4
  it("does not treat an absent pager alone as confirmed empty", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 0, FIRST_LEAF)).toEqual({ kind: "unknown" });
  });

  // @req REQ-BC-4
  it("reads pager absence on a paged view past the first page as the end signal", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 540, PAGED)).toEqual({ kind: "end-signal" });
  });

  // @req REQ-BC-4
  it("never proves the end on the first page, where the inferred zero-result page 1 has no pager", () => {
    const doc = load("vscode-all-first.html");
    doc.querySelector('nav[aria-label="Pagination"]')?.remove();
    expect(readCompletion(doc, 0, FIRST_LEAF)).toEqual({ kind: "unknown" });
    expect(readCompletion(load("vscode-all-end.html"), 20, FIRST_LEAF)).toEqual(
      { kind: "unknown" },
    );
  });

  // @req REQ-BC-4
  it("returns unknown for an absent spinner or an unchanged row count", () => {
    expect(readCompletion(load("vscode-active.html"), 20, PAGED)).toEqual({
      kind: "unknown",
    });
    expect(readCompletion(load("vscode-all-end.html"), 0, PAGED)).toEqual({
      kind: "end-signal",
    });
  });
});
