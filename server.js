const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

app.use('/outputs', express.static(outputDir));

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nije poslat fajl.' });
    }

    const targetSizeMB = parseFloat(req.body.target_size);
    if (isNaN(targetSizeMB) || targetSizeMB <= 0) {
        return res.status(400).json({ error: 'Nevažeća ciljana veličina.' });
    }

    const inputPath = req.file.path;
    const outputFileName = `kompresovan-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Greška pri analizi videa.' });
        }

        const durationInSeconds = metadata.format.duration;
        if (!durationInSeconds) {
            return res.status(500).json({ error: 'Nije moguće odrediti trajanje videa.' });
        }

        const totalBitrate = (targetSizeMB * 8 * 1024 * 1024) / durationInSeconds;
        const audioBitrate = 128 * 1024;
        const videoBitrate = Math.floor((totalBitrate - audioBitrate) / 1024);

        if (videoBitrate <= 0) {
             return res.status(400).json({ error: 'Ciljana veličina je previše mala za ovaj video.' });
        }

        console.log(`Počinjem kompresiju... Ciljani video bitrate: ${videoBitrate}k`);

        ffmpeg(inputPath)
            .videoCodec('libx264')
            .videoBitrate(`${videoBitrate}k`)
            .audioCodec('aac')
            .audioBitrate('128k')
            .on('end', () => {
                console.log('Kompresija završena!');
                res.json({
                    download_url: `/outputs/${outputFileName}`
                });
                fs.unlinkSync(inputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg greška:', err.message);
                res.status(500).json({ error: 'Greška tokom kompresije videa.' });
            })
            .save(outputPath);
    });
});

app.listen(port, () => {
    console.log(`Server sluša na portu ${port}`);
});
