// BranchActionsMenu. Every visible string comes from copy.ts; the menu reports a choice and does
// nothing else: no rename form, compare builder or confirmation lives here (REQ-BA-1, REQ-BA-2).
import { COPY } from '../lib/copy';
import type { Entry, EntryAvailability } from '../lib/native-actions';

const WIDTH = 224;
const INSET = 8;
const GAP = 4;

const MENU_CLASS = 'twiggy-actions-menu';
const ENTRY_CLASS = 'twiggy-actions-menu-item';
const DANGER_CLASS = 'twiggy-actions-menu-danger';
const DIVIDER_CLASS = 'twiggy-actions-menu-divider';
const DESCRIPTION_CLASS = 'twiggy-actions-menu-description';

const LABELS: Readonly<Record<Entry, string>> = {
  compare: COPY.compare,
  rename: COPY.rename,
  delete: COPY.delete,
};

type Open = { close: (focus: boolean) => void };

// The menu each trigger currently holds open. The attribute mirrors it for assistive technology.
const openMenus = new WeakMap<HTMLElement, Open>();
const openOf = (trigger: HTMLElement): Open | undefined => openMenus.get(trigger);

export type OpenMenuOptions = {
  /** The page's document; a Turbo page can own a fresh one. */
  doc?: Document;
};

/**
 * REQ-BA-1: opens the branch actions menu for `fullName` below and at the end edge of `trigger`,
 * flipped above when it would not fit there. Escape, a click outside or a choice closes it and
 * returns focus to the trigger. `onChoose` receives the entry; nothing else happens here.
 */
export function openMenu(
  trigger: HTMLElement,
  fullName: string,
  availability: readonly EntryAvailability[],
  onChoose: (entry: Entry) => void,
  options: OpenMenuOptions = {},
): () => void {
  const doc = options.doc ?? trigger.ownerDocument;
  // A click on the trigger of an open menu closes it; it is never a second opening.
  const alreadyOpen = openOf(trigger);
  if (alreadyOpen !== undefined) {
    alreadyOpen.close(true);
    return () => {};
  }

  const menu = doc.createElement('div');
  // The menu is appended to the page body, outside the tree the mount scoped, so it carries the
  // token scope itself.
  menu.className = `${MENU_CLASS} twiggy-root`;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', COPY.actionsFor(fullName));

  const entries = (['compare', 'rename', 'delete'] as const).map((entry) => {
    if (entry === 'delete') {
      // The divider is its own element between Rename and Delete, never an entry.
      const divider = doc.createElement('div');
      divider.className = DIVIDER_CLASS;
      divider.setAttribute('role', 'separator');
      menu.append(divider);
    }
    const unavailable = availability.find((candidate) => candidate.entry === entry)?.state === 'unavailable';
    const item = doc.createElement('button');
    item.type = 'button';
    item.className = `${ENTRY_CLASS}${entry === 'delete' ? ` ${DANGER_CLASS}` : ''}`;
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-disabled', String(unavailable));
    item.tabIndex = -1;
    const label = doc.createElement('span');
    label.textContent = LABELS[entry];
    item.append(label);
    if (unavailable) {
      // REQ-BA-7: the reason is per entry and never suggests Twiggy can grant rights.
      const description = doc.createElement('span');
      description.className = DESCRIPTION_CLASS;
      description.textContent = COPY.actionUnavailable;
      item.append(description);
    }
    item.addEventListener('click', () => choose(entry, unavailable));
    menu.append(item);
    return { entry, item, unavailable };
  });

  (doc.body ?? doc.documentElement).append(menu);
  place(menu, trigger);

  trigger.setAttribute('aria-expanded', 'true');
  let closed = false;
  const enabled = (): HTMLElement[] => entries.filter((e) => !e.unavailable).map((e) => e.item);
  // The first enabled entry receives focus (REQ-BA-1).
  enabled()[0]?.focus();

  // Registered so the trigger's own activation closes this menu instead of opening another.
  // It delegates to dismiss, which also drops the listeners and the registry entry, so the menu
  // can be opened again afterwards.
  const self: Open = { close: (focus) => dismiss(focus) };
  openMenus.set(trigger, self);

  // REQ-BA-1: a chosen entry is only reported; the menu never acts on it.
  function choose(entry: Entry, unavailable: boolean): void {
    if (unavailable) return;
    dismiss(false);
    onChoose(entry);
    trigger.focus();
  }

  function dismiss(focus: boolean): void {
    if (closed) return;
    closed = true;
    // Focus first: while an event is still being dispatched, focus() only lands afterwards.
    if (focus) trigger.focus();
    menu.remove();
    doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('pointerdown', onPointerDown, true);
    trigger.removeEventListener('keydown', onTriggerKey);
    trigger.removeAttribute('aria-expanded');
    if (openOf(trigger) === self) openMenus.delete(trigger);
  }

  function onKey(event: KeyboardEvent): void {
    // A key on any control that is not in this menu, such as the trigger that opened it or another
    // row's actions button, is not this menu's.
    const target = event.target as Node | null;
    if (target !== null && target !== menu && !menu.contains(target) && (target as Element).closest?.('button') !== null) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss(true);
      return;
    }
    if (event.key === 'Tab') {
      dismiss(false);
      return;
    }
    // The entry the key was pressed on or focused in, whichever a browser or jsdom reports. Every
    // key pressed on an entry belongs to the menu, never to the row's own navigation.
    const pressed = (event.target as Element | null)?.closest?.('[role="menuitem"]');
    const entry = entries.find((candidate) => candidate.item === pressed || candidate.item === doc.activeElement);
    if (entry !== undefined) {
      // Handled once, here: Enter and Space activate the entry like a click; nothing else follows.
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        entry.item.click();
        return;
      }
      // Every other key keeps its own effect first; a browser stops the rest of the listeners
      // when propagation is stopped, so focus has to have been set before that call.
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const focusable = enabled();
      const at = focusable.indexOf(entry.item);
      if (event.key === 'Home' || event.key === 'End') {
        focusable[event.key === 'Home' ? 0 : focusable.length - 1]?.focus();
      } else {
        const step = event.key === 'ArrowUp' ? -1 : 1;
        const next = at === -1 ? (step > 0 ? 0 : focusable.length - 1) : at + step;
        focusable[Math.min(Math.max(next, 0), focusable.length - 1)]?.focus();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const focusable = enabled();
    if (focusable.length === 0) return;
    focusable[event.key === 'ArrowDown' || event.key === 'Home' ? 0 : focusable.length - 1]?.focus();
  }

  // Outside means neither the menu nor its trigger; the trigger's own click is the toggle.
  function onPointerDown(event: Event): void {
    const target = event.target as Node | null;
    if (target === null || menu.contains(target) || trigger.contains(target)) return;
    dismiss(true);
  }

  // The menu's own opening keys: Down and Up move into it from its trigger.
  function onTriggerKey(event: KeyboardEvent): void {
    if (event.target !== trigger) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const focusable = enabled();
    (event.key === 'ArrowDown' ? focusable[0] : focusable[focusable.length - 1])?.focus();
  }

  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('pointerdown', onPointerDown, true);
  trigger.addEventListener('keydown', onTriggerKey);
  return () => dismiss(true);
}

// REQ-BA-1: 224px wide, below and end-aligned with the trigger, flipped above when it does not
// fit there, and kept at least 8px from both viewport edges.
function place(menu: HTMLElement, trigger: HTMLElement): void {
  const doc = menu.ownerDocument;
  const view = doc.defaultView ?? window;
  const box = trigger.getBoundingClientRect();
  // An all-zero box is an element not laid out, such as jsdom's: there is nothing to anchor to.
  if (box.width === 0 && box.height === 0 && box.top === 0 && box.left === 0) return;
  // The trigger's edges relative to the menu's origin: page coordinates on the body, so the menu
  // scrolls with the page, and container coordinates inside a positioned container.
  const anchor = menu.offsetParent;
  const inPage = anchor === null;
  const origin = inPage ? { top: 0, left: 0 } : anchor.getBoundingClientRect();
  const dx = inPage ? view.scrollX : -origin.left;
  const dy = inPage ? view.scrollY : -origin.top;
  const bottom = box.bottom + dy;
  const end = box.right + dx;
  const heightLimit = inPage ? view.innerHeight + view.scrollY : (anchor.clientHeight || view.innerHeight);
  const widthLimit = inPage ? view.innerWidth : (anchor.clientWidth || view.innerWidth);

  const below = bottom + GAP;
  const above = box.top + dy - GAP - menu.offsetHeight;
  menu.style.width = `${WIDTH}px`;
  menu.style.top = `${below + menu.offsetHeight > heightLimit - INSET && above >= INSET ? above : below}px`;
  menu.style.left = `${Math.max(INSET, Math.min(end, widthLimit - INSET) - WIDTH)}px`;
}
