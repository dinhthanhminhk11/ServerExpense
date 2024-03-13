import { formatResponseError, formatResponseSuccess, formatResponseSuccessNoData } from '../config';
import Song from '../models/song';
const mm = require('music-metadata');
const fs = require('fs');
const crypto = require('crypto')
const multer = require('multer');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const os = require('os');
const { spawn } = require('child_process');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'audio/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};
const upload = multer({ storage, fileFilter });


class SongClass {
    async addSong(req, res) {
        try {
            upload.single('fileAudio')(req, res, async (err) => {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(400).json(formatResponseError({ code: '400' }, false, 'Lỗi upload file'));
                }

                if (!req.file) {
                    return res.status(400).json(formatResponseError({ code: '400' }, false, 'Không tìm thấy file âm thanh'));
                }

                if (!isValidAudioFile(req.file)) {
                    return res.status(400).json(formatResponseError({ code: '400' }, false, 'Lỗi định dạng file'));
                }

                const metadata = await mm.parseFile(req.file.path);
                const durationInSeconds = metadata.format.duration;

                const dataSong = {
                    title: req.body.title,
                    trackNumber: req.body.trackNumber,
                    year: Date.now(),
                    duration: durationInSeconds,
                    data: `${req.file.filename}`,
                    dateModified: Date.now(),
                };
                const saveSong = await new Song(dataSong).save();
                const songId = saveSong._id.toString();
                const songDirectory = path.join(__dirname, '..', '..', 'audio', songId);
                fs.mkdirSync(songDirectory, { recursive: true });
                const newFilePath = path.join(songDirectory, req.file.filename);
                fs.renameSync(req.file.path, newFilePath);
                const encKeyPath = path.join(songDirectory, 'enc.key');
               

                const ffmpegCommand = `ffmpeg -y -i "${newFilePath}" -hls_time 9 -hls_key_info_file "${path.join(songDirectory, 'enc.keyinfo')}" -hls_playlist_type vod -hls_segment_filename "${path.join(songDirectory, 'fileSequence%d.ts')}" "${path.join(songDirectory, 'index.m3u8')}"`;


                await Song.findByIdAndUpdate(songId, { dataPath: ffmpegCommand });
                exec(`openssl rand 16 > ${encKeyPath}`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Lệnh thất bại: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.error(`Lỗi: ${stderr}`);
                        return;
                    }

                    fs.readFile(encKeyPath, 'utf-8', (err, data) => {
                        if (err) {
                            console.error('Đọc tập tin enc.key thất bại:', err);
                            // Xử lý lỗi đọc tập tin enc.key ở đây
                            return;
                        }
        
                        // In ra nội dung của tập tin enc.key
                        console.log('Nội dung của tập tin enc.key:', data);
        
                        // Tiếp tục xử lý hoặc gọi các hàm khác ở đây
                    });

                    exec('openssl rand -hex 16', (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Lỗi: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`stderr: ${stderr}`);
                            return;
                        }
                        const randomHex = stdout.trim();
                        const ipAddress = getIPAddress();
                        const keyInfoContent = `http://${ipAddress}:3000/audio/${songId}/enc.key\nenc.key\n${randomHex}`;
                        fs.writeFileSync(path.join(songDirectory, 'enc.keyinfo'), keyInfoContent);
                        const filePath = path.join(songDirectory, 'enc.keyinfo');
                        console.log(filePath);
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        
                        
                        // const ffmpegCommand = `ffmpeg -y -i ${newFilePath} -hls_time 9 -hls_key_info_file ${path.join(songDirectory, 'enc.keyinfo')} -hls_playlist_type vod -hls_segment_filename "${songId}/fileSequence%d.ts" ${songId}/index.m3u8`;
                        //  console.log(ffmpegCommand);

                        runFFMPEGCommand(ffmpegCommand)

                        res.status(200).json(formatResponseSuccess(saveSong, true, 'Lưu thành công'));
                    });
                });
            });
        } catch (error) {
            console.error('addSong error:', error);
            return res.status(500).json(formatResponseError({ code: '500' }, false, 'Lỗi xảy ra trong quá trình thực thi'));
        }
    }
}

function isValidAudioFile(file) {
    const validExtensions = ['.mp3', '.wav', '.ogg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    return validExtensions.includes(fileExtension);
}

function getIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const interfaceKey in networkInterfaces) {
        const networkInterface = networkInterfaces[interfaceKey];
        for (const { address, family, internal } of networkInterface) {
            if (family === 'IPv4' && !internal) {
                addresses.push(address);
            }
        }
    }
    return addresses[0];
}

function escapePath(filePath) {
    return filePath.replace(/ /g, '\\ ');
}

async function runFFMPEGCommand(ffmpegCommand) {
    try {
        const commandParts = ffmpegCommand.split(' ');
        const proc = spawn(commandParts[0], commandParts.slice(1), { shell: true });

        proc.stdout.on('data', (data) => {
            console.error(`================================`);
            console.log(`FFMPEG stdout: ${data}`);
        });

        proc.stderr.on('data', (data) => {
            console.error(`================================`);
            console.error(`FFMPEG stderr: ${data}`);
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.error(`================================`);
                console.log('FFMPEG command executed successfully.');
            } else {
                console.error(`================================`);
                console.error(`FFMPEG command exited with code ${code}`);
            }
        });
    } catch (error) {
        console.error(`================================`);
        console.error('Error executing FFMPEG command:', error);
    }
}
export default new SongClass();