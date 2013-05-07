var table = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
  'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sh', 'ь': '\'', 'ы': 'i', 'э': 'e', 'ю': 'yu',
  'я': 'ya'
};

module.exports = function sanitize(url) {
  url = url.replace(/^\//, '');
  url = url.replace(/[^a-z0-9\.\s\-\/]/gi, function(c) {
    var isUpper = c.toLowerCase() !== c;
    var out = table[c.toLowerCase()] || '';
    if (isUpper) out = out.toUpperCase();
    return out;
  });
  return escape(url);
}
