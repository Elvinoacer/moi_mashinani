'use client';

import { useState } from 'react';
import { Business } from '@/lib/types';
import { WhatsAppIcon } from '@/components/icons';
import { ModalFrame } from '@/components/ModalFrame';

const fieldClass = 'w-full rounded border border-[#dfe5d8] bg-[#e9eedf] px-3 py-2 text-sm text-[#243b32]';

function todayInKenya() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export type BookingBusiness = Pick<Business,'id'|'name'|'services'|'whatsapp'|'phone'|'status'|'isTemporarilyClosed'>;

export function BookingModal({ business, onClose, initialService }: { business: BookingBusiness; onClose: () => void; initialService?:string }) {
  const [selectedService, setSelectedService] = useState(initialService || business.services[0]?.name || 'General inquiry');
  const [selectedDay, setSelectedDay] = useState(todayInKenya);
  const [selectedTime, setSelectedTime] = useState('Afternoon (2:00 - 4:00 PM)');
  const [studentName, setStudentName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSendBooking(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, serviceName: selectedService, day: selectedDay,
          time: selectedTime, studentName: studentName.trim(), contactPhone: contactPhone.trim(), note: note.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your booking request could not be saved. Please try again.');
      setSubmitted(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Connection error. Please try again.');
    } finally { setIsSubmitting(false); }
  }

  const phoneDigits = (business.whatsapp || business.phone || '').replace(/\D/g, '').replace(/^0/, '254');
  const message = `Hi ${business.name}, I requested "${selectedService}" for ${selectedDay} around ${selectedTime} on MoiMashinani. My name is ${studentName.trim()} and my phone is ${contactPhone.trim()}.${note.trim() ? ` Note: ${note.trim()}.` : ''} Please confirm availability.`;

  return (
    <ModalFrame title={`Request a booking with ${business.name}`} onClose={onClose}>
      {submitted ? (
        <div className="space-y-4 p-6 text-center">
          <h3 aria-live="polite" className="font-display text-xl font-bold text-[#243b32]">Booking request saved</h3>
          <p className="text-sm text-[#667064]">The owner can now see your request. Contact them on WhatsApp and wait for confirmation before visiting.</p>
          {phoneDigits && <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#243b32]">
            <WhatsAppIcon className="h-5 w-5" /> Continue on WhatsApp
          </a>}
          <button type="button" onClick={onClose} className="block w-full text-sm font-bold text-[#667064]">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSendBooking} aria-busy={isSubmitting} className="space-y-4 p-4 md:p-6">
          <p className="text-sm text-[#667064]">No account needed. Choose your preferred time; the business will confirm availability with you.</p>
          {error && <p role="alert" className="rounded bg-[#fce7e1] p-3 text-sm text-[#a7302d]">{error}</p>}
          <label className="block text-xs font-bold text-[#243b32]">Service
            <select aria-label="Service" value={selectedService} onChange={(event) => setSelectedService(event.target.value)} className={`${fieldClass} mt-1`}>
              {business.services.map((service) => <option key={service.id} value={service.name}>{service.name}{service.priceFrom !== undefined ? ` (from KSh ${service.priceFrom.toLocaleString()})` : ''}</option>)}
              <option value="General inquiry">General inquiry / price check</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#243b32]">Preferred date (Kenya time)
            <input type="date" required min={todayInKenya()} value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-xs font-bold text-[#243b32]">Preferred time
            <select value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} className={`${fieldClass} mt-1`}>
              {['Morning (9:00 - 11:00 AM)', 'Afternoon (2:00 - 4:00 PM)', 'Evening (5:00 - 7:30 PM)'].map((time) => <option key={time}>{time}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#243b32]">Your name
              <input required maxLength={100} value={studentName} onChange={(event) => setStudentName(event.target.value)} autoComplete="name" className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-xs font-bold text-[#243b32]">Your phone / WhatsApp
              <input required type="tel" maxLength={20} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} autoComplete="tel" placeholder="0712 345 678" className={`${fieldClass} mt-1`} />
            </label>
          </div>
          <label className="block text-xs font-bold text-[#243b32]">Extra note (optional)
            <textarea maxLength={1000} rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <p className="text-xs text-[#667064]">Your name, phone and note are shared with this business to respond to your request.</p>
          <button type="submit" disabled={isSubmitting || business.isTemporarilyClosed || business.status !== 'ACTIVE'} className="w-full rounded-full bg-[#335e41] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {isSubmitting ? 'Saving request...' : business.isTemporarilyClosed ? 'Business temporarily closed' : 'Submit booking request'}
          </button>
        </form>
      )}
    </ModalFrame>
  );
}
