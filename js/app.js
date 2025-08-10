// --- DOM Elements ---
const pageContainer = document.querySelector('body > div');
const messageBox = document.getElementById('message-box');

const pages = ['signin-page', 'signup-page', 'set-password-page', 'homepage'];

function showPage(pageId) {
    pages.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.classList.remove('active');
        }
    });
    document.getElementById(pageId).classList.add('active');
    hideMessage();
}

function displayMessage(message, type) {
    messageBox.textContent = message;
    messageBox.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-yellow-500');
    if (type === 'success') {
        messageBox.classList.add('bg-green-500', 'text-white');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-500', 'text-white');
    } else if (type === 'warning') {
        messageBox.classList.add('bg-yellow-500', 'text-white');
    }
}

function hideMessage() {
    messageBox.classList.add('hidden');
}

const setLoadingState = (button, isLoading) => {
    const originalText = button.getAttribute('data-original-text');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Loading...' : originalText;
};

// --- OTP Timer Logic ---
const otpControls = document.getElementById('otp-controls');
const sendOtpBtn = document.getElementById('send-otp-btn');
const resendOtpBtn = document.getElementById('resend-otp-btn');
const otpCountdown = document.getElementById('otp-countdown');
let countdownTimer = null;

function startOtpTimer() {
    let timeLeft = 60;
    otpControls.classList.remove('hidden');
    sendOtpBtn.classList.add('hidden');

    resendOtpBtn.disabled = true;
    resendOtpBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    resendOtpBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
    otpCountdown.textContent = `(Resend in ${timeLeft}s)`;

    countdownTimer = setInterval(() => {
        timeLeft--;
        otpCountdown.textContent = `(Resend in ${timeLeft}s)`;
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            resendOtpBtn.disabled = false;
            resendOtpBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            resendOtpBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
            otpCountdown.textContent = '';
        }
    }, 1000);
}

// --- Event Listeners with Fetch API Calls ---

// Sign In Page
const signinBtn = document.getElementById('signin-btn');
const goTosignup = document.getElementById('go-to-signup');
const signinEmailInput = document.getElementById('signin-email');
const signinPasswordInput = document.getElementById('signin-password');

// Sign Up Page
const signupEmailInput = document.getElementById('signup-email');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const signupOtpInput = document.getElementById('signup-otp');
const goToSignin = document.getElementById('go-to-signin');

// Set Password Page
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const setPasswordBtn = document.getElementById('set-password-btn');

// Homepage
const userEmailDisplay = document.getElementById('user-email-display');
const logoutBtn = document.getElementById('logout-btn');

// Save original button texts
signinBtn.setAttribute('data-original-text', signinBtn.textContent);
sendOtpBtn.setAttribute('data-original-text', sendOtpBtn.textContent);
resendOtpBtn.setAttribute('data-original-text', resendOtpBtn.textContent);
verifyOtpBtn.setAttribute('data-original-text', verifyOtpBtn.textContent);
setPasswordBtn.setAttribute('data-original-text', setPasswordBtn.textContent);

// Navigation
goTosignup.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('signup-page');
    signupEmailInput.value = '';
    signupOtpInput.value = '';
    otpControls.classList.add('hidden');
    sendOtpBtn.classList.remove('hidden');
});

goToSignin.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('signin-page');
    signinEmailInput.value = '';
    signinPasswordInput.value = '';
});

// 1. Sign In Button
signinBtn.addEventListener('click', async () => {
    const email = signinEmailInput.value;
    const password = signinPasswordInput.value;

    if (!email || !password) {
        displayMessage('Please enter both email and password.', 'error');
        return;
    }
    setLoadingState(signinBtn, true);

    try {
        const response = await fetch('/api/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok) {
            userEmailDisplay.textContent = email;
            showPage('homepage');
            displayMessage('Login successful! Welcome.', 'success');
        } else {
            displayMessage(result.message || 'Invalid email or password.', 'error');
        }
    } catch (error) {
        displayMessage('Network error. Please try again.', 'error');
    } finally {
        setLoadingState(signinBtn, false);
    }
});

// 2. Sign Up - Send OTP
const sendOtpLogic = async () => {
    const email = signupEmailInput.value;
    if (!email || !email.includes('@')) {
        displayMessage('Please enter a valid email address.', 'error');
        return;
    }

    setLoadingState(sendOtpBtn, true);

    try {
        const checkResponse = await fetch('/api/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const checkResult = await checkResponse.json();

        if (checkResult.userExists) {
            displayMessage('This email is already registered. Please sign in.', 'warning');
            setLoadingState(sendOtpBtn, false);
            return;
        }

        const otpResponse = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const otpResult = await otpResponse.json();

        if (otpResponse.ok) {
            displayMessage('A verification code has been sent to your email.', 'success');
            startOtpTimer();
        } else {
            displayMessage(otpResult.message || 'Failed to send OTP.', 'error');
        }
    } catch (error) {
        displayMessage('Network error. Please try again.', 'error');
    } finally {
        setLoadingState(sendOtpBtn, false);
    }
};

sendOtpBtn.addEventListener('click', sendOtpLogic);
resendOtpBtn.addEventListener('click', sendOtpLogic);

// 3. Sign Up - Verify OTP
verifyOtpBtn.addEventListener('click', async () => {
    const email = signupEmailInput.value;
    const otp = signupOtpInput.value;

    if (!otp) {
        displayMessage('Please enter the verification code.', 'error');
        return;
    }
    setLoadingState(verifyOtpBtn, true);

    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const result = await response.json();

        if (response.ok) {
            showPage('set-password-page');
            displayMessage('OTP verified successfully! Now create a password.', 'success');
        } else {
            displayMessage(result.message || 'Invalid OTP. Please try again.', 'error');
        }
    } catch (error) {
        displayMessage('Network error. Please try again.', 'error');
    } finally {
        setLoadingState(verifyOtpBtn, false);
    }
});

// 4. Set Password
setPasswordBtn.addEventListener('click', async () => {
    const email = signupEmailInput.value;
    const password = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    if (password.length < 6) {
        displayMessage('Password must be at least 6 characters long.', 'error');
        return;
    }
    if (password !== confirmPassword) {
        displayMessage('Passwords do not match.', 'error');
        return;
    }

    setLoadingState(setPasswordBtn, true);

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok) {
            signinEmailInput.value = email;
            showPage('signin-page');
            displayMessage('Account created! Please sign in with your new password.', 'success');
        } else {
            displayMessage(result.message || 'Failed to create account.', 'error');
        }
    } catch (error) {
        displayMessage('Network error. Please try again.', 'error');
    } finally {
        setLoadingState(setPasswordBtn, false);
    }
});

// 5. Log Out
logoutBtn.addEventListener('click', () => {
    signinEmailInput.value = '';
    signinPasswordInput.value = '';
    showPage('signin-page');
    displayMessage('You have been logged out.', 'success');
});

// Initial page load
document.addEventListener('DOMContentLoaded', () => {
    showPage('signin-page');
});