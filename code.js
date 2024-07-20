function base64url(source) {
    let encodedSource = btoa(source);
    encodedSource = encodedSource.replace(/=+$/, '');
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');
    return encodedSource;
}

async function createHMACSHA256Signature(key, message) {
    const enc = new TextEncoder();
    const keyData = enc.encode(key);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const messageData = enc.encode(message);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return base64url(String.fromCharCode.apply(null, new Uint8Array(signature)));
}

async function createJWT(header, payload, secret) {
    const headerBase64Url = base64url(JSON.stringify(header));
    const payloadBase64Url = base64url(JSON.stringify(payload));
    const data = `${headerBase64Url}.${payloadBase64Url}`;
    const signature = await createHMACSHA256Signature(secret, data);
    return `${data}.${signature}`;
}

function addField() {
    const container = document.getElementById('dynamicFieldsContainer');
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'dynamic-field';
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Enter key';
    keyInput.oninput = updatePayload;
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Enter value';
    valueInput.oninput = updatePayload;
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-field';
    removeButton.onclick = () => {
        container.removeChild(fieldDiv);
        updatePayload();
    };
    fieldDiv.appendChild(keyInput);
    fieldDiv.appendChild(valueInput);
    fieldDiv.appendChild(removeButton);
    container.appendChild(fieldDiv);
}

function convertToTimestamp(datetime) {
    return Math.floor(new Date(datetime).getTime() / 1000);
}

function updatePayload() {
    const issuedAt = convertToTimestamp(document.getElementById('issuedAt').value);
    const expiration = convertToTimestamp(document.getElementById('expiration').value);
    const secret = document.getElementById('secret').value;

    if (!issuedAt || !expiration || !secret) {
        document.getElementById('payloadDisplay').textContent = 'Please fill out the iat, exp fields and provide the secret.';
        return;
    }

    const payload = {
        iat: issuedAt,
        exp: expiration
    };

    const dynamicFields = document.getElementById('dynamicFieldsContainer').children;
    for (const field of dynamicFields) {
        const key = field.children[0].value;
        const value = field.children[1].value;
        if (key && value) {
            payload[key] = value;
        }
    }

    document.getElementById('payloadDisplay').textContent = JSON.stringify(payload, null, 2);
}

async function generateJWT() {
    const issuedAt = convertToTimestamp(document.getElementById('issuedAt').value);
    const expiration = convertToTimestamp(document.getElementById('expiration').value);
    const secret = document.getElementById('secret').value;

    if (!issuedAt || !expiration || !secret) {
        alert('Please fill out the iat, exp fields and provide the secret.');
        return;
    }

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload = JSON.parse(document.getElementById('payloadDisplay').textContent);

    try {
        const token = await createJWT(header, payload, secret);
        document.getElementById('result').textContent = 'JWT Token: ' + token;
        showDialog();
    } catch (error) {
        document.getElementById('result').textContent = 'Error creating JWT: ' + error;
        showDialog();
    }
}

function showDialog() {
    document.getElementById('resultDialog').style.display = 'block';
}

function closeDialog() {
    document.getElementById('resultDialog').style.display = 'none';
}

function copyToClipboard() {
    const text = document.getElementById('result').textContent.replace('JWT Token: ', '');
    navigator.clipboard.writeText(text).then(() => {
        alert('JWT Token copied to clipboard!');
    }, (err) => {
        alert('Failed to copy JWT Token: ', err);
    });
}