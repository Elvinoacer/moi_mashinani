import { NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET() {
  try {
    const categories = await Store.getCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
