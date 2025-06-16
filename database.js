// database.js - PinkHealth Complete Database Schema & Implementation
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment = require('moment');

// MongoDB Connection
class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/pinkhealth-clinic';
    }

    async connect() {
        try {
            if (this.isConnected) {
                console.log('🔄 Database already connected');
                return;
            }

            await mongoose.connect(this.connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            console.log('✅ MongoDB connected successfully to PinkHealth database');
            
            // Initialize sample data if database is empty
            await this.initializeSampleData();
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            console.log('🔄 Continuing with in-memory storage for demo...');
            throw error;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('📴 MongoDB disconnected');
        }
    }

    async initializeSampleData() {
        try {
            // Check if doctors exist
            const doctorCount = await Doctor.countDocuments();
            if (doctorCount === 0) {
                console.log('🏥 Initializing sample doctors...');
                await this.createSampleDoctors();
            }

            // Check if clinics exist
            const clinicCount = await Clinic.countDocuments();
            if (clinicCount === 0) {
                console.log('🏢 Initializing clinic data...');
                await this.createClinicData();
            }

            console.log('✅ Sample data initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing sample data:', error.message);
        }
    }

    async createSampleDoctors() {
        const sampleDoctors = [
            {
                doctorId: 'dr_smith_001',
                name: 'Dr. Sarah Smith',
                specialty: 'General Medicine',
                qualification: 'MBBS, MD (Internal Medicine)',
                experience: 12,
                rating: 4.8,
                consultationFee: 500,
                availability: {
                    monday: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    tuesday: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    wednesday: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    thursday: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    friday: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    saturday: ['09:00', '11:00', '14:00', '16:00']
                },
                isActive: true,
                phoneNumber: '+91-9876543001',
                email: 'dr.sarah@pinkhealth.com'
            },
            {
                doctorId: 'dr_carter_002',
                name: 'Dr. John Carter',
                specialty: 'Cardiology',
                qualification: 'MBBS, MD, DM (Cardiology)',
                experience: 15,
                rating: 4.9,
                consultationFee: 800,
                availability: {
                    monday: ['10:00', '11:30', '14:30', '16:00'],
                    tuesday: ['10:00', '11:30', '14:30', '16:00'],
                    wednesday: ['10:00', '11:30', '14:30', '16:00'],
                    thursday: ['10:00', '11:30', '14:30', '16:00'],
                    friday: ['10:00', '11:30', '14:30', '16:00'],
                    saturday: ['10:00', '12:00', '15:00']
                },
                isActive: true,
                phoneNumber: '+91-9876543002',
                email: 'dr.carter@pinkhealth.com'
            },
            {
                doctorId: 'dr_brown_003',
                name: 'Dr. Michael Brown',
                specialty: 'Orthopedics',
                qualification: 'MBBS, MS (Orthopedics)',
                experience: 20,
                rating: 4.7,
                consultationFee: 700,
                availability: {
                    monday: ['09:30', '11:00', '15:00', '16:30'],
                    tuesday: ['09:30', '11:00', '15:00', '16:30'],
                    wednesday: ['09:30', '11:00', '15:00', '16:30'],
                    thursday: ['09:30', '11:00', '15:00', '16:30'],
                    friday: ['09:30', '11:00', '15:00', '16:30'],
                    saturday: ['09:30', '11:30', '14:30']
                },
                isActive: true,
                phoneNumber: '+91-9876543003',
                email: 'dr.brown@pinkhealth.com'
            },
            {
                doctorId: 'dr_davis_004',
                name: 'Dr. Emma Davis',
                specialty: 'Dental',
                qualification: 'BDS, MDS (Oral Surgery)',
                experience: 10,
                rating: 4.8,
                consultationFee: 600,
                availability: {
                    monday: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    tuesday: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    wednesday: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    thursday: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    friday: ['09:00', '10:30', '13:00', '14:30', '17:00'],
                    saturday: ['09:00', '11:00', '14:00', '16:00']
                },
                isActive: true,
                phoneNumber: '+91-9876543004',
                email: 'dr.davis@pinkhealth.com'
            }
        ];

        await Doctor.insertMany(sampleDoctors);
        console.log('✅ Sample doctors created successfully');
    }

    async createClinicData() {
        const clinicData = {
            clinicId: 'pinkhealth_main',
            name: 'PinkHealth Clinic',
            address: {
                street: 'Sector 18',
                city: 'Noida',
                state: 'Uttar Pradesh',
                pincode: '201301',
                country: 'India'
            },
            contact: {
                phone: '+91-120-4567890',
                email: 'contact@pinkhealth.com',
                website: 'https://pinkhealth.com'
            },
            operatingHours: {
                monday: { open: '09:00', close: '18:00' },
                tuesday: { open: '09:00', close: '18:00' },
                wednesday: { open: '09:00', close: '18:00' },
                thursday: { open: '09:00', close: '18:00' },
                friday: { open: '09:00', close: '18:00' },
                saturday: { open: '09:00', close: '18:00' },
                sunday: { open: null, close: null }
            },
            specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Dental', 'Pediatrics', 'Gynecology'],
            isActive: true
        };

        await Clinic.create(clinicData);
        console.log('✅ Clinic data created successfully');
    }
}

// Patient Schema
const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            return 'PAT_' + Date.now();
        }
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        min: 0,
        max: 150
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: 'Other'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    },
    medicalHistory: [{
        condition: String,
        diagnosedDate: Date,
        treatment: String,
        isActive: { type: Boolean, default: true }
    }],
    emergencyContact: {
        name: String,
        phoneNumber: String,
        relationship: String
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastVisit: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    notes: String
}, {
    timestamps: true
});

// Doctor Schema
const doctorSchema = new mongoose.Schema({
    doctorId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    specialty: {
        type: String,
        required: true,
        enum: ['General Medicine', 'Cardiology', 'Orthopedics', 'Dental', 'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology']
    },
    qualification: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true,
        min: 0
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.0
    },
    consultationFee: {
        type: Number,
        required: true,
        min: 0
    },
    availability: {
        monday: [String],
        tuesday: [String],
        wednesday: [String],
        thursday: [String],
        friday: [String],
        saturday: [String],
        sunday: [String]
    },
    phoneNumber: String,
    email: String,
    isActive: {
        type: Boolean,
        default: true
    },
    totalAppointments: {
        type: Number,
        default: 0
    },
    totalRatings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            return 'APT_' + Date.now();
        }
    },
    patientId: {
        type: String,
        required: true,
        ref: 'Patient'
    },
    doctorId: {
        type: String,
        required: true,
        ref: 'Doctor'
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    appointmentTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        default: 30 // minutes
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled'
    },
    type: {
        type: String,
        enum: ['consultation', 'follow-up', 'check-up', 'emergency'],
        default: 'consultation'
    },
    healthConcern: {
        type: String,
        required: true
    },
    symptoms: [String],
    diagnosis: String,
    prescription: [{
        medicine: String,
        dosage: String,
        frequency: String,
        duration: String
    }],
    consultationFee: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    paymentId: String,
    notes: String,
    reminderSent: {
        type: Boolean,
        default: false
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: Date,
    cancellationReason: String,
    cancelledBy: {
        type: String,
        enum: ['patient', 'doctor', 'system']
    },
    cancellationFee: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// WhatsApp Session Schema
const whatsappSessionSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    currentStep: {
        type: String,
        required: true,
        enum: ['welcome_response', 'patient_details', 'health_concern', 'doctor_selection', 'time_selection', 'confirmation', 'reschedule', 'cancel', 'completed']
    },
    sessionData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    patientStatus: {
        hasActiveAppointments: { type: Boolean, default: false },
        appointmentCount: { type: Number, default: 0 },
        isReturning: { type: Boolean, default: false },
        isNew: { type: Boolean, default: true }
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    messageHistory: [{
        message: String,
        direction: { type: String, enum: ['incoming', 'outgoing'] },
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    whatsappMetrics: {
        totalMessages: { type: Number, default: 0 },
        responsesGiven: { type: Number, default: 0 },
        escalationsToStaff: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        activeChats: { type: Number, default: 0 }
    },
    appointmentMetrics: {
        totalBooked: { type: Number, default: 0 },
        totalCancelled: { type: Number, default: 0 },
        totalCompleted: { type: Number, default: 0 },
        noShows: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 }
    },
    revenueMetrics: {
        totalRevenue: { type: Number, default: 0 },
        consultationRevenue: { type: Number, default: 0 },
        cancellationFees: { type: Number, default: 0 },
        pendingPayments: { type: Number, default: 0 }
    },
    doctorMetrics: [{
        doctorId: String,
        appointmentsBooked: { type: Number, default: 0 },
        appointmentsCompleted: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 }
    }],
    hourlyStats: [{
        hour: Number,
        messages: { type: Number, default: 0 },
        appointments: { type: Number, default: 0 }
    }]
}, {
    timestamps: true
});

// Clinic Schema
const clinicSchema = new mongoose.Schema({
    clinicId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: String
    },
    contact: {
        phone: String,
        email: String,
        website: String
    },
    operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    specialties: [String],
    facilities: [String],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create Models
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Clinic = mongoose.model('Clinic', clinicSchema);

// Database Operations Class
class PinkHealthDatabase {
    constructor() {
        this.db = new DatabaseConnection();
        this.Patient = Patient;
        this.Doctor = Doctor;
        this.Appointment = Appointment;
        this.WhatsAppSession = WhatsAppSession;
        this.Analytics = Analytics;
        this.Clinic = Clinic;
    }

    async connect() {
        await this.db.connect();
    }

    async disconnect() {
        await this.db.disconnect();
    }

    // Patient Operations
    async createPatient(patientData) {
        try {
            const patient = new Patient(patientData);
            await patient.save();
            console.log(`✅ Patient created: ${patient.name} (${patient.phoneNumber})`);
            return patient;
        } catch (error) {
            console.error('❌ Error creating patient:', error.message);
            throw error;
        }
    }

    async findPatientByPhone(phoneNumber) {
        try {
            return await Patient.findOne({ phoneNumber, isActive: true });
        } catch (error) {
            console.error('❌ Error finding patient:', error.message);
            return null;
        }
    }

    async updatePatient(phoneNumber, updateData) {
        try {
            return await Patient.findOneAndUpdate(
                { phoneNumber, isActive: true },
                updateData,
                { new: true }
            );
        } catch (error) {
            console.error('❌ Error updating patient:', error.message);
            throw error;
        }
    }

    // Doctor Operations
    async getAllDoctors() {
        try {
            return await Doctor.find({ isActive: true }).sort({ specialty: 1, name: 1 });
        } catch (error) {
            console.error('❌ Error fetching doctors:', error.message);
            return [];
        }
    }

    async getDoctorsBySpecialty(specialty) {
        try {
            return await Doctor.find({ specialty, isActive: true }).sort({ rating: -1 });
        } catch (error) {
            console.error('❌ Error fetching doctors by specialty:', error.message);
            return [];
        }
    }

    async findDoctorById(doctorId) {
        try {
            return await Doctor.findOne({ doctorId, isActive: true });
        } catch (error) {
            console.error('❌ Error finding doctor:', error.message);
            return null;
        }
    }

    // Appointment Operations
    async createAppointment(appointmentData) {
        try {
            const appointment = new Appointment(appointmentData);
            await appointment.save();
            
            // Update analytics
            await this.updateDailyAnalytics('appointmentBooked');
            
            console.log(`✅ Appointment created: ${appointment.appointmentId}`);
            return appointment;
        } catch (error) {
            console.error('❌ Error creating appointment:', error.message);
            throw error;
        }
    }

    async getPatientAppointments(patientId, status = 'scheduled') {
        try {
            return await Appointment.find({ 
                patientId, 
                status: { $in: Array.isArray(status) ? status : [status] }
            })
            .populate('doctorId')
            .sort({ appointmentDate: 1, appointmentTime: 1 });
        } catch (error) {
            console.error('❌ Error fetching patient appointments:', error.message);
            return [];
        }
    }

    async updateAppointmentStatus(appointmentId, status, updateData = {}) {
        try {
            const updateObject = { status, ...updateData };
            return await Appointment.findOneAndUpdate(
                { appointmentId },
                updateObject,
                { new: true }
            );
        } catch (error) {
            console.error('❌ Error updating appointment:', error.message);
            throw error;
        }
    }

    async getAvailableSlots(doctorId, date) {
        try {
            const doctor = await this.findDoctorById(doctorId);
            if (!doctor) return [];

            const dayName = moment(date).format('dddd').toLowerCase();
            const availableSlots = doctor.availability[dayName] || [];

            // Get booked slots for the date
            const bookedAppointments = await Appointment.find({
                doctorId,
                appointmentDate: date,
                status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
            }).select('appointmentTime');

            const bookedTimes = bookedAppointments.map(apt => apt.appointmentTime);
            
            // Filter out booked slots
            return availableSlots.filter(slot => !bookedTimes.includes(slot));
        } catch (error) {
            console.error('❌ Error getting available slots:', error.message);
            return [];
        }
    }

    // WhatsApp Session Operations
    async createOrUpdateSession(phoneNumber, sessionData) {
        try {
            return await WhatsAppSession.findOneAndUpdate(
                { phoneNumber },
                { 
                    ...sessionData,
                    lastActivity: new Date()
                },
                { 
                    upsert: true, 
                    new: true 
                }
            );
        } catch (error) {
            console.error('❌ Error managing session:', error.message);
            throw error;
        }
    }

    async getSession(phoneNumber) {
        try {
            return await WhatsAppSession.findOne({ phoneNumber, isActive: true });
        } catch (error) {
            console.error('❌ Error fetching session:', error.message);
            return null;
        }
    }

    async deleteSession(phoneNumber) {
        try {
            return await WhatsAppSession.deleteOne({ phoneNumber });
        } catch (error) {
            console.error('❌ Error deleting session:', error.message);
            throw error;
        }
    }

    async addMessageToHistory(phoneNumber, message, direction) {
        try {
            await WhatsAppSession.findOneAndUpdate(
                { phoneNumber },
                {
                    $push: {
                        messageHistory: {
                            message,
                            direction,
                            timestamp: new Date()
                        }
                    },
                    lastActivity: new Date()
                }
            );
        } catch (error) {
            console.error('❌ Error adding message to history:', error.message);
        }
    }

    // Analytics Operations
    async updateDailyAnalytics(metricType, value = 1) {
        try {
            const today = moment().startOf('day').toDate();
            
            let updateObject = {};
            
            switch (metricType) {
                case 'whatsappMessage':
                    updateObject = { $inc: { 'whatsappMetrics.totalMessages': value } };
                    break;
                case 'whatsappResponse':
                    updateObject = { $inc: { 'whatsappMetrics.responsesGiven': value } };
                    break;
                case 'appointmentBooked':
                    updateObject = { $inc: { 'appointmentMetrics.totalBooked': value } };
                    break;
                case 'appointmentCancelled':
                    updateObject = { $inc: { 'appointmentMetrics.totalCancelled': value } };
                    break;
                case 'revenue':
                    updateObject = { $inc: { 'revenueMetrics.totalRevenue': value } };
                    break;
                default:
                    return;
            }

            await Analytics.findOneAndUpdate(
                { date: today },
                updateObject,
                { upsert: true }
            );
        } catch (error) {
            console.error('❌ Error updating analytics:', error.message);
        }
    }

    async getDailyAnalytics(date) {
        try {
            const targetDate = moment(date).startOf('day').toDate();
            return await Analytics.findOne({ date: targetDate });
        } catch (error) {
            console.error('❌ Error fetching analytics:', error.message);
            return null;
        }
    }

    async getAnalyticsSummary(days = 30) {
        try {
            const endDate = moment().startOf('day').toDate();
            const startDate = moment().subtract(days, 'days').startOf('day').toDate();

            return await Analytics.aggregate([
                {
                    $match: {
                        date: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalMessages: { $sum: '$whatsappMetrics.totalMessages' },
                        totalAppointments: { $sum: '$appointmentMetrics.totalBooked' },
                        totalRevenue: { $sum: '$revenueMetrics.totalRevenue' },
                        totalCancellations: { $sum: '$appointmentMetrics.totalCancelled' }
                    }
                }
            ]);
        } catch (error) {
            console.error('❌ Error fetching analytics summary:', error.message);
            return [];
        }
    }

    // Utility Operations
    async getPatientStatus(phoneNumber) {
        try {
            const patient = await this.findPatientByPhone(phoneNumber);
            if (!patient) {
                return {
                    hasActiveAppointments: false,
                    appointmentCount: 0,
                    isReturning: false,
                    isNew: true
                };
            }

            const activeAppointments = await this.getPatientAppointments(
                patient.patientId, 
                ['scheduled', 'confirmed']
            );

            return {
                hasActiveAppointments: activeAppointments.length > 0,
                appointmentCount: activeAppointments.length,
                appointments: activeAppointments,
                isReturning: patient.lastVisit ? true : false,
                isNew: false,
                patient: patient
            };
        } catch (error) {
            console.error('❌ Error getting patient status:', error.message);
            return {
                hasActiveAppointments: false,
                appointmentCount: 0,
                isReturning: false,
                isNew: true
            };
        }
    }

    async cleanup() {
        try {
            // Remove old sessions (older than 24 hours)
            const cutoffDate = moment().subtract(24, 'hours').toDate();
            await WhatsAppSession.deleteMany({ 
                lastActivity: { $lt: cutoffDate },
                isActive: false 
            });

            // Remove old message history (older than 30 days)
            await WhatsAppSession.updateMany(
                {},
                {
                    $pull: {
                        messageHistory: {
                            timestamp: { $lt: moment().subtract(30, 'days').toDate() }
                        }
                    }
                }
            );

            console.log('✅ Database cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
        }
    }
}

// Export everything
module.exports = {
    PinkHealthDatabase,
    DatabaseConnection,
    Patient,
    Doctor,
    Appointment,
    WhatsAppSession,
    Analytics,
    Clinic
};

// Auto-cleanup every hour
if (process.env.NODE_ENV !== 'test') {
    setInterval(async () => {
        try {
            const db = new PinkHealthDatabase();
            await db.cleanup();
        } catch (error) {
            console.error('❌ Scheduled cleanup failed:', error.message);
        }
    }, 60 * 60 * 1000); // 1 hour
}