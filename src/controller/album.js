import { formatResponseError, formatResponseSuccess, formatResponseSuccessNoData } from '../config';
import album from '../models/album';
import song from '../models/song';
import user from '../models/user';


class AlbumClass {
    async addAlbum(req, res) {
        try {
            const data = {
                albumName: req.body.albumName,
                artistId: req.body.artistId,
                artistIdString: req.body.artistIdString
            }
            const result = await new album(data).save()
            if (result) {
                res.status(200).json(formatResponseSuccess(result, true, 'Thêm thành công'));
            }
        } catch (error) {
            console.error('addAlbum error:', error);
            return res.status(500).json(formatResponseError({ code: '500' }, false, 'Lỗi xảy ra trong quá trình thực thi'));
        }

    }

    async getAllAlbum(req, res) {
        try {
            const albums = await album.find().lean(); // Lấy danh sách album
            const albumIds = albums.map(album => album._id);
            const songs = await song.find({ albumIdString: { $in: albumIds } }).lean();
            // const songs = await song.find({ albumIdString: { $in: albumIds } }, { title: 1, albumIdString: 1 }).lean();// trường hợp chỉ trả về title và albumIdString

            const songsByAlbum = {};
            songs.forEach(song => {
                if (!songsByAlbum[song.albumIdString]) {
                    songsByAlbum[song.albumIdString] = [];
                }
                songsByAlbum[song.albumIdString].push(song);
            });

            albums.forEach(album => {
                album.songs = songsByAlbum[album._id] || [];
            });

            res.status(200).json(albums);
        } catch (error) {
            console.error('getAllAlbum error:', error);
            return res.status(500).json(formatResponseError({ code: '500' }, false, 'Lỗi xảy ra trong quá trình thực thi'));
        }
    }

    async getAlbumById(req, res) {
        try {
            const albumId = req.params.id;
            const albumData = await album.findOne({ idAlbum: albumId });
            const artistUser = await user.findById(albumData.artistIdString)
            if (!albumData) {
                return res.status(404).json({ error: 'Album not found' });
            }

            const songs = await song.find({ idAlbum: albumId });

            res.status(200).json({ idAlbum: albumData.idAlbum, artistIdString: albumData.artistIdString, artistImage: artistUser.image, songs: songs });

        }
        catch (error) {
            console.error('getAlbumById error:', error);
            return res.status(500).json(formatResponseError({ code: '500' }, false, 'Lỗi xảy ra trong quá trình thực thi'));
        }
    }


}
export default new AlbumClass();