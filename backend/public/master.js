const API_BASE = window.location.origin;
const MASTER_TOKEN_KEY = 'je_master_token';

const loginSection = document.getElementById('masterLoginSection');
const panelSection = document.getElementById('masterPanelSection');
const loginForm = document.getElementById('masterLoginForm');
const loginMessage = document.getElementById('masterLoginMessage');
const storeForm = document.getElementById('masterStoreForm');
const storeMessage = document.getElementById('masterStoreMessage');
const storeList = document.getElementById('masterStoreList');
const logoutBtn = document.getElementById('masterLogoutBtn');

function getToken() {
  return localStorage.getItem(MASTER_TOKEN_KEY) || '';
}

function setToken(token) {
  if (!token) {
    localStorage.removeItem(MASTER_TOKEN_KEY);
    return;
  }
  localStorage.setItem(MASTER_TOKEN_KEY, token);
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function showPanel(isLoggedIn) {
  loginSection.classList.toggle('hidden', isLoggedIn);
  panelSection.classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn) {
    startBillingReportRefresh();
  } else {
    stopBillingReportRefresh();
  }
}

function setupLoginPasswordToggle() {
  const toggle = document.getElementById('toggleMasterLoginPassword');
  const passwordInput = loginForm?.elements?.password;
  if (!toggle || !passwordInput) return;

  const applyToggle = () => {
    passwordInput.type = toggle.checked ? 'text' : 'password';
  };

  toggle.addEventListener('change', applyToggle);
  applyToggle();
}

function clearAllAuthData() {
  localStorage.removeItem('je_master_token');
  localStorage.removeItem('je_admin_token');
  setMessage(loginMessage, 'Cache de autenticação limpo com sucesso.');
  stopBillingReportRefresh();
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

let billingReportRefreshInterval = null;

function startBillingReportRefresh() {
  // Atualiza a cada 5 segundos
  if (billingReportRefreshInterval) clearInterval(billingReportRefreshInterval);
  billingReportRefreshInterval = setInterval(() => {
    loadBillingReport();
  }, 5000);
}

function stopBillingReportRefresh() {
  if (billingReportRefreshInterval) {
    clearInterval(billingReportRefreshInterval);
    billingReportRefreshInterval = null;
  }
}

function setMessage(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? '#b31818' : '#267529';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDueDate(value) {
  const safe = String(value || '').trim();
  if (!safe) return 'Não definido';
  const parsed = new Date(`${safe}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return safe;
  return parsed.toLocaleDateString('pt-BR');
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!/^https?:$/i.test(parsed.protocol)) return '';
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_err) {
    return '';
  }
}

function buildStorePublicUrl(store) {
  const base = normalizeBaseUrl(store?.publicBaseUrl) || API_BASE;
  return `${base}/loja/${store.slug}`;
}

function buildStoreAdminUrl(store) {
  const base = normalizeBaseUrl(store?.publicBaseUrl) || API_BASE;
  return `${base}/admin/${store.slug}`;
}

function buildStoreSystemPublicUrl(store) {
  return `${API_BASE}/loja/${store.slug}`;
}

function buildStoreSystemAdminUrl(store) {
  return `${API_BASE}/admin/${store.slug}`;
}

function safeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function loadStores() {
  const res = await fetch(`${API_BASE}/api/master/stores`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  if (res.status === 401) {
    setToken('');
    showPanel(false);
    setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
    return;
  }

  const data = await res.json();
  const stores = Array.isArray(data.stores) ? data.stores : [];

  if (!stores.length) {
    storeList.innerHTML = '<p>Nenhuma loja criada ainda.</p>';
    return;
  }

  storeList.innerHTML = stores.map((store) => {
    const systemPublicUrl = buildStoreSystemPublicUrl(store);
    const systemAdminUrl = buildStoreSystemAdminUrl(store);
    const isBlocked = store.isBlocked;
    return `
      <article class="admin-item">
        <div class="master-meta">
          <h3>${store.name}${isBlocked ? ' <span style="background: #f8d7da; color: #721c24; padding: 2px 8px; border-radius: 3px; font-size: 12px;">BLOQUEADA</span>' : ''}</h3>
          <p>Slug: ${store.slug}</p>
          <p>Admin: ${store.adminUsername || '-'}</p>
          <p>Mensalidade: <strong>${formatCurrency(store.monthlyFee)}</strong></p>
          <p>Vencimento: <strong>${formatDueDate(store.billingDueDate)}</strong></p>
          <p>Cobrança: ${store.billingNotes || 'Sem observação'}</p>
          <p>WhatsApp cobrança: ${store.billingSupportWhatsapp || 'wa.me/44998840934'}</p>
          <p>Domínio cliente: ${store.publicBaseUrl || 'padrão do sistema'}</p>
          <a class="master-link" target="_blank" rel="noopener noreferrer" href="${systemPublicUrl}">URL sistema (site): ${systemPublicUrl}</a>
          <a class="master-link" target="_blank" rel="noopener noreferrer" href="${systemAdminUrl}">URL sistema (admin): ${systemAdminUrl}</a>
        </div>
        <div class="admin-item-actions">
          <button class="btn-edit" type="button" data-edit-billing="${store.slug}">Editar mensalidade</button>
          <button class="btn-edit" type="button" data-edit-public-base-url="${store.slug}">Editar domínio</button>
          <button class="btn-edit" type="button" data-toggle-block="${store.slug}" style="background: ${isBlocked ? '#d4edda' : '#fff3cd'};">
            ${isBlocked ? '✓ Desbloquear' : '🔒 Bloquear'}
          </button>
          <button class="btn-delete" type="button" data-delete-store="${store.slug}">Apagar loja</button>
        </div>
      </article>
    `;
  }).join('');

  storeList.querySelectorAll('[data-edit-billing]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentStore = stores.find((item) => item.slug === btn.dataset.editBilling);
      if (!currentStore) return;

      const feeInput = window.prompt('Nova mensalidade (apenas números):', String(Math.round(Number(currentStore.monthlyFee) || 0)));
      if (feeInput === null) return;

      const parsedFee = Number(String(feeInput).replace(/[^\d]/g, ''));
      if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
        setMessage(storeMessage, 'Mensalidade inválida. Informe um valor maior que zero.', true);
        return;
      }

      const notesInput = window.prompt('Observação da cobrança:', currentStore.billingNotes || '');
      if (notesInput === null) return;

      const billingWhatsappInput = window.prompt('WhatsApp da cobrança (ex.: wa.me/44998840934):', currentStore.billingSupportWhatsapp || 'wa.me/44998840934');
      if (billingWhatsappInput === null) return;

      const dueInput = window.prompt('Data de vencimento (AAAA-MM-DD):', String(currentStore.billingDueDate || ''));
      if (dueInput === null) return;

      const res = await fetch(`${API_BASE}/api/master/stores/${currentStore.slug}/billing`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthlyFee: parsedFee,
          billingDueDate: dueInput,
          billingNotes: notesInput,
          billingSupportWhatsapp: billingWhatsappInput,
        }),
      });

      if (res.status === 401) {
        setToken('');
        showPanel(false);
        setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(storeMessage, data.error || 'Falha ao atualizar mensalidade.', true);
        return;
      }

      setMessage(storeMessage, `Mensalidade da loja ${currentStore.name} atualizada com sucesso.`);
      loadStores();
      loadBillingReport();
    });
  });

  storeList.querySelectorAll('[data-edit-public-base-url]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentStore = stores.find((item) => item.slug === btn.dataset.editPublicBaseUrl);
      if (!currentStore) return;

      const baseInput = window.prompt(
        'Domínio do cliente (deixe vazio para usar domínio padrão do sistema):',
        currentStore.publicBaseUrl || ''
      );
      if (baseInput === null) return;

      const res = await fetch(`${API_BASE}/api/master/stores/${currentStore.slug}/public-base-url`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicBaseUrl: baseInput,
        }),
      });

      if (res.status === 401) {
        setToken('');
        showPanel(false);
        setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(storeMessage, data.error || 'Falha ao atualizar domínio da loja.', true);
        return;
      }

      setMessage(storeMessage, `Domínio da loja ${currentStore.name} atualizado com sucesso.`);
      loadStores();
    });
  });

  storeList.querySelectorAll('[data-toggle-block]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentStore = stores.find((item) => item.slug === btn.dataset.toggleBlock);
      if (!currentStore) return;

      const isCurrentlyBlocked = currentStore.isBlocked;
      const newBlockedState = !isCurrentlyBlocked;
      const action = newBlockedState ? 'bloquear' : 'desbloquear';
      const confirmMsg = `Tem certeza que quer ${action} a loja "${currentStore.name}"?`;

      if (!window.confirm(confirmMsg)) return;

      const res = await fetch(`${API_BASE}/api/master/stores/${currentStore.slug}/block`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocked: newBlockedState }),
      });

      if (res.status === 401) {
        setToken('');
        showPanel(false);
        setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(storeMessage, data.error || `Falha ao ${action} loja.`, true);
        return;
      }

      setMessage(storeMessage, data.message);
      loadStores();
      loadBillingReport();
    });
  });

  storeList.querySelectorAll('[data-delete-store]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentStore = stores.find((item) => item.slug === btn.dataset.deleteStore);
      if (!currentStore) return;

      const shouldDelete = window.confirm(`Deseja apagar a loja "${currentStore.name}"? Esta ação não pode ser desfeita.`);
      if (!shouldDelete) return;

      const res = await fetch(`${API_BASE}/api/master/stores/${currentStore.slug}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.status === 401) {
        setToken('');
        showPanel(false);
        setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage(storeMessage, data.error || 'Falha ao apagar loja.', true);
        return;
      }

      setMessage(storeMessage, data.message || `Loja ${currentStore.name} apagada com sucesso.`);
      loadStores();
      loadBillingReport();
    });
  });
}

async function loadBillingReport() {
  const billingReport = document.getElementById('billingReport');
  if (!billingReport) return;

  const res = await fetch(`${API_BASE}/api/master/stores`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    billingReport.innerHTML = '<p>Erro ao carregar dados de faturamento.</p>';
    return;
  }

  const data = await res.json();
  const stores = Array.isArray(data.stores) ? data.stores : [];

  // Filtrar lojas que têm mensalidade (excluir loja padrão ou lojas sem configuração)
  const billingStores = stores.filter(
    (s) => s.slug !== 'je-automoveis' && s.monthlyFee && s.monthlyFee > 0
  );

  if (!billingStores.length) {
    billingReport.innerHTML = '<p>Nenhuma loja com faturamento ativo.</p>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalMonthly = 0;
  const reportRows = billingStores.map((store) => {
    const dueDate = store.billingDueDate
      ? new Date(`${store.billingDueDate}T00:00:00`)
      : null;
    
    const monthlyFee = Math.round(Number(store.monthlyFee) || 0);
    totalMonthly += monthlyFee;

    let statusClass = '';
    let statusText = '';
    
    if (dueDate) {
      if (dueDate < today) {
        statusClass = 'overdue';
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        statusText = `Atrasado há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`;
      } else {
        const daysToVencimento = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
        const monthsToVencimento = Math.floor(daysToVencimento / 30);
        if (daysToVencimento <= 7) {
          statusClass = 'warning';
          statusText = `Vence em ${daysToVencimento} dia${daysToVencimento !== 1 ? 's' : ''}`;
        } else if (monthsToVencimento <= 0) {
          statusClass = 'warning';
          statusText = `Vence em ${daysToVencimento} dias`;
        } else {
          statusClass = 'active';
          statusText = `Em dia (${monthsToVencimento} mês${monthsToVencimento !== 1 ? 'es' : ''})`;
        }
      }
    } else {
      statusClass = 'unknown';
      statusText = 'Data não configurada';
    }

    return `
      <tr class="billing-row billing-${statusClass}">
        <td><strong>${store.name}</strong></td>
        <td>${formatCurrency(monthlyFee)}</td>
        <td>${formatDueDate(store.billingDueDate)}</td>
        <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
        <td>${store.billingNotes || '-'}</td>
      </tr>
    `;
  }).join('');

  billingReport.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="billing-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Loja</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Mensalidade</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Vencimento</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Status</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${reportRows}
          <tr style="background: #f9f9f9; border-top: 2px solid #ddd; font-weight: bold;">
            <td style="padding: 12px; border: 1px solid #ddd;">TOTAL MENSAL</td>
            <td style="padding: 12px; text-align: center; border: 1px solid #ddd;" colspan="3">${formatCurrency(totalMonthly)}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">↳ ${billingStores.length} loja${billingStores.length !== 1 ? 's' : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <style>
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }
      .status-badge.status-active { background: #d4edda; color: #155724; }
      .status-badge.status-warning { background: #fff3cd; color: #856404; }
      .status-badge.status-overdue { background: #f8d7da; color: #721c24; }
      .status-badge.status-unknown { background: #e2e3e5; color: #383d41; }
      .billing-table tbody tr:hover { background: #f9f9f9; }
    </style>
  `;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    username: loginForm.elements.username.value,
    password: loginForm.elements.password.value,
  };

  const res = await fetch(`${API_BASE}/api/master/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    setMessage(loginMessage, data.error || 'Falha no login master.', true);
    return;
  }

  setToken(data.token);
  showPanel(true);
  setMessage(loginMessage, 'Login master realizado com sucesso.');
  loadStores();
  loadBillingReport();
});

storeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: storeForm.elements.name.value,
    slug: safeSlug(storeForm.elements.slug.value || storeForm.elements.name.value),
    adminUsername: storeForm.elements.adminUsername.value,
    adminPassword: storeForm.elements.adminPassword.value,
    monthlyFee: storeForm.elements.monthlyFee.value,
    billingDueDate: storeForm.elements.billingDueDate.value,
    billingNotes: storeForm.elements.billingNotes.value,
    billingSupportWhatsapp: storeForm.elements.billingSupportWhatsapp.value,
    publicBaseUrl: storeForm.elements.publicBaseUrl.value,
    storePhone: storeForm.elements.storePhone.value,
    storeWhatsapp: storeForm.elements.storeWhatsapp.value,
    storeEmail: storeForm.elements.storeEmail.value,
    storeAddress: storeForm.elements.storeAddress.value,
    aboutText: storeForm.elements.aboutText.value,
  };

  const res = await fetch(`${API_BASE}/api/master/stores`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    setToken('');
    showPanel(false);
    setMessage(loginMessage, 'Sessão master expirada. Faça login novamente.', true);
    return;
  }

  const data = await res.json();
  if (!res.ok) {
    setMessage(storeMessage, data.error || 'Falha ao criar loja.', true);
    return;
  }

  const createdStore = data.store || payload;
  const systemPublicUrl = buildStoreSystemPublicUrl(createdStore);
  const systemAdminUrl = buildStoreSystemAdminUrl(createdStore);

  setMessage(
    storeMessage,
    `Loja criada! Sistema: Site ${systemPublicUrl} | Admin ${systemAdminUrl} | Usuário: ${payload.adminUsername} | Senha: ${payload.adminPassword}`
  );
  storeForm.reset();
  loadStores();
  loadBillingReport();
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/api/master/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch (_err) {
  }

  setToken('');
  showPanel(false);
});

const clearCacheBtn = document.getElementById('clearCacheBtn');
if (clearCacheBtn) {
  clearCacheBtn.addEventListener('click', () => {
    clearAllAuthData();
  });
}

(function init() {
  setupLoginPasswordToggle();
  const hasToken = !!getToken();
  showPanel(hasToken);
  if (hasToken) {
    loadStores();
    loadBillingReport();
  }
})();
