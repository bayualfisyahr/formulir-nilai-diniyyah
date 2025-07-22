// =================================================================================
// KONFIGURASI PENTING - HARAP DIISI
// =================================================================================
// Ganti dengan URL Web App BARU dari Google Apps Script Anda yang terakhir
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyz2NEjY83w3Uks3n_uMuSqaVSZq-thHKor3zdsns1n67lhlTt1lzGItmEXYP3N1fjE/exec'; 

// [CACHE] Variabel
let siswaCache = null;
let catatanCache = null;
let hafalanSuratCache = null;
let bacaanSuratCache = null;
let dailyStatusCache = null;

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
const overallStatusInfo = document.getElementById('overall-status-info');
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

    // [FIX] Prioritaskan catatan dari database
    if (record && record.Catatan_Final) {
        catatanTextarea.value = record.Catatan_Final;
    } else {
        generateCatatanOtomatis();
    }
}


// GANTI FUNGSI INI DENGAN VERSI FINAL YANG SUDAH LENGKAP
async function initializeForm() {
    const initialData = await fetchData('getInitialData');

    splashScreen.style.opacity = '0';
    setTimeout(() => {
        splashScreen.style.display = 'none';
        appContainer.classList.remove('hidden');
    }, 500);

    if (initialData && initialData.allSiswa && initialData.allSiswa.length > 0) {
        hafalanSuratCache = initialData.hafalanSurat;
        bacaanSuratCache = initialData.bacaanSurat;
        siswaCache = initialData.allSiswa;
        catatanCache = initialData.refCatatan;
        dailyStatusCache = initialData.dailyStatuses;

        if (hafalanSuratCache) populateSelect(hafalanSuratSelect, hafalanSuratCache);
        
        if (initialData.uniqueClasses && initialData.uniqueClasses.length > 0) {
            populateSelect(kelasSelect, initialData.uniqueClasses);
            kelasSelect.disabled = false;
        } else {
            kelasSelect.innerHTML = `<option value="">Kelas tidak ditemukan</option>`;
        }
        
        console.log('Semua cache berhasil dimuat.');
    } else {
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
    overallStatusInfo.style.display = 'none';
    lastBacaanInfo.style.display = 'none';
    lastHafalanInfo.style.display = 'none';
    siswaSelect.innerHTML = `<option value="">Memuat siswa...</option>`;
    siswaSelect.disabled = true;

    if (!selectedKelas || !siswaCache) {
        siswaSelect.innerHTML = `<option value="">Pilih kelas terlebih dahulu...</option>`;
        return;
    }
    
    // [OPTIMISASI] Tidak ada lagi fetchData, langsung dari cache
    const siswaDiKelas = siswaCache.filter(siswa => siswa.kelas.toString() === selectedKelas);
    
    siswaSelect.innerHTML = `<option value="" disabled selected>Pilih siswa...</option>`;

    if (siswaDiKelas.length > 0) {
        siswaDiKelas.forEach(siswa => {
            const option = document.createElement('option');
            option.value = siswa.id;
            
            let studentName = siswa.nama;
            const status = dailyStatusCache ? dailyStatusCache[siswa.id] : null;

            if (status === 'complete') {
                studentName += ' ✅';
            } else if (status === 'partial') {
                studentName += ' 🟡';
            }

            option.textContent = studentName;
            siswaSelect.appendChild(option);
        });
        siswaSelect.disabled = false;
    } else {
        siswaSelect.innerHTML = `<option value="">Tidak ada siswa di kelas ini</option>`;
        siswaSelect.disabled = true;
    }
});

// GANTI KESELURUHAN BLOK INI
siswaSelect.addEventListener('change', async (e) => {
    const studentId = e.target.value;
    if (!studentId) return;

    resetPencapaianFields();

    // [FIX] Tampilkan kembali status loading ringkasan
    overallStatusInfo.style.display = 'block';
    overallStatusInfo.textContent = 'Memuat data terakhir...';
    overallStatusInfo.className = 'info-box loading';

    lastBacaanInfo.style.display = 'none';
    lastHafalanInfo.style.display = 'none';

    const lastDeposits = await fetchData('getLastDeposits', { studentId: studentId });

    if (lastDeposits && (lastDeposits.lastBacaan || lastDeposits.lastHafalan)) {
        overallStatusInfo.textContent = 'Data terakhir ditemukan!';
        overallStatusInfo.className = 'info-box success';
    } else {
        overallStatusInfo.textContent = 'Data terakhir tidak ditemukan!';
        overallStatusInfo.className = 'info-box warning';
    }

    if (lastDeposits && lastDeposits.lastBacaan) {
        const record = lastDeposits.lastBacaan;
        const tgl = new Date(record.Timestamp).toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit'
        });
        lastBacaanInfo.textContent = `Terakhir setor bacaan pada: ${tgl}`;
        lastBacaanInfo.className = 'info-box success';
        lastBacaanInfo.style.display = 'block';
    }

    if (lastDeposits && lastDeposits.lastHafalan) {
        const record = lastDeposits.lastHafalan;
        const tgl = new Date(record.Timestamp).toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit'
        });
        lastHafalanInfo.textContent = `Terakhir setor hafalan pada: ${tgl}`;
        lastHafalanInfo.className = 'info-box success';
        lastHafalanInfo.style.display = 'block';
    }

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
    
    // [FIX] Membersihkan nama siswa dari ikon sebelum dikirim
    data.namaSiswa = selectedSiswaOption.text.replace(/ [✅🟡✔️⭐📝✏️➖▫️⏳☑️🌟🏆👍✨🎉🟢🔵📚🎓❤️🧡💛💚💙💜👋👈👉➡️⬅️⬆️⬇️↗️↘️↙️↖️↔️↕️ℹ️❓❔❕➕➗🟰©️®️™️☀️🌙☁️⚡🔥💧❄️🌀🌈🌊🔗⚙️💡🔑🔒🔓📖📕📗📘📙📜📄🎒❤️🧡💛💚💙💜👍👎🙂😊🤔😐😶🧐😎😁😅😇❤️🧡💛💚💙💜👍👎👋👈👉]/g, '').trim();

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
        kelasSelect.value = ''; // Reset pilihan kelas
        siswaSelect.innerHTML = `<option value="">Pilih kelas terlebih dahulu...</option>`;
        siswaSelect.disabled = true;
        dynamicBacaanFields.innerHTML = '';
        
        // [FIX] Sembunyikan semua info box setelah submit berhasil
        overallStatusInfo.style.display = 'none';
        lastBacaanInfo.style.display = 'none';
        lastHafalanInfo.style.display = 'none';

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
