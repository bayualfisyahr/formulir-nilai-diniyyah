// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script yang sudah Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEsB2cpYQVPd3wkqoV7nVOIf8u8lDNEITVOBJMDH8j3lBeh0lf_I07YbX85T8WWq_b/exec'; 

// Ganti dengan URL Webhook n8n Anda yang sudah berjalan
const N8N_WEBHOOK_URL = 'https://bayualfi.app.n8n.cloud/webhook/15a69324-bbc0-4b25-82cb-2f9ef519b8ea';
// =================================================================================

// [CACHE] Variabel untuk menyimpan data agar aplikasi cepat
let siswaCache = null;
let catatanCache = null;
let hafalanSuratCache = null;
let bacaanSuratCache = null;

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
 * @param {string} request - Tipe data yang diminta.
 * @returns {Promise<Array|null>} Data yang diminta atau null jika gagal.
 */
async function fetchData(request) {
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('request', request);
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
 * Membuat atau menghapus catatan otomatis berdasarkan nilai.
 */
function generateCatatanOtomatis() {
    const nilaiBacaan = nilaiBacaanSelect.value;
    const nilaiHafalan = nilaiHafalanSelect.value;

    if (nilaiBacaan && nilaiHafalan && catatanCache) {
        const kode = `${nilaiBacaan}-${nilaiHafalan}`;
        const catatanObj = catatanCache.find(item => item.kode === kode);

        if (catatanObj) {
            catatanTextarea.value = catatanObj.deskripsi;
        }
    } else {
        catatanTextarea.value = '';
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

    const [hafalanData, bacaanData, siswaData, dataCatatan] = await Promise.all([
        fetchData('hafalanSurat'),
        fetchData('bacaanSurat'),
        fetchData('allSiswa'),
        fetchData('refCatatan')
    ]);

    if (hafalanData) {
        hafalanSuratCache = hafalanData;
        populateSelect(hafalanSuratSelect, hafalanSuratCache);
    }
    if (bacaanData) bacaanSuratCache = bacaanData;
    if (siswaData) siswaCache = siswaData;
    if (dataCatatan) catatanCache = dataCatatan;

    if (siswaCache && catatanCache && hafalanSuratCache && bacaanSuratCache) {
        kelasSelect.disabled = false;
        kelasSelect.remove(1);
        console.log('Semua cache berhasil dimuat.');
    } else {
        placeholderAwal.textContent = 'Gagal memuat data penting.';
    }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', initializeForm);

nilaiBacaanSelect.addEventListener('change', generateCatatanOtomatis);
nilaiHafalanSelect.addEventListener('change', generateCatatanOtomatis);

kelasSelect.addEventListener('change', (e) => {
    const selectedKelas = e.target.value;
    if (!selectedKelas || !siswaCache) return;
    const siswaDiKelas = siswaCache.filter(siswa => siswa.kelas.toString() === selectedKelas);
    populateSelect(siswaSelect, siswaDiKelas, 'id', 'nama');
    siswaSelect.disabled = false;
});

jenjangSelect.addEventListener('change', (e) => {
    const selectedJenjang = e.target.value;
    dynamicBacaanFields.innerHTML = ''; 

    if (selectedJenjang && selectedJenjang.startsWith('Iqro')) {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="halamanInput">Halaman</label>
                <input type="number" id="halamanInput" name="detailBacaan" placeholder="Contoh: 7" min="1" max="31">
            </div>
            <div class="form-group">
                <label for="barisInput">Baris</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="barisInput" name="subDetail" placeholder="Contoh: 1-4 atau 1-8">
            </div>
        `;
    } else if (selectedJenjang === "Al Qur'an") {
        dynamicBacaanFields.innerHTML = `
            <div class="form-group">
                <label for="suratBacaanSelect">Surat</label>
                <select id="suratBacaanSelect" name="detailBacaan">
                    <option value="" disabled selected>Pilih Surat...</option>
                </select>
            </div>
            <div class="form-group">
                <label for="ayatBacaanInput">Ayat</label>
                <input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="ayatBacaanInput" name="subDetail" placeholder="Contoh: 1-10">
            </div>
        `;
        const suratBacaanSelect = document.getElementById('suratBacaanSelect');
        if(bacaanSuratCache) {
            populateSelect(suratBacaanSelect, bacaanSuratCache);
        }
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
        catatanTextarea.value = '';
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
