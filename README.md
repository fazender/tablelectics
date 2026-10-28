# tablelectics
Validator kelengkapan rekap nilai dalam bentuk tabel

Nilai kuis diinput secara manual ke Google Spreadsheet. Nilai yang terlewat hanya muncul sebagai sel kosong dan sering tidak terdeteksi sebelum diumumkan, sehingga mahasiswa berisiko kehilangan nilai tanpa menyadarinya.

Fitur
- Input data dengan menempel dari Google Sheets atau mengunggah file CSV
- Menandai sel nilai kosong dan membedakannya dari nilai 0
- Menandai nilai yang bukan angka atau di luar rentang 0–100 (mendukung desimal dengan koma, misalnya 82,5)
- Menandai NRP ganda dan format NRP yang tidak valid
- Tabel hasil dengan warna berbeda untuk tiap jenis masalah
- Laporan ringkas per kolom

Cara Menggunakan
1. Buka `index.html` di browser.
2. Tempel data dari Google Sheets atau unggah file CSV. Kolom pertama berisi NRP, kolom berikutnya berisi nilai.
3. Klik 'Periksa'.
4. Untuk mencoba, klik 'Muat Data Contoh'.

HTML, CSS, dan JavaScript tanpa framework. Dibangun dengan bantuan IBM Bob sebagai AI agent.


Capstone Project – Hacktiv8 x IBM SkillsBuild
