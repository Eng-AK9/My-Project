/* ==========================================================================
   النخبة العقارية | app.js  —  منطق الموقع (تسجيل، تحقق، عقارات)
   البيانات تُحفظ في المتصفح عبر localStorage (نموذج تجريبي بدون خادم).
   ملاحظة: إرسال كود التحقق للإيميل فعليًا يتطلب خادمًا (Backend / بريد SMTP).
   هنا نُحاكي الإرسال ونعرض الكود للتجربة.
   ========================================================================== */

const DB = {
  usersKey: 'nukhba_users',
  propsKey: 'nukhba_properties',
  sessionKey: 'nukhba_session',
  contactsKey: 'nukhba_contacts',
  consultKey: 'nukhba_consultations',
  get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  users() { return this.get(this.usersKey); },
  props() { return this.get(this.propsKey); },
  saveUsers(u) { this.set(this.usersKey, u); },
  saveProps(p) { this.set(this.propsKey, p); },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Toast ---------- */
function toast(msg, type = 'info') {
  const wrap = $('#toastWrap');
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-30px)'; setTimeout(() => el.remove(), 300); }, 3600);
}

/* ---------- Services data (easy to edit) ---------- */
const SERVICES = [
  { i: 'fa-key', t: 'بيع وشراء العقارات', d: 'وساطة عقارية موثوقة لبيع وشراء الفلل والشقق والأراضي بأفضل الأسعار.' },
  { i: 'fa-building-columns', t: 'الاستثمار العقاري', d: 'فرص استثمارية مدروسة بعوائد مجزية في أرقى مناطق جدة والمملكة.' },
  { i: 'fa-handshake', t: 'إدارة الأملاك', d: 'إدارة احترافية لعقاراتك: تأجير، صيانة، وتحصيل بكل شفافية.' },
  { i: 'fa-file-contract', t: 'التقييم والتوثيق', d: 'تقييم عقاري دقيق ومساندة كاملة في إجراءات الإفراغ والتوثيق.' },
  { i: 'fa-drafting-compass', t: 'التطوير العقاري', d: 'دراسات جدوى وتطوير للمشاريع العقارية السكنية والتجارية.' },
  { i: 'fa-comments-dollar', t: 'استشارات 1 إلى 1', d: 'جلسات فردية مباشرة مع مستشار متخصص لاتخاذ أفضل قرار عقاري.' },
];

/* ---------- Session helpers ---------- */
function currentUser() {
  const id = localStorage.getItem(DB.sessionKey);
  return id ? DB.users().find(u => u.id === id) : null;
}
function setSession(id) { localStorage.setItem(DB.sessionKey, id); }
function clearSession() { localStorage.removeItem(DB.sessionKey); }

/* ---------- Render header state ---------- */
function renderHeader() {
  const u = currentUser();
  const chip = $('#userChip'), loginBtn = $('#loginBtn');
  if (u) {
    chip.style.display = 'flex';
    loginBtn.style.display = 'none';
    $('#userAvatar').textContent = (u.name || 'U').trim().charAt(0);
    $('#userName').textContent = u.name;
    $('#userRole').textContent = u.isOwner === 'owner' ? 'صاحب عقار' : 'عميل';
  } else {
    chip.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
  }
}

/* ---------- Stats ---------- */
function renderStats() {
  $('#statProps').textContent = DB.props().filter(p => p.status === 'approved').length;
  $('#statUsers').textContent = DB.users().length;
}

/* ---------- Services render ---------- */
function renderServices() {
  $('#servicesGrid').innerHTML = SERVICES.map((s, idx) => `
    <div class="service-card reveal" style="transition-delay:${idx * 60}ms">
      <div class="ico"><i class="fa-solid ${s.i}"></i></div>
      <h3>${s.t}</h3><p>${s.d}</p>
    </div>`).join('');
  observeReveals();
}

/* ---------- Properties render ---------- */
let currentFilter = 'all';
function fmtPrice(n) { return Number(n).toLocaleString('en-US'); }

function renderProps() {
  const grid = $('#propsGrid');
  let list = DB.props().filter(p => p.status === 'approved');
  if (currentFilter !== 'all') list = list.filter(p => p.type === currentFilter);

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-city"></i>
      لا توجد عقارات معتمدة ضمن هذا التصنيف حتى الآن.<br>كن أول من يضيف عقاره!</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="prop-card reveal">
      <div class="prop-media">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">
        <span class="prop-tag">${p.type}</span>
      </div>
      <div class="prop-body">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="prop-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.city)} — ${escapeHtml(p.district)}</div>
        ${p.desc ? `<p style="color:var(--text-dim);font-size:.9rem">${escapeHtml(p.desc).slice(0, 90)}${p.desc.length > 90 ? '…' : ''}</p>` : ''}
        <div class="prop-foot">
          <div class="prop-price gold-text">${fmtPrice(p.price)} <small>ر.س${p.area ? ' · ' + p.area + ' م²' : ''}</small></div>
          <span class="prop-owner"><i class="fa-solid fa-user"></i> ${escapeHtml(p.ownerName)}</span>
        </div>
      </div>
    </article>`).join('');
  observeReveals();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Modal helpers ---------- */
function openModal(id) { $(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = ''; }

/* ==========================================================================
   AUTH FLOW
   ========================================================================== */
let pendingRegistration = null; // {user, code}

function showAuthTab(tab) {
  $$('#authTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#loginForm').style.display = tab === 'login' ? 'block' : 'none';
  $('#registerForm').style.display = tab === 'register' ? 'block' : 'none';
  $('#otpForm').style.display = 'none';
  $('#authTitle').textContent = tab === 'login' ? 'مرحبًا بعودتك' : 'إنشاء حساب جديد';
  $('#authSub').textContent = tab === 'login' ? 'سجّل الدخول للمتابعة' : 'أنشئ حسابك للبدء بعرض وتصفّح العقارات';
}

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

/* Simulate emailing a verification code. In production, POST to a backend that sends the email. */
function sendVerificationEmail(email, code) {
  console.log(`[محاكاة إرسال بريد] إلى: ${email} — كود التحقق: ${code}`);
  toast(`تم إرسال كود التحقق إلى ${email} (محاكاة)`, 'success');
}

function startOtp() {
  $('#loginForm').style.display = 'none';
  $('#registerForm').style.display = 'none';
  $('#otpForm').style.display = 'block';
  $('#authTitle').textContent = 'توثيق البريد الإلكتروني';
  $('#authSub').textContent = 'أدخل كود التحقق لإتمام التسجيل';
  $('#otpEmail').textContent = pendingRegistration.user.email;
  $('#otpDemo').textContent = pendingRegistration.code;
  $$('#otpInputs input').forEach(i => i.value = '');
  $$('#otpInputs input')[0].focus();
}

function initAuth() {
  $('#loginBtn').addEventListener('click', () => { showAuthTab('login'); openModal('#authModal'); });
  $('#footerLogin').addEventListener('click', e => { e.preventDefault(); showAuthTab('login'); openModal('#authModal'); });
  $$('#authTabs button').forEach(b => b.addEventListener('click', () => showAuthTab(b.dataset.tab)));

  // Owner radio cards
  $$('#ownerCards .radio-card').forEach(card => {
    card.addEventListener('click', () => {
      $$('#ownerCards .radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  });

  // REGISTER
  $('#registerForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim().toLowerCase();
    if (DB.users().some(u => u.email === email)) { toast('هذا البريد مسجّل مسبقًا. سجّل الدخول.', 'error'); showAuthTab('login'); return; }
    const user = {
      id: uid(), name: f.name.value.trim(), email,
      phone: f.phone.value.trim(), password: f.password.value,
      isOwner: f.isOwner.value, verified: false, createdAt: Date.now(),
    };
    const code = genCode();
    pendingRegistration = { user, code };
    sendVerificationEmail(email, code);
    startOtp();
  });

  // OTP inputs auto-advance
  const otpInputs = $$('#otpInputs input');
  otpInputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '');
      if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) otpInputs[i - 1].focus(); });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      d.split('').forEach((ch, k) => { if (otpInputs[k]) otpInputs[k].value = ch; });
      otpInputs[Math.min(d.length, 5)].focus();
    });
  });

  $('#otpResend').addEventListener('click', e => {
    e.preventDefault();
    pendingRegistration.code = genCode();
    $('#otpDemo').textContent = pendingRegistration.code;
    sendVerificationEmail(pendingRegistration.user.email, pendingRegistration.code);
  });

  // OTP verify
  $('#otpForm').addEventListener('submit', e => {
    e.preventDefault();
    const entered = otpInputs.map(i => i.value).join('');
    if (entered.length < 6) { toast('أدخل الأرقام الستة كاملة', 'error'); return; }
    if (entered !== pendingRegistration.code) { toast('كود التحقق غير صحيح، حاول مجددًا', 'error'); return; }
    const user = { ...pendingRegistration.user, verified: true };
    const users = DB.users(); users.push(user); DB.saveUsers(users);
    setSession(user.id);
    pendingRegistration = null;
    closeModal($('#authModal'));
    renderHeader(); renderStats();
    toast(`تم توثيق حسابك بنجاح، أهلاً بك ${user.name} 🎉`, 'success');
  });

  // LOGIN
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    const pass = e.target.password.value;
    const user = DB.users().find(u => u.email === email);
    if (!user || user.password !== pass) { toast('البريد أو كلمة المرور غير صحيحة', 'error'); return; }
    if (!user.verified) { pendingRegistration = { user, code: genCode() }; sendVerificationEmail(email, pendingRegistration.code); startOtp(); return; }
    setSession(user.id);
    closeModal($('#authModal'));
    renderHeader();
    toast(`أهلاً بعودتك ${user.name} 👋`, 'success');
  });

  // Logout
  $('#logoutBtn').addEventListener('click', () => { clearSession(); renderHeader(); toast('تم تسجيل الخروج', 'info'); });
}

/* ==========================================================================
   ADD PROPERTY FLOW
   ========================================================================== */
let propImageData = null;

function requireAuth(action) {
  const u = currentUser();
  if (!u) { toast('يرجى تسجيل الدخول أولاً لإضافة عقار', 'error'); showAuthTab('register'); openModal('#authModal'); return null; }
  return u;
}

function initProperty() {
  const openProp = () => { if (requireAuth()) openModal('#propModal'); };
  $('#addPropBtn').addEventListener('click', openProp);
  $('#heroAddProp').addEventListener('click', openProp);
  $('#footerAddProp').addEventListener('click', e => { e.preventDefault(); openProp(); });

  // Image upload preview
  $('#propImage').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast('حجم الصورة كبير (الحد 3 ميجابايت)', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      propImageData = ev.target.result;
      const prev = $('#propImagePreview');
      prev.querySelector('img').src = propImageData;
      prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // Submit property
  $('#propForm').addEventListener('submit', e => {
    e.preventDefault();
    const u = currentUser();
    if (!u) return;
    if (!propImageData) { toast('يرجى رفع صورة العقار', 'error'); return; }
    const f = e.target;
    const prop = {
      id: uid(), ownerId: u.id, ownerName: u.name, ownerEmail: u.email,
      title: f.title.value.trim(), type: f.type.value,
      city: f.city.value, district: f.district.value.trim(),
      price: f.price.value, area: f.area.value || '',
      desc: f.desc.value.trim(), image: propImageData,
      status: 'pending', createdAt: Date.now(),
    };
    const props = DB.props(); props.push(prop); DB.saveProps(props);
    closeModal($('#propModal'));
    f.reset(); propImageData = null; $('#propImagePreview').style.display = 'none';
    toast('تم إرسال عقارك بنجاح! سيظهر بعد اعتماد الإدارة ✅', 'success');
    renderStats();
  });
}

/* ==========================================================================
   CONTACT + CONSULT FORMS
   ========================================================================== */
function initForms() {
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const list = DB.get(DB.contactsKey);
    list.push({ id: uid(), name: f.name.value, email: f.email.value, phone: f.phone.value, message: f.message.value, createdAt: Date.now() });
    DB.set(DB.contactsKey, list);
    f.reset();
    toast('تم إرسال رسالتك، سنتواصل معك قريبًا 📩', 'success');
  });

  $('#consultForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const list = DB.get(DB.consultKey);
    list.push({ id: uid(), name: f.name.value, phone: f.phone.value, date: f.date.value, topic: f.topic.value, createdAt: Date.now() });
    DB.set(DB.consultKey, list);
    f.reset();
    toast('تم استلام طلب الاستشارة الفردية، سيتواصل معك المستشار 📞', 'success');
  });
}

/* ==========================================================================
   UI: nav, filters, reveals, modal close
   ========================================================================== */
function initUI() {
  $('#year').textContent = new Date().getFullYear();

  // Mobile nav
  $('#navToggle').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));

  // Filters
  $$('#propFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#propFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderProps();
    });
  });

  // Modal close (buttons + overlay click)
  $$('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov); });
    $$('[data-close]', ov).forEach(b => b.addEventListener('click', () => closeModal(ov)));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal-overlay.open').forEach(closeModal); });
}

/* Scroll reveal */
let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.12 });
  }
  $$('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}

/* ---------- Seed sample properties on first visit ---------- */
function seedData() {
  if (localStorage.getItem('nukhba_seeded')) return;
  const samples = [
    { title: 'فيلا فاخرة بحي الشاطئ', type: 'فيلا', city: 'جدة', district: 'حي الشاطئ', price: '4500000', area: '600', desc: 'فيلا حديثة بتشطيبات راقية، 6 غرف، مسبح خاص، وإطلالة على البحر.', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80' },
    { title: 'شقة عصرية بحي الروضة', type: 'شقة', city: 'جدة', district: 'حي الروضة', price: '850000', area: '180', desc: 'شقة تمليك 4 غرف، تشطيب سوبر لوكس، قريبة من الخدمات.', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80' },
    { title: 'أرض تجارية على شارع رئيسي', type: 'أرض', city: 'جدة', district: 'حي المروة', price: '3200000', area: '1000', desc: 'أرض تجارية بموقع استراتيجي على شارع تجاري حيوي.', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' },
    { title: 'مكتب تجاري بموقع مميز', type: 'مكتب', city: 'جدة', district: 'حي الأندلس', price: '1200000', area: '220', desc: 'مكتب في برج تجاري، مؤثث بالكامل، مواقف خاصة.', img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80' },
  ];
  const props = samples.map(s => ({
    id: uid(), ownerId: 'seed', ownerName: 'النخبة العقارية', ownerEmail: 'info@alnukhba-realestate.sa',
    title: s.title, type: s.type, city: s.city, district: s.district, price: s.price, area: s.area,
    desc: s.desc, image: s.img, status: 'approved', createdAt: Date.now(),
  }));
  DB.saveProps(props);
  localStorage.setItem('nukhba_seeded', '1');
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  seedData();
  renderHeader();
  renderStats();
  renderServices();
  renderProps();
  initAuth();
  initProperty();
  initForms();
  initUI();
  observeReveals();
});
