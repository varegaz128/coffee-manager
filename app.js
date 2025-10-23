// === Ambil elemen dari HTML ===
const form = document.getElementById("addForm");
const menuSelect = document.getElementById("menu");
const qtyInput = document.getElementById("qty");
const productList = document.getElementById("productList");
const toggleFormBtn = document.getElementById("toggleFormBtn");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const readerDiv = document.getElementById("reader");
const scanResult = document.getElementById("scanResult");

// === Data stok disimpan di localStorage ===
let productions = JSON.parse(localStorage.getItem("productions") || "[]");

// === Toggle Form Tambah Produksi ===
toggleFormBtn.addEventListener("click", () => {
  form.classList.toggle("hidden");
});

// === Tambah Data Produksi ===
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const menu = menuSelect.value;
  const qty = parseInt(qtyInput.value);
  if (!menu || !qty) return alert("⚠️ Lengkapi semua kolom!");

  const now = new Date();
  const today = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()}`; // DD/MM/YYYY
  const code = `${menu}-${today}`;

  const existing = productions.find((p) => p.menu === menu && p.date === today);

  if (existing) {
    existing.qty += qty;
  } else {
    productions.push({ menu, qty, date: today, code });
  }

  localStorage.setItem("productions", JSON.stringify(productions));
  alert(`✅ ${menu} (${qty} pcs) ditambahkan!`);
  renderProducts();
});

function renderProducts() {
  // Ambil ulang dari localStorage setiap kali render
  const stored = localStorage.getItem("productions");
  productions = stored ? JSON.parse(stored) : [];

  // Filter data rusak (tanpa menimpa localStorage)
  const valid = productions.filter((p) => p.menu && p.date && p.qty > 0);
  if (valid.length !== productions.length) {
    productions = valid;
    localStorage.setItem("productions", JSON.stringify(productions));
  }

  // Hapus tampilan lama
  productList.innerHTML = "";
  productList.classList.add("product-grid");

  // Kalau belum ada data
  if (productions.length === 0) {
    productList.innerHTML = `<p style="text-align:center; color:#666;">Belum ada stok ☕</p>`;
    return;
  }

  // Kelompokkan berdasarkan menu
  const grouped = {};
  productions.forEach((p) => {
    if (!grouped[p.menu]) grouped[p.menu] = [];
    grouped[p.menu].push(p);
  });

  // Buat kartu menu
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

    // Buat QR code ukuran seragam
    const barcodeEl = document.getElementById(`barcode-${menu}`);
    barcodeEl.innerHTML = ""; // bersihin biar gak dobel
    new QRCode(barcodeEl, {
      text: menu,
      width: 120,
      height: 120,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  });

  // Event untuk klik barcode
  document.querySelectorAll(".barcode-container").forEach((bc) => {
    bc.addEventListener("click", () => {
      document
        .querySelectorAll(".barcode-container")
        .forEach((el) => el.classList.remove("active"));
      bc.classList.add("active");
    });
  });

  // Tombol print
  document.querySelectorAll(".print-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const menu = e.target.dataset.menu;
      printBarcode(menu);
    });
  });

  // Tombol lihat tanggal
  document.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => toggleTanggal(e.target.dataset.menu));
  });
}

// === Slide daftar tanggal per menu ===
function toggleTanggal(menu) {
  const info = document.getElementById(`info-${menu}`);
  if (!info) return;

  const data = productions.filter((p) => p.menu === menu);

  if (info.classList.contains("hidden")) {
    info.innerHTML = data
      .map(
        (p) => `
        <div class="date-row">
          <span>📅 ${p.date}</span>
          <span>Stok: ${p.qty}</span>
          <div class="date-btns">
            <button class="expand-btn small" data-menu="${menu}" data-date="${p.date}">
              Gunakan Barcode
            </button>
            <button class="delete-btn small danger" data-menu="${menu}" data-date="${p.date}">
              🗑️ Hapus
            </button>
          </div>
        </div>
      `
      )
      .join("");

    info.classList.remove("hidden");
    info.style.maxHeight = info.scrollHeight + "px";

    // Event tombol barcode
    info.querySelectorAll(".expand-btn.small").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const menu = e.target.dataset.menu;
        const date = e.target.dataset.date;
        updateBarcode(menu, date);
      });
    });

    // Event tombol hapus
    info.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const menu = e.target.dataset.menu;
        const date = e.target.dataset.date;
        if (confirm(`Yakin hapus stok ${menu} (${date})?`)) {
          deleteProduct(menu, date);
        }
      });
    });
  } else {
    info.style.maxHeight = "0";
    setTimeout(() => info.classList.add("hidden"), 300);
  }
}

// === Hapus Produk dari stok (opsional) ===
function deleteProduct(menu, date) {
  productions = productions.filter(
    (p) => !(p.menu === menu && p.date === date)
  );
  localStorage.setItem("productions", JSON.stringify(productions));
  renderProducts();
}

// === Cetak Barcode (print popup) ===
// === Ganti barcode sesuai tanggal (PRINT QR CODE) ===
function printBarcode(menu, date = "") {
  const code = date ? `${menu}-${date}` : menu;
  const w = window.open("", "_blank");
  w.document.write(`
    <html>
      <head>
        <title>Cetak QR Code</title>
        <style>
          body { text-align:center; font-family:sans-serif; }
          #qrcode { margin-top:20px; }
        </style>
      </head>
      <body>
        <h3>${menu}</h3>
        ${date ? `<p>Tanggal Produksi: ${date}</p>` : ""}
        <div id="qrcode"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <script>
          new QRCode(document.getElementById('qrcode'), {
            text: '${code}',
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
          window.print();
        </script>
      </body>
    </html>
  `);
  w.document.close();
}

// === Scan Barcode ===
let html5QrCode;
startScanBtn.addEventListener("click", () => {
  readerDiv.style.display = "block";
  startScanBtn.classList.add("hidden");
  stopScanBtn.classList.remove("hidden");
  scanResult.textContent = "";

  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
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

      html5QrCode.stop();
      readerDiv.style.display = "none";
      startScanBtn.classList.remove("hidden");
      stopScanBtn.classList.add("hidden");
    }
  );
});

stopScanBtn.addEventListener("click", () => {
  if (html5QrCode) {
    html5QrCode.stop();
    readerDiv.style.display = "none";
    startScanBtn.classList.remove("hidden");
    stopScanBtn.classList.add("hidden");
  }
});
document.getElementById("resetDataBtn").addEventListener("click", () => {
  if (confirm("Yakin ingin menghapus semua data stok?")) {
    localStorage.clear();
    productions = [];
    renderProducts();
  }
});

// === Render awal ===

renderProducts();
