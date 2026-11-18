import { createOptimizedPicture } from '../../scripts/aem.js';
import { getAdoptionStatus } from '../../scripts/birds.js';

let listingId = 0;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

async function fetchBirds(source, offset = 0) {
  const url = new URL(source);
  url.searchParams.set('offset', offset);
  url.searchParams.set('limit', 500);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Bird index unavailable');
  const page = await response.json();
  if (!Array.isArray(page.data) || Number(page.offset ?? offset) !== offset) {
    throw new Error('Invalid bird index');
  }
  const next = offset + page.data.length;
  const total = Number(page.total ?? next);
  if (!Number.isFinite(total) || total < next || (!page.data.length && next < total)) {
    throw new Error('Incomplete bird index');
  }
  return next < total ? page.data.concat(await fetchBirds(source, next)) : page.data;
}

function prepareBirds(records) {
  const paths = new Set();
  return records.filter((bird) => {
    if (!bird || typeof bird.path !== 'string' || typeof bird.name !== 'string') return false;
    const status = getAdoptionStatus(bird.status);
    const robots = String(bird.robots || '').toLowerCase().split(/[,\s]+/);
    if (!status.listed || robots.includes('noindex') || robots.includes('none')) return false;
    if (!bird.path.startsWith('/adoption/birds/')) return false;
    const url = new URL(bird.path, window.location.origin);
    if (!url.pathname.startsWith('/adoption/birds/') || url.pathname.endsWith('/')
      || url.search || url.hash || !bird.name.trim() || paths.has(url.pathname)) return false;
    paths.add(url.pathname);
    return true;
  }).map((bird) => ({
    ...bird,
    name: bird.name.trim(),
    species: String(bird.species || '').trim(),
    description: String(bird.description || '').trim(),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function createCard(bird) {
  const item = createElement('li', 'bird-card');
  const photo = createElement('div', 'bird-card-photo');
  let image;
  try {
    const url = bird.image && new URL(bird.image, new URL(bird.path, window.location.origin));
    if (url && ['http:', 'https:'].includes(url.protocol)) {
      image = createOptimizedPicture(url.href, bird.name, false, [{ width: '750' }]);
      image.querySelector('img').width = 750;
      image.querySelector('img').height = 750;
    }
  } catch {
    // Missing or malformed media should not hide an otherwise valid profile.
  }
  if (image) photo.append(image);
  else photo.textContent = 'Photo coming soon';
  const content = createElement('div', 'bird-card-content');
  const status = getAdoptionStatus(bird.status);
  const badge = createElement('p', `bird-status status-${status.value}`, status.label);
  const title = createElement('h2', '', bird.name);
  const facts = [bird.species, bird.age].filter(Boolean).join(' / ');
  content.append(badge, title);
  if (facts) content.append(createElement('p', 'bird-card-facts', facts));
  if (bird.description) content.append(createElement('p', 'bird-card-description', bird.description));
  const footer = createElement('div', 'bird-card-footer');
  if (bird.fee) footer.append(createElement('p', 'bird-card-fee', `Adoption fee: ${bird.fee}`));
  const link = createElement('a', 'bird-card-link', `Meet ${bird.name}`);
  link.href = bird.path;
  const arrow = createElement('span', '', ' \u2192');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(arrow);
  footer.append(link);
  content.append(footer);
  item.append(photo, content);
  return item;
}

function renderListing(block, birds) {
  listingId += 1;
  const controls = createElement('form', 'bird-filters');
  controls.setAttribute('role', 'search');
  controls.setAttribute('aria-label', 'Find an adoptable bird');
  controls.addEventListener('submit', (event) => event.preventDefault());
  const searchField = createElement('div', 'bird-filter-field');
  const searchLabel = createElement('label', '', 'Find a bird');
  const search = createElement('input');
  search.id = `bird-search-${listingId}`;
  searchLabel.htmlFor = search.id;
  search.type = 'search';
  search.placeholder = 'Name or species';
  searchField.append(searchLabel, search);
  const speciesField = createElement('div', 'bird-filter-field');
  const speciesLabel = createElement('label', '', 'Species');
  const species = createElement('select');
  species.id = `bird-species-${listingId}`;
  speciesLabel.htmlFor = species.id;
  const allSpecies = createElement('option', '', 'All species');
  allSpecies.value = '';
  species.append(allSpecies);
  [...new Set(birds.map((bird) => bird.species).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const option = createElement('option', '', value);
      option.value = value;
      species.append(option);
    });
  speciesField.append(speciesLabel, species);
  controls.append(searchField, speciesField);

  const count = createElement('p', 'bird-result-count');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  const cards = createElement('ul', 'bird-grid');
  const empty = createElement('div', 'bird-empty');
  const emptyTitle = createElement('h2');
  const emptyCopy = createElement('p');
  const reset = createElement('button', 'bird-reset', 'Clear filters');
  reset.type = 'button';
  empty.append(emptyTitle, emptyCopy, reset);
  const items = birds.map((bird) => ({ bird, card: createCard(bird) }));
  cards.append(...items.map(({ card }) => card));

  const update = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    items.forEach(({ bird, card }) => {
      const haystack = `${bird.name} ${bird.species} ${bird.description}`.toLowerCase();
      const matches = haystack.includes(query)
        && (!species.value || bird.species === species.value);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = `${visible} ${visible === 1 ? 'bird' : 'birds'} ${query || species.value ? 'found' : 'to meet'}`;
    empty.hidden = visible > 0;
    emptyTitle.textContent = birds.length ? 'No birds match just yet' : 'No birds listed right now';
    emptyCopy.textContent = birds.length
      ? 'Try another name or species, or clear your filters to meet everyone.'
      : 'Please check back for birds ready for adoption.';
    reset.hidden = !birds.length;
    controls.hidden = !birds.length;
  };
  search.addEventListener('input', update);
  species.addEventListener('change', update);
  reset.addEventListener('click', () => {
    controls.reset();
    update();
    search.focus();
  });
  block.replaceChildren(controls, count, cards, empty);
  update();
}

/**
 * Loads all published bird profiles from the dedicated AEM index.
 */
export default async function decorate(block) {
  const sourcePath = block.querySelector('a')?.getAttribute('href') || '/bird-index.json';
  const load = async () => {
    block.setAttribute('aria-busy', 'true');
    const loading = createElement('p', 'bird-loading', 'Finding your feathered companions...');
    loading.setAttribute('role', 'status');
    block.replaceChildren(loading);
    try {
      const source = new URL(sourcePath, window.location.origin);
      if (source.origin !== window.location.origin) throw new Error('Use a same-origin bird index');
      renderListing(block, prepareBirds(await fetchBirds(source)));
    } catch {
      const error = createElement('div', 'bird-empty');
      error.setAttribute('role', 'status');
      const title = createElement('h2', '', 'We could not load the birds');
      const message = createElement('p', '', 'Please try again in a moment. Our adoption requirements are still available.');
      const retry = createElement('button', '', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', async () => {
        await load();
        block.querySelector('input, button')?.focus();
      });
      const requirements = createElement('a', '', 'Read adoption requirements');
      requirements.href = '/adoption/requirements';
      error.append(title, message, retry, requirements);
      block.replaceChildren(error);
    } finally {
      block.setAttribute('aria-busy', 'false');
    }
  };
  await load();
}
