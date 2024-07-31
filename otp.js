document.getElementById('otp-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const issuer = document.getElementById('issuer').value;
    const accountName = document.getElementById('accountName').value;
    const secret = document.getElementById('secret').value;

    const otpauth = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    showDialog(otpauth);
});

function generateSecret() {
    const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(10)), dec => ('0' + dec.toString(16)).substr(-2)).join('');
    document.getElementById('secret').value = randomSecret.toUpperCase();
}

function showDialog(otpauth) {
    const dialog = document.getElementById('dialog');
    const overlay = document.getElementById('overlay');
    const dialogQRCodeContainer = document.getElementById('dialog-qrcode');

    dialogQRCodeContainer.innerHTML = "";
    new QRCode(dialogQRCodeContainer, {
        text: otpauth,
        width: 256,
        height: 256
    });

    document.getElementById('download').onclick = function() {
        downloadQRCode(dialogQRCodeContainer);
    };

    overlay.style.display = 'block';
    dialog.style.display = 'block';
}

function closeDialog() {
    const dialog = document.getElementById('dialog');
    const overlay = document.getElementById('overlay');

    overlay.style.display = 'none';
    dialog.style.display = 'none';
}

function downloadQRCode(container) {
    const qrCanvas = container.querySelector('canvas');
    const qrDataURL = qrCanvas.toDataURL('image/png');

    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataURL;
    downloadLink.download = 'otp-qrcode.png';
    downloadLink.click();
}
