import { getMetadata } from '../../scripts/aem.js';
import {
  ADOPTION_APPLICATION_URL,
  BIRD_LISTING_PATH,
  getAdoptionStatus,
} from '../../scripts/birds.js';

function createLink(href, text, className = '') {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  link.className = className;
  return link;
}

function createFacts(facts) {
  const list = document.createElement('dl');
  list.className = 'bird-facts';
  facts.forEach(([label, value]) => {
    if (!value) return;
    const item = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    list.append(item);
  });
  return list;
}

function getProfileURL() {
  let url = new URL(window.location.href);
  const preferred = document.querySelector('link[rel="canonical"]')?.href
    || getMetadata('og:url') || url.href;
  try {
    const canonical = new URL(preferred, url);
    if (['https:', 'http:'].includes(canonical.protocol)) url = canonical;
  } catch {
    // A malformed canonical must not prevent sharing the current profile.
  }
  url.search = '';
  url.hash = '';
  return url.href;
}

function createSharing(name, summary) {
  const sharing = document.createElement('div');
  sharing.className = 'bird-sharing';
  sharing.setAttribute('role', 'group');
  sharing.setAttribute('aria-label', `Share ${name}'s profile`);
  const label = document.createElement('p');
  label.className = 'bird-sharing-label';
  label.textContent = `Share ${name}'s profile`;
  const controls = document.createElement('div');
  controls.className = 'bird-sharing-controls';
  const message = document.createElement('p');
  message.className = 'bird-sharing-status';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  const manualLink = document.createElement('input');
  manualLink.type = 'url';
  manualLink.readOnly = true;
  manualLink.hidden = true;
  manualLink.setAttribute('aria-label', 'Profile link');
  const data = {
    title: getMetadata('og:title') || document.title || name,
    text: getMetadata('og:description') || getMetadata('description') || summary,
    url: getProfileURL(),
  };
  manualLink.value = data.url;

  const copyLink = async () => {
    message.textContent = '';
    try {
      await navigator.clipboard.writeText(data.url);
      manualLink.hidden = true;
      message.textContent = 'Link copied.';
    } catch {
      manualLink.hidden = false;
      manualLink.focus();
      manualLink.select();
      message.textContent = 'Copy the selected link to share this profile.';
    }
  };

  if (typeof navigator.share === 'function') {
    const share = document.createElement('button');
    share.type = 'button';
    share.textContent = 'Share profile';
    share.addEventListener('click', async () => {
      share.disabled = true;
      message.textContent = '';
      try {
        await navigator.share(data);
      } catch (error) {
        if (error.name !== 'AbortError') await copyLink();
      } finally {
        share.disabled = false;
      }
    });
    controls.append(share);
  }
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy link';
  copy.addEventListener('click', copyLink);
  controls.append(copy);
  sharing.append(label, controls, manualLink, message);
  return sharing;
}

function addPageSchema(block, name, summary, image) {
  const schema = document.createElement('script');
  schema.type = 'application/ld+json';
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: getMetadata('og:title') || document.title || name,
    url: getProfileURL(),
    description: getMetadata('description') || summary,
    about: {
      '@type': 'Thing',
      name,
      description: [getMetadata('bird-species'), summary].filter(Boolean).join('. '),
      ...(image ? { image: image.src } : {}),
    },
  }).replace(/</g, '\\u003c');
  block.append(schema);
}

/**
 * Supports the original key/value biographies while profiles move to separate pages.
 */
function decorateLegacy(block, fields) {
  block.classList.add('legacy');
  const photo = document.createElement('div');
  photo.className = 'bird-photo';
  const image = fields.get('image')?.querySelector('picture, img');
  if (image) photo.append(image);
  const copy = document.createElement('div');
  copy.className = 'bird-introduction';
  const heading = document.createElement('h2');
  heading.textContent = fields.get('name')?.textContent.trim() || 'Meet this bird';
  const img = photo.querySelector('img');
  if (img && !img.alt) img.alt = heading.textContent;
  const fee = fields.get('adoption fee')?.textContent.trim();
  if (fee) photo.append(createFacts([['Adoption fee', fee]]));
  copy.append(heading);
  const biography = fields.get('text');
  if (biography) copy.append(...biography.childNodes);
  block.replaceChildren(photo, copy);
}

/**
 * Decorates a photo + introduction profile, leaving the full story as ordinary page content.
 */
export default function decorate(block) {
  const fields = new Map([...block.children]
    .filter((row) => row.children.length === 2)
    .map((row) => [row.children[0].textContent.trim().toLowerCase(), row.children[1]]));
  if (fields.has('name') || fields.has('text')) {
    decorateLegacy(block, fields);
    return;
  }

  const row = block.firstElementChild;
  const image = row?.children[0]?.querySelector('picture, img');
  const content = row?.children[1];
  const heading = content?.querySelector('h1, h2');
  const name = heading?.textContent.trim() || 'this bird';
  const summary = content?.querySelector('p')?.textContent.trim() || '';
  const status = getAdoptionStatus(getMetadata('adoption-status'));
  block.classList.add('profile');

  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'bird-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  breadcrumb.append(createLink(BIRD_LISTING_PATH, 'All available birds'));
  const current = document.createElement('span');
  current.setAttribute('aria-current', 'page');
  current.textContent = name;
  breadcrumb.append(current);

  const photo = document.createElement('div');
  photo.className = 'bird-photo';
  if (image) photo.append(image);
  else photo.textContent = 'Photo coming soon';

  const copy = document.createElement('div');
  copy.className = 'bird-introduction';
  const badge = document.createElement('p');
  badge.className = `bird-status status-${status.value}`;
  badge.textContent = status.label;
  copy.append(badge);
  const species = getMetadata('bird-species');
  if (species) {
    const subtitle = document.createElement('p');
    subtitle.className = 'bird-species';
    subtitle.textContent = species;
    copy.append(subtitle);
  }
  if (content) copy.append(...content.childNodes);
  copy.append(createFacts([
    ['Age', getMetadata('bird-age')],
    ['Sex', getMetadata('bird-sex')],
    ['Adoption fee', getMetadata('adoption-fee')],
  ]));

  const actions = document.createElement('div');
  actions.className = 'bird-actions';
  if (status.canApply) {
    actions.append(createLink(ADOPTION_APPLICATION_URL, `Apply to adopt ${name}`, 'button'));
  } else {
    const message = document.createElement('p');
    message.textContent = status.value === 'adopted'
      ? `${name} has found a home. Meet the birds still looking for theirs.`
      : 'Applications are not currently open for this bird.';
    actions.append(message, createLink(BIRD_LISTING_PATH, 'Meet other birds', 'button'));
  }
  const note = document.createElement('p');
  note.className = 'bird-adoption-note';
  note.append(
    'Serving the Lincoln, Omaha, and Council Bluffs metro areas. ',
    createLink('/adoption/requirements', 'Read our adoption requirements'),
    '. Please wait for adoption approval before purchasing a cage.',
  );
  copy.append(actions, note, createSharing(name, summary));
  const overview = document.createElement('div');
  overview.className = 'bird-overview';
  overview.append(photo, copy);
  block.replaceChildren(breadcrumb, overview);
  addPageSchema(block, name, summary, photo.querySelector('img'));
}
