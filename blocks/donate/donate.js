export default function decorate(block) {
  const form = document.createElement('form');
  form.action = 'https://www.paypal.com/donate';
  form.method = 'post';
  form.target = '_top';
  const inputHidden = document.createElement('input');
  inputHidden.type = 'hidden';
  inputHidden.name = 'hosted_button_id';
  inputHidden.value = 'JLYQNDLZ2JPZE';
  const inputImage = document.createElement('input');
  inputImage.src = 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif';
  inputImage.type = 'image';
  inputImage.border = '0';
  inputImage.name = 'submit';
  inputImage.title = 'PayPal - The safer, easier way to pay online!';
  inputImage.alt = 'Donate with PayPal button';
  const img = document.createElement('img');
  img.alt = '';
  img.border = '0';
  img.src = 'https://www.paypal.com/en_US/i/scr/pixel.gif';
  img.width = '1';
  img.height = '1';
  form.appendChild(inputHidden);
  form.appendChild(inputImage);
  form.appendChild(img);
  block.replaceWith(form);
}
