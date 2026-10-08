'use client';

import React, { useState } from 'react';
import { Business } from '@/lib/types';
import { Calendar, X, WhatsAppIcon } from '@/components/icons';

interface BookingModalProps {
  business: Business;
  onClose: () => void;
}

export function BookingModal({ business, onClose }: BookingModalProps) {
  const [selectedService, setSelectedService] = useState(
    business.services[0]?.name || 'General Inquiry'
  );
  const [selectedDay, setSelectedDay] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('Afternoon (2:00 - 4:00 PM)');
  const [studentName, setStudentName] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = ['Today', 'Tomorrow', 'This Friday', 'This Saturday'];
  const times = [
    'Morning (9:00 - 11:00 AM)',
    'Afternoon (2:00 - 4:00 PM)',
    'Evening (5:00 - 7:30 PM)',
  ];

  const handleSendBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const name = studentName.trim() || 'Moi University Student';

    // Record booking intent in database
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          serviceName: selectedService,
          day: selectedDay,
          time: selectedTime,
          studentName: name,
          note: note.trim() || undefined,
        }),
      });
    } catch (err) {
      console.error('Failed to log booking:', err);
    }

    // Prepare WhatsApp message
    const cleanPhone = business.whatsapp.replace(/\D/g, '');
    const message = `Hi ${business.name}, I'd like to book "${selectedService}" for ${selectedDay} around ${selectedTime}. I'm near ${business.zone}. Name: ${name}.${
      note ? ` Note: ${note}.` : ''
    } (via MoiMashinani)`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001C3B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#E7EEFF] px-4 py-3 border-b-2 border-[#001C3B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#9B0044]" />
            <h2 className="font-display font-bold text-lg text-[#001C3B] uppercase">
              Request Booking with {business.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#001C3B] hover:text-[#BA1A1A] p-1 rounded-full press-action"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendBooking} className="p-4 md:p-6 space-y-4">
          {/* Service picker */}
          <div>
            <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
              Select Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
            >
              {business.services.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.priceFrom ? `(from KSh ${s.priceFrom.toLocaleString()})` : ''}
                </option>
              ))}
              <option value="General inquiry / price check">General inquiry / Price check</option>
            </select>
          </div>

          {/* Day chips */}
          <div>
            <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1.5">
              Preferred Day
            </label>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full signboard-border press-action ${
                    selectedDay === day
                      ? 'bg-[#001C3B] text-white signboard-shadow'
                      : 'bg-[#F2F5F8] text-[#001C3B]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time chips */}
          <div>
            <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1.5">
              Time Window
            </label>
            <div className="flex flex-wrap gap-2">
              {times.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full signboard-border press-action ${
                    selectedTime === t
                      ? 'bg-[#001C3B] text-white signboard-shadow'
                      : 'bg-[#F2F5F8] text-[#001C3B]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Wanjiru (Hostel 6)"
              className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
              Extra Note / Device Model / Location
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. iPhone 11 screen is completely blank, or can you come to Stage?"
              className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-[#594045] hover:text-[#001C3B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-[#001C3B] font-display font-bold text-sm uppercase py-2.5 px-4 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Send on WhatsApp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
