// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script Anda yang terakhir
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5Qe7bgtkDK_4ijQxvkhXM5gPzYoxRnXE5Sal2595aoZxfSXh_DnyaQfLkM2yTge76/exec'; 

// [CACHE] Variabel
let siswaCache = null;
let catatanCache = null;
let hafalanSuratCache = null;
let bacaanSuratCache = null;

// ==================== DEFINISI ELEMEN DOM ====================
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');
const form = document.getElementById('formInputNilai');
const kelasSelect = document.getElementById('kelasSelect');
const siswaSelect = document.getElementById('siswaSelect');
const jenjangSelect = document.getElementById('jenjangSelect');
const dynamicBacaanFields = document.getElementById('dynamicBacaanFields');
const nilaiBacaanSelect = document.getElementById('nilaiBacaanSelect');
const nilaiHafalanSelect = document.getElementById('nilaiHafalanSelect');
const hafalanSuratSelect = document.getElementById('hafalanSuratSelect');
const hafalanAyatInput = document.getElementById('hafalanAyatInput');
const catatanTextarea = document.getElementById('catatanTextarea');
const lastBacaanInfo = document.getElementById('last-bacaan-info');
const lastHafalanInfo = document.getElementById('last-hafalan-info');
const submitButton = document.getElementById('submitButton');
const buttonText = document.querySelector('.button-text');
const submitLoader = document.getElementById('submitLoader');
const statusMessage = document.getElementById('statusMessage');

// ==================== FUNGSI-FUNGSI UTAMA ====================

async function fetchData(request, params = {}) {
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('request', request);
    if (params) {
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }
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

/**
 * [DIPERBARUI] Membuat catatan otomatis yang lebih cerdas.
 */
function generateCatatanOtomatis() {
    const nilaiBacaan = nilaiBacaanSelect.value;
    const nilaiHafalan = nilaiHafalanSelect.value;
    let finalNote = '';

    if (nilaiBacaan && nilaiHafalan) {
        const kode = `${nilaiBacaan}-${nilaiHafalan}`;
        const catatanObj = catatanCache.find(item => item.kode === kode);
        if (catatanObj) finalNote = catatanObj.deskripsi;
    } else if (nilaiBacaan) {
        const kode = `BACAAN_${nilaiBacaan}`;
        const catatanObj = catatanCache.find(item => item.kode === kode);
        if (catatanObj) finalNote = catatanObj.deskripsi;
    } else if (nilaiHafalan) {
        const kode = `HAFALAN_${nilaiHafalan}`;
        const catatanObj = catatanCache.find(item => item.kode === kode);
        if (catatanObj) finalNote = catatanObj.deskripsi;
    }
    
    catatanTextarea.value = finalNote;
}

function resetPencapaianFields() {
    jenjangSelect.value = '';
    dynamicBacaanFields.innerHTML = '';
    nilaiBacaanSelect.value = '';
    hafalanSuratSelect.value = '';
    hafalanAyatInput.value = '';
    nilaiHafalanSelect.value = '';
    catatanTextarea.value = '';
    lastBacaanInfo.classList.add('hidden');
    lastHafalanInfo.classList.add('hidden');
}

function updateDynamicBacaanFields(jenjang, record = null) {
    const detailBacaanValue = record ? (record.Detail_Bacaan || '') : '';
    const subDetailValue = record ? (record.Sub_Detail || '') : '';
    dynamicBacaanFields.innerHTML = '';
    if (jenjang && jenjang.startsWith('Iqro')) {
        dynamicBacaanFields.innerHTML = `<div class="form-group"><label for="halamanInput">Halaman</label><input type="number" id="halamanInput" name="detailBacaan" value="${detailBacaanValue}" placeholder="1 - 31" min="1" max="31"></div><div class="form-group"><label for="barisInput">Baris</label><input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="barisInput" name="subDetail" value="${subDetailValue}" placeholder="Contoh: 1-5"></div>`;
    } else if (jenjang === "Al Qur'an") {
        dynamicBacaanFields.innerHTML = `<div class="form-group"><label for="suratBacaanSelect">Surat</label><select id="suratBacaanSelect" name="detailBacaan"></select></div><div class="form-group"><label for="ayatBacaanInput">Ayat</label><input type="text" inputmode="numeric" pattern="[0-9\\-]+" title="Hanya angka dan tanda hubung (-)" id="ayatBacaanInput" name="subDetail" value="${subDetailValue}" placeholder="Contoh: 1-10"></div>`;
        const suratBacaanSelect = document.getElementById('suratBacaanSelect');
        if (bacaanSuratCache) {
            populateSelect(suratBacaanSelect, bacaanSuratCache);
            suratBacaanSelect.value = detailBacaanValue;
        }
    }
}

function prefillForm(record) {
    resetPencapaianFields();
    
    updateDynamicBacaanFields(record.Jenjang_Bacaan, record);
    
    jenjangSelect.value = record.Jenjang_Bacaan || '';
    nilaiBacaanSelect.value = record.Nilai_Bacaan || '';
    hafalanSuratSelect.value = record.Surat_Hafalan || '';
    hafalanAyatInput.value = record.Ayat_Hafalan || '';
    nilaiHafalanSelect.value = record.Nilai_Hafalan || '';

    generateCatatanOtomatis();
}

/**
 * [FUNGSI DIPERBARUI TOTAL] Inisialisasi dengan panggilan data tunggal dan penanganan error yang lebih baik.
 */
async function initializeForm() {
    const initialData = await fetchData('getInitialData');

    // Sembunyikan splash screen setelah data (atau error) diterima
    splashScreen.style.opacity = '0';
    setTimeout(() => {
        splashScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 500);

    if (initialData && initialData.allSiswa && initialData.allSiswa.length > 0) {
        // Jika semua data berhasil dimuat
        hafalanSuratCache = initialData.hafalanSurat;
        bacaanSuratCache = initialData.bacaanSurat;
        siswaCache = initialData.allSiswa;
        catatanCache = initialData.refCatatan;

        if (hafalanSuratCache) populateSelect(hafalanSuratSelect, hafalanSuratCache);
        
        // --- PERUBAHAN UTAMA DI SINI ---
        // Mengisi dropdown kelas secara dinamis dari data yang diterima
        if (initialData.uniqueClasses && initialData.uniqueClasses.length > 0) {
            populateSelect(kelasSelect, initialData.uniqueClasses);
            kelasSelect.disabled = false;
        } else {
            kelasSelect.innerHTML = `<option value="">Kelas tidak ditemukan</option>`;
        }
        
        console.log('Semua cache berhasil dimuat.');
    } else {
        // Jika data gagal dimuat, berikan pesan error yang jelas
        kelasSelect.innerHTML = `<option value="">Gagal memuat data siswa</option>`;
        siswaSelect.innerHTML = `<option value="">Periksa koneksi/database</option>`;
        kelasSelect.disabled = true;
        siswaSelect.disabled = true;
        console.error("Gagal memuat data awal atau data siswa kosong.");
    }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', initializeForm);
nilaiBacaanSelect.addEventListener('change', generateCatatanOtomatis);
nilaiHafalanSelect.addEventListener('change', generateCatatanOtomatis);

kelasSelect.addEventListener('change', (e) => {
    const selectedKelas = e.target.value;
    resetPencapaianFields();
    // Reset pilihan siswa dan nonaktifkan
    siswaSelect.innerHTML = `<option value="">Pilih siswa...</option>`;
    siswaSelect.disabled = true;


    if (!selectedKelas || !siswaCache) {
        siswaSelect.innerHTML = `<option value="">Pilih kelas terlebih dahulu...</option>`;
        siswaSelect.disabled = true;
        return;
    }
    
    const siswaDiKelas = siswaCache.filter(siswa => siswa.kelas.toString() === selectedKelas);
    
    if (siswaDiKelas.length > 0) {
        populateSelect(siswaSelect, siswaDiKelas, 'id', 'nama');
        siswaSelect.disabled = false;
    } else {
        siswaSelect.innerHTML = `<option value="">Tidak ada siswa di kelas ini</option>`;
        siswaSelect.disabled = true;
    }
});

siswaSelect.addEventListener('change', async (e) => {
    const studentId = e.target.value;
    if (!studentId) return;

    resetPencapaianFields();
    
    lastBacaanInfo.textContent = 'Memuat data bacaan terakhir...';
    lastHafalanInfo.textContent = 'Memuat data hafalan terakhir...';
    lastBacaanInfo.className = 'info-box loading';
    lastHafalanInfo.className = 'info-box loading';
    lastBacaanInfo.classList.remove('hidden');
    lastHafalanInfo.classList.remove('hidden');
    
    const lastDeposits = await fetchData('getLastDeposits', { studentId: studentId });
    
    if (lastDeposits && lastDeposits.lastBacaan) {
        const record = lastDeposits.lastBacaan;
        const tgl = new Date(record.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
        lastBacaanInfo.textContent = `Bacaan terakhir (${tgl}): ${record.Jenjang_Bacaan} ${record.Detail_Bacaan || ''} baris ${record.Sub_Detail || ''}`;
        lastBacaanInfo.className = 'info-box success';
    } else {
        lastBacaanInfo.textContent = 'Tidak ada data setoran bacaan terakhir.';
        lastBacaanInfo.className = 'info-box warning';
    }

    if (lastDeposits && lastDeposits.lastHafalan) {
        const record = lastDeposits.lastHafalan;
        const tgl = new Date(record.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
        lastHafalanInfo.textContent = `Hafalan terakhir (${tgl}): QS. ${record.Surat_Hafalan} ayat ${record.Ayat_Hafalan || ''}`;
        lastHafalanInfo.className = 'info-box success';
    } else {
        lastHafalanInfo.textContent = 'Tidak ada data setoran hafalan terakhir.';
        lastHafalanInfo.className = 'info-box warning';
    }
    
    // Prefill form dengan data terakhir yang paling relevan (misalnya bacaan)
    if (lastDeposits && lastDeposits.lastBacaan) {
        prefillForm(lastDeposits.lastBacaan);
    } else if (lastDeposits && lastDeposits.lastHafalan) {
        prefillForm(lastDeposits.lastHafalan);
    }
});

jenjangSelect.addEventListener('change', (e) => {
    updateDynamicBacaanFields(e.target.value);
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
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'Terjadi kesalahan pada server Google.');
        }
        statusMessage.textContent = result.message || 'Laporan berhasil dikirim!';
        statusMessage.className = 'status-success';
        form.reset();
        // Reset dropdown ke kondisi awal setelah submit berhasil
        kelasSelect.value = '';
        siswaSelect.innerHTML = `<option value="">Pilih kelas terlebih dahulu...</option>`;
        siswaSelect.disabled = true;
        dynamicBacaanFields.innerHTML = '';
        catatanTextarea.value = '';
        lastBacaanInfo.classList.add('hidden');
        lastHafalanInfo.classList.add('hidden');

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
