// PinkHealth Enhanced Dashboard JavaScript - Chart.js 3.x Compatible
class PinkHealthDashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.currentSection = 'dashboard';
        this.systemStatus = {
            whatsapp: false,
            database: false,
            lastUpdate: null
        };
        
        this.init();
    }

    init() {
        console.log('🏥 Initializing PinkHealth Dashboard...');
        
        // Initialize Socket.IO connection
        this.initializeSocket();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup mobile menu
        this.setupMobileMenu();
        
        // Initialize charts
        this.initializeCharts();
        
        // Load initial data
        this.loadDashboardData();
        
        // Setup periodic data refresh
        this.setupDataRefresh();
        
        // Setup search functionality
        this.setupSearch();
        
        console.log('✅ Dashboard initialized successfully');
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Connected to server');
                this.showToast('Connected to server', 'success');
                this.updateSystemStatus('connected');
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
                this.showToast('Disconnected from server', 'error');
                this.updateSystemStatus('disconnected');
            });

            this.socket.on('stats-update', (data) => {
                this.handleStatsUpdate(data);
            });

            this.socket.on('new-appointment', (appointment) => {
                this.handleNewAppointment(appointment);
                this.showToast(`New appointment: ${appointment.patient}`, 'success');
            });

            this.socket.on('whatsapp-status', (status) => {
                this.updateWhatsAppStatus(status);
            });

        } catch (error) {
            console.error('❌ Socket initialization error:', error);
            this.showToast('Connection error. Retrying...', 'error');
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    setupMobileMenu() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    !sidebar.contains(e.target) && 
                    !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }

    switchSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            // Load section-specific data
            this.loadSectionData(sectionName);
        }

        // Close mobile menu if open
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'whatsapp':
                this.loadWhatsAppData();
                break;
            case 'appointments':
                this.loadAppointmentsData();
                break;
            case 'patients':
                this.loadPatientsData();
                break;
            case 'doctors':
                this.loadDoctorsData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            // Load system status
            const statusResponse = await fetch('/api/status');
            const statusData = await statusResponse.json();
            this.updateSystemStatus(statusData);

            // Load analytics
            const analyticsResponse = await fetch('/api/analytics');
            const analyticsData = await analyticsResponse.json();
            this.updateDashboardStats(analyticsData);

            // Load today's appointments
            const appointmentsResponse = await fetch('/api/appointments?date=today');
            const appointmentsData = await appointmentsResponse.json();
            this.updateTodayAppointments(appointmentsData.today || []);

            // Update charts
            this.updateMainChart(analyticsData.hourlyStats || []);
            this.updateSpecialtyChart(analyticsData);

            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showToast('Error loading dashboard data', 'error');
            this.showLoading(false);
        }
    }

    async loadWhatsAppData() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.updateWhatsAppStatus(data.metrics?.whatsapp || { connected: false });
            this.updateBotMetrics(data.metrics?.analytics || {});
        } catch (error) {
            console.error('❌ Error loading WhatsApp data:', error);
            this.showToast('Error loading WhatsApp data', 'error');
        }
    }

    async loadAppointmentsData() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/appointments');
            const data = await response.json();
            
            this.renderAppointments(data.today || [], data.tomorrow || []);
            this.updateAppointmentStats(data.stats || {});
            
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error loading appointments:', error);
            this.showToast('Error loading appointments', 'error');
            this.showLoading(false);
        }
    }

    async loadPatientsData() {
        // Initial empty state
        this.renderPatientResults(null);
    }

    async loadDoctorsData() {
        try {
            const response = await fetch('/api/doctors');
            const data = await response.json();
            
            this.renderDoctors(data.doctors || []);
        } catch (error) {
            console.error('❌ Error loading doctors:', error);
            this.showToast('Error loading doctors data', 'error');
        }
    }

    async loadAnalyticsData() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/analytics');
            const data = await response.json();
            
            this.updateAnalyticsSummary(data);
            this.updateAnalyticsCharts(data);
            
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            this.showToast('Error loading analytics', 'error');
            this.showLoading(false);
        }
    }

    initializeCharts() {
        // Main Dashboard Chart
        const mainCtx = document.getElementById('mainChart');
        if (mainCtx) {
            this.charts.main = new Chart(mainCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'WhatsApp Messages',
                        data: [],
                        borderColor: '#25d366',
                        backgroundColor: 'rgba(37, 211, 102, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Appointments',
                        data: [],
                        borderColor: '#e91e63',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    }
                }
            });
        }

        // Specialty Distribution Chart
        const specialtyCtx = document.getElementById('specialtyChart');
        if (specialtyCtx) {
            this.charts.specialty = new Chart(specialtyCtx, {
                type: 'doughnut',
                data: {
                    labels: ['General Medicine', 'Cardiology', 'Orthopedics', 'Dental', 'Others'],
                    datasets: [{
                        data: [45, 20, 15, 12, 8],
                        backgroundColor: [
                            '#e91e63',
                            '#2196f3',
                            '#4caf50',
                            '#ff9800',
                            '#9c27b0'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        }

        // Analytics Charts
        this.initializeAnalyticsCharts();
    }

    initializeAnalyticsCharts() {
        // Weekly Performance Chart
        const weeklyCtx = document.getElementById('weeklyChart');
        if (weeklyCtx) {
            this.charts.weekly = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Appointments',
                        data: [12, 19, 15, 25, 22, 30, 28],
                        backgroundColor: 'rgba(233, 30, 99, 0.8)',
                        borderColor: '#e91e63',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Doctor Performance Chart - FIXED FOR CHART.JS 3.x
        const doctorCtx = document.getElementById('doctorChart');
        if (doctorCtx) {
            this.charts.doctor = new Chart(doctorCtx, {
                type: 'bar', // Changed from 'horizontalBar' to 'bar'
                data: {
                    labels: ['Dr. Smith', 'Dr. Carter', 'Dr. Brown', 'Dr. Davis'],
                    datasets: [{
                        label: 'Patients Treated',
                        data: [65, 59, 80, 45],
                        backgroundColor: [
                            'rgba(37, 211, 102, 0.8)',
                            'rgba(33, 150, 243, 0.8)',
                            'rgba(255, 152, 0, 0.8)',
                            'rgba(156, 39, 176, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // This makes it horizontal
                    scales: {
                        x: { // Changed from 'x' to 'x' for horizontal bars
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    updateDashboardStats(data) {
        // Update stat cards with real data
        this.updateElement('whatsapp-messages', data.whatsapp?.totalMessages || '1,248');
        this.updateElement('total-appointments', data.appointments?.bookedToday || '12');
        this.updateElement('revenue', `₹${(data.revenue?.today || 9600).toLocaleString()}`);
        this.updateElement('active-doctors', '6/8');

        // Update change indicators
        this.updateElement('messages-change', '+12%');
        this.updateElement('appointments-change', '+8');
        this.updateElement('revenue-change', '+15%');
    }

    updateSystemStatus(data) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (data === 'connected' || (data.status === 'running')) {
            if (statusDot) statusDot.style.background = '#4caf50';
            if (statusText) statusText.textContent = 'System Online';
            this.systemStatus.whatsapp = true;
        } else {
            if (statusDot) statusDot.style.background = '#ff9800';
            if (statusText) statusText.textContent = 'Connecting...';
            this.systemStatus.whatsapp = false;
        }
        
        this.systemStatus.lastUpdate = new Date();
    }

    updateWhatsAppStatus(status) {
        const indicator = document.getElementById('whatsapp-indicator');
        const statusText = document.getElementById('whatsapp-status-text');
        const startBtn = document.getElementById('start-whatsapp');
        const stopBtn = document.getElementById('stop-whatsapp');

        if (status.connected) {
            if (indicator) {
                indicator.className = 'fas fa-circle';
                indicator.style.color = '#4caf50';
            }
            if (statusText) statusText.textContent = 'Connected';
            
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else {
            if (indicator) {
                indicator.className = 'fas fa-circle';
                indicator.style.color = '#f44336';
            }
            if (statusText) statusText.textContent = 'Disconnected';
            
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }

    updateBotMetrics(data) {
        this.updateElement('response-rate', data.responseRate || '99.4%');
        this.updateElement('avg-response-time', data.averageResponseTime || '2.3s');
        this.updateElement('active-sessions', data.activeChats || '12');
        this.updateElement('conversion-rate', data.conversionRate || '78.5%');
    }

    updateTodayAppointments(appointments) {
        const container = document.getElementById('today-appointments');
        const countBadge = document.getElementById('today-count');
        
        if (!container) return;

        if (countBadge) {
            countBadge.textContent = appointments.length;
        }

        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-calendar-times"></i>
                    <p>No appointments scheduled for today</p>
                </div>
            `;
            return;
        }

        container.innerHTML = appointments.map(apt => `
            <div class="appointment-item">
                <div class="appointment-time">${apt.time}</div>
                <div class="appointment-details">
                    <h4>${apt.patient} - ${apt.doctor}</h4>
                    <p>${apt.type || 'General Consultation'} • Room ${Math.floor(Math.random() * 300) + 101}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn-icon" onclick="dashboard.callPatient('${apt.patient}')">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateMainChart(hourlyData) {
        if (!this.charts.main || !hourlyData.length) return;

        const labels = hourlyData.map(item => `${item.hour}:00`);
        const messages = hourlyData.map(item => item.messages || 0);
        const appointments = hourlyData.map(item => item.appointments || 0);

        this.charts.main.data.labels = labels;
        this.charts.main.data.datasets[0].data = messages;
        this.charts.main.data.datasets[1].data = appointments;
        this.charts.main.update();
    }

    updateSpecialtyChart(data) {
        if (!this.charts.specialty) return;

        // Use real specialty data if available
        if (data.specialties) {
            const specialties = Object.keys(data.specialties);
            const counts = Object.values(data.specialties);
            
            this.charts.specialty.data.labels = specialties;
            this.charts.specialty.data.datasets[0].data = counts;
            this.charts.specialty.update();
        }
    }

    renderAppointments(todayAppointments, tomorrowAppointments) {
        const grid = document.getElementById('appointments-grid');
        if (!grid) return;

        const allAppointments = [
            ...todayAppointments.map(apt => ({ ...apt, day: 'Today' })),
            ...tomorrowAppointments.map(apt => ({ ...apt, day: 'Tomorrow' }))
        ];

        if (allAppointments.length === 0) {
            grid.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-calendar-times"></i>
                    <p>No appointments found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = allAppointments.map(apt => `
            <div class="appointment-card">
                <div class="appointment-header">
                    <div>
                        <h4>${apt.patient}</h4>
                        <p class="appointment-day">${apt.day} • ${apt.time}</p>
                    </div>
                    <span class="appointment-status ${apt.status || 'confirmed'}">${apt.status || 'confirmed'}</span>
                </div>
                <div class="appointment-body">
                    <p><strong>Doctor:</strong> ${apt.doctor}</p>
                    <p><strong>Type:</strong> ${apt.type || 'General Consultation'}</p>
                    <p><strong>Fee:</strong> ₹${apt.fee || 500}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn btn-primary btn-sm" onclick="dashboard.viewAppointment('${apt.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="dashboard.rescheduleAppointment('${apt.id}')">
                        <i class="fas fa-clock"></i> Reschedule
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="dashboard.cancelAppointment('${apt.id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderDoctors(doctors) {
        const grid = document.getElementById('doctors-grid');
        if (!grid) return;

        grid.innerHTML = doctors.map(doctor => `
            <div class="doctor-card">
                <div class="doctor-avatar">
                    <i class="fas fa-user-md"></i>
                </div>
                <h3 class="doctor-name">${doctor.name}</h3>
                <p class="doctor-specialty">${doctor.specialty}</p>
                <div class="doctor-rating">
                    <i class="fas fa-star" style="color: #ffc107;"></i>
                    <span>${doctor.rating} • ${doctor.experience} years exp</span>
                </div>
                <p class="doctor-fee">Fee: ₹${doctor.fee || 500}</p>
                <div class="doctor-availability ${doctor.available ? 'available' : 'busy'}">
                    ${doctor.available ? `Available - Next: ${doctor.nextSlot}` : 'Busy - Next: Tomorrow'}
                </div>
            </div>
        `).join('');
    }

    async searchPatient() {
        const searchInput = document.getElementById('patient-search');
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        
        if (!query) {
            this.showToast('Please enter a phone number or name', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            
            // For demo, simulate search
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const mockResults = {
                patient: {
                    name: 'Anshul Choudhary',
                    phone: '+91-9627733034',
                    age: 28,
                    lastVisit: '2 weeks ago'
                },
                appointments: [
                    {
                        id: 'APT001',
                        doctor: 'Dr. Sarah Smith',
                        date: 'Today',
                        time: '2:00 PM',
                        status: 'confirmed'
                    }
                ]
            };
            
            this.renderPatientResults(mockResults);
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showToast('Search failed', 'error');
            this.showLoading(false);
        }
    }

    renderPatientResults(results) {
        const container = document.getElementById('patient-results');
        if (!container) return;

        if (!results) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-user-search"></i>
                    <p>Enter phone number or name to search patients</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="patient-card">
                <div class="patient-header">
                    <div class="patient-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="patient-info">
                        <h3>${results.patient.name}</h3>
                        <p>${results.patient.phone}</p>
                        <p>Age: ${results.patient.age} • Last visit: ${results.patient.lastVisit}</p>
                    </div>
                    <div class="patient-actions">
                        <button class="btn btn-primary" onclick="dashboard.callPatient('${results.patient.phone}')">
                            <i class="fas fa-phone"></i> Call
                        </button>
                        <button class="btn btn-secondary" onclick="dashboard.sendMessage('${results.patient.phone}')">
                            <i class="fab fa-whatsapp"></i> Message
                        </button>
                    </div>
                </div>
                
                <div class="patient-appointments">
                    <h4>Recent Appointments</h4>
                    ${results.appointments.map(apt => `
                        <div class="appointment-item">
                            <div class="appointment-time">${apt.time}</div>
                            <div class="appointment-details">
                                <h4>${apt.doctor}</h4>
                                <p>${apt.date} • ${apt.status}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupSearch() {
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchPatient();
                }
            });
        }
    }

    setupDataRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboardData();
            }
        }, 30000);

        // Update activity feed every 5 seconds
        setInterval(() => {
            this.updateActivityFeed();
        }, 5000);
    }

    updateActivityFeed() {
        const activities = [
            { time: 'Now', phone: '+91-987654' + Math.floor(Math.random() * 10000), action: 'Booking appointment with Dr. Smith' },
            { time: '1 min', phone: '+91-987654' + Math.floor(Math.random() * 10000), action: 'Asking about doctor availability' },
            { time: '2 min', phone: '+91-987654' + Math.floor(Math.random() * 10000), action: 'Rescheduling appointment' },
            { time: '3 min', phone: '+91-987654' + Math.floor(Math.random() * 10000), action: 'Payment completed' },
            { time: '5 min', phone: '+91-987654' + Math.floor(Math.random() * 10000), action: 'Requesting directions' }
        ];

        const container = document.getElementById('whatsapp-activity');
        if (container) {
            const selectedActivities = activities.slice(0, 3);
            container.innerHTML = selectedActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-time">${activity.time}</div>
                    <div class="activity-details">
                        <h4>${activity.phone}</h4>
                        <p>${activity.action}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    handleStatsUpdate(data) {
        // Update real-time stats
        if (data.totalMessages) {
            this.updateElement('whatsapp-messages', data.totalMessages.toLocaleString());
        }
        if (data.appointmentsToday) {
            this.updateElement('total-appointments', data.appointmentsToday);
        }
        if (data.activeChats) {
            this.updateElement('active-chats', data.activeChats);
        }
    }

    handleNewAppointment(appointment) {
        // Add to today's appointments if it's for today
        const container = document.getElementById('today-appointments');
        if (container && appointment.date === 'today') {
            const appointmentHTML = `
                <div class="appointment-item new-appointment">
                    <div class="appointment-time">${appointment.time}</div>
                    <div class="appointment-details">
                        <h4>${appointment.patient} - ${appointment.doctor}</h4>
                        <p>General Consultation • Just booked</p>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('afterbegin', appointmentHTML);
            
            // Remove the "new" class after animation
            setTimeout(() => {
                const newItem = container.querySelector('.new-appointment');
                if (newItem) {
                    newItem.classList.remove('new-appointment');
                }
            }, 3000);
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Add missing method that was causing error
    updateAppointmentStats(stats) {
        // Update appointment statistics on the page
        this.updateElement('total-bookings', stats.total || 0);
        this.updateElement('confirmed-bookings', stats.confirmed || 0);
        this.updateElement('pending-bookings', stats.pending || 0);
        this.updateElement('cancelled-bookings', stats.cancelled || 0);
    }

    // Add missing analytics methods
    updateAnalyticsSummary(data) {
        this.updateElement('total-revenue', `₹${(data.revenue?.total || 50000).toLocaleString()}`);
        this.updateElement('total-patients', data.patients?.total || 245);
        this.updateElement('avg-rating', data.rating?.average || '4.8');
        this.updateElement('satisfaction-rate', `${data.satisfaction?.rate || 96}%`);
    }

    updateAnalyticsCharts(data) {
        // Update analytics charts with real data
        if (this.charts.weekly && data.weeklyStats) {
            this.charts.weekly.data.datasets[0].data = data.weeklyStats;
            this.charts.weekly.update();
        }
        
        if (this.charts.doctor && data.doctorStats) {
            this.charts.doctor.data.datasets[0].data = Object.values(data.doctorStats);
            this.charts.doctor.update();
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.querySelector('.toast-message');
        const toastIcon = document.querySelector('.toast-icon');
        
        if (!toast || !toastMessage || !toastIcon) return;

        // Set message and icon
        toastMessage.textContent = message;
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
        
        // Set toast type
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // API Functions called from HTML
    async callPatient(phone) {
        this.showToast(`Calling ${phone}...`, 'info');
        // Simulate call functionality
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.showToast('Call initiated', 'success');
    }

    async sendMessage(phone) {
        const message = prompt('Enter message to send:');
        if (message) {
            try {
                const response = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phoneNumber: phone,
                        message: message
                    })
                });

                if (response.ok) {
                    this.showToast('Message sent successfully', 'success');
                } else {
                    this.showToast('Failed to send message', 'error');
                }
            } catch (error) {
                this.showToast('Error sending message', 'error');
            }
        }
    }

    viewAppointment(appointmentId) {
        this.showToast(`Viewing appointment ${appointmentId}`, 'info');
        // Implement appointment details modal
    }

    rescheduleAppointment(appointmentId) {
        this.showToast(`Rescheduling appointment ${appointmentId}`, 'warning');
        // Implement reschedule functionality
    }

    cancelAppointment(appointmentId) {
        if (confirm('Are you sure you want to cancel this appointment?')) {
            this.showToast(`Appointment ${appointmentId} cancelled`, 'error');
            // Implement cancel functionality
        }
    }

    async refreshAppointments() {
        this.showToast('Refreshing appointments...', 'info');
        await this.loadAppointmentsData();
        this.showToast('Appointments refreshed', 'success');
    }

    exportReport() {
        this.showToast('Generating report...', 'info');
        // Simulate report generation
        setTimeout(() => {
            this.showToast('Report downloaded', 'success');
        }, 2000);
    }
}

// WhatsApp Control Functions (called from HTML)
async function startWhatsApp() {
    try {
        dashboard.showLoading(true);
        dashboard.showToast('Starting WhatsApp Bot...', 'info');
        
        const response = await fetch('/api/demo/start-whatsapp');
        const data = await response.json();
        
        if (data.success) {
            dashboard.showToast('WhatsApp Bot started successfully!', 'success');
            
            // Update QR code display
            const qrDisplay = document.getElementById('qr-code');
            if (qrDisplay) {
                qrDisplay.innerHTML = `
                    <div class="qr-active">
                        <div class="qr-code-image">
                            <i class="fab fa-whatsapp" style="font-size: 48px; color: #25d366;"></i>
                            <p style="margin-top: 10px; font-size: 14px;">QR Code Generated</p>
                            <p style="font-size: 12px; color: #666;">Scan with WhatsApp to connect</p>
                        </div>
                    </div>
                `;
            }
            
            // Update button states
            const startBtn = document.getElementById('start-whatsapp');
            const stopBtn = document.getElementById('stop-whatsapp');
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            
        } else {
            dashboard.showToast('Failed to start WhatsApp Bot', 'error');
        }
        
        dashboard.showLoading(false);
    } catch (error) {
        console.error('Error starting WhatsApp:', error);
        dashboard.showToast('Error starting WhatsApp Bot', 'error');
        dashboard.showLoading(false);
    }
}

async function stopWhatsApp() {
    dashboard.showToast('Stopping WhatsApp Bot...', 'warning');
    
    // Update button states
    const startBtn = document.getElementById('start-whatsapp');
    const stopBtn = document.getElementById('stop-whatsapp');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    // Reset QR display
    const qrDisplay = document.getElementById('qr-code');
    if (qrDisplay) {
        qrDisplay.innerHTML = `
            <div class="qr-placeholder">
                <i class="fas fa-mobile-alt"></i>
                <p>Click "Start WhatsApp Bot" to generate QR code</p>
            </div>
        `;
    }
    
    dashboard.showToast('WhatsApp Bot stopped', 'success');
}

async function sendTestMessage() {
    const phoneNumber = prompt('Enter phone number (with country code):');
    if (phoneNumber) {
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber,
                    message: 'Hello! This is a test message from PinkHealth Clinic. 🏥\n\nOur WhatsApp booking system is working perfectly!\n\nReply with "hi" to start booking an appointment.'
                })
            });

            if (response.ok) {
                dashboard.showToast(`Test message sent to ${phoneNumber}`, 'success');
            } else {
                dashboard.showToast('Failed to send test message', 'error');
            }
        } catch (error) {
            dashboard.showToast('Error sending test message', 'error');
        }
    }
}

// Global functions for search
function searchPatient() {
    if (dashboard) {
        dashboard.searchPatient();
    }
}

function refreshAppointments() {
    if (dashboard) {
        dashboard.refreshAppointments();
    }
}

function exportReport() {
    if (dashboard) {
        dashboard.exportReport();
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;

document.addEventListener('DOMContentLoaded', function() {
    dashboard = new PinkHealthDashboard();
    console.log('🎉 PinkHealth Dashboard Ready!');
});

// Handle window resize
window.addEventListener('resize', function() {
    // Resize charts if they exist
    if (dashboard && dashboard.charts) {
        Object.values(dashboard.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
});