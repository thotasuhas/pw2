/**
 * Creates an element; text children are inserted as text nodes, never parsed as HTML.
 * @param {Document} doc
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {...(Node | string)} children
 * @returns {HTMLElement}
 */
export function el(doc, tag, attrs = {}, ...children) {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/**
 * @param {Document} doc
 * @param {HTMLElement} select
 * @param {ReadonlyArray<readonly [string, string]>} entries [value, label] pairs
 */
export function fillSelect(doc, select, entries) {
  select.replaceChildren(...entries.map(([value, label]) => el(doc, 'option', { value }, label)));
}

/**
 * @param {Document} doc
 * @param {string} selector
 * @returns {Element}
 * @throws {Error} when the page is missing an element the app depends on
 */
export function required(doc, selector) {
  const node = doc.querySelector(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}
