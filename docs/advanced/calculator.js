var BASE_SERVINGS = 4;

document.addEventListener('DOMContentLoaded', function () {
  // Auto-detect base servings from recipe-meta
  var metaSpans = document.querySelectorAll('.recipe-meta span');
  for (var i = 0; i < metaSpans.length; i++) {
    var m = metaSpans[i].textContent.match(/Servings:\s*(\d+)/);
    if (m) { BASE_SERVINGS = parseInt(m[1], 10); break; }
  }

  // Find ingredients <ul>: first <ul> after <h2>Ingredients</h2>
  var headings = document.querySelectorAll('.recipe-body h2');
  var ingredientsUl = null;
  for (var j = 0; j < headings.length; j++) {
    if (/^ingredients$/i.test(headings[j].textContent.trim())) {
      var el = headings[j].nextElementSibling;
      while (el && el.tagName !== 'UL') el = el.nextElementSibling;
      if (el) ingredientsUl = el;
      break;
    }
  }

  if (!ingredientsUl) return;

  // Store base text on each ingredient <li>
  ingredientsUl.querySelectorAll('li').forEach(function (li) {
    li.setAttribute('data-base', li.textContent.trim());
  });

  // Sync input and result text to actual base servings
  var input = document.getElementById('servings');
  if (input) input.value = BASE_SERVINGS;
  var result = document.getElementById('servings-result');
  if (result) result.textContent = 'Showing quantities for ' + BASE_SERVINGS + ' servings';
});

function scaleNum(n, ratio) {
  var s = n * ratio;
  if (s >= 100) return Math.round(s);
  if (s >= 10)  return parseFloat(s.toFixed(1));
  if (s >= 1)   return parseFloat(s.toFixed(1));
  return parseFloat(s.toFixed(2));
}

function updateServings(value) {
  var servings = parseInt(value, 10);
  if (isNaN(servings) || servings < 1) servings = 1;
  if (servings > 20) servings = 20;
  var ratio = servings / BASE_SERVINGS;

  document.querySelectorAll('[data-base]').forEach(function (li) {
    var text = li.getAttribute('data-base');

    // Try range first: "12-16 leaves"
    var newText = text.replace(
      /^(\d+\.?\d*)\s*[-\u2013]\s*(\d+\.?\d*)/,
      function (_, lo, hi) {
        return scaleNum(parseFloat(lo), ratio) + '-' + scaleNum(parseFloat(hi), ratio);
      }
    );

    // Then single leading number: "500g flour"
    if (newText === text) {
      newText = text.replace(/^(\d+\.?\d*)/, function (_, n) {
        return scaleNum(parseFloat(n), ratio);
      });
    }

    li.textContent = newText;
  });

  var result = document.getElementById('servings-result');
  if (result) {
    result.textContent = 'Showing quantities for ' + servings + (servings === 1 ? ' serving' : ' servings');
  }
}
