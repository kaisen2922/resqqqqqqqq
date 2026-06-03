// ─── Map Globals ───────────────────────────────────────────

    let locMap, hospMap, trackMap;

    let trackAmbMarker, tl1Marker, tl2Marker;

    const tollygunge = [22.4955, 88.3476];
    let sosLocation = null;
    let lastFreeFallTime = 0;
    let gravityX = 0, gravityY = 0, gravityZ = 0;

    // Use standard OpenStreetMap colorful tiles

    const mapTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    let userIcon, hospIcon, ambulanceIcon;

    function initApp() {
        try {
            if (typeof L !== 'undefined') {
                userIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="user-dot"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });

                hospIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="hospital-pin"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                ambulanceIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="hospital-pin" style="background:var(--accent-red);font-size:16px;box-shadow:0 0 14px var(--accent-red-glow);border-color:#fff;">🚑</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                // Map 1: Location Selection
                locMap = L.map('loc-map-container', { zoomControl: false, attributionControl: false }).setView(tollygunge, 15);
                L.tileLayer(mapTiles, { maxZoom: 20 }).addTo(locMap);

                // Map 2: Hospital List
                hospMap = L.map('hosp-map-container', { zoomControl: false, attributionControl: false, dragging: false }).setView(tollygunge, 14);
                L.tileLayer(mapTiles, { maxZoom: 20 }).addTo(hospMap);
                L.marker(tollygunge, { icon: userIcon }).addTo(hospMap);
                L.marker([22.4925, 88.3456], { icon: hospIcon }).addTo(hospMap);
                L.marker([22.4975, 88.3440], { icon: hospIcon }).addTo(hospMap);
                L.marker([22.4938, 88.3662], { icon: hospIcon }).addTo(hospMap);
                L.marker([22.5085, 88.3630], { icon: hospIcon }).addTo(hospMap);

                // Map 3: Live Tracking
                trackMap = L.map('track-map-container', { zoomControl: false, attributionControl: false }).setView([22.4940, 88.3466], 15);
                L.tileLayer(mapTiles, { maxZoom: 20 }).addTo(trackMap);
            } else {
                console.warn("Leaflet library L is not defined. Deferring map renders.");
            }
        } catch (e) {
            console.error("Leaflet initialization failed: ", e);
        }

        // Trigger screen entrance animation
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.add('fade-enter');
        }

        // Initialize Safety SOS System
        try {
            initSafetySystem();
        } catch (e) {
            console.error("Safety system initialization failed: ", e);
        }
    }

    // Listen for messages from iframes to prevent cross-origin SecurityErrors
    window.addEventListener('message', function(event) {
        if (!event.data) return;
        if (event.data.type === 'openAmbulancePortal') {
            openAmbulancePortal();
        } else if (event.data.type === 'toggleChat') {
            toggleChat();
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initApp();
    } else {
        window.addEventListener('load', initApp);
    }

    // ─── Navigation ───────────────────────────────────────────

    function navigate(screenId) {

        const currentActive = document.querySelector('.screen.active');

        if (currentActive) {

            currentActive.classList.add('fade-exit');

            setTimeout(() => {

                currentActive.classList.remove('active', 'fade-exit');

            }, 180);

        }

        setTimeout(() => {

            const target = document.getElementById(screenId);

            target.classList.add('active', 'fade-enter');

            setTimeout(() => target.classList.remove('fade-enter'), 400);

        }, 180);

        // Map invalidation

        if (screenId === 'location-screen' && locMap) setTimeout(() => locMap.invalidateSize(), 260);

        if (screenId === 'hospital-list-screen' && hospMap) setTimeout(() => hospMap.invalidateSize(), 260);

        if (screenId === 'tracking-screen' && trackMap) setTimeout(() => trackMap.invalidateSize(), 260);

        // Profile view/edit reset

        if (screenId === 'profile-screen') {

            document.getElementById('profile-view-mode').style.display = 'block';

            document.getElementById('profile-edit-mode').style.display = 'none';

        }

        // Toggle chatbot floating button visibility to avoid overlapping interactive buttons on settings/profile screens
        const cbBtn = document.getElementById('chatbot-btn');
        if (cbBtn) {
            if (screenId === 'home-screen') {
                cbBtn.style.display = 'flex';
            } else {
                cbBtn.style.display = 'none';
            }
        }

        // Toggle blood floating button visibility
        const bloodBtn = document.getElementById('blood-btn');
        if (bloodBtn) {
            if (screenId === 'home-screen') {
                bloodBtn.style.display = 'flex';
            } else {
                bloodBtn.style.display = 'none';
            }
        }
    }

    function openAmbulancePortal() {
        const iframe = document.getElementById('ambulance-portal-iframe');
        if (iframe) {
            iframe.src = 'ambulance.html?v=' + Date.now();
        }
        navigate('ambulance-portal-screen');
    }

    function openBloodPortal() {
        const iframe = document.getElementById('blood-portal-iframe');
        if (iframe) {
            const isLight = document.getElementById('app-container').classList.contains('light-theme');
            iframe.src = 'Request.html?v=' + Date.now();
            iframe.onload = () => {
                iframe.contentWindow.postMessage({ type: 'theme', theme: isLight ? 'light' : 'dark' }, '*');
            };
        }
        navigate('blood-portal-screen');
    }

    // ─── Theme Toggle ─────────────────────────────────────────

    function toggleTheme() {

        const container = document.getElementById('app-container');

        const toggleBtn = document.getElementById('theme-toggle-btn');

        container.classList.toggle('light-theme');

        const isLight = container.classList.contains('light-theme');

        if (isLight) {

            toggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

        } else {

            toggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

        }

        // Propagate theme update to chatbot iframe
        const cbIframe = document.getElementById('chatbot-iframe');
        if (cbIframe && cbIframe.contentWindow) {
            cbIframe.contentWindow.postMessage({ type: 'theme', theme: isLight ? 'light' : 'dark' }, '*');
        }

        // Propagate theme update to blood portal iframe
        const bloodIframe = document.getElementById('blood-portal-iframe');
        if (bloodIframe && bloodIframe.contentWindow) {
            bloodIframe.contentWindow.postMessage({ type: 'theme', theme: isLight ? 'light' : 'dark' }, '*');
        }

    }

    // ─── Severity Selector ────────────────────────────────────

    function setSeverity(el, type) {

        document.querySelectorAll('.severity-pill').forEach(p => p.classList.remove('active'));

        el.classList.add('active');

    }

    // ─── Condition Chip Toggle ────────────────────────────────

    function toggleChip(el) {

        el.classList.toggle('active');

    }

    // ─── Hospital Card Expand ─────────────────────────────────

    function toggleHospitalCard(el) {

        el.classList.toggle('expanded');

    }

    // ─── Payment Fields ───────────────────────────────────────

    function togglePaymentFields() {

        const method = document.getElementById('payment-method').value;

        document.getElementById('upi-fields').style.display = method === 'upi' ? 'block' : 'none';

        document.getElementById('card-fields').style.display = method === 'card' ? 'block' : 'none';

        document.getElementById('cash-fields').style.display = method === 'cash' ? 'block' : 'none';

    }

    // ─── Payment Processing ───────────────────────────────────

    function processPayment() {

        const patientName = document.getElementById('patient-name').value;

        const patientPhone = document.getElementById('patient-phone').value;

        if (!patientName || !patientPhone) {

            alert('Please fill in patient name and phone number on the previous screen.');

            navigate('booking-screen');

            return;

        }

        const btn = document.getElementById('pay-btn');

        const method = document.getElementById('payment-method').value;

        btn.innerHTML = `<span style="display:flex;align-items:center;gap:8px;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.5);border-top-color:white;border-radius:50%;animation:typingBounce 0.6s linear infinite;"></span> Authenticating...</span>`;

        btn.disabled = true;

        btn.style.opacity = '0.75';

        setTimeout(() => {

            btn.innerHTML = method === 'cash' ? '⌛ Confirming Booking...' : '⌛ Processing Payment...';

        }, 1200);

        setTimeout(() => {

            btn.innerHTML = '✅ Payment Successful!';

            btn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';

            btn.style.boxShadow = '0 8px 24px -6px rgba(16,185,129,0.5)';

            btn.style.opacity = '1';

            setTimeout(() => {

                navigate('tracking-screen');

                startTrackingPhase1();

                // Reset

                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Pay & Confirm ₹1,200';

                btn.disabled = false;

                btn.style.background = '';

                btn.style.boxShadow = '';

            }, 1200);

        }, 2800);

    }

    // ─── Tracking Phase 1 ─────────────────────────────────────

    function startTrackingPhase1() {

        const startPoint = [22.4925, 88.3456];

        const endPoint = sosLocation || tollygunge;

        document.getElementById('tracking-title').innerText = 'Ambulance En Route';

        document.getElementById('phase2-btn').style.display = 'none';

        if (typeof L !== 'undefined' && trackMap) {
            trackMap.eachLayer(layer => {

                if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker)

                    trackMap.removeLayer(layer);

            });

            // Glowing route line

            L.polyline([startPoint, endPoint], {

                color: '#00D1FF', weight: 4,

                dashArray: '10, 8',

                opacity: 0.85

            }).addTo(trackMap);

            L.marker(endPoint, { icon: userIcon }).addTo(trackMap);

            tl1Marker = L.circleMarker([22.4935, 88.3462], { color: 'white', weight: 2, fillColor: '#EF4444', fillOpacity: 1, radius: 8 }).addTo(trackMap);

            tl2Marker = L.circleMarker([22.4945, 88.3470], { color: 'white', weight: 2, fillColor: '#EF4444', fillOpacity: 1, radius: 8 }).addTo(trackMap);

            trackAmbMarker = L.marker(startPoint, { icon: ambulanceIcon }).addTo(trackMap);

            trackMap.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [30, 30] });
        }

        const etaEl = document.getElementById('eta');

        const etaSub = document.getElementById('eta-subtitle');

        const trafficTxt = document.getElementById('traffic-text');

        const trafficBanner = document.getElementById('traffic-banner');

        etaEl.innerText = '8 Min';

        etaSub.innerText = 'Away from your location';

        trafficTxt.innerText = 'Connecting to Traffic Control IoT...';

        setTimeout(() => { trafficTxt.innerText = 'Signal Override Active — securing green corridor...'; }, 1000);

        setTimeout(() => {

            tl1Marker.setStyle({ fillColor: '#10B981', color: '#6EE7B7' });

            trafficBanner.style.background = 'rgba(16,185,129,0.07)';

            trafficBanner.style.borderColor = 'rgba(16,185,129,0.25)';

            trafficBanner.style.color = 'var(--accent-green)';

            trafficBanner.querySelector('div').style.background = 'var(--accent-green)';

            trafficBanner.querySelector('div').style.boxShadow = '0 0 8px var(--accent-green)';

            trafficTxt.innerText = '🟢 Upcoming intersection signal turned GREEN.';

        }, 2000);

        setTimeout(() => {

            etaEl.innerText = '4 Min';

            etaEl.style.animation = 'none';

            setTimeout(() => { etaEl.style.animation = ''; }, 10);

            trackAmbMarker.setLatLng([22.4940, 88.3466]);

        }, 2500);

        setTimeout(() => {

            tl2Marker.setStyle({ fillColor: '#10B981', color: '#6EE7B7' });

            trafficTxt.innerText = '🟢 Tollygunge crossing cleared. Ambulance on priority route.';

        }, 4500);

        setTimeout(() => {

            etaEl.innerText = '1 Min';

            trackAmbMarker.setLatLng([22.4948, 88.3472]);

        }, 5000);

        setTimeout(() => {

            etaEl.innerText = '🟢 Arrived!';

            etaEl.style.fontSize = '36px';

            etaSub.innerText = 'Please board the ambulance safely';

            trackAmbMarker.setLatLng(endPoint);

            trafficTxt.innerText = '✅ Ambulance has safely arrived at patient location.';

            document.getElementById('phase2-btn').style.display = 'flex';

        }, 7500);

    }

    // ─── Tracking Phase 2 ─────────────────────────────────────

    function startTrackingPhase2() {

        const startPoint = tollygunge;

        const endPoint = [22.4925, 88.3456];

        document.getElementById('phase2-btn').style.display = 'none';

        document.getElementById('tracking-title').innerText = 'En Route to Hospital';

        document.getElementById('eta').style.fontSize = '52px';

        if (typeof L !== 'undefined' && trackMap) {
            trackMap.eachLayer(layer => {

                if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker)

                    trackMap.removeLayer(layer);

            });

            L.polyline([startPoint, endPoint], { color: '#EF4444', weight: 5, opacity: 0.9 }).addTo(trackMap);

            L.marker(endPoint, { icon: hospIcon }).addTo(trackMap);

            trackAmbMarker = L.marker(startPoint, { icon: ambulanceIcon }).addTo(trackMap);

            trackMap.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [30, 30] });
        }

        const etaEl = document.getElementById('eta');

        const etaSub = document.getElementById('eta-subtitle');

        const trafficTxt = document.getElementById('traffic-text');

        etaEl.innerText = '7 Min';

        etaSub.innerText = 'To M R Bangur Emergency Ward';

        trafficTxt.innerText = 'Patient secured. Initiating green corridor transport...';

        setTimeout(() => { etaEl.innerText = '5 Min'; trackAmbMarker.setLatLng([22.4948, 88.3472]); }, 2000);

        setTimeout(() => { trafficTxt.innerText = '🟢 Traffic cleared by local police. Maintaining emergency speed.'; }, 3500);

        setTimeout(() => { etaEl.innerText = '2 Min'; trackAmbMarker.setLatLng([22.4940, 88.3466]); }, 5000);

        setTimeout(() => {

            etaEl.innerText = '🏥 Arrived!';

            etaEl.style.fontSize = '32px';

            etaSub.innerText = 'Patient transferred to Emergency Unit';

            trackAmbMarker.setLatLng(endPoint);

            trafficTxt.innerText = '✅ Emergency journey completed safely.';

            setTimeout(() => { navigate('review-screen'); resetRating(); }, 3000);

        }, 8000);

    }

    // ─── Star Rating ──────────────────────────────────────────

    let currentRating = 0;

    function rateStar(stars) {

        currentRating = stars;

        for (let i = 1; i <= 5; i++) {

            const s = document.getElementById('star-' + i);

            const isLight = document.getElementById('app-container').classList.contains('light-theme');
            s.style.color = i <= stars ? 'var(--accent-yellow)' : (isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)');

            s.style.textShadow = i <= stars ? '0 0 10px var(--accent-yellow)' : 'none';

            if (i === stars) {

                s.style.transform = 'scale(1.3) rotate(10deg)';

                setTimeout(() => { s.style.transform = 'scale(1)'; }, 200);

            }

        }

    }

    function resetRating() {

        currentRating = 0;

        const isLight = document.getElementById('app-container').classList.contains('light-theme');

        for (let i = 1; i <= 5; i++) {

            const s = document.getElementById('star-' + i);

            s.style.color = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)';

            s.style.textShadow = 'none';

        }

    }

    function submitReview() { navigate('home-screen'); }

    // ─── Profile ──────────────────────────────────────────────

    function toggleProfileEdit() {

        const v = document.getElementById('profile-view-mode');

        const e = document.getElementById('profile-edit-mode');

        v.style.display = v.style.display === 'none' ? 'block' : 'none';

        e.style.display = e.style.display === 'none' ? 'block' : 'none';

    }

    function saveProfile() {

        const name = document.getElementById('edit-name').value;

        const phone = document.getElementById('edit-phone').value;

        const blood = document.getElementById('edit-blood').value;

        const emContact = document.getElementById('edit-em-contact').value;

        const history = document.getElementById('edit-history').value;

        document.getElementById('display-name').innerText = name;

        document.getElementById('display-phone').innerText = phone;

        document.getElementById('display-blood').innerText = blood;

        document.getElementById('display-em-contact').innerText = emContact;

        document.getElementById('display-history').innerText = history || 'None';

        if (name) {

            const parts = name.split(' ');

            let init = parts[0][0];

            if (parts.length > 1) init += parts[parts.length - 1][0];

            document.getElementById('profile-initials').innerText = init.toUpperCase();
            
            const headerInit = document.getElementById('header-profile-initials');
            if (headerInit) headerInit.innerText = init.toUpperCase();

        }

        document.getElementById('patient-name').value = name;

        document.getElementById('patient-phone').value = phone.replace('+91 ', '');

        toggleProfileEdit();

    }

    // ─── Chatbot ──────────────────────────────────────────────

    function toggleChat() {
        const iframe = document.getElementById('chatbot-iframe');
        if (iframe) {
            const isLight = document.getElementById('app-container').classList.contains('light-theme');
            iframe.src = 'Chatbot.html?v=' + Date.now();
            iframe.onload = () => {
                iframe.contentWindow.postMessage({ type: 'theme', theme: isLight ? 'light' : 'dark' }, '*');
            };
        }
        navigate('chatbot-screen');
    }

    function sendSuggestion(text) {

        document.getElementById('chatbot-input').value = text;

        sendMessage();

    }

    function sendMessage() {

        const input = document.getElementById('chatbot-input');

        const text = input.value.trim();

        if (!text) return;

        addChatBubble(text, 'user');

        input.value = '';

        // Show typing indicator

        const typingDiv = document.createElement('div');

        typingDiv.className = 'msg bot';

        typingDiv.id = 'typing-indicator';

        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

        document.getElementById('chatbot-messages').appendChild(typingDiv);

        document.getElementById('chatbot-messages').scrollTop = 999999;

        setTimeout(() => {

            const typing = document.getElementById('typing-indicator');

            if (typing) typing.remove();

            let response = "I'm here to help. For critical emergencies, please call 102 immediately.";

            const low = text.toLowerCase();

            if (low.includes('eta') || low.includes('time')) response = '🚑 Your ambulance ETA is approximately 8 minutes. We\'re monitoring traffic in real-time.';

            else if (low.includes('first aid') || low.includes('help')) response = '🩹 Stay calm. If the patient is conscious: keep them still, apply gentle pressure to any wounds, and ensure an open airway. Help is on the way!';

            else if (low.includes('cost') || low.includes('price') || low.includes('fare')) response = '💳 BLS starts at ₹1,200. ALS (ICU) starts at ₹2,500. All prices include priority routing charges.';

            else if (low.includes('emergency') || low.includes('critical')) response = '🚨 If life-threatening, dial 102 immediately. I\'ve also alerted the nearest hospital about your case.';

            addChatBubble(response, 'bot');

        }, 1200);

    }

    function addChatBubble(text, sender) {

        const box = document.getElementById('chatbot-messages');

        const div = document.createElement('div');

        div.className = `msg ${sender}`;

        div.innerText = text;

        box.appendChild(div);

        box.scrollTop = box.scrollHeight;

    }
    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {

        if (e.key === 'Enter') sendMessage();

    });

    // ─── Sensor Diagnostics & DSP Engine Variables ─────────────
    let sensorBuffer = []; 
    let motionHistory = []; 
    let isMotionListenerActive = false;
    let sensorsInitialized = false;
    let shakeDirections = [];
    let currentPitch = 0;
    let currentRoll = 0;
    let inactivityCheckInterval = null;
    let logoClicks = 0;
    let lastLogoClick = 0;
    let lastX = null;
    let lastY = null;
    let lastZ = null;
    let lastTouchX = 0;
    let directionChanges = 0;
    let lastDirection = 0;
    let lastGestureTime = 0;
    let lastShakeTime = 0;
    let shakeCount = 0;

    // Added globals for refined shake detection & test mode
    let isSensorTestMode = false;
    let lastShakePeakTime = 0;
    let shakePeaks = [];
    let eventReceived = false;
    let sensorEventCount = 0;
    let sensorWatchdogTimeout = null;

    // Listen to orientation coordinates globally
    window.addEventListener('deviceorientation', (e) => {
        currentPitch = e.beta ? Math.round(e.beta) : 0;
        currentRoll = e.gamma ? Math.round(e.gamma) : 0;
    });

    // ══════════════════════════════════════════════════════════
    // resQ SMART EMERGENCY DETECTION & SOS SAFETY SYSTEM LOGIC
    // ══════════════════════════════════════════════════════════

    // ─── State & Storage Defaults ─────────────────────────────
    let safetySettings = {
        autoDetect: true,
        sensitivity: "Medium", // "Low", "Medium", "High"
        countdown: 15,
        sound: true,
        vibrate: true,
        autoSms: true
    };

    let emergencyContacts = [
        { id: 1, name: "Sarah Dev (Wife)", phone: "+91 98765 01234", relation: "Family", priority: true },
        { id: 2, name: "Dr. Alok Sen (Physician)", phone: "+91 99334 55667", relation: "Doctor", priority: false }
    ];

    let isInVerificationMode = false;
    let countdownInterval = null;
    let userInteractionTimeout = null;
    let remainingTime = 10;
    let userActivityState = "Active"; // "Active" | "Inactive"
    let lastSensorTrigger = 0;

    // Web Audio API Globals
    let audioCtx = null;
    let sirenOscillator = null;
    let sirenGainNode = null;
    let sirenInterval = null;
    let vibrationInterval = null;

    // ─── Safety Init ──────────────────────────────────────────
    function initSafetySystem() {
        checkInitialSensorStatus();
        loadSafetySystem();
        renderContacts();
        registerSettingsHandlers();
        
        // Hook secret logo tap sequence click counter (5 taps within 2s to test on un-accelerated desktop browsers)
        const logoGroup = document.querySelector('.header-logo-group');
        if (logoGroup) {
            logoGroup.addEventListener('click', () => {
                let now = Date.now();
                if (now - lastLogoClick < 500) {
                    logoClicks++;
                } else {
                    logoClicks = 1;
                }
                lastLogoClick = now;
                if (logoClicks >= 5) {
                    logoClicks = 0;
                    showToast("Test Sequence Triggered", "Accident simulated via secret tap gesture.");
                    triggerImpactDetected(9.8, "Secret Gesture");
                }
            });
        }

        // Setup automatic interaction armer for mobile sensors
        if (safetySettings.autoDetect) {
            setupInteractionArmer();
        }
    }

    // ─── Storage Accessors ────────────────────────────────────
    function saveSafetySystem() {
        try {
            localStorage.setItem('resq_safety_settings', JSON.stringify(safetySettings));
            localStorage.setItem('resq_emergency_contacts', JSON.stringify(emergencyContacts));
        } catch (e) {
            console.warn("localStorage write is blocked or unavailable:", e);
        }
    }

    function loadSafetySystem() {
        try {
            const storedSettings = localStorage.getItem('resq_safety_settings');
            const storedContacts = localStorage.getItem('resq_emergency_contacts');
            
            if (storedSettings) {
                safetySettings = JSON.parse(storedSettings);
            }
            if (storedContacts) {
                emergencyContacts = JSON.parse(storedContacts);
            }
        } catch (e) {
            console.warn("localStorage read is blocked or unavailable:", e);
        }
        
        try {
            syncSettingsToUI();
        } catch (e) {
            console.error("Failed to sync settings to UI:", e);
        }
    }

    function syncSettingsToUI() {
        const autoDetectChk = document.getElementById('setting-auto-detect');
        const sensitivityRange = document.getElementById('setting-sensitivity-range');
        const countdownRange = document.getElementById('setting-countdown-range');
        const soundChk = document.getElementById('setting-sound');
        const vibrateChk = document.getElementById('setting-vibrate');
        const autoSmsChk = document.getElementById('setting-autosms');
        
        if (autoDetectChk) autoDetectChk.checked = safetySettings.autoDetect;
        if (sensitivityRange) {
            let val = 2;
            if (safetySettings.sensitivity === "Low") val = 1;
            else if (safetySettings.sensitivity === "High") val = 3;
            sensitivityRange.value = val;
        }
        if (countdownRange) countdownRange.value = safetySettings.countdown;
        if (soundChk) soundChk.checked = safetySettings.sound;
        if (vibrateChk) vibrateChk.checked = safetySettings.vibrate;
        if (autoSmsChk) autoSmsChk.checked = safetySettings.autoSms;
        
        updateSettingsLabels();
    }

    function updateSettingsLabels() {
        const sensLbl = document.getElementById('lbl-setting-sensitivity');
        const countdownLbl = document.getElementById('lbl-setting-countdown');
        
        if (sensLbl) {
            if (isSensorTestMode) {
                sensLbl.innerHTML = `<span style="color: var(--accent-green); font-weight: 700;">TEST ACTIVE (1.3G)</span>`;
            } else {
                let limit = "2.0G";
                if (safetySettings.sensitivity === "Low") limit = "3.0G";
                else if (safetySettings.sensitivity === "High") limit = "1.5G";
                sensLbl.innerText = `${safetySettings.sensitivity} (${limit})`;
            }
        }
        if (countdownLbl) {
            countdownLbl.innerText = `${safetySettings.countdown} seconds`;
        }
    }

    // ─── Contacts Render ──────────────────────────────────────
    function renderContacts() {
        const container = document.getElementById('contacts-list-container');
        if (!container) return;
        
        container.innerHTML = "";
        
        if (emergencyContacts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-gray); font-size:13px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px;">
                    No emergency contacts added yet. Add a family member below.
                </div>
            `;
            return;
        }
        
        emergencyContacts.forEach(contact => {
            const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            const card = document.createElement('div');
            card.className = "contact-card";
            card.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="contact-avatar ${contact.priority ? 'priority' : ''}">
                        ${initials}
                    </div>
                    <div class="contact-info" style="text-align:left;">
                        <div class="contact-name-row">
                            <span class="contact-name-txt" style="color:var(--text-main); font-weight:700;">${contact.name}</span>
                            <span class="contact-relation-badge">${contact.relation}</span>
                            ${contact.priority ? '<span class="priority-star" title="Priority SOS Contact" style="margin-left:4px;color:var(--accent-yellow);">★</span>' : ''}
                        </div>
                        <div class="contact-phone-txt">📞 ${contact.phone}</div>
                    </div>
                </div>
                <div class="contact-actions" style="display:flex; gap:12px; align-items:center;">
                    <button class="contact-btn" onclick="togglePriorityContact(${contact.id})" title="Toggle Priority Alert" style="font-size:14px;background:none;border:none;cursor:pointer;">
                        ${contact.priority ? '🔔' : '🔕'}
                    </button>
                    <button class="contact-btn delete" onclick="deleteContact(${contact.id})" title="Delete Contact" style="font-size:14px;background:none;border:none;cursor:pointer;">🗑️</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // ─── Contacts Actions ─────────────────────────────────────
    function addContact() {
        const nameInput = document.getElementById('contact-name');
        const phoneInput = document.getElementById('contact-phone');
        const relationSelect = document.getElementById('contact-relation');
        const priorityChk = document.getElementById('contact-priority');
        
        if (!nameInput || !phoneInput) return;
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!name || !phone) {
            showToast("Invalid Input", "Please fill in contact name and phone number.", true);
            return;
        }
        
        // Simple validation
        if (!/^\+?[0-9\s-]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
            showToast("Invalid Phone", "Please enter a valid phone number.", true);
            return;
        }
        
        const relation = relationSelect ? relationSelect.value : "Family";
        const priority = priorityChk ? priorityChk.checked : false;
        
        // If priority is checked, unset other priority contacts
        if (priority) {
            emergencyContacts.forEach(c => c.priority = false);
        }
        
        const newContact = {
            id: Date.now(),
            name,
            phone,
            relation,
            priority
        };
        
        emergencyContacts.push(newContact);
        saveSafetySystem();
        renderContacts();
        
        // Reset form
        nameInput.value = "";
        phoneInput.value = "";
        if (priorityChk) priorityChk.checked = false;
        
        showToast("Contact Saved", `${name} added to safety list.`);
    }

    window.deleteContact = function(id) {
        emergencyContacts = emergencyContacts.filter(c => c.id !== id);
        saveSafetySystem();
        renderContacts();
        showToast("Contact Removed", "Emergency contact deleted.");
    }

    window.togglePriorityContact = function(id) {
        emergencyContacts.forEach(c => {
            if (c.id === id) {
                c.priority = !c.priority;
                if (c.priority) {
                    // disable all others
                    emergencyContacts.forEach(other => {
                        if (other.id !== id) other.priority = false;
                    });
                }
            }
        });
        saveSafetySystem();
        renderContacts();
    }

    // ─── Real Motion Sensor Handlers ──────────────────────────
    function updateSensorStatusUI(state, extraDetails = "") {
        const statusLbl = document.getElementById('sensor-permission-status');
        const telemetryStatusLbl = document.getElementById('telemetry-status-lbl');
        const telemetryEnginePill = document.getElementById('telemetry-engine-status');
        const telemetryAvail = document.getElementById('telemetry-devicemotion-avail');
        const telemetryListener = document.getElementById('telemetry-listener-status');

        if (state === "active") {
            if (statusLbl) statusLbl.innerHTML = "Motion Sensor Active 🟢";
            if (telemetryStatusLbl) telemetryStatusLbl.innerText = isSensorTestMode ? "Testing (1.3G)" : "Monitoring";
            if (telemetryEnginePill) telemetryEnginePill.className = "header-status monitoring";
            if (telemetryAvail) telemetryAvail.innerHTML = "Available 🟢";
            if (telemetryListener) telemetryListener.innerHTML = "Listening 🟢";
        } else if (state === "permission_required") {
            if (statusLbl) statusLbl.innerHTML = "Permission Required 🟠";
            if (telemetryStatusLbl) telemetryStatusLbl.innerText = "Inactive";
            if (telemetryEnginePill) telemetryEnginePill.className = "header-status";
            if (telemetryAvail) telemetryAvail.innerHTML = "Available";
            if (telemetryListener) telemetryListener.innerHTML = "Stopped";
        } else if (state === "not_supported") {
            if (statusLbl) statusLbl.innerHTML = "Not Supported ❌";
            if (telemetryStatusLbl) telemetryStatusLbl.innerText = "Unsupported";
            if (telemetryEnginePill) telemetryEnginePill.className = "header-status";
            if (telemetryAvail) telemetryAvail.innerHTML = "Not Supported ❌";
            if (telemetryListener) telemetryListener.innerHTML = "Stopped ❌";
        } else if (state === "error") {
            if (statusLbl) statusLbl.innerHTML = "Sensor Error ❌";
            if (telemetryStatusLbl) telemetryStatusLbl.innerText = "Error";
            if (telemetryEnginePill) telemetryEnginePill.className = "header-status";
            if (telemetryAvail) telemetryAvail.innerHTML = extraDetails ? `Error (${extraDetails})` : "Available";
            if (telemetryListener) telemetryListener.innerHTML = "Stopped ❌";
        }
    }

    function checkInitialSensorStatus() {
        if (typeof DeviceMotionEvent === 'undefined') {
            updateSensorStatusUI("not_supported");
            return;
        }
        
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            updateSensorStatusUI("error", "HTTPS Required");
            return;
        }
        
        updateSensorStatusUI("permission_required");
    }

    function bindRealSensors() {
        initMotionSensors();
        
        // Update UI immediately for Calibrate Sensors click
        const telemetryListener = document.getElementById('telemetry-listener-status');
        const statusLbl = document.getElementById('sensor-permission-status');
        
        if (telemetryListener) telemetryListener.innerHTML = "Active";
        if (statusLbl) statusLbl.innerHTML = "Granted";
        
        showToast("Motion Sensor Active 🟢", "Calibration complete.");
    }

    function initMotionSensors() {
        const statusLbl = document.getElementById('sensor-permission-status');
        const telemetryAvail = document.getElementById('telemetry-devicemotion-avail');
        const telemetryListener = document.getElementById('telemetry-listener-status');

        if (typeof DeviceMotionEvent === 'undefined') {
            updateSensorStatusUI("not_supported");
            console.warn("DeviceMotionEvent is not supported in this browser/device.");
            return;
        }

        if (telemetryAvail) telemetryAvail.innerHTML = "Available";

        if (isMotionListenerActive) {
            console.log("DeviceMotion listener is already active.");
            return;
        }

        const attachListener = () => {
            try {
                // Ensure only ONE devicemotion listener exists
                window.removeEventListener('devicemotion', handleDeviceMotion, { passive: true });
                window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
                isMotionListenerActive = true;
                sensorsInitialized = true;
                eventReceived = false;

                // Watchdog to check if events are actually being received
                if (sensorWatchdogTimeout) clearTimeout(sensorWatchdogTimeout);
                sensorWatchdogTimeout = setTimeout(() => {
                    if (isMotionListenerActive && !eventReceived) {
                        if (statusLbl) statusLbl.innerHTML = "Motion listener failed to start";
                        if (telemetryListener) telemetryListener.innerHTML = "Failed";
                        console.error("Motion listener failed to start: No events received after 5 seconds");
                    }
                }, 5000);

                console.log("DeviceMotion listener successfully attached (Passive).");
            } catch (err) {
                console.error("Error attaching devicemotion listener:", err);
                updateSensorStatusUI("error", "Attachment Failed");
            }
        };

        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            // iPhone / iOS Safari
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        attachListener();
                        if (statusLbl) statusLbl.innerHTML = "Granted 🟢";
                        if (telemetryListener) telemetryListener.innerHTML = "Active";
                        showToast("Motion Sensor Active 🟢", "Emergency detection enabled.");
                    } else {
                        updateSensorStatusUI("error", "Permission Denied");
                        showToast("Permission Denied", "Motion sensor access denied.", true);
                    }
                })
                .catch(err => {
                    console.error("iOS requestPermission error:", err);
                    updateSensorStatusUI("error", "Permission Failed");
                });
        } else {
            // Android Chrome - Do NOT call requestPermission(), attach directly
            attachListener();
        }
    }

    // Keep compatibility mapping if any other code calls initDeviceMotion
    function initDeviceMotion() {
        initMotionSensors();
    }

    function stopDeviceMotion() {
        window.removeEventListener('devicemotion', handleDeviceMotion, { passive: true });
        isMotionListenerActive = false;
        updateSensorStatusUI("permission_required");
        console.log("DeviceMotion listener stopped.");
    }

    function setupInteractionArmer() {
        const armSensors = () => {
            initMotionSensors();
            window.removeEventListener('mousedown', armSensors, true);
            window.removeEventListener('click', armSensors, true);
            window.removeEventListener('touchstart', armSensors, true);
            window.removeEventListener('keydown', armSensors, true);
        };
        window.addEventListener('mousedown', armSensors, true);
        window.addEventListener('click', armSensors, true);
        window.addEventListener('touchstart', armSensors, true);
        window.addEventListener('keydown', armSensors, true);
    }

    window.addEventListener('focus', () => {
        if (safetySettings.autoDetect) {
            console.log("App regained focus. Re-arming motion sensors...");
            // Ensure only ONE devicemotion listener exists
            window.removeEventListener('devicemotion', handleDeviceMotion, { passive: true });
            isMotionListenerActive = false;
            initMotionSensors();
        }
    });

    function handleDeviceMotion(event) {
        if (!safetySettings.autoDetect) return;
        
        // Safely extract acceleration (without gravity) or gravity-included data
        let acc = (event.acceleration && event.acceleration.x !== null) ? event.acceleration : null;
        let accGrav = event.accelerationIncludingGravity;
        
        let x = 0, y = 0, z = 0;
        
        if (acc) {
            x = acc.x;
            y = acc.y;
            z = acc.z;
        } else if (accGrav && accGrav.x !== null) {
            // Apply high-pass filter to extract linear acceleration
            const alpha = 0.85;
            gravityX = alpha * gravityX + (1 - alpha) * accGrav.x;
            gravityY = alpha * gravityY + (1 - alpha) * accGrav.y;
            gravityZ = alpha * gravityZ + (1 - alpha) * accGrav.z;
            
            x = accGrav.x - gravityX;
            y = accGrav.y - gravityY;
            z = accGrav.z - gravityZ;
        } else {
            return; // No valid motion data available
        }
        
        // Mark that we have successfully received sensor events
        eventReceived = true;

        // Increment event count
        sensorEventCount++;

        // Log sensor events as requested
        let accelerationX = x;
        let accelerationY = y;
        let accelerationZ = z;
        console.log("Motion Event Received");
        console.log(accelerationX, accelerationY, accelerationZ);

        // Calculate net linear acceleration magnitude
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        let netForce = magnitude / 9.8;
        
        // Fetch rotation rates if supported
        let rot = event.rotationRate;
        let rotMag = rot ? Math.sqrt((rot.alpha||0)*(rot.alpha||0) + (rot.beta||0)*(rot.beta||0) + (rot.gamma||0)*(rot.gamma||0)) : 0;
        
        // Push G-Force to circular buffer for standard deviation activity calculations
        sensorBuffer.push(netForce);
        if (sensorBuffer.length > 30) sensorBuffer.shift();
        let stdDev = calculateStdDev(sensorBuffer);

        // Update live telemetry UI (real-time G-force, Gyro rotation, Pitch/Roll, etc.)
        updateTelemetryUI(netForce, rotMag, currentPitch, currentRoll, sensorBuffer.length, stdDev);
        
        // Update live accelerometer X, Y, Z coordinates
        const accXLbl = document.getElementById('telemetry-acc-x');
        const accYLbl = document.getElementById('telemetry-acc-y');
        const accZLbl = document.getElementById('telemetry-acc-z');
        if (accXLbl) accXLbl.innerText = x.toFixed(2);
        if (accYLbl) accYLbl.innerText = y.toFixed(2);
        if (accZLbl) accZLbl.innerText = z.toFixed(2);
        
        // Update live G-force value
        const gforceLbl = document.getElementById('telemetry-gforce');
        if (gforceLbl) gforceLbl.innerText = netForce.toFixed(2) + " G";

        // Display sensor event count
        const telemetrySamples = document.getElementById('telemetry-samples');
        if (telemetrySamples) {
            telemetrySamples.innerText = `Buffer: ${sensorBuffer.length}/30 · Events: ${sensorEventCount}`;
        }

        // Update UI automatically when events are received
        const telemetryAvail = document.getElementById('telemetry-devicemotion-avail');
        const telemetryListener = document.getElementById('telemetry-listener-status');
        const telemetryStatusLbl = document.getElementById('telemetry-status-lbl');
        const telemetryEnginePill = document.getElementById('telemetry-engine-status');
        const statusLbl = document.getElementById('sensor-permission-status');

        if (telemetryAvail) telemetryAvail.innerHTML = "Available";
        if (telemetryListener) telemetryListener.innerHTML = "Active";
        
        if (telemetryStatusLbl) telemetryStatusLbl.innerText = "Active";
        if (telemetryEnginePill) {
            telemetryEnginePill.className = "header-status monitoring";
            telemetryEnginePill.style.background = "rgba(16,185,129,0.08)";
            telemetryEnginePill.style.color = "var(--accent-green)";
        }

        // Check if values change while moving the phone
        let valuesChanged = false;
        if (lastX !== null && lastY !== null && lastZ !== null) {
            let diffX = Math.abs(x - lastX);
            let diffY = Math.abs(y - lastY);
            let diffZ = Math.abs(z - lastZ);
            if (diffX > 0.05 || diffY > 0.05 || diffZ > 0.05) {
                valuesChanged = true;
            }
        }

        if (statusLbl) {
            if (valuesChanged) {
                statusLbl.innerHTML = "Sensors Working ✅";
            } else if (statusLbl.innerHTML !== "Sensors Working ✅") {
                statusLbl.innerHTML = "Granted 🟢";
            }
        }

        let now = Date.now();
        // Avoid multi-triggers within 10 seconds cooldown
        if (now - lastSensorTrigger < 10000) return;
        
        // Determine the current threshold
        let currentThreshold = 2.0; // Medium / Normal Mode
        if (isSensorTestMode) {
            currentThreshold = 1.3;
        } else {
            let sensitivity = safetySettings.sensitivity || "Medium";
            if (sensitivity === "Low") currentThreshold = 3.0;
            else if (sensitivity === "High") currentThreshold = 1.5;
            else currentThreshold = 2.0; // Medium
        }
        
        // ── 1. Check for Sudden Impact ──
        if (netForce >= currentThreshold) {
            lastSensorTrigger = now;
            shakePeaks = []; // Reset shake peaks
            
            const shakeCountLbl = document.getElementById('telemetry-shake-count');
            if (shakeCountLbl) shakeCountLbl.innerText = "0";
            
            const lastTriggerLbl = document.getElementById('telemetry-last-trigger');
            if (lastTriggerLbl) {
                const timeStr = new Date().toLocaleTimeString();
                lastTriggerLbl.innerText = `${timeStr} (Impact: ${netForce.toFixed(2)}G)`;
            }
            
            triggerImpactDetected(netForce, "Sudden Impact");
            return;
        }
        
        // ── 2. Check for Shake Detection (2–3 strong shakes within 1 second) ──
        // Count magnitude peaks exceeding 80% of threshold
        const shakeThreshold = currentThreshold * 0.8;
        if (netForce >= shakeThreshold) {
            if (now - lastShakePeakTime > 220) { // Cooldown between peaks (approx. 4.5Hz max shake frequency)
                lastShakePeakTime = now;
                shakePeaks.push(now);
                console.log(`[resQ Shake Peak] Exceeded ${shakeThreshold.toFixed(2)}G. Count: ${shakePeaks.length}`);
            }
        }
        
        // Keep peaks only within the last 1.0 second
        shakePeaks = shakePeaks.filter(t => now - t < 1000);
        let currentShakeCount = shakePeaks.length;
        
        const shakeCountLbl = document.getElementById('telemetry-shake-count');
        if (shakeCountLbl) shakeCountLbl.innerText = currentShakeCount;
        
        if (currentShakeCount >= 2) { // 2-3 peaks within 1 second is a valid shake
            lastSensorTrigger = now;
            shakePeaks = []; // Reset
            
            if (shakeCountLbl) shakeCountLbl.innerText = "0";
            
            const lastTriggerLbl = document.getElementById('telemetry-last-trigger');
            if (lastTriggerLbl) {
                const timeStr = new Date().toLocaleTimeString();
                lastTriggerLbl.innerText = `${timeStr} (Shake: ${currentShakeCount} peaks)`;
            }
            
            triggerImpactDetected(netForce, "Shake Motion Detector");
            return;
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
    }

    function handleVirtualShake(e) {
        if (!safetySettings.autoDetect) return;
        
        let touch = e.touches[0];
        let currentX = touch.clientX;
        let now = Date.now();
        
        if (now - lastGestureTime > 800) {
            directionChanges = 0;
            lastDirection = 0;
        }
        
        lastGestureTime = now;
        
        if (lastTouchX !== 0) {
            let diff = currentX - lastTouchX;
            if (Math.abs(diff) > 25) { 
                let direction = diff > 0 ? 1 : -1;
                if (lastDirection !== 0 && direction !== lastDirection) {
                    directionChanges++;
                    if (directionChanges >= 3) { 
                        directionChanges = 0;
                        triggerImpactDetected(9.8, "Virtual Shake Gesture");
                    }
                }
                lastDirection = direction;
            }
        }
        lastTouchX = currentX;
    }

    function updateTelemetryUI(gforce, rotation, pitch, roll, bufferLen, stdDev) {
        const gfLbl = document.getElementById('telemetry-gforce');
        const rotLbl = document.getElementById('telemetry-rot');
        const orientLbl = document.getElementById('telemetry-orient');
        const sampleLbl = document.getElementById('telemetry-samples');
        const activityLbl = document.getElementById('telemetry-activity');
        const activityBar = document.getElementById('telemetry-activity-bar');
        const statusPill = document.getElementById('telemetry-engine-status');
        const statusLbl = document.getElementById('telemetry-status-lbl');
        
        if (gfLbl) gfLbl.innerText = gforce.toFixed(2) + " G";
        if (rotLbl) rotLbl.innerText = Math.round(rotation) + "°/s";
        if (orientLbl) orientLbl.innerText = `Pitch: ${pitch}° · Roll: ${roll}°`;
        if (sampleLbl) sampleLbl.innerText = `Buffer: ${bufferLen}/30`;
        
        if (statusPill && statusLbl) {
            if (isInVerificationMode) {
                statusPill.className = "header-status calibrating";
                statusLbl.innerText = "Alarming";
            } else if (safetySettings.autoDetect) {
                statusPill.className = "header-status monitoring";
                statusLbl.innerText = "Monitoring";
            } else {
                statusPill.className = "header-status";
                statusLbl.innerText = "Inactive";
            }
        }
        
        if (activityLbl && activityBar) {
            let label = "Stable";
            if (stdDev > 0.4) label = "Heavy Motion";
            else if (stdDev > 0.15) label = "Active";
            else if (stdDev > 0.05) label = "Stable";
            else label = "Still / Motionless";
            
            activityLbl.innerText = label + " (" + stdDev.toFixed(3) + "G)";
            
            let pct = Math.min(100, Math.max(5, (stdDev / 0.5) * 100));
            activityBar.style.width = pct + "%";
            
            if (isInVerificationMode) {
                activityBar.className = "calibrating";
            } else if (stdDev > 0.12) {
                activityBar.className = "";
                activityBar.style.backgroundColor = "var(--primary)";
            } else {
                activityBar.className = "";
                activityBar.style.backgroundColor = "var(--accent-green)";
            }
        }
    }

    // ─── Impact Trigger & Countdown ───────────────────────────
    function triggerImpactDetected(force, source = "Sensor") {
        if (isInVerificationMode) return;
        
        isInVerificationMode = true;
        
        const overlay = document.getElementById('emergency-verification-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        const forceLbl = document.getElementById('lbl-impact-force');
        if (forceLbl) forceLbl.innerText = force.toFixed(1) + "G";
        
        remainingTime = safetySettings.countdown;
        updateTimerUI();
        
        startSiren();
        startVibration();
        
        startInactivityAnalysis();
        
        // Retrieve and show live location inside popup immediately
        const locTxt = document.getElementById('emergency-live-location-txt');
        if (locTxt) locTxt.innerText = "📍 Pinpointing GPS coordinates...";
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    if (locTxt) locTxt.innerHTML = `📍 GPS Active: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                },
                (error) => {
                    if (locTxt) locTxt.innerHTML = `📍 GPS Active: Salt Lake, Kolkata`;
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            if (locTxt) locTxt.innerHTML = `📍 Salt Lake Sector V, Kolkata`;
        }
        
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            remainingTime--;
            updateTimerUI();
            
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                triggerEmergencySOS(false);
            }
        }, 1000);
    }

    function updateTimerUI() {
        const timerLbl = document.getElementById('emergency-timer-number');
        const timerSec = document.getElementById('emergency-timer-sec');
        const timerBar = document.getElementById('emergency-timer-bar');
        
        if (timerLbl) timerLbl.innerText = remainingTime;
        if (timerSec) timerSec.innerText = remainingTime;
        
        if (timerBar) {
            let percentage = remainingTime / safetySettings.countdown;
            let offset = 251.2 * (1 - percentage);
            timerBar.style.strokeDashoffset = offset;
        }
    }

    function cancelEmergencyAlert() {
        isInVerificationMode = false;
        
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (inactivityCheckInterval) {
            clearInterval(inactivityCheckInterval);
            inactivityCheckInterval = null;
        }
        
        stopSiren();
        stopVibration();
        
        const overlay = document.getElementById('emergency-verification-overlay');
        if (overlay) overlay.style.display = 'none';
        
        showToast("Safety Confirmed", "Emergency alarm canceled. Contacts will not be notified.");
    }

    // ─── Real Inactivity Analysis ─────────────────────────────
    function startInactivityAnalysis() {
        userActivityState = "Active";
        updateInactivityUI();
        
        if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
        
        let stillTime = 0;
        let lastStdDevs = [];
        
        inactivityCheckInterval = setInterval(() => {
            if (!isInVerificationMode) {
                clearInterval(inactivityCheckInterval);
                return;
            }
            
            let stdDev = calculateStdDev(sensorBuffer);
            lastStdDevs.push(stdDev);
            if (lastStdDevs.length > 6) lastStdDevs.shift(); 
            
            let isDeviceStill = lastStdDevs.length > 0 && lastStdDevs.every(sd => sd < 0.12);
            
            if (isDeviceStill) {
                stillTime += 0.5;
            } else {
                stillTime = 0;
                if (userActivityState === "Inactive") {
                    userActivityState = "Active";
                    updateInactivityUI();
                    showToast("Activity Detected", "Post-collision user movement detected. Timeout paused.");
                }
            }
            
            if (stillTime >= 3.0 && userActivityState === "Active") {
                userActivityState = "Inactive";
                updateInactivityUI();
                const simStatus = document.getElementById('sim-inactivity-status');
                if (simStatus) {
                    simStatus.innerText = "Unresponsive";
                    simStatus.className = "sim-val status-red";
                }
            }
        }, 500);
    }

    function recordUserInteraction() {
        if (!isInVerificationMode) return;
        
        if (userActivityState === "Inactive") {
            userActivityState = "Active";
            updateInactivityUI();
            
            showToast("Activity Detected", "Detecting user motion. Countdown continues. Press 'I'm Safe' to cancel.");
            
            const simStatus = document.getElementById('sim-inactivity-status');
            if (simStatus) {
                simStatus.innerText = "Active Recovery";
                simStatus.className = "sim-val status-green";
            }
        }
    }

    function updateInactivityUI() {
        const activityStateLbl = document.getElementById('lbl-activity-state');
        const dotActivity = document.getElementById('dot-activity');
        
        if (activityStateLbl) activityStateLbl.innerText = userActivityState;
        if (dotActivity) {
            if (userActivityState === "Active") {
                dotActivity.style.background = "#10B981";
                dotActivity.style.boxShadow = "0 0 6px #10B981";
                dotActivity.style.animation = "none";
            } else {
                dotActivity.style.background = "#EF4444";
                dotActivity.style.boxShadow = "0 0 6px #EF4444";
            }
        }
    }

    // ─── Native Audio Siren & Vibration ────────────────────────
    function startSiren() {
        if (!safetySettings.sound) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            stopSiren();
            
            sirenOscillator = audioCtx.createOscillator();
            sirenGainNode = audioCtx.createGain();
            
            sirenOscillator.type = 'sine';
            sirenOscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
            sirenGainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); 
            
            sirenOscillator.connect(sirenGainNode);
            sirenGainNode.connect(audioCtx.destination);
            sirenOscillator.start();
            
            let isHigh = false;
            sirenInterval = setInterval(() => {
                if (sirenOscillator) {
                    let targetFreq = isHigh ? 440 : 880;
                    sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.35);
                    isHigh = !isHigh;
                }
            }, 400);
        } catch (e) {
            console.error("Web Audio siren blocked: ", e);
        }
    }

    function stopSiren() {
        if (sirenInterval) {
            clearInterval(sirenInterval);
            sirenInterval = null;
        }
        if (sirenOscillator) {
            try {
                sirenOscillator.stop();
                sirenOscillator.disconnect();
            } catch (e) {}
            sirenOscillator = null;
        }
    }

    function startVibration() {
        if (!safetySettings.vibrate) return;
        if (!navigator.vibrate) return;
        
        stopVibration();
        
        navigator.vibrate([300, 100, 300]);
        
        vibrationInterval = setInterval(() => {
            if (navigator.vibrate) {
                navigator.vibrate([300, 100, 300]);
            }
        }, 1500);
    }

    function stopVibration() {
        if (vibrationInterval) {
            clearInterval(vibrationInterval);
            vibrationInterval = null;
        }
        if (navigator.vibrate) {
            navigator.vibrate(0);
        }
    }

    // ─── SOS Trigger Action ───────────────────────────────────
    function triggerEmergencySOS(isUserInitiated = false) {
        isInVerificationMode = false;
        
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (userInteractionTimeout) {
            clearTimeout(userInteractionTimeout);
            userInteractionTimeout = null;
        }
        
        stopSiren();
        stopVibration();
        
        const overlay = document.getElementById('emergency-verification-overlay');
        if (overlay) overlay.style.display = 'none';
        
        let priorityContact = emergencyContacts.find(c => c.priority);
        if (!priorityContact && emergencyContacts.length > 0) {
            priorityContact = emergencyContacts[0];
        }
        
        let contactDetails = emergencyContacts.map(c => `${c.name} (${c.phone})`).join(", ");
        if (!contactDetails) contactDetails = "Emergency Responders";
        
        // Fetch live GPS location before sending messages
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    sendSOSAlerts(lat, lng, contactDetails, isUserInitiated);
                },
                (error) => {
                    console.warn("GPS lookup failed, using default coords:", error);
                    sendSOSAlerts(tollygunge[0], tollygunge[1], contactDetails, isUserInitiated);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            sendSOSAlerts(tollygunge[0], tollygunge[1], contactDetails, isUserInitiated);
        }
    }

    function sendSOSAlerts(lat, lng, contactDetails, isUserInitiated) {
        let gpsLink = `https://maps.google.com/?q=${lat},${lng}`;
        let smsMsg = "";
        if (isUserInitiated) {
            smsMsg = `Emergency Alert from resQ.\nAccident reported by user.\nLive location: ${gpsLink}\nImmediate help requested.`;
        } else {
            smsMsg = `Emergency Alert from resQ.\nPossible accident detected.\nLive location: ${gpsLink}\nNo response detected from user. SOS triggered automatically.`;
        }
        
        // Get priority contact details
        let priorityContact = emergencyContacts.find(c => c.priority);
        if (!priorityContact && emergencyContacts.length > 0) {
            priorityContact = emergencyContacts[0];
        }
        
        let contactName = priorityContact ? priorityContact.name : "Trusted Partner";
        let contactPhone = priorityContact ? priorityContact.phone : "+91 98765 01234";
        
        // Show the beautiful premium simulated SMS preview modal
        showSimulatedSMS(contactName, contactPhone, smsMsg);
        
        // Show secondary toast summary if there are other contacts
        if (emergencyContacts.length > 1) {
            setTimeout(() => {
                showToast(
                    "SOS Alert Broadcasted",
                    `Alert notification sent to secondary emergency contacts.`
                );
            }, 2500);
        }
        
        // Automatically book the ambulance and transition to live tracking
        autoBookSOSAmbulance(lat, lng);
    }

    function showSimulatedSMS(recipientName, recipientPhone, smsMsg) {
        // Remove any existing SMS modal
        const existing = document.getElementById('sms-sim-modal');
        if (existing) existing.remove();

        const container = document.getElementById('app-container');
        if (!container) return;

        const modal = document.createElement('div');
        modal.id = 'sms-sim-modal';
        modal.style.cssText = `
            position: absolute;
            top: 24px;
            left: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 209, 255, 0.2);
            z-index: 9999;
            color: #F8FAFC;
            font-family: var(--font-body);
            transform: translateY(-120%);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        if (container.classList.contains('light-theme')) {
            modal.style.background = 'rgba(255, 255, 255, 0.9)';
            modal.style.borderColor = 'rgba(0, 0, 0, 0.08)';
            modal.style.color = '#0F172A';
            modal.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(2, 132, 199, 0.2)';
        }

        modal.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">💬</span>
                    <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--primary);">Emergency SMS Dispatch</span>
                </div>
                <span style="font-size: 11px; opacity: 0.6;">Just now</span>
            </div>
            <div style="margin-bottom: 12px; text-align: left;">
                <div style="font-size: 13px; font-weight: 800; margin-bottom: 2px;">To: ${recipientName}</div>
                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 8px;">${recipientPhone}</div>
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px; border-radius: 12px; font-size: 12px; line-height: 1.4; color: inherit; max-height: 120px; overflow-y: auto;">
                    ${smsMsg.replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div id="sms-status-spinner" style="width: 10px; height: 10px; border: 2px solid rgba(0,209,255,0.3); border-top-color: var(--primary); border-radius: 50%; animation: typingBounce 0.6s linear infinite;"></div>
                    <span id="sms-status-text" style="font-weight: 700; color: var(--accent-yellow);">Transmitting cellular alert...</span>
                </div>
                <span style="opacity: 0.5;">via GSM Network</span>
            </div>
            <div style="width: 100%; height: 3px; background: rgba(0,209,255,0.1); border-radius: 1.5px; overflow: hidden; margin-top: 10px;">
                <div id="sms-progress-bar" style="width: 0%; height: 100%; background: var(--primary); transition: width 3.5s linear;"></div>
            </div>
        `;

        container.appendChild(modal);

        // Slide in
        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
        }, 50);

        // Animate progress bar
        setTimeout(() => {
            const progressBar = document.getElementById('sms-progress-bar');
            if (progressBar) progressBar.style.width = '100%';
        }, 100);

        // Stage 1: Sent (2.0s)
        setTimeout(() => {
            const statusTxt = document.getElementById('sms-status-text');
            const statusSpinner = document.getElementById('sms-status-spinner');
            if (statusTxt) {
                statusTxt.innerText = 'Sent ✓';
                statusTxt.style.color = 'var(--primary)';
            }
            if (statusSpinner) {
                statusSpinner.style.display = 'none';
            }
        }, 2000);

        // Stage 2: Delivered (3.5s)
        setTimeout(() => {
            const statusTxt = document.getElementById('sms-status-text');
            if (statusTxt) {
                statusTxt.innerText = 'Delivered ✓✓';
                statusTxt.style.color = 'var(--accent-green)';
            }
        }, 3500);

        // Stage 3: Slide out & remove (6.0s)
        setTimeout(() => {
            modal.style.transform = 'translateY(-120%)';
            setTimeout(() => modal.remove(), 400);
        }, 6500);
    }

    function autoBookSOSAmbulance(lat, lng) {
        // Set dynamic SOS destination location
        if (lat && lng) {
            sosLocation = [lat, lng];
        }
        
        const pName = document.getElementById('patient-name');
        const pPhone = document.getElementById('patient-phone');
        const pAge = document.getElementById('patient-age');
        const pGender = document.getElementById('patient-gender');
        const pNotes = document.getElementById('patient-notes');
        const pType = document.getElementById('type');
        
        const displayNameEl = document.getElementById('display-name');
        const displayPhoneEl = document.getElementById('display-phone');
        
        const profileName = displayNameEl ? (displayNameEl.innerText || "Demo User") : "Demo User";
        const profilePhone = displayPhoneEl ? (displayPhoneEl.innerText || "9876543210") : "9876543210";
        const cleanPhone = profilePhone.replace('+91 ', '').replace(/\s+/g, '');
        
        if (pName) pName.value = profileName;
        if (pPhone) pPhone.value = cleanPhone;
        if (pAge) pAge.value = "28";
        if (pGender) pGender.value = "male";
        if (pType) pType.value = "Advanced Life Support"; 
        
        if (pNotes) {
            const locStr = lat && lng ? `Latitude ${lat.toFixed(5)}, Longitude ${lng.toFixed(5)}` : "Salt Lake, Kolkata";
            pNotes.value = `🚨 AUTOMATED SOS IMPACT ALERT:\nSevere collision detected by mobile sensors at ${locStr}. Dispatch Advanced Life Support ICU ambulance immediately.`;
        }
        
        const critPill = document.querySelector('.severity-pill.critical');
        if (critPill) {
            setSeverity(critPill, 'critical');
        }
        
        document.querySelectorAll('.chip-pill').forEach(chip => {
            if (chip.innerText.includes('Bleeding')) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
        
        showToast("SOS Booking Active", "Locating nearest responder to your GPS coordinates...");
        
        setTimeout(() => {
            showToast("SOS Dispatch Confirmed!", "ALS ICU Ambulance WB-04-E-1234 dispatched to your live location.");
            navigate('tracking-screen');
            startTrackingPhase1();
        }, 1500);
    }

    // ─── Settings UI Handlers ─────────────────────────────────
    function registerSettingsHandlers() {
        const autoDetectChk = document.getElementById('setting-auto-detect');
        const sensitivityRange = document.getElementById('setting-sensitivity-range');
        const countdownRange = document.getElementById('setting-countdown-range');
        const soundChk = document.getElementById('setting-sound');
        const vibrateChk = document.getElementById('setting-vibrate');
        const autoSmsChk = document.getElementById('setting-autosms');
        const addContactBtn = document.getElementById('btn-add-contact');
        const sensorPermsBtn = document.getElementById('btn-request-sensor-perms');
        const testMotionSensorBtn = document.getElementById('btn-test-motion-sensor');
        const popupAudioBtn = document.getElementById('popup-audio-toggle');
        const appContainer = document.getElementById('app-container');
        
        if (autoDetectChk) {
            autoDetectChk.addEventListener('change', () => {
                safetySettings.autoDetect = autoDetectChk.checked;
                saveSafetySystem();
                if (safetySettings.autoDetect) {
                    initMotionSensors();
                } else {
                    stopDeviceMotion();
                }
            });
        }
        
        if (sensitivityRange) {
            sensitivityRange.addEventListener('input', () => {
                let val = parseInt(sensitivityRange.value);
                if (val === 1) safetySettings.sensitivity = "Low";
                else if (val === 2) safetySettings.sensitivity = "Medium";
                else if (val === 3) safetySettings.sensitivity = "High";
                saveSafetySystem();
                updateSettingsLabels();
            });
        }
        
        if (countdownRange) {
            countdownRange.addEventListener('input', () => {
                safetySettings.countdown = parseInt(countdownRange.value);
                saveSafetySystem();
                updateSettingsLabels();
            });
        }
        
        if (soundChk) {
            soundChk.addEventListener('change', () => {
                safetySettings.sound = soundChk.checked;
                saveSafetySystem();
            });
        }
        
        if (vibrateChk) {
            vibrateChk.addEventListener('change', () => {
                safetySettings.vibrate = vibrateChk.checked;
                saveSafetySystem();
            });
        }
        
        if (autoSmsChk) {
            autoSmsChk.addEventListener('change', () => {
                safetySettings.autoSms = autoSmsChk.checked;
                saveSafetySystem();
            });
        }
        
        if (addContactBtn) {
            addContactBtn.addEventListener('click', addContact);
        }
        
        if (sensorPermsBtn) {
            sensorPermsBtn.addEventListener('click', bindRealSensors);
        }

        if (testMotionSensorBtn) {
            testMotionSensorBtn.addEventListener('click', () => {
                isSensorTestMode = !isSensorTestMode;
                if (isSensorTestMode) {
                    testMotionSensorBtn.innerText = "Stop Sensor Test 🟢";
                    testMotionSensorBtn.style.background = "rgba(16,185,129,0.08)";
                    testMotionSensorBtn.style.borderColor = "rgba(16,185,129,0.25)";
                    testMotionSensorBtn.style.color = "var(--accent-green)";
                    
                    // Force initialize sensors if not running
                    initMotionSensors();
                    
                    showToast("Sensor Test Mode Active", "Threshold set to 1.3G for easy shake testing.");
                } else {
                    testMotionSensorBtn.innerText = "Test Motion Sensor";
                    testMotionSensorBtn.style.background = "rgba(0,209,255,0.08)";
                    testMotionSensorBtn.style.borderColor = "rgba(0,209,255,0.25)";
                    testMotionSensorBtn.style.color = "var(--primary)";
                    
                    showToast("Sensor Test Mode Stopped", "Threshold reverted to safety settings.");
                }
                updateSettingsLabels();
                
                // Telemetry status update trigger
                const telemetryStatusLbl = document.getElementById('telemetry-status-lbl');
                if (telemetryStatusLbl && isMotionListenerActive) {
                    telemetryStatusLbl.innerText = isSensorTestMode ? "Testing (1.3G)" : "Monitoring";
                }
            });
        }
        
        if (popupAudioBtn) {
            popupAudioBtn.addEventListener('click', () => {
                safetySettings.sound = !safetySettings.sound;
                popupAudioBtn.innerText = safetySettings.sound ? "🔊 Sound Alert On" : "🔇 Sound Alert Muted";
                if (safetySettings.sound) {
                    startSiren();
                } else {
                    stopSiren();
                }
                saveSafetySystem();
                if (soundChk) soundChk.checked = safetySettings.sound;
            });
        }
        
        const btnSafe = document.getElementById('btn-confirm-safe');
        if (btnSafe) btnSafe.addEventListener('click', cancelEmergencyAlert);
        
        const btnHelp = document.getElementById('btn-request-help');
        if (btnHelp) btnHelp.addEventListener('click', () => {
            triggerEmergencySOS(true);
        });
        
        if (appContainer) {
            appContainer.addEventListener('touchstart', (e) => {
                lastTouchX = e.touches[0].clientX;
                directionChanges = 0;
                lastDirection = 0;
                recordUserInteraction();
            });
            appContainer.addEventListener('touchmove', handleVirtualShake);
            appContainer.addEventListener('click', recordUserInteraction);
            appContainer.addEventListener('mousedown', recordUserInteraction);
        }
    }



    // ─── Toast System ─────────────────────────────────────────
    function showToast(title, desc, isError = false) {
        const existing = document.querySelector('.resq-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `resq-toast ${isError ? 'toast-error' : ''}`;
        toast.innerHTML = `
            <div class="toast-icon">${isError ? '⚠️' : '📱'}</div>
            <div class="toast-body">
                <div class="toast-title" style="text-align:left;">${title}</div>
                <div class="toast-desc" style="text-align:left;">${desc}</div>
            </div>
        `;
        
        document.getElementById('app-container').appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-slide-out');
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }

    // Explicit Global Scope Exposure
    window.triggerImpactDetected = triggerImpactDetected;
    window.triggerEmergencySOS = triggerEmergencySOS;
    window.cancelEmergencyAlert = cancelEmergencyAlert;
    window.autoBookSOSAmbulance = autoBookSOSAmbulance;
    window.navigate = navigate;
    window.openAmbulancePortal = openAmbulancePortal;
    window.toggleTheme = toggleTheme;
    window.setSeverity = setSeverity;
    window.toggleChip = toggleChip;
    window.toggleHospitalCard = toggleHospitalCard;
    window.processPayment = processPayment;
    window.startTrackingPhase1 = startTrackingPhase1;
    window.startTrackingPhase2 = startTrackingPhase2;
    window.rateStar = rateStar;
    window.submitReview = submitReview;
    window.toggleProfileEdit = toggleProfileEdit;
    window.saveProfile = saveProfile;
    window.toggleChat = toggleChat;
    window.openBloodPortal = openBloodPortal;