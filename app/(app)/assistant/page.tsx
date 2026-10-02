import { redirect } from 'next/navigation';

export default function AssistantPage() {
  redirect('/settings?tab=ai');
}
