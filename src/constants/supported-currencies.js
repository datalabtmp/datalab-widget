var supported = [
  {symbol: '₽', country: 'RU', name: 'RUB'},
  {symbol: '$', country: 'US', name: 'USD'},
  {symbol: '€', country: 'FR', name: 'EUR'},
  {symbol: '¥', country: 'CH', name: 'CNY'},
  {symbol: '฿', country: 'TH', name: 'THB'}
];

supported.by = function(name, value) {
  var ret = this[0];
  this.forEach(function (i) {
    if (i[name] === value) ret = i;
  });

  return ret;
}

supported.bySymbol = function (c) {
  return this.by('symbol', c);
};

supported.byName = function (c) {
  return this.by('name', c);
};

supported.byCountry = function (c) {
  return this.by('country', c);
};

supported.symbols = function () {
  var ret = [];
  this.forEach(function (i) {
    ret.push(i.symbol);
  });

  return ret;
};

export default supported;
