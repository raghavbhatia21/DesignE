const clientsList = document.getElementById('clients-list');
const clientForm = document.getElementById('client-form');
const clientModal = document.getElementById('client-modal');
const loginOverlay = document.getElementById('login-overlay');
const dashboardContent = document.getElementById('dashboard-content');
const authError = document.getElementById('auth-error');

const ADMIN_WHITELIST_MASTER = 'raghavbhatia332@gmail.com';
let authorizedAdmins = [ADMIN_WHITELIST_MASTER];

// --- Auth Logic ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error("Auth Error Object:", error);
            authError.innerText = `Login failed (${error.code}): ${error.message}`;
            authError.style.display = 'block';
        });
}

function handleSignOut() {
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// Monitor Auth State
auth.onAuthStateChanged(user => {
    if (user) {
        // Fetch current whitelist from DB before final check
        db.ref('admins').once('value').then(snapshot => {
            const dbAdmins = snapshot.val() ? Object.values(snapshot.val()) : [];
            authorizedAdmins = [ADMIN_WHITELIST_MASTER, ...dbAdmins];

            if (authorizedAdmins.includes(user.email)) {
                // Authorized
                loginOverlay.classList.remove('active');
                dashboardContent.style.display = 'block';

                // Update Admin Profile UI
                document.getElementById('admin-name').innerText = user.displayName;
                document.getElementById('admin-photo').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=FF4B2B&color=fff`;

                // Load Data
                initDashboard();
                initAdminManager();
                initSettings();
                initAnalytics();
            } else {
                // Unauthorized
                authError.innerText = "Access Denied. You are not an authorized admin (" + user.email + ").";
                authError.style.display = 'block';
                auth.signOut();
            }
        });
    } else {
        // Not Signed In
        loginOverlay.classList.add('active');
        dashboardContent.style.display = 'none';
    }
});

function initDashboard() {
    // Initial Load - Realtime updates
    db.ref('licenses').on('value', snapshot => {
        const data = snapshot.val();
        renderClients(data);
        updateStats(data);
    });
}

function initAdminManager() {
    // Real-time update admin list in settings
    db.ref('admins').on('value', snapshot => {
        const admins = snapshot.val();
        renderAdminList(admins);
    });

    const addAdminForm = document.getElementById('add-admin-form');
    if (addAdminForm) {
        addAdminForm.onsubmit = (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('new-admin-email');
            const email = emailInput.value.toLowerCase().trim();

            if (email === ADMIN_WHITELIST_MASTER) {
                alert("Master admin is already authorized.");
                return;
            }

            // Push to Firebase
            db.ref('admins').push(email).then(() => {
                emailInput.value = '';
            });
        };
    }
}

function renderAdminList(admins) {
    const listDiv = document.getElementById('admin-list');
    if (!listDiv) return;

    listDiv.innerHTML = `
        <div class="admin-item">
            <span>${ADMIN_WHITELIST_MASTER} <span class="master-badge">Master</span></span>
            <i class="fas fa-shield-alt"></i>
        </div>
    `;

    if (admins) {
        Object.entries(admins).forEach(([key, email]) => {
            const adminItem = document.createElement('div');
            adminItem.className = 'admin-item';
            adminItem.innerHTML = `
                <span>${email}</span>
                <button class="action-btn delete" onclick="removeAdmin('${key}', '${email}')" style="width: 28px; height: 28px;">
                    <i class="fas fa-trash-alt" style="font-size: 0.8rem;"></i>
                </button>
            `;
            listDiv.appendChild(adminItem);
        });
    }
}

window.removeAdmin = (key, email) => {
    if (confirm(`Remove access for ${email}?`)) {
        db.ref(`admins/${key}`).remove();
    }
};

// --- Analytics Logic ---
function initAnalytics() {
    // Only listen to licenses for business projections
    db.ref('licenses').on('value', licSnapshot => {
        const licenses = licSnapshot.val();
        renderAnalytics(licenses);
    });
}

function renderAnalytics(licenses) {
    // New Revenue Calculations
    let projectedYearly = 0;
    let overallBusinessRevenue = 0;

    if (licenses) {
        const licenseList = Object.values(licenses);
        const totalClients = licenseList.length;

        // Formula: Projected = Clients * 3000
        projectedYearly = licenseList.filter(l => !l.excludeFromRevenue).length * 3000;

        // Formula: Overall = Sum(7000 + (Renewals * 3000))
        licenseList.forEach(license => {
            if (license.excludeFromRevenue) return;
            const renewalCount = license.renewalCount || 0;
            overallBusinessRevenue += 7000 + (renewalCount * 3000);
        });
    }

    // Update UI
    animateValue('projected-revenue', projectedYearly, '₹');
    animateValue('overall-revenue', overallBusinessRevenue, '₹');
}

function animateValue(id, value, prefix = '') {
    const el = document.getElementById(id);
    if (!el) return;

    const startValue = parseInt(el.innerText.replace(/[^\d]/g, '')) || 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing progress
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (value - startValue) * easedProgress);

        el.innerText = prefix + currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// --- Dashboard Logic ---

// Tab Switching Logic
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

// --- Mobile Sidebar Toggle ---
const mobileToggle = document.getElementById('mobile-toggle');
const mobileClose = document.getElementById('mobile-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebar = document.querySelector('.sidebar');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.classList.add('sidebar-open');
    });
}

if (mobileClose) {
    mobileClose.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = link.dataset.tab;

        // Update Nav
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update Views
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${targetTab}-view`) {
                content.classList.add('active');
            }
        });

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    });
});


function renderClients(data) {
    if (!data) {
        clientsList.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state-guide">
                        <i class="fas fa-magic"></i>
                        <h3>Your Dashboard is Ready!</h3>
                        <p>No client applications have connected yet. You can get started in two ways:</p>
                        <div class="guide-steps">
                            <div class="step">
                                <div class="step-num">1</div>
                                <div class="step-text">Open your <b>demo caferesto</b> app once to auto-register it.</div>
                            </div>
                            <div class="step">
                                <div class="step-num">2</div>
                                <div class="step-text">Or click "Add New Client" to create a license manually.</div>
                            </div>
                        </div>
                        <button class="add-client-btn" onclick="openAddModal()">Add Your First Client</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    clientsList.innerHTML = '';
    Object.entries(data).forEach(([id, client]) => {
        const expiryDate = new Date(client.expiryDate);
        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        let daysClass = 'healthy';
        if (daysLeft < 7) daysClass = 'warning';
        if (daysLeft < 3) daysClass = 'danger';

        // Calculate Last Active (Mocked for now or fetched if linked)
        const lastActive = client.lastActive ? timeAgo(new Date(client.lastActive)) : 'No Data';
        const isExcluded = client.excludeFromRevenue ? '<i class="fas fa-eye-slash" title="Excluded from Revenue" style="color: #f1c40f; margin-left: 0.5rem;"></i>' : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Cafe Name">
                <div style="font-weight: 600">${client.clientName}${isExcluded}</div>
            </td>
            <td data-label="License ID"><code>${id}</code></td>
            <td data-label="Subscription">${expiryDate.toLocaleDateString()}</td>
            <td data-label="Days Left"><span class="days-left ${daysClass}">${daysLeft} Days</span></td>
            <td data-label="Last Active" style="color: var(--text-muted); font-size: 0.8rem;">${lastActive}</td>
            <td data-label="Status">
                <button class="status-toggle ${client.isActive ? 'active' : 'inactive'}" 
                    onclick="toggleStatus('${id}', ${client.isActive})">
                    ${client.isActive ? 'ACTIVE' : 'SUSPENDED'}
                </button>
            </td>
            <td data-label="Actions">
                <div class="action-btns">
                    <button class="action-btn" onclick="renewSubscription('${id}', '${client.expiryDate}')" title="Renew 1 Year"><i class="fas fa-sync-alt"></i></button>
                    <button class="action-btn" onclick="editClient('${id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteClient('${id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        clientsList.appendChild(row);
    });
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
}

function updateStats(data) {
    if (!data) return;
    const clients = Object.values(data);
    document.getElementById('total-clients').innerText = clients.length;
    document.getElementById('active-services').innerText = clients.filter(c => c.isActive).length;

    const expiring = clients.filter(c => {
        const days = Math.ceil((new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days < 7 && days >= 0;
    }).length;
    document.getElementById('expiring-soon').innerText = expiring;
}

// Modal Logic
window.openAddModal = () => {
    document.getElementById('modal-title').innerText = "Add New Client";
    clientForm.reset();
    document.getElementById('exclude-revenue').checked = false;
    document.getElementById('edit-id').value = '';
    clientModal.classList.add('active');
};

window.closeModal = () => {
    clientModal.classList.remove('active');
};

clientForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('license-id').value;
    const editId = document.getElementById('edit-id').value;

    const clientData = {
        clientName: document.getElementById('client-name').value,
        expiryDate: document.getElementById('expiry-date').value,
        excludeFromRevenue: document.getElementById('exclude-revenue').checked,
        isActive: true
    };

    if (editId) {
        // Edit existing
        db.ref('licenses/' + editId).update(clientData).then(() => {
            closeModal();
        });
    } else {
        // Add new
        db.ref('licenses/' + id).set(clientData).then(() => {
            closeModal();
        });
    }
};

window.toggleStatus = (id, currentStatus) => {
    db.ref(`licenses/${id}`).update({ isActive: !currentStatus });
};

window.editClient = (id) => {
    db.ref(`licenses/${id}`).once('value').then(snapshot => {
        const client = snapshot.val();
        document.getElementById('modal-title').innerText = "Edit Client";
        document.getElementById('client-name').value = client.clientName;
        document.getElementById('license-id').value = id;
        document.getElementById('license-id').disabled = true;
        document.getElementById('expiry-date').value = client.expiryDate;
        document.getElementById('exclude-revenue').checked = client.excludeFromRevenue || false;
        document.getElementById('edit-id').value = id;
        clientModal.classList.add('active');
    });
};

window.deleteClient = (id) => {
    if (confirm(`Are you sure you want to remove license ${id}? This will block that client's service.`)) {
        db.ref(`licenses/${id}`).remove();
    }
};

window.renewSubscription = (id, currentExpiry) => {
    db.ref(`licenses/${id}`).once('value').then(snapshot => {
        const license = snapshot.val();
        const currentCount = license.renewalCount || 0;

        const current = new Date(currentExpiry);
        const nextYear = new Date(current.setFullYear(current.getFullYear() + 1));
        const newExpiry = nextYear.toISOString().split('T')[0];

        if (confirm(`Extend subscription for 1 year until ${newExpiry}?`)) {
            db.ref(`licenses/${id}`).update({
                expiryDate: newExpiry,
                renewalCount: currentCount + 1
            }).then(() => {
                alert("Subscription renewed successfully!");
            });
        }
    });
};

function initSettings() {
    const settingsForm = document.getElementById('general-settings-form');
    if (!settingsForm) return;

    // Load current settings
    db.ref('settings').on('value', snapshot => {
        const settings = snapshot.val();
        if (settings) {
            if (document.getElementById('admin-email'))
                document.getElementById('admin-email').value = settings.adminEmail || '';
            if (document.getElementById('trial-period'))
                document.getElementById('trial-period').value = settings.trialPeriod || 30;
        }
    });

    settingsForm.onsubmit = (e) => {
        e.preventDefault();
        const settingsData = {
            adminEmail: document.getElementById('admin-email').value,
            trialPeriod: document.getElementById('trial-period').value
        };

        db.ref('settings').update(settingsData).then(() => {
            alert("Settings updated successfully!");
        }).catch(error => {
            console.error("Settings Update Error:", error);
            alert("Failed to update settings.");
        });
    };
}
