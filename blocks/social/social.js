import { decorateIcons, readBlockConfig } from '../../scripts/aem.js';

function buildIcon(name, block) {
  let parentDiv = null;
  block.querySelectorAll('div').forEach((div) => {
    if (div.innerHTML.includes(name)) {
      parentDiv = div.parentElement;
    }
  });
  if (parentDiv) {
    const div = document.createElement('div');
    const span = document.createElement('span');
    span.classList.add('icon');
    span.classList.add(`icon-icons8-${name}`);
    div.append(span);
    parentDiv.replaceWith(div);
  }
  return parentDiv;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);

  const fb = buildIcon('facebook', block);
  buildIcon('youtube', block);
  buildIcon('instagram', block);
  buildIcon('twitter', block);
  decorateIcons(block, '');
}
