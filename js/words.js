/* Word library: the owner's English ↔ Spanish word list. It builds the Spanish name of an item from its English description so the
   online store can show it to Spanish-speaking visitors. It knows a little Spanish grammar: the thing comes first and what describes it
   follows ("blue dress" → "vestido azul"), colours agree with the thing ("red dresses" → "vestidos rojos"), materials become "de lino",
   and phrases like "long sleeve" become "de manga larga". Pure rules, tested in Node. Nothing here touches costs or profit. */
(function (root) {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[“”"'’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const clean = (tok) => tok.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, '');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // ---- the starter list ----------------------------------------------------------------------------------------------------------
  // t: n thing (g = m/f, pl = always plural), a describing word (inv 'all' = never changes), m material ("de lino"), p phrase that goes
  // after the thing ("de manga larga"), c connector ("y"), l literal (sizes, codes), x plain (stays where it is typed).
  const N = (c, rows) => rows.map(([en, es, g, pl, pe]) => Object.assign({ en, es, c, t: 'n', g }, pl ? { pl: true } : {}, pe ? { pe } : {}));
  const A = (c, rows) => rows.map(([en, es, inv]) => (inv ? { en, es, c, t: 'a', inv } : { en, es, c, t: 'a' }));
  const T = (t) => (c, rows) => rows.map(([en, es]) => ({ en, es, c, t }));
  const M = T('m'), P = T('p'), C = T('c'), L = T('l'), X = T('x');
  const STARTER = [].concat(
    N('clothes', [['top', 'blusa', 'f'], ['blouse', 'blusa', 'f'], ['shirt', 'camisa', 'f'], ['t-shirt', 'camiseta', 'f'], ['tee', 'camiseta', 'f'], ['tank top', 'camiseta sin mangas', 'f'], ['crop top', 'crop top', 'm', 0, 'crop tops'],
      ['bodysuit', 'body', 'm', 0, 'bodys'], ['sweater', 'suéter', 'm'], ['sweatshirt', 'sudadera', 'f'], ['hoodie', 'sudadera con capucha', 'f'], ['cardigan', 'cárdigan', 'm', 0, 'cárdigans'], ['jacket', 'chaqueta', 'f'], ['blazer', 'blazer', 'm', 0, 'blazers'],
      ['coat', 'abrigo', 'm'], ['vest', 'chaleco', 'm'], ['dress', 'vestido', 'm'], ['gown', 'vestido', 'm'], ['maxi dress', 'vestido largo', 'm'], ['mini dress', 'vestido corto', 'm'], ['midi dress', 'vestido midi', 'm'],
      ['wrap dress', 'vestido cruzado', 'm'], ['bodycon dress', 'vestido ajustado', 'm'], ['skirt', 'falda', 'f'], ['pants', 'pantalones', 'm', 1], ['trousers', 'pantalones', 'm', 1], ['jeans', 'jeans', 'm', 1],
      ['leggings', 'leggings', 'f', 1], ['shorts', 'shorts', 'm', 1], ['joggers', 'pantalones deportivos', 'm', 1], ['track pants', 'pantalones deportivos', 'm', 1], ['trackpants', 'pantalones deportivos', 'm', 1], ['sweatpants', 'pantalones deportivos', 'm', 1], ['sweat pants', 'pantalones deportivos', 'm', 1], ['jogger pants', 'pantalones deportivos', 'm', 1], ['cargo pants', 'pantalones cargo', 'm', 1], ['palazzo pants', 'pantalones palazzo', 'm', 1], ['yoga pants', 'pantalones de yoga', 'm', 1], ['dress pants', 'pantalones de vestir', 'm', 1], ['biker shorts', 'licras cortas', 'f', 1], ['track jacket', 'chaqueta deportiva', 'f'], ['jumpsuit', 'enterizo', 'm'], ['romper', 'mono', 'm'], ['overalls', 'overol', 'm'],
      ['set', 'conjunto', 'm'], ['tracksuit', 'conjunto deportivo', 'm'], ['pajamas', 'pijama', 'm'], ['robe', 'bata', 'f'], ['swimsuit', 'traje de baño', 'm'], ['bikini', 'bikini', 'm'], ['lingerie', 'lencería', 'f'],
      ['bra', 'sostén', 'm'], ['underwear', 'ropa interior', 'f'], ['socks', 'calcetines', 'm', 1], ['tights', 'medias', 'f', 1], ['scarf', 'bufanda', 'f'], ['hat', 'sombrero', 'm'], ['cap', 'gorra', 'f'], ['belt', 'cinturón', 'm'], ['gloves', 'guantes', 'm', 1]]),
    N('shoes', [['shoes', 'zapatos', 'm', 1], ['sandals', 'sandalias', 'f', 1], ['sneakers', 'tenis', 'm', 1], ['boots', 'botas', 'f', 1], ['heels', 'tacones', 'm', 1], ['flats', 'zapatos planos', 'm', 1], ['slippers', 'pantuflas', 'f', 1],
      ['slides', 'chancletas', 'f', 1], ['bag', 'cartera', 'f'], ['handbag', 'cartera', 'f'], ['purse', 'cartera', 'f'], ['backpack', 'mochila', 'f'], ['wallet', 'billetera', 'f'], ['clutch', 'clutch', 'm', 0, 'clutches'], ['tote bag', 'bolso tote', 'm'],
      ['sunglasses', 'lentes de sol', 'm', 1], ['watch', 'reloj', 'm'], ['ring', 'anillo', 'm'], ['necklace', 'collar', 'm'], ['earrings', 'aretes', 'm', 1], ['bracelet', 'pulsera', 'f'], ['anklet', 'tobillera', 'f'], ['perfume', 'perfume', 'm']]),
    A('colours', [['black', 'negro'], ['white', 'blanco'], ['red', 'rojo'], ['blue', 'azul'], ['green', 'verde'], ['yellow', 'amarillo'], ['orange', 'anaranjado'], ['purple', 'morado'], ['pink', 'rosado'], ['brown', 'marrón'],
      ['grey', 'gris'], ['gray', 'gris'], ['beige', 'beige'], ['gold', 'dorado'], ['silver', 'plateado'], ['sky blue', 'celeste'], ['baby blue', 'celeste'], ['cream', 'crema', 'all'], ['ivory', 'marfil', 'all'],
      ['navy', 'azul marino', 'all'], ['navy blue', 'azul marino', 'all'], ['light blue', 'azul claro', 'all'], ['dark blue', 'azul oscuro', 'all'], ['royal blue', 'azul rey', 'all'], ['light pink', 'rosado claro', 'all'],
      ['hot pink', 'fucsia', 'all'], ['fuchsia', 'fucsia', 'all'], ['magenta', 'magenta', 'all'], ['light green', 'verde claro', 'all'], ['dark green', 'verde oscuro', 'all'], ['olive', 'verde oliva', 'all'], ['olive green', 'verde oliva', 'all'], ['army green', 'verde militar', 'all'], ['forest green', 'verde bosque', 'all'], ['emerald', 'esmeralda', 'all'], ['lime', 'lima', 'all'], ['sage', 'verde salvia', 'all'], ['mint', 'menta', 'all'],
      ['teal', 'verde azulado', 'all'], ['turquoise', 'turquesa', 'all'], ['aqua', 'aqua', 'all'], ['lavender', 'lavanda', 'all'], ['lilac', 'lila', 'all'], ['coral', 'coral', 'all'], ['peach', 'durazno', 'all'], ['salmon', 'salmón', 'all'],
      ['burgundy', 'vinotinto', 'all'], ['maroon', 'vinotinto', 'all'], ['wine', 'vino', 'all'], ['mustard', 'mostaza', 'all'], ['khaki', 'caqui', 'all'], ['tan', 'beige', 'all'], ['nude', 'nude', 'all'], ['champagne', 'champán', 'all'],
      ['rose gold', 'oro rosado', 'all'], ['copper', 'cobre', 'all'], ['bronze', 'bronce', 'all'], ['charcoal', 'gris oscuro', 'all'], ['off white', 'blanco hueso', 'all'], ['rust', 'óxido', 'all'], ['neon', 'neón', 'all'],
      ['multicolor', 'multicolor'], ['colorful', 'colorido'], ['transparent', 'transparente'], ['clear', 'transparente']]),
    A('styles', [['floral', 'floral'], ['striped', 'rayado'], ['printed', 'estampado'], ['solid', 'liso'], ['plain', 'liso'], ['embroidered', 'bordado'], ['pleated', 'plisado'], ['ribbed', 'acanalado'], ['halter', 'halter', 'all'],
      ['slim fit', 'ajustado'], ['fitted', 'ajustado'], ['oversized', 'oversize', 'all'], ['loose', 'holgado'], ['stretch', 'elástico'], ['cropped', 'corto'], ['maxi', 'largo'], ['midi', 'midi', 'all'], ['mini', 'mini', 'all'],
      ['long', 'largo'], ['short', 'corto'], ['casual', 'casual'], ['elegant', 'elegante'], ['formal', 'formal'], ['sexy', 'sexy', 'all'], ['cute', 'bonito'], ['sporty', 'deportivo'], ['vintage', 'vintage', 'all'], ['boho', 'boho', 'all'],
      ['tropical', 'tropical'], ['new', 'nuevo'], ['unisex', 'unisex', 'all'], ['small', 'pequeño'], ['medium', 'mediano'], ['large', 'grande'], ['extra large', 'extra grande']]),
    P('styles', [['long sleeve', 'de manga larga'], ['short sleeve', 'de manga corta'], ['sleeveless', 'sin mangas'], ['off shoulder', 'con hombros descubiertos'], ['one shoulder', 'de un hombro'], ['strapless', 'sin tirantes'],
      ['v neck', 'de cuello en V'], ['high waist', 'de tiro alto'], ['low waist', 'de tiro bajo'], ['wide leg', 'de pierna ancha'], ['straight leg', 'de pierna recta'], ['polka dot', 'de lunares'], ['plaid', 'de cuadros'],
      ['checkered', 'de cuadros'], ['ruffle', 'con volantes'], ['ruffled', 'con volantes'], ['sequin', 'con lentejuelas'], ['sequined', 'con lentejuelas'], ['backless', 'con espalda descubierta'], ['lace up', 'con cordones'],
      ['button', 'con botones'], ['pockets', 'con bolsillos'], ['pocket', 'con bolsillo'], ['hooded', 'con capucha'], ['zip', 'con cierre'], ['plus size', 'talla grande'], ['one size', 'talla única'], ['free size', 'talla única'],
      ['for women', 'para mujer'], ['for men', 'para hombre'], ['for kids', 'para niños'], ['for girls', 'para niña'], ['for boys', 'para niño'], ['for baby', 'para bebé'], ['women', 'de mujer'], ['womens', 'de mujer'], ['mens', 'de hombre'], ['men', 'de hombre'], ['kids', 'para niños'], ['girls', 'para niña'], ['boys', 'para niño'], ['baby', 'para bebé']]),
    M('materials', [['cotton', 'algodón'], ['linen', 'lino'], ['silk', 'seda'], ['satin', 'satén'], ['velvet', 'terciopelo'], ['denim', 'jean'], ['leather', 'cuero'], ['faux leather', 'cuero sintético'], ['suede', 'gamuza'],
      ['wool', 'lana'], ['knit', 'punto'], ['crochet', 'crochet'], ['lace', 'encaje'], ['chiffon', 'gasa'], ['tulle', 'tul'], ['mesh', 'malla'], ['fleece', 'polar'], ['corduroy', 'pana'], ['nylon', 'nailon'],
      ['polyester', 'poliéster'], ['spandex', 'licra'], ['straw', 'paja'], ['canvas', 'lona'], ['metal', 'metal'], ['plastic', 'plástico'], ['wood', 'madera'], ['cotton blend', 'mezcla de algodón']]),
    C('more', [['and', 'y'], ['&', 'y'], ['with', 'con'], ['for', 'para'], ['in', 'en'], ['or', 'o'], ['of', 'de'], ['without', 'sin']]),
    L('more', [['xs', 'XS'], ['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL'], ['xxl', 'XXL'], ['3xl', '3XL']]),
    X('more', [['size', 'talla']])
  );

  // ---- more things people sell (added after the first list; older libraries get these on the next start) ----------------------------
  const NP = (c, rows) => N(c, rows);
  const MORE = [].concat(
    NP('clothes', [['camisole', 'camiseta de tirantes', 'f', 0, 'camisetas de tirantes'], ['tube top', 'top tubo', 'm', 0, 'tops tubo'], ['bralette', 'bralette', 'm'], ['corset', 'corsé', 'm'], ['polo shirt', 'camisa polo', 'f'], ['polo', 'polo', 'm'],
      ['turtleneck', 'suéter de cuello alto', 'm', 0, 'suéteres de cuello alto'], ['tunic', 'túnica', 'f'], ['kimono', 'kimono', 'm'], ['poncho', 'poncho', 'm'], ['shawl', 'chal', 'm'], ['cape', 'capa', 'f'], ['peplum top', 'blusa peplum', 'f', 0, 'blusas peplum'],
      ['pullover', 'pulóver', 'm'], ['windbreaker', 'cortavientos', 'm', 0, 'cortavientos'], ['puffer jacket', 'chaqueta acolchada', 'f', 0, 'chaquetas acolchadas'], ['bomber jacket', 'chaqueta bomber', 'f'], ['denim jacket', 'chaqueta de jean', 'f'],
      ['leather jacket', 'chaqueta de cuero', 'f'], ['track jacket', 'chaqueta deportiva', 'f', 0, 'chaquetas deportivas'], ['trench coat', 'gabardina', 'f'], ['raincoat', 'impermeable', 'm'], ['parka', 'parka', 'f'], ['suit', 'traje', 'm'], ['tuxedo', 'esmoquin', 'm'], ['waistcoat', 'chaleco', 'm'],
      ['sundress', 'vestido de verano', 'm'], ['cocktail dress', 'vestido de coctel', 'm'], ['evening dress', 'vestido de noche', 'm'], ['prom dress', 'vestido de graduación', 'm'], ['wedding dress', 'vestido de novia', 'm'], ['bridesmaid dress', 'vestido de dama de honor', 'm'],
      ['shirt dress', 'vestido camisero', 'm', 0, 'vestidos camiseros'], ['sweater dress', 'vestido de suéter', 'm'], ['slip dress', 'vestido de tirantes', 'm'], ['tube dress', 'vestido tubo', 'm'], ['pinafore', 'jumper', 'm', 0, 'jumpers'], ['kaftan', 'caftán', 'm'], ['abaya', 'abaya', 'f'], ['beach dress', 'vestido de playa', 'm'],
      ['culottes', 'culottes', 'm', 1], ['capris', 'pescadores', 'm', 1], ['bermuda shorts', 'bermudas', 'f', 1], ['bermudas', 'bermudas', 'f', 1], ['skort', 'falda short', 'f', 0, 'faldas short'], ['pencil skirt', 'falda lápiz', 'f', 0, 'faldas lápiz'], ['tennis skirt', 'falda de tenis', 'f'],
      ['wrap skirt', 'falda envolvente', 'f', 0, 'faldas envolventes'], ['tutu', 'tutú', 'm'], ['sarong', 'pareo', 'm'], ['jeggings', 'jeggings', 'f', 1], ['flare pants', 'pantalones acampanados', 'm', 1], ['bell bottoms', 'pantalones acampanados', 'm', 1], ['harem pants', 'pantalones harem', 'm', 1],
      ['chinos', 'chinos', 'm', 1], ['slacks', 'pantalones de vestir', 'm', 1], ['hot pants', 'hot pants', 'm', 1], ['pajama pants', 'pantalones de pijama', 'm', 1], ['gym shorts', 'shorts deportivos', 'm', 1], ['bike shorts', 'licras cortas', 'f', 1],
      ['matching set', 'conjunto a juego', 'm', 0, 'conjuntos a juego'], ['lounge set', 'conjunto de descanso', 'm'], ['pajama set', 'conjunto de pijama', 'm'], ['one piece swimsuit', 'traje de baño de una pieza', 'm'], ['tankini', 'tankini', 'm'], ['cover up', 'salida de playa', 'f'],
      ['sports bra', 'sostén deportivo', 'm', 0, 'sostenes deportivos'], ['activewear', 'ropa deportiva', 'f', 0, 'ropa deportiva'], ['leotard', 'leotardo', 'm'], ['yoga set', 'conjunto de yoga', 'm'],
      ['nightgown', 'camisón', 'm'], ['nightdress', 'camisón', 'm'], ['slip', 'enagua', 'f'], ['panties', 'pantaletas', 'f', 1], ['briefs', 'calzoncillos', 'm', 1], ['boxers', 'bóxers', 'm', 1], ['thong', 'tanga', 'f'], ['shapewear', 'faja', 'f'], ['stockings', 'medias', 'f', 1], ['undershirt', 'camiseta interior', 'f', 0, 'camisetas interiores'],
      ['onesie', 'mameluco', 'm'], ['school uniform', 'uniforme escolar', 'm', 0, 'uniformes escolares'], ['bib', 'babero', 'm'], ['beanie', 'gorro', 'm'], ['bonnet', 'gorro', 'm'], ['bucket hat', 'sombrero de pescador', 'm'], ['sun hat', 'sombrero de sol', 'm'], ['fedora', 'fedora', 'm'], ['visor', 'visera', 'f'],
      ['tie', 'corbata', 'f'], ['bow tie', 'pajarita', 'f'], ['suspenders', 'tirantes', 'm', 1], ['umbrella', 'paraguas', 'm', 0, 'paraguas'], ['bandana', 'bandana', 'f'], ['head wrap', 'pañuelo para la cabeza', 'm']]),
    NP('shoes', [['loafers', 'mocasines', 'm', 1], ['pumps', 'zapatos de tacón', 'm', 1], ['wedges', 'cuñas', 'f', 1], ['platforms', 'plataformas', 'f', 1], ['stilettos', 'stilettos', 'm', 1], ['ballet flats', 'bailarinas', 'f', 1], ['espadrilles', 'alpargatas', 'f', 1], ['flip flops', 'chancletas', 'f', 1],
      ['crocs', 'crocs', 'm', 1], ['ankle boots', 'botines', 'm', 1], ['knee high boots', 'botas altas', 'f', 1], ['rain boots', 'botas de lluvia', 'f', 1], ['work boots', 'botas de trabajo', 'f', 1], ['trainers', 'tenis', 'm', 1], ['running shoes', 'zapatos para correr', 'm', 1],
      ['mules', 'mules', 'f', 1], ['clogs', 'zuecos', 'm', 1], ['high tops', 'tenis altos', 'm', 1], ['crossbody bag', 'bolso cruzado', 'm', 0, 'bolsos cruzados'], ['shoulder bag', 'bolso de hombro', 'm'], ['bucket bag', 'bolso tipo cubo', 'm'], ['fanny pack', 'riñonera', 'f'], ['belt bag', 'riñonera', 'f'],
      ['duffel bag', 'bolso deportivo', 'm', 0, 'bolsos deportivos'], ['suitcase', 'maleta', 'f'], ['travel bag', 'bolso de viaje', 'm'], ['makeup bag', 'bolso de maquillaje', 'm'], ['laptop bag', 'bolso para laptop', 'm'], ['lunch bag', 'lonchera', 'f'], ['beach bag', 'bolso de playa', 'm'], ['tote', 'bolso tote', 'm'],
      ['satchel', 'maletín', 'm'], ['diaper bag', 'bolso de pañales', 'm'], ['phone case', 'funda de teléfono', 'f'], ['card holder', 'tarjetero', 'm'], ['coin purse', 'monedero', 'm'], ['keychain', 'llavero', 'm'],
      ['studs', 'aretes pequeños', 'm', 1], ['hoops', 'aros', 'm', 1], ['pendant', 'colgante', 'm'], ['chain', 'cadena', 'f'], ['choker', 'gargantilla', 'f'], ['brooch', 'broche', 'm'], ['cufflinks', 'gemelos', 'm', 1], ['bangle', 'brazalete', 'm'], ['toe ring', 'anillo para el pie', 'm'], ['jewelry set', 'juego de joyas', 'm', 0, 'juegos de joyas'],
      ['hair clip', 'pinza para el cabello', 'f'], ['headband', 'cintillo', 'm'], ['hair band', 'cintillo', 'm'], ['scrunchie', 'scrunchie', 'f'], ['hair tie', 'liga para el cabello', 'f'], ['wig', 'peluca', 'f'], ['hair extensions', 'extensiones', 'f', 1], ['glasses', 'lentes', 'm', 1], ['smart watch', 'reloj inteligente', 'm', 0, 'relojes inteligentes'],
      ['lipstick', 'labial', 'm'], ['lip gloss', 'brillo labial', 'm', 0, 'brillos labiales'], ['nail polish', 'esmalte de uñas', 'm'], ['body spray', 'rocío corporal', 'm'], ['lotion', 'loción', 'f'], ['makeup', 'maquillaje', 'm'], ['eyelashes', 'pestañas', 'f', 1],
      ['towel', 'toalla', 'f'], ['blanket', 'manta', 'f'], ['pillow', 'almohada', 'f'], ['curtain', 'cortina', 'f'], ['bedsheet', 'sábana', 'f'], ['candle', 'vela', 'f'],
      ['pair', 'par', 'm'], ['pack', 'paquete', 'm'], ['bundle', 'paquete', 'm'], ['lot', 'lote', 'm'], ['dozen', 'docena', 'f']]),
    A('colours', [['light grey', 'gris claro', 'all'], ['light gray', 'gris claro', 'all'], ['dark grey', 'gris oscuro', 'all'], ['dark gray', 'gris oscuro', 'all'], ['light brown', 'marrón claro', 'all'], ['dark brown', 'marrón oscuro', 'all'], ['dark red', 'rojo oscuro', 'all'], ['light yellow', 'amarillo claro', 'all'],
      ['neon pink', 'rosado neón', 'all'], ['neon green', 'verde neón', 'all'], ['neon orange', 'anaranjado neón', 'all'], ['pastel', 'pastel', 'all'], ['dusty pink', 'rosa palo', 'all'], ['blush', 'rosa palo', 'all'], ['baby pink', 'rosado pastel', 'all'], ['powder blue', 'azul pálido', 'all'],
      ['cobalt', 'azul cobalto', 'all'], ['electric blue', 'azul eléctrico', 'all'], ['denim blue', 'azul jean', 'all'], ['indigo', 'índigo', 'all'], ['violet', 'violeta', 'all'], ['plum', 'ciruela', 'all'], ['mauve', 'malva', 'all'], ['raspberry', 'frambuesa', 'all'], ['cherry', 'cereza', 'all'],
      ['scarlet', 'escarlata', 'all'], ['crimson', 'carmesí', 'all'], ['jade', 'jade', 'all'], ['mocha', 'moca', 'all'], ['chocolate', 'chocolate', 'all'], ['camel', 'camel', 'all'], ['taupe', 'topo', 'all'], ['ecru', 'crudo', 'all'], ['sand', 'arena', 'all'], ['stone', 'piedra', 'all'], ['apricot', 'albaricoque', 'all'],
      ['tangerine', 'mandarina', 'all'], ['lemon', 'limón', 'all'], ['pearl', 'perla', 'all'], ['metallic gold', 'dorado metálico', 'all'], ['metallic silver', 'plateado metálico', 'all'], ['rose', 'rosa', 'all'], ['heather grey', 'gris jaspeado', 'all'], ['oatmeal', 'avena', 'all'], ['burnt orange', 'naranja quemado', 'all'],
      ['bottle green', 'verde botella', 'all'], ['cyan', 'cian', 'all'], ['ice blue', 'azul hielo', 'all'], ['dusty blue', 'azul empolvado', 'all'], ['wine red', 'rojo vino', 'all']]),
    A('styles', [['two tone', 'bicolor', 'all'], ['tie dye', 'tie dye', 'all'], ['camo', 'camuflado'], ['camouflage', 'camuflado'], ['paisley', 'paisley', 'all'], ['geometric', 'geométrico'], ['abstract', 'abstracto'], ['metallic', 'metálico'], ['shiny', 'brillante'], ['matte', 'mate', 'all'],
      ['sheer', 'transparente'], ['see through', 'transparente', 'all'], ['lined', 'forrado'], ['padded', 'acolchado'], ['quilted', 'acolchado'], ['waterproof', 'impermeable', 'all'], ['breathable', 'transpirable'], ['push up', 'push up', 'all'], ['adjustable', 'ajustable'], ['elastic', 'elástico'],
      ['low cut', 'escotado'], ['skinny', 'skinny', 'all'], ['straight', 'recto'], ['flared', 'acampanado'], ['bootcut', 'bootcut', 'all'], ['baggy', 'holgado'], ['relaxed', 'holgado'], ['tailored', 'entallado'], ['bodycon', 'ajustado'], ['asymmetric', 'asimétrico'], ['wrap', 'cruzado'],
      ['ruched', 'fruncido'], ['distressed', 'rasgado'], ['ripped', 'rasgado'], ['washed', 'lavado'], ['frayed', 'deshilachado'], ['full length', 'largo'], ['petite', 'petite', 'all'], ['tall', 'alto'], ['curvy', 'curvy', 'all'], ['school', 'escolar'], ['custom', 'personalizado'], ['original', 'original'], ['authentic', 'auténtico'],
      ['brand new', 'nuevo'], ['used', 'usado'], ['preloved', 'usado'], ['imported', 'importado'], ['embellished', 'adornado'], ['extra small', 'extra pequeño']]),
    P('styles', [['long sleeves', 'de manga larga'], ['short sleeves', 'de manga corta'], ['round neck', 'de cuello redondo'], ['crew neck', 'de cuello redondo'], ['scoop neck', 'de cuello redondo'], ['square neck', 'de cuello cuadrado'], ['halter neck', 'de cuello halter'], ['high neck', 'de cuello alto'],
      ['cowl neck', 'de cuello caído'], ['boat neck', 'de cuello barco'], ['collared', 'con cuello'], ['deep v', 'de escote profundo'], ['sweetheart', 'de escote corazón'], ['puff sleeve', 'de manga abullonada'], ['bell sleeve', 'de manga campana'], ['batwing', 'de manga murciélago'],
      ['three quarter sleeve', 'de manga tres cuartos'], ['cap sleeve', 'de manga casquillo'], ['flutter sleeve', 'de manga volante'], ['half sleeve', 'de media manga'], ['strappy', 'de tirantes'], ['spaghetti strap', 'de tirantes finos'], ['thin strap', 'de tirantes finos'], ['cold shoulder', 'con hombros descubiertos'],
      ['animal print', 'de estampado animal'], ['leopard print', 'de leopardo'], ['zebra print', 'de cebra'], ['snake print', 'de serpiente'], ['graphic', 'con estampado gráfico'], ['gingham', 'de cuadros vichy'], ['houndstooth', 'de pata de gallo'], ['checked', 'de cuadros'], ['pinstripe', 'de rayas finas'],
      ['glitter', 'con brillo'], ['quick dry', 'de secado rápido'], ['seamless', 'sin costuras'], ['wireless', 'sin aro'], ['a line', 'en A'], ['empire', 'de corte imperio'], ['belted', 'con cinturón'], ['tiered', 'de capas'], ['layered', 'en capas'], ['smocked', 'con smock'], ['acid wash', 'de lavado ácido'],
      ['high rise', 'de tiro alto'], ['mid rise', 'de tiro medio'], ['low rise', 'de tiro bajo'], ['high waisted', 'de tiro alto'], ['knee length', 'hasta la rodilla'], ['ankle length', 'hasta el tobillo'], ['floor length', 'hasta el piso'], ['maternity', 'de maternidad'], ['nursing', 'de lactancia'],
      ['work', 'de trabajo'], ['party', 'de fiesta'], ['wedding', 'de boda'], ['evening', 'de noche'], ['summer', 'de verano'], ['winter', 'de invierno'], ['beach', 'de playa'], ['hand made', 'hecho a mano'], ['handmade', 'hecho a mano'], ['designer', 'de diseñador'], ['luxury', 'de lujo'],
      ['second hand', 'de segunda mano'], ['new with tags', 'nuevo con etiqueta'], ['beaded', 'con cuentas'], ['studded', 'con tachuelas'], ['fringe', 'con flecos'], ['tassel', 'con borlas'], ['rhinestone', 'con pedrería'], ['one size fits all', 'talla única'], ['for her', 'para ella'], ['for him', 'para él']]),
    M('materials', [['viscose', 'viscosa'], ['rayon', 'rayón'], ['acrylic', 'acrílico'], ['cashmere', 'cachemira'], ['terry', 'toalla'], ['sherpa', 'sherpa'], ['faux fur', 'pelo sintético'], ['fur', 'piel'], ['leatherette', 'cuero sintético'], ['pu leather', 'cuero sintético'], ['vegan leather', 'cuero vegano'],
      ['jacquard', 'jacquard'], ['brocade', 'brocado'], ['organza', 'organza'], ['taffeta', 'tafetán'], ['crepe', 'crepé'], ['georgette', 'georgette'], ['poplin', 'popelín'], ['twill', 'sarga'], ['tweed', 'tweed'], ['flannel', 'franela'], ['bamboo', 'bambú'], ['hemp', 'cáñamo'], ['modal', 'modal'], ['lycra', 'licra'],
      ['elastane', 'elastano'], ['neoprene', 'neopreno'], ['silicone', 'silicona'], ['glass', 'vidrio'], ['ceramic', 'cerámica'], ['stainless steel', 'acero inoxidable'], ['titanium', 'titanio'], ['brass', 'latón'], ['zinc alloy', 'aleación de zinc'], ['sterling silver', 'plata de ley'],
      ['gold plated', 'baño de oro'], ['silver plated', 'baño de plata'], ['crystal', 'cristal'], ['diamond', 'diamante']]),
    P('styles', [['letter print', 'con estampado de letras'], ['letters print', 'con estampado de letras'], ['cartoon print', 'con estampado de caricaturas'], ['cartoon bear print', 'con estampado de osito'], ['bear print', 'con estampado de osos'], ['heart print', 'con estampado de corazones'],
      ['star print', 'con estampado de estrellas'], ['flower print', 'con estampado de flores'], ['tropical print', 'con estampado tropical'], ['leaf print', 'con estampado de hojas'], ['butterfly print', 'con estampado de mariposas'], ['logo print', 'con estampado de logo'], ['slogan print', 'con estampado de frase'],
      ['number print', 'con estampado de número'], ['graphic print', 'con estampado gráfico'], ['deep v neck', 'de cuello en V profundo'], ['deep v', 'de escote profundo'], ['lantern sleeve', 'de manga farol'], ['lantern sleeves', 'de manga farol'], ['balloon sleeve', 'de manga globo'], ['balloon sleeves', 'de manga globo'],
      ['pleated waist', 'con cintura plisada'], ['gathered waist', 'con cintura fruncida'], ['gathered back', 'con espalda fruncida'], ['tie waist', 'con cintura anudada'], ['night out', 'para salir de noche'], ['floral print', 'con estampado floral'], ['print', 'con estampado'],
      ['autumn', 'de otoño'], ['fall', 'de otoño'], ['spring', 'de primavera'], ['for ladies', 'para mujer'], ['ladies', 'de mujer'], ['woman', 'de mujer'], ['womans', 'de mujer'], ['lady', 'de mujer'], ['girl', 'de niña'], ['boy', 'de niño']]),
    A('styles', [['minimalist', 'minimalista'], ['minimal', 'minimalista'], ['basic', 'básico'], ['simple', 'sencillo'], ['fashionable', 'a la moda', 'all'], ['stripe', 'rayado'], ['stripes', 'rayado'], ['chic', 'chic', 'all'], ['gathered', 'fruncido'], ['sleek', 'liso'], ['classy', 'fino'], ['trendy', 'de moda', 'all'], ['stylish', 'con estilo', 'all'], ['comfy', 'cómodo'], ['comfortable', 'cómodo'], ['lightweight', 'ligero'], ['soft', 'suave'], ['warm', 'abrigado'], ['thick', 'grueso'], ['thin', 'delgado'], ['cool', 'fresco']]),
    L('more', [['xxs', 'XXS'], ['2xl', '2XL'], ['4xl', '4XL'], ['5xl', '5XL']])
  );
  STARTER.push.apply(STARTER, MORE);
  // nouns that carry a describing word inside need their own plural ("vestidos largos")
  const PE = { 'maxi dress': 'vestidos largos', 'mini dress': 'vestidos cortos', 'midi dress': 'vestidos midi', 'wrap dress': 'vestidos cruzados', 'bodycon dress': 'vestidos ajustados', 'tracksuit': 'conjuntos deportivos' };
  STARTER.forEach((w) => { if (PE[w.en]) w.pe = PE[w.en]; });

  // ---- the Spanish grammar bits --------------------------------------------------------------------------------------------------
  const NUM = { two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis', seven: 'siete', eight: 'ocho', nine: 'nueve', ten: 'diez', eleven: 'once', twelve: 'doce', thirteen: 'trece', fourteen: 'catorce', fifteen: 'quince', sixteen: 'dieciséis', seventeen: 'diecisiete', eighteen: 'dieciocho', nineteen: 'diecinueve', twenty: 'veinte' };
  const NUMV = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  const NOACC = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
  const pluralWord = (w) => { if (!w) return w; if (/[áéíóú]n$/.test(w)) return w.slice(0, -2) + NOACC[w.charAt(w.length - 2)] + 'nes'; if (/z$/.test(w)) return w.slice(0, -1) + 'ces'; if (/[aeiouáéíóú]$/.test(w)) return w + 's'; return w + 'es'; };
  const pluralPhrase = (p) => { const a = String(p).split(' '); a[0] = pluralWord(a[0]); return a.join(' '); };
  const agree = (adj, g, pl) => {
    if (adj.inv === 'all') return adj.es;
    const a = String(adj.es).split(' '); let h = a[0];
    if (g === 'f' && /o$/.test(h)) h = h.slice(0, -1) + 'a';
    if (pl) h = pluralWord(h);
    a[0] = h; return a.join(' ');
  };

  // ---- reading the list --------------------------------------------------------------------------------------------------------
  const cache = new WeakMap();
  const index = (words) => {
    const arr = words || []; if (cache.has(arr)) return cache.get(arr);
    const m = new Map(); let max = 1;
    arr.forEach((w) => { const k = norm(w.en); if (!k || !String(w.es || '').trim()) return; m.set(k, w); max = Math.max(max, k.split(' ').length); });
    const r = { m, max }; cache.set(arr, r); return r;
  };
  const kindOf = (w) => w.t || 'x';

  // English words → pieces: matched words (longest phrase first), plural things, literals, unknown words.
  const pieces = (desc, words) => {
    const toks = String(desc || '').replace(/(\p{L})\s?\/\s?(\p{L})/gu, '$1 and $2').trim().split(/\s+/).filter(Boolean), { m, max } = index(words), out = [], missing = [];
    const tailOf = (tk) => (tk.match(/[^\p{L}\p{N}&]+$/u) || [''])[0];
    for (let i = 0; i < toks.length;) {
      const c0 = norm(clean(toks[i])), c1 = i + 1 < toks.length ? norm(clean(toks[i + 1])) : '';
      // "2 piece", "two piece", "2pc"
      let mm = c0.match(/^(\d+|two|three|four|five|six|seven|eight|nine|ten)\s?(pcs?|pieces?)$/);
      if (mm) { const n = NUM[mm[1]] || mm[1]; out.push({ k: 'p', w: { es: 'de ' + n + ' piezas' }, tail: tailOf(toks[i]) }); i++; continue; }
      mm = c0.match(/^(\d+|two|three|four|five|six|seven|eight|nine|ten)$/);
      if (mm && /^(pcs?|pieces?)$/.test(c1)) { out.push({ k: 'p', w: { es: 'de ' + (NUM[mm[1]] || mm[1]) + ' piezas' }, tail: tailOf(toks[i + 1]) }); i += 2; continue; }
      // a count in front of a thing: "two long track pants", "3 red dresses", "one dress"
      mm = c0.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,2})$/);
      if (mm) { out.push({ k: 'q', n: NUMV[mm[1]] || Number(mm[1]), word: mm[1], raw: clean(toks[i]), tail: tailOf(toks[i]) }); i++; continue; }
      let hit = false;
      for (let n = Math.min(max, toks.length - i); n >= 1 && !hit; n--) {
        const words2 = toks.slice(i, i + n).map(clean), phrase = norm(words2.join(' ')), w = phrase && m.get(phrase), tl = tailOf(toks[i + n - 1]);
        if (w) { out.push({ k: kindOf(w), w, tail: tl }); i += n; hit = true; continue; }
        const last = norm(words2[n - 1]);   // a plural thing ("dresses", "crop tops"): look for the single one
        if (last.length > 2 && /s$/.test(last)) for (const sg of [last.slice(0, -1), last.slice(0, -2), last.slice(0, -3) + 'y']) {
          const w2 = m.get(norm(words2.slice(0, n - 1).concat(sg).join(' ')));
          if (w2 && w2.t === 'n' && !w2.pl) { out.push({ k: 'n', w: w2, plural: true, tail: tl }); i += n; hit = true; break; }
        }
      }
      if (hit) continue;
      const raw = toks[i], c = c0;
      if (!c || !/\p{L}/u.test(c) || /\d/.test(c)) { out.push({ k: 'l', raw: clean(raw) || raw, tail: tailOf(raw) }); i++; continue; }
      if (!missing.includes(c)) missing.push(c);
      out.push({ k: 'u', raw: clean(raw), tail: tailOf(raw) }); i++;
    }
    return { out, missing };
  };

  // The thing first, then "de <material>", phrases like "de manga larga", then what describes it (agreeing), then anything unknown.
  const renderNP = (noun, mods) => {
    const qm = noun ? mods.find((x) => x.k === 'q') : null, many = !!(qm && qm.n !== 1);
    const g = noun ? noun.w.g || 'm' : 'm', pl = noun ? !!(noun.w.pl || noun.plural || many) : false;
    const head0 = noun ? ((noun.plural || many) && !noun.w.pl ? (noun.w.pe || pluralPhrase(noun.w.es)) : noun.w.es) : '';
    const qtext = qm ? (qm.n === 1 && qm.word === 'one' ? (g === 'f' ? 'una' : 'un') : qm.n === 1 ? '1' : NUM[qm.word] || qm.raw) : '';
    const head = [qtext, head0].filter(Boolean).join(' ');
    const groups = { m: [], p: [], a: [], ac: [], r: [] }; let join = null;
    mods.forEach((x) => {
      if (x.k === 'conn') { join = x.es; return; }
      if (x.k === 'q') { if (noun) return; groups.r.push({ text: x.raw, join }); join = null; return; }
      const g2 = x.k === 'a' ? (x.w.c === 'colours' ? 'ac' : 'a') : x.k === 'm' || x.k === 'p' ? x.k : 'r';   // colours come last ("falda mini roja")
      const text = x.k === 'a' ? agree(x.w, g, pl) : x.k === 'm' || x.k === 'p' ? x.w.es : x.raw;
      if ((g2 === 'a' || g2 === 'ac') && groups[g2].some((e) => e.text === text)) { join = null; return; }   // the same word twice ("elegant, classy") is said once
      groups[g2].push({ text, join }); join = null;
    });
    const seq = (list, first) => list.map((e, i) => (i === 0 ? (first || '') + e.text : e.join === ',' ? ', ' + e.text : (e.join ? ' ' + e.join + ' ' : ' ') + e.text)).join('');
    const matStr = groups.m.length ? seq(groups.m, head ? 'de ' : '') : '';
    return [head, matStr, seq(groups.p), seq(groups.a), seq(groups.ac), seq(groups.r)].filter(Boolean).join(' ');
  };

  const translate = (desc, words) => {
    const { out, missing } = pieces(desc, words), parts = []; let mods = [], noun = null, tail = '';
    const flush = () => { if (!noun && !mods.length) return; parts.push(renderNP(noun, mods) + tail); mods = []; noun = null; tail = ''; };
    const isMod = (k) => k === 'a' || k === 'm';
    out.forEach((it, j) => {
      if (it.k === 'n') {
        if (noun) mods.push({ k: 'm', x: 1, es: noun.w.es, w: { es: noun.w.es } });   // "pants set": the first thing describes the second ("conjunto de pantalones")
        noun = it; tail = it.tail;
      } else if (it.k === 'q') {
        mods.push(noun ? { k: 'u', raw: it.raw } : it); tail = it.tail;
      } else if (it.k === 'a' || it.k === 'm' || it.k === 'p' || it.k === 'u' || it.k === 'l') {
        mods.push(it.k === 'u' || it.k === 'l' ? { k: 'u', raw: it.raw !== undefined ? it.raw : it.w.es } : it); tail = it.tail;
        const nx = out[j + 1]; if (isMod(it.k) && /,/.test(it.tail || '') && nx && nx.k === it.k) { mods.push({ k: 'conn', es: ',' }); tail = ''; }
      } else if (it.k === 'c') {
        const prev = out[j - 1], next = out[j + 1];
        if (prev && next && isMod(prev.k) && prev.k === next.k && (it.w.es === 'y' || it.w.es === 'o')) mods.push({ k: 'conn', es: it.w.es });
        else { flush(); parts.push(it.w.es + it.tail); }
      } else { flush(); parts.push(it.w.es + it.tail); }
    });
    flush();
    return { es: cap(parts.join(' ').replace(/\s+([,;.])/g, '$1')), missing };
  };

  // The Spanish name of an item and where it stands: 'none' (no description), 'ok', or 'check' (a word is missing from the library).
  // A name the owner confirmed counts only while the description is still the one it was confirmed for.
  const spanish = (it, words) => {
    const d = String(it.desc || '').trim();
    if (!d) return { es: '', state: 'none', missing: [] };
    if (it.esSet && String(it.nameEs || '').trim() && it.esFor === it.desc) return { es: String(it.nameEs).trim(), state: 'ok', missing: [] };
    const t = translate(d, words);
    return { es: t.es, state: t.missing.length ? 'check' : 'ok', missing: t.missing };
  };
  // What the store may show in Spanish: only names that are in order; otherwise the English name stays.
  const publishable = (it, words) => { const s = spanish(it, words); return s.state === 'ok' ? s.es : ''; };

  // ---- editing the list -----------------------------------------------------------------------------------------------------------
  // The kinds of word the owner can choose (code → fields).
  const TYPES = { nm: { t: 'n', g: 'm' }, nf: { t: 'n', g: 'f' }, npm: { t: 'n', g: 'm', pl: true }, npf: { t: 'n', g: 'f', pl: true }, a: { t: 'a' }, ai: { t: 'a', inv: 'all' }, m: { t: 'm' }, p: { t: 'p' }, c: { t: 'c' }, x: { t: 'x' } };
  const typeOf = (w) => { const t = w.t || 'x'; if (t === 'n') return (w.pl ? 'np' : 'n') + (w.g === 'f' ? 'f' : 'm'); if (t === 'a') return w.inv === 'all' ? 'ai' : 'a'; return TYPES[t] ? t : 'x'; };
  const put = (words, en, es, c, type) => {
    const k = norm(en), v = String(es || '').trim(); if (!k || !v) return words;
    const i = words.findIndex((w) => norm(w.en) === k), old = i >= 0 ? words[i] : null;
    const rec = Object.assign({ en: String(en).trim().toLowerCase(), es: v, c: c !== undefined ? c : (old ? old.c : '') }, type && TYPES[type] ? TYPES[type] : (old && old.t ? { t: old.t, g: old.g, pl: old.pl, inv: old.inv } : { t: 'a' }));
    Object.keys(rec).forEach((key) => { if (rec[key] === undefined) delete rec[key]; });
    return i >= 0 ? words.map((w, j) => (j === i ? rec : w)) : words.concat(rec);
  };
  const drop = (words, en) => words.filter((w) => norm(w.en) !== norm(en));
  // The starter list: adds what is missing, and teaches older entries how they behave (thing / describing word …) without changing the
  // owner's Spanish or the groups they put words in.
  const seed = (words) => {
    const out = (words || []).map((w) => Object.assign({}, w));
    STARTER.forEach((s) => {
      const i = out.findIndex((x) => norm(x.en) === norm(s.en));
      if (i < 0) { out.push(Object.assign({}, s)); return; }
      const w = out[i];
      if (!w.t) { ['t', 'g', 'pl', 'inv', 'pe'].forEach((k) => { if (s[k] !== undefined) w[k] = s[k]; }); }
      if (s.pe && !w.pe) w.pe = s.pe;
      if (w.c && w.c !== s.c && ['clothes', 'colours', 'sizes', 'more'].includes(w.c)) w.c = s.c;
    });
    return out;
  };

  // ---- Spanish → English (the English name of an item that was typed or spoken in Spanish) ---------------------------------------------
  // The same list read backwards. Spanish puts the thing first and what describes it after; English puts the describing words first.
  const fold = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const enPlural = (w) => { const a = String(w).split(' '), l = a[a.length - 1]; a[a.length - 1] = /(s|x|z|ch|sh)$/i.test(l) ? l + 'es' : /[^aeiou]y$/i.test(l) ? l.slice(0, -1) + 'ies' : l + 's'; return a.join(' '); };
  const NUMEN = {}; Object.keys(NUM).forEach((k) => { NUMEN[fold(NUM[k])] = k; });
  const revCache = new WeakMap();
  const reverse = (words) => {
    const arr = words || []; if (revCache.has(arr)) return revCache.get(arr);
    const m = new Map(); let max = 1;
    const add = (form, rec) => { const k = fold(form); if (!k) return; if (!m.has(k)) m.set(k, rec); max = Math.max(max, k.split(' ').length); };
    arr.forEach((x) => {
      const es = String(x.es || '').trim(), en = String(x.en || '').trim(); if (!es || !en || ['de', 'y', 'o'].includes(fold(es))) return; const kind = kindOf(x);   // "de", "y", "o" are handled by the rules below
      if (kind === 'n') { add(es, { w: x, kind: 'n', pl: false }); if (!x.pl) add(x.pe || pluralPhrase(es), { w: x, kind: 'n', pl: true }); }
      else if (kind === 'a') { add(es, { w: x, kind: 'a' }); if (x.inv !== 'all') [['m', true], ['f', false], ['f', true]].forEach(([g, pl]) => add(agree(x, g, pl), { w: x, kind: 'a' })); }
      else add(es, { w: x, kind });
    });
    const r = { m, max }; revCache.set(arr, r); return r;
  };
  const toEnglish = (desc, words) => {
    const toks = String(desc || '').trim().split(/\s+/).filter(Boolean), { m, max } = reverse(words), out = [], missing = [];
    const tailOf = (tk) => (tk.match(/[^\p{L}\p{N}&]+$/u) || [''])[0];
    for (let i = 0; i < toks.length;) {
      const c0 = fold(clean(toks[i])); let hit = false;
      if (/^\d+$/.test(c0)) { out.push({ k: 'q', text: c0, tail: tailOf(toks[i]) }); i++; continue; }
      if (NUMEN[c0]) { out.push({ k: 'q', text: NUMEN[c0], tail: tailOf(toks[i]) }); i++; continue; }
      if (c0 === 'un' || c0 === 'una') { out.push({ k: 'q', text: 'one', tail: tailOf(toks[i]) }); i++; continue; }
      // "de 2 piezas" / "de dos piezas" → "2 piece"; "talla M" → "size M" (after the thing); a lone size (XL, M …) also goes after the thing
      const pz = (j) => { const c = fold(clean(toks[j] || '')), nx = fold(clean(toks[j + 1] || '')); return /^(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/.test(c) && /^piezas?$/.test(nx) ? (/^\d+$/.test(c) ? c : NUMEN[c]) : null; };
      let pn = c0 === 'de' ? pz(i + 1) : pz(i), pskip = c0 === 'de' ? 3 : 2;
      if (pn) { out.push({ k: 'p2', text: pn + ' piece', tail: tailOf(toks[i + pskip - 1]) }); i += pskip; continue; }
      if (c0 === 'talla' && i + 1 < toks.length) { const sz = clean(toks[i + 1]); out.push({ k: 'post', text: 'size ' + (sz.length <= 4 ? sz.toUpperCase() : sz), tail: tailOf(toks[i + 1]) }); i += 2; continue; }
      if (/^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl)$/.test(c0)) { out.push({ k: 'post', text: clean(toks[i]).toUpperCase(), tail: tailOf(toks[i]) }); i++; continue; }
      for (let n = Math.min(max, toks.length - i); n >= 1 && !hit; n--) {
        const ph = fold(toks.slice(i, i + n).map(clean).join(' ')), rec = ph && m.get(ph);
        if (rec) { out.push(Object.assign({ tail: tailOf(toks[i + n - 1]) }, rec)); i += n; hit = true; }
      }
      if (hit) continue;
      if (c0 === 'de' && i + 1 < toks.length) {   // "de lino" (a material) or "de pantalones" (a thing that describes the thing)
        const rec = m.get(fold(clean(toks[i + 1])));
        if (rec && (rec.kind === 'm' || rec.kind === 'n' || rec.kind === 'a')) { out.push(Object.assign({ via: 'de', tail: tailOf(toks[i + 1]) }, rec)); i += 2; continue; }
      }
      if (c0 === 'y' || c0 === 'o') { out.push({ k: 'c', text: c0 === 'y' ? 'and' : 'or', tail: tailOf(toks[i]) }); i++; continue; }
      if (!c0 || !/\p{L}/u.test(c0) || /\d/.test(c0)) { out.push({ k: 'l', text: clean(toks[i]) || toks[i], tail: tailOf(toks[i]) }); i++; continue; }
      if (!missing.includes(c0)) missing.push(c0);
      out.push({ k: 'u', text: clean(toks[i]), tail: tailOf(toks[i]) }); i++;
    }
    // group into things: [count] describing words … the thing
    const parts = []; let np = null;
    const fresh = () => ({ q: '', a: [], ac: [], m: [], nm: [], p: [], r: [], post: [], head: null, tail: '' });
    const flush = () => {
      if (!np) return; const g = np; np = null;
      const nounText = g.head ? (g.head.pl && !g.head.w.pl ? enPlural(g.head.w.en) : g.head.w.en) : '';
      const seq = [g.q, ...g.ac, ...g.a, ...g.m, ...g.nm, ...g.p, ...g.r, nounText].filter(Boolean).join(' ');   // English order: the colour, then the style, the material, what it is made like, the thing
      if (seq) parts.push([seq, ...g.post].join(' ') + g.tail);
    };
    out.forEach((it, j) => {
      if (!np) np = fresh();
      if (it.k === 'q') { np.q = it.text; return; }
      if (it.k === 'c') {
        const prev = out[j - 1], next = out[j + 1];
        if (prev && next && prev.kind === 'a' && next.kind === 'a') { np[prev.w.c === 'colours' ? 'ac' : 'a'].push('and'); return; }   // "azul y rojo" → "blue and red"
        flush(); parts.push(it.text); return;
      }
      if (it.k === 'p2') { np.p.push(it.text); np.tail = it.tail; return; }
      if (it.k === 'post') { np.post.push(it.text); np.tail = it.tail; return; }
      if (it.k === 'l' || it.k === 'u') { np.r.push(it.text); np.tail = it.tail; return; }
      if (it.kind === 'n') {
        if (it.via === 'de' && np.head) { np.nm.push(it.pl && !it.w.pl ? enPlural(it.w.en) : it.w.en); np.tail = it.tail; return; }
        if (np.head) { flush(); np = fresh(); }
        np.head = it; np.tail = it.tail; return;
      }
      if (it.kind === 'a') { np[it.w.c === 'colours' ? 'ac' : 'a'].push(it.w.en); np.tail = it.tail; return; }
      if (it.kind === 'm') { np.m.push(it.w.en); np.tail = it.tail; return; }
      if (it.kind === 'p') { np.p.push(it.w.en); np.tail = it.tail; return; }
      np.r.push(it.w.en); np.tail = it.tail;
    });
    flush();
    return { en: cap(parts.join(' ').replace(/\s+([,;.])/g, '$1')), missing };
  };
  // The English name of an item written in Spanish: the confirmed one, or the library's best reading of the Spanish name.
  const english = (it, words) => {
    const es = spanish(it, words).es;
    if (!es) return { en: '', state: 'none', missing: [] };
    if (it.enSet && String(it.desc || '').trim() && it.enFor === es) return { en: String(it.desc).trim(), state: 'ok', missing: [] };
    const r = toEnglish(es, words);
    return { en: r.en, state: r.missing.length ? 'check' : 'ok', missing: r.missing };
  };

  const api = { norm, STARTER, TYPES, typeOf, translate, spanish, publishable, put, drop, seed, toEnglish, english };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Words = api;
})(typeof window !== 'undefined' ? window : globalThis);
