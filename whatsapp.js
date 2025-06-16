// whatsapp.js - Main WhatsApp System (FIXED + Organized)
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { PinkHealthDatabase } = require('./database');
const { ConversationFlowHandler } = require('./flows');
const { SystemServices } = require('./services');

class PinkHealthWhatsAppSystem {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "pinkhealth-clinic-system"
            }),
            puppeteer: {
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            }
        });
        
        // Initialize core components
        this.database = new PinkHealthDatabase();
        this.flowHandler = new ConversationFlowHandler(this);
        this.services = new SystemServices();
        
        // Session management
        this.userSessions = new Map();
        
        // Mock data (fallback)
        this.patients = new Map();
        this.appointments = new Map();
        this.doctors = this.initializeDoctors();
        
        this.setupEventHandlers();
    }

    initializeDoctors() {
        return {
            'general': [
                {
                    id: 'dr_smith',
                    name: 'Dr. Sarah Smith',
                    specialty: 'General Medicine',
                    experience: 12,
                    rating: 4.8,
                    fee: 500,
                    available: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    qualifications: 'MBBS, MD (Internal Medicine)'
                },
                {
                    id: 'dr_wilson',
                    name: 'Dr. Lisa Wilson',
                    specialty: 'General Medicine',
                    experience: 8,
                    rating: 4.6,
                    fee: 450,
                    available: ['08:00', '09:30', '11:00', '16:00', '18:00'],
                    qualifications: 'MBBS, MD (Family Medicine)'
                }
            ],
            'cardiology': [
                {
                    id: 'dr_john',
                    name: 'Dr. John Carter',
                    specialty: 'Cardiology',
                    experience: 15,
                    rating: 4.9,
                    fee: 800,
                    available: ['10:00', '11:30', '14:30', '16:00'],
                    qualifications: 'MBBS, MD, DM (Cardiology)'
                }
            ],
            'orthopedics': [
                {
                    id: 'dr_brown',
                    name: 'Dr. Michael Brown',
                    specialty: 'Orthopedics',
                    experience: 20,
                    rating: 4.7,
                    fee: 700,
                    available: ['09:30', '11:00', '15:00', '16:30'],
                    qualifications: 'MBBS, MS (Orthopedics)'
                }
            ],
            'dental': [
                {
                    id: 'dr_davis',
                    name: 'Dr. Emma Davis',
                    specialty: 'Dental',
                    experience: 10,
                    rating: 4.8,
                    fee: 600,
                    available: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    qualifications: 'BDS, MDS (Oral Surgery)'
                }
            ]
        };
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('🏥 PinkHealth Clinic WhatsApp QR Code:');
            qrcode.generate(qr, { small: true });
            console.log('📱 Scan with your phone to connect clinic\'s WhatsApp');
        });

        this.client.on('ready', () => {
            console.log('✅ PinkHealth WhatsApp System is ready!');
            console.log('🚀 DocTime virtual assistant is now live!');
        });

        this.client.on('message', async (message) => {
            try {
                if (!message.from.endsWith('@c.us')) return;
                await this.handleIncomingMessage(message);
            } catch (error) {
                console.error('❌ Message handling error:', error.message);
                try {
                    await this.client.sendMessage(message.from, 
                        '⚠️ Sorry, I encountered an error. Please try again or type "help" for assistance.');
                } catch (sendError) {
                    console.error('❌ Failed to send error message:', sendError.message);
                }
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp disconnected:', reason);
        });

        this.client.on('error', (error) => {
            console.error('❌ WhatsApp Client Error:', error.message);
        });
    }

    async handleIncomingMessage(message) {
        const phoneNumber = message.from.replace('@c.us', '');
        const messageBody = message.body.toLowerCase().trim();
        const contact = await message.getContact();
        const userName = contact.pushname || contact.name || 'Patient';

        console.log(`📱 Message from ${userName} (${phoneNumber}): ${message.body}`);

        // Emergency detection first 
        if (this.detectEmergency(messageBody)) {
            await this.handleEmergency(message.from, userName);
            return;
        }

        // Quick commands - these should always work
        if (await this.handleQuickCommands(message.from, messageBody, userName, phoneNumber)) {
            return;
        }

        // 🎯 MAIN ROUTING - Use FlowHandler
        await this.flowHandler.routeMessage(message.from, messageBody, userName, phoneNumber);
    }

    detectEmergency(message) {
        const emergencyKeywords = [
            'emergency', 'accident', 'unconscious', 'severe pain', 
            'chest pain', 'breathing problem', 'bleeding', 'heart attack',
            'stroke', 'urgent', 'critical'
        ];
        return emergencyKeywords.some(keyword => message.includes(keyword));
    }

    async handleEmergency(chatId, userName) {
        this.userSessions.delete(chatId.replace('@c.us', ''));
        
        const emergencyMessage = `🚨 **This sounds like a medical emergency!**

For immediate life-threatening situations:
📞 **Call Emergency: 108**
🏥 **Nearest Hospital:** Apollo Hospital, Sector 26, Noida
📍 Emergency Ward: 24x7 Open

I'm connecting you to our clinic staff for urgent assistance.

⚠️ **Please seek immediate medical attention at the nearest hospital.**`;

        await this.client.sendMessage(chatId, emergencyMessage);
        await this.escalateToStaff(chatId, userName, 'EMERGENCY');
    }

    async handleQuickCommands(chatId, message, userName, phoneNumber) {
        const commands = {
            'menu': () => this.sendMainMenu(chatId, userName),
            'book': () => this.flowHandler.startBookingFlow(chatId, userName, phoneNumber),
            'cancel': () => this.flowHandler.startCancelFlow(chatId, userName, phoneNumber),
            'reschedule': () => this.flowHandler.startRescheduleFlow(chatId, userName, phoneNumber),
            'status': () => this.sendAppointmentStatus(chatId, userName),
            'doctors': () => this.sendDoctorList(chatId),
            'directions': () => this.sendDirections(chatId),
            'help': () => this.escalateToStaff(chatId, userName, 'HELP_REQUEST'),
            'today': () => this.sendTodayAppointments(chatId, userName),
            'tomorrow': () => this.sendTomorrowAvailability(chatId),
            'history': () => this.sendAppointmentHistory(chatId, userName),
            'fees': () => this.sendConsultationCharges(chatId)
        };

        if (commands[message]) {
            this.userSessions.delete(phoneNumber);
            await commands[message]();
            return true;
        }
        return false;
    }

    async checkPatientStatus(phoneNumber) {
        // Database check first
        if (this.database && this.database.connected && !process.env.DEMO_MODE) {
            try {
                console.log('🗄️ Checking patient status in database...');
                
                const patient = await this.database.findPatientByPhone(phoneNumber);
                
                if (patient) {
                    const activeAppointments = await this.database.getPatientAppointments(patient.patientId, 'active');
                    
                    return {
                        name: patient.name,
                        hasActiveAppointments: activeAppointments.length > 0,
                        appointmentCount: activeAppointments.length,
                        appointments: activeAppointments.map(apt => ({
                            id: apt.appointmentId,
                            doctor: apt.doctorName,
                            specialty: apt.specialty,
                            date: apt.appointmentDate,
                            time: apt.appointmentTime,
                            status: apt.status
                        })),
                        isReturning: true,
                        patientId: patient.patientId
                    };
                } else {
                    const hasHistory = await this.database.hasAppointmentHistory(phoneNumber);
                    
                    if (hasHistory) {
                        return {
                            name: 'Returning Patient',
                            hasActiveAppointments: false,
                            isReturning: true,
                            lastVisit: '2 weeks ago'
                        };
                    }
                    
                    return {
                        hasActiveAppointments: false,
                        isReturning: false,
                        isNew: true
                    };
                }
            } catch (error) {
                console.log('⚠️ Database query failed, using mock data:', error.message);
            }
        }

        // Mock patient data fallback
        const mockPatients = {
            '919627733034': {
                name: 'Anshul Choudhary',
                hasActiveAppointments: true,
                appointmentCount: 1,
                appointments: [{
                    id: 'APT001',
                    doctor: 'Dr. Sarah Smith',
                    specialty: 'General Medicine',
                    date: 'Today',
                    time: '2:00 PM',
                    status: 'confirmed'
                }],
                isReturning: true
            },
            '919967160616': {
                name: 'Choudhary',
                hasActiveAppointments: false,
                isReturning: false,
                isNew: true
            }
        };

        if (mockPatients[phoneNumber]) {
            return mockPatients[phoneNumber];
        }

        // Default new patient
        return {
            hasActiveAppointments: false,
            isReturning: false,
            isNew: true
        };
    }

    // Core messaging functions
    async sendMessage(phoneNumber, message) {
        try {
            const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
            await this.client.sendMessage(chatId, message);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    async getSystemStatus() {
        try {
            const state = await this.client.getState();
            return {
                connected: state === 'CONNECTED',
                state: state,
                totalPatients: this.patients.size,
                totalAppointments: this.appointments.size,
                activeSessions: this.userSessions.size,
                database: this.database && this.database.connected ? 'connected' : 'disconnected'
            };
        } catch (error) {
            return {
                connected: false,
                state: 'error',
                totalPatients: this.patients.size,
                totalAppointments: this.appointments.size,
                activeSessions: this.userSessions.size,
                database: 'error',
                error: error.message
            };
        }
    }

    // Information sending functions
    async sendMainMenu(chatId, userName) {
        const message = `🏥 **PinkHealth Clinic - Main Menu** 

Hi ${userName}! How can I help you today?

**APPOINTMENT SERVICES:**
• Type "book" - Book New Appointment
• Type "status" - Check Appointment Status  
• Type "reschedule" - Reschedule Appointment
• Type "cancel" - Cancel Appointment

**INFORMATION & SUPPORT:**
• Type "doctors" - View Doctor Profiles
• Type "directions" - Get Clinic Location
• Type "fees" - View Consultation Charges
• Type "help" - Talk to Staff

**QUICK COMMANDS:**
• Type "today" - Today's appointments
• Type "tomorrow" - Tomorrow's availability
• Type "history" - Past appointments

*Just type any command above!*`;

        await this.client.sendMessage(chatId, message);
    }

    async sendDoctorList(chatId) {
        const message = `👨‍⚕️ **Our Expert Doctors** 

🩺 **GENERAL MEDICINE**
• Dr. Sarah Smith - 12+ years exp ⭐4.8
• Dr. Lisa Wilson - 8+ years exp ⭐4.6

❤️ **CARDIOLOGY** 
• Dr. John Carter - 15+ years exp ⭐4.9

🦴 **ORTHOPEDICS**
• Dr. Michael Brown - 20+ years exp ⭐4.7

🦷 **DENTAL**
• Dr. Emma Davis - 10+ years exp ⭐4.8

*To book with any doctor, type:*
"Book [Doctor Name]"

Example: "Book Dr. Smith" 📱

*Or reply with specialty:*
1. General Medicine
2. Cardiology  
3. Orthopedics
4. Dental
5. Eye Care
6. All Doctors`;

        await this.client.sendMessage(chatId, message);
    }

    async sendDirections(chatId) {
        const message = `🗺️ **PinkHealth Clinic Location**

📍 **Address:**
PinkHealth Clinic
Sector 18, Noida - 201301
Uttar Pradesh, India

🚗 **How to Reach:**
• Metro: Noida Sector 18 Metro Station (500m walk)
• By Car: Parking available
• Auto/Cab: Show this address to driver

📞 **Contact:** +91-120-4567890

🕐 **Clinic Hours:**
Mon-Sat: 9:00 AM - 8:00 PM
Sunday: 10:00 AM - 6:00 PM

📱 **Google Maps:** https://maps.google.com/?q=PinkHealth+Clinic+Sector+18+Noida

Need anything else? Reply with:
1. 📅 Add to Calendar  2. 📋 Instructions  3. 📅 Book Another  4. ✅ Done`;

        await this.client.sendMessage(chatId, message);
    }

    async sendAppointmentStatus(chatId, userName) {
        const message = `📋 **Your Appointment Status - ${userName}**

**UPCOMING APPOINTMENTS:**

📅 **Today, 2:00 PM**
👨‍⚕️ Dr. Sarah Smith - General Medicine
📍 Room 205, 2nd Floor
🎫 Token: PH-2025-001

*Need to reschedule?* Type "reschedule"
*Need to cancel?* Type "cancel"`;

        await this.client.sendMessage(chatId, message);
    }

    async sendTodayAppointments(chatId, userName) {
        const message = `📅 **Today's Appointments - ${userName}**

**YOUR APPOINTMENTS:**

⏰ **2:00 PM**
👨‍⚕️ Dr. Sarah Smith - General Medicine
📍 Room 205, 2nd Floor
🎫 Token: PH-2025-001

**PREPARATION:**
✅ Arrive 15 minutes early
✅ Bring valid ID proof
✅ Previous medical reports
✅ Insurance card (if applicable)

*Running late?* Call: +91-120-4567890`;

        await this.client.sendMessage(chatId, message);
    }

    async sendTomorrowAvailability(chatId) {
        const message = `📅 **Tomorrow's Availability**

🩺 **GENERAL MEDICINE**
• Dr. Sarah Smith: 9:00 AM, 2:00 PM, 4:00 PM
• Dr. Lisa Wilson: 10:30 AM, 3:30 PM, 5:00 PM

❤️ **CARDIOLOGY**
• Dr. John Carter: 11:00 AM, 2:30 PM

🦴 **ORTHOPEDICS** 
• Dr. Michael Brown: 9:30 AM, 1:00 PM, 4:30 PM

🦷 **DENTAL**
• Dr. Emma Davis: 10:00 AM, 12:00 PM, 3:00 PM

*To book:* Type "Book Dr. [Name] [Time]"
*Example:* "Book Dr. Smith 9:00 AM"`;

        await this.client.sendMessage(chatId, message);
    }

    async sendAppointmentHistory(chatId, userName) {
        const message = `📋 **Appointment History - ${userName}**

**RECENT VISITS:**

✅ **Jan 10, 2025**
👨‍⚕️ Dr. Lisa Wilson - General Medicine
💊 Prescription: Paracetamol, Rest
💰 Fee: ₹500

✅ **Dec 28, 2024**
🧪 Lab Tests - Blood Work
📊 Reports: Normal
💰 Fee: ₹800

*Need reports?* Type "reports"
*Follow-up needed?* Type "followup"`;

        await this.client.sendMessage(chatId, message);
    }

    async sendConsultationCharges(chatId) {
        const message = `💰 **Consultation Charges**

🩺 **General Medicine:** ₹450 - ₹500
❤️ **Cardiology:** ₹800
🦴 **Orthopedics:** ₹700  
🦷 **Dental:** ₹600
👁️ **Eye Care:** ₹550
👶 **Pediatrics:** ₹500
👩 **Gynecology:** ₹650

💳 **Payment Options:**
• Cash at clinic
• UPI/Card payment
• Online payment link
• Insurance accepted

*Prices may vary based on procedure*`;

        await this.client.sendMessage(chatId, message);
    }

    async escalateToStaff(chatId, userName, reason) {
        const message = `📞 **Connecting you to our clinic staff...** 

Your conversation history has been shared for better assistance.

*Estimated wait time: 2-3 minutes*
*Staff available: Monday-Saturday, 9 AM - 6 PM* 

Reason: ${reason}

A staff member will contact you shortly.`;

        await this.client.sendMessage(chatId, message);
        console.log(`🚨 Staff escalation: ${userName} - ${reason}`);
    }

    async initialize() {
        console.log('🏥 Initializing PinkHealth WhatsApp System...');
        try {
            if (process.env.MONGODB_URI && !process.env.DEMO_MODE) {
                console.log('🗄️ Connecting to MongoDB...');
                await this.database.connect();
                console.log('✅ Database connected successfully');
            } else {
                console.log('📝 Running in demo mode with in-memory storage');
            }
            
            await this.client.initialize();
        } catch (error) {
            console.error('❌ WhatsApp initialization failed:', error);
            throw error;
        }
    }
}

// Export
module.exports = { PinkHealthWhatsAppSystem };