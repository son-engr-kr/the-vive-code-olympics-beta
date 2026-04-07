var BASE_SERVINGS = 4;

var INGREDIENTS = [
  { id: 'ing-flour',    base: 500, unit: 'g',      name: 'tipo 00 flour (Caputo brand recommended)' },
  { id: 'ing-water',    base: 325, unit: 'ml',     name: 'warm water (65% hydration)' },
  { id: 'ing-salt',     base: 10,  unit: 'g',      name: 'fine sea salt' },
  { id: 'ing-yeast',    base: 3,   unit: 'g',      name: 'active dry yeast' },
  { id: 'ing-oil',      base: 1,   unit: ' tbsp',  name: 'extra-virgin olive oil' },
  { id: 'ing-tomatoes', base: 400, unit: 'g',      name: 'San Marzano tomatoes (DOP certified, hand-crushed)' },
  { id: 'ing-mozz',     base: 250, unit: 'g',      name: 'mozzarella di bufala (fresh, drained)' },
  { id: 'ing-basil',    base: 14,  unit: '',       name: 'fresh basil leaves (about {n})' },
];

function updateServings(value) {
  var servings = parseInt(value, 10);
  if (isNaN(servings) || servings < 1) servings = 1;
  if (servings > 20) servings = 20;

  var ratio = servings / BASE_SERVINGS;

  INGREDIENTS.forEach(function (ing) {
    var el = document.getElementById(ing.id);
    if (!el) return;

    var amount = ing.base * ratio;
    var displayAmount = (amount % 1 === 0) ? amount.toString() : amount.toFixed(1);

    if (ing.id === 'ing-basil') {
      el.textContent = ing.name.replace('{n}', displayAmount);
    } else {
      el.textContent = displayAmount + ing.unit + ' ' + ing.name;
    }
  });

  var result = document.getElementById('servings-result');
  if (result) {
    result.textContent = 'Showing quantities for ' + servings + (servings === 1 ? ' serving' : ' servings');
  }
}
