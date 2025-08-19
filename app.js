// --- Configuration ---
// שים כאן את הפרטים של ה-n8n שלך
const N8N_BASE = 'https://arpeled.app.n8n.cloud'; // כתובת ה-n8n
const CHAT_WEBHOOK_ID = '1f201093-1564-48ab-81f5-cbba41e87dd6';   // ה-webhookId של ה-Chat Trigger

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

  // גלילה חלקה למטה
  setTimeout(() => {
    $messages.scrollTo({
      top: $messages.scrollHeight,
      behavior: 'smooth'
    });
  }, 100);

  return div; // החזר את האלמנט כדי שנוכל לעדכן אותו מאוחר יותר
}

function setBusy(b) {
  $send.disabled = b;
  $input.disabled = b;
}

async function askN8n(text) {
  const url = `${N8N_BASE}/webhook/${CHAT_WEBHOOK_ID}/chat`;
  const headers = { 'Content-Type': 'application/json' };

  // Generate session ID if we don't have one
  if (!sessionId) {
    sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // Prepare the request body with chatInput and sessionId (n8n expects 'chatInput', not 'text')
  const requestBody = { chatInput: text, sessionId }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
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

  // Debug: log the response to see what we're getting
  console.log('Response from n8n:', data);

  let txt = '';
  if (data.output && typeof data.output === 'string') {
    txt = data.output;
  } else if (data.text) {
    txt = data.text;
  } else if (Array.isArray(data.messages)) {
    txt = data.messages.map(m => m.text || m.output || m).join('\n');
  } else if (data.message) {
    txt = data.message;
  } else {
    // If we can't parse it, show the raw response for debugging
    txt = 'תגובה לא צפויה: ' + JSON.stringify(data);
  }

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

  // הוסף אינדיקטור טעינה
  const loadingMsg = addMsg('...', 'bot', 'loading');

  try {
    const reply = await askN8n(text);

    // הסר את אינדיקטור הטעינה
    if (loadingMsg && loadingMsg.parentNode) {
      loadingMsg.parentNode.removeChild(loadingMsg);
    }

    // וודא שיש תגובה לפני הוספה
    if (reply && reply.trim()) {
      addMsg(reply, 'bot');
    } else {
      addMsg('מצטערים, לא קיבלתי תגובה מהשרת. נסו שוב.', 'system');
    }
  } catch (err) {
    console.error('Error:', err);

    // הסר את אינדיקטור הטעינה במקרה של שגיאה
    if (loadingMsg && loadingMsg.parentNode) {
      loadingMsg.parentNode.removeChild(loadingMsg);
    }

    addMsg('מצטערים, אירעה שגיאה. בדקו את החיבור או נסו שוב בעוד רגע.', 'system');
  } finally {
    setBusy(false);
    // וודא שהפוקוס חוזר לשדה הקלט
    $input.focus();
  }
});
