document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    loadWalletInterface();
});

async function loadWalletInterface() {
    const response = await fetch('/api/wallet');
    if (response.ok) {
        renderWalletView();
    } else {
        renderLoadWalletView();
    }
}

function renderLoadWalletView() {
    document.getElementById('app-content').innerHTML = `
        <div class="col-md-8 mx-auto">
            <div class="card wallet-card">
                <div class="card-header bg-primary text-white">
                    <h5><i class="bi bi-key"></i> Load Wallet</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="privateKey" class="form-label">Private Key</label>
                        <textarea class="form-control" id="privateKey" rows="3"></textarea>
                    </div>
                    <button class="btn btn-primary" id="loadWalletBtn">Load Wallet</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('loadWalletBtn').addEventListener('click', loadWallet);
}

async function loadWallet() {
    const privateKey = document.getElementById('privateKey').value.trim();
    if (!privateKey) return;
    
    const response = await fetch('/api/load_wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ private_key: privateKey })
    });
    
    if (response.ok) {
        renderWalletView();
    }
}

function renderWalletView() {
    document.getElementById('app-content').innerHTML = `
        <div class="col-md-4">
            <div class="card wallet-card mb-4">
                <div class="card-body">
                    <h5>Balance</h5>
                    <div id="walletBalance">Loading...</div>
                </div>
            </div>
        </div>
        <div class="col-md-8">
            <div class="card wallet-card">
                <div class="card-body">
                    <h5>Transactions</h5>
                    <div id="transactions">Loading...</div>
                </div>
            </div>
        </div>
    `;
    
    updateWalletData();
}

async function updateWalletData() {
    const response = await fetch('/api/wallet');
    if (response.ok) {
        const data = await response.json();
        document.getElementById('walletBalance').textContent = data.balance;
        // Render transactions...
    }
}
