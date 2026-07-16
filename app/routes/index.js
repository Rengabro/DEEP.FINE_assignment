const express = require('express');
const multer = require('multer');
const router = express.Router();
const indexController = require('../controllers/indexController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const isXlsx = /\.xlsx$/i.test(file.originalname) ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    callback(isXlsx ? null : new Error('xlsx 파일만 업로드할 수 있습니다.'), isXlsx);
  }
});

/* GET home page. */
router.get('/index', function(req, res) {
  res.render('index', { title: 'TMAP POI 지도' });
});

router.get('/api/pois', indexController.getPois);
router.post('/api/pois', indexController.createPoi);
router.delete('/api/pois/:id', indexController.deletePoi);
router.post('/api/pois/import/preview', upload.single('file'), indexController.previewPoisImport);
router.post('/api/pois/import', upload.single('file'), indexController.importPois);
router.get('/api/tmap/reverse-geocoding', indexController.reverseGeocode);
router.post('/api/tmap/pedestrian-route', indexController.getPedestrianRoute);

module.exports = router;
