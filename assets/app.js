const APP = {
  state: {
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    notificationsOpen: false,
    profileOpen: false,
    exportOpen: false,
    createOpen: false,
    fullScreen: false,
    drawers: {},
    data: {},
    tables: {},
    recentSearches: {},
    currentModule: 'dashboard'
  },
  notifications: [
    {id:1,type:'error',title:'2 overdue follow-ups need review',description:'Lead owners must update next actions today.',timestamp:'2 min ago',unread:true},
    {id:2,type:'warning',title:'Export queued for Leads',description:'Large export may take a few seconds.',timestamp:'14 min ago',unread:true},
    {id:3,type:'success',title:'Account updated successfully',description:'Global Services Ltd status saved.',timestamp:'1 hour ago',unread:false},
    {id:4,type:'info',title:'Dashboard refreshed',description:'Latest activity counts are now visible.',timestamp:'Today, 09:10',unread:false}
  ],
  async init() {
    this.state.currentModule = document.body.dataset.module || 'dashboard';
    this.state.sidebarCollapsed = localStorage.getItem('crm_sidebar_collapsed') === '1';
    this.setupTopbarOptionOne();
    await this.loadData();
    this.bindShell();
    this.applyShellState();
    this.renderNotifications();
    this.renderModule();
  },
  async loadData() {
    const files = ['business-lines','regions','countries','departments','branches','users','roles','leads','accounts','contacts'];
    const promises = files.map(async (name)=>{
      const res = await fetch(`data/${name}.json`);
      return [name.replace(/-/g,'_'), await res.json()];
    });
    const entries = await Promise.all(promises);
    this.state.data = Object.fromEntries(entries);
  },
  bindShell() {
    const toggles = document.querySelectorAll('.js-sidebar-toggle');
    toggles.forEach((toggle)=>toggle.addEventListener('click', ()=>this.toggleSidebar()));
    this.bindHeaderSearch();
    const bell = document.getElementById('notificationToggle');
    if (bell) bell.addEventListener('click', (e)=>{e.stopPropagation(); this.togglePanel('notificationsOpen');});
    const settings = document.getElementById('settingsToggle');
    if (settings) settings.addEventListener('click', ()=>alert('Settings panel will be enabled in the enterprise build.'));
    const profile = document.getElementById('profileToggle');
    if (profile) profile.addEventListener('click', (e)=>{e.stopPropagation(); this.togglePanel('profileOpen');});
    const exportBtn = document.getElementById('exportToggle');
    if (exportBtn) exportBtn.addEventListener('click', (e)=>{e.stopPropagation(); this.togglePanel('exportOpen'); this.renderExportPanel();});
    const createBtn = document.getElementById('createToggle');
    if (createBtn) createBtn.addEventListener('click', (e)=>{e.stopPropagation(); this.togglePanel('createOpen'); this.renderCreatePanel();});
    const full = document.getElementById('fullscreenToggle');
    if (full) full.addEventListener('click', ()=>this.toggleFullScreen());
    const topCreate = document.querySelector('.top-create-btn');
    if (topCreate) {
      topCreate.addEventListener('click', ()=>{
        if (this.state.currentModule === 'dashboard') return this.openCreateFromHome();
        this.openCreateDrawer(this.state.currentModule);
      });
    }
    document.addEventListener('click', (e)=>{
      if (!e.target.closest('.header-panel-wrap')) this.closePanels();
    });
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') {
        this.closePanels();
        this.closeDrawers();
        if (document.fullscreenElement) document.exitFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', ()=>{
      this.state.fullScreen = !!document.fullscreenElement;
      const icon = document.getElementById('fullscreenIcon');
      if (icon) icon.textContent = this.state.fullScreen ? '⤡' : '⛶';
    });
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', ()=>this.closeDrawers());
  },
  applyShellState() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    if (!sidebar || !main) return;
    sidebar.classList.toggle('collapsed', this.state.sidebarCollapsed);
    main.classList.toggle('collapsed', this.state.sidebarCollapsed);
  },
  bindHeaderSearch() {
    const wrap = document.querySelector('.topbar .search-wrap');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    const clear = wrap.querySelector('.clear-search');
    if (!input || !clear) return;
    let timer;
    input.addEventListener('input', ()=>{
      wrap.classList.toggle('has-value', !!input.value.trim());
      clearTimeout(timer);
      timer = setTimeout(()=>{}, 350);
    });
    clear.addEventListener('click', ()=>{
      input.value = '';
      wrap.classList.remove('has-value');
      input.focus();
    });
  },
  openCreateFromHome() {
    window.location.href = 'leads.html';
  },
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    if (window.innerWidth <= 860) {
      this.state.mobileSidebarOpen = !this.state.mobileSidebarOpen;
      sidebar.classList.toggle('mobile-open', this.state.mobileSidebarOpen);
      return;
    }
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', this.state.sidebarCollapsed);
    main.classList.toggle('collapsed', this.state.sidebarCollapsed);
    localStorage.setItem('crm_sidebar_collapsed', this.state.sidebarCollapsed ? '1' : '0');
  },
  togglePanel(key) {
    const all = ['notificationsOpen','profileOpen','exportOpen','createOpen'];
    all.forEach(k=>this.state[k]=false);
    this.state[key] = !this.state[key];
    this.syncPanels();
  },
  closePanels() { this.state.notificationsOpen=false; this.state.profileOpen=false; this.state.exportOpen=false; this.state.createOpen=false; this.syncPanels(); },
  syncPanels() {
    const map = {notificationsOpen:'notificationPanel', profileOpen:'profilePanel', exportOpen:'exportPanel', createOpen:'createPanel'};
    Object.entries(map).forEach(([key,id])=>{
      const el=document.getElementById(id);
      if (el) el.classList.toggle('open', !!this.state[key]);
    });
    const unread = this.notifications.filter(n=>n.unread).slice(0,5);
    if (this.state.notificationsOpen) unread.forEach(n=>n.unread=false);
    this.updateNotificationBadge();
  },
  updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    const count = this.notifications.filter(n=>n.unread).length;
    badge.style.display = count ? 'flex' : 'none';
    badge.textContent = count > 9 ? '9+' : String(count);
  },
  renderNotifications() {
    this.updateNotificationBadge();
    const body = document.getElementById('notificationBody');
    if (!body) return;
    if (!this.notifications.length) {
      body.innerHTML = '<div class="empty-state">No notifications available.</div>';
      return;
    }
    const ordered = [...this.notifications].sort((a,b)=> (a.type==='error'? -1:0) - (b.type==='error'?-1:0));
    body.innerHTML = ordered.slice(0,5).map(n=>`
      <div class="notification-item ${n.type} ${n.unread ? 'unread' : ''}">
        <div>${this.notificationIcon(n.type)}</div>
        <div>
          <div><strong>${n.title}</strong></div>
          <div class="status-note">${n.description || ''}</div>
          <div class="notification-meta">${n.timestamp}</div>
        </div>
      </div>`).join('') + `<button class="ghost-btn" style="width:100%;margin-top:8px" onclick="APP.clearNotifications()">Clear All</button>`;
  },
  clearNotifications(){ this.notifications=[]; this.renderNotifications(); },
  notificationIcon(type){ return ({success:'✅',info:'ℹ️',warning:'⚠️',error:'⛔'})[type] || '🔔'; },
  renderExportPanel() {
    const body = document.getElementById('exportBody');
    if (!body) return;
    body.innerHTML = `
      <div class="export-step">
        <button class="option-btn">Preferences</button>
        <button class="option-btn">Display Options</button>
        <button class="option-btn">Saved Views</button>
        <button class="option-btn">Filters & Admin Tools</button>
        <div class="status-note">Settings space is reserved for page-level controls and personalization tools.</div>
      </div>`;
  },
  renderCreatePanel() {
    const body = document.getElementById('createBody');
    if (!body) return;
    const module = this.state.currentModule;
    if (module === 'dashboard' || module === 'dashboard_empty') {
      body.innerHTML = `
        <div class="create-menu">
          <button class="option-btn" onclick="APP.switchModule('leads')">+ New Lead</button>
          <button class="option-btn" onclick="APP.switchModule('accounts')">+ New Account</button>
          <button class="option-btn" onclick="APP.switchModule('contacts')">+ New Contact</button>
          <button class="option-btn" onclick="APP.switchModule('users')">+ New User</button>
          <button class="option-btn" onclick="APP.switchModule('masters')">+ New Master</button>
        </div>`;
      return;
    }
    body.innerHTML = `<div class="status-note">Create action is context-aware for this module.</div>`;
  },
  switchModule(module) {
    const map = {
      leads: 'leads.html',
      accounts: 'accounts.html',
      contacts: 'contacts.html',
      users: 'users.html',
      masters: 'masters.html'
    };
    window.location.href = map[module] || 'home.html';
  },
  exportData(mode){
    const module = this.state.currentModule;
    const table = this.state.tables[module];
    let rows = [];
    if (table) {
      if (mode==='all') rows = table.data;
      else if (mode==='current') rows = table.filtered.slice((table.page-1)*table.rowsPerPage, table.page*table.rowsPerPage);
      else rows = table.filtered;
    } else {
      rows = this.state.data.leads || [];
    }
    if (!rows.length) { alert('No data available to export'); return; }
    const csv = this.toCSV(rows);
    const stamp = new Date().toISOString().slice(0,16).replace(/[-:T]/g,'');
    const filename = `${module}_${mode}_${stamp}.csv`;
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
    this.notifications.unshift({id:Date.now(), type:'success', title:`Export started for ${module}`, description:`${filename} downloaded`, timestamp:'Just now', unread:true});
    this.renderNotifications(); this.closePanels();
  },
  toCSV(rows){
    const keys = Object.keys(rows[0]);
    return [keys.join(','), ...rows.map(r=>keys.map(k=>`"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
  },
  toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  },
  setupTopbarOptionOne() {
    const right = document.querySelector('.topbar-right');
    const searchWrap = right?.querySelector('.search-wrap');
    if (!right || !searchWrap) return;
    right.querySelectorAll('.primary-btn:not(.create-btn)').forEach((button)=>button.remove());

    const moduleNames = ['All Modules', 'Leads', 'Accounts', 'Contacts', 'Users', 'Masters'];
    if (!searchWrap.querySelector('.search-scope')) {
      const scope = document.createElement('select');
      scope.className = 'search-scope';
      scope.id = 'searchScope';
      scope.innerHTML = moduleNames.map((item)=>`<option value="${item}">${item}</option>`).join('');
      searchWrap.prepend(scope);
    }

    const searchInput = searchWrap.querySelector('input');
    const clearBtn = searchWrap.querySelector('.clear-search');
    const scope = document.getElementById('searchScope');
    const moduleMap = {
      dashboard: 'All Modules',
      dashboard_empty: 'All Modules',
      leads: 'Leads',
      accounts: 'Accounts',
      contacts: 'Contacts',
      users: 'Users',
      masters: 'Masters'
    };
    const defaultScope = moduleMap[this.state.currentModule] || 'All Modules';
    if (scope) scope.value = defaultScope;

    const placeholderByScope = (value) => ({
      'All Modules': 'Search across CRM records',
      Leads: 'Search leads',
      Accounts: 'Search accounts',
      Contacts: 'Search contacts',
      Users: 'Search users',
      Masters: 'Search masters & reference data'
    }[value] || 'Search across CRM records');

    const syncSearchUi = () => {
      if (searchInput) {
        searchInput.placeholder = placeholderByScope(scope?.value || defaultScope);
      }
      searchWrap.classList.toggle('has-value', !!searchInput?.value?.trim());
    };

    scope?.addEventListener('change', syncSearchUi);
    searchInput?.addEventListener('input', syncSearchUi);
    clearBtn?.addEventListener('click', ()=>{
      if (searchInput) searchInput.value = '';
      syncSearchUi();
      searchInput?.focus();
    });
    syncSearchUi();

    const exportBtn = document.getElementById('exportToggle');
    const exportPanel = document.getElementById('exportPanel');
    if (exportBtn) {
      exportBtn.textContent = '⚙';
      exportBtn.setAttribute('aria-label', 'Open settings');
      exportBtn.classList.add('topbar-separator');
    }
    const exportHeader = exportPanel?.querySelector('.panel-header strong');
    if (exportHeader) exportHeader.textContent = 'Settings';

    if (!document.getElementById('createToggle')) {
      const createWrap = document.createElement('div');
      createWrap.className = 'header-panel-wrap';
      createWrap.style.position = 'relative';
      createWrap.innerHTML = `
        <button class="primary-btn create-btn" id="createToggle"></button>
        <div class="dropdown-panel" id="createPanel">
          <div class="panel-header"><strong>Create</strong><button class="icon-btn" style="width:34px;height:34px" onclick="APP.closePanels()">✕</button></div>
          <div class="panel-body" id="createBody"></div>
        </div>`;
      right.appendChild(createWrap);
    }

    const createLabel = {
      dashboard: '+ Create',
      dashboard_empty: '+ Create',
      leads: '+ New Lead',
      accounts: '+ New Account',
      contacts: '+ New Contact',
      users: '+ New User',
      masters: '+ New Master Record'
    }[this.state.currentModule] || '+ Create';
    const createBtn = document.getElementById('createToggle');
    if (createBtn) createBtn.textContent = createLabel;

    const profileTrigger = document.getElementById('profileToggle');
    const caret = profileTrigger?.querySelector('div:last-child');
    if (caret) caret.classList.add('caret');

    const settingsWrap = document.getElementById('exportToggle')?.closest('.header-panel-wrap');
    const notifWrap = document.getElementById('notificationToggle')?.closest('.header-panel-wrap');
    const fullscreenBtn = document.getElementById('fullscreenToggle');
    const profileWrap = document.getElementById('profileToggle')?.closest('.header-panel-wrap');
    const createWrap = document.getElementById('createToggle')?.closest('.header-panel-wrap');
    [searchWrap, settingsWrap, notifWrap, fullscreenBtn, profileWrap, createWrap]
      .filter(Boolean)
      .forEach((el)=>right.appendChild(el));
  },
  renderModule() {
    const module = this.state.currentModule;
    if (module === 'dashboard') return this.renderDashboard();
    if (module === 'dashboard_empty') return this.renderDashboardEmpty();
    const configs = {
      leads: {
        title:'Lead Management', subtitle:'Create, qualify, search, and manage all leads', data:this.state.data.leads,
        createLabel:'+ Create Lead',
        fields:[
          {name:'name',label:'Lead / Prospect Name',required:true},
          {name:'category',label:'Lead Category',type:'select',options:['Corporate','B2C / Retail','B2B'],required:true},
          {name:'segment',label:'Segment',type:'select',options:['NCA Corporate','ERV Top 20%','Agency','Retail'],required:true},
          {name:'stage',label:'Lead Stage',type:'select',options:['New','Assigned','Contacted','Qualified','Proposal/Discussion','Pending Decision','Converted','Lost','Disqualified','On Hold'],required:true},
          {name:'owner',label:'Owner',required:true},
          {name:'source',label:'Lead Source',type:'select',options:['Referral','Direct','Digital','Tender'],required:true},
          {name:'nextAction',label:'Next Action Date',type:'date',required:true}
        ],
        columns:[['id','Lead ID'],['name','Lead Name'],['category','Category'],['segment','Segment'],['stage','Stage'],['owner','Owner'],['nextAction','Next Action']],
        badgeField:'stage'
      },
      accounts: {
        title:'Account Management', subtitle:'Manage converted and active client accounts', data:this.state.data.accounts,
        createLabel:'+ Create Account',
        fields:[
          {name:'name',label:'Account Name',required:true},
          {name:'type',label:'Account Type',type:'select',options:['Corporate','B2C / Retail','B2B'],required:true},
          {name:'segment',label:'Segment',type:'select',options:['ERV Top 20%','Agency','Dormant','Strategic'],required:true},
          {name:'owner',label:'Account Owner',required:true},
          {name:'status',label:'Account Status',type:'select',options:['Active','Newly Converted','Dormant','At Risk','Lost','Reacquisition Pipeline'],required:true},
          {name:'lastActivity',label:'Last Activity Date',type:'date'}
        ],
        columns:[['id','Account ID'],['name','Account Name'],['type','Type'],['segment','Segment'],['owner','Owner'],['status','Status'],['lastActivity','Last Activity']],
        badgeField:'status'
      },
      contacts: {
        title:'Contacts Management', subtitle:'Manage contact persons linked to leads and accounts', data:this.state.data.contacts,
        createLabel:'+ Create Contact',
        fields:[
          {name:'name',label:'Contact Name',required:true},
          {name:'designation',label:'Designation',required:true},
          {name:'email',label:'Email',type:'email',required:true},
          {name:'phone',label:'Phone',required:true},
          {name:'linkedTo',label:'Linked To',type:'select',options:['Lead','Account'],required:true},
          {name:'linkedName',label:'Linked Record Name',required:true}
        ],
        columns:[['id','Contact ID'],['name','Contact Name'],['designation','Designation'],['email','Email'],['phone','Phone'],['linkedTo','Linked To'],['linkedName','Linked Name']],
        badgeField:'linkedTo'
      },
      users: {
        title:'User Management', subtitle:'Manage users, roles, and access', data:(this.state.data.users||[]).filter(r=>r.name),
        createLabel:'+ Create User',
        fields:[
          {name:'name',label:'User Name',required:true},
          {name:'email',label:'Official Email',type:'email',required:true},
          {name:'role',label:'Primary Role',type:'select',options:['Super Admin','Admin','Manager','Sales Executive','Viewer'],required:true},
          {name:'branch',label:'Branch'},
          {name:'department',label:'Department'},
          {name:'status',label:'User Status',type:'select',options:['Active','Inactive'],required:true}
        ],
        columns:[['name','Name'],['email','Email'],['role','Role'],['branch','Branch'],['department','Department'],['status','Status']],
        badgeField:'role'
      },
      masters: {
        title:'Masters & Reference Data', subtitle:'Business line, region, country, branch, department, user, and role masters',
        data:this.state.data.business_lines.map((r,i)=>({module:'Business Line',name:r.name,status:r.status||'Active',owner:'Super Admin',code:`BL-${String(i+1).padStart(3,'0')}`}))
          .concat((this.state.data.regions||[]).map(r=>({module:'Region',name:r.name,status:r.status||'Active',owner:r.owner||'Super Admin',code:r.code||''})))
          .concat((this.state.data.departments||[]).map(r=>({module:'Department',name:r.name,status:r.status||'Active',owner:'Super Admin',code:r.code||''})))
          .slice(0,40),
        createLabel:'+ Create Master Record',
        fields:[
          {name:'module',label:'Master Module',type:'select',options:['Business Line','Region','Country','Branch','Department','User','Role'],required:true},
          {name:'name',label:'Display Name',required:true},
          {name:'code',label:'Code'},
          {name:'owner',label:'Owner',required:true},
          {name:'status',label:'Status',type:'select',options:['Active','Inactive'],required:true}
        ],
        columns:[['module','Module'],['name','Name'],['code','Code'],['owner','Owner'],['status','Status']],
        badgeField:'status'
      }
    };
    this.renderDataModule(configs[module]);
  },
  renderDashboardEmpty() {
    const root = document.getElementById('pageRoot');
    root.innerHTML = `
      <div class="card">
        <div class="section-title">Dashboard (Planned)</div>
        <p class="section-subtitle">This page is reserved for charts and graphs. It is intentionally empty for now.</p>
        <div class="empty-state">Upcoming: KPI trend charts, pipeline funnel, conversion graph, and branch-level performance widgets.</div>
      </div>
    `;
  },
  formatCurrencyINR(amount) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  },
  estimatePipelineValue(leads = [], accounts = []) {
    const leadStageValue = {
      'new': 25000,
      'assigned': 40000,
      'contacted': 65000,
      'qualified': 125000,
      'proposal/discussion': 210000,
      'pending decision': 280000,
      'converted': 320000,
      'lost': 0,
      'disqualified': 0,
      'on hold': 30000
    };
    const accountValue = {
      'corporate': 350000,
      'b2b': 175000,
      'b2c / retail': 95000
    };

    const leadTotal = leads.reduce((sum, lead) => {
      const stage = String(lead.stage || '').toLowerCase();
      return sum + (leadStageValue[stage] ?? 50000);
    }, 0);

    const accountTotal = accounts.reduce((sum, account) => {
      const type = String(account.type || '').toLowerCase();
      const status = String(account.status || '').toLowerCase();
      const multiplier = status.includes('active') ? 1 : 0.65;
      return sum + ((accountValue[type] ?? 100000) * multiplier);
    }, 0);

    const pipeline = leadTotal + accountTotal;
    const projected = Math.round(pipeline * 0.38);
    return { pipeline, projected };
  },
  renderDashboard() {
    const root = document.getElementById('pageRoot');
    const leads = this.state.data.leads || [];
    const accounts = this.state.data.accounts || [];
    const users = (this.state.data.users || []).filter(u=>u.name);
    const contacts = this.state.data.contacts || [];
    const moneyMetrics = this.estimatePipelineValue(leads, accounts);
    root.innerHTML = `
      <div class="kpi-grid">
        <div class="card"><div class="kpi-label">Open Leads</div><div class="kpi-value">${leads.length}</div><div class="kpi-foot">Single structure for corporate, B2B, and retail prospects</div></div>
        <div class="card"><div class="kpi-label">Active Accounts</div><div class="kpi-value">${accounts.length}</div><div class="kpi-foot">Post-conversion relationship entities</div></div>
        <div class="card"><div class="kpi-label">Pipeline Value (₹)</div><div class="kpi-value">₹${this.formatCurrencyINR(moneyMetrics.pipeline)}</div><div class="kpi-foot">Estimated from lead stage + account type mix</div></div>
        <div class="card"><div class="kpi-label">Projected Revenue (₹)</div><div class="kpi-value">₹${this.formatCurrencyINR(moneyMetrics.projected)}</div><div class="kpi-foot">Conservative 38% conversion projection</div></div>
        <div class="card"><div class="kpi-label">Contacts</div><div class="kpi-value">${contacts.length}</div><div class="kpi-foot">Stakeholder-level mapping for account coverage</div></div>
        <div class="card"><div class="kpi-label">Users / Roles</div><div class="kpi-value">${users.length || 5}</div><div class="kpi-foot">Role-based access and governance</div></div>
      </div>
      <div class="grid-2-1">
        <div class="card">
          <div class="section-title">Recent CRM Activity</div>
          <p class="section-subtitle">Aligned to the blueprint’s activity, meeting, task, and compliance tracking model.</p>
          <div class="list">
            <div class="list-item">Lead ABC Travels moved to Qualified after contact and qualification notes.</div>
            <div class="list-item">Global Services Ltd account status updated with latest relationship review.</div>
            <div class="list-item">Stakeholder record for Rahul Sharma linked to lead-level engagement history.</div>
            <div class="list-item">Coordinator queue flagged overdue next-action discipline for 2 open leads.</div>
          </div>
        </div>
        <div class="card">
          <div class="section-title">Quick Access</div>
          <p class="section-subtitle">Use the same CRM shell across modules.</p>
          <div class="list">
            <a class="quick-link" href="leads.html">Open Leads Module</a>
            <a class="quick-link" href="accounts.html">Open Accounts Module</a>
            <a class="quick-link" href="contacts.html">Open Contacts Module</a>
            <a class="quick-link" href="masters.html">Open Masters</a>
          </div>
        </div>
      </div>`;
  },
  renderDataModule(config) {
    const root = document.getElementById('pageRoot');
    const module = this.state.currentModule;
    this.state.tables[module] = {
      data: [...config.data],
      filtered: [...config.data],
      page: 1,
      rowsPerPage: 25,
      search: '',
      selectedRecord: null,
      config,
      editingIndex: null,
      sortKey: null,
      sortAsc: true
    };
    root.innerHTML = `
      <div class="module-head">
        <div><h3>${config.title}</h3><p>${config.subtitle}</p></div>
        <div class="module-actions">
          <div class="search-wrap" id="moduleSearchWrap"><span class="left">🔎</span><input id="moduleSearch" type="text" placeholder="Search ${config.title.toLowerCase()}..."/><button class="clear-search" id="moduleSearchClear">×</button><div class="recent-searches" id="moduleRecentSearches"></div></div>
          <button class="primary-btn" id="createBtn">${config.createLabel}</button>
        </div>
      </div>
      <div class="data-layout">
        <section class="card form-section">
          <div class="section-title">Create / Edit</div>
          <p class="section-subtitle">Single active create form, consistent with the standard create-form behavior.</p>
          <form id="entityForm"></form>
        </section>
        <section class="card table-section">
          <div class="toolbar">
            <div class="toolbar-left">
              <div>
                <div class="section-title">Records List</div>
                <div class="section-subtitle">Search, paginate, export, open read view, and edit records.</div>
              </div>
            </div>
            <div class="rows-control"><span>Rows per page</span><select id="rowsPerPage"><option>25</option><option>50</option><option>75</option><option>100</option></select></div>
          </div>
          <div class="table-wrap"><table><thead id="tableHead"></thead><tbody id="tableBody"></tbody></table></div>
          <div class="footer-bar"><div class="selected-records" id="selectedRecordText"></div><div class="pagination" id="pagination"></div></div>
        </section>
      </div>`;
    this.renderForm(config.fields, module);
    this.bindTableControls(module);
    this.applySearch(module, '');
  },
  renderForm(fields, module) {
    const form = document.getElementById('entityForm');
    form.innerHTML = fields.map(f=>{
      const required = f.required ? `<span class="required">*</span>` : '';
      if (f.type === 'select') return `<div class="form-group"><label>${f.label} ${required}</label><select class="select" name="${f.name}">${['<option value="">Select</option>', ...f.options.map(o=>`<option value="${o}">${o}</option>`)].join('')}</select></div>`;
      if (f.type === 'date') return `<div class="form-group"><label>${f.label} ${required}</label><input class="input" type="date" name="${f.name}" /></div>`;
      return `<div class="form-group"><label>${f.label} ${required}</label><input class="input" type="${f.type || 'text'}" name="${f.name}" /></div>`;
    }).join('') + `<div class="form-actions"><button class="primary-btn" type="submit">Save</button><button class="secondary-btn" type="button" id="clearForm">Cancel</button></div>`;
    form.onsubmit = (e)=>{ e.preventDefault(); this.submitForm(module); };
    document.getElementById('clearForm').onclick = ()=> this.resetForm(module);
    document.getElementById('createBtn').onclick = ()=> this.openCreateDrawer(module);
  },
  openCreateDrawer(module) {
    const table = this.state.tables[module];
    this.openDrawer('create', `Create ${table.config.title.replace(' Management','').replace('s','')}`, 'Use the same page context without losing search, filters, or pagination.', `
      <div class="drawer-section"><div class="status-note">The create button is a consistent top-header entry point and opens only one form at a time.</div></div>
      <div class="drawer-section"><div class="drawer-grid">${table.config.fields.map(f=>`<div class="label">${f.label}</div><div class="value">${f.required ? 'Required' : 'Optional'} • ${f.type || 'Text'}</div>`).join('')}</div></div>`,
      `<button class="secondary-btn" onclick="APP.closeDrawers()">Close</button><button class="primary-btn" onclick="APP.closeDrawers()">Continue in form</button>`);
  },
  bindTableControls(module) {
    const search = document.getElementById('moduleSearch');
    const clear = document.getElementById('moduleSearchClear');
    const wrap = document.getElementById('moduleSearchWrap');
    let timer;
    search.addEventListener('input', ()=>{
      wrap.classList.toggle('has-value', !!search.value.trim());
      clearTimeout(timer);
      timer = setTimeout(()=> this.applySearch(module, search.value), 350);
      this.renderRecentSearches(module, search.value);
    });
    search.addEventListener('focus', ()=> this.renderRecentSearches(module, search.value, true));
    search.addEventListener('keydown', (e)=> this.handleSearchKeys(module, e));
    clear.onclick = ()=>{ search.value=''; wrap.classList.remove('has-value'); this.applySearch(module,''); this.renderRecentSearches(module,'',false); };
    const rows = document.getElementById('rowsPerPage');
    rows.addEventListener('change', ()=>{ const t=this.state.tables[module]; t.rowsPerPage=Number(rows.value)||25; t.page=1; this.renderTable(module); });
  },
  handleSearchKeys(module, e) {
    const box = document.getElementById('moduleRecentSearches');
    const items = [...box.querySelectorAll('.recent-search-item')];
    const active = items.findIndex(i=>i.classList.contains('active'));
    if (e.key === 'Escape') { box.classList.remove('open'); return; }
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); const idx = active < items.length-1 ? active+1 : 0; items.forEach(i=>i.classList.remove('active')); items[idx].classList.add('active'); }
    if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); const idx = active > 0 ? active-1 : items.length-1; items.forEach(i=>i.classList.remove('active')); items[idx].classList.add('active'); }
    if (e.key === 'Enter') {
      if (items[active]) { e.preventDefault(); this.applyRecentSearch(module, items[active].dataset.value); }
      else this.applySearch(module, e.target.value, true);
    }
  },
  addRecentSearch(module, term) {
    const clean = (term || '').trim(); if (!clean) return;
    const store = this.state.recentSearches[module] || [];
    const next = [clean, ...store.filter(t=>t.toLowerCase() !== clean.toLowerCase())].slice(0,5);
    this.state.recentSearches[module] = next;
  },
  renderRecentSearches(module, query='', force=false) {
    const box = document.getElementById('moduleRecentSearches'); if (!box) return;
    const all = this.state.recentSearches[module] || [];
    const q = (query || '').trim().toLowerCase();
    const list = q ? all.filter(t=>t.toLowerCase().includes(q)) : all;
    if (!force && !query && !list.length) { box.classList.remove('open'); return; }
    box.classList.add('open');
    box.innerHTML = list.length ? list.map(t=>`<div class="recent-search-item" data-value="${t}" onclick="APP.applyRecentSearch('${module}','${t.replace(/'/g,"\\'")}')">${t}</div>`).join('') : '<div class="recent-search-item">No recent searches</div>';
  },
  applyRecentSearch(module, term) {
    document.getElementById('moduleSearch').value = term;
    document.getElementById('moduleSearchWrap').classList.add('has-value');
    this.applySearch(module, term, true);
  },
  applySearch(module, term, persist=true) {
    const table = this.state.tables[module];
    const clean = (term || '').trim().toLowerCase();
    table.search = clean;
    if (persist && clean) this.addRecentSearch(module, term);
    const tokens = clean.split(/\s+/).filter(Boolean);
    table.filtered = table.data.filter(row=>{
      const hay = Object.values(row).join(' ').toLowerCase();
      return tokens.every(t=>hay.includes(t));
    });
    table.page = 1;
    this.renderTable(module);
    this.renderRecentSearches(module, term, false);
  },
  renderTable(module) {
    const table = this.state.tables[module];
    const {columns, badgeField} = table.config;
    const head = document.getElementById('tableHead');
    const body = document.getElementById('tableBody');
    const selected = document.getElementById('selectedRecordText');
    head.innerHTML = `<tr>${columns.map(([k,label])=>`<th onclick="APP.sortTable('${module}','${k}')">${label}</th>`).join('')}<th>Actions</th></tr>`;
    const total = table.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / table.rowsPerPage));
    if (table.page > totalPages) table.page = totalPages;
    const start = total === 0 ? 0 : (table.page - 1) * table.rowsPerPage + 1;
    const end = Math.min(total, table.page * table.rowsPerPage);
    const pageRows = table.filtered.slice(start ? start - 1 : 0, end);
    body.innerHTML = pageRows.length ? pageRows.map((row, idx)=>`<tr>${columns.map(([key], colIndex)=>{
      const val = row[key] ?? '—';
      if (colIndex===0 || key==='name') return `<td data-label="${columns[colIndex][1]}"><span class="record-link" onclick="APP.openRead('${module}', ${idx + start - 1})">${val}</span></td>`;
      if (key === badgeField || /(status|stage|role|type|linkedTo)$/i.test(key)) return `<td data-label="${columns[colIndex][1]}">${this.renderBadge(String(val))}</td>`;
      return `<td data-label="${columns[colIndex][1]}">${val || '—'}</td>`;
    }).join('')}<td data-label="Actions"><div class="table-actions"><button class="mini-btn mini-read" onclick="APP.openRead('${module}', ${idx + start - 1})">Read</button><button class="mini-btn mini-edit" onclick="APP.loadEdit('${module}', ${idx + start - 1})">Edit</button><button class="mini-btn mini-delete" onclick="APP.deleteRow('${module}', ${idx + start - 1})">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="${columns.length+1}"><div class="empty-state">No records found</div></td></tr>`;
    if (total === 0) selected.textContent = 'No records found';
    else selected.textContent = `Showing ${start} to ${end} of ${total} entries`;
    this.renderPagination(module, totalPages, total);
  },
  renderBadge(value) {
    const v = value.toLowerCase();
    let cls = 'badge-slate';
    if (v.includes('active') || v.includes('converted') || v.includes('success')) cls = 'badge-green';
    else if (v.includes('qualified') || v.includes('new') || v.includes('corporate')) cls = 'badge-blue';
    else if (v.includes('pending') || v.includes('follow') || v.includes('warning') || v.includes('account')) cls = 'badge-amber';
    else if (v.includes('lost') || v.includes('inactive') || v.includes('error') || v.includes('disqualified')) cls = 'badge-red';
    else if (v.includes('admin') || v.includes('role')) cls = 'badge-violet';
    return `<span class="badge ${cls}">${value}</span>`;
  },
  renderPagination(module, totalPages, total) {
    const table = this.state.tables[module];
    const wrap = document.getElementById('pagination');
    if (total <= table.rowsPerPage || total <= 1) { wrap.innerHTML = ''; return; }
    const pages = this.pageRange(table.page, totalPages);
    wrap.innerHTML = `
      <button class="page-btn" ${table.page===1?'disabled':''} onclick="APP.changePage('${module}', ${table.page-1})">Prev</button>
      ${pages.map(p=> p==='...' ? `<span class="page-btn">…</span>` : `<button class="page-btn ${p===table.page?'active':''}" onclick="APP.changePage('${module}', ${p})">${p}</button>`).join('')}
      <input class="page-input" id="pageInput" value="${table.page}" onkeydown="APP.manualPage('${module}', event)" />
      <button class="page-btn" ${table.page===totalPages?'disabled':''} onclick="APP.changePage('${module}', ${table.page+1})">Next</button>`;
  },
  pageRange(current, total) {
    if (total <= 7) return Array.from({length: total}, (_,i)=>i+1);
    if (current <= 4) return [1,2,3,4,5,'...',total];
    if (current >= total-3) return [1,'...',total-4,total-3,total-2,total-1,total];
    return [1,'...',current-1,current,current+1,'...',total];
  },
  changePage(module, page) {
    const table = this.state.tables[module];
    const totalPages = Math.max(1, Math.ceil(table.filtered.length / table.rowsPerPage));
    table.page = Math.min(Math.max(page,1), totalPages);
    this.renderTable(module);
  },
  manualPage(module, e) {
    if (e.key !== 'Enter') return;
    const table = this.state.tables[module];
    const totalPages = Math.max(1, Math.ceil(table.filtered.length / table.rowsPerPage));
    const n = Number(e.target.value);
    if (!n) return this.renderTable(module);
    table.page = Math.min(Math.max(n,1), totalPages);
    this.renderTable(module);
  },
  sortTable(module, key) {
    const table = this.state.tables[module];
    if (table.sortKey === key) table.sortAsc = !table.sortAsc; else { table.sortKey = key; table.sortAsc = true; }
    table.filtered.sort((a,b)=> String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {numeric:true}) * (table.sortAsc ? 1 : -1));
    this.renderTable(module);
  },
  submitForm(module) {
    const table = this.state.tables[module];
    const form = document.getElementById('entityForm');
    const data = Object.fromEntries(new FormData(form).entries());
    const missing = table.config.fields.filter(f=>f.required && !String(data[f.name] || '').trim());
    if (missing.length) { alert(`${missing[0].label} is required.`); return; }
    if (module==='leads' && !data.id) data.id = `LD-${String(table.data.length+1).padStart(4,'0')}`;
    if (module==='accounts' && !data.id) data.id = `AC-${String(table.data.length+1).padStart(4,'0')}`;
    if (module==='contacts' && !data.id) data.id = `CT-${String(table.data.length+1).padStart(4,'0')}`;
    if (table.editingIndex !== null && table.editingIndex !== undefined) table.data[table.editingIndex] = {...table.data[table.editingIndex], ...data};
    else table.data.unshift(data);
    this.resetForm(module);
    this.applySearch(module, table.search, false);
    this.notifications.unshift({id:Date.now(), type:'success', title:`${table.config.title.replace(' Management','')} saved`, description:'Create / edit action completed successfully.', timestamp:'Just now', unread:true});
    this.renderNotifications();
  },
  resetForm(module) {
    const form = document.getElementById('entityForm'); form.reset();
    this.state.tables[module].editingIndex = null;
  },
  loadEdit(module, index) {
    const table = this.state.tables[module];
    const row = table.filtered[index];
    const realIndex = table.data.findIndex(r=>JSON.stringify(r)===JSON.stringify(row));
    table.editingIndex = realIndex;
    const form = document.getElementById('entityForm');
    Object.keys(row).forEach(key=>{ if (form.elements[key]) form.elements[key].value = row[key]; });
    this.openDrawer('edit', `Edit ${this.drawerLabel(module)}: ${row.name || row.id || 'Record'}`, 'Editable fields follow the create-form layout. System fields stay read-only in the read view.', this.readGrid(row, true), `<button class="secondary-btn" onclick="APP.closeDrawers()">Close</button><button class="primary-btn" onclick="APP.closeDrawers()">Continue editing in form</button>`);
  },
  openRead(module, index) {
    const row = this.state.tables[module].filtered[index];
    this.openDrawer('read', `${this.drawerLabel(module)} Details: ${row.name || row.id || 'Record'}`, 'Read-only view preserves current page, filters, sort, and pagination state.', this.readGrid(row, false), `<button class="secondary-btn" onclick="APP.closeDrawers()">Close</button><button class="primary-btn" onclick="APP.loadEdit('${module}', ${index});APP.closeDrawers();setTimeout(()=>APP.loadEdit('${module}', ${index}),10)">Edit</button>`);
  },
  readGrid(row, editing){
    return `<div class="drawer-section"><div class="drawer-grid">${Object.entries(row).map(([k,v])=>`<div class="label">${this.pretty(k)}</div><div class="value">${/(status|stage|role|type|linkedTo)$/i.test(k)?this.renderBadge(String(v)): (v || '—')}</div>`).join('')}</div></div>`;
  },
  drawerLabel(module){ return ({leads:'Lead',accounts:'Account',contacts:'Contact',users:'User',masters:'Master Record'})[module] || 'Record'; },
  pretty(key){ return key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()); },
  openDrawer(kind,title,subtitle,body,footer){
    const drawer = document.getElementById('drawer'); const overlay = document.getElementById('overlay');
    drawer.innerHTML = `<div class="drawer-header"><div class="drawer-title"><h3>${title}</h3><p>${subtitle}</p></div><button class="icon-btn" onclick="APP.closeDrawers()">✕</button></div><div class="drawer-body">${body}</div><div class="drawer-footer">${footer}</div>`;
    drawer.classList.add('open'); overlay.classList.add('open');
  },
  closeDrawers(){ document.getElementById('drawer').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); },
  deleteRow(module, index) {
    const table = this.state.tables[module];
    const row = table.filtered[index];
    const realIndex = table.data.findIndex(r=>JSON.stringify(r)===JSON.stringify(row));
    if (realIndex >= 0) table.data.splice(realIndex, 1);
    this.applySearch(module, table.search, false);
  }
};
window.APP = APP;
window.addEventListener('DOMContentLoaded', ()=>APP.init());
