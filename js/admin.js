/* ==========================================================================
   النخبة العقارية | admin.js  —  لوحة الإدارة (Back Office)
   تقرأ نفس بيانات المتصفح (localStorage) وتتيح قبول/رفض العقارات.
   ملاحظة: في نظام إنتاجي حقيقي، يجب أن تكون هذه اللوحة محميّة على خادم
   مع صلاحيات فعلية؛ هنا نموذج تجريبي بكلمة مرور بسيطة على الواجهة.
   ========================================================================== */

const ADMIN_PASS = 'admin123'; // للتجربة فقط — غيّرها في الإنتاج واحمِها بخادم.

const K = {
  users: 'nukhba_users', props: 'nukhba_properties',
  contacts: 'nukhba_contacts', consult: 'nukhba_consultations',
  adminSession: 'nukhba_admin_session',
};
const g = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const s = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];

function toast(msg, type = 'info') {
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
}

const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtPrice = n => Number(n).toLocaleString('en-US');
const fmtDate = ts => new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

/* ---------- Gate ---------- */
function initGate() {
  if (sessionStorage.getItem(K.adminSession) === '1') { showDashboard(); return; }
  $('#gateForm').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#gatePass').value === ADMIN_PASS) {
      sessionStorage.setItem(K.adminSession, '1');
      showDashboard();
      toast('تم تسجيل الدخول للوحة الإدارة', 'success');
    } else {
      toast('كلمة المرور غير صحيحة', 'error');
    }
  });
}
function showDashboard() {
  $('#gate').style.display = 'none';
  $('#dashboard').style.display = 'grid';
  renderAll();
}

/* ---------- Property status change ---------- */
function setStatus(id, status) {
  const props = g(K.props);
  const p = props.find(x => x.id === id);
  if (!p) return;
  p.status = status;
  s(K.props, props);
  renderAll();
  toast(status === 'approved' ? 'تم قبول العقار ونشره في الموقع ✅' : 'تم رفض العقار ❌', status === 'approved' ? 'success' : 'error');
}
function deleteProp(id) {
  if (!confirm('هل أنت متأكد من حذف هذا العقار نهائيًا؟')) return;
  s(K.props, g(K.props).filter(p => p.id !== id));
  renderAll();
  toast('تم حذف العقار', 'info');
}
window._admin = { setStatus, deleteProp };

/* ---------- Renderers ---------- */
function statusBadge(st) {
  const map = { pending: ['s-pending', 'قيد المراجعة'], approved: ['s-approved', 'معتمد'], rejected: ['s-rejected', 'مرفوض'] };
  const [cls, label] = map[st] || map.pending;
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function renderReview() {
  const pending = g(K.props).filter(p => p.status === 'pending');
  const grid = $('#reviewGrid');
  if (!pending.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-check"></i>لا توجد عقارات بانتظار المراجعة حاليًا.</div>`;
    return;
  }
  grid.innerHTML = pending.map(p => `
    <div class="prop-review-card">
      <img src="${p.image}" alt="${esc(p.title)}">
      <div class="prc-body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h4>${esc(p.title)}</h4>${statusBadge(p.status)}
        </div>
        <div class="prc-meta">
          <span><i class="fa-solid fa-tag"></i> ${esc(p.type)} — <b class="gold-text">${fmtPrice(p.price)} ر.س</b>${p.area ? ' · ' + esc(p.area) + ' م²' : ''}</span>
          <span><i class="fa-solid fa-location-dot"></i> ${esc(p.city)} — ${esc(p.district)}</span>
          <span><i class="fa-solid fa-user"></i> ${esc(p.ownerName)} · ${esc(p.ownerEmail)}</span>
          ${p.desc ? `<span><i class="fa-solid fa-align-right"></i> ${esc(p.desc)}</span>` : ''}
          <span><i class="fa-solid fa-clock"></i> ${fmtDate(p.createdAt)}</span>
        </div>
        <div class="actions-cell">
          <button class="btn btn-approve btn-sm" onclick="_admin.setStatus('${p.id}','approved')"><i class="fa-solid fa-check"></i> قبول</button>
          <button class="btn btn-danger btn-sm" onclick="_admin.setStatus('${p.id}','rejected')"><i class="fa-solid fa-xmark"></i> رفض</button>
        </div>
      </div>
    </div>`).join('');
}

function renderPropsTable() {
  const props = g(K.props);
  const tb = $('#propsTable');
  if (!props.length) { tb.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-dim)">لا توجد عقارات</td></tr>`; return; }
  tb.innerHTML = props.slice().reverse().map(p => `
    <tr>
      <td><img class="thumb" src="${p.image}" alt=""></td>
      <td>${esc(p.title)}</td>
      <td>${esc(p.type)}</td>
      <td>${esc(p.city)} — ${esc(p.district)}</td>
      <td class="gold-text" style="font-weight:700">${fmtPrice(p.price)} ر.س</td>
      <td>${esc(p.ownerName)}</td>
      <td>${statusBadge(p.status)}</td>
      <td><div class="actions-cell">
        ${p.status !== 'approved' ? `<button class="btn btn-approve btn-sm" onclick="_admin.setStatus('${p.id}','approved')"><i class="fa-solid fa-check"></i></button>` : ''}
        ${p.status !== 'rejected' ? `<button class="btn btn-danger btn-sm" onclick="_admin.setStatus('${p.id}','rejected')"><i class="fa-solid fa-ban"></i></button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="_admin.deleteProp('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}

function renderUsers() {
  const users = g(K.users);
  const tb = $('#usersTable');
  if (!users.length) { tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim)">لا توجد حسابات مسجّلة</td></tr>`; return; }
  tb.innerHTML = users.slice().reverse().map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td dir="ltr" style="text-align:right">${esc(u.email)}</td>
      <td dir="ltr" style="text-align:right">${esc(u.phone)}</td>
      <td><span class="badge-role ${u.isOwner === 'owner' ? 'role-owner' : ''}">${u.isOwner === 'owner' ? 'صاحب عقار' : 'عميل'}</span></td>
      <td>${u.verified ? '<span class="verified-yes"><i class="fa-solid fa-circle-check"></i> موثّق</span>' : '<span class="verified-no"><i class="fa-solid fa-circle-xmark"></i> غير موثّق</span>'}</td>
      <td>${fmtDate(u.createdAt)}</td>
    </tr>`).join('');
}

function renderContacts() {
  const list = g(K.contacts);
  const tb = $('#contactsTable');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim)">لا توجد رسائل</td></tr>`; return; }
  tb.innerHTML = list.slice().reverse().map(c => `
    <tr><td>${esc(c.name)}</td><td dir="ltr" style="text-align:right">${esc(c.email)}</td>
    <td dir="ltr" style="text-align:right">${esc(c.phone) || '—'}</td><td>${esc(c.message)}</td><td>${fmtDate(c.createdAt)}</td></tr>`).join('');
}

function renderConsult() {
  const list = g(K.consult);
  const tb = $('#consultTable');
  if (!list.length) { tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim)">لا توجد طلبات استشارة</td></tr>`; return; }
  tb.innerHTML = list.slice().reverse().map(c => `
    <tr><td>${esc(c.name)}</td><td dir="ltr" style="text-align:right">${esc(c.phone)}</td>
    <td>${esc(c.date) || '—'}</td><td>${esc(c.topic) || '—'}</td><td>${fmtDate(c.createdAt)}</td></tr>`).join('');
}

function renderKPIs() {
  const props = g(K.props), users = g(K.users);
  $('#kPending').textContent = props.filter(p => p.status === 'pending').length;
  $('#kApproved').textContent = props.filter(p => p.status === 'approved').length;
  $('#kUsers').textContent = users.length;
  $('#kOwners').textContent = users.filter(u => u.isOwner === 'owner').length;
  $('#cReview').textContent = props.filter(p => p.status === 'pending').length;
  $('#cProps').textContent = props.length;
  $('#cUsers').textContent = users.length;
  $('#cContacts').textContent = g(K.contacts).length;
  $('#cConsult').textContent = g(K.consult).length;
}

function renderAll() {
  renderKPIs(); renderReview(); renderPropsTable(); renderUsers(); renderContacts(); renderConsult();
}

/* ---------- Nav ---------- */
const VIEW_TITLES = { review: 'مراجعة العقارات', props: 'كل العقارات', users: 'الحسابات المسجّلة', contacts: 'رسائل التواصل', consult: 'طلبات الاستشارات' };
function initNav() {
  $$('#adminNav button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#adminNav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const v = btn.dataset.view;
      $$('.tab-view').forEach(sec => sec.classList.toggle('active', sec.dataset.view === v));
      $('#viewTitle').textContent = VIEW_TITLES[v];
    });
  });
  $('#adminLogout').addEventListener('click', () => { sessionStorage.removeItem(K.adminSession); location.reload(); });
}

document.addEventListener('DOMContentLoaded', () => { initGate(); initNav(); });
