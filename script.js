// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script yang akan Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVAjRPJTUeXO2DoqCxq3BnRixzslhdP1V-Ku7nuS-zGWYIrGCle1wdP0z3_ETAH7Y3/exec'; 

const N8N_WEBHOOK_URL = 'https://bayualfi.app.n8n.cloud/webhook-test/15a69324-bbc0-4b25-82cb-2f9ef519b8ea';
// =================================================================================

// [OPTIMASI] Variabel untuk menyimpan cache data siswa
let siswaCache = null;

// Elemen DOM
const kelasSelect = document.getElementById('kelasSelect');
const siswaSelect = document.getElementById('siswaSelect');
const siswaLoader = document.getElementById('siswaLoader');
// ... (sisa elemen DOM sama seperti sebelumnya)
const jenjangSelect = document.getElementById('jenjangSelect');
const dynamicBacaanFields = document.getElementById('dynamicBacaanFields');
const hafalanSuratSelect = document.getElementById('hafalanSuratSelect');
const form = document.getElementById('formInputNilai');
const submitButton = document.getElementById('submitButton');
const buttonText = document.querySelector('.button-text');
const submitLoader = document.getElementById('submitLoader');
const statusMessage = document.getElementById('statusMessage');


// Fungsi fetchData tetap sama
async function fetchData(request, params = {}) {
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('request', request);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (!response.ok || result.status === 'error') {
            throw new Error(result.message || 'Terjadi kesalahan pada server Apps Script.');
        }
        return result.data;
    } catch (error) {
        console.error('Fetch error:', error);
        alert(`Gagal memuat data: ${request}. Pesan: ${error.message}`);
        return null;
    }
}

// Fungsi populateSelect tetap sama
function populateSelect(selectElement, data, valueKey = null, textKey = null) {
    selectElement.innerHTML = `<option value="" disabled selected>Pilih...</option>`;
    if (!data || data.length === 0) {
        selectElement.innerHTML = `<option value="">Data tidak ditemukan</option>`;
        return;
    }
    data.forEach(item => {
        const option = document.createElement('option');
        if (typeof item === 'object') {
            option.value = item[valueKey];
            option.textContent = item[textKey];
        } else {
            option.value = item;
            option.textContent = item;
        }
        selectElement.appendChild(option);
    });
}

// [PERUBAHAN] Event listener saat kelas dipilih
kelasSelect.addEventListener('change', (e) => {
    const selectedKelas = e.target.value;
    if (!selectedKelas || !siswaCache) {
        // Jika cache belum siap, jangan lakukan apa-apa
        siswaSelect.innerHTML = `<option value="">Memuat data awal...</option>`;
        return;
    }

    // Filter data dari cache, bukan dari internet lagi
    const siswaDiKelas = siswaCache.filter(siswa => siswa.kelas.toString() === selectedKelas);

    populateSelect(siswaSelect, siswaDiKelas, 'id', 'nama');
    siswaSelect.disabled = false;
});

// [PERUBAHAN] Fungsi inisialisasi saat halaman dimuat
async function initializeForm() {
    // 1. Ambil daftar surat
    const suratData = await fetchData('surat');
    if (suratData) {
        populateSelect(hafalanSuratSelect, suratData);
    }
    
    // 2. Ambil SEMUA data siswa dan simpan ke cache
    // Sembari menunggu, nonaktifkan dropdown
    kelasSelect.disabled = true;
    siswaSelect.disabled = true;
    const placeholderAwal = document.createElement('option');
    placeholderAwal.textContent = 'Memuat data siswa...';
    kelasSelect.add(placeholderAwal, 1);
    
    siswaCache = await fetchData('allSiswa');
    
    // 3. Setelah cache siap, aktifkan kembali dropdown dan hapus placeholder
    if (siswaCache) {
        kelasSelect.disabled = false;
        kelasSelect.remove(1); // Hapus 'Memuat data siswa...'
        console.log('Cache siswa berhasil dimuat.', siswaCache);
    } else {
        placeholderAwal.textContent = 'Gagal memuat data siswa';
    }
}

// Sisa kode event listener untuk form submit tidak berubah
// ... (salin sisa kode dari file script.js Anda sebelumnya di sini)
jenjangSelect.addEventListener('change', (e) => {
    const selectedJenjang = e.target.value;
    dynamicBacaanFields.innerHTML = ''; 

    if (selectedJenjang.startsWith('Iqro')) {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="halamanInput">Halaman</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" id="halamanInput" name="detailBacaan" placeholder="1-31" min="1" max="31" required>
            </div>
            <div class="form-group">
                <label for="barisInput">Baris</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" id="barisInput" name="subDetail" placeholder="1-5" min="1" max="8" required>
            </div>
        `;
    } else if (selectedJenjang === "Al Qur'an") {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="suratBacaanSelect">Surat</label>
                <select id="suratBacaanSelect" name="detailBacaan" required>
                    <option value="" disabled selected>Memuat surat...</option>
                </select>
            </div>
            <div class="form-group">
                <label for="ayatBacaanInput">Ayat</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" id="ayatBacaanInput" name="subDetail" placeholder="1-10" required>
            </div>
        `;
        const suratBacaanSelect = document.getElementById('suratBacaanSelect');
        suratBacaanSelect.innerHTML = hafalanSuratSelect.innerHTML;
        suratBacaanSelect.querySelector('option').textContent = "Pilih Surat...";
    }
});
form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    submitLoader.style.display = 'block';
    statusMessage.style.display = 'none';
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const selectedSiswaOption = siswaSelect.options[siswaSelect.selectedIndex];
    data.idSiswa = selectedSiswaOption.value;
    data.namaSiswa = selectedSiswaOption.text;
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Terjadi kesalahan pada server n8n.');
        }
        const result = await response.json();
        statusMessage.textContent = result.message || 'Laporan berhasil dikirim!';
        statusMessage.className = 'status-success';
        form.reset();
        siswaSelect.innerHTML = `<option value="">Pilih kelas terlebih dahulu...</option>`;
        siswaSelect.disabled = true;
        dynamicBacaanFields.innerHTML = '';
    } catch (error) {
        console.error('Submit error:', error);
        statusMessage.textContent = `Gagal mengirim laporan: ${error.message}`;
        statusMessage.className = 'status-error';
    } finally {
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        submitLoader.style.display = 'none';
        statusMessage.style.display = 'block';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 6000);
    }
});


// Jalankan inisialisasi
document.addEventListener('DOMContentLoaded', initializeForm);
