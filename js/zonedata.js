/* Starter delivery zones for Trinidad and Tobago: main towns with an approximate centre and radius (metres).
   These are a starting point only (centres are approximate): the seller can move, resize, rename or delete any of them on the map. */
(function (root) {
  const Z = [
    ['Port of Spain', 10.6549, -61.5019, 3500], ['St. James', 10.6580, -61.5230, 1600], ['Woodbrook', 10.6620, -61.5200, 1300], ['St. Ann\'s', 10.6780, -61.5050, 1800], ['Maraval', 10.6900, -61.5200, 2800],
    ['Diego Martin', 10.7160, -61.5640, 4000], ['Carenage', 10.6790, -61.5600, 2000], ['Chaguaramas', 10.6770, -61.6360, 3500], ['Laventille', 10.6600, -61.4850, 2200], ['Morvant', 10.6720, -61.4580, 2200],
    ['Barataria', 10.6520, -61.4700, 2000], ['San Juan', 10.6517, -61.4467, 2800], ['Santa Cruz', 10.7080, -61.4600, 3800], ['Curepe', 10.6417, -61.4108, 2000], ['St. Augustine', 10.6395, -61.3985, 2500],
    ['Tunapuna', 10.6528, -61.3833, 3000], ['Arouca', 10.6330, -61.3280, 2500], ['Trincity', 10.6200, -61.3500, 2500], ['Piarco', 10.5950, -61.3370, 3500], ['Arima', 10.6377, -61.2825, 4000],
    ['Valencia', 10.6283, -61.1989, 4000], ['Sangre Grande', 10.5867, -61.1300, 5000], ['Toco', 10.8400, -60.9500, 5000], ['Cunupia', 10.5500, -61.3600, 2500], ['Chaguanas', 10.5167, -61.4112, 5000],
    ['Couva', 10.4200, -61.4500, 4500], ['Freeport', 10.4500, -61.4170, 2500], ['Claxton Bay', 10.3700, -61.4600, 3000], ['Pointe-a-Pierre', 10.3200, -61.4700, 3000], ['San Fernando', 10.2800, -61.4670, 5000],
    ['Marabella', 10.2900, -61.4500, 2500], ['Gasparillo', 10.3100, -61.4400, 3000], ['Princes Town', 10.2667, -61.3833, 4500], ['Rio Claro', 10.3000, -61.1800, 5000], ['Mayaro', 10.2833, -61.0167, 5000],
    ['Penal', 10.1667, -61.4667, 4500], ['Debe', 10.1700, -61.4500, 3000], ['Siparia', 10.1333, -61.5000, 4500], ['Fyzabad', 10.1700, -61.5400, 3500], ['La Brea', 10.2500, -61.6200, 3500],
    ['Point Fortin', 10.1833, -61.6833, 5000], ['Cedros', 10.0900, -61.8600, 5000], ['Tabaquite', 10.4000, -61.2800, 4500], ['Scarborough (Tobago)', 11.1800, -60.7400, 5000], ['Crown Point (Tobago)', 11.1500, -60.8300, 4000]
  ];
  const rid = () => Math.random().toString(36).slice(2, 8);
  root.ZoneData = { starter: () => Z.map(([name, lat, lng, r]) => ({ id: rid(), name, lat, lng, r })) };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ZoneData;
})(typeof window !== 'undefined' ? window : globalThis);
