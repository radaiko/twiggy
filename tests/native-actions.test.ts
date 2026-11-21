// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { availability, perform, type Entry } from "../src/lib/native-actions";
import { COPY } from "../src/lib/copy";

const fixtures = join(__dirname, "fixtures", "github");
const REGION = 'section[aria-label="Branches"][data-hpc]';
const NAME = "dev/vritant24/hooks-off-customizations";

function source(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

// A parsed document is inert: focus and document-wide events only work in the live document.
function load(name: string): Document {
  document.documentElement.innerHTML = source(name).replace(/<!DOCTYPE[^>]*>/i, "");
  document.querySelector('turbo-frame[name="repo-content-turbo-frame"]')?.removeAttribute("name");
  return document;
}

function rowOf(fullName: string): HTMLElement {
  for (const link of document.querySelectorAll('a[data-component="BranchName"]')) {
    const name = link.querySelector("[title]")?.getAttribute("title") ?? "";
    if (name === fullName) {
      const row = link.closest("tr");
      if (!row) throw new Error(`no row for ${fullName}`);
      return row as HTMLElement;
    }
  }
  throw new Error(`no row for ${fullName}`);
}

// Builds a native affordance inside a row, so the runtime can find it there.
function affordance(
  row: HTMLElement,
  tag: "a" | "button" | "summary",
  attributes: Record<string, string>,
  text: string,
): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.textContent = text;
  (row.lastElementChild ?? row).append(element);
  return element;
}

function compareLink(): HTMLElement {
  return affordance(
    rowOf(NAME),
    "a",
    { role: "menuitem", href: "/microsoft/vscode/compare/dev/vritant24/hooks-off-customizations" },
    "Compare",
  );
}

function renameControl(): HTMLElement {
  return affordance(
    rowOf(NAME),
    "button",
    { "aria-label": "Rename branch" },
    "Rename branch",
  );
}

function deleteControl(): HTMLElement {
  const row = rowOf(NAME);
  const button = row.querySelector<HTMLElement>("button[aria-labelledby] svg.octicon-trash")
    ?.closest("button");
  if (!button) throw new Error("fixture has no delete control");
  return button;
}

function enabled(entry: { entry: Entry; state: string }): boolean {
  return entry.state === "enabled";
}

type Harness = {
  doc: Document;
  deps: {
    setSwitchOff: Mock<() => void>;
    scrollToRow: Mock<(row: Element) => void>;
    focusRow: Mock<(row: Element, entry: Entry) => void>;
    navigate: Mock<(href: string) => void>;
  };
  /** What the native affordance was when Twiggy handed off: the region must be operable then. */
  seenAtHandoff: () => { hidden: boolean; inert: boolean; connected: boolean };
};

function harness(name = "vscode-all-first.html"): Harness {
  const doc = load(name);
  const region = doc.querySelector(REGION);
  if (!region) throw new Error("fixture has no results region");
  const observations: { hidden: boolean; inert: boolean; connected: boolean }[] = [];
  const observe = () => {
    const live = doc.querySelector(REGION);
    observations.push({
      hidden: live?.hasAttribute("hidden") ?? false,
      inert: live?.hasAttribute("inert") ?? false,
      connected: live?.isConnected ?? false,
    });
  };
  // The mount hides and inerts the native region only while the tree is shown (decision 6).
  doc.body.insertAdjacentHTML("afterbegin", '<section id="twiggy-tree" inert></section>');
  region.setAttribute("hidden", "");
  region.setAttribute("inert", "");
  const switchOff = () => {
    doc.querySelector("#twiggy-tree")?.remove();
    const live = doc.querySelector(REGION);
    live?.removeAttribute("hidden");
    live?.removeAttribute("inert");
  };
  const deps = {
    // The handoff must make the native list operable before anything else happens.
    setSwitchOff: vi.fn(() => {
      switchOff();
      observe();
    }),
    scrollToRow: vi.fn((row: Element) => {
      observations.push({
        hidden: !!row.closest(REGION)?.hasAttribute("hidden"),
        inert: !!row.closest(REGION)?.hasAttribute("inert"),
        connected: row.isConnected,
      });
    }),
    focusRow: vi.fn(),
    navigate: vi.fn(),
  };
  return {
    doc,
    deps,
    seenAtHandoff: () =>
      observations[observations.length - 1] ?? { hidden: true, inert: true, connected: false },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.innerHTML = "";
});

describe("availability", () => {
  // @req REQ-BA-3
  it("resolves the exact full name, not a prefix of another branch", () => {
    const doc = load("vscode-all-first.html");
    const row = doc.querySelector('a[data-component="BranchName"]')?.closest("tr");
    // `release/1` and `release/10` side by side: a prefix match would pick the wrong row.
    row?.insertAdjacentHTML(
      "afterend",
      '<tr role="row" data-component="Table.Row"><td role="cell"><a data-component="BranchName" href="/microsoft/vscode/tree/release/10"><div title="release/10">release/10</div></a></td>' +
        '<td role="cell"><button aria-label="Rename branch">Rename branch</button></td></tr>',
    );
    row?.insertAdjacentHTML(
      "afterend",
      '<tr role="row" data-component="Table.Row"><td role="cell"><a data-component="BranchName" href="/microsoft/vscode/tree/release/1"><div title="release/1">release/1</div></a></td>' +
        '<td role="cell"><a role="menuitem" href="/microsoft/vscode/compare/release/1">Compare</a></td></tr>',
    );
    const forOne = availability(doc, "release/1");
    const forTen = availability(doc, "release/10");
    expect(forOne.find((e) => e.entry === "compare")?.state).toBe("enabled");
    expect(forOne.find((e) => e.entry === "rename")?.state).toBe("unavailable");
    expect(forTen.find((e) => e.entry === "compare")?.state).toBe("unavailable");
    expect(forTen.find((e) => e.entry === "rename")?.state).toBe("enabled");
  });

  // @req REQ-BA-3
  it("resolves against the current document, not a remembered element", () => {
    const doc = load("vscode-all-first.html");
    expect(enabled(availability(doc, NAME).find((e) => e.entry === "delete")!)).toBe(true);
    // GitHub re-rendered the row without its delete control since the menu was opened.
    deleteControl().remove();
    expect(enabled(availability(doc, NAME).find((e) => e.entry === "delete")!)).toBe(false);
  });

  // @req REQ-BA-7
  it("marks every entry unavailable with the description for an unknown branch", () => {
    const entries = availability(load("vscode-all-first.html"), "no/such-branch");
    expect(entries.map((e) => e.entry)).toEqual(["compare", "rename", "delete"]);
    for (const entry of entries) {
      expect(entry.state).toBe("unavailable");
      expect(entry.description).toBe(COPY.actionUnavailable);
    }
  });

  // @req REQ-BA-7
  it("keeps Compare enabled when the row has no delete control", () => {
    const doc = load("vscode-all-first.html");
    compareLink();
    deleteControl().remove();
    const entries = availability(doc, NAME);
    expect(entries.find((e) => e.entry === "compare")?.state).toBe("enabled");
    expect(entries.find((e) => e.entry === "rename")?.state).toBe("unavailable");
    expect(entries.find((e) => e.entry === "delete")?.state).toBe("unavailable");
    expect(entries.find((e) => e.entry === "delete")?.description).toBe(COPY.actionUnavailable);
  });

  // @req REQ-BA-4
  it("offers Compare only when a destination already exists, and never builds one", () => {
    const doc = load("vscode-all-first.html");
    // The branch name is known, but no destination: nothing is guessed from route syntax.
    expect(enabled(availability(doc, NAME).find((e) => e.entry === "compare")!)).toBe(false);
    compareLink();
    expect(enabled(availability(doc, NAME).find((e) => e.entry === "compare")!)).toBe(true);
  });
});

describe("perform", () => {
  // @req REQ-BA-9
  it("turns the switch off before handing off, with the native region operable", () => {
    const { doc, deps, seenAtHandoff } = harness();
    renameControl();
    const result = perform(doc, NAME, "rename", deps);
    expect(deps.setSwitchOff).toHaveBeenCalledTimes(1);
    const atHandoff = seenAtHandoff();
    expect(atHandoff.hidden).toBe(false);
    expect(atHandoff.inert).toBe(false);
    expect(atHandoff.connected).toBe(true);
    expect(result.ok).toBe(true);
  });

  // @req REQ-BA-3
  it("acts on the row as it is at call time, after the re-render", () => {
    const { doc, deps } = harness();
    const before = renameControl();
    // The native list re-renders and replaces the row Twiggy saw when the menu opened.
    const page = new DOMParser().parseFromString(source("vscode-all-first.html"), "text/html");
    const fresh = page.querySelector(REGION);
    if (!fresh) throw new Error("fixture has no results region");
    doc.querySelector(REGION)?.replaceWith(document.importNode(fresh, true));
    expect(doc.contains(before)).toBe(false);
    const after = renameControl();
    const clicked = vi.fn();
    after.addEventListener("click", clicked);
    expect(perform(doc, NAME, "rename", deps)).toEqual({ ok: true, entry: "rename", outcome: "invoked" });
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  // @req REQ-BA-4
  it("follows the native row's compare destination", () => {
    const { doc, deps } = harness();
    const link = compareLink();
    const result = perform(doc, NAME, "compare", deps);
    expect(result).toEqual({ ok: true, entry: "compare", outcome: "followed" });
    expect(deps.navigate).toHaveBeenCalledWith(
      "/microsoft/vscode/compare/dev/vritant24/hooks-off-customizations",
    );
    expect((deps.navigate.mock.calls[0]?.[0] as string).endsWith(link.getAttribute("href")!)).toBe(
      true,
    );
  });

  // @req REQ-BA-4
  it("constructs no URL when the row has no compare destination", () => {
    const { doc, deps } = harness();
    const result = perform(doc, NAME, "compare", deps);
    expect(result).toEqual({ ok: false, reason: "control-lost" });
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.setSwitchOff).toHaveBeenCalledTimes(1);
  });

  // @req REQ-BA-4
  it("never calls fetch", () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const { doc, deps } = harness();
    compareLink();
    renameControl();
    perform(doc, NAME, "compare", deps);
    perform(doc, NAME, "rename", deps);
    perform(doc, NAME, "delete", deps);
    expect(spy).not.toHaveBeenCalled();
  });

  // @req REQ-BA-5
  it("activates the native rename affordance", () => {
    const { doc, deps } = harness();
    const control = renameControl();
    const clicked = vi.fn();
    control.addEventListener("click", clicked);
    const result = perform(doc, NAME, "rename", deps);
    expect(result).toEqual({ ok: true, entry: "rename", outcome: "invoked" });
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(deps.focusRow).toHaveBeenCalledWith(expect.anything(), "rename");
  });

  // @req REQ-BA-5
  it("renders no rename input or form itself", () => {
    const { doc, deps } = harness();
    renameControl();
    const forms = doc.querySelectorAll("form").length;
    // The fixture's own search input; only a rename form would add one.
    const inputs = doc.querySelectorAll("input").length;
    perform(doc, NAME, "rename", deps);
    expect(doc.querySelectorAll("form").length).toBe(forms);
    expect(doc.querySelectorAll("input").length).toBe(inputs);
    expect(doc.querySelector('input[name="new_branch_name"]')).toBeNull();
  });

  // @req REQ-BA-6
  it("reveals, scrolls and focuses the row for an immediate delete, without invoking it", () => {
    const { doc, deps } = harness();
    const control = deleteControl();
    expect(control.getAttribute("aria-labelledby")).not.toBeNull();
    const clicked = vi.fn();
    control.addEventListener("click", clicked);
    const result = perform(doc, NAME, "delete", deps);
    expect(result).toEqual({ ok: true, entry: "delete", outcome: "revealed" });
    expect(clicked).not.toHaveBeenCalled();
    expect(deps.focusRow).toHaveBeenCalledWith(expect.anything(), "delete");
    expect(deps.focusRow.mock.calls[0]?.[0]).toBe(rowOf(NAME));
    expect(deps.scrollToRow).toHaveBeenCalledWith(rowOf(NAME));
  });

  // @req REQ-BA-6
  it("reveals only when the delete affordance's confirmation behaviour is unknown", () => {
    const { doc, deps } = harness();
    // A delete-shaped control in the row's own action cluster with nothing that establishes a
    // confirmation step: unknown, so the handoff may not invoke it.
    const control = doc.createElement("button");
    control.innerHTML = '<svg class="octicon octicon-trash"></svg><span>Remove branch</span>';
    const cluster = rowOf(NAME).querySelector('[class*="BranchActionMenu"]');
    if (!cluster) throw new Error("fixture row has no action cluster");
    cluster.append(control);
    deleteControl().remove();
    const clicked = vi.fn();
    control.addEventListener("click", clicked);
    expect(perform(doc, NAME, "delete", deps)).toEqual({
      ok: true,
      entry: "delete",
      outcome: "revealed",
    });
    expect(clicked).not.toHaveBeenCalled();
  });

  // @req REQ-BA-6
  it("reveals only for unknown behaviour even when research recorded confirmation-first", () => {
    // The research note records delete as immediate without confirmation (A6). Treating that as
    // authority would permit a click wherever the runtime cannot establish a confirmation step;
    // the row here has only the delete button, so the handoff is reveal-only either way.
    const note = readFileSync(join(__dirname, "..", "docs", "research", "github-branches-markup.md"), "utf8");
    expect(note).toContain("**Native delete: `immediate without confirmation`.**");
    const { doc, deps } = harness();
    const control = deleteControl();
    const clicked = vi.fn();
    control.addEventListener("click", clicked);
    perform(doc, NAME, "delete", deps);
    expect(clicked).not.toHaveBeenCalled();
  });

  // @req REQ-BA-6
  it("invokes a delete affordance only when the runtime establishes a confirmation step", () => {
    const { doc, deps } = harness();
    // A delete affordance whose markup says it opens a dialog, which starts closed: the dialog is
    // the confirmation step the runtime discovers, and opening it mutates nothing.
    const dialog = doc.createElement("dialog");
    const newAction = doc.createElement("button");
    newAction.setAttribute("aria-haspopup", "dialog");
    newAction.innerHTML = '<svg class="octicon octicon-trash"></svg><span>Delete branch</span>';
    // The row's own action cluster now holds that affordance instead of an immediate one.
    const row = rowOf(NAME);
    const cluster = row.querySelector('[class*="BranchActionMenu"]');
    if (!cluster) throw new Error("fixture row has no action cluster");
    deleteControl().replaceWith(newAction);
    const control = newAction;
    expect(cluster.contains(control)).toBe(true);
    // The form carries what GitHub's confirmation step holds: the request that mutates.
    const sandbox = doc.createElement("form");
    sandbox.append(dialog);
    doc.body.append(sandbox);
    const submitted = vi.fn((event: Event) => event.preventDefault());
    sandbox.addEventListener("submit", submitted);
    // jsdom has no showModal; opening the dialog is all GitHub's own step does before confirmation.
    control.addEventListener("click", () => dialog.setAttribute("open", ""));
    const result = perform(doc, NAME, "delete", deps);
    expect(result).toEqual({ ok: true, entry: "delete", outcome: "confirmation" });
    // GitHub's dialog is open and untouched: Twiggy neither confirms nor closes it.
    expect(dialog.open).toBe(true);
    expect(document.activeElement).not.toBe(dialog);
    expect(submitted).not.toHaveBeenCalled();
  });

  // @req REQ-BA-6
  it("never confirms or dismisses GitHub's dialog", () => {
    const { doc, deps } = harness();
    const dialog = doc.createElement("dialog");
    const danger = doc.createElement("button");
    danger.type = "submit";
    danger.textContent = "Delete branch";
    dialog.append(danger);
    doc.body.append(dialog);
    const confirmed = vi.fn();
    danger.addEventListener("click", confirmed);
    const control = deleteControl();
    const clicked = vi.fn();
    control.addEventListener("click", clicked);
    perform(doc, NAME, "delete", deps);
    expect(dialog.open).toBe(false);
    expect(clicked).not.toHaveBeenCalled();
    expect(confirmed).not.toHaveBeenCalled();
  });

  // @req REQ-BA-7
  it("reports a missing control without invoking anything", () => {
    const { doc, deps } = harness();
    deleteControl().remove();
    const result = perform(doc, NAME, "delete", deps);
    expect(result).toEqual({ ok: false, reason: "control-lost" });
    expect(deps.focusRow).toHaveBeenCalledWith(expect.anything(), "delete");
  });

  // @req REQ-BA-8
  it("reports a lost control after the row was re-rendered without it", () => {
    const { doc, deps } = harness();
    // The menu opened on this row, so Compare was offered and its row's link is what was seen.
    const link = compareLink();
    expect(availability(doc, NAME).find((e) => e.entry === "compare")?.state).toBe("enabled");
    link.remove();
    expect(perform(doc, NAME, "compare", deps)).toEqual({ ok: false, reason: "control-lost" });
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(COPY.controlLostStatus).toBe("Use GitHub's controls for this branch.");
  });

  // @req REQ-BA-8
  it("reports a row that is gone with the exact name", () => {
    const { doc, deps } = harness();
    const result = perform(doc, "feature/x", "compare", deps);
    expect(result).toEqual({ ok: false, reason: "row-gone" });
    expect(COPY.rowGoneStatus("feature/x")).toBe(
      "GitHub's row for feature/x is no longer available. Reload the branches page.",
    );
    expect(deps.setSwitchOff).toHaveBeenCalledTimes(1);
  });

  // @req REQ-BA-8
  it("reports a row that vanished between the menu and the activation", () => {
    const { doc, deps } = harness();
    expect(availability(doc, NAME).find((e) => e.entry === "delete")?.state).toBe("enabled");
    rowOf(NAME).remove();
    expect(perform(doc, NAME, "delete", deps)).toEqual({ ok: false, reason: "row-gone" });
    expect(COPY.controlLostStatus).toBe("Use GitHub's controls for this branch.");
  });
});
