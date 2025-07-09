const API_BASE_URL = 'https://sowmiyabackend.vercel.app/api'; 

        // !!! SECURITY WARNING: Hardcoding admin credentials in frontend is NOT recommended for production.
        // This is for demonstration/testing purposes only to simplify admin access.
        // In a real application, admin roles are managed purely on the backend.
        const FIXED_ADMIN_EMAIL = 'admin@example.com'; 
        const FIXED_ADMIN_PASSWORD = 'adminpassword'; // <-- HARDCODED ADMIN PASSWORD

        // Get references to message box elements
        const messageBox = document.getElementById('messageBox');
        const messageText = document.getElementById('messageText');

        // Function to display messages (success or error)
        function showMessage(message, isError = false) {
            messageText.textContent = message;
            messageBox.classList.remove('error'); // Remove error class first
            if (isError) {
                messageBox.classList.add('error'); // Add error class if it's an error message
            }
            messageBox.classList.add('show'); // Make the message box visible
            // Automatically hide the message after 5 seconds
            setTimeout(() => {
                hideMessage();
            }, 5000);
        }

        // Function to hide the message box
        function hideMessage() {
            messageBox.classList.remove('show');
        }

        // Get references to main section DOM elements
        const authSection = document.getElementById('authSection');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const dataEntrySection = document.getElementById('dataEntrySection');
        const adminPanelSection = document.getElementById('adminPanelSection'); 

        // Get references to authentication buttons and inputs
        const showSignupBtn = document.getElementById('showSignup');
        const showLoginBtn = document.getElementById('showLogin');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn'); // Logout for regular users
        const adminLogoutBtn = document.getElementById('adminLogoutBtn'); // Logout for admin users

        const loginEmailInput = document.getElementById('loginEmail');
        const loginPasswordInput = document.getElementById('loginPassword');
        const signupEmailInput = document.getElementById('signupEmail');
        const signupPasswordInput = document.getElementById('signupPassword');

        // Get references to data form and admin table elements
        const dataForm = document.getElementById('dataForm');
        const dataTableBody = document.getElementById('dataTableBody'); // Table body for admin panel

        // Global state variables for authentication
        let authToken = localStorage.getItem('authToken') || null;       // Stores the JWT token
        let currentUserId = localStorage.getItem('currentUserId') || null; // Stores the user's ID
        let currentUserRole = localStorage.getItem('currentUserRole') || null; // Stores the user's role (user/admin)

        // --- View Management Functions ---
        // Function to control which main section is visible
        function showView(viewId) {
            // Hide all main sections first
            authSection.classList.add('hidden');
            dataEntrySection.classList.add('hidden');
            adminPanelSection.classList.add('hidden');

            // Show the requested section
            if (viewId === 'auth') {
                authSection.classList.remove('hidden');
                loginForm.classList.remove('hidden'); // Default to login form when showing auth
                signupForm.classList.add('hidden');
            } else if (viewId === 'dataEntry') {
                dataEntrySection.classList.remove('hidden');
            } else if (viewId === 'adminPanel') {
                adminPanelSection.classList.remove('hidden');
                loadAdminData(); // Load data specifically for the admin panel when it's shown
            }
        }

        // Function to toggle between login and signup forms within the auth section
        function toggleAuthForm(show) {
            if (show === 'signup') {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            } else { // show === 'login'
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            }
        }

        // --- Authentication Handlers ---
        // Checks the authentication status on page load and displays the appropriate view
        async function checkAuthStatus() {
            if (authToken && currentUserId && currentUserRole) {
                // If token and user info exist, assume logged in and show appropriate panel
                showMessage(`Welcome back! You are logged in as ${currentUserRole}.`, false);
                if (currentUserRole === 'admin') {
                    showView('adminPanel');
                } else {
                    showView('dataEntry');
                }
            } else {
                // If no token, show the authentication section
                showView('auth');
            }
        }

        // Event listener for the Login button
        loginBtn.addEventListener('click', async () => {
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

            if (!email || !password) {
                showMessage('Please enter both email and password.', true);
                return;
            }

            // Check if the entered email and password match the fixed admin credentials
            if (email === FIXED_ADMIN_EMAIL && password === FIXED_ADMIN_PASSWORD) {
                try {
                    // Attempt to log in the fixed admin email via the backend
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();
                    // Crucially, verify the backend also confirms it's an admin.
                    // This prevents unauthorized access if someone guesses the hardcoded email/password.
                    if (response.ok && data.role === 'admin') { 
                        authToken = data.token;
                        currentUserId = data.userId;
                        currentUserRole = data.role; 
                        localStorage.setItem('authToken', authToken);
                        localStorage.setItem('currentUserId', currentUserId);
                        localStorage.setItem('currentUserRole', currentUserRole);

                        showMessage('Admin login successful!', false);
                        showView('adminPanel'); // Directly show admin panel
                    } else {
                        // If backend doesn't confirm admin role or login fails
                        showMessage(`Admin login failed: ${data.message || 'Invalid credentials or not an admin account'}`, true);
                    }
                } catch (error) {
                    console.error("Admin login error:", error);
                    showMessage(`Admin login failed: ${error.message}`, true);
                }
            } else {
                // Regular user login flow (or if fixed admin credentials don't match)
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
                        currentUserRole = data.role; 
                        localStorage.setItem('authToken', authToken);
                        localStorage.setItem('currentUserId', currentUserId);
                        localStorage.setItem('currentUserRole', currentUserRole);

                        showMessage('Login successful!', false);
                        if (currentUserRole === 'admin') { // Fallback in case a regular login returns admin role
                            showView('adminPanel');
                        } else {
                            showView('dataEntry');
                        }
                    } else {
                        showMessage(`Login failed: ${data.message || 'Invalid credentials'}`, true);
                    }
                } catch (error) {
                    console.error("Login error:", error);
                    showMessage(`Login failed: ${error.message}`, true);
                }
            }
        });

        // Event listener for the Sign Up button
        signupBtn.addEventListener('click', async () => {
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;

            if (!email || !password) {
                showMessage('Please enter both email and password.', true);
                return;
            }

            try {
                // Send signup request to the backend
                const response = await fetch(`${API_BASE_URL}/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json(); // Parse the JSON response
                if (response.ok) {
                    // Store token, user ID, and role (should be 'user' for signup)
                    authToken = data.token;
                    currentUserId = data.userId;
                    currentUserRole = data.role; 
                    localStorage.setItem('authToken', authToken);
                    localStorage.setItem('currentUserId', currentUserId);
                    localStorage.setItem('currentUserRole', currentUserRole);

                    showMessage('Sign up successful! You are now logged in.', false);
                    showView('dataEntry'); // Show data entry form after successful signup
                } else {
                    // Display error message from backend
                    showMessage(`Sign up failed: ${data.message || 'Email already in use or weak password'}`, true);
                }
            } catch (error) {
                console.error("Sign up error:", error);
                showMessage(`Sign up failed: ${error.message}`, true); // Display network/fetch error
            }
        });

        // Function to perform logout (clears local storage and shows auth view)
        function performLogout() {
            authToken = null;
            currentUserId = null;
            currentUserRole = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUserRole');
            showMessage('Logged out successfully.', false);
            showView('auth'); // Redirect to authentication view
        }

        // Event listeners for logout buttons (both user and admin logout use the same function)
        logoutBtn.addEventListener('click', performLogout); 
        adminLogoutBtn.addEventListener('click', performLogout); 

        // --- Data Entry Form Submission (interacting with backend) ---
        dataForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            // Ensure user is authenticated and has 'user' role before submitting
            if (!authToken || !currentUserId || currentUserRole !== 'user') {
                showMessage('You must be logged in as a user to submit data.', true);
                performLogout(); // Force logout if not authenticated or wrong role
                return;
            }

            // Collect form data
            const formData = {
                fullName: document.getElementById('fullName').value,
                age: parseInt(document.getElementById('age').value),
                gender: document.getElementById('gender').value,
                education: document.getElementById('education').value,
                occupation: document.getElementById('occupation').value,
                aiInterest: document.querySelector('input[name="aiInterest"]:checked')?.value || 'N/A',
                hobbies: Array.from(document.querySelectorAll('input[name="hobbies"]:checked')).map(cb => cb.value),
                feedback: document.getElementById('feedback').value,
                userId: currentUserId // Link data to the currently logged-in user
            };

            try {
                // Send survey response data to the backend
                const response = await fetch(`${API_BASE_URL}/survey-responses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}` // Send JWT for authentication
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json(); // Parse the response
                if (response.ok) {
                    showMessage('Data submitted successfully!', false);
                    dataForm.reset(); // Clear the form after successful submission
                } else {
                    showMessage(`Error submitting data: ${result.message || response.statusText}`, true);
                }
            } catch (error) {
                console.error("Error submitting data:", error);
                showMessage(`Error submitting data: ${error.message}`, true); // Display network/fetch error
            }
        });

        // --- Admin Panel Functions (interacting with backend) ---
        // Function to load all survey data for the admin panel
        async function loadAdminData() {
            dataTableBody.innerHTML = ''; // Clear existing table rows

            // Ensure admin is authenticated and has 'admin' role
            if (!authToken || currentUserRole !== 'admin') {
                showMessage('Admin not authenticated or not an admin. Please log in as admin.', true);
                performLogout(); 
                return;
            }

            try {
                // Fetch all survey responses from the backend (admin-protected endpoint)
                const response = await fetch(`${API_BASE_URL}/survey-responses`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}` // Send admin JWT for authorization
                    }
                });

                const data = await response.json(); // Parse the response

                if (!response.ok) {
                    showMessage(`Error loading data: ${data.message || response.statusText}`, true);
                    // If token is invalid/expired or unauthorized, force logout
                    if (response.status === 401 || response.status === 403) {
                        performLogout();
                    }
                    return;
                }

                if (data.length === 0) {
                    // Display message if no data is available
                    const row = dataTableBody.insertRow();
                    const cell = row.insertCell(0);
                    cell.colSpan = 10; // Span across all columns
                    cell.className = 'py-3 px-4 text-center text-gray-500';
                    cell.textContent = 'No data available.';
                    return;
                }

                // Populate the table with fetched data
                data.forEach((item) => {
                    const row = dataTableBody.insertRow();
                    row.className = 'hover:bg-gray-50'; // Add hover effect to rows

                    // Insert data into table cells
                    row.insertCell(0).textContent = item.userId ? item.userId.email : 'N/A'; // User email from populated field
                    row.insertCell(1).textContent = item.fullName || '';
                    row.insertCell(2).textContent = item.age || '';
                    row.insertCell(3).textContent = item.gender || '';
                    row.insertCell(4).textContent = item.education || '';
                    row.insertCell(5).textContent = item.occupation || '';
                    row.insertCell(6).textContent = item.aiInterest || '';
                    row.insertCell(7).textContent = Array.isArray(item.hobbies) ? item.hobbies.join(', ') : (item.hobbies || '');
                    row.insertCell(8).textContent = item.feedback || '';
                    row.insertCell(9).textContent = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';

                    // Apply Tailwind classes to all cells for consistent styling
                    Array.from(row.cells).forEach(cell => {
                        cell.className = 'py-3 px-4 border-b border-gray-200 text-sm text-gray-800';
                    });
                });
            } catch (error) {
                console.error("Error loading admin data:", error);
                showMessage(`Error loading data: ${error.message}`, true); // Display network/fetch error
            }
        }

        // Event listener for the Download Data button (admin panel)
        const downloadDataBtn = document.getElementById('downloadDataBtn');
        downloadDataBtn.addEventListener('click', async () => {
            // Ensure admin is authenticated and has 'admin' role
            if (!authToken || currentUserRole !== 'admin') {
                showMessage('Admin not authenticated or not an admin. Cannot download data.', true);
                performLogout();
                return;
            }

            try {
                // Fetch all survey data for CSV download
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

                // Prepare CSV content with headers
                const headers = [
                    "User Email", "Full Name", "Age", "Gender", "Education", "Occupation",
                    "AI Interest", "Hobbies", "Feedback", "Timestamp"
                ];
                let csvContent = headers.join(',') + '\n';

                // Add data rows, handling commas and quotes in string fields
                data.forEach(row => {
                    const values = [
                        (row.userId ? row.userId.email : 'N/A') || '',
                        `"${(row.fullName || '').replace(/"/g, '""')}"`, // Escape double quotes
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

                // Create a Blob from the CSV content and trigger download
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) { // Feature detection for download attribute
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `all_user_data_${new Date().toISOString().slice(0,10)}.csv`);
                    link.style.visibility = 'hidden'; // Hide the link
                    document.body.appendChild(link);
                    link.click(); // Programmatically click the link to trigger download
                    document.body.removeChild(link); // Clean up the link
                    showMessage('Data downloaded successfully!', false);
                } else {
                    showMessage('Your browser does not support downloading files directly.', true);
                }

            } catch (error) {
                console.error("Error downloading data:", error);
                showMessage(`Error downloading data: ${error.message}`, true); // Display network/fetch error
            }
        });


        // --- Event Listeners for Authentication Form Navigation ---
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            toggleAuthForm('signup'); // Show signup form
        });

        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            toggleAuthForm('login'); // Show login form
        });

        // Initialize the application when the window finishes loading
        window.onload = checkAuthStatus;