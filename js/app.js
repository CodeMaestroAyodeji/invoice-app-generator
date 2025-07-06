// Multi-Vendor Invoice Generator App
// Core logic for dynamic UI, templates, and export

document.addEventListener('DOMContentLoaded', function() {
    // Preview Modal Elements
    const previewInvoiceBtn = document.getElementById('previewInvoice');
    const invoicePreviewModal = document.getElementById('invoicePreviewModal');
    const invoicePreviewArea = document.getElementById('invoicePreviewArea');
    let previewModalInstance = null;
    if (window.bootstrap && window.bootstrap.Modal) {
        previewModalInstance = new bootstrap.Modal(invoicePreviewModal);
    }
    // Elements
    const vendorName = document.getElementById('vendorName');
    const vendorIndustry = document.getElementById('vendorIndustry');
    const vendorAddress = document.getElementById('vendorAddress');
    const vendorEmail = document.getElementById('vendorEmail');
    const vendorPhone = document.getElementById('vendorPhone');
    const logoUpload = document.getElementById('logoUpload');
    const logoPreview = document.getElementById('logoPreview');
    const invoiceDate = document.getElementById('invoiceDate');
    const invoiceNumber = document.getElementById('invoiceNumber');
    const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
    const addItemBtn = document.getElementById('addItem');
    const vatAll = document.getElementById('vatAll');
    const saveInvoiceBtn = document.getElementById('saveInvoice');
    const printInvoiceBtn = document.getElementById('printInvoice');
    const downloadPDFBtn = document.getElementById('downloadPDF');
    const templateSelector = document.getElementById('templateSelector');
    const themeToggle = document.getElementById('themeToggle');
    const signaturePad = document.getElementById('signaturePad');
    const signatureUpload = document.getElementById('signatureUpload');
    const clearSignatureBtn = document.getElementById('clearSignature');
    const terms = document.getElementById('terms');
    const paymentDetails = document.getElementById('paymentDetails');

    // State
    let items = [];
    let signatureDataUrl = '';
    let templates = [
        { value: 'default', name: 'Default Template', class: '' },
        { value: 'blue', name: 'Blue', class: 'template-blue' },
        { value: 'green', name: 'Green', class: 'template-green' },
        { value: 'red', name: 'Red', class: 'template-red' },
        // ...add more templates here
    ];

    // --- Vendor Info ---
    function updateLogoPreview() {
        if (logoUpload.files && logoUpload.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                logoPreview.innerHTML = `<img src="${e.target.result}" alt="Logo" class="img-fluid rounded-circle" style="max-width:80px;max-height:80px;">`;
            };
            reader.readAsDataURL(logoUpload.files[0]);
        } else if (vendorName.value) {
            // Generate SVG initials
            const initials = vendorName.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
            logoPreview.innerHTML = `<svg width="80" height="80"><circle cx="40" cy="40" r="40" fill="#e9ecef"/><text x="50%" y="55%" text-anchor="middle" fill="#6c757d" font-size="2.5em" font-family="Arial" dy=".3em">${initials}</text></svg>`;
        } else {
            logoPreview.innerHTML = '<i class="fa fa-user fa-2x"></i>';
        }
    }
    logoUpload.addEventListener('change', updateLogoPreview);
    vendorName.addEventListener('input', updateLogoPreview);

    // --- Invoice Details ---
    function setDefaultDate() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        invoiceDate.value = `${dd}/${mm}/${yyyy}`;
    }
    function generateInvoiceNumber() {
        let initials = vendorName.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'VN';
        let suffix = Date.now().toString().slice(-6);
        invoiceNumber.value = `${initials}-${suffix}`;
    }
    setDefaultDate();
    generateInvoiceNumber();
    vendorName.addEventListener('input', generateInvoiceNumber);

    // --- Items Table ---
    function addItemRow(item = {}) {
        const row = itemsTable.insertRow();
        row.innerHTML = `
            <td></td>
            <td><input type="text" class="form-control form-control-sm desc" value="${item.desc||''}"></td>
            <td><input type="number" class="form-control form-control-sm qty" min="1" value="${item.qty||1}"></td>
            <td><input type="number" class="form-control form-control-sm unit" min="0" step="0.01" value="${item.unit||''}"></td>
            <td class="total">0.00</td>
            <td><input type="number" class="form-control form-control-sm discount" min="0" step="0.01" value="${item.discount||0}"></td>
            <td class="text-center"><input type="checkbox" class="vat" ${item.vat?'checked':''}></td>
            <td><button class="btn btn-sm btn-danger remove"><i class="fa fa-trash"></i></button></td>
        `;
        updateSerialNumbers();
        updateTotals();
        row.querySelector('.remove').onclick = function() {
            row.remove();
            updateSerialNumbers();
            updateTotals();
        };
        ['qty','unit','discount','desc'].forEach(cls => {
            row.querySelector('.'+cls).oninput = updateTotals;
        });
        row.querySelector('.vat').onchange = updateTotals;
    }
    function updateSerialNumbers() {
        Array.from(itemsTable.rows).forEach((row,i) => {
            row.cells[0].textContent = i+1;
        });
    }
    function updateTotals() {
        Array.from(itemsTable.rows).forEach(row => {
            const qty = parseFloat(row.querySelector('.qty').value)||0;
            const unit = parseFloat(row.querySelector('.unit').value)||0;
            // Amount is always qty * unit (no discount, no VAT)
            let amount = qty * unit;
            row.querySelector('.total').textContent = amount.toFixed(2);
        });
    }

    // --- Invoice Summary Calculation ---
    function getInvoiceSummary() {
        let subtotal = 0, totalDiscount = 0, totalVAT = 0, finalTotal = 0;
        Array.from(itemsTable.rows).forEach(row => {
            const qty = parseFloat(row.querySelector('.qty').value)||0;
            const unit = parseFloat(row.querySelector('.unit').value)||0;
            const discount = parseFloat(row.querySelector('.discount').value)||0;
            const vat = row.querySelector('.vat').checked;
            let amount = qty * unit;
            subtotal += amount;
            totalDiscount += discount;
            let discountedAmount = amount - discount;
            if (vat) {
                totalVAT += discountedAmount * 0.075;
            }
        });
        finalTotal = subtotal - totalDiscount + totalVAT;
        return { subtotal, totalDiscount, totalVAT, finalTotal };
    }

    addItemBtn.onclick = () => addItemRow();
    vatAll.onchange = function() {
        Array.from(itemsTable.querySelectorAll('.vat')).forEach(cb => cb.checked = vatAll.checked);
        updateTotals();
    };

    // Add initial row
    addItemRow();

    // --- Signature Pad ---
    let sigPad = signaturePad.getContext('2d');
    let drawing = false;
    signaturePad.addEventListener('mousedown', e => { drawing = true; sigPad.beginPath(); sigPad.moveTo(e.offsetX, e.offsetY); });
    signaturePad.addEventListener('mousemove', e => { if (drawing) { sigPad.lineTo(e.offsetX, e.offsetY); sigPad.stroke(); } });
    signaturePad.addEventListener('mouseup', () => { drawing = false; });
    signaturePad.addEventListener('mouseleave', () => { drawing = false; });
    clearSignatureBtn.onclick = () => { sigPad.clearRect(0,0,signaturePad.width,signaturePad.height); };
    signatureUpload.onchange = function() {
        if (signatureUpload.files && signatureUpload.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                let img = new window.Image();
                img.onload = function() {
                    sigPad.clearRect(0,0,signaturePad.width,signaturePad.height);
                    sigPad.drawImage(img,0,0,signaturePad.width,signaturePad.height);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(signatureUpload.files[0]);
        }
    };

    // --- Template System ---
    function loadTemplates() {
        templates.forEach(t => {
            if (!templateSelector.querySelector(`[value="${t.value}"]`)) {
                let opt = document.createElement('option');
                opt.value = t.value;
                opt.textContent = t.name;
                templateSelector.appendChild(opt);
            }
        });
    }
    loadTemplates();
    templateSelector.onchange = function() {
        document.body.classList.remove(...templates.map(t=>t.class));
        let t = templates.find(t=>t.value===templateSelector.value);
        if (t && t.class) document.body.classList.add(t.class);
        localStorage.setItem('invoice_template', templateSelector.value);
    };
    // Load saved template
    let savedTemplate = localStorage.getItem('invoice_template');
    if (savedTemplate && templateSelector.querySelector(`[value="${savedTemplate}"]`)) {
        templateSelector.value = savedTemplate;
        templateSelector.onchange();
    }

    // --- Light/Dark Theme ---
    themeToggle.onclick = function() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('invoice_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    };
    if (localStorage.getItem('invoice_theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // --- Save/Load Vendor Info ---
    function saveVendorInfo() {
        const info = {
            name: vendorName.value,
            industry: vendorIndustry.value,
            address: vendorAddress.value,
            email: vendorEmail.value,
            phone: vendorPhone.value
        };
        localStorage.setItem('vendor_info', JSON.stringify(info));
    }
    function loadVendorInfo() {
        const info = JSON.parse(localStorage.getItem('vendor_info')||'{}');
        vendorName.value = info.name||'';
        vendorIndustry.value = info.industry||'';
        vendorAddress.value = info.address||'';
        vendorEmail.value = info.email||'';
        vendorPhone.value = info.phone||'';
        updateLogoPreview();
    }
    [vendorName, vendorIndustry, vendorAddress, vendorEmail, vendorPhone].forEach(el => el.addEventListener('input', saveVendorInfo));
    loadVendorInfo();

    // --- Save Invoice (localStorage) ---
    saveInvoiceBtn.onclick = function() {
        const invoice = {
            html: generateCleanInvoiceHTML(),
            vendor: {
                name: vendorName.value,
                industry: vendorIndustry.value,
                address: vendorAddress.value,
                email: vendorEmail.value,
                phone: vendorPhone.value
            },
            date: invoiceDate.value,
            number: invoiceNumber.value,
            items: Array.from(itemsTable.rows).map(row => ({
                desc: row.querySelector('.desc').value,
                qty: row.querySelector('.qty').value,
                unit: row.querySelector('.unit').value,
                discount: row.querySelector('.discount').value,
                vat: row.querySelector('.vat').checked
            })),
            terms: terms.value,
            paymentDetails: paymentDetails.value,
            signature: signaturePad.toDataURL()
        };
        let invoices = JSON.parse(localStorage.getItem('invoices')||'[]');
        invoices.push(invoice);
        localStorage.setItem('invoices', JSON.stringify(invoices));
        alert('Invoice saved!');
    };

    // --- Print Invoice ---
    // --- Generate Clean Invoice HTML ---
    function generateCleanInvoiceHTML() {
        const summary = getInvoiceSummary();
        // Format date
        let dateVal = invoiceDate.value;
        // If user picked yyyy-mm-dd, convert to dd/mm/yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
            const [y, m, d] = dateVal.split('-');
            dateVal = `${d}/${m}/${y}`;
        }
        // Format currency
        function formatNaira(val) {
            return `₦${Number(val).toLocaleString('en-NG', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        }
        // Logo
        let logoHTML = logoPreview.innerHTML;
        // Signature
        let signatureImg = signaturePad.toDataURL();
        // Items
        let itemsRows = Array.from(itemsTable.rows).map((row, i) => {
            const desc = row.querySelector('.desc').value;
            const qty = row.querySelector('.qty').value;
            const unit = row.querySelector('.unit').value;
            // Amount = qty * unit
            const amount = (parseFloat(qty)||0) * (parseFloat(unit)||0);
            return `<tr>
                <td>${i+1}</td>
                <td>${desc}</td>
                <td>${qty}</td>
                <td>${formatNaira(unit)}</td>
                <td>${formatNaira(amount)}</td>
            </tr>`;
        }).join('');
        // Template class
        let templateClass = '';
        let t = templates.find(t=>t.value===templateSelector.value);
        if (t && t.class) templateClass = t.class;
        // Main HTML
        return `
        <div class="invoice-preview ${templateClass}" style="background:#fff;color:#222;padding:2rem;max-width:900px;margin:auto;font-family:inherit;">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>${logoHTML}</div>
                <div class="text-end">
                    <h2 class="mb-0">INVOICE</h2>
                    <div><strong>Date:</strong> ${dateVal}</div>
                    <div><strong>Invoice #:</strong> ${invoiceNumber.value}</div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <h5 class="mb-1">Vendor</h5>
                    <div><strong>${vendorName.value}</strong></div>
                    <div>${vendorIndustry.value}</div>
                    <div>${vendorAddress.value}</div>
                    <div>${vendorEmail.value}</div>
                    <div>${vendorPhone.value}</div>
                </div>
            </div>
            <table class="table table-bordered mb-0">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            <div class="row mt-3">
                <div class="col-6"></div>
                <div class="col-6">
                    <table class="table table-sm mb-0">
                        <tr><th>Subtotal</th><td>${formatNaira(summary.subtotal)}</td></tr>
                        <tr><th>Discount</th><td>${formatNaira(summary.totalDiscount)}</td></tr>
                        <tr><th>VAT (7.5%)</th><td>${formatNaira(summary.totalVAT)}</td></tr>
                        <tr class="table-primary"><th>Total</th><td><strong>${formatNaira(summary.finalTotal)}</strong></td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-6">
                    <h6>Terms & Conditions</h6>
                    <div>${terms.value.replace(/\n/g,'<br>')}</div>
                </div>
                <div class="col-6 text-end">
                    <h6>Payment Details</h6>
                    <div>${paymentDetails.value.replace(/\n/g,'<br>')}</div>
                    <div class="mt-4">
                        <div><strong>Signature:</strong></div>
                        <img src="${signatureImg}" alt="Signature" style="max-width:200px;max-height:60px;border:1px solid #ccc;">
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // --- Preview Invoice ---
    previewInvoiceBtn.onclick = function() {
        invoicePreviewArea.innerHTML = generateCleanInvoiceHTML();
        if (previewModalInstance) previewModalInstance.show();
        else $(invoicePreviewModal).modal('show');
    };

    // --- Print Invoice ---
    printInvoiceBtn.onclick = function() {
        const win = window.open('', '', 'width=900,height=1200');
        win.document.write('<html><head><title>Invoice</title>');
        win.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">');
        win.document.write('<style>body{background:#fff;color:#222;} .invoice-preview{margin:0;padding:0;}</style>');
        win.document.write('</head><body>');
        win.document.write(generateCleanInvoiceHTML());
        win.document.write('</body></html>');
        win.document.close();
        win.focus();
        setTimeout(()=>{ win.print(); win.close(); }, 500);
    };

    // --- Download PDF ---
    downloadPDFBtn.onclick = function() {
        const container = document.createElement('div');
        container.innerHTML = generateCleanInvoiceHTML();
        // Build filename: CompanyName-InvoiceNumber-Date.pdf
        let name = vendorName.value.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'Invoice';
        let number = invoiceNumber.value.trim().replace(/[^a-zA-Z0-9\-]+/g, '_');
        let dateVal = invoiceDate.value.trim().replace(/\//g, '-');
        // If user picked yyyy-mm-dd, convert to dd-mm-yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
            const [y, m, d] = dateVal.split('-');
            dateVal = `${d}-${m}-${y}`;
        }
        let filename = `${name}-${number}-${dateVal}.pdf`;
        html2pdf().set({
            margin: 0.5,
            filename: filename,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).from(container).save();
    };

    // --- Download PDF ---
    downloadPDFBtn.onclick = function() {
        html2pdf().set({
            margin: 0.5,
            filename: invoiceNumber.value + '.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).from(document.body).save();
    };

    // --- Keyboard Shortcuts (Bonus) ---
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveInvoiceBtn.click(); }
        if (e.ctrlKey && e.key === 'p') { e.preventDefault(); printInvoiceBtn.click(); }
        if (e.ctrlKey && e.key === 'd') { e.preventDefault(); downloadPDFBtn.click(); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); addItemBtn.click(); }
    });
});
