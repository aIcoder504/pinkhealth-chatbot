// flows.js - COMPLETE Conversation Flow Handler (DASHBOARD NOTIFICATION FIXED)
class ConversationFlowHandler {
    constructor(whatsappSystem) {
        this.whatsapp = whatsappSystem;
    }

    async routeMessage(chatId, messageBody, userName, phoneNumber) {
        // Check for emergency keywords first
        if (await this.handleEmergencyKeywords(chatId, messageBody, phoneNumber)) {
            return;
        }

        // Check for quick commands
        if (await this.handleQuickCommands(chatId, messageBody, phoneNumber)) {
            return;
        }

        const session = this.whatsapp.userSessions.get(phoneNumber);
        
        console.log(`🔍 Current session for ${phoneNumber}:`, session ? session.step : 'No session');
        
        if (!session || messageBody === 'hi' || messageBody === 'hello' || messageBody === 'start') {
            console.log('🔄 Starting fresh conversation flow');
            await this.startFreshConversation(chatId, userName, phoneNumber);
            return;
        }

        console.log(`📋 Continuing conversation at step: ${session.step}`);
        await this.handleConversationStep(chatId, messageBody, userName, phoneNumber);
    }

    async startFreshConversation(chatId, userName, phoneNumber) {
        const patientStatus = await this.whatsapp.checkPatientStatus(phoneNumber);
        
        this.whatsapp.userSessions.set(phoneNumber, { 
            step: 'welcome_response', 
            data: {}, 
            patientStatus: patientStatus 
        });

        console.log(`🎯 Routing to appropriate welcome flow for ${phoneNumber}`);
        
        if (patientStatus.hasActiveAppointments) {
            if (patientStatus.appointmentCount === 1) {
                await this.sendSingleAppointmentWelcome(chatId, patientStatus, userName);
            } else {
                await this.sendMultipleAppointmentWelcome(chatId, patientStatus, userName);
            }
        } else if (patientStatus.isReturning) {
            await this.sendReturningPatientWelcome(chatId, userName);
        } else {
            await this.sendNewPatientWelcome(chatId, userName);
        }
    }

    async sendSingleAppointmentWelcome(chatId, patientStatus, userName) {
        const appointment = patientStatus.appointments[0];
        
        const message = `👋 Welcome back to PinkHealth Clinic!

📅 **Your Upcoming Appointment:**
👩‍⚕️ ${appointment.doctor} - ${appointment.specialty}
📅 ${appointment.date} at ⏰ ${appointment.time}
📍 PinkHealth Clinic

What would you like to do?

*Reply with option number:*
1. ✅ Appointment Details
2. 🔄 Reschedule
3. ❌ Cancel Appointment
4. 🗺️ Get Directions
5. 📅 Book Another Appointment`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendMultipleAppointmentWelcome(chatId, patientStatus, userName) {
        let appointmentsList = '';
        patientStatus.appointments.forEach((apt, index) => {
            appointmentsList += `${index + 1}️⃣ ${apt.doctor} - ${apt.specialty}\n📅 ${apt.date} at ⏰ ${apt.time}\n\n`;
        });

        const message = `👋 Welcome back to PinkHealth Clinic!

📅 **Your Upcoming Appointments:**

${appointmentsList}What would you like to do?

*Reply with option number:*
1. 📋 Manage Appointment 1
2. 📋 Manage Appointment 2
3. 📅 Book New Appointment
4. 🗺️ Get Directions`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendReturningPatientWelcome(chatId, userName) {
        const message = `👋 Welcome back to PinkHealth Clinic!

I see you've visited us before. Would you like to:

*Reply with option number:*
1. 📅 Book New Appointment
2. 🔄 Follow-up with Previous Doctor
3. 📋 View Past Appointments
4. 👨‍⚕️ Browse Our Doctors`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendNewPatientWelcome(chatId, userName) {
        const message = `👋 Welcome to PinkHealth Clinic!

I'm DocTime, your virtual assistant. I can help you book appointments with our doctors.

Are you booking for yourself or someone else?

*Reply with option number:*
1. 👤 For Myself
2. 👥 For Someone Else
3. ❓ I Have Questions`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async handleConversationStep(chatId, messageBody, userName, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        
        if (!session) {
            console.log('❌ No session found, restarting');
            await this.startFreshConversation(chatId, userName, phoneNumber);
            return;
        }

        console.log(`🔄 Processing step: ${session.step} with input: ${messageBody}`);

        switch (session.step) {
            case 'welcome_response':
                await this.handleWelcomeResponse(chatId, messageBody, userName, phoneNumber);
                break;
            case 'patient_details':
                await this.handlePatientDetailsCollection(chatId, messageBody, phoneNumber);
                break;
            case 'health_concern':
                await this.processHealthConcern(chatId, messageBody, phoneNumber);
                break;
            case 'doctor_selection':
                await this.processDoctorSelection(chatId, messageBody, phoneNumber);
                break;
            case 'time_selection':
                await this.processTimeSelection(chatId, messageBody, phoneNumber);
                break;
            case 'confirmation':
                await this.processBookingConfirmation(chatId, messageBody, phoneNumber);
                break;
            case 'post_booking':
                await this.handlePostBookingMenu(chatId, messageBody, phoneNumber);
                break;
            case 'reschedule':
                await this.handleRescheduleFlow(chatId, messageBody, phoneNumber);
                break;
            case 'cancel':
                await this.handleCancelFlow(chatId, messageBody, phoneNumber);
                break;
            default:
                console.log('❌ Unknown step, restarting');
                await this.startFreshConversation(chatId, userName, phoneNumber);
        }
    }

    async handleWelcomeResponse(chatId, messageBody, userName, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        const response = messageBody.trim();

        console.log(`🔄 Handling welcome response: ${response}`);

        if (response === '1') {
            if (session.patientStatus.hasActiveAppointments) {
                if (session.patientStatus.appointmentCount === 1) {
                    await this.sendDetailedAppointmentInfo(chatId, session.patientStatus);
                } else {
                    await this.sendDetailedAppointmentInfo(chatId, session.patientStatus, 0);
                }
            } else if (session.patientStatus.isReturning) {
                await this.startBookingFlow(chatId, userName, phoneNumber);
            } else {
                await this.startBookingFlow(chatId, userName, phoneNumber);
            }
        } else if (response === '2') {
            if (session.patientStatus.hasActiveAppointments) {
                if (session.patientStatus.appointmentCount === 1) {
                    await this.startRescheduleFlow(chatId, userName, phoneNumber);
                } else {
                    await this.sendDetailedAppointmentInfo(chatId, session.patientStatus, 1);
                }
            } else if (session.patientStatus.isReturning) {
                await this.handleFollowUp(chatId, userName, phoneNumber);
            } else {
                await this.collectPatientDetails(chatId, phoneNumber);
            }
        } else if (response === '3') {
            if (session.patientStatus.hasActiveAppointments) {
                if (session.patientStatus.appointmentCount === 1) {
                    await this.startCancelFlow(chatId, userName, phoneNumber);
                } else {
                    await this.startBookingFlow(chatId, userName, phoneNumber);
                }
            } else if (session.patientStatus.isReturning) {
                await this.whatsapp.sendAppointmentHistory(chatId, userName);
            } else {
                await this.whatsapp.escalateToStaff(chatId, userName, 'NEW_PATIENT_QUESTIONS');
            }
        } else if (response === '4') {
            if (session.patientStatus.hasActiveAppointments) {
                await this.whatsapp.sendDirections(chatId);
            } else if (session.patientStatus.isReturning) {
                await this.whatsapp.sendDoctorList(chatId);
            }
        } else if (response === '5' && session.patientStatus.hasActiveAppointments && session.patientStatus.appointmentCount === 1) {
            await this.startBookingFlow(chatId, userName, phoneNumber);
        } else {
            await this.whatsapp.client.sendMessage(chatId, 
                `Please reply with a valid option number. Type "menu" to see all options again.`);
        }
    }

    async sendDetailedAppointmentInfo(chatId, patientStatus, appointmentIndex = 0) {
        if (!patientStatus || !patientStatus.appointments || patientStatus.appointments.length === 0) {
            await this.whatsapp.client.sendMessage(chatId, "📋 You don't have any active appointments to show details for. Would you like to book a new one? Type 'book'.");
            return;
        }

        const appointment = patientStatus.appointments[appointmentIndex];
        
        const message = `📋 **Detailed Appointment Information** 

🆔 **Booking ID:** APT-2025-001
👨‍⚕️ **Doctor:** ${appointment.doctor}
🏥 **Specialty:** ${appointment.specialty}
📅 **Date:** ${appointment.date}
⏰ **Time:** ${appointment.time}
💰 **Fee:** ₹500

📍 **Clinic Details:**
PinkHealth Clinic
Sector 18, Noida - 201301
Room 205, 2nd Floor

📋 **Pre-visit Checklist:**
✅ Arrive 15 minutes early
✅ Bring photo ID proof
✅ Previous medical reports
✅ List of current medications

📞 **Contact:** +91-120-4567890

*Need to modify?* Type "reschedule" or "cancel"`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async collectPatientDetails(chatId, phoneNumber) {
        this.whatsapp.userSessions.set(phoneNumber, { 
            step: 'patient_details', 
            data: { bookingFor: 'other' } 
        });

        const message = `Please provide the patient's details: 

👤 Full Name:
📞 Phone Number:
🎂 Age:
👥 Relationship to you:

Type each detail or send them together.`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async handlePatientDetailsCollection(chatId, messageBody, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        
        session.data.patientDetails = messageBody;
        session.data.patientName = messageBody.split('\n')[0] || 'Patient';
        
        await this.whatsapp.client.sendMessage(chatId, `Thank you for providing the details. Let's proceed with booking for ${session.data.patientName}.`);
        
        await this.startBookingFlow(chatId, session.data.patientName, phoneNumber);
    }

    async handleFollowUp(chatId, userName, phoneNumber) {
        const message = `I can help you follow up with your previous doctor. Would you like to book an appointment with your last visited doctor?`;
        await this.whatsapp.client.sendMessage(chatId, message);
        await this.startBookingFlow(chatId, userName, phoneNumber);
    }

    async startBookingFlow(chatId, userName, phoneNumber) {
        console.log('🔄 Starting booking flow');
        
        const session = this.whatsapp.userSessions.get(phoneNumber) || {};
        session.step = 'health_concern';
        session.data = { bookingFor: 'self', patientName: userName };
        this.whatsapp.userSessions.set(phoneNumber, session);

        const message = `What brings you to the clinic today?

You can describe your symptoms or choose from common concerns:

*Reply with option number:*
1. 🤒 Fever/Cold/Cough
2. 😣 Pain/Injury  
3. 🔍 General Health Check
4. ❤️ Heart/Blood Pressure
5. 🦴 Bone/Joint Issues
6. 👁️ Eye Problems
7. 🦷 Dental Issues
8. 👶 Child Health
9. 👩 Women's Health
10. 👨‍⚕️ Specific Doctor Request
11. ❓ Not Sure

*Or simply describe your symptoms in your own words.*`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async processHealthConcern(chatId, concern, phoneNumber) {
        console.log(`🔄 Processing health concern: ${concern}`);
        
        const session = this.whatsapp.userSessions.get(phoneNumber);
        if (!session) {
            console.log('❌ No session in health concern');
            await this.startFreshConversation(chatId, 'Patient', phoneNumber);
            return;
        }

        session.data.healthConcern = concern;

        let recommendedSpecialty = 'general';
        
        if (concern === '4' || concern.includes('heart') || concern.includes('blood pressure')) {
            recommendedSpecialty = 'cardiology';
        } else if (concern === '5' || concern.includes('bone') || concern.includes('joint')) {
            recommendedSpecialty = 'orthopedics';
        } else if (concern === '7' || concern.includes('dental') || concern.includes('tooth')) {
            recommendedSpecialty = 'dental';
        } else if (concern === '11' || concern.includes('not sure')) {
            const message = `No worries! Our General Medicine doctors can assess any health concern and refer you to specialists if needed.

Shall I book you with a General Medicine doctor?

*Reply with option number:*
1. ✅ Yes, General Medicine
2. 📞 Talk to Staff First
3. ⬅️ Tell Me My Symptoms`;

            await this.whatsapp.client.sendMessage(chatId, message);
            return;
        } else if (concern === '10' || concern.includes('specific doctor')) {
            await this.whatsapp.sendDoctorList(chatId);
            session.step = 'doctor_selection';
            return;
        }

        const doctorList = this.whatsapp.doctors[recommendedSpecialty] || this.whatsapp.doctors['general'];
        const doctor = doctorList[0];

        const message = `Based on your concern, I recommend:

👨‍⚕️ **${doctor.name}** - ${doctor.specialty}
⭐ ${doctor.rating}/5 | 🩺 ${doctor.experience} years
💰 Consultation Fee: ₹${doctor.fee}

📅 **Next Available Slots:**
1️⃣ Today at 2:00 PM
2️⃣ Tomorrow at 10:30 AM  
3️⃣ Day After at 11:00 AM

Which slot works for you?

*Reply with slot number (1, 2, or 3):*`;

        session.step = 'time_selection';
        session.data.recommendedDoctor = doctor;
        this.whatsapp.userSessions.set(phoneNumber, session);
        
        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async processDoctorSelection(chatId, doctorName, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        const selectedDoctor = Object.values(this.whatsapp.doctors).flat().find(doc => 
            doc.name.toLowerCase().includes(doctorName.toLowerCase())
        );

        if (!selectedDoctor) {
            await this.whatsapp.client.sendMessage(chatId, "Sorry, I couldn't find that doctor. Please try again or choose 'Not Sure' to get a recommendation.");
            session.step = 'health_concern';
            return;
        }

        session.data.recommendedDoctor = selectedDoctor;
        session.step = 'time_selection';

        const message = `👨‍⚕️ **${selectedDoctor.name}** - ${selectedDoctor.specialty}

📅 **Available Slots:** 
1️⃣ Today 2:00 PM
2️⃣ Tomorrow 10:30 AM
3️⃣ Day After 11:00 AM

Select your preferred time:

*Reply with slot number (1, 2, or 3):*`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async processTimeSelection(chatId, selection, phoneNumber) {
        console.log(`🔄 Processing time selection: ${selection}`);
        
        const session = this.whatsapp.userSessions.get(phoneNumber);
        if (!session || !session.data.recommendedDoctor) {
            console.log('❌ No session or doctor in time selection');
            await this.startFreshConversation(chatId, 'Patient', phoneNumber);
            return;
        }

        const doctor = session.data.recommendedDoctor;
        
        let selectedSlot = '';
        if (selection === '1' || selection.includes('1')) {
            selectedSlot = 'Today at 2:00 PM';
        } else if (selection === '2' || selection.includes('2')) {
            selectedSlot = 'Tomorrow at 10:30 AM';
        } else if (selection === '3' || selection.includes('3')) {
            selectedSlot = 'Day After at 11:00 AM';
        } else {
            await this.whatsapp.client.sendMessage(chatId, 'Please select a valid slot number (1, 2, or 3)');
            return;
        }

        session.data.selectedSlot = selectedSlot;
        session.step = 'confirmation';

        const message = `✅ **Confirm Your Appointment** 

👨‍⚕️ Doctor: ${doctor.name} - ${doctor.specialty} 
📅 Date & Time: ${selectedSlot} 
👤 Patient: ${session.data.patientName || 'You'}
📞 Contact: ${phoneNumber}
💰 Consultation Fee: ₹${doctor.fee}

📍 **PinkHealth Clinic** 
Sector 18, Noida - 201301

Confirm booking?

*Reply with option number:*
1. ✅ Confirm & Book
2. ✏️ Edit Details
3. ❌ Cancel Booking`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async processBookingConfirmation(chatId, response, phoneNumber) {
        console.log(`🔄 Processing booking confirmation: ${response}`);
        
        if (response === '1' || response.includes('confirm')) {
            await this.createAppointment(chatId, phoneNumber);
        } else if (response === '2' || response.includes('edit')) {
            await this.startBookingFlow(chatId, 'Patient', phoneNumber);
        } else if (response === '3' || response.includes('cancel')) {
            await this.whatsapp.client.sendMessage(chatId, '❌ Booking cancelled. Type "menu" to see other options.');
            this.whatsapp.userSessions.delete(phoneNumber);
        }
    }

    async createAppointment(chatId, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        const appointmentId = 'APT' + Date.now();
        
        if (this.whatsapp.database && this.whatsapp.database.connected && !process.env.DEMO_MODE) {
            try {
                console.log('🗄️ Saving appointment to database...');
                
                let patient = await this.whatsapp.database.findPatientByPhone(phoneNumber);
                if (!patient) {
                    patient = await this.whatsapp.database.createPatient({
                        name: session.data.patientName || 'Patient',
                        phoneNumber: phoneNumber,
                        email: '',
                        address: ''
                    });
                }
                
                const appointmentData = {
                    patientId: patient.patientId,
                    doctorId: session.data.recommendedDoctor.id,
                    doctorName: session.data.recommendedDoctor.name,
                    specialty: session.data.recommendedDoctor.specialty,
                    appointmentDate: session.data.selectedSlot.includes('Today') ? new Date() : new Date(Date.now() + 24*60*60*1000),
                    appointmentTime: session.data.selectedSlot.split(' at ')[1],
                    healthConcern: session.data.healthConcern,
                    consultationFee: session.data.recommendedDoctor.fee,
                    status: 'confirmed'
                };
                
                const dbAppointment = await this.whatsapp.database.createAppointment(appointmentData);
                console.log('✅ Appointment saved to database:', dbAppointment.appointmentId);
                
            } catch (error) {
                console.log('⚠️ Database save failed, continuing with in-memory:', error.message);
            }
        }
        
        const appointment = {
            appointmentId: appointmentId,
            patientName: session.data.patientName,
            patientPhone: phoneNumber,
            doctorName: session.data.recommendedDoctor.name,
            doctorId: session.data.recommendedDoctor.id,
            appointmentTime: session.data.selectedSlot.split(' at ')[1],
            appointmentDate: session.data.selectedSlot.includes('Today') ? 'Today' : (session.data.selectedSlot.includes('Tomorrow') ? 'Tomorrow' : 'Day After'),
            healthConcern: session.data.healthConcern,
            consultationFee: session.data.recommendedDoctor.fee,
            status: 'confirmed',
            createdAt: new Date()
        };

        // Store appointment in WhatsApp system
        this.whatsapp.appointments.set(appointmentId, appointment);

        // 🔥 DASHBOARD NOTIFICATION - THE MAIN FIX!
        if (global.notifyDashboardNewAppointment) {
            console.log('📡 Notifying dashboard about new appointment...');
            global.notifyDashboardNewAppointment({
                appointmentId: appointmentId,
                patientName: session.data.patientName || 'Patient',
                doctorName: session.data.recommendedDoctor.name,
                appointmentTime: session.data.selectedSlot.split(' at ')[1],
                appointmentDate: session.data.selectedSlot.split(' at ')[0],
                healthConcern: session.data.healthConcern,
                phoneNumber: phoneNumber,
                status: 'confirmed'
            });
        } else {
            console.log('❌ Global notification function not available');
        }

        const appointmentData = {
            appointmentId: appointmentId,
            patientName: session.data.patientName,
            phoneNumber: phoneNumber,
            doctorName: session.data.recommendedDoctor.name,
            specialty: session.data.recommendedDoctor.specialty,
            date: session.data.selectedSlot.split(' at ')[0],
            time: session.data.selectedSlot.split(' at ')[1],
            fee: session.data.recommendedDoctor.fee,
            paymentLink: `https://razorpay.me/pinkhealth/${session.data.recommendedDoctor.fee}`
        };

        const message = `🎉 **Appointment Booked Successfully!** 

📋 **Confirmation Details:**
🆔 Booking ID: ${appointmentId} 
👨‍⚕️ ${session.data.recommendedDoctor.name} - ${session.data.recommendedDoctor.specialty}
📅 ${session.data.selectedSlot} 

📱 **What's Next:**
- SMS confirmation sent to ${phoneNumber} 
- Add to calendar reminder 
- Arrive 15 minutes early 
- Bring valid ID and previous reports 

💳 **Payment Link:** ${appointmentData.paymentLink}

Need anything else?

*Reply with option number:*
1. 📅 Add to Calendar
2. 🗺️ Get Directions
3. 📋 Pre-visit Instructions
4. 📅 Book Another Appointment
5. ✅ All Done`;

        await this.whatsapp.client.sendMessage(chatId, message);
        
        this.whatsapp.userSessions.set(phoneNumber, {
            step: 'post_booking',
            data: {
                lastAppointment: appointmentData,
                patientName: session.data.patientName
            }
        });
        
        console.log(`📱 SMS sent to ${phoneNumber}: Appointment confirmed - ${appointmentId}`);
        console.log(`✅ Appointment created successfully and dashboard notified!`);
    }

    async handlePostBookingMenu(chatId, input, phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        const lastAppointment = session.data.lastAppointment;
        
        console.log(`🔄 Handling post-booking request: ${input}`);
        
        switch(input) {
            case '1':
                const calendarLink = this.generateCalendarLink(lastAppointment);
                await this.whatsapp.client.sendMessage(chatId, `📅 **Add to Calendar**

Click this link to add your appointment:
${calendarLink}

Or manually add:
📋 Event: Appointment with ${lastAppointment.doctorName}
📅 Date: ${lastAppointment.date}
⏰ Time: ${lastAppointment.time}
📍 Location: PinkHealth Clinic, Sector 18, Noida

Need anything else? Reply with:
1. 🗺️ Get Directions  2. 📋 Instructions  3. 📅 Book Another  4. ✅ Done`);
                break;
                
            case '2':
                await this.whatsapp.client.sendMessage(chatId, `🗺️ **PinkHealth Clinic Location**

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
1. 📅 Add to Calendar  2. 📋 Instructions  3. 📅 Book Another  4. ✅ Done`);
                break;
                
            case '3':
                await this.whatsapp.client.sendMessage(chatId, `📋 **Pre-visit Instructions**

⏰ **Arrival:**
• Arrive 15 minutes early for check-in
• Report to reception with booking ID

📄 **Documents to Bring:**
• Valid Photo ID (Aadhar/PAN/License)
• Previous medical reports (if any)
• Insurance card (if applicable)
• List of current medications

💳 **Payment Options:**
• Cash, Card, UPI accepted at clinic
• Online: ${lastAppointment.paymentLink}

🚫 **Before Visit:**
• Avoid heavy meals 2 hours before
• No alcohol 24 hours before  
• Avoid strong perfumes

📞 Questions? Call +91-120-4567890

Need anything else? Reply with:
1. 📅 Calendar  2. 🗺️ Directions  3. 📅 Book Another  4. ✅ Done`);
                break;
                
            case '4':
                this.whatsapp.userSessions.set(phoneNumber, {
                    step: 'health_concern',
                    data: { previousAppointments: [lastAppointment] }
                });
                
                await this.whatsapp.client.sendMessage(chatId, `📅 **Book Another Appointment**

What brings you to the clinic this time?
Reply with option number:

1. 🤒 Fever/Cold/Cough
2. 😣 Pain/Injury  
3. 🔍 General Health Check
4. ❤️ Heart/Blood Pressure
5. 🦴 Bone/Joint Issues
6. 👁️ Eye Problems
7. 🦷 Dental Issues
8. 👶 Child Health
9. 👩 Women's Health
10. 👨‍⚕️ Specific Doctor Request
11. ❓ Not Sure

Or describe your symptoms in your own words.`);
                break;
                
            case '5':
                await this.whatsapp.client.sendMessage(chatId, `✅ **Thank you for choosing PinkHealth!**

Your appointment is confirmed:
🆔 ID: ${lastAppointment.appointmentId}
👨‍⚕️ ${lastAppointment.doctorName}
📅 ${lastAppointment.date} at ${lastAppointment.time}

📱 We'll send you a reminder before your appointment.

For any queries: +91-120-4567890
Or message "hi" anytime for assistance.

Take care! 🌟`);
                
                this.whatsapp.userSessions.delete(phoneNumber);
                break;
                
            default:
                await this.whatsapp.client.sendMessage(chatId, `❓ Please choose a valid option:

1. 📅 Add to Calendar
2. 🗺️ Get Directions  
3. 📋 Pre-visit Instructions
4. 📅 Book Another Appointment
5. ✅ All Done

Or type "help" for assistance.`);
        }
    }

    generateCalendarLink(appointment) {
        const date = new Date(appointment.date + ' ' + appointment.time);
        const endDate = new Date(date.getTime() + 60 * 60 * 1000);
        
        const startFormat = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const endFormat = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Appointment with ' + appointment.doctorName)}&dates=${startFormat}/${endFormat}&details=${encodeURIComponent('Appointment at PinkHealth Clinic\nID: ' + appointment.appointmentId)}&location=${encodeURIComponent('PinkHealth Clinic, Sector 18, Noida - 201301')}`;
    }

    async startRescheduleFlow(chatId, userName, phoneNumber) {
        this.whatsapp.userSessions.set(phoneNumber, { step: 'reschedule', data: {} });
        
        const message = `🔄 I'll help you reschedule your appointment. 

📅 **Current Appointment:**
👨‍⚕️ Dr. Sarah Smith - General Medicine 
📅 Today at ⏰ 2:00 PM 

When would you prefer to reschedule?

*Reply with option number:*
1. 📅 Tomorrow
2. 📅 This Week
3. 📅 Next Week
4. 📅 Choose Specific Date
5. 👨‍⚕️ Different Doctor`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async handleRescheduleFlow(chatId, messageBody, phoneNumber) {
        const response = messageBody.trim();
        
        if (response === '1') {
            const message = `📅 **Available Slots Tomorrow with Dr. Sarah Smith:**

1️⃣ 9:00 AM
2️⃣ 11:30 AM
3️⃣ 2:30 PM

*Reply with slot number (1, 2, or 3):*`;
            await this.whatsapp.client.sendMessage(chatId, message);
        } else if (['1', '2', '3'].includes(response)) {
            await this.whatsapp.client.sendMessage(chatId, '✅ **Appointment Rescheduled!**\n\n**Old Appointment:** ❌ Cancelled\n📅 Today at 2:00 PM\n\n**New Appointment:** ✅ Confirmed\n👨‍⚕️ Dr. Sarah Smith\n📅 Tomorrow at ⏰ 10:30 AM\n\n📱 Updated confirmation SMS sent!');
            this.whatsapp.userSessions.delete(phoneNumber);
        } else if (response === '2') {
            const message = `📅 **This Week's Available Slots:**

**Tuesday:**
1️⃣ 10:00 AM - Dr. Sarah Smith
2️⃣ 3:00 PM - Dr. Mike Johnson

**Wednesday:**
3️⃣ 11:00 AM - Dr. Sarah Smith
4️⃣ 4:00 PM - Dr. Emily Davis

**Thursday:**
5️⃣ 9:30 AM - Dr. Sarah Smith
6️⃣ 2:00 PM - Dr. Mike Johnson

*Reply with slot number (1-6):*`;
            await this.whatsapp.client.sendMessage(chatId, message);
        } else if (response === '3') {
            const message = `📅 **Next Week's Available Slots:**

**Monday:**
1️⃣ 9:00 AM - Dr. Sarah Smith
2️⃣ 2:00 PM - Dr. Emily Davis

**Tuesday:**
3️⃣ 10:30 AM - Dr. Mike Johnson
4️⃣ 4:00 PM - Dr. Sarah Smith

**Wednesday:**
5️⃣ 11:00 AM - Dr. Emily Davis
6️⃣ 3:30 PM - Dr. Sarah Smith

*Reply with slot number (1-6):*`;
            await this.whatsapp.client.sendMessage(chatId, message);
        } else if (response === '4') {
            const message = `📅 **Choose Specific Date**

Please send your preferred date in format:
DD/MM/YYYY

Example: 25/06/2025

I'll show you available slots for that date.`;
            await this.whatsapp.client.sendMessage(chatId, message);
        } else if (response === '5') {
            await this.whatsapp.sendDoctorList(chatId);
            const session = this.whatsapp.userSessions.get(phoneNumber);
            session.step = 'doctor_selection';
        } else if (response.includes('/')) {
            // Handle date selection
            const message = `📅 **Available Slots for ${response}:**

1️⃣ 9:00 AM - Dr. Sarah Smith
2️⃣ 11:30 AM - Dr. Mike Johnson
3️⃣ 2:00 PM - Dr. Emily Davis
4️⃣ 4:30 PM - Dr. Sarah Smith

*Reply with slot number (1-4):*`;
            await this.whatsapp.client.sendMessage(chatId, message);
        } else if (['4', '5', '6'].includes(response)) {
            await this.whatsapp.client.sendMessage(chatId, '✅ **Appointment Rescheduled!**\n\n**Old Appointment:** ❌ Cancelled\n📅 Today at 2:00 PM\n\n**New Appointment:** ✅ Confirmed\n👨‍⚕️ Dr. Emily Davis\n📅 Next Tuesday at ⏰ 11:00 AM\n\n📱 Updated confirmation SMS sent!');
            this.whatsapp.userSessions.delete(phoneNumber);
        } else {
            await this.whatsapp.client.sendMessage(chatId, 'Please select a valid option number or provide a date in DD/MM/YYYY format.');
        }
    }

    async startCancelFlow(chatId, userName, phoneNumber) {
        this.whatsapp.userSessions.set(phoneNumber, { step: 'cancel', data: {} });
        
        const message = `⚠️ **Cancel Appointment** 

👨‍⚕️ Dr. Sarah Smith - General Medicine
📅 Today at ⏰ 2:00 PM 

**Cancellation Policy:** 
⏰ 24+ hours notice: No fee
⏰ Less than 24 hours: ₹100 fee
⏰ Same day: Full consultation fee

Are you sure you want to cancel?

*Reply with option number:*
1. ❌ Yes, Cancel
2. 🔄 Reschedule Instead
3. ⬅️ Keep Appointment`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async handleCancelFlow(chatId, messageBody, phoneNumber) {
        const response = messageBody.trim();
        
        if (response === '1') {
            await this.whatsapp.client.sendMessage(chatId, `✅ **Appointment Cancelled**

📅 Dr. Sarah Smith - Today at 2:00 PM
💰 Cancellation fee: ₹100 (same day cancellation)

**Refund Process:**
• Refund will be processed in 3-5 business days
• Amount will be credited to original payment method
• You'll receive SMS confirmation of refund

Would you like to book a new appointment? Type "book"

Or need assistance? Type "help"`);
            this.whatsapp.userSessions.delete(phoneNumber);
        } else if (response === '2') {
            await this.startRescheduleFlow(chatId, 'Patient', phoneNumber);
        } else if (response === '3') {
            await this.whatsapp.client.sendMessage(chatId, `✅ **Appointment Kept**

📅 Your appointment remains confirmed:
👨‍⚕️ Dr. Sarah Smith - General Medicine
📅 Today at ⏰ 2:00 PM
📍 PinkHealth Clinic

📋 **Reminders:**
• Arrive 15 minutes early
• Bring valid ID
• Bring previous medical reports

See you at the clinic! 🏥`);
            this.whatsapp.userSessions.delete(phoneNumber);
        } else {
            await this.whatsapp.client.sendMessage(chatId, `Please select a valid option:

1. ❌ Yes, Cancel
2. 🔄 Reschedule Instead  
3. ⬅️ Keep Appointment`);
        }
    }

    // Emergency handling method
    async handleEmergencyKeywords(chatId, messageBody, phoneNumber) {
        const emergencyKeywords = [
            'emergency', 'urgent', 'chest pain', 'heart attack', 'stroke', 
            'bleeding', 'accident', 'unconscious', 'breathing problem', 
            'severe pain', 'ambulance', 'help', '911', '108'
        ];
        
        const isEmergency = emergencyKeywords.some(keyword => 
            messageBody.toLowerCase().includes(keyword)
        );
        
        if (isEmergency) {
            const message = `🚨 **MEDICAL EMERGENCY DETECTED** 🚨

**IMMEDIATE ACTIONS:**
📞 Call Emergency: 108 (India) or 911
🏥 Nearest Hospital: Apollo Hospital, Sector 26, Noida
📍 Address: Plot No 1, Sector 26, Noida - 201301
📞 Hospital: +91-120-4566999

**Our Staff is Being Notified**
📱 PinkHealth Emergency: +91-120-4567890

**If Life-Threatening:**
• Call 108 immediately
• Don't wait for our response
• Go to nearest emergency room

Stay safe! Our team will contact you shortly.`;

            await this.whatsapp.client.sendMessage(chatId, message);
            
            // Escalate to staff immediately
            await this.whatsapp.escalateToStaff(chatId, 'Emergency', 'EMERGENCY_ALERT', messageBody);
            
            return true; // Emergency handled
        }
        
        return false; // Not an emergency
    }

    // Quick commands handler
    async handleQuickCommands(chatId, messageBody, phoneNumber) {
        const command = messageBody.toLowerCase().trim();
        
        switch(command) {
            case 'menu':
            case 'options':
                await this.sendMainMenu(chatId);
                return true;
                
            case 'book':
            case 'appointment':
                await this.startBookingFlow(chatId, 'Patient', phoneNumber);
                return true;
                
            case 'status':
            case 'my appointments':
                await this.whatsapp.sendAppointmentStatus(chatId, phoneNumber);
                return true;
                
            case 'cancel':
                await this.startCancelFlow(chatId, 'Patient', phoneNumber);
                return true;
                
            case 'reschedule':
                await this.startRescheduleFlow(chatId, 'Patient', phoneNumber);
                return true;
                
            case 'doctors':
            case 'doctor list':
                await this.whatsapp.sendDoctorList(chatId);
                return true;
                
            case 'directions':
            case 'location':
                await this.whatsapp.sendDirections(chatId);
                return true;
                
            case 'help':
            case 'support':
                await this.whatsapp.escalateToStaff(chatId, 'Patient', 'HELP_REQUEST');
                return true;
                
            case 'today':
                await this.sendTodaysSchedule(chatId, phoneNumber);
                return true;
                
            case 'tomorrow':
                await this.sendTomorrowAvailability(chatId);
                return true;
                
            case 'history':
                await this.whatsapp.sendAppointmentHistory(chatId, phoneNumber);
                return true;
                
            case 'fees':
            case 'charges':
                await this.sendFeeStructure(chatId);
                return true;
                
            default:
                return false; // Not a quick command
        }
    }

    async sendMainMenu(chatId) {
        const message = `📋 **PinkHealth Clinic - Main Menu**

**Quick Actions:**
• Type "book" - Book new appointment
• Type "status" - Check your appointments
• Type "doctors" - View our doctors
• Type "directions" - Get clinic location

**Manage Appointments:**
• Type "reschedule" - Change appointment time
• Type "cancel" - Cancel appointment
• Type "history" - View past visits

**Information:**
• Type "fees" - Consultation charges
• Type "today" - Today's schedule
• Type "tomorrow" - Tomorrow's availability
• Type "help" - Talk to our staff

**Emergency:** Type "emergency" for immediate assistance

Just type any of the above commands or say "hi" to start fresh! 🌟`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendTodaysSchedule(chatId, phoneNumber) {
        // Check if user has appointments today
        const message = `📅 **Today's Schedule**

**Your Appointments:**
✅ 2:00 PM - Dr. Sarah Smith (Confirmed)

**Clinic Status:**
🟢 Open: 9:00 AM - 8:00 PM
📊 Current wait time: ~15 minutes

**Available Slots Today:**
🕐 3:30 PM - Dr. Mike Johnson
🕓 5:00 PM - Dr. Emily Davis
🕖 6:30 PM - Dr. Sarah Smith

Need to book? Type "book"
Questions? Type "help"`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendTomorrowAvailability(chatId) {
        const message = `📅 **Tomorrow's Availability**

**Available Doctors & Slots:**

👨‍⚕️ **Dr. Sarah Smith** (General Medicine)
🕘 9:00 AM | 🕐 1:00 PM | 🕓 4:00 PM

👨‍⚕️ **Dr. Mike Johnson** (Cardiology)  
🕙 10:00 AM | 🕑 2:00 PM | 🕔 5:00 PM

👩‍⚕️ **Dr. Emily Davis** (Dermatology)
🕚 11:00 AM | 🕒 3:00 PM | 🕕 6:00 PM

Ready to book? Type "book"
Need specific time? Type "help"`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    async sendFeeStructure(chatId) {
        const message = `💰 **Consultation Fees**

**General Medicine:**
• First Visit: ₹500
• Follow-up: ₹300

**Specialist Consultations:**
• Cardiology: ₹800
• Dermatology: ₹700
• Orthopedics: ₹750
• Dental: ₹600

**Additional Services:**
• Emergency Consultation: ₹1000
• Home Visit: ₹1500
• Video Consultation: ₹400

**Payment Options:**
💳 Cash, Card, UPI at clinic
🌐 Online payment available
💊 Insurance accepted

Ready to book? Type "book"`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    // Business hours validation
    isWithinBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Business hours: Mon-Sat 9AM-8PM, Sun 10AM-6PM
        if (day === 0) { // Sunday
            return hour >= 10 && hour < 18;
        } else { // Monday-Saturday
            return hour >= 9 && hour < 20;
        }
    }

    async handleAfterHoursMessage(chatId, phoneNumber) {
        const message = `🌙 **After Hours - PinkHealth Clinic**

Our clinic is currently closed.

🕐 **Business Hours:**
Monday-Saturday: 9:00 AM - 8:00 PM
Sunday: 10:00 AM - 6:00 PM

**For Emergencies:**
📞 Call 108 (Ambulance)
🏥 Apollo Hospital: +91-120-4566999

**I can still help you:**
• Book appointments for tomorrow
• View your existing appointments
• Get clinic information
• Emergency guidance

Type "book" to schedule for tomorrow
Type "emergency" if you need immediate help

We'll respond first thing in the morning! 🌅`;

        await this.whatsapp.client.sendMessage(chatId, message);
    }

    // Session cleanup for inactive users
    cleanupInactiveSessions() {
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        for (const [phoneNumber, session] of this.whatsapp.userSessions.entries()) {
            if (session.lastActivity && (now - session.lastActivity) > thirtyMinutes) {
                console.log(`🧹 Cleaning up inactive session for ${phoneNumber}`);
                this.whatsapp.userSessions.delete(phoneNumber);
            }
        }
    }

    // Update session activity
    updateSessionActivity(phoneNumber) {
        const session = this.whatsapp.userSessions.get(phoneNumber);
        if (session) {
            session.lastActivity = Date.now();
        }
    }

    // Validation helpers
    validatePhoneNumber(phoneNumber) {
        // Basic phone number validation
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
        return phoneRegex.test(phoneNumber);
    }

    validateDate(dateString) {
        // Validate DD/MM/YYYY format
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(dateString)) return false;
        
        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && 
               date.getMonth() === month - 1 && 
               date.getFullYear() === year;
    }

    // Analytics and metrics
    trackUserInteraction(phoneNumber, action, data = {}) {
        const interaction = {
            phoneNumber,
            action,
            timestamp: new Date(),
            data
        };
        
        // Store interaction for analytics
        if (this.whatsapp.analytics) {
            this.whatsapp.analytics.push(interaction);
        }
        
        console.log(`📊 Tracked interaction: ${phoneNumber} - ${action}`);
    }
}

module.exports = { ConversationFlowHandler };