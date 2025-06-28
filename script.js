// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script yang sudah Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzntREINwIoVYaER4diRsOVAX9QbRBqusHJMKgqzpPSwtwMh1JnIS3Hb0xTTiO-jV6a/exec'; 

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
// ... dan semua elemen lain yang sudah Anda definisikan sebelumnya ...
const jenjangSelect = document.getElementById('jenjangSelect');
const dynamicBacaanFields = document.getElementById('dynamicBacaanFields');
const nilaiBacaanSelect = document.getElementById('nilaiBacaanSelect');
const nilaiHafalanSelect = document.getElementById('nilaiHafalanSelect');
const hafalanSuratSelect = document.getElementById('hafalanSuratSelect');
const hafalanAyatInput = document.getElementById('hafalanAyatInput');
const catatanTextarea = document.getElementById('catatanTextarea');
const submitButton = document.getElementById('submitButton');
const buttonText = document.querySelector('.button-text');
const submitLoader = document.getElementById('submitLoader');
const statusMessage = document.getElementById('statusMessage');

// ==================== FUNGSI-FUNGSI UTAMA ====================

// fetchData dan populateSelect tidak berubah
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

// generateCatatanOtomatis tidak berubah
function generateCatatanOtomatis() { /* ... kode sama ... */ }


/**
 * [FUNGSI BARU] Mengosongkan semua field pencapaian.
 */
function resetPencapaianFields() {
    jenjangSelect.value = '';
    dynamicBacaanFields.innerHTML = '';
    nilaiBacaanSelect.value = '';
    hafalanSuratSelect.value = '';
    hafalanAyatInput.value = '';
    nilaiHafalanSelect.value = '';
    catatanTextarea.value = '';
}

/**
 * [FUNGSI BARU] Mengisi form dengan data terakhir.
 */
function prefillForm(record) {
    if (record.Jenjang_Bacaan) {
        jenjangSelect.value = record.Jenjang_Bacaan;
        jenjangSelect.dispatchEvent(new Event('change'));
        
        setTimeout(() => {
            if (record.Jenjang_Bacaan.startsWith('Iqro')) {
                const halamanInput = document.getElementById('halamanInput');
                const barisInput = document.getElementById('barisInput');
                if (halamanInput) halamanInput.value = record.Detail_Bacaan;
                if (barisInput) barisInput.value = record.Sub_Detail;
            } else if (record.Jenjang_Bacaan === "Al Qur'an") {
                const suratBacaanSelect = document.getElementById('suratBacaanSelect');
                const ayatBacaanInput = document.getElementById('ayatBacaanInput');
                if (suratBacaanSelect) suratBacaanSelect.value = record.Detail_Bacaan;
                if (ayatBacaanInput) ayatBacaanInput.value = record.Sub_Detail;
            }
        }, 100);
    }

    if (record.Nilai_Bacaan) nilaiBacaanSelect.value = record.Nilai_Bacaan;
    if (record.Surat_Hafalan) hafalanSuratSelect.value = record.Surat_Hafalan;
    if (record.Ayat_Hafalan) hafalanAyatInput.value = record.Ayat_Hafalan;
    if (record.Nilai_Hafalan) nilaiHafalanSelect.value = record.Nilai_Hafalan;

    generateCatatanOtomatis();
}


/**
 * Fungsi inisialisasi: mengambil semua data awal.
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

    if (hafalanData) { hafalanSuratCache = hafalanData; populateSelect(hafalanSuratSelect, hafalanSuratCache); }
    if (bacaanData) bacaanSuratCache = bacaanData;
    if (siswaData) siswaCache = siswaData;
    if (dataCatatan) catatanCache = dataCatatan;

    if (siswaCache && catatanCache && hafalanSuratCache && bacaanSuratCache) {
        kelasSelect.disabled = false;
        kelasSelect.remove(1);
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
    resetPencapaianFields(); // Kosongkan field saat ganti kelas
});

/**
 * [EVENT LISTENER BARU] Menjalankan auto-fill saat nama siswa dipilih.
 */
siswaSelect.addEventListener('change', async (e) => {
    const studentId = e.target.value;
    if (!studentId) return;

    resetPencapaianFields();
    console.log(`Mencari data terakhir untuk siswa ID: ${studentId}...`);
    
    // Tampilkan indikator loading jika perlu
    
    const lastRecord = await fetchData('getLastRecord', { studentId: studentId });
    
    if (lastRecord) {
        console.log('Data terakhir ditemukan:', lastRecord);
        prefillForm(lastRecord);
    } else {
        console.log('Tidak ada data sebelumnya untuk siswa ini.');
    }
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
