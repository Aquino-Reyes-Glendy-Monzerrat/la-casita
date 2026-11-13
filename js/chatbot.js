/* ==========================================
   CHATBOT "CASI" DE LA CASITA
   Chatbot basado en reglas: palabras clave + búsqueda en el catálogo.
   Usa CATEGORIES y PRODUCTS (js/productos.js) y window.CASITA (js/app.js).
   Se carga DESPUÉS de app.js.
   ========================================== */
(function(){
  'use strict';

  /* =========================================================
     ✏️ INFORMACIÓN DEL NEGOCIO — edita aquí los textos
     ========================================================= */
  var INFO = {
    botName:   'Casi',
    horario:   'Abrimos <b>todos los días</b> y cerramos <b>hasta las 12 a. m. – 1 a. m.</b> 🌙',
    direccion: 'Calle Aruba, Tec. Tuxtla Gutiérrez, Col. Bicentenario, 77086 Chetumal, Q. R.',
    mapsUrl:   'https://www.google.com/maps/search/?api=1&query=MiniAbarrotes+La+Casita+Calle+Aruba+Bicentenario+Chetumal',
    pagos:     'Aceptamos <b>efectivo</b>, <b>transferencia</b> y <b>tarjeta</b> 💳',
    envio:     'Sí hacemos <b>entregas a domicilio</b> en la <b>Col. y Fracc. Bicentenario</b>. El envío cuesta <b>$15</b> 🛵',
    gaming:    'En nuestra <b>Zona Gaming</b> tenemos <b>Xbox 360</b>, maquinita de arcade (<b>KOF</b>) y tragamonedas 🎮',
    telefono:  '983 112 1228',
    waNumber:  '529831121228',
        facebook:  'https://www.facebook.com/p/La-Casita-Snacks-Abarrotes-y-Gaming-61594101971939/',
    promos:    ''   // PENDIENTE: escribe aquí las promos/combos. Si está vacío, el bot dice que no hay.
  };

  if(typeof PRODUCTS === 'undefined' || typeof CATEGORIES === 'undefined') return;

  /* ---------------- Mascota (casita con cara) ---------------- */
  var MASCOT =
    '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<path d="M8 30 L32 9 L56 30 Z" fill="#a52cff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="44" y="12" width="6" height="12" rx="1.5" fill="#fff"/>' +
      '<rect x="14" y="28" width="36" height="28" rx="5" fill="#fff"/>' +
      '<circle cx="25" cy="38" r="3.2" fill="#2a1a38"/><circle cx="39" cy="38" r="3.2" fill="#2a1a38"/>' +
      '<circle cx="26" cy="37" r="1" fill="#fff"/><circle cx="40" cy="37" r="1" fill="#fff"/>' +
      '<circle cx="20" cy="45" r="2.6" fill="#ff72bd" opacity=".7"/><circle cx="44" cy="45" r="2.6" fill="#ff72bd" opacity=".7"/>' +
      '<path d="M26 45 Q32 51 38 45" fill="none" stroke="#2a1a38" stroke-width="2.6" stroke-linecap="round"/>' +
    '</svg>';

  /* ---------------- Utilidades ---------------- */
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(n){ n = Math.round(n * 100) / 100; return '$' + n.toLocaleString('es-MX'); }
  function norm(s){
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d)\.(\d)/g, '$1p$2')                         // 2.5 → 2p5
      .replace(/(\d)\s*(litros?|lts?|l)\b/g, '$1l')            // 3 litros → 3l
      .replace(/(\d)\s*(mililitros|ml)\b/g, '$1ml')            // 600 ml → 600ml
      .replace(/(\d)\s*(gramos|grs?|g)\b/g, '$1g')             // 80 gr → 80g
      .replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function words(s){ return norm(s).split(' ').filter(Boolean); }
  function lev(a, b){
    if(Math.abs(a.length - b.length) > 2) return 99;
    var prev = [], cur, i, j;
    for(j = 0; j <= b.length; j++) prev[j] = j;
    for(i = 1; i <= a.length; i++){
      cur = [i];
      for(j = 1; j <= b.length; j++){
        cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  function waLink(text){ return 'https://wa.me/' + INFO.waNumber + '?text=' + encodeURIComponent(text); }
  function cartApi(){ return window.CASITA || null; }

  /* ---------------- Intenciones (palabras clave) ----------------
     El orden importa: la primera que coincide gana.
     Cada palabra coincide si alguna palabra del mensaje EMPIEZA con ella. */
  var INTENTS = [
    { id:'gaming',    kw:['xbox','videojueg','juego','jugar','maquinita','arcade','kof','tragamoneda','gamer','gaming','consola','control'] },
    { id:'envio',     kw:['envio','envian','domicilio','entreg','llevan','mandan','delivery','reparto','repartidor'] },
    { id:'pagos',     kw:['pago','pagar','pagas','tarjeta','transferencia','transfer','efectivo','aceptan','deposito'] },
    { id:'ubicacion', kw:['donde','ubicacion','ubicados','ubican','direccion','llegar','mapa','maps','calle'] },
    { id:'horario',   kw:['hora','horario','abren','abierto','abiertos','cierran','cerrado','cierra','abre'] },
    { id:'promos',    kw:['promo','oferta','descuento','combo','rebaja'] },
    { id:'contacto',  kw:['telefono','numero','whats','wasa','contacto','llamar','celular','persona','humano','asesor','facebook','face','redes','pagina'] },
        { id:'carrito',   kw:['carrito','pedido','pedir','ordenar','comprar','orden'] },
    { id:'categorias',kw:['categoria','catalogo','venden','productos','menu'] },
    { id:'gracias',   kw:['gracias','grax','thanks','graci'] },
    { id:'saludo',    kw:['hola','ola','buenas','buenos','hey','holi','saludos','qhubo','quiubo','ayuda','opcion','inicio'] }
  ];

  /* Palabras que se ignoran al buscar productos */
  var STOP = ('tienen tiene tienes hay venden vende precio precios cuanto cuesta cuestan vale valen sale salen de del la el los las ' +
    'un una unos unas quiero quisiera me das dame busco buscando algo que y o con sin sabor por favor porfa a en para mas si no ' +
    'tambien ustedes tu su sus mi es son esta estan hola oye bueno pues porfavor deme manda mandame hacer hago ver').split(' ');

  /* Sinónimos / errores comunes → palabra del catálogo o categoría */
  var SYN = {
    tackis:'takis', takys:'takis', taquis:'takis', cocacola:'coca', cocas:'coca', koka:'coca',
    sabritas:'@botanas', papitas:'papas', frituras:'@botanas', botana:'@botanas',
    refresco:'@bebidas', refrescos:'@bebidas', chesco:'@bebidas', chescos:'@bebidas', bebida:'@bebidas', jugos:'@bebidas',
    galleta:'@galletas', galletitas:'@galletas', dulce:'@dulces', golosinas:'@dulces',
    chocolate:'@chocolates', chocolates:'@chocolates', sopita:'@sopas', sopas:'@sopas',
    energizante:'@energetizantes', energeticas:'@energetizantes', energetica:'@energetizantes', energizantes:'@energetizantes',
    snack:'@snacks', snacks:'@snacks', preparados:'@snacks', antojitos:'@snacks', comida:'@snacks',
    limpieza:'@limpieza', jabon:'@limpieza', mascota:'@mascotas', mascotas:'@mascotas', perro:'@mascotas', gato:'@mascotas',
    abarrotes:'@abarrotes', abarrote:'@abarrotes', despensa:'@abarrotes',
    bebidas:'@bebidas', galletas:'@galletas', dulces:'@dulces', botanas:'@botanas'
  };

  /* Índice del catálogo (se calcula una vez) */
  var INDEX = PRODUCTS.map(function(p){ return { p:p, w:words(p.name) }; });

  function detectIntent(ws){
    var found = [];
    for(var i = 0; i < INTENTS.length; i++){
      var it = INTENTS[i], hit = false;
      for(var k = 0; k < it.kw.length && !hit; k++){
        for(var w = 0; w < ws.length; w++){
          if(ws[w].indexOf(it.kw[k]) === 0){ hit = true; break; }
        }
      }
      if(hit) found.push(it.id);
    }
    return found;
  }

  /* Qué tan bien coincide una palabra: 3 exacta, 2 empieza igual, 1 parecida (error de dedo), 0 nada */
  function tokenScore(q, t){
    if(t === q) return 3;
    if((q.length >= 3 || /\d/.test(q)) && t.indexOf(q) === 0) return 2;
    if(q.length >= 4 && lev(q, t) <= 1) return 1;
    if(q.length >= 7 && lev(q, t) <= 2) return 1;
    return 0;
  }

  /* Devuelve {list:[...]} con productos, o {cat:'id'} si pidió una categoría */
  function searchProducts(ws){
    var q = [], cat = null;
    for(var i = 0; i < ws.length; i++){
      var w = ws[i];
      if(STOP.indexOf(w) !== -1) continue;
      if(SYN[w]){
        if(SYN[w].charAt(0) === '@'){ cat = cat || SYN[w].slice(1); continue; }
        w = SYN[w];
      }
      if(w.length >= 3 || /\d/.test(w)) q.push(w);
    }

    var best = 0, res = [];
    if(q.length){
      INDEX.forEach(function(e){
        var score = 0;
        q.forEach(function(qw){
          var top = 0;
          for(var j = 0; j < e.w.length; j++) top = Math.max(top, tokenScore(qw, e.w[j]));
          score += top;
        });
        if(score > 0){
          if(score > best){ best = score; res = []; }
          if(score === best) res.push(e.p);
        }
      });
    }
    // "galletas oreo": si encontró el producto lo muestra; si no, muestra la categoría
    if(res.length) return { list: res, terms: q };
    if(cat) return { cat: cat };
    return { list: [], terms: q };
  }

  function catById(id){ for(var i = 0; i < CATEGORIES.length; i++) if(CATEGORIES[i].id === id) return CATEGORIES[i]; return null; }
  function prodsOfCat(id){ return PRODUCTS.filter(function(p){ return p.cat === id; }); }

  /* ---------------- Interfaz ---------------- */
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'casi-fab';
  fab.setAttribute('aria-label', 'Abrir chat con ' + INFO.botName);
  fab.innerHTML = MASCOT;

  var hint = document.createElement('div');
  hint.className = 'casi-hint';
  hint.textContent = '¿Te ayudo a buscar algo? 🏠';

  var panel = document.createElement('section');
  panel.className = 'casi-panel';
  panel.setAttribute('aria-label', 'Chat con ' + INFO.botName);
  panel.innerHTML =
    '<div class="casi-head">' +
      '<div class="casi-avatar">' + MASCOT + '</div>' +
      '<div class="casi-title"><strong>' + esc(INFO.botName) + ' · La Casita</strong><span>● En línea</span></div>' +
      '<button type="button" class="casi-close" aria-label="Cerrar chat">✕</button>' +
    '</div>' +
    '<div class="casi-body" id="casi-body"></div>' +
    '<form class="casi-input" autocomplete="off">' +
      '<input type="text" placeholder="Escribe un producto o pregunta…" aria-label="Mensaje">' +
      '<button type="submit" aria-label="Enviar">➤</button>' +
    '</form>';

  document.body.appendChild(fab);
  document.body.appendChild(hint);
  document.body.appendChild(panel);

  var body  = panel.querySelector('#casi-body');
  var form  = panel.querySelector('.casi-input');
  var input = form.querySelector('input');
  var started = false;

  function scrollDown(){ body.scrollTop = body.scrollHeight; }

  function addMsg(html, who){
    var d = document.createElement('div');
    d.className = 'casi-msg ' + (who || 'bot');
    d.innerHTML = html;
    body.appendChild(d);
    scrollDown();
    return d;
  }

  /* chips: [{label, action, wa?}] */
  function addChips(chips){
    var wrap = document.createElement('div');
    wrap.className = 'casi-chips';
    chips.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'casi-chip' + (c.wa ? ' wa' : '');
      b.textContent = c.label;
      b.addEventListener('click', function(){ c.action(c); });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  function addProducts(list){
    var wrap = document.createElement('div');
    wrap.className = 'casi-prods';
    list.forEach(function(p){
      var row = document.createElement('div');
      row.className = 'casi-prod';
      row.innerHTML =
        '<img src="' + esc(p.img) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="casi-prod-info"><div class="casi-prod-name" title="' + esc(p.name) + '">' + esc(p.name) + '</div>' +
        '<div class="casi-prod-price">' + money(p.price) + '</div></div>' +
        '<button type="button" class="casi-add">+ Agregar</button>';
      row.querySelector('.casi-add').addEventListener('click', function(){ onAdd(p, this); });
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  /* Respuesta del bot con "escribiendo…" */
  function botSay(fn){
    var t = document.createElement('div');
    t.className = 'casi-msg bot casi-typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(t);
    scrollDown();
    setTimeout(function(){ t.remove(); fn(); }, 450);
  }

  /* ---------------- Acciones ---------------- */
  function say(text){ addMsg(esc(text), 'me'); }

  function goWhatsApp(text){ window.open(waLink(text || 'Hola La Casita, tengo una pregunta'), '_blank', 'noopener'); }

  function goCatalog(catId){
    location.hash = '#/catalogo' + (catId ? '/' + catId : '');
    if(window.innerWidth <= 640) closeChat();
  }

  function goGaming(){
    location.hash = '#/inicio';
    setTimeout(function(){
      var el = document.getElementById('cas-gaming-gallery');
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 350);
    if(window.innerWidth <= 640) closeChat();
  }

  function cartSummary(){
    var api = cartApi();
    if(!api) return null;
    var t = api.totals();
    return t.qty ? 'Llevas <b>' + t.qty + '</b> producto' + (t.qty > 1 ? 's' : '') + ' · <b>' + money(t.sum) + '</b>' : null;
  }

  function orderChips(){
    return [
      { label:'Pedir por WhatsApp', wa:true, action:function(){ sendOrder(); } },
      { label:'Ver carrito 🛒', action:function(){ var api = cartApi(); closeChat(); if(api) api.openCart(); } },
      { label:'Seguir comprando', action:function(){ handle('Buscar producto', true); } }
    ];
  }

  function sendOrder(){
    var api = cartApi();
    if(api && api.totals().qty){ window.open(api.checkoutUrl(), '_blank', 'noopener'); }
    else goWhatsApp('Hola La Casita 👋 quiero hacer un pedido');
  }

  function onAdd(p, btn){
    var api = cartApi();
    if(!api || !api.addById(p.id)){ goWhatsApp('Hola, quiero pedir: ' + p.name); return; }
    btn.classList.add('done');
    btn.textContent = '✓ Listo';
    setTimeout(function(){ btn.classList.remove('done'); btn.textContent = '+ Agregar'; }, 1200);
    botSay(function(){
      addMsg('Agregué <b>' + esc(p.name) + '</b> a tu carrito ✅<br>' + (cartSummary() || ''));
      addChips(orderChips());
    });
  }

  function mainChips(){
    return [
      { label:'🔎 Buscar producto', action:function(c){ handle(c.label, false, 'buscar'); } },
      { label:'📂 Ver categorías', action:function(c){ handle(c.label, false, 'categorias'); } },
      { label:'🎮 Zona gaming', action:function(c){ handle(c.label, false, 'gaming'); } },
      { label:'🕛 Horario y ubicación', action:function(c){ handle(c.label, false, 'horario_ubicacion'); } },
      { label:'🛵 Envíos y pagos', action:function(c){ handle(c.label, false, 'envio_pagos'); } }
    ];
  }

  function showCategory(id){
    var c = catById(id);
    if(!c){ fallback(); return; }
    var list = prodsOfCat(id);
    addMsg(c.emoji + ' <b>' + esc(c.name) + '</b>: tenemos ' + list.length + ' productos. Aquí algunos:');
    addProducts(list.slice(0, 5));
    addChips([{ label:'Ver todos en el catálogo', action:function(){ goCatalog(id); } }]);
  }

  /* ---------------- Respuestas ---------------- */
  var REPLIES = {
    saludo: function(){
      addMsg('¡Hola! Soy <b>' + esc(INFO.botName) + '</b> 🏠, el asistente de La Casita. Te ayudo a buscar productos y precios, y te digo horario, ubicación y cómo hacer tu pedido. ¿Qué se te antoja?');
      addChips(mainChips());
    },
    buscar: function(){
      addMsg('Escríbeme el nombre del producto. Por ejemplo: <i>takis</i>, <i>coca</i>, <i>galletas</i> o <i>sopa</i> 👇');
      input.focus();
    },
    categorias: function(){
      addMsg('Estas son nuestras categorías:');
      addChips(CATEGORIES.map(function(c){
        return { label: c.emoji + ' ' + c.name, action:function(){ say(c.name); botSay(function(){ c.id === 'gaming' ? REPLIES.gaming() : showCategory(c.id); }); } };
      }));
    },
    horario: function(){
      addMsg(INFO.horario);
    },
    ubicacion: function(){
      addMsg('📍 Estamos en ' + esc(INFO.direccion));
      addChips([{ label:'Abrir en Google Maps', action:function(){ window.open(INFO.mapsUrl, '_blank', 'noopener'); } }]);
    },
    horario_ubicacion: function(){
      addMsg(INFO.horario);
      REPLIES.ubicacion();
    },
    pagos: function(){
      addMsg(INFO.pagos);
    },
    envio: function(){
      addMsg(INFO.envio + '<br>Arma tu pedido en el carrito y mándalo por WhatsApp.');
      addChips([{ label:'🔎 Buscar producto', action:function(c){ handle(c.label, false, 'buscar'); } },
                { label:'Pedir por WhatsApp', wa:true, action:function(){ sendOrder(); } }]);
    },
    envio_pagos: function(){
      addMsg(INFO.envio);
      addMsg(INFO.pagos);
    },
    gaming: function(){
      addMsg(INFO.gaming + '<br>Precios de renta:');
      addProducts(prodsOfCat('gaming'));
      addChips([{ label:'Ver Zona Gaming', action:goGaming }]);
    },
    promos: function(){
      if(INFO.promos) addMsg(INFO.promos);
      else {
        addMsg('Por ahora no tenemos promociones activas 😉. Pregúntanos por WhatsApp, a veces hay sorpresas.');
        addChips([{ label:'Preguntar por WhatsApp', wa:true, action:function(){ goWhatsApp('Hola, ¿tienen alguna promoción?'); } }]);
      }
    },
    contacto: function(){
      addMsg('Nuestro WhatsApp es <b>' + esc(INFO.telefono) + '</b>, ahí te atiende una persona 🙋. También estamos en Facebook como <b>La Casita · Snacks, Abarrotes y Gaming</b>.');
      addChips([{ label:'Abrir WhatsApp', wa:true, action:function(){ goWhatsApp(); } },
                { label:'👍 Ver Facebook', action:function(){ window.open(INFO.facebook, '_blank', 'noopener'); } }]);
    },
    carrito: function(){
      var s = cartSummary();
      if(s){ addMsg('Tu carrito: ' + s); addChips(orderChips()); }
      else { addMsg('Tu carrito está vacío. ¿Te busco algo? Escribe el nombre de un producto 👇'); input.focus(); }
    },
    gracias: function(){
      addMsg('¡De nada! Aquí ando si necesitas algo más 🙌');
    }
  };

  /* Cuando no entiende: lo dice y ofrece pasar a una persona por WhatsApp con su pregunta */
  function fallback(original){
    addMsg('Mmm, no encontré eso en el catálogo ni sé responderlo todavía 🤔. Puedo ayudarte con <b>productos y precios</b>, <b>horario</b>, <b>ubicación</b>, <b>envíos</b> y <b>pagos</b>. ¿O prefieres preguntarle a una persona?');
    addChips([
      { label:'Preguntar por WhatsApp', wa:true, action:function(){ goWhatsApp(original ? 'Hola La Casita, ' + original : null); } },
      { label:'Ver opciones', action:function(c){ handle(c.label, false, 'saludo'); } }
    ]);
  }

  /* ---------------- Cerebro ---------------- */
  function answer(text){
    var ws = words(text);
    if(!ws.length){ fallback(); return; }

    var intents = detectIntent(ws);
    // "hola, ¿tienen takis?" → ignora el saludo si hay algo más
    var content = intents.filter(function(i){ return i !== 'saludo' && i !== 'gracias'; });

    if(content.length){
      // Si pregunta horario y ubicación juntos, responde ambos
      if(content.indexOf('horario') !== -1 && content.indexOf('ubicacion') !== -1){ REPLIES.horario_ubicacion(); return; }
      if(content.indexOf('envio') !== -1 && content.indexOf('pagos') !== -1){ REPLIES.envio_pagos(); return; }
      // "carrito"/"categorias" son genéricos: si además nombra un producto, busca el producto
      if(content[0] === 'carrito' || content[0] === 'categorias'){
        var r0 = searchProducts(ws);
        if(r0.cat){ showCategory(r0.cat); return; }
        if(r0.list && r0.list.length){ showResults(r0); return; }
      }
      REPLIES[content[0]]();
      return;
    }

    var r = searchProducts(ws);
    if(r.cat){ r.cat === 'gaming' ? REPLIES.gaming() : showCategory(r.cat); return; }
    if(r.list.length){ showResults(r); return; }

    if(intents.indexOf('saludo') !== -1){ REPLIES.saludo(); return; }
    if(intents.indexOf('gracias') !== -1){ REPLIES.gracias(); return; }

    fallback(text);
  }

  function showResults(r){
    var list = r.list, MAX = 5;
    addMsg(list.length === 1 ? '¡Sí lo tenemos! 🙌' : 'Encontré <b>' + list.length + '</b> producto' + (list.length > 1 ? 's' : '') + (list.length > MAX ? ', te muestro los primeros ' + MAX : '') + ':');
    addProducts(list.slice(0, MAX));
    if(list.length > MAX){
      addChips([{ label:'Ver en el catálogo', action:function(){ goCatalog(list[0].cat); } }]);
    }
  }

  /* text: lo que se muestra como mensaje del usuario
     silent: no mostrar el mensaje del usuario
     forced: id de respuesta directa (para los botones) */
  function handle(text, silent, forced){
    if(!silent) say(text);
    botSay(function(){
      if(forced && REPLIES[forced]) REPLIES[forced]();
      else if(forced === 'buscar' || silent) REPLIES.buscar();
      else answer(text);
    });
  }

  /* ---------------- Abrir / cerrar ---------------- */
  function openChat(){
    panel.classList.add('open');
    document.body.classList.add('casi-open');
    hint.classList.remove('show');
    fab.style.visibility = 'hidden';
    if(!started){
      started = true;
      botSay(REPLIES.saludo);
    }
    setTimeout(function(){ input.focus(); }, 300);
  }
  function closeChat(){
    panel.classList.remove('open');
    document.body.classList.remove('casi-open');
    fab.style.visibility = '';
  }

  fab.addEventListener('click', openChat);
  hint.addEventListener('click', openChat);
  panel.querySelector('.casi-close').addEventListener('click', closeChat);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && panel.classList.contains('open')) closeChat(); });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v = input.value.trim();
    if(!v) return;
    input.value = '';
    handle(v);
  });

  /* Globito de bienvenida (una vez por sesión) */
  var seen = false;
  try { seen = sessionStorage.getItem('casi_hint') === '1'; } catch(e){}
  if(!seen){
    setTimeout(function(){
      if(panel.classList.contains('open')) return;
      hint.classList.add('show');
      try { sessionStorage.setItem('casi_hint', '1'); } catch(e){}
      setTimeout(function(){ hint.classList.remove('show'); }, 6000);
    }, 2500);
  }

})();
