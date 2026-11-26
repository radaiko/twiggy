// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createScrollPorts } from "../src/lib/scroll-port";

const fixtures = join(__dirname, "fixtures", "github");

const NEXT = 'a[data-component="Pagination.NextPage"][rel="next"]';
const REGION = 'section[aria-label="Branches"][data-hpc]';

function source(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

// A parsed document is inert: focus and document-wide events only work in the live document.
function load(name: string): Document {
  document.documentElement.innerHTML = source(name).replace(/<!DOCTYPE[^>]*>/i, "");
  // The fixture's frame declares name="repo-content-turbo-frame"; jsdom exposes a window property
  // called `name` as a callable stub there, which shadows the event constructors used below.
  document.querySelector('turbo-frame[name="repo-content-turbo-frame"]')?.removeAttribute("name");
  return document;
}

function regionOf(doc: Document): Element {
  const region = doc.querySelector(REGION);
  if (!region) throw new Error("fixture has no results region");
  return region;
}

type Ports = ReturnType<typeof createScrollPorts>;

// A window double: jsdom's global proxy rewrites assignments such as `scrollY`, so the real
// global cannot record what the ports asked the page to show. The window is a port here.
class FakeWindow extends EventTarget {
  scrollY = 0;
  readonly scrollCalls: ScrollToOptions[] = [];
  readonly history = { pushState: vi.fn() };
  readonly location = { href: "https://github.com/microsoft/vscode/branches" };
  // Resolved at call time so `vi.useFakeTimers()` applies to the ports' polling.
  setTimeout(handler: () => void, ms: number): number {
    return globalThis.setTimeout(handler, ms) as unknown as number;
  }

  scrollTo(options: ScrollToOptions | number): void {
    const top = typeof options === "number" ? options : (options.top ?? 0);
    this.scrollCalls.push({ top });
    this.scrollY = top;
  }
}

function setup(
  name: string,
  top = 0,
): { doc: Document; win: FakeWindow; ports: Ports; region: Element } {
  const doc = load(name);
  const win = new FakeWindow();
  win.scrollY = top;
  const region = regionOf(doc);
  const ports = createScrollPorts(doc, win as unknown as Window, region);
  return { doc, win, ports, region };
}

// GitHub's in-place swap (A3): paging replaces the results region, not the page chrome,
// so the search input outside it survives.
function swapRegion(doc: Document): void {
  const page = new DOMParser().parseFromString(source("vscode-active.html"), "text/html");
  const next = page.querySelector(REGION);
  if (!next) throw new Error("fixture has no results region");
  regionOf(doc).replaceWith(document.importNode(next, true));
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("isManualScroll", () => {
  // @req REQ-BC-7
  it("becomes true on a wheel event", () => {
    const { doc, ports } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    expect(ports.isManualScroll()).toBe(false);
    doc.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    expect(ports.isManualScroll()).toBe(true);
  });

  // @req REQ-BC-7
  it("becomes true on touchstart and touchmove", () => {
    const first = setup("vscode-all-first.html");
    cleanups.push(() => first.ports.dispose());
    first.doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(first.ports.isManualScroll()).toBe(true);

    const second = setup("vscode-all-first.html");
    cleanups.push(() => second.ports.dispose());
    second.doc.dispatchEvent(new Event("touchmove", { bubbles: true }));
    expect(second.ports.isManualScroll()).toBe(true);
  });

  // @req REQ-BC-7
  it("becomes true on each page-scroll key", () => {
    for (const key of ["PageUp", "PageDown", "Home", "End", " "]) {
      const { doc, ports } = setup("vscode-all-first.html");
      cleanups.push(() => ports.dispose());
      doc.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      expect(ports.isManualScroll(), key).toBe(true);
    }
  });

  // @req REQ-BC-7
  it("ignores a key that does not scroll the page", () => {
    const { doc, ports } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(ports.isManualScroll()).toBe(false);
  });

  // @req REQ-BC-7
  it("becomes true on a scroll event at a position Twiggy did not set", () => {
    const { win, ports } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    win.scrollY = 120; // the scrollbar was dragged (A3: the window scrolls)
    win.dispatchEvent(new Event("scroll"));
    expect(ports.isManualScroll()).toBe(true);
  });

  // @req REQ-BC-7
  it("stays false on the scroll Twiggy itself made", () => {
    const { win, ports } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    ports.restoreAnchor({ top: 300 });
    expect(win.scrollCalls).toEqual([{ top: 300 }]);
    win.dispatchEvent(new Event("scroll"));
    expect(win.scrollY).toBe(300);
    expect(ports.isManualScroll()).toBe(false);
  });

  // @req REQ-BC-7
  it("becomes true when the user scrolls away from a position Twiggy set", () => {
    const { win, ports } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    ports.restoreAnchor({ top: 300 });
    win.dispatchEvent(new Event("scroll"));
    win.scrollY = 900;
    win.dispatchEvent(new Event("scroll"));
    expect(ports.isManualScroll()).toBe(true);
  });
});

describe("captureAnchor and restoreAnchor", () => {
  // @req REQ-BC-8
  it("restores a captured position", () => {
    const { win, ports } = setup("vscode-all-first.html", 240);
    cleanups.push(() => ports.dispose());
    const anchor = ports.captureAnchor();
    expect(anchor).toEqual({ top: 240 });
    win.scrollY = 1200;
    ports.restoreAnchor(anchor);
    expect(win.scrollY).toBe(240);
    expect(win.scrollCalls).toEqual([{ top: 240 }]);
  });

  // @req REQ-BC-8
  it("does nothing after a manual scroll", () => {
    const { doc, win, ports } = setup("vscode-all-first.html", 240);
    cleanups.push(() => ports.dispose());
    const anchor = ports.captureAnchor();
    win.scrollY = 1200;
    doc.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    ports.restoreAnchor(anchor);
    expect(win.scrollY).toBe(1200);
    expect(win.scrollCalls).toEqual([]);
  });
});

describe("step", () => {
  // @req REQ-BC-2
  it("activates the Next control on vscode-all-first.html and reports a new page", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    let activation: { href: string } | null = null;
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      activation = { href: (event.target as HTMLAnchorElement).getAttribute("href")! };
      event.preventDefault();
      setTimeout(() => swapRegion(doc), 20); // A10: the swap is async
    });

    await expect(ports.step({ region })).resolves.toBe(true);
    expect(activation).toEqual({ href: "#2" });
    expect(window.location.href).not.toContain("page=");
  });

  // @req REQ-BC-4
  it("reports the end when the pager is absent", async () => {
    const { region, ports } = setup("vscode-search.html");
    cleanups.push(() => ports.dispose());
    await expect(ports.step({ region })).resolves.toBe(false);
  });

  // @req REQ-BC-4
  it("reports the end when the Next control is disabled", async () => {
    const { doc, region, ports } = setup("vscode-all-end.html");
    cleanups.push(() => ports.dispose());
    let clicked = 0;
    doc.querySelector(NEXT)!.addEventListener("click", () => {
      clicked += 1;
    });
    await expect(ports.step({ region })).resolves.toBe(false);
    expect(clicked).toBe(0);
  });

  // @req REQ-BC-2
  it("reports no new page when nothing replaces the list", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    doc.querySelector(NEXT)!.addEventListener("click", (event) => event.preventDefault());
    await expect(ports.step({ region, timeout: 200 })).resolves.toBe(false);
  });

  // @req REQ-BC-2
  it("never calls fetch", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    // The real global, not the double: the port must not reach for fetch at all.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => swapRegion(doc), 10);
    });
    await expect(ports.step({ region })).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain("page=");
  });

  // @req REQ-BC-2
  it("never assigns a page URL", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    // The real jsdom history: a navigation would go through it.
    const pushState = vi.spyOn(window.history, "pushState");
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => swapRegion(doc), 10);
    });
    await expect(ports.step({ region })).resolves.toBe(true);
    expect(pushState).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain("page=");
  });

  // @req REQ-BC-10
  it("leaves document.activeElement unchanged", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    const input = doc.querySelector<HTMLInputElement>('input[placeholder="Search branches..."]')!;
    input.focus();
    expect(doc.activeElement).toBe(input);
    // A link click would move focus; GitHub's own control may claim it too.
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      event.preventDefault();
      (event.target as HTMLElement).focus();
      setTimeout(() => swapRegion(doc), 10);
    });
    await expect(ports.step({ region })).resolves.toBe(true);
    expect(doc.activeElement).toBe(input);
  });
});

describe("step focus and repeated advance", () => {
  // @req REQ-BC-10
  it("does not leave focus on the Next link when nothing had focus", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    (doc.activeElement as HTMLElement | null)?.blur();
    expect(doc.activeElement).toBe(doc.body);
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      event.preventDefault();
      (event.target as HTMLElement).focus();
      setTimeout(() => swapRegion(doc), 10);
    });
    await expect(ports.step({ region })).resolves.toBe(true);
    expect(doc.activeElement).toBe(doc.body);
  });

  // @req REQ-BC-2
  it("takes a fresh baseline when called again without a region", async () => {
    const { doc, ports, region } = setup("vscode-all-first.html");
    cleanups.push(() => ports.dispose());
    doc.querySelector(NEXT)!.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => swapRegion(doc), 10);
    });
    await expect(ports.step({ region })).resolves.toBe(true);
    // The region node was replaced: a second step must not mistake the stale node for a change.
    doc.querySelector(NEXT)!.addEventListener("click", (event) => event.preventDefault());
    await expect(ports.step({ timeout: 200 })).resolves.toBe(false);
  });
});

describe("hasNext", () => {
  // @req REQ-BC-13
  it("is true only while an enabled Next control exists", () => {
    const first = setup("vscode-all-first.html");
    cleanups.push(() => first.ports.dispose());
    expect(first.ports.hasNext()).toBe(true);

    const end = setup("vscode-all-end.html");
    cleanups.push(() => end.ports.dispose());
    expect(end.ports.hasNext()).toBe(false);

    const search = setup("vscode-search.html");
    cleanups.push(() => search.ports.dispose());
    expect(search.ports.hasNext()).toBe(false);
  });
});

describe("dispose", () => {
  // @req REQ-BC-7
  it("removes every listener", () => {
    const { doc, win, ports } = setup("vscode-all-first.html");
    ports.dispose();
    doc.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    win.scrollY = 2000;
    win.dispatchEvent(new Event("scroll"));
    expect(ports.isManualScroll()).toBe(false);
  });
});
