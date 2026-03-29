const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Setup storage folder for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
// Serve the entire root folder statically so HTML pages can load seamlessly
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize simple JSON database
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ virtualTours: [], spesies: [] }, null, 4));
}

// Function to read/write DB
function getDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

// REST API for Virtual Tours
app.get('/api/tours', (req, res) => {
    res.json(getDB().virtualTours);
});

app.post('/api/tours', upload.single('image'), (req, res) => {
    try {
        const db = getDB();
        
        let newTour = {
            id: Date.now(),
            title: req.body.title || 'Lokasi Baru',
            yaw: req.body.yaw || 0,
            pitch: req.body.pitch || 0,
            imagePath: req.file ? '/uploads/' + req.file.filename : '',
            dateAdded: new Date().toLocaleDateString('id-ID', { year:'numeric', month:'short', day:'numeric' })
        };
        
        db.virtualTours.push(newTour);
        saveDB(db);
        
        res.json({ success: true, message: 'Konten 360 Berhasil Diunggah!', data: newTour });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// REST API for Spesies (Ensiklopedia)
app.get('/api/spesies', (req, res) => {
    let db = getDB();
    
    // Auto-seed (Isi otomatis jika kosong)
    if (db.spesies.length === 0) {
        db.spesies = [
            {
                id: 1,
                nama_lokal: "Bakau Kurap",
                nama_ilmiah: "Rhizophora mucronata",
                deskripsi: "Memiliki akar tunjang yang kuat dan buah berbentuk silindris panjang. Sangat kokoh menahan ombak.",
                gambar: "http://localhost:3000/uploads/rhizophora_mucronata_1773842258442.png"
            },
            {
                id: 2,
                nama_lokal: "Api-api Putih",
                nama_ilmiah: "Avicennia marina",
                deskripsi: "Dikenal dengan akar napas yang muncul ke permukaan tanah seperti pensil. Habitat fauna laut dangkal.",
                gambar: "http://localhost:3000/uploads/avicennia_marina_1773842274592.png"
            },
            {
                id: 3,
                nama_lokal: "Pedada",
                nama_ilmiah: "Sonneratia alba",
                deskripsi: "Memiliki buah berbentuk bulat seperti bola yang dapat dimakan oleh satwa liar tertentu.",
                gambar: "http://localhost:3000/uploads/sonneratia_alba_1773842290428.png"
            }
        ];
        saveDB(db);
    }
    
    res.json(db.spesies);
});

// REST API for Adding New Species
app.post('/api/spesies', upload.single('image'), (req, res) => {
    try {
        let db = getDB();
        if(!db.spesies) db.spesies = [];
        
        let newId = db.spesies.length > 0 ? Math.max(...db.spesies.map(s => s.id)) + 1 : 1;
        
        let imgPath = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80"; // default
        if (req.file) {
            imgPath = '/uploads/' + req.file.filename;
        }

        const newSpecies = {
            id: newId,
            nama_lokal: req.body.nama_lokal || "Spesies Baru",
            nama_ilmiah: req.body.nama_ilmiah || "Tidak diketahui",
            deskripsi: req.body.deskripsi || "",
            manfaat: req.body.manfaat || "",
            gambar: imgPath
        };
        
        db.spesies.push(newSpecies);
        saveDB(db);
        
        res.json({ success: true, message: 'Spesies Berhasil Ditambahkan!', data: newSpecies });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// REST API for Kaka Mangrove Chatbot (Simulasi AI Belajar & Internet)
app.post('/api/chat', async (req, res) => {
    try {
        const queryPolos = req.body.message || "";
        const text = queryPolos.toLowerCase();
        let db = getDB();
        
        // Buat "Otak" awal jika belum pernah ada
        if (!db.chatKnowledge) {
            db.chatKnowledge = [
                { keywords: ["akar", "pohon", "tunjang", "bakau"], answer: "<p>Ah, bicara soal akar, akar bakau seperti tangan nenek moyang kita menahan laju ombak.</p>" },
                { keywords: ["ikan", "kepiting", "hewan", "satwa", "fauna"], answer: "<p>Di celah akarnya banyak sekali ikan Kakap, Belanak, dan Kepiting Bakau yang bersembunyi.</p>" },
                { keywords: ["waktu", "kapan", "jam", "pagi", "sore"], answer: "<p>Waktu terbaik berkunjung adalah saat pagi hari ketika burung-burung bangau putih bermain.</p>" }
            ];
            db.unansweredQuestions = [];
            saveDB(db);
        }

        let bestAnswer = null;
        // 1. AI mencari kecocokan kata dari Database Lokal (Kearifan Lokal)
        for (let item of db.chatKnowledge) {
            if (item.keywords.some(kw => text.includes(kw))) {
                bestAnswer = item.answer;
                break;
            }
        }

        // 2. Jika Database Lokal Tidak Punya Jawaban, BACA INTERNET! (Wikipedia API)
        if (!bestAnswer) {
            try {
                // Modul Native Node.js Fetch (Mencari definisi dari Wikipedia Bahasa Indonesia)
                const wikiRes = await fetch(`https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryPolos)}&utf8=&format=json`);
                const wikiData = await wikiRes.json();
                
                if (wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
                    // Ambil paragraf rangkuman teratas (dibuang tag HTML-nya dengan Regex)
                    const snippetHtml = wikiData.query.search[0].snippet;
                    const cleanText = snippetHtml.replace(/<[^>]*>?/gm, '');
                    
                    bestAnswer = `<p>Dari yang Kaka baca di Internet (Buku Ensiklopedia Bebas): <b>${cleanText}...</b></p><br><p><small><i>*Semoga informasi statistik/fakta ini membantu Pace! Kaka akan simpan ini di memori Kaka juga.*</i></small></p>`;
                }
            } catch(e) {
                console.error("Wikipedia search error:", e);
                // Lanjut ke fallback di bawah jika Internet mati
            }
        }

        // 3. Respon Akhir
        if (bestAnswer) {
            res.json({ success: true, reply: bestAnswer });
        } else {
            // JIKA MENYERAH: AI Menyimpan Pertanyaan ke Laci
            db.unansweredQuestions.push({
                pertanyaan_baru: queryPolos,
                waktu: new Date().toLocaleString('id-ID')
            });
            saveDB(db); 
            
            res.json({ 
                success: true, 
                reply: "Hmm, tentang <em>'" + queryPolos + "'</em>, Kaka bahkan tidak menemukannya di internet. Tapi Kaka <b>sudah mencatatnya di Database Memori</b>. Kaka akan tanyakan ke tetua kampung agar besok Kaka jadi pintar!" 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, reply: "Maaf, jaringan saraf internet Kaka sedang putus." });
    }
});

// GET Destinasi Pilihan
app.get('/api/destinasi', (req, res) => {
    let db = getDB();
    if (!db.destinasi) {
        db.destinasi = [
            { id: 1, title: "Hutan Lindung Waropen", category: "Ekosistem Air", icon: "water_drop", desc: "Paru-paru dunia yang menjaga keseimbangan pesisir Papua.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrlSAsKk0qH7NgCIGvPLCC_j5gZo1WlzMOPw1ad03ewjvhcq2MlYy4qMv7bxkVfrZV9x8g2GQ01Jh7vfdFLfKCdExiooX6aXlRA0u6rSRuXlJKTx1Hg7bEWBsTJx--YvHGBlhxdLY8cUemGAS2nLgK_M9NyL7ezk-0lTnUrnjAdLzis-L8mzHYsplBNW99j47q0A5lcDwBD9vu52u9NOFyo18_A7IPNUIjBxySq2RuVUkFzcmigkYHSlXG32y4oCkZx8oua189YnU" },
            { id: 2, title: "Muara Biru", category: "Titik Pertemuan", icon: "terrain", desc: "Pertemuan air tawar dan laut dengan gradasi warna yang memukau.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBROdnbYWgIG_jw3TV5eZeGb5r4Gqea-ZOjZ-kilpMVz3rzzI0AJZ1kiLLUDVeprIOXzyNBPE4qtZ6q5mAwHvywYZvJEDFJ-BBqK2BUv5ltdmj8z_lh1dQfw12hHiCYegoc0pi8o4S1rVXxLYaswiS59zA8ajQN9OthTF5VFf0k_HwTpgJxEgskk79yx4emkqf2bczohyXANG5gCLFaOm9AY-pRIQDjZwrDFIvL3VEJ7sUA277bWOwvs33S4lreWfzTaUc8ckB_9C0" },
            { id: 3, title: "Jalur Kayu Estetik", category: "Akses Wisata", icon: "park", desc: "Jembatan kayu ikonik yang membelah keheningan hutan bakau.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC04fVITP8uk2Tr4lUA9XwvArF9BfA1V2xjT8ChY8ADOOsuGG14iWZP5GSPIRnnqAqJrUoBOlILOupBFak5Cvz5OnF7nRw-XwPwTpybFjfhfriwzKzPkeS_opgaJORd2YBVqvWITyBZEcXSGIWVIxb2dFrcUwbjEGpUYhsb7OPSe24IYH-gYX7pUTTlkuNz_oZluwu-41qd9khCO8oPLZR7Lq_745ggJf2zeGBrIgrv8ju0P1yyG9isihZuMcK9aPfsRhoNRAtMCMA" }
        ];
        saveDB(db);
    }
    res.json(db.destinasi);
});

// UPDATE Destinasi
app.post('/api/destinasi/:id', upload.single('image'), (req, res) => {
    let db = getDB();
    if (!db.destinasi) return res.status(404).json({error: "Belum inisialisasi /api/destinasi"});
    
    let index = db.destinasi.findIndex(d => d.id == req.params.id);
    if(index > -1) {
        if(req.body.title) db.destinasi[index].title = req.body.title;
        if(req.body.desc) db.destinasi[index].desc = req.body.desc;
        if(req.body.category) db.destinasi[index].category = req.body.category;
        
        if(req.file) {
            db.destinasi[index].img = '/uploads/' + req.file.filename;
        }
        saveDB(db);
        res.json({success: true, data: db.destinasi[index]});
    } else {
        res.status(404).json({error: "Destination not found"});
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`✅ SERVER MANGROVE AKTIF`);
    console.log(`🌐 Buka di Browser: http://localhost:${PORT}`);
    console.log(`================================\n`);
});
