const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function testCalendar() {
  console.log("Starting test...");
  
  // Create an event
  const res1 = await fetch('https://sistema-agencia.anderson-barbozaa.workers.dev/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Event 123',
      description: 'Test',
      event_date: '2026-10-10',
      start_time: '10:00',
      end_time: '11:00'
    })
  });
  
  console.log("Create status:", res1.status);
  const data1 = await res1.json();
  console.log("Create response:", data1);
  
  if (!data1.data || !data1.data.id) return;
  const evtId = data1.data.id;
  
  // Try deleting it
  const res2 = await fetch(`https://sistema-agencia.anderson-barbozaa.workers.dev/api/calendar/${evtId}`, {
    method: 'DELETE'
  });
  
  console.log("Delete status:", res2.status);
  const data2 = await res2.json();
  console.log("Delete response:", data2);
}

testCalendar().catch(console.error);
