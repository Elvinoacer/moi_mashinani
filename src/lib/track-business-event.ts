export type BusinessEvent = 'view' | 'call' | 'whatsapp' | 'directions';

// keepalive lets contact/navigation clicks finish recording after leaving the page.
export function trackBusinessEvent(businessId: string, type: BusinessEvent): void {
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, type }),
    keepalive: true,
  }).then(response => {
    if (!response.ok) throw new Error(`Event recording failed (${response.status})`);
  }).catch(error => console.warn('Could not record business interaction', error));
}
