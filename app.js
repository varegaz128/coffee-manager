// === Ambil elemen ===
const form = document.getElementById("addForm");
const menuSelect = document.getElementById("menu");
const qtyInput = document.getElementById("qty");
const productList = document.getElementById("productList");
const toggleFormBtn = document.getElementById("toggleFormBtn");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const readerDiv = document.getElementById("reader");
const scanResult = document.getElementById("scanResult");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const uploadJsonInput = document.getElementById("uploadJsonInput");
const resetDataBtn = document.getElementById("resetDataBtn");
const printAllBtn = document.getElementById("printAllBtn");
const downloadJsonAnchorId = "backup-productions";
const scanPopup = document.getElementById("scanPopup");
const closeScanBtn = document.getElementById("closeScanBtn");

// === Data -->
let productions = JSON.parse(localStorage.getItem("productions") || "[]");

// === UI events ===
toggleFormBtn.addEventListener("click", () => form.classList.toggle("hidden"));
document
  .getElementById("cancelAdd")
  ?.addEventListener("click", () => form.classList.add("hidden"));

// === Add produk ===
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const menu = menuSelect.value;
  const qty = parseInt(qtyInput.value);
  if (!menu || !qty || qty <= 0) return alert("Lengkapi data dengan benar.");

  const now = new Date();
  const today = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()}`;
  const code = `${menu}-${today}`;

  // ambil ulang dari localStorage agar sinkron
  productions = JSON.parse(localStorage.getItem("productions") || "[]");

  const existing = productions.find((p) => p.menu === menu && p.date === today);
  if (existing) existing.qty += qty;
  else productions.push({ menu, qty, date: today, code });

  localStorage.setItem("productions", JSON.stringify(productions));
  alert(`✅ ${menu} (${qty} pcs) ditambahkan!`);
  qtyInput.value = "";
  renderProducts();
  form.classList.add("hidden");
});

// === Render produk (secure) ===
function renderProducts() {
  // baca ulang dari localStorage
  const raw = localStorage.getItem("productions");
  productions = raw ? JSON.parse(raw) : [];

  // bersihkan data rusak tanpa langsung menimpa bila sama
  const valid = productions.filter(
    (p) => p.menu && p.date && Number(p.qty) > 0
  );
  if (valid.length !== productions.length) {
    productions = valid;
    localStorage.setItem("productions", JSON.stringify(productions));
  }

  productList.innerHTML = "";
  productList.classList.add("product-grid");

  if (productions.length === 0) {
    productList.innerHTML = `<p style="text-align:center;color:#666">Belum ada stok ☕</p>`;
    return;
  }

  // kelompokkan berdasarkan menu
  const grouped = {};
  productions.forEach((p) => {
    if (!grouped[p.menu]) grouped[p.menu] = [];
    grouped[p.menu].push(p);
  });

  Object.keys(grouped).forEach((menu) => {
    const div = document.createElement("div");
    div.classList.add("product-card");

    div.innerHTML = `
      <div class="product-img ${menu}"></div>
      <h3>${menu}</h3>
      <div class="barcode-container" id="barcode-${menu}"></div>
      <button class="print-btn" data-menu="${menu}">🖨️ Print Barcode</button>
      <button class="expand-btn" data-menu="${menu}">Lihat Tanggal</button>
      <div class="info hidden" id="info-${menu}"></div>
    `;
    productList.appendChild(div);

    // buat QR default (menu saja)
    const barcodeEl = document.getElementById(`barcode-${menu}`);
    barcodeEl.innerHTML = "";
    new QRCode(barcodeEl, {
      text: menu,
      width: 140,
      height: 140,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  });

  // klik QR -> aktifkan print button
  document.querySelectorAll(".barcode-container").forEach((bc) => {
    bc.addEventListener("click", () => {
      document
        .querySelectorAll(".barcode-container")
        .forEach((el) => el.classList.remove("active"));
      bc.classList.add("active");
    });
  });

  // print per menu
  document.querySelectorAll(".print-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => printBarcode(e.target.dataset.menu));
  });

  // expand tanggal
  document.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => toggleTanggal(e.target.dataset.menu));
  });
}

// === Toggle tanggal (slide) ===
function toggleTanggal(menu) {
  const info = document.getElementById(`info-${menu}`);
  if (!info) return;
  const data = productions.filter((p) => p.menu === menu);

  if (info.classList.contains("hidden")) {
    info.innerHTML = data
      .map(
        (p) => `
      <div class="date-row">
        <div>
          <div><strong>📅 ${p.date}</strong></div>
          <div style="color:#666">Stok: ${p.qty}</div>
        </div>
        <div class="date-btns">
          <button class="small" data-menu="${menu}" data-date="${p.date}" onclick="updateBarcode('${menu}','${p.date}')">Gunakan Barcode</button>
          <button class="delete-btn small" data-menu="${menu}" data-date="${p.date}" onclick="deleteProduct('${menu}','${p.date}')">🗑️ Hapus</button>
          <button class="small" onclick="printBarcode('${menu}','${p.date}')">🖨️ Print</button>
        </div>
      </div>
    `
      )
      .join("");
    info.classList.remove("hidden");
    info.style.maxHeight = info.scrollHeight + "px";
  } else {
    info.style.maxHeight = "0";
    setTimeout(() => info.classList.add("hidden"), 300);
  }
}

// === Update QR saat pilih tanggal ===
function updateBarcode(menu, date) {
  const el = document.getElementById(`barcode-${menu}`);
  if (!el) return;
  el.innerHTML = "";
  new QRCode(el, {
    text: `${menu}-${date}`,
    width: 140,
    height: 140,
    colorDark: "#000",
    colorLight: "#fff",
    correctLevel: QRCode.CorrectLevel.H,
  });
  // activate print button
  el.classList.add("active");
}

// === delete per tanggal ===
function deleteProduct(menu, date) {
  if (!confirm(`Hapus stok ${menu} (${date}) ?`)) return;
  productions = productions.filter(
    (p) => !(p.menu === menu && p.date === date)
  );
  localStorage.setItem("productions", JSON.stringify(productions));
  renderProducts();
}

// === print single label (QR) ===
function printBarcode(menu, date = "") {
  const code = date ? `${menu}-${date}` : menu;
  // buka popup print dengan layout label (logo teks + menu + tanggal + QR)
  const w = window.open("", "_blank");
  const labelHTML = `
    <html><head><title>Print ${menu}</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:20px}
        .label{display:inline-block;border:1px solid #ddd;padding:10px;border-radius:8px}
        .logo{font-weight:800;color:${
          getComputedStyle(document.documentElement).getPropertyValue(
            "--accent"
          ) || "#d12a08"
        };font-size:18px}
        .menu{font-size:16px;margin-top:8px}
        .date{font-size:12px;color:#666;margin-bottom:8px}
      </style>
    </head><body>
      <div class="label">
        <div class="logo">DISELL COFFEE</div>
        <div class="menu">${menu}</div>
        ${date ? `<div class="date">${date}</div>` : ""}
        <div id="qrcode"></div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
      <script>
        new QRCode(document.getElementById('qrcode'), {
          text: "${code}",
          width: 200, height: 200, colorDark:'#000', colorLight:'#fff', correctLevel: QRCode.CorrectLevel.H
        });
        window.onload = ()=> { window.print(); window.onafterprint = ()=> window.close(); }
      </script>
    </body></html>
  `;
  w.document.write(labelHTML);
  w.document.close();
}

// === Print ALL labels (one page multiple labels) ===
printAllBtn.addEventListener("click", () => {
  const w = window.open("", "_blank");
  let inner = `<html><head><title>Print All</title><style>body{font-family:sans-serif;padding:10px} .grid{display:flex;flex-wrap:wrap;gap:10px}</style></head><body><div class="grid">`;
  // produce each distinct menu + dates
  productions.forEach((p) => {
    inner += `<div class="label" data-code="${p.menu}-${
      p.date
    }" style="width:180px;padding:8px;border:1px solid #ddd;border-radius:8px;text-align:center">
      <div style="font-weight:700">${p.menu}</div>
      <div style="font-size:12px;color:#666">${p.date}</div>
      <div class="q" id="q-${p.menu}-${p.date.replace(/\//g, "_")}"></div>
    </div>`;
  });
  inner += `</div><script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script><script>
    document.querySelectorAll('[data-code]').forEach(el => {
      const code = el.getAttribute('data-code');
      const id = el.querySelector('.q').id;
      new QRCode(document.getElementById(id), { text: code, width:120, height:120 });
    });
    window.onload = ()=> { window.print(); window.onafterprint = ()=> window.close(); }
  </script></body></html>`;
  w.document.write(inner);
  w.document.close();
});

// === Export XLSX using SheetJS ===
exportExcelBtn.addEventListener("click", () => {
  const data = productions.map((p) => ({
    Menu: p.menu,
    Stok: p.qty,
    Tanggal: p.date,
    Code: p.code,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productions");
  XLSX.writeFile(
    wb,
    `productions_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
});

// === Export PDF (render table of data) ===
exportPdfBtn.addEventListener("click", async () => {
  // buat elemen sementara
  const container = document.createElement("div");
  container.style.padding = "12px";
  container.innerHTML = `<h3>Daftar Produksi</h3><table border="1" style="border-collapse:collapse;width:100%"><thead><tr><th>Menu</th><th>Stok</th><th>Tanggal</th><th>Code</th></tr></thead><tbody>${productions
    .map(
      (p) =>
        `<tr><td>${p.menu}</td><td>${p.qty}</td><td>${p.date}</td><td>${p.code}</td></tr>`
    )
    .join("")}</tbody></table>`;
  document.body.appendChild(container);
  const canvas = await html2canvas(container, { scale: 2 });
  const img = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(img);
  const ratio = Math.min(w / imgProps.width, h / imgProps.height);
  pdf.addImage(
    img,
    "PNG",
    0,
    0,
    imgProps.width * ratio,
    imgProps.height * ratio
  );
  pdf.save(`productions_${new Date().toISOString().slice(0, 10)}.pdf`);
  document.body.removeChild(container);
});

// === Backup JSON download ===
downloadJsonBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(productions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `productions_backup_${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// === Restore JSON Upload ===
uploadJsonInput.addEventListener("change", (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed))
        throw new Error("File bukan format yang benar.");
      // basic validation
      const ok = parsed.every((p) => p.menu && p.date && Number(p.qty) > 0);
      if (!ok)
        if (!confirm("Beberapa data tampak tidak valid. Tetap lanjutkan?"))
          return;
      productions = parsed;
      localStorage.setItem("productions", JSON.stringify(productions));
      renderProducts();
      alert("Restore berhasil.");
    } catch (err) {
      alert("Gagal restore: " + err.message);
    }
  };
  reader.readAsText(f);
});

// === Reset data ===
resetDataBtn.addEventListener("click", () => {
  if (!confirm("Yakin ingin menghapus semua data stok?")) return;
  localStorage.clear();
  productions = [];
  renderProducts();
});

let html5QrCode;

startScanBtn.addEventListener("click", async () => {
  scanPopup.classList.remove("hidden");
  scanResult.textContent = "";
  const readerContainer = document.getElementById("reader");
  readerContainer.innerHTML = "";

  // Pastikan popup sudah muncul sepenuhnya
  await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 300)));

  html5QrCode = new Html5Qrcode("reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        const found = productions.find(
          (p) => `${p.menu}-${p.date}` === decodedText
        );

        if (found) {
          scanResult.innerHTML = `
            ✅ <b>${found.menu}</b><br>
            Stok: ${found.qty}<br>
            Tanggal Produksi: ${found.date}
          `;
        } else {
          scanResult.textContent = "❌ Barcode tidak ditemukan!";
        }

        html5QrCode.stop().then(() => {
          readerContainer.innerHTML = "";
          scanPopup.classList.add("hidden");
        });
      }
    );
  } catch (err) {
    console.error("Gagal akses kamera:", err);
    alert(
      "⚠️ Kamera gagal dinyalakan. Pastikan izin kamera sudah diberikan dan tidak sedang dipakai aplikasi lain."
    );
    scanPopup.classList.add("hidden");
  }
});

closeScanBtn.addEventListener("click", async () => {
  if (html5QrCode) {
    await html5QrCode.stop().catch(() => {});
  }
  scanPopup.classList.add("hidden");
  document.getElementById("reader").innerHTML = "";
});

stopScanBtn.addEventListener("click", async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
    } catch (err) {
      console.warn("Gagal stop kamera:", err);
    }
  }
  document.getElementById("reader").innerHTML = "";
  scanPopup.classList.add("hidden");
});

renderProducts();
