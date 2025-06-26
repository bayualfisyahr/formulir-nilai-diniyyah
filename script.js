// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script yang baru Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_8ctCXEfC2VzH1eeGmOH4Pm_ZGp_e1fCB7-I3E6-vqDWJDbv2vnXZ67WD_2FKzzOM/exec'; 

// Ganti dengan URL Webhook n8n Anda (seharusnya sudah ada)
const N8N_WEBHOOK_URL = 'https://bayualfi.app.n8n.cloud/webhook-test/15a69324-bbc0-4b25-82cb-2f9ef519b8ea';
// =================================================================================

// [CACHE] Variabel untuk menyimpan data agar aplikasi cepat
let siswaCache = null;
let catatanCache = null;

// ==================== DEFINISI ELEMEN DOM ====================
const form = document.getElementById('formInputNilai');
const kelasSelect = document.getElementById('kelasSelect');
const siswaSelect = document.getElementById('siswaSelect');
const siswaLoader = document.getElementById('siswaLoader');
const jenjangSelect = document.getElementById('jenjangSelect');
const dynamicBacaanFields = document.getElementById('dynamicBacaanFields');
const nilaiBacaanSelect = document.getElementById('nilaiBacaanSelect');
const nilaiHafalanSelect = document.getElementById('nilaiHafalanSelect');
const hafalanSuratSelect = document.getElementById('hafalanSuratSelect');
const catatanTextarea = document.getElementById('catatanTextarea');
const submitButton = document.getElementById('submitButton');
const buttonText = document.querySelector('.button-text');
const submitLoader = document.getElementById('submitLoader');
const statusMessage = document.getElementById('statusMessage');

// ==================== FUNGSI-FUNGSI UTAMA ====================

/**
 * Mengambil data dari Google Apps Script.
 * @param {string} request - Tipe data yang diminta ('surat', 'allSiswa', 'refCatatan').
 * @param {object} params - Parameter tambahan (misal: {kelas: '1'}).
 * @returns {Promise<Array|null>} Data yang diminta atau null jika gagal.
 */
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

/**
 * Mengisi elemen <select> dengan data.
 * @param {HTMLElement} selectElement - Elemen dropdown yang akan diisi.
 * @param {Array} data - Array data untuk mengisi dropdown.
 * @param {string} valueKey - Kunci untuk nilai <option>.
 * @param {string} textKey - Kunci untuk teks <option>.
 */
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

/**
 * Membuat catatan otomatis berdasarkan nilai bacaan dan hafalan.
 */
function generateCatatanOtomatis() {
    const nilaiBacaan = nilaiBacaanSelect.value;
    const nilaiHafalan = nilaiHafalanSelect.value;

    if (nilaiBacaan && nilaiHafalan && catatanCache) {
        const kode = `${nilaiBacaan}-${nilaiHafalan}`;
        const catatanObj = catatanCache.find(item => item.kode === kode);

        if (catatanObj) {
            const catatanManual = catatanTextarea.value.split(" | Tambahan: ")[1] || '';
            catatanTextarea.value = catatanObj.deskripsi;
            if (catatanManual) {
                catatanTextarea.value += ` | Tambahan: ${catatanManual}`;
            }
        }
    }
}

/**
 * Fungsi inisialisasi: mengambil semua data awal saat halaman dimuat.
 */
async function initializeForm() {
    kelasSelect.disabled = true;
    siswaSelect.disabled = true;
    const placeholderAwal = document.createElement('option');
    placeholderAwal.textContent = 'Memuat data awal...';
    kelasSelect.add(placeholderAwal, 1);

    const [suratData, siswaData, dataCatatan] = await Promise.all([
        fetchData('surat'),
        fetchData('allSiswa'),
        fetchData('refCatatan')
    ]);

    if (suratData) populateSelect(hafalanSuratSelect, suratData);
    if (siswaData) siswaCache = siswaData;
    if (dataCatatan) catatanCache = dataCatatan;

    if (siswaCache && catatanCache) {
        kelasSelect.disabled = false;
        kelasSelect.remove(1);
        console.log('Semua cache berhasil dimuat.');
    } else {
        placeholderAwal.textContent = 'Gagal memuat data penting.';
    }
}

// ==================== EVENT LISTENERS ====================

// Menjalankan inisialisasi saat konten halaman selesai dimuat.
document.addEventListener('DOMContentLoaded', initializeForm);

// Menjalankan fungsi generateCatatanOtomatis setiap kali nilai diubah.
nilaiBacaanSelect.addEventListener('change', generateCatatanOtomatis);
nilaiHafalanSelect.addEventListener('change', generateCatatanOtomatis);

// Mengisi dropdown siswa berdasarkan kelas yang dipilih (menggunakan cache).
kelasSelect.addEventListener('change', (e) => {
    const selectedKelas = e.target.value;
    if (!selectedKelas || !siswaCache) return;
    const siswaDiKelas = siswaCache.filter(siswa => siswa.kelas.toString() === selectedKelas);
    populateSelect(siswaSelect, siswaDiKelas, 'id', 'nama');
    siswaSelect.disabled = false;
});

// Menampilkan input dinamis (surat/ayat atau halaman/baris) berdasarkan jenjang.
jenjangSelect.addEventListener('change', (e) => {
    const selectedJenjang = e.target.value;
    dynamicBacaanFields.innerHTML = ''; 

    if (selectedJenjang.startsWith('Iqro')) {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="halamanInput">Halaman</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="halamanInput" name="detailBacaan" placeholder="1 - 31" min="1" max="31" required>
            </div>
            <div class="form-group">
                <label for="barisInput">Baris</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="barisInput" name="subDetail" placeholder="Contoh: 1-5" required>
            </div>
        `;
    } else if (selectedJenjang === "Al Qur'an") {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="suratBacaanSelect">Surat</label>
                <select id="suratBacaanSelect" name="detailBacaan" required>
                    <option value="" disabled selected>Pilih Surat...</option>
                </select>
            </div>
            <div class="form-group">
                <label for="ayatBacaanInput">Ayat</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="ayatBacaanInput" name="subDetail" placeholder="Contoh: 1-10" required>
            </div>
        `;
        const suratBacaanSelect = document.getElementById('suratBacaanSelect');
        suratBacaanSelect.innerHTML = hafalanSuratSelect.innerHTML;
        suratBacaanSelect.querySelector('option[disabled]').textContent = "Pilih Surat...";
    }
});

// Mengirim data ke n8n saat form disubmit.
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
