// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// URL Web App BARU dari Google Apps Script yang sudah Anda deploy
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby97JTGueEOzTefroE_AmRT5hBgveAAi535whYbczS9LqYU0Uoth7SIx29AyUsNX57S/exec'; 

// URL Webhook n8n Anda yang sudah berjalan
const N8N_WEBHOOK_URL = 'https://bayualfi.app.n8n.cloud/webhook/15a69324-bbc0-4b25-82cb-2f9ef519b8ea';
// =================================================================================

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
const lastDepositInfo = document.getElementById('last-deposit-info');
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

function resetPencapaianFields() {
    jenjangSelect.value = '';
    dynamicBacaanFields.innerHTML = '';
    nilaiBacaanSelect.value = '';
    hafalanSuratSelect.value = '';
    hafalanAyatInput.value = '';
    nilaiHafalanSelect.value = '';
    catatanTextarea.value = '';
    lastDepositInfo.classList.add('hidden');
    lastDepositInfo.textContent = '';
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
    if (record.Timestamp) {
        const tgl = new Date(record.Timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        lastDepositInfo.textContent = `Setoran terakhir pada: ${tgl}`;
        lastDepositInfo.className = 'info-box success'; 
    }
    updateDynamicBacaanFields(record.Jenjang_Bacaan, record);
    jenjangSelect.value = record.Jenjang_Bacaan || '';
    nilaiBacaanSelect.value = record.Nilai_Bacaan || '';
    hafalanSuratSelect.value = record.Surat_Hafalan || '';
    hafalanAyatInput.value = record.Ayat_Hafalan || '';
    nilaiHafalanSelect.value = record.Nilai_Hafalan || '';
    generateCatatanOtomatis();
}

async function initializeForm() {
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

    splashScreen.style.opacity = '0';
    setTimeout(() => {
        splashScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 500);
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
    resetPencapaianFields();
});

siswaSelect.addEventListener('change', async (e) => {
    const studentId = e.target.value;
    if (!studentId) return;

    resetPencapaianFields();
    
    lastDepositInfo.textContent = 'Memuat data terakhir...';
    lastDepositInfo.className = 'info-box loading';
    lastDepositInfo.classList.remove('hidden');
    
    const lastRecord = await fetchData('getLastRecord', { studentId: studentId });
    
    if (lastRecord) {
        prefillForm(lastRecord);
    } else {
        lastDepositInfo.textContent = 'Tidak ada data setoran terakhir.';
        lastDepositInfo.className = 'info-box warning';
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
        lastDepositInfo.classList.add('hidden');
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

