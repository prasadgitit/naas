const btn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const result = document.getElementById('result');

function setLoading(isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.setAttribute('disabled', 'true');
    result.classList.add('loading');
    result.textContent = 'Fetching…';
    copyBtn.setAttribute('disabled', 'true');
  } else {
    btn.classList.remove('loading');
    btn.removeAttribute('disabled');
    result.classList.remove('loading');
  }
}

function setResultText(text) {
  result.textContent = text;
  if (text && text.trim().length > 0) {
    copyBtn.removeAttribute('disabled');
  } else {
    copyBtn.setAttribute('disabled', 'true');
  }
}

async function getMessage() {
  setLoading(true);
  try {
    const res = await fetch('https://naas.isalman.dev/no', { method: 'GET' });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Try JSON first. If it fails, fall back to text.
    let messageText = '';
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      // Show only the value of "reason" (without the key)
      messageText = (data && typeof data.reason === 'string')
        ? data.reason
        : JSON.stringify(data);
    } else {
      // Fallback for plain text
      const text = await res.text();
      // If the server returned text that looks like JSON, try to parse it
      try {
        const parsed = JSON.parse(text);
        messageText = (parsed && typeof parsed.reason === 'string')
          ? parsed.reason
          : text;
      } catch {
        messageText = text;
      }
    }

    setResultText(messageText?.trim() || 'No message returned.');
  } catch (err) {
    console.error(err);
    setResultText('Failed to fetch message. (Possible CORS or network error)');
  } finally {
    setLoading(false);
  }
}

async function copyToClipboard() {
  const text = result.textContent || '';
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
    // visual feedback
    const originalLabel = copyBtn.querySelector('.copy-label').textContent;
    copyBtn.classList.add('copy-success');
    copyBtn.querySelector('.copy-label').textContent = 'Copied!';
    copyBtn.setAttribute('disabled', 'true');
    setTimeout(() => {
      copyBtn.classList.remove('copy-success');
      copyBtn.querySelector('.copy-label').textContent = originalLabel;
      copyBtn.removeAttribute('disabled');
    }, 1200);
  } catch (e) {
    console.error('Clipboard write failed:', e);
    // Fallback: create a temporary textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      alert('Copied to clipboard.');
    } finally {
      document.body.removeChild(ta);
    }
  }
}

btn.addEventListener('click', getMessage);
copyBtn.addEventListener('click', copyToClipboard);