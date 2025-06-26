// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script yang baru saja Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyjUDMwPpycqUcDYTiAf1qJOVPi7iIBLY8SN_S9GkHd41JmgkdiVznRQ79nCGRos1N/exec'; 

// Ganti dengan URL Webhook dari n8n yang akan Anda dapatkan nanti
const N8N_WEBHOOK_URL = 'https://bayualfi.app.n8n.cloud/webhook-test/15a69324-bbc0-4b25-82cb-2f9ef519b8ea';
// =================================================================================

// Elemen DOM
const kelasSelect = document.getElementById('kelasSelect');
const siswaSelect = document.getElementById('siswaSelect');
const siswaLoader = document.getElementById('siswaLoader');
const jenjangSelect = document.getElementById('jenjangSelect');
const dynamicBacaanFields = document.getElementById('dynamicBacaanFields');
const hafalanSuratSelect = document.getElementById('hafalanSuratSelect');
const form = document.getElementById('formInputNilai');
const submitButton = document.getElementById('submitButton');
const buttonText = document.querySelector('.button-text');
const submitLoader = document.getElementById('submitLoader');
const statusMessage = document.getElementById('statusMessage');


// Fungsi untuk mengambil data dari Google Apps Script (Versi Baru)
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
        
        return result.data; // Sekarang kita mengambil data dari properti 'data'

    } catch (error) {
        console.error('Fetch error:', error);
        alert(`Gagal memuat data: ${request}. Pesan: ${error.message}`);
        return null;
    }
}

// Fungsi untuk mengisi dropdown
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

// Event listener saat kelas dipilih
kelasSelect.addEventListener('change', async (e) => {
    const selectedKelas = e.target.value;
    if (!selectedKelas) return;

    siswaSelect.disabled = true;
    siswaLoader.style.display = 'block';
    siswaSelect.innerHTML = `<option value="">Memuat siswa...</option>`;

    const siswaData = await fetchData('siswa', { kelas: selectedKelas });

    siswaLoader.style.display = 'none';
    populateSelect(siswaSelect, siswaData, 'id', 'nama');
    siswaSelect.disabled = false;
});

// Event listener saat jenjang bacaan dipilih
jenjangSelect.addEventListener('change', (e) => {
    const selectedJenjang = e.target.value;
    dynamicBacaanFields.innerHTML = ''; 

    if (selectedJenjang.startsWith('Iqro')) {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="halamanInput">Halaman</label>
                <input type="number" id="halamanInput" name="detailBacaan" placeholder="1 - 31" min="1" max="31" required>
            </div>
            <div class="form-group">
                <label for="barisInput">Baris</label>
                <input type="text" id="barisInput" name="subDetail" placeholder="Contoh: 1-5" required>
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
                <input type="text" id="ayatBacaanInput" name="subDetail" placeholder="Contoh: 1-10" required>
            </div>
        `;
        const suratBacaanSelect = document.getElementById('suratBacaanSelect');
        suratBacaanSelect.innerHTML = hafalanSuratSelect.innerHTML;
        suratBacaanSelect.querySelector('option').textContent = "Pilih Surat...";
    }
});

// Fungsi inisialisasi saat halaman dimuat
async function initializeForm() {
    const suratData = await fetchData('surat');
    if (suratData) {
        populateSelect(hafalanSuratSelect, suratData);
    }
}

// Event listener saat form disubmit
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
