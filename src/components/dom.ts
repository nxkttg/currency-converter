/** Допоміжні функції для безпечної та типізованої роботи з DOM */

/**
 * Знаходить обов'язковий елемент і перевіряє його тип.
 * Generic T: getElement('#amount', HTMLInputElement) повертає саме HTMLInputElement,
 * тому TypeScript знає про .value, .disabled тощо.
 */
export function getElement<T extends Element>(
  selector: string,
  type: new () => T,
  root: ParentNode = document,
): T {
  const element = root.querySelector(selector);

  if (!(element instanceof type)) {
    throw new Error(`Елемент «${selector}» не знайдено або він має неправильний тип.`);
  }

  return element;
}

interface ElementOptions {
  className?: string;
  /** Текст вставляється через textContent — це захищає від XSS-атак */
  text?: string;
  attrs?: Record<string, string>;
}

/**
 * Створює елемент з класом, текстом, атрибутами та дочірніми вузлами.
 * keyof HTMLElementTagNameMap: createElement('li') повертає HTMLLIElement.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: ReadonlyArray<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    element.setAttribute(name, value);
  }

  element.append(...children);
  return element;
}
