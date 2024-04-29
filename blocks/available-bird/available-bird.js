import { readBlockConfig } from '../../scripts/aem.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const mainDiv = document.createElement('div');
  mainDiv.classList.add('available-bird');
  const imageDiv = document.createElement('div');
  const adoptionFee = document.createElement('h3');
  if (config['adoption-fee']) {
    adoptionFee.innerHTML = `Adoption Fee: ${config['adoption-fee']}`;
  }
  const copyDiv = document.createElement('div');
  const h2 = document.createElement('h2');
  const copyP = document.createElement('p');
  copyP.innerHTML = config.text;
  h2.innerHTML = config.name;
  copyDiv.appendChild(h2);
  copyDiv.classList.add('copy');
  copyDiv.append(copyP);
  const image = document.createElement('img');
  image.src = config.image;
  imageDiv.appendChild(image);
  imageDiv.append(adoptionFee);
  mainDiv.appendChild(imageDiv);
  mainDiv.appendChild(copyDiv);
  block.replaceWith(mainDiv);
}
