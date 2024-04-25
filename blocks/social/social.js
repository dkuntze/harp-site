import { decorateIcons, readBlockConfig } from '../../scripts/aem.js';

function buildIcon(name, block) {
  let parentDiv = null;
  block.querySelectorAll('div').forEach((div) => {
    if (div.innerHTML.includes(name)) {
      parentDiv = div.parentElement;
    }
  });
  if (parentDiv) {
    const config = readBlockConfig(block);
    const div = document.createElement('div');
    const anchor = document.createElement('a');
    anchor.href = config[name];
    anchor.target = '_blank';
    anchor.setAttribute('aria-label', name);
    div.append(anchor);
    const span = document.createElement('span');
    span.classList.add('icon');
    span.classList.add(`icon-icons8-${name}`);
    anchor.append(span);
    parentDiv.replaceWith(div);
  }
  return parentDiv;
}

export default async function decorate(block) {
  buildIcon('facebook', block);
  buildIcon('youtube', block);
  buildIcon('instagram', block);
  buildIcon('twitter', block);
  decorateIcons(block, '');
}
