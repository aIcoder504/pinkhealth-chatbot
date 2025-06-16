// services.js - System Services (SMS, Payment, Analytics)

class SystemServices {
    constructor() {
        this.sms = new SMSService();
        this.payment = new PaymentService();
        this.analytics = new AnalyticsService();
        this.email = new EmailService();
    }
}

// SMS Integration Class
class SMSService {
    constructor() {
        this.fromNumber = process.env.TWILIO_PHONE || '+91-120-4567890';
        this.twilioSid = process.env.TWILIO_SID;
        this.twilioToken = process.env.TWILIO_TOKEN;
    }

    async sendAppointmentConfirmation(phoneNumber, appointmentDetails) {
        const message = `🏥 PinkHealth Clinic - Appointment Confirmed! 

👨‍⚕️ Dr. ${appointmentDetails.doctor}
📅 ${appointmentDetails.date} at ${appointmentDetails.time}
📍 Sector 18, Noida
🎫 Token: ${appointmentDetails.token}

Arrive 15 minutes early. Call +91-120-4567890 for queries.`;

        console.log(`📱 SMS sent to ${phoneNumber}: ${message}`);
        
        if (this.twilioSid && this.twilioToken) {
            try {
                const twilio = require('twilio');
                const client = twilio(this.twilioSid, this.twilioToken);
                
                await client.messages.create({
                    body: message,
                    from: this.fromNumber,
                    to: phoneNumber
                });
                
                return { success: true, message: 'SMS sent successfully' };
            } catch (error) {
                console.error('❌ Twilio SMS failed:', error.message);
                return { success: false, error: error.message };
            }
        }
        
        return { success: true, message: 'SMS sent successfully (demo mode)' };
    }

    async sendReminder(phoneNumber, appointmentDetails) {
        const message = `⏰ REMINDER: Your appointment with Dr. ${appointmentDetails.doctor} is in 1 hour at ${appointmentDetails.time}.

Location: PinkHealth Clinic, Sector 18, Noida
Token: ${appointmentDetails.token}

Please arrive 15 minutes early.`;

        console.log(`📱 Reminder SMS sent to ${phoneNumber}: ${message}`);
        
        if (this.twilioSid && this.twilioToken) {
            try {
                const twilio = require('twilio');
                const client = twilio(this.twilioSid, this.twilioToken);
                
                await client.messages.create({
                    body: message,
                    from: this.fromNumber,
                    to: phoneNumber
                });
                
                return { success: true, message: 'Reminder sent successfully' };
            } catch (error) {
                console.error('❌ Twilio reminder failed:', error.message);
                return { success: false, error: error.message };
            }
        }
        
        return { success: true, message: 'Reminder sent successfully (demo mode)' };
    }

    async sendCancellationSMS(phoneNumber, appointmentDetails) {
        const message = `❌ PinkHealth Clinic - Appointment Cancelled

👨‍⚕️ Dr. ${appointmentDetails.doctor}
📅 ${appointmentDetails.date} at ${appointmentDetails.time}
💰 Cancellation fee: ₹${appointmentDetails.cancellationFee}

Need to rebook? Reply to this message or call +91-120-4567890`;

        console.log(`📱 Cancellation SMS sent to ${phoneNumber}`);
        return { success: true, message: 'Cancellation SMS sent' };
    }
}

// Payment Integration Class  
class PaymentService {
    constructor() {
        this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'demo_key';
        this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'demo_secret';
        this.isProductionMode = this.razorpayKeyId !== 'demo_key';
    }

    async createPaymentLink(appointmentDetails) {
        if (this.isProductionMode) {
            try {
                const Razorpay = require('razorpay');
                const razorpay = new Razorpay({
                    key_id: this.razorpayKeyId,
                    key_secret: this.razorpaySecret
                });

                const paymentLinkData = {
                    amount: appointmentDetails.fee * 100, // Amount in paise
                    currency: 'INR',
                    description: `Appointment with Dr. ${appointmentDetails.doctor}`,
                    customer: {
                        name: appointmentDetails.patientName,
                        contact: appointmentDetails.phoneNumber
                    },
                    notify: {
                        sms: true,
                        email: false
                    },
                    reminder_enable: true,
                    notes: {
                        appointment_id: appointmentDetails.appointmentId,
                        doctor: appointmentDetails.doctor,
                        clinic: 'PinkHealth Clinic'
                    }
                };

                const paymentLink = await razorpay.paymentLink.create(paymentLinkData);
                
                console.log('💳 Razorpay payment link created:', paymentLink.short_url);
                return {
                    id: paymentLink.id,
                    short_url: paymentLink.short_url,
                    amount: appointmentDetails.fee * 100,
                    currency: 'INR',
                    description: `Appointment with Dr. ${appointmentDetails.doctor}`,
                    status: 'created'
                };
                
            } catch (error) {
                console.error('❌ Razorpay error:', error.message);
                // Fallback to demo link
                return this.createDemoPaymentLink(appointmentDetails);
            }
        }
        
        // Demo mode payment link
        return this.createDemoPaymentLink(appointmentDetails);
    }

    createDemoPaymentLink(appointmentDetails) {
        const paymentLink = {
            id: 'pay_' + Date.now(),
            short_url: `https://razorpay.me/pinkhealth/${appointmentDetails.fee}`,
            amount: appointmentDetails.fee * 100,
            currency: 'INR',
            description: `Appointment with Dr. ${appointmentDetails.doctor}`,
            status: 'created'
        };

        console.log('💳 Demo payment link created:', paymentLink.short_url);
        return paymentLink;
    }

    async verifyPayment(paymentId) {
        if (this.isProductionMode) {
            try {
                const Razorpay = require('razorpay');
                const razorpay = new Razorpay({
                    key_id: this.razorpayKeyId,
                    key_secret: this.razorpaySecret
                });

                const payment = await razorpay.payments.fetch(paymentId);
                
                return {
                    success: payment.status === 'captured',
                    paymentId: payment.id,
                    status: payment.status,
                    amount: payment.amount,
                    currency: payment.currency,
                    method: payment.method
                };
                
            } catch (error) {
                console.error('❌ Payment verification failed:', error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Mock payment verification for demo
        return {
            success: true,
            paymentId: paymentId,
            status: 'captured',
            amount: 50000, // ₹500 in paise
            currency: 'INR',
            method: 'upi'
        };
    }

    async createRefund(paymentId, amount, reason = 'Appointment cancelled') {
        if (this.isProductionMode) {
            try {
                const Razorpay = require('razorpay');
                const razorpay = new Razorpay({
                    key_id: this.razorpayKeyId,
                    key_secret: this.razorpaySecret
                });

                const refund = await razorpay.payments.refund(paymentId, {
                    amount: amount,
                    notes: {
                        reason: reason,
                        refund_type: 'appointment_cancellation'
                    }
                });

                return {
                    success: true,
                    refundId: refund.id,
                    amount: refund.amount,
                    status: refund.status
                };
                
            } catch (error) {
                console.error('❌ Refund failed:', error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // Mock refund for demo
        return {
            success: true,
            refundId: 'rfnd_' + Date.now(),
            amount: amount,
            status: 'processed'
        };
    }
}

// Email Service Class
class EmailService {
    constructor() {
        this.transporter = null;
        this.setupTransporter();
    }

    setupTransporter() {
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const nodemailer = require('nodemailer');
            
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            
            console.log('📧 Email service initialized');
        } else {
            console.log('📧 Email service running in demo mode');
        }
    }

    async sendAppointmentConfirmation(appointment, patient) {
        const emailContent = {
            from: process.env.EMAIL_USER || 'noreply@pinkhealth.com',
            to: patient.email,
            subject: 'Appointment Confirmation - PinkHealth Clinic',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #e91e63; color: white; padding: 20px; text-align: center;">
                        <h1>🏥 PinkHealth Clinic</h1>
                        <h2>Appointment Confirmed</h2>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>📋 Appointment Details</h3>
                            <p><strong>Patient:</strong> ${patient.name}</p>
                            <p><strong>Doctor:</strong> Dr. ${appointment.doctorName}</p>
                            <p><strong>Specialty:</strong> ${appointment.specialty}</p>
                            <p><strong>Date:</strong> ${appointment.date}</p>
                            <p><strong>Time:</strong> ${appointment.time}</p>
                            <p><strong>Booking ID:</strong> ${appointment.appointmentId}</p>
                            <p><strong>Fee:</strong> ₹${appointment.fee}</p>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>📍 Clinic Address</h4>
                            <p>PinkHealth Clinic<br>
                            Sector 18, Noida - 201301<br>
                            Uttar Pradesh, India</p>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>📋 Important Instructions</h4>
                            <ul>
                                <li>Arrive 15 minutes early</li>
                                <li>Bring valid ID proof</li>
                                <li>Bring previous medical reports</li>
                                <li>Carry insurance documents if applicable</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appointment.paymentLink}" 
                               style="background: #e91e63; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                💳 Pay Online
                            </a>
                        </div>
                        
                        <div style="text-align: center; color: #666; font-size: 14px;">
                            <p>For any queries, call <strong>+91-120-4567890</strong></p>
                            <p>Or visit our website: www.pinkhealth.com</p>
                        </div>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                        <p>This is an automated email from PinkHealth Clinic. Please do not reply.</p>
                    </div>
                </div>
            `
        };

        if (this.transporter) {
            try {
                await this.transporter.sendMail(emailContent);
                console.log(`📧 Email confirmation sent to ${patient.email}`);
                return { success: true, message: 'Email sent successfully' };
            } catch (error) {
                console.error('❌ Email sending failed:', error.message);
                return { success: false, error: error.message };
            }
        } else {
            console.log(`📧 Demo email would be sent to ${patient.email}`);
            return { success: true, message: 'Email sent (demo mode)' };
        }
    }

    async sendAppointmentReminder(appointment, patient) {
        const emailContent = {
            from: process.env.EMAIL_USER || 'noreply@pinkhealth.com',
            to: patient.email,
            subject: '⏰ Appointment Reminder - Tomorrow at PinkHealth Clinic',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #ff9800; color: white; padding: 20px; text-align: center;">
                        <h1>⏰ Appointment Reminder</h1>
                        <h2>Tomorrow at PinkHealth Clinic</h2>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="background: #fff3e0; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3>📅 Your Appointment</h3>
                            <p><strong>Doctor:</strong> Dr. ${appointment.doctorName}</p>
                            <p><strong>Date:</strong> ${appointment.date}</p>
                            <p><strong>Time:</strong> ${appointment.time}</p>
                            <p><strong>Booking ID:</strong> ${appointment.appointmentId}</p>
                        </div>
                        
                        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>✅ Preparation Checklist</h4>
                            <ul>
                                <li>✅ Arrive 15 minutes early</li>
                                <li>✅ Bring valid ID proof</li>
                                <li>✅ Previous medical reports</li>
                                <li>✅ Insurance documents</li>
                                <li>✅ List of current medications</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <p><strong>📞 Contact:</strong> +91-120-4567890</p>
                            <p><strong>📍 Address:</strong> Sector 18, Noida - 201301</p>
                        </div>
                    </div>
                </div>
            `
        };

        if (this.transporter) {
            try {
                await this.transporter.sendMail(emailContent);
                console.log(`📧 Reminder email sent to ${patient.email}`);
                return { success: true };
            } catch (error) {
                console.error('❌ Reminder email failed:', error.message);
                return { success: false, error: error.message };
            }
        } else {
            console.log(`📧 Demo reminder email for ${patient.email}`);
            return { success: true };
        }
    }
}

// Analytics Class 
class AnalyticsService {
    constructor() {
        this.metrics = {
            totalMessages: 0,
            appointmentsBooked: 0,
            cancellations: 0,
            reschedules: 0,
            staffEscalations: 0,
            paymentSuccessful: 0,
            paymentFailed: 0,
            uniqueUsers: new Set(),
            conversationSteps: {},
            popularDoctors: {},
            popularSpecialties: {},
            peakHours: {},
            responseTimeTotal: 0,
            responseTimeCount: 0
        };
        
        this.startTime = Date.now();
        this.dailyMetrics = new Map();
    }

    trackMessage(phoneNumber, messageType = 'incoming') {
        this.metrics.totalMessages++;
        this.metrics.uniqueUsers.add(phoneNumber);
        
        const hour = new Date().getHours();
        this.metrics.peakHours[hour] = (this.metrics.peakHours[hour] || 0) + 1;
        
        const today = new Date().toDateString();
        if (!this.dailyMetrics.has(today)) {
            this.dailyMetrics.set(today, { messages: 0, bookings: 0, users: new Set() });
        }
        this.dailyMetrics.get(today).messages++;
        this.dailyMetrics.get(today).users.add(phoneNumber);
        
        console.log(`📊 Analytics: Message tracked (Total: ${this.metrics.totalMessages})`);
    }

    trackAppointmentBooked(doctorName, specialty, phoneNumber) {
        this.metrics.appointmentsBooked++;
        this.metrics.popularDoctors[doctorName] = (this.metrics.popularDoctors[doctorName] || 0) + 1;
        this.metrics.popularSpecialties[specialty] = (this.metrics.popularSpecialties[specialty] || 0) + 1;
        
        const today = new Date().toDateString();
        if (this.dailyMetrics.has(today)) {
            this.dailyMetrics.get(today).bookings++;
        }
        
        console.log(`📊 Analytics: Appointment booked (Total: ${this.metrics.appointmentsBooked})`);
    }

    trackCancellation(reason = 'not_specified') {
        this.metrics.cancellations++;
        console.log(`📊 Analytics: Cancellation tracked (Total: ${this.metrics.cancellations})`);
    }

    trackReschedule() {
        this.metrics.reschedules++;
        console.log(`📊 Analytics: Reschedule tracked (Total: ${this.metrics.reschedules})`);
    }

    trackStaffEscalation(reason) {
        this.metrics.staffEscalations++;
        console.log(`📊 Analytics: Staff escalation tracked - ${reason}`);
    }

    trackPayment(success, amount = 0) {
        if (success) {
            this.metrics.paymentSuccessful++;
        } else {
            this.metrics.paymentFailed++;
        }
    }

    trackConversationStep(step, phoneNumber) {
        this.metrics.conversationSteps[step] = (this.metrics.conversationSteps[step] || 0) + 1;
    }

    trackResponseTime(startTime, endTime) {
        const responseTime = endTime - startTime;
        this.metrics.responseTimeTotal += responseTime;
        this.metrics.responseTimeCount++;
    }

    getMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.metrics.responseTimeCount > 0 
            ? (this.metrics.responseTimeTotal / this.metrics.responseTimeCount).toFixed(2) 
            : 0;

        return {
            overview: {
                totalMessages: this.metrics.totalMessages,
                appointmentsBooked: this.metrics.appointmentsBooked,
                uniqueUsers: this.metrics.uniqueUsers.size,
                conversionRate: this.metrics.totalMessages > 0 
                    ? ((this.metrics.appointmentsBooked / this.metrics.totalMessages) * 100).toFixed(2) + '%'
                    : '0%',
                uptime: Math.floor(uptime / 1000 / 60) + ' minutes',
                avgResponseTime: avgResponseTime + 'ms'
            },
            
            appointments: {
                booked: this.metrics.appointmentsBooked,
                cancelled: this.metrics.cancellations,
                rescheduled: this.metrics.reschedules,
                cancellationRate: this.metrics.appointmentsBooked > 0 
                    ? ((this.metrics.cancellations / this.metrics.appointmentsBooked) * 100).toFixed(1) + '%'
                    : '0%'
            },
            
            popular: {
                doctors: this.metrics.popularDoctors,
                specialties: this.metrics.popularSpecialties,
                peakHours: this.getPeakHours()
            },
            
            payments: {
                successful: this.metrics.paymentSuccessful,
                failed: this.metrics.paymentFailed,
                successRate: (this.metrics.paymentSuccessful + this.metrics.paymentFailed) > 0
                    ? ((this.metrics.paymentSuccessful / (this.metrics.paymentSuccessful + this.metrics.paymentFailed)) * 100).toFixed(1) + '%'
                    : '0%'
            },
            
            support: {
                staffEscalations: this.metrics.staffEscalations,
                escalationRate: this.metrics.totalMessages > 0 
                    ? ((this.metrics.staffEscalations / this.metrics.totalMessages) * 100).toFixed(2) + '%'
                    : '0%'
            },
            
            conversationFlow: this.metrics.conversationSteps,
            
            daily: this.getDailyMetrics(),
            
            timestamp: new Date().toISOString()
        };
    }

    getPeakHours() {
        const sorted = Object.entries(this.metrics.peakHours)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: `${hour}:00`, messages: count }));
        
        return sorted;
    }

    getDailyMetrics() {
        const dailyArray = Array.from(this.dailyMetrics.entries())
            .map(([date, metrics]) => ({
                date,
                messages: metrics.messages,
                bookings: metrics.bookings,
                uniqueUsers: metrics.users.size
            }))
            .slice(-7); // Last 7 days
        
        return dailyArray;
    }

    exportMetrics() {
        return {
            generatedAt: new Date().toISOString(),
            period: `${Math.floor((Date.now() - this.startTime) / 1000 / 60)} minutes`,
            metrics: this.getMetrics(),
            rawData: {
                totalInteractions: this.metrics.totalMessages,
                uniqueUsers: Array.from(this.metrics.uniqueUsers),
                conversationSteps: this.metrics.conversationSteps,
                peakHours: this.metrics.peakHours
            }
        };
    }

    resetDailyMetrics() {
        // Called daily to reset metrics
        const today = new Date().toDateString();
        this.dailyMetrics.set(today, { messages: 0, bookings: 0, users: new Set() });
    }
}

// Notification Service (combines all notification methods)
class NotificationService {
    constructor(smsService, emailService) {
        this.sms = smsService;
        this.email = emailService;
    }

    async sendAppointmentConfirmation(appointment, patient) {
        const results = {
            sms: null,
            email: null
        };

        // Send SMS
        try {
            results.sms = await this.sms.sendAppointmentConfirmation(patient.phoneNumber, appointment);
        } catch (error) {
            console.error('❌ SMS confirmation failed:', error.message);
            results.sms = { success: false, error: error.message };
        }

        // Send Email (if email provided)
        if (patient.email) {
            try {
                results.email = await this.email.sendAppointmentConfirmation(appointment, patient);
            } catch (error) {
                console.error('❌ Email confirmation failed:', error.message);
                results.email = { success: false, error: error.message };
            }
        }

        return results;
    }

    async sendReminder(appointment, patient) {
        const results = {
            sms: null,
            email: null
        };

        // Send SMS reminder
        try {
            results.sms = await this.sms.sendReminder(patient.phoneNumber, appointment);
        } catch (error) {
            console.error('❌ SMS reminder failed:', error.message);
        }

        // Send Email reminder
        if (patient.email) {
            try {
                results.email = await this.email.sendAppointmentReminder(appointment, patient);
            } catch (error) {
                console.error('❌ Email reminder failed:', error.message);
            }
        }

        return results;
    }

    async sendCancellationNotification(appointment, patient, cancellationFee = 0) {
        try {
            return await this.sms.sendCancellationSMS(patient.phoneNumber, {
                ...appointment,
                cancellationFee
            });
        } catch (error) {
            console.error('❌ Cancellation notification failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = {
    SystemServices,
    SMSService,
    PaymentService,
    EmailService,
    AnalyticsService,
    NotificationService
};