const API_BASE_URL = 'http://localhost:3000/api'; // IMPORTANT: Change this if your backend runs on a different port/host

        // Initialize message box
        const messageBox = document.getElementById('messageBox');
        const messageText = document.getElementById('messageText');

        function showMessage(message, isError = false) {
            messageText.textContent = message;
            messageBox.classList.remove('error');
            if (isError) {
                messageBox.classList.add('error');
            }
            messageBox.classList.add('show');
            setTimeout(() => {
                hideMessage();
            }, 5000); // Hide after 5 seconds
        }

        function hideMessage() {
            messageBox.classList.remove('show');
        }

        // DOM Elements
        const authSection = document.getElementById('authSection');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const dataEntrySection = document.getElementById('dataEntrySection');
        const adminPanelSection = document.getElementById('adminPanelSection');

        const showSignupBtn = document.getElementById('showSignup');
        const showLoginBtn = document.getElementById('showLogin');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const showAdminPanelBtn = document.getElementById('showAdminPanelBtn');
        const backToDataEntryBtn = document.getElementById('backToDataEntryBtn');
        const downloadDataBtn = document.getElementById('downloadDataBtn');

        const loginEmailInput = document.getElementById('loginEmail');
        const loginPasswordInput = document.getElementById('loginPassword');
        const signupEmailInput = document.getElementById('signupEmail');
        const signupPasswordInput = document.getElementById('signupPassword');

        const dataForm = document.getElementById('dataForm');
        const dataTableBody = document.getElementById('dataTableBody');

        // Global state for authentication (token and user ID)
        let authToken = localStorage.getItem('authToken') || null;
        let currentUserId = localStorage.getItem('currentUserId') || null;

        // --- View Management Functions ---
        function showView(viewId) {
            authSection.classList.add('hidden');
            dataEntrySection.classList.add('hidden');
            adminPanelSection.classList.add('hidden');

            if (viewId === 'auth') {
                authSection.classList.remove('hidden');
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
            } else if (viewId === 'dataEntry') {
                dataEntrySection.classList.remove('hidden');
            } else if (viewId === 'adminPanel') {
                adminPanelSection.classList.remove('hidden');
                loadAdminData(); // Load data when admin panel is shown
            }
        }

        function toggleAuthForm(show) {
            if (show === 'signup') {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            } else { // show === 'login'
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            }
        }

        // --- Authentication Handlers (now interacting with backend) ---
        async function checkAuthStatus() {
            if (authToken && currentUserId) {
                // In a real app, you'd validate the token with the backend here
                // For this demo, we'll assume if token and ID exist, user is logged in
                showMessage(`Welcome back! You are logged in.`, false);
                showView('dataEntry');
            } else {
                showView('auth');
            }
        }

        loginBtn.addEventListener('click', async () => {
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            if (!email || !password) {
                showMessage('Please enter both email and password.', true);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    authToken = data.token;
                    currentUserId = data.userId;
                    localStorage.setItem('authToken', authToken);
                    localStorage.setItem('currentUserId', currentUserId);
                    showMessage('Login successful!', false);
                    showView('dataEntry');
                } else {
                    showMessage(`Login failed: ${data.message || 'Invalid credentials'}`, true);
                }
            } catch (error) {
                console.error("Login error:", error);
                showMessage(`Login failed: ${error.message}`, true);
            }
        });

        signupBtn.addEventListener('click', async () => {
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;
            if (!email || !password) {
                showMessage('Please enter both email and password.', true);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (response.ok) {
                    authToken = data.token;
                    currentUserId = data.userId;
                    localStorage.setItem('authToken', authToken);
                    localStorage.setItem('currentUserId', currentUserId);
                    showMessage('Sign up successful! You are now logged in.', false);
                    showView('dataEntry');
                } else {
                    showMessage(`Sign up failed: ${data.message || 'Email already in use or weak password'}`, true);
                }
            } catch (error) {
                console.error("Sign up error:", error);
                showMessage(`Sign up failed: ${error.message}`, true);
            }
        });

        logoutBtn.addEventListener('click', () => {
            authToken = null;
            currentUserId = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            showMessage('Logged out successfully.', false);
            showView('auth');
        });

        // --- Data Entry Form Submission (now interacting with backend) ---
        dataForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!authToken || !currentUserId) {
                showMessage('You must be logged in to submit data.', true);
                showView('auth');
                return;
            }

            const formData = {
                fullName: document.getElementById('fullName').value,
                age: parseInt(document.getElementById('age').value),
                gender: document.getElementById('gender').value,
                education: document.getElementById('education').value,
                occupation: document.getElementById('occupation').value,
                aiInterest: document.querySelector('input[name="aiInterest"]:checked')?.value || 'N/A',
                hobbies: Array.from(document.querySelectorAll('input[name="hobbies"]:checked')).map(cb => cb.value),
                feedback: document.getElementById('feedback').value,
                userId: currentUserId // Include userId for backend to associate data
            };

            try {
                const response = await fetch(`${API_BASE_URL}/survey-responses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}` // Send token for authentication
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                if (response.ok) {
                    showMessage('Data submitted successfully!', false);
                    dataForm.reset(); // Clear the form
                } else {
                    showMessage(`Error submitting data: ${result.message || response.statusText}`, true);
                }
            } catch (error) {
                console.error("Error submitting data:", error);
                showMessage(`Error submitting data: ${error.message}`, true);
            }
        });

        // --- Admin Panel Functions (now interacting with backend) ---
        async function loadAdminData() {
            dataTableBody.innerHTML = ''; // Clear existing table rows

            if (!authToken || !currentUserId) {
                showMessage('You must be logged in to view admin data.', true);
                showView('auth');
                return;
            }

            try {
                // This endpoint will fetch ALL survey data, assuming the backend handles admin authorization
                const response = await fetch(`${API_BASE_URL}/survey-responses`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}` // Send token for authorization
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    showMessage(`Error loading data: ${data.message || response.statusText}`, true);
                    return;
                }

                if (data.length === 0) {
                    const row = dataTableBody.insertRow();
                    const cell = row.insertCell(0);
                    cell.colSpan = 10;
                    cell.className = 'py-3 px-4 text-center text-gray-500';
                    cell.textContent = 'No data available.';
                    return;
                }

                data.forEach((item) => {
                    const row = dataTableBody.insertRow();
                    row.className = 'hover:bg-gray-50';

                    row.insertCell(0).textContent = item.userId || 'N/A';
                    row.insertCell(1).textContent = item.fullName || '';
                    row.insertCell(2).textContent = item.age || '';
                    row.insertCell(3).textContent = item.gender || '';
                    row.insertCell(4).textContent = item.education || '';
                    row.insertCell(5).textContent = item.occupation || '';
                    row.insertCell(6).textContent = item.aiInterest || '';
                    row.insertCell(7).textContent = Array.isArray(item.hobbies) ? item.hobbies.join(', ') : (item.hobbies || '');
                    row.insertCell(8).textContent = item.feedback || '';
                    row.insertCell(9).textContent = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';

                    Array.from(row.cells).forEach(cell => {
                        cell.className = 'py-3 px-4 border-b border-gray-200 text-sm text-gray-800';
                    });
                });
            } catch (error) {
                console.error("Error loading admin data:", error);
                showMessage(`Error loading data: ${error.message}`, true);
            }
        }

        downloadDataBtn.addEventListener('click', async () => {
            if (!authToken || !currentUserId) {
                showMessage('You must be logged in to download data.', true);
                showView('auth');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/survey-responses`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    showMessage(`Error fetching data for download: ${data.message || response.statusText}`, true);
                    return;
                }

                if (data.length === 0) {
                    showMessage('No data to download.', true);
                    return;
                }

                // Prepare CSV content
                const headers = [
                    "User ID", "Full Name", "Age", "Gender", "Education", "Occupation",
                    "AI Interest", "Hobbies", "Feedback", "Timestamp"
                ];
                let csvContent = headers.join(',') + '\n';

                data.forEach(row => {
                    const values = [
                        row.userId || '',
                        `"${(row.fullName || '').replace(/"/g, '""')}"`, // Handle commas and quotes
                        row.age || '',
                        row.gender || '',
                        `"${(row.education || '').replace(/"/g, '""')}"`,
                        `"${(row.occupation || '').replace(/"/g, '""')}"`,
                        row.aiInterest || '',
                        `"${(Array.isArray(row.hobbies) ? row.hobbies.join('; ') : (row.hobbies || '')).replace(/"/g, '""')}"`,
                        `"${(row.feedback || '').replace(/"/g, '""')}"`,
                        row.timestamp ? new Date(row.timestamp).toLocaleString() : ''
                    ];
                    csvContent += values.join(',') + '\n';
                });

                // Create a Blob and download it
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) { // Feature detection for download attribute
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `user_data_${new Date().toISOString().slice(0,10)}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showMessage('Data downloaded successfully!', false);
                } else {
                    showMessage('Your browser does not support downloading files directly.', true);
                }

            } catch (error) {
                console.error("Error downloading data:", error);
                showMessage(`Error downloading data: ${error.message}`, true);
            }
        });


        // --- Event Listeners for Navigation ---
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthForm('signup');
        });

        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthForm('login');
        });

        showAdminPanelBtn.addEventListener('click', () => {
            showView('adminPanel');
        });

        backToDataEntryBtn.addEventListener('click', () => {
            showView('dataEntry');
        });

        // Initialize the app on window load
        window.onload = checkAuthStatus;
