// Turns whatever the user typed into the digits-only format WhatsApp/n8n need.
//   "0300-1234567"      -> "923001234567"  (leading 0 = Pakistani local format)
//   "+92 300 1234567"   -> "923001234567"
//   "0092 300 1234567"  -> "923001234567"  ("00" = international dialling prefix)
// The client has a copy of this in client/src/lib/phone.js for the live hint;
// keep the two in sync. The server version is the one that actually counts.
function cleanWhatsappNumber(value) {
  let digits = String(value ?? '').replace(/\D/g, ''); // remove everything that isn't 0-9

  if (digits.startsWith('00')) {
    digits = digits.slice(2); // 0092... -> 92...
  } else if (digits.startsWith('0')) {
    digits = '92' + digits.slice(1); // 0300... -> 92300...
  }
  return digits;
}

module.exports = { cleanWhatsappNumber };
