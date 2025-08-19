// --- Configuration ---
// שים כאן את הפרטים של ה-n8n שלך
const N8N_BASE = 'https://arpeled.app.n8n.cloud'; // כתובת ה-n8n
const CHAT_WEBHOOK_ID = 'YOUR_WEBHOOK_ID_HERE';   // ה-webhookId של ה-Chat Trigger

const $messages = document.getElementById('messages');
const $form = document.getElementById('composer');
const $input = document.getElementById('input');
const $send = document.getElementById('send');

const SESSION_KEY = 'n8n_chat_session_id';
let sessionId = localStorage.getItem(SESSION_KEY) || '';

function addMsg(text, who='bot', cls='') {
  const div = document.createElement('div');
  div.className = `message ${who} ${cls}`;
  div.textContent = text;
  $messages.appendChild(div);
  $messages.scrollTop = $messages.scrollHeight;
}

function setBusy(b) {
  $send.disabled = b;
  $input.disabled = b;
}

async function askN8n(text) {
  const url = `${N8N_BASE}/rest/v1/chat/${CHAT_WEBHOOK_ID}/messages`;
  const headers = { 'Content-Type': 'application/json' };
  if (sessionId) headers['x-n8n-chat-session-id'] = sessionId;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });

  const sid = res.headers.get('x-n8n-chat-session-id');
  if (sid && sid !== sessionId) {
    sessionId = sid;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  if (!res.ok) {
    const errTxt = await res.text().catch(()=>'');
    throw new Error(errTxt || `HTTP ${res.status}`);
  }

  const data = await res.json().catch(()=>({}));
  const txt =
    data.text ||
    (Array.isArray(data.messages) ? data.messages.map(m => m.text).join('\\n') : '') ||
    data.message ||
    JSON.stringify(data);

  return txt || '...';
}

// הודעת פתיחה ללקוח
addMsg('ברוכים הבאים לצ׳ט ההרשמה ליום הבוגר של בויאר! 🎓 כתבו בחופשיות על מה תרצו לדבר ואני אסכם הכל להרשמה.', 'system');

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = ($input.value || '').trim();
  if (!text) return;

  addMsg(text, 'user');
  $input.value = '';
  setBusy(true);

  try {
    const reply = await askN8n(text);
    addMsg(reply, 'bot');
  } catch (err) {
    console.error(err);
    addMsg('מצטערים, אירעה שגיאה. בדקו את החיבור או נסו שוב בעוד רגע.', 'system');
  } finally {
    setBusy(false);
  }
});
