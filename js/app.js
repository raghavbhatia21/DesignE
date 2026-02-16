const clientsList = document.getElementById('clients-list');
const clientForm = document.getElementById('client-form');
const clientModal = document.getElementById('client-modal');

// Initial Load
db.ref('licenses').on('value', snapshot => {
    const data = snapshot.val();
    renderClients(data);
    updateStats(data);
});

// Tab Switching Logic
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

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

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight: 600">${client.clientName}</div>
            </td>
            <td><code>${id}</code></td>
            <td>${expiryDate.toLocaleDateString()}</td>
            <td><span class="days-left ${daysClass}">${daysLeft} Days</span></td>
            <td>
                <button class="status-toggle ${client.isActive ? 'active' : 'inactive'}" 
                    onclick="toggleStatus('${id}', ${client.isActive})">
                    ${client.isActive ? 'ACTIVE' : 'SUSPENDED'}
                </button>
            </td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="editClient('${id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteClient('${id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        clientsList.appendChild(row);
    });
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
        document.getElementById('edit-id').value = id;
        clientModal.classList.add('active');
    });
};

window.deleteClient = (id) => {
    if (confirm(`Are you sure you want to remove license ${id}? This will block that client's service.`)) {
        db.ref(`licenses/${id}`).remove();
    }
};
