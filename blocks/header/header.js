import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;

  const nav = document.getElementById('nav');
  const navSections = nav?.querySelector('.nav-sections');
  if (!nav || !navSections) return;

  const expandedButton = navSections.querySelector('button[aria-expanded="true"]');
  if (expandedButton && isDesktop.matches) {
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(navSections, false);
    expandedButton.focus();
  } else if (!isDesktop.matches) {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav, navSections);
    nav.querySelector('.nav-hamburger button').focus();
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;

  const navSections = nav.querySelector('.nav-sections');
  if (!navSections) return;

  const expandedButton = navSections.querySelector('button[aria-expanded="true"]');
  if (expandedButton && isDesktop.matches) {
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(navSections, false);
  } else if (!isDesktop.matches) {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav, navSections, false);
  }
}

/**
 * Toggles all navigation sections.
 * @param {Element} sections The navigation sections
 * @param {boolean|string} expanded Whether the sections are expanded
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-drop > button').forEach((button) => {
    button.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the navigation menu.
 * @param {Element} nav The navigation element
 * @param {Element} navSections The navigation sections
 * @param {boolean|null} forceExpanded Optional forced expanded state
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';

  if (isDesktop.matches) nav.removeAttribute('aria-expanded');
  else nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');

  if (navSections) {
    toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  }
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Decorates the header navigation.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  ['brand', 'sections', 'tools'].forEach((name, index) => {
    const section = nav.children[index];
    if (section) section.classList.add(`nav-${name}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container')?.classList.remove('button-container');
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      const subList = navSection.querySelector(':scope > ul');
      if (!subList) return;

      navSection.classList.add('nav-drop');
      const labelLink = navSection.querySelector(':scope > a');
      const label = labelLink?.textContent.trim()
        || [...navSection.childNodes]
          .filter((node) => node !== subList)
          .map((node) => node.textContent)
          .join('')
          .trim();
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `Toggle ${label} submenu`);
      if (labelLink) {
        navSection.insertBefore(button, subList);
      } else {
        [...navSection.childNodes].forEach((node) => {
          if (node !== subList) button.append(node);
        });
        navSection.prepend(button);
      }
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        if (isDesktop.matches) {
          button.focus();
          toggleAllNavSections(navSections, false);
        }
        button.setAttribute('aria-expanded', !expanded);
      });
    });
  }

  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
