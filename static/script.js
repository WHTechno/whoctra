// App State
let walletLoaded = false;
let pendingTransaction = null;

// DOM Elements
const elements = {
    // Views
    welcomeView: document.getElementById('welcome-view'),
    walletView: document.getElementById('wallet-view'),
    
    // Load Wallet
    privateKeyInput: document.getElementById('private_key'),
    toggleVisibilityBtn: document.getElementById('toggleVisibility'),
    loadButton: document.getElementById('loadButton'),
    generateButton: document.getElementById('generateButton'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage'),
    
    // Wallet Info
    address: document.getElementById('address'),
    balance: document.getElementById('balance'),
    nonce: document.getElementById('nonce'),
    pendingTxs: document.getElementById('pending_txs'),
    
    // Send Form
    sendForm: document.getElementById('send-form'),
    toAddress: document.getElementById('to_address'),
    amount: document.getElementById('amount'),
    sendButton: document.getElementById('send-button'),
    
    // Transactions
    transactions: document.getElementById('transactions'),
    
    // Confirmation Modal
    confirmationModal: document.getElementById('confirmation-modal'),
    confirmAmount: document.getElementById('confirm-amount'),
    confirmAddress: document.getElementById('confirm-address'),
    confirmButton: document.getElementById('confirm-button')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    elements.loadButton.addEventListener('click', loadWallet);
    elements.generateButton.addEventListener('click', generateNewWallet);
    elements.toggleVisibilityBtn.addEventListener('click', toggleKeyVisibility);
    elements.sendForm.addEventListener('submit', sendTransaction);
    elements.confirmButton.addEventListener('click', confirmTransaction);

    const savedWallet = localStorage.getItem('octraWallet');
    if (savedWallet) {
        try {
            const walletData = JSON.parse(savedWallet);
            loadWalletFromStorage(walletData.privateKey);
        } catch (e) {
            console.error('Failed to load saved wallet', e);
            showError('Failed to load saved wallet');
        }
    }
});

// Toggle private key visibility
function toggleKeyVisibility() {
    if (elements.privateKeyInput.type === 'password') {
        elements.privateKeyInput.type = 'text';
        elements.toggleVisibilityBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`;
    } else {
        elements.privateKeyInput.type = 'password';
        elements.toggleVisibilityBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    }
}

// Load wallet from private key
async function loadWallet(event) {
    if (event) event.preventDefault();
    const privateKey = elements.privateKeyInput.value.trim();
    if (!privateKey) {
        showError('Please enter a base64 private key');
        return;
    }

    showLoading();
    try {
        const response = await fetch('/api/load_wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ private_key: privateKey })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to load wallet');
        }

        const data = await response.json();
        showSuccess(`Wallet loaded! Address: ${data.address}`);
        localStorage.setItem('octraWallet', JSON.stringify({ privateKey }));
        showWalletView();
        await fetchWallet();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
        elements.privateKeyInput.value = '';
    }
}

// Load wallet from storage
async function loadWalletFromStorage(privateKey) {
    showLoading();
    try {
        const response = await fetch('/api/load_wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ private_key: privateKey })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to load wallet');
        }

        const data = await response.json();
        showSuccess(`Wallet loaded! Address: ${data.address}`);
        showWalletView();
        await fetchWallet();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Generate new wallet
function generateNewWallet() {
    showError('Wallet generation feature is coming soon!');
}

// Fetch wallet data
async function fetchWallet() {
    if (!walletLoaded) return;
    showLoading();
    try {
        const response = await fetch('/api/wallet');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch wallet data');
        }

        const data = await response.json();
        updateWalletUI(data);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Update wallet UI
function updateWalletUI(data) {
    elements.address.textContent = data.address;

    const balance = parseFloat(data.balance);
    elements.balance.textContent = isNaN(balance) ? '0.000000' : balance.toFixed(6);

    elements.nonce.textContent = data.nonce ?? '0';
    elements.pendingTxs.textContent = (data.pending_transactions?.length || 0).toString();
    renderTransactions(data.transactions || []);
}

// Render transactions
function renderTransactions(transactions) {
    elements.transactions.innerHTML = transactions.slice(0, 10).map(tx => {
        const amt = parseFloat(tx.amt);
        const amtStr = isNaN(amt) ? '0.000000' : amt.toFixed(6);
        return `
        <tr class="${tx.type === 'in' ? 'bg-green-50' : 'bg-red-50'}">
            <td class="p-3">${tx.time || '-'}</td>
            <td class="p-3 ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}">
                ${tx.type === 'in' ? 'Received' : 'Sent'}
            </td>
            <td class="p-3">${amtStr} OCT</td>
            <td class="p-3 break-all">${tx.to?.substring(0, 10) || ''}...</td>
            <td class="p-3">${tx.epoch ? `Epoch ${tx.epoch}` : 'Pending'}</td>
        </tr>
        `;
    }).join('');
}

// Send transaction
async function sendTransaction(event) {
    event.preventDefault();
    const to = elements.toAddress.value.trim();
    const amount = parseFloat(elements.amount.value);
    if (!to || !amount || amount <= 0) {
        showError('Please enter a valid address and amount');
        return;
    }

    pendingTransaction = { to, amount };
    elements.confirmAmount.textContent = amount.toFixed(6);
    elements.confirmAddress.textContent = to.substring(0, 10) + '...';
    elements.confirmationModal.classList.remove('hidden');
}

// Confirm transaction
async function confirmTransaction() {
    if (!pendingTransaction) return;
    showLoading();
    try {
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingTransaction)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Transaction failed');
        }

        const data = await response.json();
        showSuccess(`Transaction sent! Hash: ${data.tx_hash}`);
        elements.toAddress.value = '';
        elements.amount.value = '';
        await fetchWallet();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
        elements.confirmationModal.classList.add('hidden');
        pendingTransaction = null;
    }
}

// Cancel transaction
function cancelTransaction() {
    elements.confirmationModal.classList.add('hidden');
    pendingTransaction = null;
}

// UI Helpers
function showLoading() {
    elements.loadingIndicator.classList.remove('hidden');
    if (elements.loadButton) elements.loadButton.disabled = true;
    if (elements.sendButton) elements.sendButton.disabled = true;
    if (elements.confirmButton) elements.confirmButton.disabled = true;
}

function hideLoading() {
    elements.loadingIndicator.classList.add('hidden');
    if (elements.loadButton) elements.loadButton.disabled = false;
    if (elements.sendButton) elements.sendButton.disabled = false;
    if (elements.confirmButton) elements.confirmButton.disabled = false;
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => elements.errorMessage.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successMessage.classList.remove('hidden');
    setTimeout(() => elements.successMessage.classList.add('hidden'), 5000);
}

function showWalletView() {
    elements.welcomeView.classList.add('hidden');
    elements.walletView.classList.remove('hidden');
    walletLoaded = true;
}
