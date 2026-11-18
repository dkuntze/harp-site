export const BIRD_LISTING_PATH = '/adoption/available-birds';
export const ADOPTION_APPLICATION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdg0YOCbWK27rldZ23SNctTqfLemAhvXevSC9DG-gXKMDL-Ew/viewform';

export function getAdoptionStatus(value = '') {
  const status = String(value).trim().toLowerCase();
  const labels = {
    available: 'Available for adoption',
    pending: 'Adoption pending',
    adopted: 'Happily adopted',
  };
  const known = Object.hasOwn(labels, status);
  return {
    value: known ? status : 'unavailable',
    label: known ? labels[status] : 'Not currently available',
    listed: status === 'available' || status === 'pending',
    canApply: status === 'available',
  };
}
