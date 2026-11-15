// Copy of server/src/utils/phone.js, used only to show the live
// "Will be saved as ..." hint. The server cleans the number again on save.
export function cleanWhatsappNumber(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = '92' + digits.slice(1);
  }
  return digits;
}
